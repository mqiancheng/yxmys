let token = new URLSearchParams(window.location.search).get('token');
let timeoutId;

function loadData() {
    fetch(`/api/getKeyInfo?token=${token}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                document.getElementById('message').textContent = data.error;
            } else {
                const tokenData = data.data;
                document.getElementById('phone').value = tokenData.phone || '';
                document.getElementById('code').value = tokenData.yzm || '';
                updateButtons(tokenData.status);
            }
        });
}

function updateButtons(status) {
    const getPhoneBtn = document.getElementById('getPhoneBtn');
    const changePhoneBtn = document.getElementById('changePhoneBtn');
    const copyBtn = document.getElementById('copyBtn');

    getPhoneBtn.disabled = status === 'code_received';
    changePhoneBtn.disabled = status === 'code_received' || !status || status === 'unused';
    copyBtn.disabled = !document.getElementById('phone').value || status === 'unused';

    if (status === 'phone_assigned' && !timeoutId) {
        startPolling();
    }
}

function startPolling() {
    timeoutId = setTimeout(() => {
        fetch(`/api/getCode?token=${token}`)
            .then(response => response.json())
            .then(data => {
                if (data.error === "等待验证码中") {
                    document.getElementById('message').textContent = "等待验证码中...";
                    startPolling(); // 继续轮询
                } else {
                    loadData();
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            });
    }, 2000); // 2秒轮询一次

    setTimeout(() => {
        if (document.getElementById('code').value === '' && timeoutId) {
            document.getElementById('message').textContent = "60秒未收到验证码，请点击换号";
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }, 60000); // 60秒超时
}

document.getElementById('getPhoneBtn').addEventListener('click', () => {
    fetch(`/api/getPhone?token=${token}`)
        .then(response => response.json())
        .then(data => {
            if (data.error === "未获取到手机号，请重试") {
                document.getElementById('message').textContent = data.error;
            } else {
                loadData();
            }
        });
});

document.getElementById('changePhoneBtn').addEventListener('click', () => {
    fetch(`/api/cancelPhone?token=${token}`)
        .then(response => response.json())
        .then(data => {
            loadData();
            document.getElementById('message').textContent = "号码已更换，请再次取号";
        });
});

document.getElementById('copyBtn').addEventListener('click', () => {
    const phone = document.getElementById('phone').value;
    navigator.clipboard.writeText(phone).then(() => {
        document.getElementById('message').textContent = "手机号已复制";
    });
});

loadData();
