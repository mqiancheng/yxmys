let token = new URLSearchParams(window.location.search).get('token');
let timeoutId;
const baseUrl = window.location.origin;

console.log("Token:", token);
console.log("Base URL:", baseUrl);

function loadData() {
    if (!token) {
        document.getElementById('message').textContent = "缺少 token 参数";
        return;
    }
    fetch(`${baseUrl}/api/getKeyInfo?token=${token}`)
        .then(response => response.json())
        .then(data => {
            console.log("KeyInfo response:", data);
            if (data.error) {
                if (data.error.includes("未获取到手机号")) {
                    document.getElementById('message').textContent = "未获取到手机号请重试*2";
                } else {
                    document.getElementById('message').textContent = "网络错误，请重试";
                }
            } else {
                const tokenData = data.data;
                document.getElementById('phone').value = tokenData.phone || '';
                document.getElementById('code').value = tokenData.yzm || '';
                if (tokenData.phone) {
                    document.getElementById('message').textContent = "";
                } else {
                    document.getElementById('message').textContent = "获取到手机号请重试*1";
                }
                updateButtons(tokenData.status);
            }
        })
        .catch(error => {
            console.error("Load data error:", error);
            document.getElementById('message').textContent = "网络错误，请重试";
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

    if (document.getElementById('phone').value) {
        status = 'phone_assigned'; // 强制设置状态
    }

    if (status === 'phone_assigned' && !changePhoneBtn) {
        changePhoneBtn = document.createElement('button');
        changePhoneBtn.id = 'changePhoneBtn';
        changePhoneBtn.textContent = '换号';
        changePhoneBtn.disabled = status === 'code_received';
        document.querySelector('.input-group:nth-child(1)').appendChild(changePhoneBtn);
        bindChangePhoneEvent(); // 绑定换号事件
    } else if (status !== 'phone_assigned' && changePhoneBtn) {
        changePhoneBtn.remove();
    }

    getPhoneBtn.textContent = document.getElementById('phone').value ? '复制' : '取号';
    getPhoneBtn.disabled = !!document.getElementById('phone').value; // 有手机号时禁用“取号”
    copyCodeBtn.disabled = !document.getElementById('code').value || status !== 'code_received';

    if (status === 'phone_assigned' && !timeoutId) {
        startPolling();
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
    console.log("GetPhone button clicked");
    const phone = document.getElementById('phone').value;
    if (phone) {
        navigator.clipboard.writeText(phone).then(() => {
            document.getElementById('message').textContent = "手机号已复制";
        });
    } else {
        fetch(`${baseUrl}/api/getPhone?token=${token}`)
            .then(response => response.json())
            .then(data => {
                console.log("GetPhone response:", data);
                if (data.error) {
                    document.getElementById('message').textContent = data.error || "未知错误，请重试";
                } else {
                    loadData(); // 强制刷新数据
                }
            })
            .catch(error => {
                console.error("Get phone error:", error);
                document.getElementById('message').textContent = `获取手机号失败: ${error.message}`;
            });
    }
});

document.getElementById('copyCodeBtn').addEventListener('click', () => {
    const code = document.getElementById('code').value;
    navigator.clipboard.writeText(code).then(() => {
        document.getElementById('message').textContent = "验证码已复制";
    });
});

// 独立绑定换号按钮事件
const changePhoneBtnHandler = () => {
    console.log("ChangePhone button clicked");
    fetch(`${baseUrl}/api/cancelPhone?token=${token}`)
        .then(response => response.json())
        .then(data => {
            loadData();
            document.getElementById('message').textContent = "号码已更换，请再次取号";
        })
        .catch(error => {
            console.error("Change phone error:", error);
            document.getElementById('message').textContent = "更换号码失败，请重试";
        });
};

// 动态绑定和解绑换号按钮事件
function bindChangePhoneEvent() {
    const changePhoneBtn = document.getElementById('changePhoneBtn');
    if (changePhoneBtn) {
        changePhoneBtn.removeEventListener('click', changePhoneBtnHandler); // 避免重复绑定
        changePhoneBtn.addEventListener('click', changePhoneBtnHandler);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    bindChangePhoneEvent(); // 页面加载时绑定
    loadData();
});

// 每次更新按钮时重新绑定事件
function rebindChangePhoneEvent() {
    const changePhoneBtn = document.getElementById('changePhoneBtn');
    if (changePhoneBtn) {
        bindChangePhoneEvent();
    }
}

updateButtons(); // 初始调用
setInterval(rebindChangePhoneEvent, 1000); // 每秒检查并绑定
