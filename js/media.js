/*
  Films: ambient loops (velvet table, night sky) and the scroll-scrubbed venue film.
  Portrait screens get the 9:16 cut, landscape screens the 16:9 cut.
  With reduced motion or data saver on, no video is fetched and the posters stay.
*/
window.InviteMedia = (function () {
  var portrait = matchMedia('(orientation: portrait)');
  var conn = navigator.connection || {};
  var saveData = !!conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var enabled = !saveData && !reduce;
  var httpish = /^https?:$/.test(location.protocol);

  function pick(video) { return portrait.matches ? video.dataset.port : video.dataset.land; }

  function Loop(video) {
    var wrap = video.parentElement, loaded = false, active = false;

    function load() {
      if (loaded || !enabled) return;
      loaded = true;
      video.src = pick(video);
      video.load();
      video.addEventListener('canplay', function () {
        wrap.classList.add('is-playing');
        if (active) play();
      }, { once: true });
    }
    function play() { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    function setActive(on) {
      if (on === active) return;
      active = on;
      if (on) { load(); if (video.readyState > 2) play(); }
      else video.pause();
    }
    portrait.addEventListener('change', function () {
      if (!loaded) return;
      loaded = false;
      wrap.classList.remove('is-playing');
      load();
    });
    return { load: load, setActive: setActive };
  }

  function Scrub(video) {
    var wrap = video.closest('.film');
    var endPoster = wrap.querySelector('.film__poster--end');
    var ready = false, loading = false, seeking = false, primed = false, target = 0, objectUrl = null;

    function attach(url) {
      video.src = url;
      video.load();
    }
    function load() {
      if (loading || !enabled) return;
      loading = true;
      var src = pick(video);
      video.addEventListener('loadeddata', function () { ready = true; seek(); }, { once: true });
      // A clip held in memory seeks instantly; streamed clips seek over the network.
      if (httpish && window.fetch) {
        fetch(src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
          .then(function (blob) { objectUrl = URL.createObjectURL(blob); attach(objectUrl); })
          .catch(function () { attach(src); });
      } else {
        attach(src);
      }
    }
    function seek() {
      if (!ready || seeking || !video.duration) return;
      var t = target * Math.max(0, video.duration - 0.04);
      if (Math.abs(video.currentTime - t) < 0.02) return;
      seeking = true;
      video.currentTime = t;
    }
    video.addEventListener('seeked', function () {
      seeking = false;
      wrap.classList.add('is-ready');
      seek();
    });
    function setProgress(p) {
      target = Math.min(1, Math.max(0, p));
      if (!wrap.classList.contains('is-ready') && endPoster) {
        // without the film, cross-fade from the gate to the courtyard
        endPoster.style.opacity = Math.min(1, Math.max(0, (target - 0.45) / 0.35));
      }
      seek();
    }
    // iOS paints seeked frames only after the video has played once
    function prime() {
      if (primed || !enabled) return;
      primed = true;
      load();
      var p = video.play();
      if (p && p.then) p.then(function () { video.pause(); seek(); }).catch(function () {});
    }
    window.addEventListener('touchstart', prime, { once: true, passive: true });

    portrait.addEventListener('change', function () {
      if (!loading) return;
      ready = false; loading = false; seeking = false;
      wrap.classList.remove('is-ready');
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
      load();
    });
    return { load: load, setProgress: setProgress };
  }

  return { Loop: Loop, Scrub: Scrub, enabled: enabled };
})();
