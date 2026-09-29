# Wedding invitation

A scroll-animated invitation: a sealed envelope opens, the invitation unfolds inside a palace arch,
the arch becomes a doorway into a film of the venue, and the page ends on a light ivory page with a
blessing in Arabic calligraphy and a note from the couple.

## Change the details
Edit `js/config.js`: names, initials, date and time, venue, schedule, the Arabic blessing and its
meaning, and the note from the couple (`message`, one entry per paragraph).
The weekday, "six o'clock in the evening", the countdown and the calendar file are all worked out from `start`.

Link previews (WhatsApp, iMessage) read the `<meta>` tags at the top of `index.html`, so update the
names and date there too.

Live site: https://ssanjan123.github.io/wedding-invitation/ (GitHub Pages). Any change pushed to the
`main` branch goes live within a minute or two.

## The holud invitation
A separate invitation for the Gaye Holud is in the `holud/` folder and lives at
https://ssanjan123.github.io/wedding-invitation/holud/. A painted kula holds a card tied with red-and-yellow
thread; a swipe of turmeric paste writes the names; a palm drawn in henna lines holds the date; a curtain of
marigold strings parts onto the holud stage; the last page asks guests to come dressed in holud and links to the
wedding invitation. Guests can tap the swipe page to leave a dab of holud. When it loads, guests choose
"Open with sound" or "Open quietly": with sound, a dhol-and-flute tune, the room, the thread, the turmeric swipe,
the marigold curtain and a cheer from the hall follow the story (`sound: false` in `holud/js/config.js` turns it off).

Edit its wording in `holud/js/config.js`, and its link-preview tags at the top of `holud/index.html`.
`?to=` works the same way there (the name goes on the tray's tag). The wedding page does not link to it,
so share the holud link only with holud guests.

## Personal links
Add `?to=` to the address to write a guest's name on the envelope:
`https://your-site/index.html?to=Sarah%20%26%20Tom` shows "For Sarah & Tom".

## Sound
When the invitation has loaded, guests choose **Open with sound** or **Open quietly**. With sound on, music
plays and rises and dips with the story, the venue film gets a fountain in the background, and small sounds
mark the moments (the wax seal cracking, the flap, the card, the names, the date, the doorway). A round button
in the corner turns sound on and off. To switch it off entirely, set `sound: false` in `js/config.js`.
The sound files are in `assets/audio`.

## Put it online
Upload the whole folder to any static host, for example Netlify Drop (drag the folder onto
app.netlify.com/drop), GitHub Pages or Vercel. The films play best from a real web address.
Opening `index.html` straight from your computer also works.

## Preview on your computer
In this folder run `python -m http.server 8080`, then open http://localhost:8080.

## What is where
- `index.html`: page structure
- `css/style.css`: all styling
- `js/main.js`: the scroll story, countdown, calendar file, petals and gold dust
- `js/media.js`: the films (portrait versions for phones, skipped for reduced motion or data saver)
- `js/sound.js`: the sound (music, background sound and moment sounds, shared with the holud page)
- `assets/img`, `assets/film`: artwork and films generated in Higgsfield (`assets/raw` keeps the originals and can be left out when uploading)
