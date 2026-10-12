import type { ReactNode } from "react"
import type { Headline } from "@/content/site"

/** Page gutter + max width. Sections wrap their content in this. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-12 ${className}`}>{children}</div>
}

/** Small caps label. `tone` picks the colour for the surface it sits on. */
export function Eyebrow({ children, tone = "ember", className = "" }: { children: ReactNode; tone?: "ember" | "moon" | "stone"; className?: string }) {
  const color = tone === "ember" ? "text-ember" : tone === "moon" ? "text-moon" : "text-stone"
  return <p className={`eyebrow ${color} ${className}`}>{children}</p>
}

/** The 2px × 48px hairline that opens a block. */
export function Rule({ tone = "ember", className = "" }: { tone?: "ember" | "moon"; className?: string }) {
  return <span aria-hidden="true" className={`block h-[2px] w-12 ${tone === "ember" ? "bg-ember" : "bg-moon"} ${className}`} />
}

/** Renders a headline with its single italic accent word. */
export function HeadlineText({ text, accentClass = "" }: { text: Headline; accentClass?: string }) {
  if (!text.accent) return <>{text.before}</>
  return (
    <>
      {text.before} <em className={`display-italic ${accentClass}`}>{text.accent}</em>
      {text.after ? ` ${text.after}` : null}
    </>
  )
}

/** Large Fraunces numeral with lining figures (Fraunces defaults to oldstyle). */
export function Numeral({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-display font-semibold lining-nums tabular-nums [font-variation-settings:'opsz'_144,'SOFT'_0,'WONK'_0] ${className}`}>
      {children}
    </span>
  )
}

/** Two-digit index like "01". */
export function Index({ n, className = "" }: { n: number; className?: string }) {
  return <Numeral className={className}>{String(n).padStart(2, "0")}</Numeral>
}
