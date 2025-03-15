export async function onRequest(context) {
  console.log('onRequest triggered for:', context.request.url); // 调试：确认函数执行
  const url = new URL(context.request.url);
  if (url.pathname === '/') {
    const html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>账号管理</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div id="content-container" style="display: block;">
          <div class="container">
            <h1>账号管理</h1>
            <div class="section">
              <h2>添加新账号</h2>
              <form id="add-form">
                <label>appPst:</label>
                <input type="text" name="appPst" required>
                <label>sctKey（可选）:</label>
                <input type="text" name="sctKey">
                <label>开始日期 (YYYY-MM-DD):</label>
                <input type="text" name="startDate" placeholder="2025-01-01" required>
                <label>签到天数:</label>
                <input type="number" name="signDays" required>
                <button type="submit">添加账号</button>
              </form>
            </div>
            <div class="section">
              <h2>账号列表</h2>
              <table id="account-table">
                <thead>
                  <tr>
                    <th>appPst</th>
                    <th>sctKey</th>
                    <th>开始日期</th>
                    <th>签到天数</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody id="account-list"></tbody>
              </table>
            </div>
          </div>
        </div>
        <script>
          window.env = window.env || {};
          window.env.API_URL = '${context.env.API_URL || 'https://yxmys-kv-manager-sign.qldyf.workers.dev'}';
          window.env.SECRET = '${context.env.SECRET || '666'}';
          console.log('Injected window.env from server:', JSON.stringify(window.env)); // 调试：输出注入的环境变量
        </script>
        <script src="/script.js" defer></script>
      </body>
      </html>
    `;
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  return await context.next();
}
