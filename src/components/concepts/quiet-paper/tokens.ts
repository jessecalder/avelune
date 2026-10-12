import type { ConceptTokens } from "@/components/concepts/ConceptTheme"

/**
 * stone is #6A645B here, not the brief's #7C766D: the lighter value is 4.06:1 on
 * paper, which fails for the captions and the signup microcopy that use it.
 */
export const tokens: ConceptTokens = {
  ink: "#1C1B19",
  "ink-soft": "#3A3733",
  bone: "#F7F3EC",
  "bone-deep": "#EFE9DE",
  moon: "#D9CDB8",
  ember: "#2F4A3C",
  "ember-deep": "#243B30",
  atlantic: "#52685D",
  "atlantic-deep": "#44564D",
  cacao: "#6E5A4C",
  "cacao-deep": "#5A4A3E",
  stone: "#6A645B",
  mist: "#E6E0D5",
  display: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
  sans: "var(--font-inter), Inter, system-ui, sans-serif",
}
