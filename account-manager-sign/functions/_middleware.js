export async function onRequest(context) {
  const response = await context.next();
  const html = await response.text();

  // 替换占位符
  const modifiedHtml = html
    .replace('__API_URL__', context.env.API_URL)
    .replace('__SECRET__', context.env.SECRET);

  return new Response(modifiedHtml, {
    status: response.status,
    headers: response.headers
  });
}
