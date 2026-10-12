/** Display-face candidates for the Sunlit concept. Body stays Figtree throughout. */
export const displayOptions = [
  {
    slug: "bricolage",
    name: "Bricolage Grotesque",
    family: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
    note: "The current choice. A warm grotesque with optical sizes; its quirks show at display size.",
  },
  {
    slug: "gabarito",
    name: "Gabarito",
    family: "var(--font-gabarito), Gabarito, sans-serif",
    note: "Friendly geometric. Rounder and calmer, very legible on phones.",
  },
  {
    slug: "sora",
    name: "Sora",
    family: "var(--font-sora), Sora, sans-serif",
    note: "Geometric and a touch wide. Clean and contemporary, slightly technical.",
  },
  {
    slug: "familjen-grotesk",
    name: "Familjen Grotesk",
    family: "var(--font-familjen), 'Familjen Grotesk', sans-serif",
    note: "A Scandinavian grotesque with a soft hand. Editorial and warm.",
  },
  {
    slug: "unbounded",
    name: "Unbounded",
    family: "var(--font-unbounded), Unbounded, sans-serif",
    note: "Very wide and bold. Loud, confident, unmistakable.",
  },
  {
    slug: "young-serif",
    name: "Young Serif",
    family: "var(--font-young-serif), 'Young Serif', serif",
    note: "A chunky warm serif in one weight. Storybook charm with grown-up proportions.",
  },
  {
    slug: "gloock",
    name: "Gloock",
    family: "var(--font-gloock), Gloock, serif",
    note: "A high-contrast display serif. The most luxurious of the set, and the least playful.",
  },
  {
    slug: "fraunces-soft",
    name: "Fraunces, soft",
    family: "var(--font-fraunces), Fraunces, serif",
    note: "The current site's serif with its soft and wonky axes turned up.",
  },
] as const

export type DisplaySlug = (typeof displayOptions)[number]["slug"]

export function findDisplayOption(slug: string) {
  return displayOptions.find((o) => o.slug === slug)
}
