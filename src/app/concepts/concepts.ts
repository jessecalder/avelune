export const concepts = [
  {
    slug: "quiet-paper",
    name: "Quiet Paper",
    blurb: "Gallery calm. Cormorant on warm paper, photographs framed by margins, one deep green. Aman at a whisper.",
  },
  {
    slug: "sunlit",
    name: "Sunlit",
    blurb: "Joyful modern luxury. Bricolage Grotesque, ochre and sea and terracotta blocks, rounded forms, big numerals.",
  },
  {
    slug: "night-atlas",
    name: "Night Atlas",
    blurb: "Expedition dossier. Condensed uppercase Archivo, mono coordinates, a midnight ground and brass, itineraries as a log.",
  },
] as const

export type ConceptSlug = (typeof concepts)[number]["slug"]
