# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page, scroll-animated wedding invitation (Wahid & Anushka, 27 December 2026, BAF Shaheen Hall, Dhaka). It is a plain static site: no package.json, no build step, no bundler, no tests, no linter. GSAP, ScrollTrigger and Lenis are vendored as minified files in `vendor/`. The JS is ES5-style (`var`, IIFEs, globals), loaded by `<script>` tags in this order: vendor, `js/config.js`, `js/media.js`, `js/main.js`. Keep that style. Don't add modules or tooling.

## Commands

- Preview: `python -m http.server 8080`, then open http://localhost:8080. Opening `index.html` from disk also works, but the venue film then streams instead of loading as a blob (see `media.js`), so scrubbing is worse.
- Deploy: GitHub Pages serves `main` at https://ssanjan123.github.io/wedding-invitation/ (`.nojekyll` is present). **Every push to `main` goes live within a minute or two**, so a push is publishing to guests.

URL parameters for checking a specific moment:
- `?t=<units>`: jump to a point on the scroll timeline (0 to 13.6, see below), e.g. `?t=6.9` for the date.
- `?p=<0..1>`: jump to a fraction of the whole page.
- `?debug`: turns off the preloader delay, makes scrub instant (`scrub: true`), loads the venue film right away and exposes `window.__seek(t)` / `window.__seekPage(p)`. `?t` and `?p` turn on debug too.
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
When you move a beat, check these and the `?t=` values you test with. The Arabic calligraphy and its halo on page 4 have their own separate ScrollTriggers.

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
- `Scrub` maps the venue film's `currentTime` to scroll progress. Over http(s) it fetches the whole clip as a blob so seeks are instant. On iOS it plays and pauses once on the first `touchstart` so that seeked frames get painted. Until the film is ready, the gate poster cross-fades to the courtyard end poster.
Each `<video>` has `data-land` / `data-port`, and the clip is picked by orientation and reloaded when orientation changes. With reduced motion, data saver or a 2g/3g connection, no video is fetched and only the posters show. Scrub clips need frequent keyframes (short GOP H.264) or seeking stutters.

## Assets
All artwork and films were generated in Higgsfield. The originals live in `assets/raw/`, which is gitignored and not deployed. Portrait (`-port`) and landscape (`-land`) versions exist for the films and their posters. Music is optional: an mp3 at `assets/audio/music.mp3` (`musicUrl`) makes the music button appear.
