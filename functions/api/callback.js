// Decap CMS: повернення з GitHub, обмін коду на токен і передача його у вікно адмінки.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)cms_state=([^;]+)/);
  let status = 'error', payload = { message: 'Помилка входу' };

  if (code && state && cookie && cookie[1] === state && env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'eralux-cms' },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: url.origin + '/api/callback' })
    });
    const d = await r.json().catch(() => ({}));
    if (d.access_token) { status = 'success'; payload = { token: d.access_token, provider: 'github' }; }
  }

  const msg = JSON.stringify('authorization:github:' + status + ':' + JSON.stringify(payload));
  const origin = JSON.stringify(url.origin);
  const html = `<!doctype html><meta charset="utf-8"><title>Вхід…</title><p>Вхід…</p><script>
(function () {
  var O = ${origin};
  function done(e) {
    if (e.origin !== O) return;
    window.opener.postMessage(${msg}, O);
    window.removeEventListener('message', done);
    setTimeout(function () { window.close(); }, 300);
  }
  window.addEventListener('message', done);
  if (window.opener) window.opener.postMessage('authorizing:github', O);
})();
</script>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': 'cms_state=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Lax'
    }
  });
}
