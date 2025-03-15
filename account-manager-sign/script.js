// 确保 window.env 存在
window.env = window.env || {};
console.log('Initial window.env:', JSON.stringify(window.env)); // 调试：输出初始 window.env

// 登录密码（从环境变量获取）
const LOGIN_PASSWORD = (window.env.LOGIN_PASSWORD || 'mnqswahi').toString().trim().replace(/\s+/g, ''); // 确保为字符串并去除所有空白字符
console.log('LOGIN_PASSWORD:', LOGIN_PASSWORD, 'length:', LOGIN_PASSWORD.length); // 调试：输出实际密码值和长度

// 确保 DOM 加载后绑定事件
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) {
    console.error('Login form not found!');
    return;
  }

  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log('Login form submitted'); // 调试：确认事件触发
    const passwordInput = document.getElementById('login-password');
    const password = passwordInput ? passwordInput.value.trim().replace(/\s+/g, '') : '';
    console.log('Entered password:', password, 'length:', password.length); // 调试：输出用户输入的密码和长度
    console.log('Comparing:', { password, LOGIN_PASSWORD }); // 调试：输出比较值
    if (typeof password === 'string' && typeof LOGIN_PASSWORD === 'string' && password === LOGIN_PASSWORD) {
      console.log('Password correct, logging in...');
      document.getElementById('login-container').style.display = 'none';
      document.getElementById('content-container').style.display = 'block';
      loadAccounts();
    } else {
      console.log('Password incorrect, expected:', LOGIN_PASSWORD, 'got:', password, 'types:', { password: typeof password, LOGIN_PASSWORD: typeof LOGIN_PASSWORD });
      alert('密码错误！请检查拼写，正确密码为: ' + LOGIN_PASSWORD);
    }
  });
});

// 加载账号列表
async function loadAccounts() {
  try {
    const apiUrl = window.env.API_URL || 'https://yxmys-kv-manager-sign.qldyf.workers.dev';
    const secret = window.env.SECRET || '666';
    const response = await fetch(`${apiUrl}/accounts?secret=${secret}`);
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

// 添加账号（保持原有逻辑，略去重复代码）
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
    const apiUrl = window.env.API_URL || 'https://yxmys-kv-manager-sign.qldyf.workers.dev';
    const secret = window.env.SECRET || '666';
    const response = await fetch(`${apiUrl}/accounts?secret=${secret}`, {
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

// 删除账号和编辑账号（保持原有逻辑，略去重复代码）
async function deleteAccount(appPst) { /* ... */ }
async function editAccount(appPst) { /* ... */ }
