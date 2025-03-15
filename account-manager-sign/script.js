// 登录密码（从环境变量获取）
const LOGIN_PASSWORD = window.env.LOGIN_PASSWORD || 'mnqswahi'; // 默认值仅用于调试
console.log('LOGIN_PASSWORD:', LOGIN_PASSWORD); // 调试：输出实际密码值

// 环境变量注入（由 [[path]].js 处理）
window.env = window.env || {};
console.log('window.env:', window.env); // 调试：输出环境变量

// 登录逻辑
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) {
    console.error('Login form not found!');
    return;
  }

  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log('Login form submitted'); // 调试：确认事件触发
    const password = document.getElementById('login-password').value;
    console.log('Entered password:', password); // 调试：输出用户输入的密码
    if (password === LOGIN_PASSWORD) {
      console.log('Password correct, logging in...');
      document.getElementById('login-container').style.display = 'none';
      document.getElementById('content-container').style.display = 'block';
      loadAccounts();
    } else {
      console.log('Password incorrect');
      alert('密码错误！');
    }
  });
});

// 加载账号列表
async function loadAccounts() {
  try {
    const response = await fetch(`${window.env.API_URL}/accounts?secret=${window.env.SECRET}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`);
    }
    const accounts = await response.json();
    const accountList = document.getElementById('account-list');
    accountList.innerHTML = '';

    if (Array.isArray(accounts)) {
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
    } else {
      throw new Error('Invalid account data format');
    }
  } catch (error) {
    console.error('Error loading accounts:', error);
    alert('无法加载账号列表，请检查网络或 API 配置。错误详情：' + error.message);
  }
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

  try {
    const response = await fetch(`${window.env.API_URL}/accounts?secret=${window.env.SECRET}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAccount)
    });
    if (!response.ok) {
      throw new Error(`Failed to add account: ${response.status} ${response.statusText}`);
    }
    alert('账号添加成功！');
    e.target.reset();
    loadAccounts();
  } catch (error) {
    console.error('Error adding account:', error);
    alert('添加账号失败：' + error.message);
  }
});

// 删除账号
async function deleteAccount(appPst) {
  if (confirm('确定删除此账号？')) {
    try {
      const response = await fetch(`${window.env.API_URL}/accounts/delete?secret=${window.env.SECRET}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appPst })
      });
      if (!response.ok) {
        throw new Error(`Failed to delete account: ${response.status} ${response.statusText}`);
      }
      alert('账号删除成功！');
      loadAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('删除账号失败：' + error.message);
    }
  }
}

// 编辑账号
async function editAccount(appPst) {
  try {
    const response = await fetch(`${window.env.API_URL}/accounts?secret=${window.env.SECRET}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`);
    }
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
    if (!editResponse.ok) {
      throw new Error(`Failed to update account: ${editResponse.status} ${editResponse.statusText}`);
    }
    alert('账号修改成功！');
    loadAccounts();
  } catch (error) {
    console.error('Error editing account:', error);
    alert('修改账号失败：' + error.message);
  }
}
