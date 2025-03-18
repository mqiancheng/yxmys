let token = new URLSearchParams(window.location.search).get('token');
let timeoutId;
const baseUrl = window.location.origin;
let lastRequestTime = 0; // 记录最后一次请求时间

console.log("Token:", token);
console.log("Base URL:", baseUrl);

// 从 localStorage 加载缓存数据
let cachedData = JSON.parse(localStorage.getItem(`sms_${token}`)) || { phone: '', sms: '', yzm: '', status: 'unused' };

function loadData() {
    if (!token) {
        document.getElementById('message').textContent = "缺少 token 参数";
        return;
    }
    const phoneInput = document.getElementById('phone');
    const codeInput = document.getElementById('code');
    if (phoneInput && codeInput) {
        phoneInput.value = cachedData.phone;
        codeInput.value = cachedData.sms || '';
        try {
            updateButtons(cachedData.status);
        } catch (error) {
            console.error("Error in updateButtons:", error);
        }
    } else {
        console.error("phone or code input not found");
    }
    if (!cachedData.phone && !cachedData.status) {
        document.getElementById('message').textContent = ""; // 新页面不立即提示错误
    }
}

function updateButtons(status) {
    const getPhoneBtn = document.getElementById('getPhoneBtn');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const inputGroup = document.querySelector('div:nth-child(2)'); // 匹配包含 phone 输入框的 <div>

    if (!getPhoneBtn || !inputGroup) {
        console.error("getPhoneBtn or inputGroup not found");
        return;
    }

    if (document.getElementById('phone')?.value) {
        status = 'phone_assigned';
    } else if (document.getElementById('code')?.value) {
        status = 'code_received';
    }

    getPhoneBtn.style.display = status === 'phone_assigned' ? 'none' : 'inline-block';
    if (status === 'phone_assigned') {
        let changePhoneBtn = document.getElementById('changePhoneBtn');
        if (!changePhoneBtn) {
            changePhoneBtn = document.createElement('button');
            changePhoneBtn.id = 'changePhoneBtn';
            changePhoneBtn.textContent = '换号';
            inputGroup.appendChild(changePhoneBtn);
            bindChangePhoneEvent();
        }
        let copy1Btn = document.getElementById('copy1Btn');
        if (!copy1Btn) {
            copy1Btn = document.createElement('button');
            copy1Btn.id = 'copy1Btn';
            copy1Btn.textContent = '复制1';
            inputGroup.appendChild(copy1Btn);
            copy1Btn.addEventListener('click', () => {
                navigator.clipboard.writeText(document.getElementById('phone').value).then(() => {
                    document.getElementById('message').textContent = "手机号已复制";
                });
            });
        }
    } else {
        const changePhoneBtn = document.getElementById('changePhoneBtn');
        const copy1Btn = document.getElementById('copy1Btn');
        if (changePhoneBtn) changePhoneBtn.remove();
        if (copy1Btn) copy1Btn.remove();
    }

    copyCodeBtn.textContent = '复制2';
    copyCodeBtn.disabled = !cachedData.yzm;
    copyCodeBtn.style.display = status === 'code_received' ? 'inline-block' : 'none';

    if (status === 'phone_assigned' && !timeoutId) {
        startPolling();
    } else if (status === 'code_received') {
        const changePhoneBtn = document.getElementById('changePhoneBtn');
        if (changePhoneBtn) changePhoneBtn.remove();
    }
}

function startPolling() {
    console.log("Starting polling for code...");
    timeoutId = setTimeout(() => {
        fetch(`${baseUrl}/api/getCode?token=${token}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log("GetCode response:", data);
                if (data.error === "等待验证码中") {
                    document.getElementById('message').textContent = "等待验证码中...";
                    startPolling();
                } else if (data.data && data.data.sms) {
                    cachedData.sms = data.data.sms;
                    cachedData.yzm = data.data.yzm;
                    cachedData.status = 'code_received';
                    localStorage.setItem(`sms_${token}`, JSON.stringify(cachedData));
                    loadData();
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
        if (!document.getElementById('code').value && timeoutId) {
            document.getElementById('message').textContent = "60秒未显示验证码，请点击【换号】";
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }, 60000);
}

document.getElementById('getPhoneBtn').addEventListener('click', () => {
    console.log("GetPhone button clicked");
    const currentTime = Date.now();
    if (currentTime - lastRequestTime < 6000) {
        document.getElementById('message').textContent = "请等待6秒后重试";
        return;
    }
    document.getElementById('message').textContent = "";
    setTimeout(() => {
        fetch(`${baseUrl}/api/getPhone?token=${token}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log("GetPhone response:", data);
                if (data.data && data.data.phone) {
                    cachedData.phone = data.data.phone;
                    cachedData.status = 'phone_assigned';
                    cachedData.timestamp = Date.now();
                    localStorage.setItem(`sms_${token}`, JSON.stringify(cachedData));
                    document.getElementById('message').textContent = data.msg || "成功";
                    loadData(); // 强制刷新界面
                } else {
                    document.getElementById('message').textContent = `${data.msg || '未获取到号码'}，请重试`;
                    setTimeout(() => {
                        document.getElementById('message').textContent = "";
                        setTimeout(() => {
                            if (!document.getElementById('phone').value) {
                                document.getElementById('message').textContent = `${data.msg || '未获取到号码'}，请重试`;
                            }
                        }, 500);
                    }, 500);
                }
                lastRequestTime = currentTime;
            })
            .catch(error => {
                console.error("Get phone error:", error);
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

const changePhoneBtnHandler = () => {
    console.log("ChangePhone button clicked");
    fetch(`${baseUrl}/api/cancelPhone?token=${token}`)
        .then(response => response.json())
        .then(data => {
            cachedData.phone = '';
            cachedData.sms = '';
            cachedData.yzm = '';
            cachedData.status = 'unused';
            localStorage.setItem(`sms_${token}`, JSON.stringify(cachedData));
            loadData();
            document.getElementById('message').textContent = "号码已更换，请再次取试";
        })
        .catch(error => {
            console.error("Change phone error:", error);
            document.getElementById('message').textContent = "更换号码失败，请重试";
        });
};

function bindChangePhoneEvent() {
    const changePhoneBtn = document.getElementById('changePhoneBtn');
    if (changePhoneBtn) {
        changePhoneBtn.removeEventListener('click', changePhoneBtnHandler);
        changePhoneBtn.addEventListener('click', changePhoneBtnHandler);
    }
}

window.onload = () => {
    bindChangePhoneEvent();
    loadData();
};

function rebindChangePhoneEvent() {
    const changePhoneBtn = document.getElementById('changePhoneBtn');
    if (changePhoneBtn) {
        bindChangePhoneEvent();
    }
}

setInterval(rebindChangePhoneEvent, 1000);
