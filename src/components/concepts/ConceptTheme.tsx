import type { CSSProperties, ReactNode } from "react"

/**
 * Re-skins everything inside it by overriding the Tailwind theme variables
 * (utilities like bg-ember resolve var(--color-ember) at use site), so shared
 * components such as SignupForm and Container take on a concept's palette and
 * fonts without forking them.
 */
export type ConceptTokens = Partial<
  Record<
    "ink" | "ink-soft" | "bone" | "bone-deep" | "moon" | "ember" | "ember-deep" | "atlantic" | "atlantic-deep" | "cacao" | "cacao-deep" | "stone" | "mist",
    string
  >
> & {
  /** CSS font-family value, e.g. "var(--font-cormorant), Georgia, serif". */
  display?: string
  sans?: string
}

export function ConceptTheme({ tokens, className = "", children }: { tokens: ConceptTokens; className?: string; children: ReactNode }) {
  const style: Record<string, string> = {}
  for (const [key, value] of Object.entries(tokens)) {
    if (!value) continue
    if (key === "display") style["--font-display"] = value
    else if (key === "sans") style["--font-sans"] = value
    else style[`--color-${key}`] = value
  }
  return (
    <div style={style as CSSProperties} className={`font-sans text-ink bg-bone ${className}`}>
      {children}
    </div>
  )
}
