/*
  Everything a guest reads comes from this file. Edit the values, save, reload.

  Personal links: add ?to=Name to the address to write a guest's name on the envelope,
  e.g.  https://your-site/index.html?to=Sarah%20%26%20Tom   ->  "For Sarah & Tom"

  Link previews (WhatsApp, iMessage) read the <meta> tags at the top of index.html,
  not this file, so update the names and date there too.
*/
window.INVITE = {
  couple: {
    first: "Aria",
    second: "Rayan",
    initials: ["A", "R"]
  },

  // Written on the envelope when the link has no ?to= name.
  guestDefault: "For you & your family",

  hosts: "Together with their families",
  request: "request the honour of your presence at their wedding",

  // Local time at the venue, 24-hour clock.
  start: "2026-12-12T18:00",
  end: "2026-12-12T23:30",

  venue: {
    lead: "The celebration will be held at",
    name: "Rosewood Palace Gardens",
    address: "Palace Road, Old City",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Rosewood+Palace+Gardens"
  },

  // Shown on the venue card. Leave the list empty to hide it.
  schedule: [
    { time: "6:00 pm", item: "Guests arrive" },
    { time: "7:00 pm", item: "Wedding ceremony" },
    { time: "8:30 pm", item: "Dinner and celebration" }
  ],

  // Last page: a blessing in Arabic calligraphy (\n starts a new line) and its meaning.
  blessing: {
    arabic: "بَارَكَ اللَّهُ لَكُمَا وَبَارَكَ عَلَيْكُمَا\nوَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ",
    translation: "May Allah bless you both, shower His blessings upon you, and unite you in goodness."
  },

  // A note from the couple. Each item is one paragraph.
  message: [
    "Our story began with our families, and it continues with you. Every prayer, every kind word and every shared meal has helped bring us to this day.",
    "As we begin our life together, we ask for your duas for barakah, patience and a home full of mercy, and we would be honoured to celebrate it with you."
  ],
  signoff: "With love,",
  families: "and their families",

  // Optional. Put an .mp3 at this path and a music button appears; otherwise it stays hidden.
  musicUrl: "assets/audio/music.mp3"
};
