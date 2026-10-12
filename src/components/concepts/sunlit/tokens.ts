import type { ConceptTokens } from "@/components/concepts/ConceptTheme"

/**
 * ember-deep and atlantic-deep are darker than the brief's values so that bone
 * and moon text clear 4.5:1 on them (bone on #A8431F is 5.7:1; bone/70 on
 * #114E58 is 5.2:1). The brighter ember and atlantic stay for fills and large type.
 */
export const sunlitTokens: ConceptTokens = {
  ink: "#1E1B18",
  "ink-soft": "#3B3530",
  bone: "#FFF7EA",
  "bone-deep": "#F6E7CF",
  moon: "#FFE2A8",
  ember: "#D9633B",
  "ember-deep": "#A8431F",
  atlantic: "#1C7C8A",
  "atlantic-deep": "#114E58",
  cacao: "#E9A23B",
  "cacao-deep": "#C98826",
  stone: "#6F665C",
  mist: "#EAD9C0",
  display: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
  sans: "var(--font-figtree), Figtree, system-ui, sans-serif",
}
