import type { ReactNode } from "react"
import { site, type Headline } from "@/content/site"

export const ROMAN = ["I", "II", "III", "IV", "V"] as const

const MICRO_TONE = {
  stone: "text-stone",
  ink: "text-ink",
  soft: "text-ink-soft",
  moon: "text-moon",
  moon90: "text-moon/90",
  bone70: "text-bone/70",
} as const

/** Class string behind Micro, for labels that must be a different element (label, legend, span). */
export const MICRO_CLASS = "font-sans text-[0.6875rem] font-medium uppercase leading-[1.9] tracking-[0.28em]"

/** Uppercase, widely tracked label: eyebrows, ages, tier names, nav links. */
export function Micro({
  children,
  tone = "stone",
  className = "",
}: {
  children: ReactNode
  tone?: keyof typeof MICRO_TONE
  className?: string
}) {
  return (
    <p className={`${MICRO_CLASS} ${MICRO_TONE[tone]} ${className}`}>
      {children}
    </p>
  )
}

/** Headline text with its single accent word in display-face italic, same colour as the line. */
export function Words({ text }: { text: Headline }) {
  if (!text.accent) return <>{text.before}</>
  return (
    <>
      {text.before} <em className="italic">{text.accent}</em>
      {text.after ? ` ${text.after}` : null}
    </>
  )
}

export const H1_CLASS =
  "font-display font-normal text-[clamp(2.75rem,6.5vw,6.75rem)] leading-[1.02] tracking-[-0.01em] text-balance"

export function H2({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2
      id={id}
      className={`font-display font-normal text-[clamp(2.25rem,4.5vw,4.5rem)] leading-[1.05] text-balance text-ink ${className}`}
    >
      {children}
    </h2>
  )
}

export function Body({ children, tone = "soft", className = "" }: { children: ReactNode; tone?: "soft" | "bone"; className?: string }) {
  return (
    <p className={`max-w-[56ch] font-sans text-[1.0625rem] leading-[1.75] ${tone === "soft" ? "text-ink-soft" : "text-bone/85"} ${className}`}>
      {children}
    </p>
  )
}

/** Lining display numerals; decorative, so callers hide them from assistive tech. */
export const NUMERAL =
  "font-display font-normal leading-none lining-nums"

/** Roman or two-digit index shown beside a title. Always decorative. */
export function Index({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span aria-hidden="true" className={`block font-display font-normal leading-none lining-nums ${className}`}>
      {children}
    </span>
  )
}

/** Type-only wordmark; the crescent mark is never used in this concept. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-medium uppercase text-[1.125rem] tracking-[0.42em] pl-[0.42em] ${className}`}>{site.name}</span>
  )
}

/* Underline fields, square charcoal button. Applied to SignupForm's root via className. */
const FORM_BASE =
  "[&_input]:rounded-none [&_input]:border-x-0 [&_input]:border-t-0 [&_input]:border-b [&_input]:px-0 [&_input]:bg-transparent " +
  "[&_button]:rounded-none [&_button]:font-sans [&_button]:font-medium [&_button]:uppercase [&_button]:tracking-[0.24em] [&_button]:text-[0.6875rem] [&_button]:px-8 " +
  "[&_p]:text-center [&_h2]:text-center"

export const FORM_LIGHT =
  `${FORM_BASE} [&_input]:border-ink/40 [&_input]:text-ink [&_input]:placeholder:text-stone [&_input:focus]:border-ink`

export const FORM_DARK =
  `${FORM_BASE} [&_input]:border-bone/50 [&_input]:text-bone [&_input]:placeholder:text-bone/60 [&_input:focus]:border-bone ` +
  "[&_button]:bg-bone [&_button]:text-ink [&_button:hover]:bg-moon [&_button:focus-visible]:outline-bone"
