// 从查询参数中提取 sid
const urlParams = new URLSearchParams(window.location.search);
const sid = urlParams.get('sid') || '94516'; // 如果没有 sid 参数，使用默认值 94516
console.log(`[DEBUG] Frontend sid: ${sid}`); // 添加调试日志

let token = urlParams.get('token');
let timeoutId;
let countdownId;
let lastRequestTime = 0;

let cachedData = { phone: '', sms: '', yzm: '', status: 'unused', used: false };

function setMessage(text, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = text;
    messageElement.className = '';
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
            phoneInput.value = cachedData.phone || '';
            codeInput.value = cachedData.sms || '';
            updateButtons(cachedData.status, cachedData.used);
            if (cachedData.status === 'phone_assigned' && !cachedData.used) {
                startPolling();
            } else if (cachedData.status === 'code_received' || cachedData.used) {
                if (timeoutId) clearTimeout(timeoutId);
                if (countdownId) clearTimeout(countdownId);
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
    if (timeoutId) clearTimeout(timeoutId);
    if (countdownId) clearTimeout(countdownId);

    timeoutId = setTimeout(() => {
        console.log(`[DEBUG] Polling getCode with sid: ${sid}`); // 添加调试日志
        fetch(`/api/getCode?token=${token}&sid=${sid}`)
            .then(response => response.json())
            .then(data => {
                if (data.error === "等待验证码中") {
                    setMessage("等待验证码中...", 'info');
                    startPolling();
                } else if (data.data && data.data.sms) {
                    cachedData = data.data;
                    document.getElementById('code').value = data.data.sms || '';
                    document.getElementById('phone').value = data.data.phone || '';
                    updateButtons(data.data.status, data.data.used);
                    setMessage("验证码已接收", 'success');
                    if (timeoutId) clearTimeout(timeoutId);
                    if (countdownId) clearTimeout(countdownId);
                }
            })
            .catch(() => {
                setMessage("网络错误，请重试", 'error');
                clearTimeout(timeoutId);
            });
    }, 5000); // 轮询间隔为 5 秒

    countdownId = setTimeout(() => {
        if (!cachedData.sms && timeoutId) {
            setMessage("180秒未收到验证码，请点击【换号】", 'error');
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }, 180000);
}

document.getElementById('getPhoneBtn').addEventListener('click', () => {
    const currentTime = Date.now();
    if (currentTime - lastRequestTime < 5000) {
        setMessage("请等待5秒后重试", 'error');
        return;
    }
    setMessage("", 'info');
    setTimeout(() => {
        console.log(`[DEBUG] Fetching getPhone with sid: ${sid}`); // 添加调试日志
        fetch(`/api/getPhone?token=${token}&sid=${sid}`)
            .then(response => response.json())
            .then(data => {
                if (data.data && data.data.phone) {
                    cachedData = data.data;
                    setTimeout(() => {
                        loadData();
                        setMessage(data.msg, 'success');
                        startPolling();
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
            console.log(`[DEBUG] Fetching cancelPhone with sid: ${sid}`); // 添加调试日志
            fetch(`/api/cancelPhone?token=${token}&sid=${sid}`)
                .then(response => response.json())
                .then(data => {
                    if (data.data) {
                        cachedData = data.data;
                        loadData();
                        setTimeout(() => {
                            console.log(`[DEBUG] Fetching getPhone after cancel with sid: ${sid}`); // 添加调试日志
                            fetch(`/api/getPhone?token=${token}&sid=${sid}`)
                                .then(response => response.json())
                                .then(data => {
                                    if (data.data && data.data.phone) {
                                        cachedData = data.data;
                                        loadData();
                                        setMessage(data.msg, 'success');
                                        startPolling();
                                    } else {
                                        setMessage(data.msg, 'error');
                                    }
                                })
                                .catch(error => {
                                    setMessage(`网络错误: ${error.message}`, 'error');
                                });
                        }, 2000);
                    } else {
                        setMessage(data.error || "更换号码失败，请重试", 'error');
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
