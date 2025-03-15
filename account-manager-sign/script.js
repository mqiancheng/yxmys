// 确保 window.env 存在
window.env = window.env || {};
console.log('Initial window.env:', JSON.stringify(window.env)); // 调试：输出初始 window.env

// 自动加载账号列表
document.addEventListener('DOMContentLoaded', () => {
  loadAccounts();
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

// 添加账号
document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const newAccount = {
    appPst: formData.get('appPst').trim(),
    sctKey: formData.get('sctKey') ? formData.get('sctKey').trim() : undefined,
    startDate: formData.get('startDate').trim(),
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
    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || `Failed to add account: ${response.status} ${response.statusText}`);
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
      const apiUrl = window.env.API_URL || 'https://yxmys-kv-manager-sign.qldyf.workers.dev';
      const secret = window.env.SECRET || '666';
      const response = await fetch(`${apiUrl}/accounts/${appPst}?secret=${secret}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || `Failed to delete account: ${response.status} ${response.statusText}`);
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
  const newAppPst = prompt('输入新的 appPst:', appPst);
  const newSctKey = prompt('输入新的 sctKey (可选):');
  const newStartDate = prompt('输入新的开始日期 (YYYY-MM-DD):');
  const newSignDays = prompt('输入新的签到天数:');

  if (newAppPst && newStartDate && newSignDays) {
    const updatedAccount = {
      appPst: newAppPst.trim(),
      sctKey: newSctKey ? newSctKey.trim() : undefined,
      startDate: newStartDate.trim(),
      signDays: parseInt(newSignDays)
    };
    try {
      const apiUrl = window.env.API_URL || 'https://yxmys-kv-manager-sign.qldyf.workers.dev';
      const secret = window.env.SECRET || '666';
      const response = await fetch(`${apiUrl}/accounts/${appPst}?secret=${secret}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAccount)
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || `Failed to update account: ${response.status} ${response.statusText}`);
      }
      alert('账号更新成功！');
      loadAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
      alert('更新账号失败：' + error.message);
    }
  } else {
    alert('所有必填字段必须填写！');
  }
}
