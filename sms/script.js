let token = new URLSearchParams(window.location.search).get('token');
let timeoutId;
let countdownId; // 新增：用于存储 180 秒计时器的 ID
let lastRequestTime = 0;

let cachedData = { phone: '', sms: '', yzm: '', status: 'unused', used: false };

function setMessage(text, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = text;
    messageElement.className = ''; // 清除现有类
    if (type === 'error') {
        messageElement.classList.add('message-error');
    } else if (type === 'success') {
        messageElement.classList.add('message-success');
    } else {
        messageElement.classList.add('message-info');
    }
}

function loadData() {
    if (!token) {
        setMessage("卡密不存在", 'error');
        document.getElementById('getPhoneBtn').disabled = true;
        return;
    }

    fetch(`/api/checkToken?token=${token}`)
        .then(response => response.json())
        .then(data => {
            if (data.error === "卡密不存在") {
                setMessage("卡密不存在", 'error');
                document.getElementById('getPhoneBtn').disabled = true;
                return;
            }
            cachedData = data.data;
            const phoneInput = document.getElementById('phone');
            const codeInput = document.getElementById('code');
            phoneInput.value = cachedData.phone;
            codeInput.value = cachedData.sms || '';
            updateButtons(cachedData.status, cachedData.used);
            if (cachedData.status === 'phone_assigned' && !cachedData.used) {
                startPolling();
            }
        })
        .catch(() => {
            setMessage("网络错误，请重试", 'error');
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
    // 清除现有的计时器（轮询和 180 秒倒计时）
    if (timeoutId) clearTimeout(timeoutId);
    if (countdownId) clearTimeout(countdownId);

    timeoutId = setTimeout(() => {
        fetch(`/api/getCode?token=${token}`)
            .then(response => response.json())
            .then(data => {
                if (data.error === "等待验证码中") {
                    setMessage("等待验证码中...", 'info');
                    startPolling();
                } else if (data.data && data.data.sms) {
                    cachedData = data.data;
                    loadData();
                    setMessage("验证码已接收", 'success');
                }
            })
            .catch(() => {
                setMessage("网络错误，请重试", 'error');
                clearTimeout(timeoutId);
            });
    }, 4000); // 轮询间隔为 4 秒

    // 启动新的 180 秒计时器
    countdownId = setTimeout(() => {
        if (!cachedData.sms && timeoutId) {
            setMessage("180秒未收到验证码，请点击【换号】", 'error');
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }, 180000); // 超时时间为 180 秒
}

document.getElementById('getPhoneBtn').addEventListener('click', () => {
    const currentTime = Date.now();
    if (currentTime - lastRequestTime < 5000) {
        setMessage("请等待5秒后重试", 'error');
        return;
    }
    setMessage("", 'info');
    setTimeout(() => {
        fetch(`/api/getPhone?token=${token}`)
            .then(response => response.json())
            .then(data => {
                if (data.data && data.data.phone) {
                    cachedData = data.data;
                    setTimeout(() => {
                        loadData();
                        setMessage(data.msg, 'success');
                        startPolling(); // 取号成功后开始轮询，并重置计时
                    }, 1000);
                } else {
                    setTimeout(() => {
                        setMessage(data.msg, 'error');
                        setTimeout(() => {
                            if (!cachedData.phone) {
                                setMessage(data.msg, 'error');
                            }
                        }, 1000);
                    }, 500);
                }
                lastRequestTime = currentTime;
            })
            .catch(error => {
                setMessage(`网络错误: ${error.message}`, 'error');
                lastRequestTime = currentTime;
            });
    }, 1000);
});

document.getElementById('copyCodeBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(cachedData.yzm || '').then(() => {
        setMessage("验证码已复制", 'success');
    });
});

document.getElementById('copyPhoneBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(cachedData.phone).then(() => {
        setMessage("手机号已复制", 'success');
    });
});

function bindChangePhoneEvent() {
    const changePhoneBtn = document.getElementById('changePhoneBtn');
    if (changePhoneBtn) {
        changePhoneBtn.addEventListener('click', () => {
            setMessage("换号中...", 'info');
            fetch(`/api/cancelPhone?token=${token}`)
                .then(response => response.json())
                .then(data => {
                    if (data.data) {
                        cachedData = data.data;
                        loadData();
                        setTimeout(() => {
                            fetch(`/api/getPhone?token=${token}`)
                                .then(response => response.json())
                                .then(data => {
                                    if (data.data && data.data.phone) {
                                        cachedData = data.data;
                                        loadData();
                                        setMessage(data.msg, 'success');
                                        startPolling(); // 换号后取号成功，开始轮询并重置计时
                                    } else {
                                        setMessage(data.msg, 'error');
                                    }
                                })
                                .catch(error => {
                                    setMessage(`网络错误: ${error.message}`, 'error');
                                });
                        }, 2000);
                    } else {
                        setMessage(data.msg || "更换号码失败，请重试", 'error');
                    }
                })
                .catch(() => {
                    setMessage("更换号码失败，请重试", 'error');
                });
        });
    }
}

window.onload = () => {
    loadData();
    bindChangePhoneEvent();
};
