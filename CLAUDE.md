# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page, scroll-animated wedding invitation (Wahid & Anushka, 27 December 2026, BAF Shaheen Hall, Dhaka). It is a plain static site: no package.json, no build step, no bundler, no tests, no linter. GSAP, ScrollTrigger and Lenis are vendored as minified files in `vendor/`. The JS is ES5-style (`var`, IIFEs, globals), loaded by `<script>` tags in this order: vendor, `js/config.js`, `js/media.js`, `js/sound.js`, `js/main.js`. Keep that style. Don't add modules or tooling.

A second, separate invitation for the Gaye Holud lives in `holud/` (see "Holud page" below).

## Commands

- Preview: `python -m http.server 8080`, then open http://localhost:8080 (the holud page is http://localhost:8080/holud/). Opening `index.html` from disk also works, but the venue film then streams instead of loading as a blob (see `media.js`), so scrubbing is worse.
- Deploy: GitHub Pages serves `main` at https://ssanjan123.github.io/wedding-invitation/ (`.nojekyll` is present). **Every push to `main` goes live within a minute or two**, so a push is publishing to guests.

URL parameters for checking a specific moment:
- `?t=<units>`: jump to a point on the scroll timeline (0 to 13.6, see below), e.g. `?t=6.9` for the date.
- `?p=<0..1>`: jump to a fraction of the whole page.
- `?debug`: turns off the preloader delay, makes scrub instant (`scrub: true`), loads the venue film right away and exposes `window.__seek(t)` / `window.__seekPage(p)`. `?t` and `?p` turn on debug too. It also skips the sound choice and exposes `window.__sound` (call `__sound.enable()`, then `__sound.debug()` to see what loaded and which cues fired).
- `?to=Sarah%20%26%20Tom`: guest name on the envelope ("For Sarah & Tom").

## Architecture

### Two render modes (the layout contract)
An inline script in `<head>` adds `motion` or `still` to `<html>` depending on `prefers-reduced-motion`. `main.js` downgrades to `still` if a vendor library failed to load.
- `still`: every scene is a normal full-height section. CSS `order` puts them in reading order (envelope, invitation, venue, blessing).
- `motion`: the first three scenes are absolutely stacked inside the pinned `.stage` and driven by one GSAP timeline. **DOM order is the reverse of story order** (venue, invite, envelope) so that z-index stacks the envelope on top. The blessing page sits outside the stage and overlaps it by `margin-top: -30vh`.
Any layout change has to work in both modes. Dust, petals and the scroll timeline exist only in `motion`.

### The scroll timeline (`buildMotion` in `js/main.js`)
There is one master timeline measured in abstract **units**: `TOTAL = 13.6` units, `UNIT = 0.5` viewport heights of scrolling per unit. Every tween is placed at an absolute unit position, grouped into beats: page 1 envelope (0 to 3.3), page 2 invitation beat A (3.3 to 5.4, label `invite`), beat B date (to 7.35, label `date`), beat C doorway into the film (7.85 to 9.36), page 3 venue film and card (8.9 to 13.6). Things tied to specific unit values:
- `onUpdate` plays the velvet loop while `t < 3.4`, starts fetching the venue film at `t > 0.4` and dims the gold dust between 3.3 and 8.3.
- The Skip button scrolls to the `invite` label.
- The venue card fades at 13.0 because the blessing page's `-30vh` overlap starts to cover the film there.
- The `SOUND` manifest just above `buildMotion` places the music and courtyard levels and the cues (seal 0.33, flap 0.62, card 1.45, swell 2.6, names 4.1, date 6.3, doorway 8.35) at unit positions.
When you move a beat, check these, its sounds and the `?t=` values you test with. The Arabic calligraphy and its halo on page 4 have their own separate ScrollTriggers.

