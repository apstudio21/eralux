/* Eralux – основний скрипт */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Безпечні перевірки значень із адмінки ---------- */
  var RE_HREF = /^(#[a-z0-9-]+|[a-z0-9-]+\.html(#[a-z0-9-]+)?)$/;
  var RE_TEL = /^\+380\d{9}$/;
  var RE_IMG = /^images\/[\w\-./ ]+\.(webp|jpe?g|png|avif)$/i;
  var RE_GMAPS = /^https:\/\/(maps\.app\.goo\.gl\/[A-Za-z0-9]+|(www\.)?google\.[a-z.]+\/maps\/[^\s"'<>]+|g\.page\/[^\s"'<>]+)$/;

  /* ---------- Контент із content/*.json (дефолти вже є в HTML) ---------- */
  function load(name) {
    return fetch('content/' + name + '.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  function timeout(ms) { return new Promise(function (r) { setTimeout(function () { r(null); }, ms); }); }

  function bindText(scope, data) {
    if (!data) return;
    document.querySelectorAll('[data-bind^="' + scope + '."]').forEach(function (el) {
      var v = data[el.getAttribute('data-bind').slice(scope.length + 1)];
      if (typeof v === 'string' && v.trim()) el.textContent = v.trim();
    });
  }

  function applyHeader(h) {
    if (!h) return;
    bindText('header', h);
    if (Array.isArray(h.nav) && h.nav.length) {
      ['nav-list', 'menu-list'].forEach(function (id) {
        var ul = $(id); if (!ul) return;
        var frag = document.createDocumentFragment();
        h.nav.forEach(function (it) {
          if (!it || typeof it.label !== 'string' || !RE_HREF.test(it.href || '')) return;
          var li = document.createElement('li'), a = document.createElement('a');
          a.href = it.href; a.textContent = it.label; li.appendChild(a); frag.appendChild(li);
        });
        if (frag.childNodes.length) { ul.textContent = ''; ul.appendChild(frag); }
      });
    }
    if (RE_TEL.test(h.phone_tel || '')) {
      ['header-phone', 'menu-phone', 'mbar-call'].forEach(function (id) { var a = $(id); if (a) a.href = 'tel:' + h.phone_tel; });
    }
  }

  function applyHero(d) {
    if (!d) return;
    bindText('hero', d);
    var rate = $('hero-rate');
    if (rate && RE_GMAPS.test(d.rating_url || '')) rate.href = d.rating_url;
    if (Array.isArray(d.photos)) {
      var items = document.querySelectorAll('#hero-strip .strip__item');
      d.photos.slice(0, items.length).forEach(function (p, i) {
        if (!p) return;
        var li = items[i], img = li.querySelector('img');
        if (typeof p.image === 'string' && RE_IMG.test(p.image) && p.image !== img.getAttribute('src')) {
          img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.src = p.image;
        }
        if (typeof p.alt === 'string' && p.alt.trim()) img.alt = p.alt.trim();
        var t = li.querySelector('.tag'), c = li.querySelector('.strip__cap');
        if (typeof p.tag === 'string' && p.tag.trim()) t.textContent = p.tag.trim();
        if (typeof p.caption === 'string' && p.caption.trim()) c.textContent = p.caption.trim();
      });
    }
  }

  /* ---------- Хедер: прилипає, ховається при скролі вниз ---------- */
  function initHeader() {
    var hdr = $('hdr'), mbar = $('mbar'), lastY = window.scrollY, ticking = false;
    function update() {
      var y = window.scrollY;
      hdr.classList.toggle('is-stuck', y > 40);
      if (!doc.classList.contains('menu-open')) hdr.classList.toggle('is-hidden', y > 320 && y > lastY + 2);
      if (y < lastY - 2) hdr.classList.remove('is-hidden');
      if (mbar) mbar.classList.toggle('is-on', y > window.innerHeight * 0.55);
      lastY = y; ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- Меню: «пігулка», що їде за курсором ---------- */
  function initNavPill() {
    var nav = document.querySelector('.nav'), pill = nav && nav.querySelector('.nav__pill');
    if (!nav || !pill) return;
    var hot = null;
    function move(a) {
      if (hot) hot.classList.remove('is-hot');
      hot = a;
      if (!a) { nav.classList.remove('has-pill'); return; }
      var nr = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
      pill.style.width = r.width + 'px';
      pill.style.transform = 'translateX(' + (r.left - nr.left) + 'px)';
      nav.classList.add('has-pill'); a.classList.add('is-hot');
    }
    nav.addEventListener('mouseover', function (e) { var a = e.target.closest('a'); if (a) move(a); });
    nav.addEventListener('focusin', function (e) { var a = e.target.closest('a'); if (a) move(a); });
    nav.addEventListener('mouseleave', function () { move(null); });
    nav.addEventListener('focusout', function (e) { if (!nav.contains(e.relatedTarget)) move(null); });
  }

  /* ---------- Мобільне меню ---------- */
  function initMenu() {
    var btn = $('burger'), menu = $('menu'), logo = document.querySelector('.hdr__logo img');
    if (!btn || !menu) return;
    var srcDark = logo.getAttribute('src'), srcLight = 'images/brand/logo-light.svg';
    function open() {
      menu.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add('is-open'); }); });
      doc.classList.add('menu-open'); btn.setAttribute('aria-expanded', 'true');
      btn.querySelector('span').textContent = 'Закрити'; logo.src = srcLight;
    }
    function close(focus) {
      menu.classList.remove('is-open'); doc.classList.remove('menu-open');
      btn.setAttribute('aria-expanded', 'false'); btn.querySelector('span').textContent = 'Меню'; logo.src = srcDark;
      setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, reduce ? 0 : 700);
      if (focus) btn.focus();
    }
    btn.addEventListener('click', function () { menu.classList.contains('is-open') ? close() : open(); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) close(true); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (m) { if (m.matches) close(); });
  }

  /* ---------- Поява блоків ---------- */
  function reveals() {
    var els = document.querySelectorAll('[data-reveal]');
    document.querySelectorAll('#hero-strip [data-reveal]').forEach(function (el, i) { el.style.setProperty('--d', (0.45 + i * 0.12) + 's'); });
    document.querySelectorAll('.hero__title .ln > span').forEach(function (el, i) { el.style.setProperty('--i', i); });
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    // фото першого екрана – одразу після завантаження, не чекаючи скролу
    document.querySelectorAll('.hero [data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { if (!el.classList.contains('is-in')) io.observe(el); });
  }

  function start() { requestAnimationFrame(function () { doc.classList.add('is-loaded'); }); }

  initHeader();
  initNavPill();
  initMenu();

  Promise.race([Promise.all([load('header'), load('hero')]), timeout(1200)]).then(function (res) {
    if (res) { applyHeader(res[0]); applyHero(res[1]); }
    reveals();
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, timeout(900)]).then(start);
  });
})();
