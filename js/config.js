/*
  Everything a guest reads comes from this file. Edit the values, save, reload.

  Personal links: add ?to=Name to the address to write a guest's name on the envelope,
  e.g.  https://your-site/index.html?to=Sarah%20%26%20Tom   ->  "For Sarah & Tom"
  Guests invited to the Gaye Holud as well get &holud on the end of their link, which adds the `holud` card below.

  Link previews (WhatsApp, iMessage) read the <meta> tags at the top of index.html,
  not this file, so update the names and date there too.
*/
window.INVITE = {
  couple: {
    // first names: seal, card, signature; full names: the invitation page
    first: "Wahid",
    second: "Anushka",
    firstFull: "Wahid Sanjan",
    secondFull: "Anushka Shahreen",
    initials: ["W", "A"]
  },

  // Written on the envelope when the link has no ?to= name.
  guestDefault: "For you & your family",

  hosts: "Together with their families",
  request: "request the honour of your presence at their wedding",

  // Local time at the venue, 24-hour clock
  start: "2026-12-27T19:00",
  end: "2026-12-27T23:00",
  // Bangladesh time, so the countdown and calendar are right for guests anywhere
  utcOffset: "+06:00",

  venue: {
    lead: "The celebration will be held at",
    name: "BAF Shaheen Hall",
    address: "Airport Road, beside Jahangir Gate, Dhaka Cantonment, Dhaka 1206",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=BAF+Shaheen+Hall%2C+Airport+Road%2C+Dhaka+Cantonment%2C+Dhaka"
  },

  // Shown on the venue card. Leave the list empty to hide it.
  // e.g. { time: "7:00 pm", item: "Dinner" }
  schedule: [],

  // Last page: a verse in Arabic calligraphy (\n starts a new line), its meaning and where it is from.
  blessing: {
    arabic: "وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً",
    translation: "And He placed between you affection and mercy.",
    source: "Surah Ar-Rum, 30:21",
    // The same verse hand-lettered, written in over an illuminated panel: one image per line, all the same size.
    // If you change `arabic`, empty `lettered` so the new text is shown instead.
    lettered: ["assets/img/ayah.webp"],
    panel: "assets/img/ayah-panel.webp"
  },

  // A note from the couple. Each item is one paragraph.
  message: [
    "Our story began in 2013, and it continues with you. Every prayer, every kind word and every shared meal has helped bring us to this day.",
    "As we begin our life together, we ask for your duas for barakah, patience and a home full of mercy, and we would be honoured to celebrate it with you."
  ],
  signoff: "With love,",
  families: "and their families",
  // Only on personal links (?to=): {name} is the guest's name.
  guestLine: "We hope to see you there, {name}.",

  // Only on links ending in &holud: a turmeric card at the very end that opens the holud invitation, with the guest's
  // name. "bangla" is set in the holud page's Galada face. Keep `when` and `where` in step with holud/js/config.js.
  holud: {
    lead: "You are also invited to our",
    bangla: "গায়ে হলুদ",
    name: "Gaye Holud",
    when: "Thursday 24 December 2026, 7 pm",
    where: "Shimanto Convention Centre, Dhaka",
    label: "Open the Gaye Holud invitation",
    url: "holud/"
  },

  // Music, ambience and sound effects (the files are in assets/audio, the timings in js/main.js).
  // Guests choose "Open with sound" or "Open without sound" when the page has loaded. false turns all sound off.
  sound: true
};
