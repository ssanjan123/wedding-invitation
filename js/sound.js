/*
  Sound for both invitations (the holud page loads this file as ../js/sound.js).
  - beds: loops (music, ambience) whose level follows the scroll timeline through a curve of [t, gain] points
  - cues: one-shots fired when the scroll passes a moment going forward
  - taps: one-shots the page plays on demand (a random pick from a list)
  Nothing is fetched until the guest chooses sound. Loops cross-fade into themselves, which hides the
  silence mp3 encoders pad onto both ends (a plain `loop = true` would click at the seam).
*/
window.InviteSound = (function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var XF = 1.5;          // seconds where a loop cross-fades into its own start
  var CUE_GAP = 0.25;    // seconds: at most one timed cue this often, so a fast Skip scroll stays tidy
  var CURVE = 64, FADE_IN = new Float32Array(CURVE), FADE_OUT = new Float32Array(CURVE);
  for (var i = 0; i < CURVE; i++) {   // equal-power
    FADE_IN[i] = Math.sin(i / (CURVE - 1) * Math.PI / 2);
    FADE_OUT[i] = Math.cos(i / (CURVE - 1) * Math.PI / 2);
  }
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function load(ctx, url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (data) { return new Promise(function (ok, fail) { ctx.decodeAudioData(data, ok, fail); }); });
  }

  // gain at timeline position t, from [[t, gain], ...] in order; flat before the first and after the last point
  function level(curve, t) {
    if (!curve || !curve.length) return 1;
    if (t <= curve[0][0]) return curve[0][1];
    for (var i = 1; i < curve.length; i++) {
      if (t <= curve[i][0]) {
        var a = curve[i - 1], b = curve[i];
        return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
      }
    }
    return curve[curve.length - 1][1];
  }

  // A tenth of a second of silence. On iOS before Safari 17, a playing <audio> element moves the page into the
  // "playback" audio category, so the ring/silent switch no longer mutes Web Audio.
  function silence() {
    var n = 4410, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }

  function create(manifest) {
    var ctx = null, master = null, on = false, t = null, timed = false, lastCue = -1, keepAlive = null;
    var volume = manifest.volume == null ? 0.9 : manifest.volume;
    var listeners = [], fired = [];
    var beds = (manifest.beds || []).map(function (s) { return { spec: s, gain: null, buffer: null, sources: [], playing: false, timer: 0 }; });
    var cues = (manifest.cues || []).map(function (s) { return { spec: s, buffer: null }; });
    var taps = {};
    Object.keys(manifest.taps || {}).forEach(function (k) { taps[k] = { urls: manifest.taps[k], buffers: [] }; });

    function bedLevel(b) {
      if (timed) return level(b.spec.curve, t);
      return b.spec.still != null ? b.spec.still : level(b.spec.curve, 0);
    }

    function init() {
      if (ctx) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      beds.forEach(function (b) {
        b.gain = ctx.createGain();
        b.gain.gain.value = bedLevel(b);
        b.gain.connect(master);
        load(ctx, b.spec.url).then(function (buf) { b.buffer = buf; if (on) loop(b); }).catch(function () {});
      });
      cues.forEach(function (c) { load(ctx, c.spec.url).then(function (buf) { c.buffer = buf; }).catch(function () {}); });
      Object.keys(taps).forEach(function (k) {
        taps[k].urls.forEach(function (u) { load(ctx, u).then(function (buf) { taps[k].buffers.push(buf); }).catch(function () {}); });
      });
    }

    /* one pass of a loop: fades in (except the very first), fades out over its last XF seconds, and the
       next pass starts XF before this one ends */
    function pass(b, at, first) {
      var D = b.buffer.duration, xf = Math.min(XF, D / 3);
      var src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = b.buffer;
      src.connect(g);
      g.connect(b.gain);
      if (!first) g.gain.setValueCurveAtTime(FADE_IN, at, xf);
      g.gain.setValueCurveAtTime(FADE_OUT, at + D - xf, xf);
      src.start(at);
      src.stop(at + D);
      b.sources.push(src);
      src.onended = function () { var i = b.sources.indexOf(src); if (i > -1) b.sources.splice(i, 1); };
      arm(b, at + D - xf);
    }
    function arm(b, nextAt) {
      clearTimeout(b.timer);
      b.timer = setTimeout(function () {
        if (!on || !b.playing) return;
        if (nextAt - ctx.currentTime > 1) return arm(b, nextAt);   // the context was suspended: wait for it
        pass(b, nextAt, false);
      }, Math.max(250, (nextAt - ctx.currentTime - 0.6) * 1000));
    }
    function loop(b) {
      if (b.playing || !b.buffer) return;
      b.playing = true;
      pass(b, ctx.currentTime + 0.05, true);
    }
    function stopBeds() {
      beds.forEach(function (b) {
        b.playing = false;
        clearTimeout(b.timer);
        b.sources.slice().forEach(function (s) { try { s.stop(); } catch (e) {} });
        b.sources = [];
      });
    }

    function shot(buffer, gain) {
      var s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = buffer;
      g.gain.value = gain == null ? 1 : gain;
      s.connect(g);
      g.connect(master);
      s.start();
    }

    function unlock() {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      if (!ios || navigator.audioSession) return;
      if (!keepAlive) { keepAlive = new Audio(silence()); keepAlive.loop = true; }
      var p = keepAlive.play();
      if (p && p.catch) p.catch(function () {});
    }

    function emit() { listeners.forEach(function (fn) { fn(on); }); }

    function enable() {
      if (!AC) return;
      init();
      on = true;
      unlock();
      if (ctx.state !== 'running') ctx.resume();
      beds.forEach(loop);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(volume, ctx.currentTime, 0.35);
      emit();
    }
    function disable() {
      if (!ctx || !on) return;
      on = false;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      setTimeout(function () { if (!on) { stopBeds(); ctx.suspend(); } }, 700);
      if (keepAlive) keepAlive.pause();
      emit();
    }

    // called from the scroll timeline: bed levels follow t, and cues fire when t passes them going forward
    function setTime(nt) {
      var prev = t;
      t = nt;
      timed = true;
      if (!ctx) return;
      beds.forEach(function (b) { b.gain.gain.setTargetAtTime(level(b.spec.curve, t), ctx.currentTime, 0.15); });
      if (!on || prev == null || nt <= prev) return;
      cues.forEach(function (c) {
        if (c.spec.at > prev && c.spec.at <= nt && c.buffer && ctx.currentTime - lastCue >= CUE_GAP) {
          lastCue = ctx.currentTime;
          shot(c.buffer, c.spec.gain);
          fired.push({ at: c.spec.at, time: +ctx.currentTime.toFixed(3) });
        }
      });
    }

    function play(name, gain) {
      var tap = taps[name];
      if (!on || !ctx || !tap || !tap.buffers.length) return;
      shot(tap.buffers[(Math.random() * tap.buffers.length) | 0], gain);
      fired.push({ tap: name, time: +ctx.currentTime.toFixed(3) });
    }

    document.addEventListener('visibilitychange', function () {
      if (!ctx || !on) return;
      if (document.hidden) { ctx.suspend(); if (keepAlive) keepAlive.pause(); }
      else { ctx.resume(); if (keepAlive) keepAlive.play().catch(function () {}); }
    });

    return {
      enable: enable,
      disable: disable,
      toggle: function () { if (on) disable(); else enable(); },
      isOn: function () { return on; },
      onChange: function (fn) { listeners.push(fn); },
      setTime: setTime,
      play: play,
      // test hook: what has loaded and fired
      debug: function () {
        return {
          state: ctx ? ctx.state : 'none', on: on,
          beds: beds.map(function (b) { return { url: b.spec.url, loaded: !!b.buffer, playing: b.playing, gain: b.gain ? +b.gain.gain.value.toFixed(3) : null }; }),
          cuesLoaded: cues.filter(function (c) { return c.buffer; }).length + '/' + cues.length,
          tapsLoaded: Object.keys(taps).map(function (k) { return k + ':' + taps[k].buffers.length; }),
          fired: fired.slice()
        };
      }
    };
  }

  /* The choice after loading: "Open with sound" / "Open quietly". Both open the invitation; the first also
     turns sound on (it has to happen inside the tap). Without a sound engine the page just opens. */
  function gate(loader, sound, open) {
    var choice = loader && loader.querySelector('.preloader__choice');
    if (!sound || !choice) { open(); return; }
    choice.hidden = false;
    loader.removeAttribute('aria-hidden');
    loader.classList.add('is-asking');
    var buttons = choice.querySelectorAll('button');
    setTimeout(function () { buttons[0].focus({ preventScroll: true }); }, 50);
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        if (btn.hasAttribute('data-sound-on')) sound.enable();
        loader.setAttribute('aria-hidden', 'true');
        open();
      }, { once: true });
    });
  }

  // the round button in the corner turns sound on and off once the invitation is open
  function toggle(btn, sound) {
    if (!btn || !sound) return;
    btn.hidden = false;
    document.documentElement.classList.add('sound-toggle');   // lets the page keep bottom content clear of it
    btn.setAttribute('aria-pressed', String(sound.isOn()));
    btn.addEventListener('click', sound.toggle);
    sound.onChange(function (on) { btn.setAttribute('aria-pressed', String(on)); });
  }

  return { supported: !!(AC && window.fetch && window.Promise), create: create, gate: gate, toggle: toggle };
})();
