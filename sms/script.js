let token = new URLSearchParams(window.location.search).get('token');
let timeoutId;

console.log("Token:", token); // 调试 token

function loadData() {
    if (!token) {
        document.getElementById('message').textContent = "缺少 token 参数";
        return;
    }
    fetch(`/api/getKeyInfo?token=${token}`)
        .then(response => response.json())
        .then(data => {
            console.log("KeyInfo response:", data); // 调试响应
            if (data.error) {
                document.getElementById('message').textContent = data.error;
            } else {
                const tokenData = data.data;
                document.getElementById('phone').value = tokenData.phone || '';
                document.getElementById('code').value = tokenData.yzm || '';
                updateButtons(tokenData.status);
            }
        })
        .catch(error => {
            console.error("Load data error:", error);
            document.getElementById('message').textContent = "加载失败，请重试";
        });
}

function updateButtons(status) {
    const getPhoneBtn = document.getElementById('getPhoneBtn');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    let changePhoneBtn = document.getElementById('changePhoneBtn');

    if (!getPhoneBtn) {
        console.error("getPhoneBtn not found");
        return;
    }

    if (status === 'phone_assigned' && !changePhoneBtn) {
        changePhoneBtn = document.createElement('button');
        changePhoneBtn.id = 'changePhoneBtn';
        changePhoneBtn.textContent = '换号';
        changePhoneBtn.disabled = status === 'code_received';
        document.querySelector('.input-group:nth-child(1)').appendChild(changePhoneBtn);
    } else if (status !== 'phone_assigned' && changePhoneBtn) {
        changePhoneBtn.remove();
    }

    getPhoneBtn.textContent = document.getElementById('phone').value ? '复制' : '取号';
    getPhoneBtn.disabled = status === 'code_received';
    copyCodeBtn.disabled = !document.getElementById('code').value || status !== 'code_received';

    if (status === 'phone_assigned' && !timeoutId) {
        startPolling();
    }
}

function startPolling() {
    timeoutId = setTimeout(() => {
        fetch(`/api/getCode?token=${token}`)
            .then(response => response.json())
            .then(data => {
                console.log("GetCode response:", data); // 调试响应
                if (data.error === "等待验证码中") {
                    document.getElementById('message').textContent = "等待验证码中...";
                    startPolling();
                } else {
                    loadData();
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            })
            .catch(error => {
                console.error("Polling error:", error);
                document.getElementById('message').textContent = "网络错误，请重试";
                clearTimeout(timeoutId);
                timeoutId = null;
            });
    }, 2000);

    setTimeout(() => {
        if (document.getElementById('code').value === '' && timeoutId) {
            document.getElementById('message').textContent = "60秒未收到验证码，请点击换号";
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }, 60000);
}

document.getElementById('getPhoneBtn').addEventListener('click', () => {
    console.log("GetPhone button clicked"); // 调试点击事件
    const phone = document.getElementById('phone').value;
    if (phone) {
        navigator.clipboard.writeText(phone).then(() => {
            document.getElementById('message').textContent = "手机号已复制";
        });
    } else {
        fetch(`/api/getPhone?token=${token}`)
            .then(response => response.json())
            .then(data => {
                console.log("GetPhone response:", data); // 调试响应
                if (data.error) {
                    document.getElementById('message').textContent = data.error;
                } else {
                    loadData();
                }
            })
            .catch(error => {
                console.error("Get phone error:", error);
                document.getElementById('message').textContent = "网络错误，请重试";
            });
    }
});

document.getElementById('copyCodeBtn').addEventListener('click', () => {
    const code = document.getElementById('code').value;
    navigator.clipboard.writeText(code).then(() => {
        document.getElementById('message').textContent = "验证码已复制";
    });
});

document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'changePhoneBtn') {
        fetch(`/api/cancelPhone?token=${token}`)
            .then(response => response.json())
            .then(data => {
                loadData();
                document.getElementById('message').textContent = "号码已更换，请再次取号";
            })
            .catch(error => {
                console.error("Change phone error:", error);
                document.getElementById('message').textContent = "更换号码失败，请重试";
            });
    }
});

if (!token) {
    document.getElementById('message').textContent = "缺少 token 参数";
} else {
    loadData();
}
