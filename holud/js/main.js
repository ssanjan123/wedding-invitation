(function () {
  'use strict';

  var C = window.INVITE;
  var root = document.documentElement;
  var params = new URLSearchParams(location.search);
  var debug = params.has('p') || params.has('t') || params.has('debug');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  if (!(window.gsap && window.ScrollTrigger && window.Lenis) && root.classList.contains('motion')) {
    root.classList.replace('motion', 'still');
  }
  var motion = root.classList.contains('motion');
  var portrait = matchMedia('(orientation: portrait)');
  var WEDDING_IMG = '../assets/img/';     // petals are shared with the wedding page

  /* ---------------------------------------------------------------- dates */
  function pad(n) { return String(n).padStart(2, '0'); }
  // Wall-clock time at the venue, held in the UTC fields so it reads the same in every viewer's time zone
  function venueTime(s) {
    var parts = String(s).split('T'), d = parts[0].split('-').map(Number), t = (parts[1] || '00:00').split(':').map(Number);
    return new Date(Date.UTC(d[0], d[1] - 1, d[2], t[0] || 0, t[1] || 0));
  }
  // The real moment, for the countdown and calendar. Without utcOffset, the guest's own clock is used.
  var OFFSET = (function (o) {
    var m = /^([+-])(\d{2}):?(\d{2})$/.exec(o || '');
    return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) : null;
  })(C.utcOffset);
  function instant(wall) {
    return OFFSET === null
      ? new Date(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(), wall.getUTCHours(), wall.getUTCMinutes())
      : new Date(wall.getTime() - OFFSET * 60000);
  }
  var WORDS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
  function timeInWords(d) {
    var h = d.getUTCHours(), m = d.getUTCMinutes();
    if (h === 12 && m === 0) return 'at noon';
    var part = h < 12 ? 'in the morning' : h < 17 ? 'in the afternoon' : 'in the evening';
    var phrase = m === 0 ? WORDS[h % 12] + ' o’clock'
      : m === 15 ? 'quarter past ' + WORDS[h % 12]
      : m === 30 ? 'half past ' + WORDS[h % 12]
      : m === 45 ? 'quarter to ' + WORDS[(h + 1) % 12]
      : clock(d).replace(/ [ap]m$/, '');
    return 'at ' + phrase + ' ' + part;
  }
  function clock(d) {
    var h = d.getUTCHours(), m = d.getUTCMinutes();
    return (h % 12 || 12) + (m ? ':' + pad(m) : '') + (h < 12 ? ' am' : ' pm');
  }

  var start = venueTime(C.start);
  var end = venueTime(C.end || C.start);
  var startAt = instant(start), endAt = instant(end);
  var names = C.couple.first + ' & ' + C.couple.second;
  var fmt = function (opts) { opts.timeZone = 'UTC'; return start.toLocaleDateString('en-GB', opts); };
  var derived = {
    namesShort: names,
    firstFull: C.couple.firstFull || C.couple.first,
    secondFull: C.couple.secondFull || C.couple.second,
    weekday: fmt({ weekday: 'long' }),
    monthYear: fmt({ month: 'long', year: 'numeric' }),
    dateShort: fmt({ day: 'numeric', month: 'long', year: 'numeric' }),
    timeWords: timeInWords(start)
  };
  derived.whenShort = derived.weekday + ' ' + derived.dateShort + ', ' + clock(start);

  /* -------------------------------------------------------------- content */
  function get(path) {
    if (path in derived) return derived[path];
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, C);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function fillContent() {
    $$('[data-bind]').forEach(function (el) {
      var v = get(el.dataset.bind);
      if (v != null && v !== '') el.textContent = v;
    });
    $$('[data-href]').forEach(function (el) {
      var v = get(el.dataset.href);
      if (v) el.href = v;
    });
    var ini = C.couple.initials || [C.couple.first[0], C.couple.second[0]];
    $$('[data-initials]').forEach(function (el) {
      el.innerHTML = esc(ini[0]) + '<small>&amp;</small>' + esc(ini[1]);
    });

    var to = (params.get('to') || '').trim();
    $('[data-guest]').textContent = to ? (/^for\s/i.test(to) ? to : 'For ' + to) : C.guestDefault;

    document.title = names + '’s ' + C.event.name;
    $('[data-day]').textContent = String(start.getUTCDate());
    buildDigits();

    var list = $('.evening__list'), evening = $('.evening');
    if (!C.schedule || !C.schedule.length) evening.hidden = true;
    else list.innerHTML = C.schedule.map(function (s) {
      return '<li><time>' + esc(s.time) + '</time><i aria-hidden="true"></i><span>' + esc(s.item) + '</span></li>';
    }).join('');

    var message = $('[data-message]');
    if (C.message && C.message.length) {
      message.innerHTML = C.message.map(function (m) { return '<p>' + esc(m) + '</p>'; }).join('');
    }

    var sw = (C.dress && C.dress.swatches) || [];
    $$('[data-swatches] span').forEach(function (el, i) { if (sw[i]) el.textContent = sw[i]; });

    if (!C.wedding || !C.wedding.url) $('[data-wedding]').hidden = true;

    calendarLinks();
  }

  // Full names can be long: shrink both script lines together until the longer one fits the sheet
  function fitNames() {
    var box = $('.holud-a'), els = $$('.names__one, .names__two');
    if (!box || !els.length) return;
    els.forEach(function (el) { el.style.fontSize = ''; });
    var max = box.clientWidth, scale = 1;
    els.forEach(function (el) {
      var size = parseFloat(getComputedStyle(el).fontSize);
      var inner = el.scrollWidth - 0.7 * size;   // without the .35em padding on each side
      if (inner > max) scale = Math.min(scale, max / inner);
    });
    if (scale < 1) els.forEach(function (el) {
      el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * scale * 0.97).toFixed(1) + 'px';
    });
  }

  /* Initials sit in the round opening of the alpona medallion. Measure the actual ink, then size
     and shift it so it sits centred with a clear margin inside the opening. */
  var MEDALLIONS = {                      // centre and inner size as fractions of the emblem's width
    alpona: { cx: 0.4997, cy: 0.4969, w: 0.2375, ar: 806 / 800, fill: 0.9 },
    // .crest--disc: a rice-white disc 44% across (38% inside its rings) covers the alpona's centre
    disc: { cx: 0.4997, cy: 0.4909, w: 0.37, ar: 806 / 800, fill: 0.9 }
  };
  var inkCtx;
  function glyph(ch, px, family) {
    inkCtx = inkCtx || document.createElement('canvas').getContext('2d');
    inkCtx.font = px + 'px ' + family;
    var m = inkCtx.measureText(ch), asc = m.fontBoundingBoxAscent || px * 0.8, desc = m.fontBoundingBoxDescent || px * 0.2;
    // box top-left -> baseline origin for an element with line-height: 1
    var base = (px - asc - desc) / 2 + asc;
    return { ch: ch, px: px, adv: m.width, base: base,
      l: -m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, t: -m.actualBoundingBoxAscent, b: m.actualBoundingBoxDescent };
  }
  function monogramLayout(ini, family) {
    var R = 100, a = glyph(ini[0], R, family), amp = glyph('&', R * 0.6, family), b = glyph(ini[1], R, family);
    var pos = [[a, 0, 0], [amp, a.adv + 4, 0], [b, a.adv + amp.adv + 8, 0]];
    var L = 1e9, Rr = -1e9, T = 1e9, B = -1e9;
    pos.forEach(function (p) {
      L = Math.min(L, p[1] + p[0].l); Rr = Math.max(Rr, p[1] + p[0].r);
      T = Math.min(T, p[2] + p[0].t); B = Math.max(B, p[2] + p[0].b);
    });
    return { pos: pos, L: L, R: Rr, T: T, B: B, ref: R };
  }
  function fitMonograms() {
    var ini = C.couple.initials || [C.couple.first[0], C.couple.second[0]];
    $$('[data-initials]').forEach(function (el) {
      var host = el.closest('.crest');
      if (!host) return;
      var med = MEDALLIONS[host.classList.contains('crest--disc') ? 'disc' : 'alpona'], W = host.offsetWidth;
      if (!W) return;
      var H = W * med.ar, dw = med.w * W * med.fill, dh = (med.h || med.w) * W * med.fill;
      var lay = monogramLayout(ini, getComputedStyle(el).fontFamily);
      var w = lay.R - lay.L, h = lay.B - lay.T;
      // largest scale whose ink box still has its corners inside the medallion's ellipse
      var k = 1 / Math.sqrt(Math.pow(w / dw, 2) + Math.pow(h / dh, 2));
      // offset from the emblem's centre (where the zero-size monogram box sits) to the medallion's centre
      var ox = med.cx * W - W / 2 - (lay.L + w / 2) * k, oy = med.cy * H - H / 2 - (lay.T + h / 2) * k;
      el.classList.add('is-fitted');
      el.style.translate = '';
      el.innerHTML = lay.pos.map(function (p) {
        var g = p[0], s = g.px * k;
        return '<i style="font-size:' + s.toFixed(2) + 'px;left:' + (ox + p[1] * k).toFixed(2) + 'px;top:' +
          (oy + (p[2] - g.base) * k).toFixed(2) + 'px">' + esc(g.ch) + '</i>';
      }).join('');
    });
  }

  function buildDigits() {
    var holder = $('.date__digits');
    holder.innerHTML = '';
    String(start.getUTCDate()).split('').forEach(function (ch, i) {
      var target = +ch, seq = [];
      for (var k = 5 + i * 3; k >= 0; k--) seq.push((target - k + 100) % 10);
      var digit = document.createElement('span');
      digit.className = 'date__digit';
      var col = document.createElement('span');
      col.innerHTML = seq.map(function (v) { return '<span>' + v + '</span>'; }).join('');
      col.dataset.end = String(-(seq.length - 1) / seq.length * 100);
      if (!motion) col.style.transform = 'translateY(' + col.dataset.end + '%)';
      digit.appendChild(col);
      holder.appendChild(digit);
    });
  }

  function calendarLinks() {
    // with a known UTC offset the calendar gets exact UTC times; otherwise floating local times
    var stamp = OFFSET === null
      ? function (d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00'; }
      : function (d) { d = instant(d); return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z'; };
    var icsText = function (s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); };
    var title = C.event.name + ' of ' + names;
    var where = C.venue.name + ', ' + C.venue.address;
    var about = C.hosts + ' ' + C.event.name + ' ' + C.of + ' ' + names + ': ' + C.request + '.';
    var now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Holud Invitation//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + stamp(start) + '-' + names.replace(/\W+/g, '').toLowerCase() + '@holud-invitation',
      'DTSTAMP:' + now,
      'DTSTART:' + stamp(start),
      'DTEND:' + stamp(end),
      'SUMMARY:' + icsText(title),
      'LOCATION:' + icsText(where),
      'DESCRIPTION:' + icsText(about),
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    $('[data-ics]').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    $('[data-gcal]').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent(title)
      + '&dates=' + stamp(start) + '/' + stamp(end)
      + '&location=' + encodeURIComponent(where)
      + '&details=' + encodeURIComponent(about);
  }

  function countdown() {
    var el = $('.countdown');
    var unit = function (n, w) { return '<b>' + n + '</b> ' + w + (n === 1 ? '' : 's'); };
    function tick() {
      var ms = startAt - Date.now();
      if (ms <= 0) {
        el.textContent = Date.now() < endAt ? 'The holud is happening now' : 'Thank you for celebrating with us';
        return;
      }
      var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
      el.innerHTML = (d ? unit(d, 'day') + ', ' : '') + unit(h, 'hour') + ', ' + unit(m, 'minute') + ' and ' + unit(s % 60, 'second') + ' to go';
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ------------------------------------------------ the name in the mehedi */
  function mehediGame() {
    var btn = $('[data-hidden-name]'), hint = $('.mehedi-hint');
    if (!C.mehedi || !C.mehedi.hidden) { btn.hidden = true; hint.hidden = true; return; }
    btn.textContent = C.mehedi.hidden;
    btn.addEventListener('click', function () {
      if (btn.classList.contains('is-found')) return;
      btn.classList.add('is-found');
      hint.textContent = C.mehedi.found;
      hint.classList.add('is-found');
    });
  }

  /* ---------------------------------------------------------------- music */
  function music() {
    var btn = $('.music');
    if (!C.musicUrl || !btn) return;
    var audio = new Audio();
    audio.loop = true;
    audio.preload = 'metadata';
    audio.volume = 0.7;
    audio.addEventListener('loadedmetadata', function () { btn.hidden = false; }, { once: true });
    audio.src = C.musicUrl;
    btn.addEventListener('click', function () {
      if (audio.paused) {
        audio.play().then(function () { btn.setAttribute('aria-pressed', 'true'); }).catch(function () {});
      } else {
        audio.pause();
        btn.setAttribute('aria-pressed', 'false');
      }
    });
    $('.sr-only', btn).textContent = 'Music';
  }

  /* ---------------------------------------------------- holud powder dust */
  function Dust(canvas) {
    var ctx = canvas.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, level = 1, last = performance.now(), parts = [];
    var sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    var g = sprite.getContext('2d'), grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(255,236,160,1)');
    grd.addColorStop(0.35, 'rgba(246,190,60,.55)');
    grd.addColorStop(1, 'rgba(233,164,16,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 32, 32);

    function size() {
      W = innerWidth; H = innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    addEventListener('resize', size);
    var count = W < 700 ? 20 : 42;
    for (var i = 0; i < count; i++) {
      parts.push({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 2.4,
        vx: (Math.random() - 0.5) * 6, vy: -(3 + Math.random() * 9), tw: Math.random() * 6.3, ts: 0.6 + Math.random() * 1.6 });
    }
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      if (level > 0.01) {
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          p.x += p.vx * dt; p.y += p.vy * dt; p.tw += p.ts * dt;
          if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
          if (p.x < -12) p.x = W + 12; else if (p.x > W + 12) p.x = -12;
          ctx.globalAlpha = (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.tw))) * level;
          var s = p.r * 6;
          ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return { setLevel: function (l) { level = l; } };
  }

  /* -------------------------------------------------------------- petals */
  function Petals(canvas, section) {
    var ctx = canvas.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    var imgs = ['petal-marigold', 'petal-marigold', 'petal-marigold', 'petal-rose', 'leaf-gold'].map(function (n) {
      var im = new Image(); im.src = WEDDING_IMG + n + '.webp'; return im;
    });
    var W = 0, H = 0, parts = [], running = false, last = 0;
    function size() {
      W = section.offsetWidth; H = section.offsetHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(p, top) {
      p.img = imgs[(Math.random() * imgs.length) | 0];
      p.s = 12 + Math.random() * 16;
      p.x = Math.random() * W;
      p.y = top ? -40 - Math.random() * H * 0.3 : Math.random() * H;
      p.vy = 28 + Math.random() * 42;
      p.amp = 18 + Math.random() * 46;
      p.f = 0.4 + Math.random() * 0.8;
      p.ph = Math.random() * 6.3;
      p.rot = Math.random() * 6.3;
      p.vr = (Math.random() - 0.5) * 1.6;
      p.flip = Math.random() * 6.3;
      p.vf = 1 + Math.random() * 2;
      return p;
    }
    size();
    addEventListener('resize', size);
    var count = innerWidth < 700 ? 16 : 34;
    for (var i = 0; i < count; i++) parts.push(spawn({}, false));

    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy * dt; p.ph += p.f * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
        if (p.y > H + 40) spawn(p, true);
        if (!p.img.complete || !p.img.naturalWidth) continue;
        var w = p.s, h = p.s * p.img.naturalHeight / p.img.naturalWidth;
        ctx.save();
        ctx.translate(p.x + Math.sin(p.ph) * p.amp, p.y);
        ctx.rotate(p.rot);
        ctx.scale(Math.cos(p.flip), 1);
        ctx.globalAlpha = 0.85;
        ctx.drawImage(p.img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
      requestAnimationFrame(frame);
    }
    new IntersectionObserver(function (entries) {
      var on = entries[0].isIntersecting;
      if (on && !running) { running = true; last = 0; size(); requestAnimationFrame(frame); }
      else if (!on) running = false;
    }).observe(section);
  }

  /* -------------------------------------- tap anywhere: a dab of holud */
  // host(e) returns the element to leave the mark in, or null where taps should do nothing
  function Dabs(host) {
    var marks = [], down = null, n = 0;
    addEventListener('pointerdown', function (e) {
      down = e.isPrimary && e.button < 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
    }, { passive: true });
    addEventListener('pointerup', function (e) {
      var d = down;
      down = null;
      if (!d || Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 10 || performance.now() - d.t > 450) return;
      if (e.target.closest && e.target.closest('a, button, input, label')) return;
      var box = host(e);
      if (!box) return;
      var r = box.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      var dab = document.createElement('img');
      dab.className = 'dab';
      dab.alt = '';
      dab.src = 'assets/img/dab-' + (n++ % 6 + 1) + '.webp';
      dab.style.left = x + 'px';
      dab.style.top = y + 'px';
      box.appendChild(dab);
      gsap.fromTo(dab, { xPercent: -50, yPercent: -50, scale: 0.35, rotation: Math.random() * 360, autoAlpha: 0 }, { scale: 1, autoAlpha: 0.95, duration: 0.35, ease: 'back.out(2.2)' });
      marks.push(dab);
      if (marks.length > 30) marks.shift().remove();
      for (var i = 0; i < 5; i++) {
        var p = document.createElement('img');
        p.className = 'dab-petal';
        p.alt = '';
        p.src = WEDDING_IMG + (i % 3 ? 'petal-marigold' : 'petal-rose') + '.webp';
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        box.appendChild(p);
        var a = i / 5 * 6.283 + Math.random();
        gsap.fromTo(p, { xPercent: -50, yPercent: -50, x: 0, y: 0, rotation: 0, autoAlpha: 1 }, {
          x: Math.cos(a) * (36 + Math.random() * 30), y: Math.sin(a) * (30 + Math.random() * 26) + 30,
          rotation: (Math.random() - 0.5) * 300, autoAlpha: 0, duration: 0.9 + Math.random() * 0.4, ease: 'power2.out',
          onComplete: p.remove.bind(p)
        });
      }
    });
  }

  /* ------------------------------------------------------- marigold curtain */
  function buildCurtain() {
    var holder = $('.curtain');
    holder.innerHTML = '';
    var n = innerWidth < 700 ? 11 : innerWidth < 1200 ? 16 : 22, seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }   // same curtain every visit
    var strands = [];
    for (var i = 0; i < n; i++) {
      var im = document.createElement('img');
      var pos = (i + 0.5) / n * 100 + (rnd() - 0.5) * (50 / n);
      im.src = 'assets/img/marigold-string.webp';
      im.alt = '';
      im.className = 'strand' + (i % 2 ? ' strand--back' : '');
      im.style.left = pos.toFixed(2) + '%';
      im.style.setProperty('--len', (1.02 + rnd() * 0.2).toFixed(3));
      im.dataset.pos = pos;
      holder.appendChild(im);
      strands.push(im);
    }
    return strands;
  }

  /* ------------------------------------------------------------ preloader */
  function preload(done) {
    var loader = $('.preloader');
    var urls = ['assets/img/kula.webp', 'assets/img/bati.webp', 'assets/img/jamdani.webp', 'assets/img/paper.webp',
      'assets/img/alpona.webp', 'assets/img/marigold-string.webp', portrait.matches ? 'assets/img/cloth-port.jpg' : 'assets/img/cloth-land.jpg'];
    var total = urls.length + 1, n = 0, finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      setTimeout(done, debug ? 0 : 450);
    }
    function step() {
      n++;
      loader.style.setProperty('--load', (n / total).toFixed(3));
      if (n >= total) finish();
    }
    urls.forEach(function (u) { var im = new Image(); im.onload = im.onerror = step; im.src = u; });
    var fonts = document.fonts ? Promise.all([
      document.fonts.load('1em "Imperial Script"'),
      document.fonts.load('500 1em "Cormorant Garamond"'),
      document.fonts.load('italic 1em "Cormorant Garamond"'),
      document.fonts.load('1em Galada', 'গায়ে হলুদ')
    ]).catch(function () {}) : Promise.resolve();
    fonts.then(step);
    setTimeout(finish, 7000);
  }

  /* --------------------------------------------------------------- motion */
  function buildMotion(media) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    var lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();

    var TOTAL = 14.4;    // timeline length in units
    var UNIT = 0.5;      // viewport heights of scrolling per unit

    var trayFloat = $('.tray-float'), tray = $('.tray'), kula = $('.kula'), bati = $('.bati');
    var card = $('.card'), inside = $('.card__inside'), doorL = $('.door--l'), doorR = $('.door--r');
    var cordL = $('.cord__side--l'), cordR = $('.cord__side--r'), knot = $('.knot'), tag = $('.tag');
    var cue = $('.scroll-cue'), skip = $('.skip');
    var sTray = $('.scene--tray'), sHolud = $('.scene--holud');
    var corners = $$('.corner'), garlands = $$('.garland'), dabs = $('.dabs');
    var hosts = $('.hosts'), paste = $('.swipe__paste'), bangla = $('.swipe__bangla'), eventName = $('.swipe__name');
    var of = $('.of'), nOne = $('.names__one'), nTwo = $('.names__two'), amp = $('.names__amp');
    var request = $('.request'), tapHint = $('.tap-hint');
    var palmBox = $('.palm-box'), palm = $('.palm'), dateFoot = $('.date-foot'), hidden = $('.hidden-name');
    var strands = buildCurtain();
    var film = $('.film'), vTitle = $('.venue-title'), vCard = $('.venue-card');
    var line = $('.evening__line line'), items = $$('.evening__list li');

    var filmState = { p: 0 }, now = 0;
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.stage',
        start: 'top top',
        end: function () { return '+=' + Math.round(innerHeight * TOTAL * UNIT); },
        pin: true,
        scrub: debug ? true : 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          var t = now = self.progress * TOTAL;
          trayFloat.classList.toggle('is-still', t > 0.02);
          media.cloth.setActive(t < 3.3);
          if (t > 0.4) media.stage.load();   // guest has started untying: fetch the stage film now
          media.dust.setLevel(t < 3.2 ? 0.6 : t < 8.9 ? 0 : 1);
        }
      }
    });

    // tap for holud: on the swipe page while the stage is pinned, and on the closing page
    Dabs(function (e) {
      if (e.target.closest && e.target.closest('.closing')) return $('.closing__dabs');
      var st = tl.scrollTrigger;
      return st.isActive && now > 3.7 && now < 5.95 ? dabs : null;
    });

    /* Page 1: the thread comes untied, the jamdani doors open, the paper inside fills the screen */
    tl.to(cue, { autoAlpha: 0, y: 12, duration: 0.25 }, 0)
      .to(knot, { keyframes: { rotation: [0, -7, 7, -4, 4, 0] }, duration: 0.3 }, 0.02)
      .to(cordL, { xPercent: -70, autoAlpha: 0, ease: 'power2.in', duration: 0.5 }, 0.35)
      .to(cordR, { xPercent: 70, autoAlpha: 0, ease: 'power2.in', duration: 0.5 }, 0.37)
      .to(knot, { yPercent: 90, rotation: -28, scale: 0.9, autoAlpha: 0, ease: 'power2.in', duration: 0.55 }, 0.36)
      .to(tag, { yPercent: 70, xPercent: 20, rotation: 24, autoAlpha: 0, ease: 'power2.in', duration: 0.6 }, 0.4)
      .fromTo(doorL, { rotationY: 0, transformPerspective: 1300 }, { rotationY: -168, transformPerspective: 1300, ease: 'power2.inOut', duration: 0.9 }, 0.8)
      .fromTo(doorR, { rotationY: 0, transformPerspective: 1300 }, { rotationY: 168, transformPerspective: 1300, ease: 'power2.inOut', duration: 0.9 }, 0.86)
      .to(card, { scale: 1.06, ease: 'power1.inOut', duration: 0.7 }, 1.65)
      .to([kula, bati], { yPercent: 36, autoAlpha: 0, ease: 'power2.in', duration: 0.9 }, 1.7)
      .to([doorL, doorR], { autoAlpha: 0, duration: 0.4 }, 1.85)
      .to(inside.children, { autoAlpha: 0, duration: 0.3, stagger: 0.04 }, 2.45)
      .to(card, {
        scaleX: function () { return innerWidth / card.offsetWidth * 1.08; },
        scaleY: function () { return innerHeight / card.offsetHeight * 1.08; },
        ease: 'power2.inOut', duration: 0.75
      }, 2.45)
      .to(skip, { autoAlpha: 0, duration: 0.2 }, 3.0)
      .to(sTray, { autoAlpha: 0, duration: 0.15 }, 3.2);

    /* Page 2, beat A: alpona is drawn in the corners, a swipe of holud writes the names */
    tl.fromTo(corners, { '--sweep': 0, rotation: -40 }, { '--sweep': 1, rotation: 0, ease: 'power1.out', duration: 0.9, stagger: 0.07 }, 3.3)
      .from(garlands, { yPercent: -105, ease: 'power2.out', duration: 0.7, stagger: 0.08 }, 3.4)
      .fromTo(garlands, { rotation: 6 }, { rotation: 0, ease: 'elastic.out(1, 0.35)', duration: 0.9, stagger: 0.08 }, 3.8)
      .from(hosts, { autoAlpha: 0, y: 14, ease: 'power2.out', duration: 0.4 }, 3.45)
      .fromTo(paste, { '--reveal': 0 }, { '--reveal': 1, ease: 'power1.inOut', duration: 0.6 }, 3.65)
      .fromTo(bangla, { '--reveal': 0 }, { '--reveal': 1, ease: 'power1.inOut', duration: 0.5 }, 3.95)
      .from(eventName, { autoAlpha: 0, y: 8, ease: 'power2.out', duration: 0.35 }, 4.3)
      .from(of, { autoAlpha: 0, ease: 'power2.out', duration: 0.3 }, 4.45)
      .fromTo(nOne, { '--reveal': 0 }, { '--reveal': 1, ease: 'power1.inOut', duration: 0.5 }, 4.55)
      .from(amp, { autoAlpha: 0, scale: 0.5, rotation: -12, ease: 'back.out(2)', duration: 0.35 }, 4.95)
      .fromTo(nTwo, { '--reveal': 0 }, { '--reveal': 1, ease: 'power1.inOut', duration: 0.5 }, 5.05)
      .from(request, { autoAlpha: 0, y: 14, ease: 'power2.out', duration: 0.4 }, 5.4)
      .from(tapHint, { autoAlpha: 0, y: 8, ease: 'power2.out', duration: 0.3 }, 5.55)
      .addLabel('invite', 5.8);

    /* Beat B: mehedi is drawn up the palm and the date sits in its centre */
    tl.to([hosts, $('.swipe'), of, $('.names'), request, tapHint, dabs], { autoAlpha: 0, y: -18, ease: 'power2.in', duration: 0.4, stagger: 0.03 }, 6.0)
      .to(garlands, { yPercent: -105, ease: 'power2.in', duration: 0.5, stagger: 0.04 }, 6.0)
      .from(palmBox, { autoAlpha: 0, y: function () { return innerHeight * 0.1; }, ease: 'power2.out', duration: 0.6 }, 6.2)
      .fromTo(palm, { '--reveal': 0 }, { '--reveal': 1, ease: 'none', duration: 1.3 }, 6.3)
      .from('.date__weekday', { autoAlpha: 0, y: 10, ease: 'power2.out', duration: 0.35 }, 6.75)
      .from('.date__day', { autoAlpha: 0, duration: 0.2 }, 6.8);
    $$('.date__digit > span').forEach(function (col, i) {
      tl.fromTo(col, { yPercent: 0 }, { yPercent: +col.dataset.end, ease: 'power3.out', duration: 0.75 }, 6.8 + i * 0.12);
    });
    tl.from('.date__month', { autoAlpha: 0, y: 10, ease: 'power2.out', duration: 0.35 }, 7.15)
      .from(dateFoot, { autoAlpha: 0, y: 10, ease: 'power2.out', duration: 0.4 }, 7.3)
      .from(hidden, { autoAlpha: 0, duration: 0.4 }, 7.4)
      .addLabel('date', 7.9);

    /* Beat C: a curtain of marigold strings falls, then parts onto the holud stage */
    tl.fromTo(strands, { yPercent: -112 }, { yPercent: 0, ease: 'power2.out', duration: 0.7, stagger: { each: 0.025, from: 'random' } }, 8.2)
      .to([palmBox, dateFoot], { autoAlpha: 0, scale: 0.96, ease: 'power2.in', duration: 0.35 }, 8.35)
      .to(corners, { autoAlpha: 0, duration: 0.35 }, 8.4)
      .to(sHolud, { autoAlpha: 0, duration: 0.3 }, 8.85)
      .fromTo(film, { scale: 1.25 }, { scale: 1, ease: 'power2.out', duration: 1.6 }, 8.95)
      .to(strands, {
        // bunch at the sides like a tied-back curtain; on phones tuck them almost out of view
        x: function (i, el) {
          var W = innerWidth, p = el.dataset.pos / 100, w = innerHeight * el.style.getPropertyValue('--len') * 115 / 1600;
          var to = W < 700 ? (p < 0.5 ? -0.1 * w : W + 0.1 * w) : (p < 0.5 ? p * W * 0.1 : W - (1 - p) * W * 0.1);
          return to - p * W;
        },
        rotation: function (i, el) { return +el.dataset.pos < 50 ? 5 : -5; },
        ease: 'power2.inOut', duration: 1.1, stagger: { each: 0.02, from: 'center' }
      }, 9.2)
      .to(strands, { rotation: 0, ease: 'elastic.out(1, 0.4)', duration: 0.8 }, 10.3);

    /* Page 4: the film follows the scroll; the venue arrives on the stage */
    tl.to(filmState, { p: 1, duration: 4.1, onUpdate: function () { media.stage.setProgress(filmState.p); } }, 9.1)
      .from(vTitle, { autoAlpha: 0, y: 24, ease: 'power2.out', duration: 0.5 }, 9.7)
      .to(vTitle, { autoAlpha: 0, y: -24, ease: 'power2.in', duration: 0.4 }, 11.0)
      .from(vCard, { autoAlpha: 0, y: 50, ease: 'power2.out', duration: 0.6 }, 11.4)
      .fromTo(line, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9 }, 11.7)
      .from(items, { autoAlpha: 0, duration: 0.3, stagger: 0.22 }, 11.75)
      // the closing page rises over the film from 13.8 (it overlaps the stage by 30vh)
      .to(vCard, { autoAlpha: 0, y: -30, ease: 'power2.in', duration: 0.4 }, 13.8)
      .set({}, {}, TOTAL);

    /* Page 5: the alpona is drawn round, then "holud" is written in, as the page arrives */
    gsap.fromTo('.crest--closing img', { '--sweep': 0, rotation: -60 }, {
      '--sweep': 1, rotation: 0, ease: 'none',
      scrollTrigger: { trigger: '.crest--closing', start: 'top 92%', end: 'top 50%', scrub: debug ? true : 0.6 }
    });
    gsap.fromTo('.dress__bangla', { '--reveal': 0 }, {
      '--reveal': 1, ease: 'none',
      scrollTrigger: { trigger: '.dress__bangla', start: 'top 88%', end: 'top 52%', scrub: debug ? true : 0.6 }
    });
    gsap.from('.swatch', {
      y: 30, autoAlpha: 0, rotation: function (i) { return (i - 1) * 12; }, ease: 'power2.out', stagger: 0.12,
      scrollTrigger: { trigger: '.swatches', start: 'top 92%', end: 'top 62%', scrub: debug ? true : 0.6 }
    });

    // scroll progress line
    var bar = $('.progress span');
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (s) { bar.style.setProperty('--p', s.progress.toFixed(4)); } });

    skip.addEventListener('click', function () {
      lenis.scrollTo(tl.scrollTrigger.labelToScroll('invite'), { duration: 2.6, easing: function (t) { return 1 - Math.pow(1 - t, 3); } });
    });

    if (debug) {
      // test hook: jump to a moment of the timeline (units) or to a page fraction
      window.__seek = function (t) {
        var st = tl.scrollTrigger;
        lenis.scrollTo(st.start + (st.end - st.start) * (t / TOTAL), { immediate: true, force: true });
        ScrollTrigger.update();
      };
      window.__seekPage = function (p) {
        lenis.scrollTo(p * ScrollTrigger.maxScroll(window), { immediate: true, force: true });
        ScrollTrigger.update();
      };
    }

    return {
      start: function () {
        lenis.start();
        ScrollTrigger.refresh();
        if (params.has('p') || params.has('t')) {
          var st = tl.scrollTrigger;
          var y = params.has('t')
            ? st.start + (st.end - st.start) * (parseFloat(params.get('t')) / TOTAL)
            : parseFloat(params.get('p')) * ScrollTrigger.maxScroll(window);
          lenis.scrollTo(y, { immediate: true, force: true });
          ScrollTrigger.update();
          return;
        }
        gsap.from(trayFloat, { y: 40, autoAlpha: 0, duration: 1.5, ease: 'power3.out' });
        gsap.from(cue.children, { autoAlpha: 0, y: 8, duration: 1, delay: 1.1, stagger: 0.15, ease: 'power2.out' });
      }
    };
  }

  /* ----------------------------------------------------------------- boot */
  fillContent();
  countdown();
  mehediGame();
  music();

  var M = window.InviteMedia;
  var media = {
    cloth: M.Loop($('.cloth__video')),
    stage: M.Scrub($('.film__video')),
    dust: { setLevel: function () {} }
  };

  var controller = null;
  if (motion) {
    media.dust = Dust($('.dust'));
    Petals($('.petals'), $('.closing'));
    controller = buildMotion(media);
  }

  var fitTimer;
  addEventListener('resize', function () {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(function () { fitNames(); fitMonograms(); }, 150);
  });

  preload(function () {
    fitNames();
    fitMonograms();
    root.classList.add('is-ready');
    if (controller) controller.start();
    media.cloth.setActive(true);
    if (debug && motion) media.stage.load();
  });
})();
