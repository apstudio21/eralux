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
        var a = li.querySelector('.strip__link');
        if (a && RE_HREF.test(p.link || '')) a.href = p.link;
      });
    }
  }


  /* ---------- 3. Про нас ---------- */
  function applyStats(d) {
    if (!d) return;
    bindText('stats', d);
    var img = $('about-photo');
    if (img && typeof d.photo === 'string' && RE_IMG.test(d.photo) && d.photo !== img.getAttribute('src')) img.src = d.photo;
    if (img && typeof d.photo_alt === 'string' && d.photo_alt.trim()) img.alt = d.photo_alt.trim();
  }

  function countUp(el) {
    var raw = el.textContent.trim();
    if (!/^\d{1,6}$/.test(raw) || reduce) return;
    var end = parseInt(raw, 10), t0 = null, dur = 1500;
    el.textContent = '0';
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(end * e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- 4. Світло: день / вечір ---------- */
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  function initLight(remote, remotePrices) {
    var sec = $('light'); if (!sec) return;
    var def = null;
    try { def = JSON.parse($('light-default').textContent); } catch (e) { def = null; }
    var L = (remote && Array.isArray(remote.rooms) && remote.rooms.length) ? remote : (def && def.light);
    var P = (remotePrices && Array.isArray(remotePrices.light)) ? remotePrices : (def && def.prices);
    if (!L || !P) return;
    if (remote) bindText('light', remote);
    var byId = {}; P.light.forEach(function (x) { if (x && x.id) byId[x.id] = x; });

    var sw = $('light-switch'), day = $('light-day'), night = $('light-night'), pics = $('light-pics');
    var tabs = $('light-rooms'), list = $('light-items'), total = $('light-total'), chip = $('light-room-chip');
    var rooms = L.rooms.filter(function (r) { return r && RE_IMG.test(r.day || '') && RE_IMG.test(r.night || ''); }).slice(0, 4);
    if (!rooms.length) return;

    // вкладки кімнат з даних
    tabs.textContent = '';
    rooms.forEach(function (r, i) {
      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === 0 ? 'true' : 'false'); b.dataset.room = i;
      [['rooms__n', '0' + (i + 1)], ['rooms__name', r.name || ''], ['rooms__m', r.area || '']].forEach(function (c) {
        var s = document.createElement('span'); s.className = c[0]; s.textContent = c[1]; b.appendChild(s);
      });
      li.appendChild(b); tabs.appendChild(li);
    });

    // «Також робимо»
    if (Array.isArray(L.also)) {
      var also = $('light-also'), frag = document.createDocumentFragment();
      L.also.forEach(function (id) {
        var x = byId[id]; if (!x) return;
        var li = document.createElement('li'), b = document.createElement('b');
        li.appendChild(document.createTextNode(x.name));
        b.textContent = 'від ' + fmt(x.price) + ' грн/' + x.unit; li.appendChild(b); frag.appendChild(li);
      });
      if (frag.childNodes.length) { also.textContent = ''; also.appendChild(frag); }
    }

    var current = 0, sum = 0;
    function render(i, animate) {
      var r = rooms[i]; sum = 0;
      var frag = document.createDocumentFragment();
      (r.items || []).forEach(function (it) {
        var x = byId[it && it.id]; var q = Number(it && it.qty);
        if (!x || !(q > 0)) return;
        var cost = q * x.price; sum += cost;
        var li = document.createElement('li'), sp = document.createElement('span'), sm = document.createElement('small'), b = document.createElement('b');
        sp.textContent = (typeof it.label === 'string' && it.label.trim()) ? it.label.trim() : x.name;
        sm.textContent = q + ' ' + x.unit; sp.appendChild(sm);
        b.textContent = fmt(cost) + ' грн';
        li.appendChild(sp); li.appendChild(b); frag.appendChild(li);
      });
      function swap() {
        list.textContent = ''; list.appendChild(frag);
        total.textContent = fmt(sum);
        chip.textContent = (r.name || '') + (r.area ? ' · ' + r.area : '');
        requestAnimationFrame(function () { list.classList.remove('is-out'); });
      }
      if (animate && !reduce) { list.classList.add('is-out'); setTimeout(swap, 280); } else swap();
    }
    function setPhotos(i) {
      var r = rooms[i];
      function apply() {
        day.removeAttribute('srcset'); night.removeAttribute('srcset');
        day.src = r.day; night.src = r.night;
        day.alt = r.alt_day || r.name || ''; night.alt = r.alt_night || r.name || '';
      }
      if (reduce) { apply(); return; }
      pics.style.transition = 'opacity .35s ease'; pics.style.opacity = '0';
      setTimeout(function () { apply(); var im = new Image(); im.onload = im.onerror = function () { pics.style.opacity = '1'; }; im.src = sec.classList.contains('is-night') ? r.night : r.day; }, 350);
    }
    function setNight(on) {
      sec.classList.toggle('is-night', on);
      sw.setAttribute('aria-checked', on ? 'true' : 'false');
      sw.setAttribute('aria-label', on ? 'Повернути денне світло' : 'Увімкнути вечірнє світло');
      document.documentElement.classList.toggle('light-night', on);
    }

    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-room]'); if (!b) return;
      var i = +b.dataset.room; if (i === current) return;
      tabs.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      current = i; setPhotos(i); render(i, true);
    });
    sw.addEventListener('click', function () { setNight(sw.getAttribute('aria-checked') !== 'true'); });

    render(0, false);
    // при першій появі блоку світло вмикається само – один раз
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { io.disconnect(); setTimeout(function () { if (sw.getAttribute('aria-checked') !== 'true') setNight(true); }, 900); }
      }, { threshold: 0.45 });
      io.observe($('light-pics').parentNode);
    }
  }


  /* ---------- 5. Полотно і профіль ---------- */
  function initCeilings(d, P) {
    var list = $('canv-list'), pic = document.querySelector('.canv__pic'), img = $('canv-img'), tag = $('canv-tag');
    if (!list || !img) return;
    if (d) bindText('ceilings', d);
    var priceById = {}, nameById = {};
    if (P && Array.isArray(P.canvases)) P.canvases.forEach(function (c) { if (c && c.id) { priceById[c.id] = c.price; nameById[c.id] = c.name; } });
    // дані з адмінки: тексти й фото полотен
    var items = [];
    if (d && Array.isArray(d.canvases)) {
      d.canvases.forEach(function (c) { if (c && RE_IMG.test(c.image || '')) items.push(c); });
    }
    if (items.length) {
      list.textContent = '';
      items.forEach(function (c, i) {
        var li = document.createElement('li'), b = document.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === 0 ? 'true' : 'false'); b.dataset.canvas = i;
        var n = document.createElement('span'); n.className = 'canv__name'; n.textContent = nameById[c.id] || c.name || '';
        var pr = document.createElement('span'); pr.className = 'canv__price'; pr.textContent = priceById[c.id] != null ? fmt(priceById[c.id]) + ' грн/м²' : '';
        var t = document.createElement('span'); t.className = 'canv__text'; t.textContent = c.text || '';
        b.appendChild(n); b.appendChild(pr); b.appendChild(t); li.appendChild(b); list.appendChild(li);
      });
    } else if (Object.keys(priceById).length) {
      list.querySelectorAll('.canv__price').forEach(function (el, i) { var id = ['matte', 'satin', 'gloss', 'fabric'][i]; if (priceById[id] != null) el.textContent = fmt(priceById[id]) + ' грн/м²'; });
    }
    var srcs = items.length ? items.map(function (c) { return { src: c.image, alt: c.alt || '', name: nameById[c.id] || '' }; }) : [
      { src: 'images/ceilings/matte.webp', alt: 'Матова натяжна стеля з вбудованою світловою лінією', name: 'Матове' },
      { src: 'images/ceilings/satin.webp', alt: 'Вітальня з сатиновою натяжною стелею і світловими лініями', name: 'Сатин' },
      { src: 'images/ceilings/gloss.webp', alt: 'Глянцева натяжна стеля з підсвіткою, у якій віддзеркалюється кімната', name: 'Глянець' },
      { src: 'images/ceilings/fabric.webp', alt: 'Фактура тканинної натяжної стелі зблизька', name: 'Тканинне' }
    ];
    // попереднє завантаження, щоб перемикання було без «білого кадру»
    srcs.forEach(function (x) { var im = new Image(); im.src = x.src; });
    var cur = 0;
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-canvas]'); if (!b) return;
      var i = +b.dataset.canvas; if (i === cur || !srcs[i]) return; cur = i;
      list.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      function apply() { img.src = srcs[i].src; img.alt = srcs[i].alt; tag.textContent = srcs[i].name; requestAnimationFrame(function () { pic.classList.remove('is-swap'); }); }
      if (reduce) { apply(); return; }
      pic.classList.add('is-swap'); setTimeout(apply, 300);
    });

    // профілі: ціни з prices.json, тексти з адмінки
    var profMap = {};
    if (P && Array.isArray(P.profiles)) P.profiles.forEach(function (x) { if (x && x.id) profMap[x.id] = x; });
    var profText = {};
    if (d && Array.isArray(d.profiles)) d.profiles.forEach(function (x) { if (x && x.id && typeof x.text === 'string') profText[x.id] = x.text; });
    document.querySelectorAll('#profs .prof').forEach(function (card) {
      var id = card.dataset.profile, x = profMap[id];
      if (x) {
        card.querySelector('.prof__name').textContent = x.name;
        card.querySelector('.prof__price').textContent = x.price > 0 ? '+' + fmt(x.price) + ' грн/м.п.' : 'у ціні';
      }
      if (profText[id] && profText[id].trim()) card.querySelector('.prof__text').textContent = profText[id].trim();
    });
  }

  /* ---------- Хедер: прилипає, ховається при скролі вниз ---------- */
  function initHeader() {
    var hdr = $('hdr'), mbar = $('mbar'), lastY = window.scrollY, ticking = false;
    function update() {
      var y = window.scrollY;
      hdr.classList.toggle('is-stuck', y > 40);
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
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); en.target.querySelectorAll('.count').forEach(countUp); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { if (!el.classList.contains('is-in')) io.observe(el); });
  }

  function start() { requestAnimationFrame(function () { doc.classList.add('is-loaded'); }); }

  initHeader();
  initNavPill();
  initMenu();

  Promise.race([Promise.all([load('header'), load('hero'), load('stats'), load('light'), load('prices'), load('ceilings')]), timeout(1200)]).then(function (res) {
    if (res) { applyHeader(res[0]); applyHero(res[1]); applyStats(res[2]); }
    initLight(res ? res[3] : null, res ? res[4] : null);
    initCeilings(res ? res[5] : null, res ? res[4] : null);
    reveals();
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, timeout(900)]).then(start);
  });
})();
