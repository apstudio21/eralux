# Eralux — натяжні стелі

Статичний сайт: HTML + CSS + JS, без збірки. Адмін-панель — Decap CMS (`/admin`).

- `index.html` — головна
- `assets/css`, `assets/js`, `assets/fonts`
- `images/` — фото й бренд, `images/uploads` — завантаження з адмінки
- `content/` — тексти й ціни (JSON), які редагує адмінка
- `_headers`, `_redirects` — для Cloudflare Pages

Поки сайт у розробці: `noindex`, robots закритий.

## Розміщення
- Репозиторій: github.com/eraluxsteli/eralux
- Хостинг: Cloudflare Pages (автодеплой з гілки main)
- Змінні Cloudflare (Production): TELEGRAM_BOT_TOKEN (secret), TELEGRAM_CHAT_ID; опційно TURNSTILE_SECRET
- Заявки з форм приходять у Telegram-групу «Заявки (EraLux)» через бота @eralux_leads_bot
