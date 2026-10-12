import type { ReactNode } from "react"
import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import type { Photo as PhotoEntry } from "@/content/photos"
import type { Headline } from "@/content/site"

export const ROMAN = ["I", "II", "III", "IV", "V"] as const

/** Centred 72rem column inside the page gutters. */
export function Column({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Container>
      <div className={`mx-auto max-w-[72rem] ${className}`}>{children}</div>
    </Container>
  )
}

export function Kicker({ children, tone = "ember", className = "" }: { children: ReactNode; tone?: "ember" | "bone" | "moon"; className?: string }) {
  const color = tone === "ember" ? "text-ember" : tone === "moon" ? "text-moon" : "text-bone"
  return (
    <p className={`font-sans text-[0.7rem] font-medium uppercase leading-[1.8] tracking-[0.22em] ${color} ${className}`}>{children}</p>
  )
}

/** Headline text with its single accent word in Cormorant italic. */
export function Words({ text, accentClass = "" }: { text: Headline; accentClass?: string }) {
  if (!text.accent) return <>{text.before}</>
  return (
    <>
      {text.before} <em className={`italic ${accentClass}`}>{text.accent}</em>
      {text.after ? ` ${text.after}` : null}
    </>
  )
}

export function H2({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2
      id={id}
      className={`font-display font-normal text-[length:clamp(2.25rem,4.5vw,4.5rem)] leading-[1.05] tracking-[-0.005em] text-balance text-ink ${className}`}
    >
      {children}
    </h2>
  )
}

export function Body({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`max-w-[60ch] text-[1rem] leading-[1.7] text-ink-soft ${className}`}>{children}</p>
}

type FramedProps = {
  photo: PhotoEntry
  /** Full Tailwind aspect class, e.g. "aspect-[3/2]". */
  aspect: string
  sizes: string
  surface?: "paper" | "chapter" | "ink"
  /** Thin mat around the image. */
  mat?: boolean
  preload?: boolean
  className?: string
}

/**
 * A photograph sitting inside the column with a caption beneath. The caption
 * is the photo's alt text, so the image itself is hidden from assistive tech
 * rather than announced twice.
 */
export function Framed({ photo, aspect, sizes, surface = "paper", mat = true, preload, className = "" }: FramedProps) {
  const matCls = !mat ? "" : surface === "paper" ? "border border-mist p-2 sm:p-3" : "border border-bone/25 p-2 sm:p-3"
  const captionCls =
    surface === "paper" ? "text-stone" : surface === "chapter" ? "text-bone/90" : "text-moon/70"
  return (
    <figure className={className}>
      <div aria-hidden="true" className={matCls}>
        <div className={`relative w-full overflow-hidden ${aspect}`}>
          <Photo photo={photo} sizes={sizes} preload={preload} />
        </div>
      </div>
      <figcaption className={`mt-3 font-display text-[1rem] italic leading-[1.4] ${captionCls}`}>{photo.alt}</figcaption>
    </figure>
  )
}
