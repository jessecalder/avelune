import type { CSSProperties, ReactNode } from "react"

/**
 * Overrides theme variables for everything inside it (utilities like
 * font-display resolve var(--font-display) at the use site), so shared
 * components take on a different face without forking them. Only the type
 * trial uses it, to swap the display face.
 */
export type ThemeOverrides = Partial<
  Record<
    "ink" | "ink-soft" | "bone" | "bone-deep" | "moon" | "ember" | "ember-deep" | "atlantic" | "atlantic-deep" | "cacao" | "cacao-deep" | "stone" | "mist",
    string
  >
> & {
  /** CSS font-family value, e.g. "var(--font-prata), Prata, serif". */
  display?: string
  sans?: string
}

export function ThemeOverride({ tokens, className = "", children }: { tokens: ThemeOverrides; className?: string; children: ReactNode }) {
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
