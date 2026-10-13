/*
  Touch pacing for both invitations (the holud page loads this file as ../js/pace.js).
  Phones would otherwise coast a hard flick thousands of pixels and blow through the whole story in a second.
  Here Lenis takes over touch scrolling (syncTouch): while the finger is down the page follows it 1:1, and on
  release it glides, at no more than MAX_SPEED, and never past the next resting moment (a stop) in either
  direction. A touch stops a glide where it is. Wheel and trackpad scrolling are left to Lenis as before.
  Pinch-zoom, and panning while zoomed in, stay with the browser.
*/
window.InvitePace = (function () {
  var TAU = 350;         // ms: a release at v px/ms would coast v × TAU px
  var MAX_SPEED = 0.8;   // viewport heights per second, on average over a glide
  var MIN_D = 0.5, MAX_D = 3;   // seconds a glide takes
  var NEAR = 0.1;        // viewport heights: a stop this close to the release point doesn't hold the glide
  var MIN_V = 0.15;      // px/ms: slower releases don't glide
  var WINDOW = 100;      // ms of finger movement the release speed is measured over
  var REST = 80;         // ms: a finger held this long before lifting has no speed

  // Lenis's syncTouch is unreliable before iOS 16: keep native scrolling there
  var ios = (function () {
    var m = /\bOS (\d+)_\d+(?:_\d+)? like Mac OS X/.exec(navigator.userAgent);
    if (m) return +m[1];
    if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
      m = /Version\/(\d+)/.exec(navigator.userAgent);
      return m ? +m[1] : 0;
    }
    return 0;
  })();

  function easeOutSine(t) { return Math.sin(t * Math.PI / 2); }

  function create() {
    var lenis = null, getStops = null, samples = [], pinching = false;
    var api = { onScroll: onScroll, attach: attach, last: null };

    function attach(l, stops) { lenis = l; getStops = stops; }

    function zoomed() { var vv = window.visualViewport; return !!vv && vv.scale > 1.01; }

    // px/ms along the scroll (positive is down), from the finger's last WINDOW ms
    function velocity(now) {
      var n = samples.length;
      if (!n || now - samples[n - 1].t > REST) return 0;
      if (n === 1) return samples[0].d / 16;
      var sum = 0;
      for (var i = 1; i < n; i++) sum += samples[i].d;   // the first delta began before the window
      return sum / Math.max(8, samples[n - 1].t - samples[0].t);
    }

    function fling(v) {
      if (!lenis || Math.abs(v) < MIN_V) return;
      var h = innerHeight, cur = lenis.targetScroll, natural = cur + v * TAU, dest = natural;
      var near = NEAR * h, next = null;
      (getStops ? getStops() : []).forEach(function (s) {
        if (v > 0 ? s > cur + near && (next === null || s < next) : s < cur - near && (next === null || s > next)) next = s;
      });
      if (next !== null && (v > 0 ? next < dest : next > dest)) dest = next;
      var duration = Math.min(MAX_D, Math.max(MIN_D, Math.abs(dest - cur) / (MAX_SPEED * h)));
      api.last = { v: v, from: cur, natural: natural, dest: dest, duration: duration };
      lenis.scrollTo(dest, { duration: duration, easing: easeOutSine });
    }

    // Lenis's virtualScroll hook: false skips Lenis's own handling of the event (and its preventDefault)
    function onScroll(e) {
      var ev = e.event, type = ev.type;
      if (type.indexOf('touch') !== 0) return true;
      var touches = ev.touches ? ev.touches.length : 0;
      if (type === 'touchstart') {
        pinching = touches > 1;
        samples = [];
      } else if (type === 'touchmove' && touches > 1) {
        pinching = true;
      }
      if (pinching || zoomed()) return false;
      if (type === 'touchmove') {
        samples.push({ t: ev.timeStamp, d: e.deltaY });
        while (ev.timeStamp - samples[0].t > WINDOW) samples.shift();
        return true;
      }
      if (type === 'touchend') {
        fling(velocity(ev.timeStamp));
        samples = [];
        return false;
      }
      return true;
    }

    return api;
  }

  return { supported: !ios || ios >= 16, create: create };
})();
