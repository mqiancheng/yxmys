let token = new URLSearchParams(window.location.search).get('token');
let timeoutId;
let lastRequestTime = 0;

let cachedData = { phone: '', sms: '', yzm: '', status: 'unused', used: false };

function loadData() {
    if (!token) {
        document.getElementById('message').textContent = "卡密不存在";
        document.getElementById('getPhoneBtn').disabled = true;
        return;
    }

    // 使用 /api/checkToken 检查 token 状态，不触发取号
    fetch(`/api/checkToken?token=${token}`)
        .then(response => response.json())
        .then(data => {
            if (data.error === "卡密不存在") {
                document.getElementById('message').textContent = "卡密不存在";
                document.getElementById('getPhoneBtn').disabled = true;
                return;
            }
            cachedData = data.data;
            const phoneInput = document.getElementById('phone');
            const codeInput = document.getElementById('code');
            phoneInput.value = cachedData.phone;
            codeInput.value = cachedData.sms || '';
            updateButtons(cachedData.status, cachedData.used);
            // 如果已经取号但未接收验证码，自动开始轮询
            if (cachedData.status === 'phone_assigned' && !cachedData.used) {
                startPolling();
            }
        })
        .catch(() => {
            document.getElementById('message').textContent = "网络错误，请重试";
            document.getElementById('getPhoneBtn').disabled = true;
        });
}

function updateButtons(status, used) {
    const getPhoneBtn = document.getElementById('getPhoneBtn');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const changePhoneBtn = document.getElementById('changePhoneBtn');
    const copyPhoneBtn = document.getElementById('copyPhoneBtn');

    getPhoneBtn.style.display = (status === 'unused' && !used) ? 'inline-block' : 'none';
    changePhoneBtn.style.display = (status === 'phone_assigned' && !used) ? 'inline-block' : 'none';
    copyPhoneBtn.style.display = (status === 'phone_assigned' || status === 'code_received' || used) ? 'inline-block' : 'none';
    copyCodeBtn.style.display = (status === 'code_received' || used) ? 'inline-block' : 'none';
    copyCodeBtn.disabled = !cachedData.yzm;
}

function startPolling() {
    timeoutId = setTimeout(() => {
        fetch(`/api/getCode?token=${token}`)
            .then(response => response.json())
            .then(data => {
                if (data.error === "等待验证码中") {
                    document.getElementById('message').textContent = "等待验证码中...";
                    startPolling();
                } else if (data.data && data.data.sms) {
                    cachedData = data.data;
                    loadData();
                    document.getElementById('message').textContent = "验证码已接收";
                }
            })
            .catch(() => {
                document.getElementById('message').textContent = "网络错误，请重试";
                clearTimeout(timeoutId);
            });
    }, 2000);

    setTimeout(() => {
        if (!cachedData.sms && timeoutId) {
            document.getElementById('message').textContent = "60秒未收到验证码，请点击【换号】";
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }, 60000);
}

document.getElementById('getPhoneBtn').addEventListener('click', () => {
    const currentTime = Date.now();
    if (currentTime - lastRequestTime < 5000) {
        document.getElementById('message').textContent = "请等待5秒后重试";
        return;
    }
    document.getElementById('message').textContent = "";
    setTimeout(() => {
        fetch(`/api/getPhone?token=${token}`)
            .then(response => response.json())
            .then(data => {
                if (data.data && data.data.phone) {
                    cachedData = data.data;
                    setTimeout(() => {
                        loadData();
                        document.getElementById('message').textContent = data.msg;
                        startPolling(); // 取号成功后开始轮询
                    }, 1000);
                } else {
                    setTimeout(() => {
                        document.getElementById('message').textContent = data.msg;
                        setTimeout(() => {
                            if (!cachedData.phone) {
                                document.getElementById('message').textContent = data.msg;
                            }
                        }, 1000);
                    }, 500);
                }
                lastRequestTime = currentTime;
            })
            .catch(error => {
                document.getElementById('message').textContent = `网络错误: ${error.message}`;
                lastRequestTime = currentTime;
            });
    }, 1000);
});

document.getElementById('copyCodeBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(cachedData.yzm || '').then(() => {
        document.getElementById('message').textContent = "验证码已复制";
    });
});

document.getElementById('copyPhoneBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(cachedData.phone).then(() => {
        document.getElementById('message').textContent = "手机号已复制";
    });
});

function bindChangePhoneEvent() {
    const changePhoneBtn = document.getElementById('changePhoneBtn');
    if (changePhoneBtn) {
        changePhoneBtn.addEventListener('click', () => {
            fetch(`/api/cancelPhone?token=${token}`)
                .then(response => response.json())
                .then(data => {
                    cachedData = data.data;
                    loadData();
                    document.getElementById('message').textContent = data.msg;
                })
                .catch(() => {
                    document.getElementById('message').textContent = "更换号码失败，请重试";
                });
        });
    }
}

window.onload = () => {
    loadData();
    bindChangePhoneEvent();
};
