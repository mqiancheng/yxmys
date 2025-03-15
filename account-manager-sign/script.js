// 登录密码（从环境变量获取）
const LOGIN_PASSWORD = window.env.LOGIN_PASSWORD || 'your-login-password'; // 默认值仅用于调试

// 登录逻辑
document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const password = document.getElementById('login-password').value;
  if (password === LOGIN_PASSWORD) {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('content-container').style.display = 'block';
    loadAccounts();
  } else {
    alert('密码错误！');
  }
});

// 环境变量注入（由 [[path]].js 处理）
window.env = window.env || {};

// 加载账号列表
async function loadAccounts() {
  const response = await fetch(`${window.env.API_URL}/accounts?secret=${window.env.SECRET}`);
  const accounts = await response.json();
  const accountList = document.getElementById('account-list');
  accountList.innerHTML = '';

  accounts.forEach(account => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${account.appPst.slice(0, 20)}...</td>
      <td>${account.sctKey || '无'}</td>
      <td>${account.startDate}</td>
      <td>${account.signDays}</td>
      <td>
        <button class="edit" onclick="editAccount('${account.appPst}')">编辑</button>
        <button class="delete" onclick="deleteAccount('${account.appPst}')">删除</button>
      </td>
    `;
    accountList.appendChild(row);
  });
}

// 添加账号
document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const newAccount = {
    appPst: formData.get('appPst'),
    sctKey: formData.get('sctKey') || undefined,
    startDate: formData.get('startDate'),
    signDays: parseInt(formData.get('signDays'))
  };

  const response = await fetch(`${window.env.API_URL}/accounts?secret=${window.env.SECRET}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newAccount)
  });

  if (response.ok) {
    alert('账号添加成功！');
    e.target.reset();
    loadAccounts();
  } else {
    alert('添加失败: ' + await response.text());
  }
});

// 删除账号
async function deleteAccount(appPst) {
  if (confirm('确定删除此账号？')) {
    const response = await fetch(`${window.env.API_URL}/accounts/delete?secret=${window.env.SECRET}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appPst })
    });
    if (response.ok) {
      alert('账号删除成功！');
      loadAccounts();
    } else {
      alert('删除失败: ' + await response.text());
    }
  }
}

// 编辑账号
async function editAccount(appPst) {
  const response = await fetch(`${window.env.API_URL}/accounts?secret=${window.env.SECRET}`);
  const accounts = await response.json();
  const account = accounts.find(acc => acc.appPst === appPst);

  const newSctKey = prompt('请输入新的 sctKey（留空表示不修改）：', account.sctKey || '');
  const newStartDate = prompt('请输入新的开始日期 (YYYY-MM-DD)：', account.startDate);
  const newSignDays = prompt('请输入新的签到天数：', account.signDays);

  const updatedAccount = {
    appPst: account.appPst,
    sctKey: newSctKey || account.sctKey,
    startDate: newStartDate || account.startDate,
    signDays: parseInt(newSignDays) || account.signDays
  };

  const editResponse = await fetch(`${window.env.API_URL}/accounts/update?secret=${window.env.SECRET}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedAccount)
  });
  if (editResponse.ok) {
    alert('账号修改成功！');
    loadAccounts();
  } else {
    alert('修改失败: ' + await editResponse.text());
  }
}

// 页面加载时显示登录框
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-container').style.display = 'block';
});