### Content binding
`js/config.js` (`window.INVITE`) is the single source of guest-facing text. `index.html` holds the same text as fallback for no-JS. `fillContent()` overwrites it through data attributes:
- `data-bind="path"` looks up `derived` first, then a dotted path into `INVITE` (e.g. `venue.name`).
- `data-href`, `data-initials`, `data-guest`, `data-message`, `data-ics` and `data-gcal` have their own handling.
- `derived` holds values computed from `start`: weekday, month/year, "at six o'clock in the evening", `whenShort` and the full names.
The `<title>` and `og:` meta tags in `index.html` are **not** bound (link-preview crawlers don't run JS), so change them by hand whenever names or date change. Keep the HTML fallback text in sync as well.

### Dates and time zones
`venueTime()` stores the venue's wall-clock time in a `Date`'s **UTC fields**, so it displays identically in every viewer's time zone. Always read it with `getUTC*` and format it with `timeZone: 'UTC'`. `instant()` applies `utcOffset` (+06:00) to get the real moment, which the countdown, `.ics` file and Google Calendar link use.

### Fitted type
- `fitNames()` shrinks both full-name lines together until the longer one fits the arch opening.
- `fitMonograms()` measures the initials' actual ink on a canvas and places each glyph as an absolutely positioned `<i>`, centred inside the emblem's round medallion. `MEDALLIONS` holds each emblem image's medallion centre and size as fractions of its width (`crest`, `crest-small`, `seal`). **If you replace `crest.webp`, `crest-small.webp` or `seal.webp`, re-measure these numbers.** `MONO_LAYOUT` switches between `row` and `stack`.
Both run after fonts load (in `preload`) and again on a debounced resize.

### Films (`js/media.js`)
- `Loop` plays the velvet background on page 1.
- `Scrub` maps the venue film's `currentTime` to scroll progress. Over http(s) it fetches the whole clip as a blob so seeks are instant. It seeks to the middle of a frame and only when the frame changes (it assumes 24 fps). On iOS it plays and pauses once on the first `touchstart` so that seeked frames get painted. Until the film is ready, the gate poster cross-fades to the courtyard end poster, and the film fades in over it when it arrives.
Each `<video>` has `data-land` / `data-port`, and the clip is picked by orientation and reloaded when orientation changes. With reduced motion, data saver or a 2g/3g connection, no video is fetched and only the posters show.
- **Scrub clip encoding** (both pages): 24 fps H.264 from the `assets/raw/` originals, a keyframe every 4 frames and no B-frames (`-x264-params keyint=4:min-keyint=4:scenecut=0:bframes=0:ref=3`), CRF 23 capped at 8 Mbps for 1920x1080 and 4.5 Mbps for 720x1280, `+faststart`. Every seek decodes from the previous keyframe, so the default long GOP with B-frames makes the film stutter. This encoding seeks about 3 times faster at the same size.
- **Keep the film section cheap to draw:** don't put `backdrop-filter` on anything that appears over a film (the venue cards are opaque instead; the blur stalled a frame as the card appeared). The wedding's `.portal__frame` has `will-change: transform` because scaling the masked paper 9x repainted it every frame. No CSS `filter` on anything that moves over a film either: the holud strands' drop-shadows are baked into their images for that reason.

## Holud page (`holud/`)
A joint Gaye Holud invitation (Thursday 24 December 2026, 7 to 11 pm, BGB Banquet Hall, Shimanto Shambhar), live at https://ssanjan123.github.io/wedding-invitation/holud/. It links back to the wedding (`wedding.url: "../"`); the wedding page does not link to it, because not every wedding guest is a holud guest. Its story follows a holud evening: a painted kula with a thread-tied card, a swipe of turmeric paste that writes গায়ে হলুদ and the names, a palm drawn in mehndi lines holding the date, a marigold-string curtain that parts onto a scrubbed film of the stage, and a "come dressed in holud" closing page. Mehedi is a separate event of its own, so the holud invitation's text must not mention it.
- Same conventions as the wedding page: `holud/js/config.js` (`window.INVITE`) holds every guest-facing string, the same `data-*` bindings, both render modes and the same URL parameters. Its `<title>` and `og:` tags are hand-written too.
- **Shared files:** it loads `../vendor/*.js`, `../js/media.js` and `../js/sound.js` directly, and its petals are `../assets/img/petal-*.webp` and `leaf-gold.webp`. A change to any of those affects both pages. `holud/js/main.js` is adapted from `js/main.js` (dates, content binding, monograms, calendar, countdown, dust, petals), so fix shared bugs in both.
- **Timeline:** `TOTAL = 14.4`, `UNIT = 0.5`. Tray 0 to 3.2, holud swipe 3.2 to 5.8 (label `invite`), date on the palm 5.8 to 7.9 (label `date`), curtain falls at 8.2 and parts 9.2 to 10.3, stage film scrubs 9.1 to 13.2, venue card fades at 13.8 before the closing page's `-30vh` overlap. `onUpdate`: cloth loop while `t < 3.3`, stage film fetch at `t > 0.4`, dust 0.6 on the tray, 0 on the paper pages (3.2 to 8.9) and 1 on the stage. Tap-to-dab works while `3.7 < t < 5.95` and on the closing page. Useful `?t=` stops: 0, 1.4, 3.0, 5.8, 7.9, 8.7, 9.8, 12.4.
- **Centring:** elements that GSAP transforms (card, knot, alpona corners, curtain strands) are centred with negative margins, not the CSS `translate` property. GSAP folds `translate` into its own transform and reads it as 0 px on an image that hasn't loaded yet. The dabs use `xPercent`/`yPercent`.
- **Measured artwork:** `MEDALLIONS.alpona` is the alpona's empty centre, and `.disc` is the rice-white disc that `.crest--disc` draws over it so small tokens get larger initials. The palm's empty circle sits at (37.5%, 55.96%) of the image and is 44.2% of its width across; `.palm-box` and `.date` in `holud/css/style.css` depend on that. Re-measure if you replace `alpona.webp` or `mehedi-palm.png`.
- The curtain is built in JS (`buildCurtain`, seeded so it is the same every visit): 11, 16 or 22 strands by screen width. On phones the parted strands tuck almost off-screen so the venue text stays clear. Strands alternate `strand-front.webp` and `strand-back.webp`: the 115 x 1600 strand from `assets/raw/holud/marigold-string-v1.png` (crop x 665 to 855, y 0 to 2654) with its shadow baked in, padded to 155 x 1640 (20px at the sides, 8 above, 32 below; `.strand`'s size and margins depend on that). The front has the old `drop-shadow(0 8px 8px rgba(40,18,0,.45))` and the back row is darkened to 80% with `drop-shadow(0 6px 6px rgba(40,18,0,.35))`, drawn at 1.55 image px per CSS px. Per-strand CSS filters dropped frames all the time the curtain moved over the film. The garlands still use `marigold-string.webp` with a CSS shadow.
- **Sound** (`js/sound.js`, shared with the wedding page, which works the same way with its own `SOUND` manifest and files in `assets/audio/`). When loading finishes, the preloader asks **Open with sound / Open quietly** (`InviteSound.gate`); browsers only allow sound after a tap, and nothing audio-related is fetched for guests who open quietly. The round `.music` button then toggles sound (`InviteSound.toggle`), and `sound: false` in `holud/js/config.js` removes the question and all audio.
  - The `SOUND` manifest just above `buildMotion` has **beds** (loops whose level follows the timeline through a `curve` of `[t, gain]` points; `still` is the level in still mode), **cues** (one-shots fired when `t` passes `at` going forward, at most one per 250 ms, never going backward) and **taps** (`sound.play('dab')`). `onUpdate` calls `sound.setTime(t)`, so when a beat moves, move its sounds.
  - Loops play as overlapping buffer sources with a 1.5 s equal-power cross-fade, which hides mp3 padding; don't switch to `loop = true`, which clicks at the seam. On iOS, `enable()` sets `navigator.audioSession.type = 'playback'` (or plays a silent looping `<audio>` on older iOS) so the silent switch doesn't mute the page. Hiding the tab suspends the audio.
  - The files are in `holud/assets/audio/`. Higgsfield has no music or sound-effect model for general use, so they were made with video models that generate sound (`wan3_0` for the music, `seedance_2_0_mini` for ambience and cues), keeping only the soundtrack. Music is mastered to about −16 LUFS and ambience to about −20 LUFS; cues are peak-normalised mono 96 kbps.

## Assets
All artwork and films were generated in Higgsfield. The originals live in `assets/raw/` (the holud set in `assets/raw/holud/`), which is gitignored and not deployed (the generated audio clips are in `assets/raw/audio/`). Portrait (`-port`) and landscape (`-land`) versions exist for the films and their posters. The wedding's sound is in `assets/audio/` (`sound: true` in `js/config.js`).
