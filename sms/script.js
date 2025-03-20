// 提取 sid（支持查询参数和路径）
const urlParams = new URLSearchParams(window.location.search);
const pathSid = window.location.pathname.split('/')[1];
const sid = urlParams.get('sid') || pathSid || '94516';
console.log(`[DEBUG] Extracted sid: ${sid}`);

const token = urlParams.get('token');
let timeoutId, countdownId, lastRequestTime = 0;
let cachedData = { phone: '', sms: '', yzm: '', status: 'unused', used: false };

// 设置消息提示
function setMessage(text, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = text;
    messageElement.className = type ? `message-${type}` : '';
}

// 更新按钮状态
function updateButtons(status, used) {
    const buttons = {
        getPhoneBtn: status === 'unused' && !used,
        changePhoneBtn: status === 'phone_assigned' && !used,
        copyPhoneBtn: status === 'phone_assigned' || status === 'code_received' || used,
        copyCodeBtn: status === 'code_received' || used
    };
    for (const [id, visible] of Object.entries(buttons)) {
        document.getElementById(id).style.display = visible ? 'inline-block' : 'none';
    }
    document.getElementById('copyCodeBtn').disabled = !cachedData.yzm;
}

// 加载数据
async function loadData() {
    if (!token) {
        setMessage("卡密不存在", 'error');
        document.getElementById('getPhoneBtn').disabled = true;
        return;
    }

    try {
        const response = await fetch(`/api/checkToken?token=${token}`);
        const data = await response.json();
        if (data.error === "卡密不存在") {
            setMessage("卡密不存在", 'error');
            document.getElementById('getPhoneBtn').disabled = true;
            return;
        }
        cachedData = data.data;
        document.getElementById('phone').value = cachedData.phone || '';
        document.getElementById('code').value = cachedData.sms || '';
        updateButtons(cachedData.status, cachedData.used);
        if (cachedData.status === 'phone_assigned' && !cachedData.used) {
            startPolling();
        } else if (cachedData.status === 'code_received' || cachedData.used) {
            clearTimeout(timeoutId);
            clearTimeout(countdownId);
        }
    } catch {
        setMessage("网络错误，请重试", 'error');
        document.getElementById('getPhoneBtn').disabled = true;
    }
}

// 轮询获取验证码
function startPolling() {
    clearTimeout(timeoutId);
    clearTimeout(countdownId);

    timeoutId = setTimeout(async () => {
        try {
            const response = await fetch(`/api/getCode?token=${token}&sid=${sid}`);
            const data = await response.json();
            if (data.error === "等待验证码中") {
                setMessage("等待验证码中...", 'info');
                startPolling();
            } else if (data.data && data.data.sms) {
                cachedData = data.data;
                document.getElementById('code').value = data.data.sms || '';
                document.getElementById('phone').value = data.data.phone || '';
                updateButtons(data.data.status, data.data.used);
                setMessage("验证码已接收", 'success');
                clearTimeout(timeoutId);
                clearTimeout(countdownId);
            }
        } catch {
            setMessage("网络错误，请重试", 'error');
            clearTimeout(timeoutId);
        }
    }, 5000);

    countdownId = setTimeout(() => {
        if (!cachedData.sms && timeoutId) {
            setMessage("180秒未收到验证码，请点击【换号】", 'error');
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }, 180000);
}

// 取号
document.getElementById('getPhoneBtn').addEventListener('click', async () => {
    const currentTime = Date.now();
    if (currentTime - lastRequestTime < 5000) {
        setMessage("请等待5秒后重试", 'error');
        return;
    }
    setMessage("", 'info');
    setTimeout(async () => {
        try {
            const response = await fetch(`/api/getPhone?token=${token}&sid=${sid}`);
            const data = await response.json();
            if (data.data && data.data.phone) {
                cachedData = data.data;
                setTimeout(() => {
                    loadData();
                    setMessage(data.msg, 'success');
                    startPolling();
                }, 1000);
            } else {
                setTimeout(() => setMessage(data.msg, 'error'), 500);
            }
            lastRequestTime = currentTime;
        } catch (error) {
            setMessage(`网络错误: ${error.message}`, 'error');
            lastRequestTime = currentTime;
        }
    }, 1000);
});

// 复制验证码
document.getElementById('copyCodeBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(cachedData.yzm || '').then(() => {
        setMessage("验证码已复制", 'success');
    });
});

// 复制手机号
document.getElementById('copyPhoneBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(cachedData.phone).then(() => {
        setMessage("手机号已复制", 'success');
    });
});

// 换号
document.getElementById('changePhoneBtn').addEventListener('click', async () => {
    setMessage("换号中...", 'info');
    try {
        const response = await fetch(`/api/cancelPhone?token=${token}&sid=${sid}`);
        const data = await response.json();
        if (data.data) {
            cachedData = data.data;
            loadData();
            setTimeout(async () => {
                const response = await fetch(`/api/getPhone?token=${token}&sid=${sid}`);
                const data = await response.json();
                if (data.data && data.data.phone) {
                    cachedData = data.data;
                    loadData();
                    setMessage(data.msg, 'success');
                    startPolling();
                } else {
                    setMessage(data.msg, 'error');
                }
            }, 2000);
        } else {
            setMessage(data.error || "更换号码失败，请重试", 'error');
        }
    } catch {
        setMessage("更换号码失败，请重试", 'error');
    }
});

window.onload = loadData;
