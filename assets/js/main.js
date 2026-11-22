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
    var lcta = sec.querySelector('.light__cta');
    if (lcta) lcta.addEventListener('click', function () {
      var r = rooms[current];
      document.dispatchEvent(new CustomEvent('eralux:light-preset', { detail: { area: r.area, items: r.items } }));
    });

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
    var profText = {}, profImg = {};
    if (d && Array.isArray(d.profiles)) d.profiles.forEach(function (x) {
      if (!x || !x.id) return;
      if (typeof x.text === 'string') profText[x.id] = x;
      if (RE_IMG.test(x.image || '')) profImg[x.id] = x;
    });
    document.querySelectorAll('#profs .prof').forEach(function (card) {
      var id = card.dataset.profile, x = profMap[id];
      if (x) {
        card.querySelector('.prof__name').textContent = x.name;
        card.querySelector('.prof__price').textContent = x.price > 0 ? '+' + fmt(x.price) + ' грн/м.п.' : 'у ціні';
      }
      if (profText[id] && profText[id].text.trim()) card.querySelector('.prof__text').textContent = profText[id].text.trim();
      var ph = card.querySelector('.prof__ph');
      if (ph && profImg[id] && !ph.querySelector('img')) {
        var im = document.createElement('img'); im.src = profImg[id].image; im.alt = profImg[id].alt || ''; im.loading = 'lazy'; im.width = 800; im.height = 600; ph.appendChild(im);
      }
    });
  }


  /* ---------- 6. До / після ---------- */
  function initBA(d) {
    var cmp = $('cmp'); if (!cmp) return;
    if (d) bindText('ba', d);
    var before = $('cmp-before'), after = $('cmp-after'), handle = $('cmp-handle');
    var pairs = (d && Array.isArray(d.pairs)) ? d.pairs.filter(function (x) { return x && RE_IMG.test(x.before || '') && RE_IMG.test(x.after || ''); }).slice(0, 6) : [];
    var T = 14.4, p = 50, touched = false;

    function set(v) {
      p = Math.max(4, Math.min(96, v));
      cmp.style.setProperty('--p', p.toFixed(2));
      handle.setAttribute('aria-valuenow', Math.round(p));
      handle.setAttribute('aria-valuetext', Math.round(100 - p) + '% – після');
    }
    function fromPointer(e) {
      var r = cmp.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height;
      set(x - T + 2 * T * y);   // лінія проходить рівно під пальцем, з урахуванням нахилу 21°
    }
    var dragging = false;
    cmp.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = true; touched = true; cmp.classList.add('is-drag');
      try { cmp.setPointerCapture(e.pointerId); } catch (err) {}
      fromPointer(e);
    });
    cmp.addEventListener('pointermove', function (e) { if (dragging) { fromPointer(e); } });
    function stop() { dragging = false; cmp.classList.remove('is-drag'); }
    cmp.addEventListener('pointerup', stop);
    cmp.addEventListener('pointercancel', stop);
    handle.addEventListener('keydown', function (e) {
      var k = e.key, step = e.shiftKey ? 10 : 5;
      if (k === 'ArrowLeft' || k === 'ArrowDown') set(p - step);
      else if (k === 'ArrowRight' || k === 'ArrowUp') set(p + step);
      else if (k === 'Home') set(4); else if (k === 'End') set(96); else return;
      touched = true; e.preventDefault();
    });

    // підказка рухом при першій появі
    function hint() {
      if (reduce || touched) return;
      var keys = [50, 30, 70, 50], dur = 2400, t0 = null;
      function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
      function step(t) {
        if (touched) return;
        if (!t0) t0 = t;
        var k = Math.min((t - t0) / dur, 1), seg = Math.min(Math.floor(k * 3), 2), lt = ease(k * 3 - seg);
        set(keys[seg] + (keys[seg + 1] - keys[seg]) * lt);
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); setTimeout(hint, 700); } }, { threshold: 0.55 });
      io.observe(cmp);
    }

    // кілька пар з адмінки
    var info = document.querySelector('.ba__info');
    function show(i, animate) {
      var x = pairs[i]; if (!x) return;
      function apply() {
        before.src = x.before; after.src = x.after;
        before.alt = x.alt_before || 'До'; after.alt = x.alt_after || 'Після';
        $('ba-n').textContent = 'Обʼєкт ' + (i < 9 ? '0' : '') + (i + 1);
        $('ba-pair-title').textContent = x.title || '';
        $('ba-pair-text').textContent = x.text || '';
        var ul = $('ba-chips'); ul.textContent = '';
        (Array.isArray(x.chips) ? x.chips : []).forEach(function (c) { if (typeof c === 'string' && c.trim()) { var li = document.createElement('li'); li.textContent = c.trim(); ul.appendChild(li); } });
        set(50);
        cmp.classList.remove('is-out'); info.classList.remove('is-out');
      }
      if (animate && !reduce) { cmp.classList.add('ba__fade', 'is-out'); info.classList.add('ba__fade', 'is-out'); setTimeout(apply, 350); } else apply();
    }
    if (pairs.length) show(0, false);
    if (pairs.length > 1) {
      var list = $('ba-list'); list.hidden = false;
      pairs.forEach(function (x, i) {
        var b = document.createElement('button'), im = document.createElement('img');
        b.type = 'button'; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false'); b.setAttribute('aria-label', x.title || ('Обʼєкт ' + (i + 1)));
        im.src = x.after; im.alt = ''; im.loading = 'lazy'; b.appendChild(im);
        b.addEventListener('click', function () {
          list.querySelectorAll('button').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
          show(i, true);
        });
        list.appendChild(b);
      });
    }
  }

  /* ---------- 7. Проєкти ---------- */
  function caseCard(x, i) {
    var li = document.createElement('li'); li.className = 'case'; li.dataset.case = i;
    var photos = (x.photos || []).filter(function (s) { return RE_IMG.test(s || ''); }).slice(0, 5);
    var pic = document.createElement('div'); pic.className = 'case__pic';
    var img = document.createElement('img'); img.className = 'case__img'; img.src = photos[0] || ''; img.alt = x.alt || x.title || ''; img.loading = 'lazy'; img.width = 1400; img.height = 933; img.draggable = false;
    pic.appendChild(img);
    var tags = document.createElement('div'); tags.className = 'case__tags';
    [x.district, x.area].forEach(function (t) { if (t) { var s = document.createElement('span'); s.className = 'tag'; s.textContent = t; tags.appendChild(s); } });
    pic.appendChild(tags);
    if (photos.length > 1) {
      var ths = document.createElement('div'); ths.className = 'case__ths';
      photos.forEach(function (src, k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'case__th' + (k ? '' : ' is-on'); b.dataset.src = src; b.setAttribute('aria-label', 'Фото ' + (k + 1));
        var ti = document.createElement('img'); ti.src = src; ti.alt = ''; ti.loading = 'lazy'; b.appendChild(ti); ths.appendChild(b);
      });
      pic.appendChild(ths);
    }
    li.appendChild(pic);
    var body = document.createElement('div'); body.className = 'case__body';
    var main = document.createElement('div'); main.className = 'case__main';
    var h = document.createElement('h3'); h.className = 'case__title'; h.textContent = x.title || ''; main.appendChild(h);
    var meta = document.createElement('ul'); meta.className = 'case__meta';
    [x.canvas, x.profile, x.light].forEach(function (t) { if (t) { var m = document.createElement('li'); m.textContent = t; meta.appendChild(m); } });
    main.appendChild(meta); body.appendChild(main);
    var total = 0, rows = (x.breakdown || []).filter(function (b) { return b && b.label; });
    rows.forEach(function (b) { total += Number(b.value) || 0; });
    var sum = document.createElement('div'); sum.className = 'case__sum';
    var pr = document.createElement('p'); pr.className = 'case__price';
    var ps = document.createElement('span'); ps.textContent = '≈ ' + fmt(total); pr.appendChild(ps); pr.appendChild(document.createTextNode(' грн'));
    var un = document.createElement('p'); un.className = 'case__under'; un.textContent = 'під ключ';
    sum.appendChild(pr); sum.appendChild(un); body.appendChild(sum); li.appendChild(body);
    var more = document.createElement('div'); more.className = 'case__more';
    var tg = document.createElement('button'); tg.type = 'button'; tg.className = 'case__toggle'; tg.setAttribute('aria-expanded', 'false'); tg.setAttribute('aria-controls', 'case-break-x' + i);
    var tgs = document.createElement('span'); tgs.textContent = 'Розкладка ціни'; tg.appendChild(tgs); tg.appendChild(document.createElement('i'));
    var br = document.createElement('div'); br.className = 'case__break'; br.id = 'case-break-x' + i;
    var ul = document.createElement('ul');
    rows.forEach(function (b) {
      var r = document.createElement('li'), l = document.createElement('span'), v = document.createElement('b');
      l.textContent = b.label; v.textContent = Number(b.value) > 0 ? fmt(b.value) + ' грн' : 'у ціні';
      r.appendChild(l); r.appendChild(v); ul.appendChild(r);
    });
    br.appendChild(ul);
    var cta = document.querySelector('.case__cta').cloneNode(true); cta.dataset.caseName = x.title || '';
    more.appendChild(tg); more.appendChild(br); more.appendChild(cta); li.appendChild(more);
    return li;
  }

  function initCases(d) {
    var track = $('cases-track'), rail = $('cases-rail'); if (!track) return;
    if (d) bindText('projects', d);
    if (d && Array.isArray(d.items)) {
      var items = d.items.filter(function (x) { return x && x.title && Array.isArray(x.photos) && x.photos.some(function (s) { return RE_IMG.test(s || ''); }); }).slice(0, 8);
      if (items.length) {
        var frag = document.createDocumentFragment();
        items.forEach(function (x, i) { frag.appendChild(caseCard(x, i)); });
        track.textContent = ''; track.appendChild(frag);
      }
    }
    var cards = track.querySelectorAll('.case'), n = cards.length;
    $('cases-all').textContent = (n < 10 ? '0' : '') + n;

    // фото серії: клік або наведення на мініатюру
    track.addEventListener('click', function (e) {
      var th = e.target.closest('.case__th');
      if (th) { swapCase(th); return; }
      var tg = e.target.closest('.case__toggle');
      if (tg) { var c = tg.closest('.case'), open = !c.classList.contains('is-open'); c.classList.toggle('is-open', open); tg.setAttribute('aria-expanded', open ? 'true' : 'false'); return; }
      var cta = e.target.closest('.case__cta');
      if (cta) { document.documentElement.dataset.caseName = cta.dataset.caseName || ''; }
    });
    track.addEventListener('mouseover', function (e) { var th = e.target.closest('.case__th'); if (th && !th.classList.contains('is-on')) swapCase(th); });
    function swapCase(th) {
      var c = th.closest('.case'), img = c.querySelector('.case__img');
      c.querySelectorAll('.case__th').forEach(function (o) { o.classList.toggle('is-on', o === th); });
      var src = th.dataset.src; if (!RE_IMG.test(src || '')) return;
      if (reduce) { img.removeAttribute('srcset'); img.src = src; return; }
      img.classList.add('is-swap');
      var pre = new Image(); pre.onload = pre.onerror = function () { img.removeAttribute('srcset'); img.src = src; requestAnimationFrame(function () { img.classList.remove('is-swap'); }); };
      setTimeout(function () { pre.src = src; }, 180);
    }

    // навігація, лічильник, смуга прогресу
    var prev = $('cases-prev'), next = $('cases-next'), cur = $('cases-cur'), bar = $('cases-bar');
    function idx() {
      var best = 0, min = Infinity, pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      cards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft - pad - track.scrollLeft); if (d < min) { min = d; best = i; } });
      return best;
    }
    function update() {
      var i = idx(), max = track.scrollWidth - track.clientWidth;
      cur.textContent = (i < 9 ? '0' : '') + (i + 1);
      prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft > max - 4;
      var k = max > 0 ? track.scrollLeft / max : 1;
      bar.style.width = ((1 / n) + (1 - 1 / n) * k) * 100 + '%';
    }
    function go(i) {
      i = Math.max(0, Math.min(n - 1, i));
      var pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      track.scrollTo({ left: cards[i].offsetLeft - pad, behavior: reduce ? 'auto' : 'smooth' });
    }
    prev.addEventListener('click', function () { go(idx() - 1); });
    next.addEventListener('click', function () { go(idx() + 1); });
    var tk = false;
    track.addEventListener('scroll', function () { if (!tk) { tk = true; requestAnimationFrame(function () { update(); tk = false; }); } }, { passive: true });
    window.addEventListener('resize', update);
    update();

    // перетягування мишею + курсор «Тягніть»
    var bubble = $('cases-drag'), down = false, moved = 0, sx = 0, sl = 0;
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a, button')) return;
      down = true; moved = 0; sx = e.clientX; sl = track.scrollLeft; track.classList.add('is-drag');
    });
    window.addEventListener('pointermove', function (e) {
      if (down) { var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); track.scrollLeft = sl - dx; }
    });
    window.addEventListener('pointerup', function () {
      if (!down) return; down = false; track.classList.remove('is-drag');
      if (moved > 4) go(idx());
    });
    track.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    if (fine && !reduce) {
      rail.addEventListener('pointermove', function (e) {
        var r = rail.getBoundingClientRect();
        bubble.style.setProperty('--x', (e.clientX - r.left) + 'px');
        bubble.style.setProperty('--y', (e.clientY - r.top) + 'px');
        bubble.classList.add('is-on');
        bubble.classList.toggle('is-small', !!e.target.closest('a, button'));
      });
      rail.addEventListener('pointerleave', function () { bubble.classList.remove('is-on'); });
    }
  }


  /* ---------- Форми: маска телефону і відправка ---------- */
  function phoneDigits(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.indexOf('380') === 0) return d.slice(0, 12);
    if (d.indexOf('80') === 0) return ('3' + d).slice(0, 12);
    if (d.charAt(0) === '0') return ('38' + d).slice(0, 12);
    return d ? ('380' + d).slice(0, 12) : '';
  }
  function phoneFormat(d) {
    if (!d) return '';
    var r = '+38', n = d.slice(2);            // 0XXXXXXXXX
    if (n.length) r += ' (' + n.slice(0, 3);
    if (n.length >= 3) r += ')';
    if (n.length > 3) r += ' ' + n.slice(3, 6);
    if (n.length > 6) r += '-' + n.slice(6, 8);
    if (n.length > 8) r += '-' + n.slice(8, 10);
    return r;
  }
  function maskPhone(input) {
    input.addEventListener('focus', function () { if (!input.value) input.value = '+38 (0'; });
    input.addEventListener('blur', function () { if (phoneDigits(input.value).length <= 3) input.value = ''; });
    input.addEventListener('input', function () {
      var d = phoneDigits(input.value);
      input.value = phoneFormat(d);
      input.removeAttribute('aria-invalid');
    });
  }
  function phoneOk(v) { return /^380\d{9}$/.test(phoneDigits(v)); }
  var DEMO = /(^|\.)github\.io$|^localhost$|^127\.0\.0\.1$|^$/.test(location.hostname) || location.protocol === 'file:';
  function sendLead(data) {
    if (DEMO) return new Promise(function (r) { setTimeout(function () { r(true); }, 700); });
    return fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error('send'); return true; });
  }

  /* ---------- 8. Калькулятор ---------- */
  function initCalc(d, remoteP) {
    var root = $('calc'); if (!root) return;
    if (d) bindText('calc', d);
    var P = remoteP && Array.isArray(remoteP.profiles) ? remoteP : null;
    if (!P) { try { P = JSON.parse($('light-default').textContent).prices; } catch (e) { return; } }
    var MIN = 5, MAX = 120, N = window.matchMedia('(max-width: 599px)').matches ? 34 : 56;
    // периметр рахуємо самі від площі, кути – 4 (як у більшості кімнат); точно – на замірі
    var st = { area: 20, per: 0, cor: 4, canvas: (P.canvases[0] || {}).id, profile: (P.profiles[0] || {}).id, light: {} };
    if (d && Number(d.default_area) >= MIN && Number(d.default_area) <= MAX) st.area = Number(d.default_area);
    var areaIn = $('calc-area'), bars = $('calc-bars');
    function autoPer(a) { return Math.max(8, Math.round(4 * Math.sqrt(a) * 1.06)); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function r50(v) { return Math.round(v / 50) * 50; }

    // смуги-повзунок
    for (var i = 0; i < N; i++) { var b = document.createElement('i'); b.style.setProperty('--h', (28 + 72 * Math.pow(i / (N - 1), .85)).toFixed(1) + '%'); bars.appendChild(b); }
    var barEls = bars.children;
    function paintBars() {
      var k = Math.round((st.area - MIN) / (MAX - MIN) * (N - 1));
      for (var j = 0; j < N; j++) { barEls[j].className = j < k ? 'on' : (j === k ? 'k' : ''); }
      bars.setAttribute('aria-valuenow', st.area); bars.setAttribute('aria-valuetext', st.area + ' м²');
    }
    function setArea(v, from) {
      v = clamp(Math.round(v), MIN, MAX); st.area = v;
      if (from !== 'input') areaIn.value = v;
      fitArea();
      st.per = autoPer(v);
      paintBars(); calc();
    }
    var meas = document.createElement('span');
    meas.setAttribute('aria-hidden', 'true');
    meas.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0';
    document.body.appendChild(meas);
    function fitArea() {
      var cs = getComputedStyle(areaIn);
      meas.style.font = cs.font; meas.style.letterSpacing = cs.letterSpacing;
      meas.textContent = areaIn.value || '0';
      areaIn.style.width = Math.ceil(meas.getBoundingClientRect().width + 6) + 'px';
    }
    areaIn.addEventListener('input', fitArea);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitArea);
    function fromX(e) { var r = bars.getBoundingClientRect(); setArea(MIN + clamp((e.clientX - r.left) / r.width, 0, 1) * (MAX - MIN)); }
    var drag = false;
    bars.addEventListener('pointerdown', function (e) { drag = true; try { bars.setPointerCapture(e.pointerId); } catch (x) {} fromX(e); });
    bars.addEventListener('pointermove', function (e) { if (drag) fromX(e); });
    bars.addEventListener('pointerup', function () { drag = false; });
    bars.addEventListener('pointercancel', function () { drag = false; });
    bars.addEventListener('keydown', function (e) {
      var m = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
      if (m) { setArea(st.area + m); e.preventDefault(); } else if (e.key === 'Home') { setArea(MIN); e.preventDefault(); } else if (e.key === 'End') { setArea(MAX); e.preventDefault(); }
    });
    areaIn.addEventListener('input', function () { var v = parseFloat(String(areaIn.value).replace(',', '.')); if (v >= MIN && v <= MAX) setArea(v, 'input'); });
    areaIn.addEventListener('blur', function () { setArea(parseFloat(String(areaIn.value).replace(',', '.')) || st.area); });

    // степери
    function stepper(wrap, get, set, min, max) {
      var inp = wrap.querySelector('input'), bs = wrap.querySelectorAll('.stp__b');
      function sync() { var v = get(); inp.value = v; bs[0].disabled = v <= min; bs[1].disabled = v >= max; }
      wrap.addEventListener('click', function (e) { var b = e.target.closest('.stp__b'); if (!b) return; set(clamp(get() + Number(b.dataset.d), min, max)); sync(); });
      inp.addEventListener('change', function () { var v = parseInt(inp.value, 10); set(clamp(isNaN(v) ? min : v, min, max)); sync(); });
      sync(); return sync;
    }

    // радіо-групи
    function radio(group, onPick) {
      group.addEventListener('click', function (e) {
        var b = e.target.closest('[role="radio"]'); if (!b) return;
        group.querySelectorAll('[role="radio"]').forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
        onPick(b);
      });
      group.addEventListener('keydown', function (e) {
        if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return;
        var all = Array.prototype.slice.call(group.querySelectorAll('[role="radio"]')), i = all.indexOf(document.activeElement); if (i < 0) return;
        var n = all[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length]; n.focus(); n.click(); e.preventDefault();
      });
    }
    function mkOpt(label, small, val, on, card) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'opt' + (card ? ' opt--card' : ''); b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.dataset.v = val;
      if (card) { var n = document.createElement('span'); n.textContent = label; var sm = document.createElement('small'); sm.textContent = small; b.appendChild(n); b.appendChild(sm); } else b.textContent = label;
      return b;
    }
    var cv = $('calc-canvas'); cv.setAttribute('role', 'radiogroup'); cv.setAttribute('aria-label', 'Полотно');
    P.canvases.forEach(function (c, k) { cv.appendChild(mkOpt(c.name, '', c.id, k === 0, false)); });
    var same = P.canvases.every(function (c) { return c.price === P.canvases[0].price; });
    $('calc-canvas-note').textContent = same ? 'Усі фактури – ' + fmt(P.canvases[0].price) + ' грн/м², з монтажем.' : 'Ціна залежить від фактури.';
    radio(cv, function (b) { st.canvas = b.dataset.v; calc(); });
    var pf = $('calc-profile'); pf.setAttribute('role', 'radiogroup'); pf.setAttribute('aria-label', 'Профіль');
    P.profiles.forEach(function (x, k) { pf.appendChild(mkOpt(x.name, x.price > 0 ? '+' + fmt(x.price) + ' грн/м.п.' : 'у ціні', x.id, k === 0, true)); });
    radio(pf, function (b) { st.profile = b.dataset.v; calc(); });

    // світло
    var lu = $('calc-light'), lightSync = {};
    P.light.forEach(function (x) {
      st.light[x.id] = 0;
      var li = document.createElement('li'), nm = document.createElement('span'), sm = document.createElement('small');
      nm.className = 'lights__name'; nm.textContent = x.name; sm.textContent = fmt(x.price) + ' грн/' + x.unit; nm.appendChild(sm);
      var w = document.createElement('div'); w.className = 'stp';
      var bm = document.createElement('button'); bm.type = 'button'; bm.className = 'stp__b'; bm.dataset.d = '-1'; bm.textContent = '−'; bm.setAttribute('aria-label', x.name + ': менше');
      var inp = document.createElement('input'); inp.type = 'number'; inp.inputMode = 'numeric'; inp.min = 0; inp.max = 200; inp.value = 0; inp.setAttribute('aria-label', x.name + ', ' + x.unit);
      var un = document.createElement('span'); un.className = 'stp__u'; un.textContent = x.unit;
      var bp = document.createElement('button'); bp.type = 'button'; bp.className = 'stp__b'; bp.dataset.d = '1'; bp.textContent = '+'; bp.setAttribute('aria-label', x.name + ': більше');
      w.appendChild(bm); w.appendChild(inp); w.appendChild(un); w.appendChild(bp);
      li.appendChild(nm); li.appendChild(w); lu.appendChild(li);
      lightSync[x.id] = stepper(w, function () { return st.light[x.id]; }, function (v) { st.light[x.id] = v; li.classList.toggle('is-set', v > 0); calc(); }, 0, 200);
    });

    // розрахунок
    var totalEl = $('calc-total'), rangeEl = $('calc-range'), rowsEl = $('calc-rows'), cbarT = $('cbar-total');
    var shown = 0, lastKeys = '', summary = '';
    function find(list, id) { for (var k = 0; k < list.length; k++) if (list[k].id === id) return list[k]; return list[0]; }
    function calc() {
      var cvs = find(P.canvases, st.canvas), pr = find(P.profiles, st.profile), rows = [];
      rows.push({ k: 'c', l: 'Полотно «' + cvs.name + '»', s: st.area + ' м² × ' + fmt(cvs.price), v: st.area * cvs.price });
      rows.push({ k: 'p', l: 'Профіль по периметру', s: '≈ ' + st.per + ' м × ' + fmt(P.perimeter_m), v: st.per * P.perimeter_m });
      if (pr.price > 0) rows.push({ k: 'pr', l: 'Профіль «' + pr.name + '»', s: st.per + ' м.п. × ' + fmt(pr.price), v: st.per * pr.price });
      var corN = pr.premium_corners ? st.cor : Math.max(0, st.cor - P.corners_included), corP = pr.premium_corners ? P.extra_corner_premium : P.extra_corner;
      if (corN > 0) rows.push({ k: 'k', l: pr.premium_corners ? 'Кути на «' + pr.name + '»' : 'Додаткові кути', s: corN + ' × ' + fmt(corP), v: corN * corP });
      var lsum = 0, lnames = [];
      P.light.forEach(function (x) { var q = st.light[x.id] || 0; if (q > 0) { lsum += q * x.price; lnames.push(x.name.toLowerCase() + ' ' + q + ' ' + x.unit); } });
      if (lsum > 0) rows.push({ k: 'l', l: 'Світло', s: lnames.join(', '), v: lsum });
      var total = r50(rows.reduce(function (a, r) { return a + r.v; }, 0));
      var lo = r50(total * .95), hi = r50(total * 1.08);
      // рядки: перебудова лише коли змінився склад
      var keys = rows.map(function (r) { return r.k; }).join(',');
      if (keys !== lastKeys) {
        rowsEl.textContent = '';
        rows.forEach(function (r) {
          var li = document.createElement('li'), a = document.createElement('span'), sm = document.createElement('small'), b = document.createElement('b');
          a.textContent = r.l; sm.textContent = r.s; a.appendChild(sm); b.textContent = r.v === null ? 'на замірі' : fmt(r.v) + ' грн';
          li.dataset.k = r.k; li.appendChild(a); li.appendChild(b); rowsEl.appendChild(li);
        });
        lastKeys = keys;
      } else {
        rows.forEach(function (r, k) { var li = rowsEl.children[k]; li.querySelector('span').firstChild.textContent = r.l; li.querySelector('small').textContent = r.s; li.querySelector('b').textContent = r.v === null ? 'на замірі' : fmt(r.v) + ' грн'; });
      }
      rangeEl.textContent = 'від ' + fmt(lo) + ' до ' + fmt(hi) + ' грн';
      tween(total);
      summary = 'Площа ' + st.area + ' м² (периметр ≈ ' + st.per + ' м); полотно: ' + cvs.name + '; профіль: ' + pr.name +
        (lnames.length ? '; світло: ' + lnames.join(', ') : '') + '; ≈ ' + fmt(total) + ' грн (' + fmt(lo) + '–' + fmt(hi) + ')';
    }
    var raf = null;
    function tween(to) {
      cbarT.textContent = fmt(to);
      if (reduce || !shown) { shown = to; totalEl.textContent = fmt(to); return; }
      var from = shown, t0 = null; cancelAnimationFrame(raf);
      function step(t) { if (!t0) t0 = t; var k = Math.min((t - t0) / 450, 1), e = 1 - Math.pow(1 - k, 3); shown = Math.round(from + (to - from) * e); totalEl.textContent = fmt(r50(shown)); if (k < 1) raf = requestAnimationFrame(step); else { shown = to; totalEl.textContent = fmt(to); } }
      raf = requestAnimationFrame(step);
    }

    // набір з блоку «Світло»
    document.addEventListener('eralux:light-preset', function (e) {
      var r = e.detail || {};
      var a = parseFloat(String(r.area || '').replace(',', '.')); if (a >= MIN && a <= MAX) setArea(a);
      Object.keys(st.light).forEach(function (id) { st.light[id] = 0; });
      (r.items || []).forEach(function (it) { if (it && st.light.hasOwnProperty(it.id) && it.qty > 0) st.light[it.id] = Math.min(200, Math.round(it.qty)); });
      Object.keys(lightSync).forEach(function (id) { lightSync[id](); lu.children[Object.keys(lightSync).indexOf(id)].classList.toggle('is-set', st.light[id] > 0); });
      calc();
    });

    setArea(st.area);

    // форма
    var form = $('calc-form'), tel = $('calc-tel'), err = $('calc-err'), via = 'Дзвінок';
    maskPhone(tel);
    radio($('calc-via'), function (b) { via = b.dataset.v; });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); err.hidden = true;
      if (form.company.value) return;                       // honeypot
      if (!phoneOk(tel.value)) { tel.setAttribute('aria-invalid', 'true'); err.textContent = 'Перевірте номер: +38 (0XX) XXX-XX-XX'; err.hidden = false; tel.focus(); return; }
      var btn = form.querySelector('.res__btn'); btn.disabled = true;
      sendLead({ form: 'calc', phone: '+' + phoneDigits(tel.value), via: via, details: summary, page: location.pathname })
        .then(function () {
          form.hidden = true; var ok = $('calc-ok'); ok.hidden = false; ok.focus({ preventScroll: true });
          root.querySelector('.res__main').classList.add('is-done');
        })
        .catch(function () { err.textContent = 'Не вдалося надіслати. Подзвоніть нам: +38 067 006 37 55'; err.hidden = false; })
        .then(function () { btn.disabled = false; });
    });

    // мобільна планка з сумою
    var cbar = $('cbar'), mbar = $('mbar'), steps = $('calc-steps'), res = $('calc-res');
    if ('IntersectionObserver' in window) {
      var inSteps = false, inRes = false;
      function upd() { var on = inSteps && !inRes; cbar.classList.toggle('is-on', on); if (mbar) mbar.classList.toggle('is-off', on); }
      new IntersectionObserver(function (en) { inSteps = en[0].isIntersecting; upd(); }, { rootMargin: '-30% 0px -30% 0px' }).observe(steps);
      new IntersectionObserver(function (en) { inRes = en[0].isIntersecting; upd(); }, { threshold: 0.15 }).observe(res);
    }
  }


  /* ---------- 9. Процес ---------- */
  function initProcess(d) {
    var wrap = $('steps'); if (!wrap) return;
    if (d) {
      bindText('process', d);
      if (Array.isArray(d.steps)) {
        var items = wrap.querySelectorAll('.step');
        d.steps.slice(0, items.length).forEach(function (x, i) {
          if (!x) return;
          if (x.title) items[i].querySelector('.step__t').textContent = x.title;
          if (x.text) items[i].querySelector('.step__p').textContent = x.text;
          var a = items[i].querySelector('.step__x'); if (typeof x.accent === 'string') { a.textContent = x.accent; a.hidden = !x.accent.trim(); }
        });
      }
      if (Array.isArray(d.mount) && d.mount.length) {
        var ml = $('mount-list'), tpl = ml.querySelector('li');
        var frag = document.createDocumentFragment();
        d.mount.forEach(function (t) { if (typeof t !== 'string' || !t.trim()) return; var li = tpl.cloneNode(true); li.className = ''; li.lastChild.textContent = t.trim(); frag.appendChild(li); });
        if (frag.childNodes.length) { ml.textContent = ''; ml.appendChild(frag); }
      }
      var ph = $('mount-photo');
      if (ph && RE_IMG.test(d.photo || '') && d.photo !== ph.getAttribute('src')) ph.src = d.photo;
      if (ph && d.photo_alt) ph.alt = d.photo_alt;
    }
    var fill = $('steps-fill'), steps = wrap.querySelectorAll('.step'), mq = window.matchMedia('(min-width: 900px)');
    function upd() {
      var r = wrap.getBoundingClientRect(), vh = window.innerHeight;
      var k = Math.max(0, Math.min(1, (vh * .78 - r.top) / (mq.matches ? vh * .45 : r.height)));
      if (mq.matches) { fill.style.width = k * 100 + '%'; fill.style.height = '100%'; } else { fill.style.height = k * 100 + '%'; fill.style.width = '100%'; }
      steps.forEach(function (st, i) { st.classList.toggle('is-lit', k >= (mq.matches ? i / steps.length + .02 : (i + .15) / steps.length)); });
    }
    if (reduce) { fill.style.width = fill.style.height = '100%'; steps.forEach(function (st) { st.classList.add('is-lit'); }); }
    else { var tk = false; window.addEventListener('scroll', function () { if (!tk) { tk = true; requestAnimationFrame(function () { upd(); tk = false; }); } }, { passive: true }); window.addEventListener('resize', upd); upd(); }

    // чекліст монтажу відмічається по черзі
    var lis = document.querySelectorAll('#mount-list li');
    if (reduce || !('IntersectionObserver' in window)) { lis.forEach(function (l) { l.classList.add('is-done'); }); return; }
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return; io.disconnect();
      lis.forEach(function (l, i) { setTimeout(function () { l.classList.add('is-done'); }, 250 + i * 320); });
    }, { threshold: 0.5 });
    io.observe($('mount-list'));
  }

  /* ---------- 10. Відгуки ---------- */
  function initReviews(d) {
    var track = $('revs-track'); if (!track) return;
    if (d) {
      bindText('reviews', d);
      var link = $('revs-link'); if (link && RE_GMAPS.test(d.link || '')) link.href = d.link;
      var items = Array.isArray(d.items) ? d.items.filter(function (x) { return x && x.name && x.text; }).slice(0, 20) : [];
      if (items.length) {
        var frag = document.createDocumentFragment();
        items.forEach(function (x) {
          var li = document.createElement('li'); li.className = 'rev';
          var st = document.createElement('p'); st.className = 'rev__stars'; var n = Math.max(1, Math.min(5, Number(x.rating) || 5));
          st.textContent = '★★★★★'.slice(0, n); st.setAttribute('aria-label', 'Оцінка ' + n + ' з 5');
          var q = document.createElement('p'); q.className = 'rev__q'; q.textContent = x.text;
          var a = document.createElement('p'); a.className = 'rev__a';
          var b = document.createElement('b'); b.textContent = x.name;
          var sp = document.createElement('span'); sp.textContent = [x.source || 'Google', x.date || ''].filter(Boolean).join(' · ');
          a.appendChild(b); a.appendChild(sp); li.appendChild(st); li.appendChild(q); li.appendChild(a); frag.appendChild(li);
        });
        track.textContent = ''; track.appendChild(frag);
      }
    }
    var prev = $('revs-prev'), next = $('revs-next');
    function step() { var c = track.querySelector('.rev'); return c ? c.getBoundingClientRect().width + 16 : 300; }
    function upd() { var max = track.scrollWidth - track.clientWidth; prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft > max - 4; }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }); });
    track.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
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

  Promise.race([Promise.all([load('header'), load('hero'), load('stats'), load('light'), load('prices'), load('ceilings'), load('before_after'), load('projects'), load('calc'), load('process'), load('reviews')]), timeout(1200)]).then(function (res) {
    if (res) { applyHeader(res[0]); applyHero(res[1]); applyStats(res[2]); }
    initLight(res ? res[3] : null, res ? res[4] : null);
    initCeilings(res ? res[5] : null, res ? res[4] : null);
    initBA(res ? res[6] : null);
    initCases(res ? res[7] : null);
    initCalc(res ? res[8] : null, res ? res[4] : null);
    initProcess(res ? res[9] : null);
    initReviews(res ? res[10] : null);
    reveals();
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, timeout(900)]).then(start);
  });
})();
