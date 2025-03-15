const API_URL = 'https://yxmys-kv-manager-sign.qldyf.workers.dev'; // 替换为你的 kv-manager Worker URL
const SECRET = '666'; // 与 kv-manager 中的密钥一致

// 加载账号列表
async function loadAccounts() {
  const response = await fetch(`${API_URL}/accounts?secret=${SECRET}`);
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

  await fetch(`${API_URL}/accounts?secret=${SECRET}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newAccount)
  });

  alert('账号添加成功！');
  e.target.reset();
  loadAccounts();
});

// 删除账号
async function deleteAccount(appPst) {
  if (confirm('确定删除此账号？')) {
    await fetch(`${API_URL}/accounts/delete?secret=${SECRET}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appPst })
    });
    alert('账号删除成功！');
    loadAccounts();
  }
}

// 编辑账号
async function editAccount(appPst) {
  const response = await fetch(`${API_URL}/accounts?secret=${SECRET}`);
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

  await fetch(`${API_URL}/accounts/update?secret=${SECRET}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedAccount)
  });

  alert('账号修改成功！');
  loadAccounts();
}

// 初始化加载
loadAccounts();
