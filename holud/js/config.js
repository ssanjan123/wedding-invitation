/*
  Everything a guest reads on the holud invitation comes from this file. Edit the values, save, reload.

  Personal links: add ?to=Name to the address to write a guest's name on the tray's tag,
  e.g.  https://your-site/holud/?to=Sarah%20%26%20Tom   ->  "For Sarah & Tom"

  Link previews (WhatsApp, iMessage) read the <meta> tags at the top of holud/index.html,
  not this file, so update the names and date there too.
*/
window.INVITE = {
  couple: {
    first: "Wahid",
    second: "Anushka",
    firstFull: "Wahid Sanjan",
    secondFull: "Anushka Shahreen",
    initials: ["W", "A"]
  },

  // Written on the tag when the link has no ?to= name.
  guestDefault: "For you & your family",

  // Page 2: the swipe of holud. "bangla" is set in the Galada display face.
  event: {
    bangla: "গায়ে হলুদ",
    name: "Gaye Holud"
  },
  hosts: "Our two families invite you to the",
  of: "of",
  request: "an evening of holud, mehedi, music and a great deal of dancing",
  tapHint: "Tap anywhere to add a little holud",

  // Local time at the venue, 24-hour clock
  start: "2026-12-24T19:00",
  end: "2026-12-24T23:00",
  // Bangladesh time, so the countdown and calendar are right for guests anywhere
  utcOffset: "+06:00",

  // Page 3: the date is written in the mehedi. Leave `hidden` empty to drop the little game.
  mehedi: {
    hidden: "Wahid",
    hint: "Brides hide the groom’s name in their mehedi. Can you find it?",
    found: "Found him!"
  },

  venue: {
    lead: "The holud will be held at",
    name: "BGB Banquet Hall",
    address: "Shimanto Shambhar, 4th floor, Road 2, Dhanmondi, Dhaka 1205",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=BGB+Banquet+Hall%2C+Shimanto+Shambhar%2C+Road+2%2C+Dhanmondi%2C+Dhaka"
  },

  // Shown on the venue card. Leave the list empty to hide it.
  // e.g. { time: "7:00 pm", item: "Holud" }
  schedule: [],

  // Last page
  dress: {
    bangla: "হলুদ",
    title: "Come dressed in holud",
    note: "Yellow, marigold or green. The brighter, the better.",
    swatches: ["Holud", "Genda", "Kolapata"]
  },

  // A note from the couple. Each item is one paragraph.
  message: [
    "Before the vows and the formal photographs, there is holud: turmeric on our cheeks, sweets we did not ask for, and every aunt, cousin and friend singing a little too loudly.",
    "It would not be the same without you. Come hungry, come in yellow, and come ready to dance."
  ],
  signoff: "With love and a little turmeric,",
  families: "and their families",

  // The link at the very end. Leave `url` empty to hide it.
  wedding: {
    lead: "Three evenings later, we marry",
    when: "Sunday 27 December",
    label: "See the wedding invitation",
    url: "../"
  },

  // Optional. Put an .mp3 at this path and a music button appears; otherwise it stays hidden.
  musicUrl: "assets/audio/music.mp3"
};
