/** Display-face candidates for the Maison concept. Body stays Jost throughout. */
export const displayOptions = [
  {
    slug: "bodoni-tuned",
    name: "Bodoni Moda, tuned",
    family: "var(--font-bodoni), 'Bodoni Moda', Didot, serif",
    note: "The current face with its hairlines thickened: low optical size, medium weight.",
  },
  {
    slug: "playfair",
    name: "Playfair Display",
    family: "var(--font-playfair), 'Playfair Display', serif",
    note: "The classic high-contrast luxury serif, sturdier than Bodoni. Has italics.",
  },
  {
    slug: "prata",
    name: "Prata",
    family: "var(--font-prata), Prata, serif",
    note: "Didone spirit with readable hairlines. One weight.",
  },
  {
    slug: "marcellus",
    name: "Marcellus",
    family: "var(--font-marcellus), Marcellus, serif",
    note: "Roman inscriptional elegance, the hotel-brand serif. One weight, no italic.",
  },
  {
    slug: "libre-bodoni",
    name: "Libre Bodoni",
    family: "var(--font-libre-bodoni), 'Libre Bodoni', serif",
    note: "A Bodoni drawn for screens, with weights and italics.",
  },
  {
    slug: "newsreader",
    name: "Newsreader",
    family: "var(--font-newsreader), Newsreader, serif",
    note: "Editorial, warm and very readable. Has optical sizes and italics.",
  },
  {
    slug: "cormorant",
    name: "Cormorant",
    family: "var(--font-cormorant-display), Cormorant, serif",
    note: "The garalde classic at a sturdier weight.",
  },
  {
    slug: "dm-serif",
    name: "DM Serif Display",
    family: "var(--font-dm-serif), 'DM Serif Display', serif",
    note: "Sturdy high contrast, modern. One weight with italic.",
  },
] as const

export type DisplaySlug = (typeof displayOptions)[number]["slug"]

export function findDisplayOption(slug: string) {
  return displayOptions.find((o) => o.slug === slug)
}
