let token = new URLSearchParams(window.location.search).get('token');
let timeoutId;
const baseUrl = "https://sms-code.smsc.workers.dev"; // Worker URL
let lastRequestTime = 0;

let cachedData = { phone: '', sms: '', yzm: '', status: 'unused', used: false };

function loadData() {
    if (!token) {
        document.getElementById('message').textContent = "缺少 token 参数";
        return;
    }
    const phoneInput = document.getElementById('phone');
    const codeInput = document.getElementById('code');
    phoneInput.value = cachedData.phone;
    codeInput.value = cachedData.sms || '';
    updateButtons(cachedData.status, cachedData.used);
}

function updateButtons(status, used) {
    const getPhoneBtn = document.getElementById('getPhoneBtn');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const phoneDiv = document.querySelector('div:first-of-type');

    let changePhoneBtn = document.getElementById('changePhoneBtn');
    let copyPhoneBtn = document.getElementById('copyPhoneBtn');

    getPhoneBtn.style.display = (status === 'unused' && !used) ? 'inline-block' : 'none';

    if (status === 'phone_assigned' && !used) {
        if (!changePhoneBtn) {
            changePhoneBtn = document.createElement('button');
            changePhoneBtn.id = 'changePhoneBtn';
            changePhoneBtn.textContent = '换号';
            phoneDiv.appendChild(changePhoneBtn);
            bindChangePhoneEvent();
        }
        if (!copyPhoneBtn) {
            copyPhoneBtn = document.createElement('button');
            copyPhoneBtn.id = 'copyPhoneBtn';
            copyPhoneBtn.textContent = '复制1';
            phoneDiv.appendChild(copyPhoneBtn);
            copyPhoneBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(cachedData.phone).then(() => {
                    document.getElementById('message').textContent = "手机号已复制";
                });
            });
        }
    } else {
        if (changePhoneBtn) changePhoneBtn.remove();
        if (status === 'code_received' || used) {
            if (!copyPhoneBtn) {
                copyPhoneBtn = document.createElement('button');
                copyPhoneBtn.id = 'copyPhoneBtn';
                copyPhoneBtn.textContent = '复制1';
                phoneDiv.appendChild(copyPhoneBtn);
                copyPhoneBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(cachedData.phone).then(() => {
                        document.getElementById('message').textContent = "手机号已复制";
                    });
                });
            }
        } else if (copyPhoneBtn) {
            copyPhoneBtn.remove();
        }
    }

    copyCodeBtn.style.display = (status === 'code_received' || used) ? 'inline-block' : 'none';
    copyCodeBtn.disabled = !cachedData.yzm;
}

function startPolling() {
    timeoutId = setTimeout(() => {
        fetch(`${baseUrl}/api/getCode?token=${token}`)
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
        fetch(`${baseUrl}/api/getPhone?token=${token}`)
            .then(response => response.json())
            .then(data => {
                if (data.data && data.data.phone) {
                    cachedData = data.data;
                    setTimeout(() => {
                        loadData();
                        document.getElementById('message').textContent = data.msg;
                        startPolling();
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

function bindChangePhoneEvent() {
    const changePhoneBtn = document.getElementById('changePhoneBtn');
    if (changePhoneBtn) {
        changePhoneBtn.addEventListener('click', () => {
            fetch(`${baseUrl}/api/cancelPhone?token=${token}`)
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

window.onload = loadData;
