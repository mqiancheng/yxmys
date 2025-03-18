let token = new URLSearchParams(window.location.search).get('token');
let timeoutId;
const baseUrl = window.location.origin;

console.log("Token:", token);
console.log("Base URL:", baseUrl);

// 从 localStorage 加载缓存数据
let cachedData = JSON.parse(localStorage.getItem(`sms_${token}`)) || { phone: '', sms: '', yzm: '', status: 'unused' };

function loadData() {
    if (!token) {
        document.getElementById('message').textContent = "缺少 token 参数";
        return;
    }
    document.getElementById('phone').value = cachedData.phone;
    document.getElementById('code').value = cachedData.sms || ''; // 显示 sms 内容
    updateButtons(cachedData.status);
    if (!cachedData.phone && !cachedData.status) {
        document.getElementById('message').textContent = ""; // 新页面不立即提示错误
    }
}

function updateButtons(status) {
    const getPhoneBtn = document.getElementById('getPhoneBtn');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const inputGroup = document.querySelector('.input-group:nth-child(1)');

    if (!getPhoneBtn || !inputGroup) {
        console.error("getPhoneBtn or inputGroup not found");
        return;
    }

    if (document.getElementById('phone').value) {
        status = 'phone_assigned';
    } else if (document.getElementById('code').value) {
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
    copyCodeBtn.disabled = !cachedData.yzm; // 仅当 yzm 存在时启用
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
            .then(response => response.json())
            .then(data => {
                console.log("GetCode response:", data);
                if (data.error === "等待验证码中") {
                    document.getElementById('message').textContent = "等待验证码中...";
                    startPolling();
                } else if (data.data && data.data.sms) {
                    cachedData.sms = data.data.sms; // 显示完整短信
                    cachedData.yzm = data.data.yzm;  // 验证码用于复制
                    cachedData.status = 'code_received';
                    localStorage.setItem(`sms_${token}`, JSON.stringify(cachedData)); // 缓存1个月
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
    document.getElementById('message').textContent = "";
    setTimeout(() => {
        fetch(`${baseUrl}/api/getPhone?token=${token}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("GetPhone response:", data);
                if (data.code === "0" && data.phone) {
                    cachedData.phone = data.phone;
                    cachedData.status = 'phone_assigned';
                    cachedData.timestamp = Date.now();
                    localStorage.setItem(`sms_${token}`, JSON.stringify(cachedData)); // 缓存1个月
                    document.getElementById('message').textContent = data.msg || "成功";
                    loadData();
                } else {
                    document.getElementById('message').textContent = `${data.msg || '未知错误'}，请重试`;
                    setTimeout(() => {
                        document.getElementById('message').textContent = "";
                        setTimeout(() => {
                            if (!document.getElementById('phone').value) {
                                document.getElementById('message').textContent = `${data.msg || '未知错误'}，请重试`;
                            }
                        }, 500);
                    }, 500);
                }
            })
            .catch(error => {
                console.error("Get phone error:", error);
                document.getElementById('message').textContent = `网络错误: ${error.message}`;
            });
    }, 1000); // 1秒延迟
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
            document.getElementById('message').textContent = "号码已更换，请再次取号";
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

document.addEventListener('DOMContentLoaded', () => {
    bindChangePhoneEvent();
    loadData();
});

function rebindChangePhoneEvent() {
    const changePhoneBtn = document.getElementById('changePhoneBtn');
    if (changePhoneBtn) {
        bindChangePhoneEvent();
    }
}

setInterval(rebindChangePhoneEvent, 1000);
