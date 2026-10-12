import type { ReactNode } from "react"
import type { Headline } from "@/content/site"

/** IBM Plex Mono for every label, coordinate, index and date. */
export const MONO = "font-[family-name:var(--font-plex-mono)]"

/** Faint 64px survey grid; sections apply it to their own background. */
export const GRID =
  "[background-image:linear-gradient(rgba(238,232,220,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(238,232,220,.05)_1px,transparent_1px)] [background-size:64px_64px]"

export const H1 =
  "font-display font-bold uppercase text-[clamp(3.5rem,10vw,10rem)] leading-[0.88] tracking-[0.01em] [font-variation-settings:'wdth'_62]"
export const H2 =
  "font-display font-semibold uppercase text-[clamp(2.25rem,5.5vw,5rem)] leading-[0.92] [font-variation-settings:'wdth'_75] text-balance"
export const H3 =
  "font-display font-semibold uppercase text-[1.375rem] leading-[1.1] tracking-[0.02em] [font-variation-settings:'wdth'_80]"
export const BODY = "text-[1.0625rem] leading-[1.6] text-bone/85"

type LabelTag = "p" | "span" | "div" | "h3" | "h4"

/** Mono caps label in brass. */
export function Label({ children, className = "", as: Tag = "p" }: { children: ReactNode; className?: string; as?: LabelTag }) {
  return <Tag className={`${MONO} text-[0.75rem] uppercase leading-[1.5] tracking-[0.12em] text-moon ${className}`}>{children}</Tag>
}

/** Brass rule followed by a mono label; opens a section. */
export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span aria-hidden="true" className="block h-px w-12 shrink-0 bg-moon" />
      <Label>{children}</Label>
    </div>
  )
}

/** Mono index such as "01"; decorative. */
export function Num({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span aria-hidden="true" className={`${MONO} text-[0.75rem] tracking-[0.12em] text-moon ${className}`}>
      {String(n).padStart(2, "0")}
    </span>
  )
}

/** Headline with its accent word in brass (upright, not italic). */
export function Title({ text }: { text: Headline }) {
  return (
    <>
      {text.before}
      {text.accent ? (
        <>
          {" "}
          <span className="text-moon">{text.accent}</span>
          {text.after ? ` ${text.after}` : null}
        </>
      ) : null}
    </>
  )
}

/** Photo frame with four brass corner brackets. Give it a size or aspect ratio via className. */
export function Bracketed({ children, className = "", small = false }: { children: ReactNode; className?: string; small?: boolean }) {
  const frame = small ? "inset-1" : "inset-2.5"
  const arm = small ? "h-2.5 w-2.5" : "h-6 w-6"
  return (
    <div className={`relative overflow-hidden bg-ink-soft ${className}`}>
      {children}
      <span aria-hidden="true" className={`pointer-events-none absolute z-10 ${frame}`}>
        <span className={`absolute left-0 top-0 border-l border-t border-moon ${arm}`} />
        <span className={`absolute right-0 top-0 border-r border-t border-moon ${arm}`} />
        <span className={`absolute bottom-0 left-0 border-b border-l border-moon ${arm}`} />
        <span className={`absolute bottom-0 right-0 border-b border-r border-moon ${arm}`} />
      </span>
    </div>
  )
}

export const delay = (ms: number) => ({ animationDelay: `${ms}ms` })
