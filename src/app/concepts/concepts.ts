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
  {
    slug: "maison",
    name: "Maison",
    blurb: "Couture ivory. Bodoni Moda and Jost, centred compositions, hairlines, one champagne accent. Cheval Blanc at a whisper.",
  },
  {
    slug: "nocturne",
    name: "Nocturne",
    blurb: "A private club after dark. Gilda Display on near-black, gold hairlines, deco-tracked labels, photographs lit like candlelight.",
  },
] as const

export type ConceptSlug = (typeof concepts)[number]["slug"]
