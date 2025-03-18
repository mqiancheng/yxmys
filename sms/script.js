const api = {
    getKeyInfo(token) {
        return fetch(`/api/getKeyInfo?token=${token}`).then(res => res.json()).catch(err => {
            document.getElementById("phoneStatus").textContent = "错误: " + err.message;
            throw err;
        });
    },
    getPhone(token) {
        return fetch(`/api/getPhone?token=${token}`).then(res => res.json()).catch(err => {
            document.getElementById("phoneStatus").textContent = "错误: " + err.message;
            throw err;
        });
    },
    getCode(token) {
        return fetch(`/api/getCode?token=${token}`).then(res => res.json()).catch(err => {
            document.getElementById("codeStatus").textContent = "错误: " + err.message;
            throw err;
        });
    }
};

function getTokenFromUrl() {
    return new URLSearchParams(window.location.search).get('token');
}

function copyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
}

let keyData = {};
let pollInterval;

async function loadData() {
    const token = getTokenFromUrl();
    if (!token) {
        document.getElementById("phoneStatus").textContent = "缺少 Token";
        return;
    }

    const res = await api.getKeyInfo(token);
    if (!res.data) {
        document.getElementById("phoneStatus").textContent = "无效的 Token";
        return;
    }

    keyData = res.data;
    document.getElementById("phone").value = keyData.phone || "未获取";
    document.getElementById("code").value = keyData.code || "未收到验证码";

    switch (keyData.status) {
        case "unused":
            document.getElementById("getPhone").style.display = "";
            document.getElementById("copyPhone").style.display = "none";
            document.getElementById("phoneStatus").textContent = "点击取号开始";
            break;
        case "phone_assigned":
            document.getElementById("getPhone").style.display = "none";
            document.getElementById("copyPhone").style.display = "";
            document.getElementById("codeStatus").textContent = "等待验证码...";
            break;
        case "code_received":
            document.getElementById("getPhone").style.display = "none";
            document.getElementById("copyPhone").style.display = "";
            document.getElementById("copyCode").style.display = "";
            document.getElementById("codeStatus").textContent = "已完成";
            clearInterval(pollInterval);
            break;
    }
}

document.getElementById("getPhone").addEventListener("click", async () => {
    await api.getPhone(getTokenFromUrl());
    loadData();
});

document.getElementById("copyPhone").addEventListener("click", () => {
    copyToClipboard(document.getElementById("phone").value);
    document.getElementById("phoneStatus").textContent = "手机号已复制";
});

document.getElementById("copyCode").addEventListener("click", () => {
    copyToClipboard(document.getElementById("code").value);
    document.getElementById("codeStatus").textContent = "验证码已复制";
});

pollInterval = setInterval(async () => {
    if (keyData.status === "phone_assigned") {
        await api.getCode(getTokenFromUrl());
        loadData();
    }
}, 3000);

loadData();
