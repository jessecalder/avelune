import type { ReactNode } from "react"
import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import type { Photo as PhotoEntry } from "@/content/photos"
import type { Headline } from "@/content/site"

export const ROMAN = ["I", "II", "III", "IV", "V"] as const
export const pad = (n: number) => String(n).padStart(2, "0")

/** Gilda Display has a single weight: never add font-bold/semibold to display text. */
export const H1_SIZE = "font-display font-normal text-[clamp(2.75rem,7vw,7.5rem)] leading-[1.02] tracking-[-0.005em] text-balance"
export const H2_SIZE = "font-display font-normal text-[clamp(2.25rem,4.5vw,4.75rem)] leading-[1.08] text-balance"
export const H3_SIZE = "font-display font-normal text-[1.5rem] lg:text-[1.875rem] leading-[1.2]"
export const NUMERAL = "font-display font-normal text-[4rem] lg:text-[6rem] leading-none text-moon lining-nums"

const LABEL_BASE =
  "font-[family-name:var(--font-josefin)] font-medium uppercase text-[0.6875rem] leading-[1.9] tracking-[0.32em]"

const TONES = {
  moon: "text-moon",
  "moon-soft": "text-moon/80",
  bone: "text-bone",
  "bone-soft": "text-bone/80",
  "bone-faint": "text-bone/60",
  stone: "text-stone",
} as const

export type LabelTone = keyof typeof TONES

/** Art-deco tracked micro-label. Renders a <p> unless `as` says otherwise. */
export function Label({
  children,
  tone = "moon",
  as: Tag = "p",
  className = "",
  ...rest
}: {
  children: ReactNode
  tone?: LabelTone
  as?: "p" | "span" | "h3"
  className?: string
  id?: string
  "aria-hidden"?: boolean | "true"
}) {
  return (
    <Tag className={`${LABEL_BASE} ${TONES[tone]} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

/** Hairline classes for links set as labels. */
export const labelLink = `${LABEL_BASE} text-moon transition-colors hover:text-bone`

/** 1px × 72px vertical hairline. */
export function VRule({ tone = "moon", className = "" }: { tone?: "moon" | "mist"; className?: string }) {
  return <span aria-hidden="true" className={`block h-[72px] w-px ${tone === "moon" ? "bg-moon" : "bg-mist"} ${className}`} />
}

/** Headline text; the accent word is gold, same face (Gilda has no italic). */
export function Words({ text }: { text: Headline }) {
  if (!text.accent) return <>{text.before}</>
  return (
    <>
      {text.before} <span className="text-moon">{text.accent}</span>
      {text.after ? ` ${text.after}` : null}
    </>
  )
}

export function H2({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={`${H2_SIZE} text-bone ${className}`}>
      {children}
    </h2>
  )
}

export function Body({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`max-w-[56ch] font-sans text-[1.0625rem] leading-[1.75] text-bone/85 ${className}`}>{children}</p>
}

/** Centred 72rem column inside the page gutters. */
export function Column({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Container>
      <div className={`mx-auto max-w-[72rem] ${className}`}>{children}</div>
    </Container>
  )
}

/** Eyebrow + H2 (+ optional body), centred. */
export function SectionHead({
  id,
  eyebrow,
  headline,
  body,
  h2Class = "max-w-[22ch]",
}: {
  id: string
  eyebrow: string
  headline: Headline
  body?: string
  h2Class?: string
}) {
  return (
    <div className="reveal text-center">
      <Label>{eyebrow}</Label>
      <H2 id={id} className={`mx-auto mt-8 ${h2Class}`}>
        <Words text={headline} />
      </H2>
      {body ? <Body className="mx-auto mt-10">{body}</Body> : null}
    </div>
  )
}

/**
 * Photograph lit low, with a gold hairline offset outward. The outline reaches
 * 13px past the box, inside the 16px page gutter.
 */
export function Frame({
  photo,
  aspect,
  sizes,
  preload,
  className = "",
}: {
  photo: PhotoEntry
  aspect: string
  sizes: string
  preload?: boolean
  className?: string
}) {
  return (
    <div className={`relative w-full ${aspect} outline outline-1 outline-offset-[12px] outline-moon/50 ${className}`}>
      <Photo photo={photo} sizes={sizes} preload={preload} className="brightness-[.92] saturate-[.85]" />
    </div>
  )
}

/**
 * Signup form restyled by descendant selectors: underline input, ivory square
 * button. Scoped to submit buttons so the enrich form's "Maybe later" link is untouched.
 */
export const FORM_SKIN =
  "[&_input]:rounded-none [&_input]:border-0 [&_input]:border-b [&_input]:border-moon/60 [&_input]:px-0 [&_input]:bg-transparent [&_input]:text-bone [&_input]:placeholder:text-bone/60 [&_input:focus]:border-moon " +
  "[&_button[type=submit]]:rounded-none [&_button[type=submit]]:bg-bone [&_button[type=submit]]:text-ink [&_button[type=submit]:hover]:bg-bone-deep [&_button[type=submit]]:font-[family-name:var(--font-josefin)] [&_button[type=submit]]:font-medium [&_button[type=submit]]:uppercase [&_button[type=submit]]:tracking-[0.28em] [&_button[type=submit]]:text-[0.6875rem] [&_button[type=submit]]:px-8 " +
  "[&_p]:text-center"

/** Scrims that sink a full-bleed photograph into the ink ground. */
export function Dusk({ strong = false }: { strong?: boolean }) {
  return (
    <>
      <div aria-hidden="true" className={`absolute inset-0 ${strong ? "bg-ink/50" : "bg-ink/40"} lg:bg-ink/25`} />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#141210_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-ink from-5% via-ink/85 via-55% to-ink/20"
      />
    </>
  )
}
