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

  /* ---------------------------------------------------------------- dates */
  function pad(n) { return String(n).padStart(2, '0'); }
  function parseLocal(s) {
    var parts = String(s).split('T'), d = parts[0].split('-').map(Number), t = (parts[1] || '00:00').split(':').map(Number);
    return new Date(d[0], d[1] - 1, d[2], t[0] || 0, t[1] || 0);
  }
  var WORDS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
  function timeInWords(d) {
    var h = d.getHours(), m = d.getMinutes();
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
    var h = d.getHours(), m = d.getMinutes();
    return (h % 12 || 12) + (m ? ':' + pad(m) : '') + (h < 12 ? ' am' : ' pm');
  }

  var start = parseLocal(C.start);
  var end = parseLocal(C.end || C.start);
  var names = C.couple.first + ' & ' + C.couple.second;
  var derived = {
    namesShort: names,
    weekday: start.toLocaleDateString('en-GB', { weekday: 'long' }),
    monthYear: start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    dateShort: start.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
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

    document.title = names + ' are getting married';
    $('[data-day]').textContent = String(start.getDate());
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

    calendarLinks();
  }

  function buildDigits() {
    var holder = $('.date__digits');
    holder.innerHTML = '';
    String(start.getDate()).split('').forEach(function (ch, i) {
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
    var stamp = function (d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; };
    var icsText = function (s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); };
    var title = 'Wedding of ' + names;
    var where = C.venue.name + ', ' + C.venue.address;
    var about = C.hosts + ', ' + names + ' ' + C.request + '.';
    var now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding Invitation//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + stamp(start) + '-' + names.replace(/\W+/g, '').toLowerCase() + '@wedding-invitation',
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
      var ms = start - Date.now();
      if (ms <= 0) {
        el.textContent = Date.now() < end ? 'The celebration is happening now' : 'Thank you for celebrating with us';
        return;
      }
      var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
      el.innerHTML = (d ? unit(d, 'day') + ', ' : '') + unit(h, 'hour') + ', ' + unit(m, 'minute') + ' and ' + unit(s % 60, 'second') + ' to go';
    }
    tick();
    setInterval(tick, 1000);
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

  /* ----------------------------------------------------------- gold dust */
  function Dust(canvas) {
    var ctx = canvas.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, level = 1, last = performance.now(), parts = [];
    var sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    var g = sprite.getContext('2d'), grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(255,241,193,1)');
    grd.addColorStop(0.35, 'rgba(233,205,124,.55)');
    grd.addColorStop(1, 'rgba(201,162,75,0)');
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
    var imgs = ['petal-rose', 'petal-rose', 'petal-marigold', 'petal-marigold', 'leaf-gold'].map(function (n) {
      var im = new Image(); im.src = 'assets/img/' + n + '.webp'; return im;
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
        ctx.globalAlpha = 0.92;
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

  /* ------------------------------------------------------------ preloader */
  function preload(done) {
    var loader = $('.preloader');
    var urls = ['assets/img/seal.webp', 'assets/img/env-paper.webp', 'assets/img/liner.webp', 'assets/img/card-paper.webp',
      'assets/img/crest.webp', 'assets/img/arch.webp', portrait.matches ? 'assets/img/velvet-port.jpg' : 'assets/img/velvet-land.jpg'];
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
      document.fonts.load('italic 1em "Cormorant Garamond"')
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

    var TOTAL = 13.6;    // timeline length in units
    var UNIT = 0.5;      // viewport heights of scrolling per unit

    var env = $('.envelope'), envFloat = $('.env-float'), card = $('.card'), cardInner = $('.card__inner');
    var flap = $('.env-flap'), flapShadow = $('.env-flap-shadow'), seal = $('.seal'), halves = $$('.seal__half');
    var pocket = $('.env-pocket'), inside = $('.env-inside'), envShadow = $('.env-shadow');
    var cue = $('.scroll-cue'), skip = $('.skip'), burst = $('.burst');
    var sEnv = $('.scene--envelope'), sInv = $('.scene--invite');
    var invBg = $('.invite-bg'), frame = $('.portal__frame'), arch = $('.arch'), spray = $('.spray');
    var crest = $('.crest--invite'), hosts = $('.hosts'), namesEl = $('.names'), request = $('.request');
    var nOne = $('.names__one'), nTwo = $('.names__two'), amp = $('.names__amp');
    var invB = $('.invite-b'), namesSmall = $('.names-small'), mandala = $('.mandala');
    var florals = $$('.floral'), garlands = $$('.garland');
    var film = $('.film'), vTitle = $('.venue-title'), vCard = $('.venue-card');
    var line = $('.evening__line line'), items = $$('.evening__list li');

    // gold flecks for the seal breaking
    var dots = [];
    for (var i = 0; i < 16; i++) { var d = document.createElement('i'); burst.appendChild(d); dots.push(d); }

    var filmState = { p: 0 };
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
          var t = self.progress * TOTAL;
          envFloat.classList.toggle('is-still', t > 0.02);
          media.velvet.setActive(t < 3.4);
          if (t > 0.4) media.venue.load();   // guest has started opening: fetch the venue film now
          media.dust.setLevel(t > 3.3 && t < 8.3 ? 0.2 : 1);
        }
      }
    });

    /* Page 1: seal breaks, flap opens, card rises and fills the screen */
    tl.to(cue, { autoAlpha: 0, y: 12, duration: 0.25 }, 0)
      .to(seal, { keyframes: { rotation: [0, -3, 3, -2, 2, 0], x: [0, -2, 2, -1, 1, 0] }, duration: 0.3 }, 0.02)
      .to(halves[0], { xPercent: -36, yPercent: 130, rotation: -30, autoAlpha: 0, ease: 'power2.in', duration: 0.55 }, 0.33)
      .to(halves[1], { xPercent: 36, yPercent: 136, rotation: 34, autoAlpha: 0, ease: 'power2.in', duration: 0.55 }, 0.35)
      .fromTo(dots, { x: 0, y: 0, scale: 1 }, {
        x: function (i) { return Math.cos(i / dots.length * 6.283) * (40 + (i % 3) * 22); },
        y: function (i) { return Math.sin(i / dots.length * 6.283) * (30 + (i % 4) * 16); },
        scale: 0.4, ease: 'power2.out', duration: 0.5
      }, 0.33)
      .to(dots, { keyframes: { opacity: [0, 1, 1, 0] }, duration: 0.5 }, 0.33)
      .to(flapShadow, { autoAlpha: 0, duration: 0.3 }, 0.62)
      .fromTo(flap, { rotationX: 0, transformPerspective: 1100 }, { rotationX: 180, transformPerspective: 1100, ease: 'power2.inOut', duration: 0.9 }, 0.62)
      .set(flap, { zIndex: 1 }, 1.07)
      .to(card, { y: function () { return -0.97 * env.offsetHeight; }, ease: 'power1.inOut', duration: 1 }, 1.45)
      .to(env, { y: function () { return 0.96 * env.offsetHeight; }, ease: 'power2.in', duration: 1 }, 1.75)
      .set(card, { zIndex: 9 }, 2.4)
      .to([pocket, inside, flap, envShadow], { autoAlpha: 0, duration: 0.45 }, 2.35)
      .to(cardInner, { autoAlpha: 0, duration: 0.3 }, 2.6)
      .to(card, {
        scaleX: function () { return innerWidth / card.offsetWidth * 1.06; },
        scaleY: function () { return innerHeight / card.offsetHeight * 1.06; },
        ease: 'power2.inOut', duration: 0.75
      }, 2.6)
      .to(skip, { autoAlpha: 0, duration: 0.2 }, 3.05)
      .to(sEnv, { autoAlpha: 0, duration: 0.15 }, 3.3);

    /* Page 2, beat A: the arch settles, florals gather, names are written in */
    tl.fromTo(frame, { scale: 1.12, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, ease: 'power2.out', duration: 0.8 }, 3.3)
      .from(florals, { xPercent: -40, yPercent: 40, autoAlpha: 0, rotation: -6, ease: 'power2.out', duration: 0.8, stagger: 0.06 }, 3.45)
      .from(garlands, { yPercent: -105, ease: 'power2.out', duration: 0.7, stagger: 0.08 }, 3.55)
      .fromTo(garlands, { rotation: 7 }, { rotation: 0, ease: 'elastic.out(1, 0.35)', duration: 0.9, stagger: 0.08 }, 3.95)
      .from(spray, { y: 40, autoAlpha: 0, scale: 0.92, ease: 'power2.out', duration: 0.6 }, 3.7)
      .from(crest, { autoAlpha: 0, scale: 0.85, ease: 'power2.out', duration: 0.45 }, 3.85)
      .from(hosts, { autoAlpha: 0, y: 14, ease: 'power2.out', duration: 0.4 }, 3.95)
      .fromTo(nOne, { '--reveal': 0 }, { '--reveal': 1, ease: 'power1.inOut', duration: 0.55 }, 4.1)
      .from(amp, { autoAlpha: 0, scale: 0.5, rotation: -12, ease: 'back.out(2)', duration: 0.35 }, 4.5)
      .fromTo(nTwo, { '--reveal': 0 }, { '--reveal': 1, ease: 'power1.inOut', duration: 0.55 }, 4.6)
      .from(request, { autoAlpha: 0, y: 14, ease: 'power2.out', duration: 0.4 }, 4.95)
      .addLabel('invite', 5.4);

    /* Beat B: the date rolls in over a turning mandala */
    tl.to([crest, hosts, request], { autoAlpha: 0, y: -18, ease: 'power2.in', duration: 0.4, stagger: 0.04 }, 5.8)
      .to(namesEl, { autoAlpha: 0, scale: 0.6, y: function () { return -0.2 * frame.offsetWidth; }, ease: 'power2.inOut', duration: 0.5 }, 5.85)
      .from(namesSmall, { autoAlpha: 0, y: 24, ease: 'power2.out', duration: 0.45 }, 6.15)
      .from(mandala, { autoAlpha: 0, scale: 0.6, rotation: -40, ease: 'power2.out', duration: 0.8 }, 6.0)
      .to(mandala, { rotation: 70, duration: 2.4 }, 6.8)
      .from('.date__weekday', { autoAlpha: 0, y: 10, ease: 'power2.out', duration: 0.35 }, 6.25)
      .from('.date__day', { autoAlpha: 0, duration: 0.2 }, 6.3);
    $$('.date__digit > span').forEach(function (col, i) {
      tl.fromTo(col, { yPercent: 0 }, { yPercent: +col.dataset.end, ease: 'power3.out', duration: 0.75 }, 6.3 + i * 0.12);
    });
    tl.from('.date__month', { autoAlpha: 0, y: 10, ease: 'power2.out', duration: 0.35 }, 6.7)
      .from('.date__time', { autoAlpha: 0, y: 10, ease: 'power2.out', duration: 0.35 }, 6.85)
      .from('.countdown', { autoAlpha: 0, y: 10, ease: 'power2.out', duration: 0.35 }, 7.0)
      .addLabel('date', 7.35);

    /* Beat C: the arch becomes a doorway into the venue film */
    tl.to(invB, { autoAlpha: 0, scale: 0.96, ease: 'power2.in', duration: 0.35 }, 7.85)
      .to(florals, { xPercent: -40, yPercent: 40, autoAlpha: 0, ease: 'power2.in', duration: 0.5 }, 7.85)
      .to(garlands, { yPercent: -105, ease: 'power2.in', duration: 0.5, stagger: 0.04 }, 7.85)
      .to(spray, { y: 40, autoAlpha: 0, ease: 'power2.in', duration: 0.4 }, 7.9)
      .to(invBg, { autoAlpha: 0, duration: 0.35 }, 8.1)
      .fromTo(film, { scale: 1.3 }, { scale: 1, ease: 'power2.out', duration: 1.4 }, 8.1)
      .to(frame, { scale: 9, ease: 'power2.in', duration: 1 }, 8.35)
      .to(arch, { autoAlpha: 0, duration: 0.25 }, 9.1)
      .set(sInv, { autoAlpha: 0 }, 9.36);

    /* Page 3: the film follows the scroll; venue details arrive at the courtyard */
    tl.to(filmState, { p: 1, duration: 3.9, onUpdate: function () { media.venue.setProgress(filmState.p); } }, 8.9)
      .from(vTitle, { autoAlpha: 0, y: 24, ease: 'power2.out', duration: 0.5 }, 9.3)
      .to(vTitle, { autoAlpha: 0, y: -24, ease: 'power2.in', duration: 0.4 }, 10.7)
      .from(vCard, { autoAlpha: 0, y: 50, ease: 'power2.out', duration: 0.6 }, 11.2)
      .fromTo(line, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9 }, 11.5)
      .from(items, { autoAlpha: 0, duration: 0.3, stagger: 0.22 }, 11.55)
      // the ivory blessings page rises over the film from 13.0 (it overlaps the stage by 30vh)
      .to(vCard, { autoAlpha: 0, y: -30, ease: 'power2.in', duration: 0.4 }, 13.0)
      .set({}, {}, TOTAL);

    /* Page 4: the blessing is written in, right to left, as the page arrives */
    gsap.fromTo('.calligraphy__text', { '--reveal': 0 }, {
      '--reveal': 1, ease: 'none',
      scrollTrigger: { trigger: '.calligraphy', start: 'top 88%', end: 'top 38%', scrub: debug ? true : 0.6 }
    });
    gsap.fromTo('.calligraphy__halo', { rotation: -35 }, {
      rotation: 35, ease: 'none',
      scrollTrigger: { trigger: '.blessing', start: 'top bottom', end: 'bottom top', scrub: true }
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
        gsap.from(envFloat, { y: 40, autoAlpha: 0, duration: 1.5, ease: 'power3.out' });
        gsap.from(cue.children, { autoAlpha: 0, y: 8, duration: 1, delay: 1.1, stagger: 0.15, ease: 'power2.out' });
      }
    };
  }

  /* ----------------------------------------------------------------- boot */
  fillContent();
  countdown();
  music();

  var M = window.InviteMedia;
  var media = {
    velvet: M.Loop($('.velvet__video')),
    venue: M.Scrub($('.film__video')),
    dust: { setLevel: function () {} }
  };

  var controller = null;
  if (motion) {
    media.dust = Dust($('.dust'));
    Petals($('.petals'), $('.blessing'));
    controller = buildMotion(media);
  }

  preload(function () {
    root.classList.add('is-ready');
    if (controller) controller.start();
    media.velvet.setActive(true);
    if (debug && motion) media.venue.load();
  });
})();
