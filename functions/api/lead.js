/**
 * Cloudflare Pages Function: POST /api/lead
 * Приймає заявку з форм сайту і надсилає її в Telegram.
 *
 * Змінні середовища (Cloudflare → Pages → Settings → Variables, тип Secret):
 *   TELEGRAM_BOT_TOKEN – токен бота від @BotFather
 *   TELEGRAM_CHAT_ID   – id чату/групи, куди приходять заявки
 *   TURNSTILE_SECRET   – (необовʼязково) секрет Cloudflare Turnstile; якщо задано, токен перевіряється
 */
const MAX_BODY = 4096;
const FORMS = { calc: 'Калькулятор', measure: 'Замір', hero: 'Перший екран', dealer: 'Дилерам', job: 'Вакансія' };

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function clip(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n); }
function json(status, data) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function onRequestPost({ request, env }) {
  // лише запити з нашого ж сайту
  const origin = request.headers.get('Origin');
  const host = new URL(request.url).host;
  if (origin && new URL(origin).host !== host) return json(403, { ok: false });

  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_BODY) return json(413, { ok: false });
  let raw;
  try { raw = await request.text(); } catch { return json(400, { ok: false }); }
  if (raw.length > MAX_BODY) return json(413, { ok: false });
  let d;
  try { d = JSON.parse(raw); } catch { return json(400, { ok: false }); }
  if (!d || typeof d !== 'object') return json(400, { ok: false });

  // honeypot
  if (d.company) return json(200, { ok: true });

  const phone = clip(d.phone, 20);
  if (!/^\+380\d{9}$/.test(phone)) return json(422, { ok: false, error: 'phone' });

  if (env.TURNSTILE_SECRET) {
    const token = clip(d.turnstile, 2048);
    const fd = new FormData();
    fd.append('secret', env.TURNSTILE_SECRET);
    fd.append('response', token);
    fd.append('remoteip', request.headers.get('CF-Connecting-IP') || '');
    const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: fd }).then((r) => r.json()).catch(() => ({}));
    if (!v.success) return json(403, { ok: false, error: 'captcha' });
  }

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return json(500, { ok: false, error: 'config' });

  const form = FORMS[d.form] || 'Сайт';
  const lines = [
    `<b>Нова заявка · ${esc(form)}</b>`,
    `Телефон: ${esc(phone)}`,
    d.name ? `Імʼя: ${esc(clip(d.name, 80))}` : '',
    d.via ? `Звʼязок: ${esc(clip(d.via, 20))}` : '',
    d.city ? `Місто: ${esc(clip(d.city, 60))}` : '',
    d.time ? `Коли зручно: ${esc(clip(d.time, 60))}` : '',
    d.case ? `Обʼєкт із сайту: ${esc(clip(d.case, 120))}` : '',
    d.details ? `Деталі: ${esc(clip(d.details, 900))}` : '',
    d.comment ? `Коментар: ${esc(clip(d.comment, 900))}` : '',
  ].filter(Boolean);

  const tg = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
  }).catch(() => null);

  if (!tg || !tg.ok) return json(502, { ok: false });
  return json(200, { ok: true });
}

export function onRequest() {
  return json(405, { ok: false });
}
