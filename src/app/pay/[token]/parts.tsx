import type { ReactNode } from "react"
import { Photo } from "@/components/Photo"
import { MICRO_CLASS, NUMERAL } from "@/components/maison/primitives"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import type { Departure } from "@/db/schema"
import { splitMoney } from "../format"

/** Narrow receipt column under the full-bleed photograph. */
export const PAY_COLUMN_CLASS = "mx-auto w-full max-w-[34rem] px-4 sm:px-6"

/* One height for the band and its loading placeholder, so nothing moves when the page streams in. */
const BAND_CLASS = "relative h-[40svh] min-h-[18rem] max-h-[34rem] overflow-hidden bg-atlantic sm:h-[44svh] sm:min-h-[24rem]"

/* The scrim is tied to the text block, not the photograph: it is at least 78% charcoal behind every
 * line of text and fades out over the top 4rem of the block's padding. Bone text on the brightest
 * possible pixel (white) under 78% charcoal measures about 7.5:1. */
const SCRIM_CLASS =
  "bg-[linear-gradient(to_top,rgb(26_26_26/0.9)_0,rgb(26_26_26/0.78)_calc(100%_-_4rem),rgb(26_26_26/0)_100%)]"

function BandPhoto({ journey }: { journey: Departure["journey"] }) {
  // The same photographs the destination chapters use on the home page.
  return (
    <div aria-hidden="true" className="absolute inset-0 animate-settle">
      {journey === "san-sebastian" ? (
        <Photo photo={photos.conchaAerial} preload sizes="100vw" />
      ) : (
        <>
          <div className="absolute inset-0 md:hidden">
            <Photo photo={photos.arcoVolcan} sizes="100vw" />
          </div>
          <div className="absolute inset-0 hidden md:block">
            <Photo photo={photos.antiguaStreetVolcano} sizes="100vw" />
          </div>
        </>
      )}
    </div>
  )
}

/** The photograph with the eyebrow, title and place in bone over a bottom scrim. */
export function Band({
  journey,
  eyebrow,
  title,
  subtitle,
}: {
  journey: Departure["journey"]
  eyebrow: string
  title: string
  subtitle?: string
}) {
  return (
    <section aria-labelledby="pay-title" className={BAND_CLASS}>
      <BandPhoto journey={journey} />
      <div className={`absolute inset-x-0 bottom-0 px-4 pb-8 pt-20 sm:px-6 sm:pb-12 ${SCRIM_CLASS}`}>
        <div className="animate-rise flex flex-col items-center text-center text-bone [text-shadow:0_1px_2px_rgb(0_0_0/0.3),0_0_30px_rgb(0_0_0/0.35)]">
          <p className={`${MICRO_CLASS} pl-[0.28em]`}>{eyebrow}</p>
          <h1
            id="pay-title"
            className="mt-4 max-w-[16ch] font-display text-[clamp(2.5rem,5vw,4rem)] sm:max-w-[28ch] font-normal leading-[1.04] tracking-[-0.01em] text-balance"
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 font-display text-[clamp(1.25rem,2.2vw,1.625rem)] italic leading-[1.2]">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/** What shows while the link is looked up: the band's footprint and the receipt's hairlines, no words. */
export function PayFallback() {
  return (
    <div aria-hidden="true">
      <div className={BAND_CLASS} />
      <div className={`${PAY_COLUMN_CLASS} pb-16 pt-10 sm:pb-24 sm:pt-14`}>
        <div className="border-t border-ink/40">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-14 border-b border-mist" />
          ))}
        </div>
      </div>
    </div>
  )
}

export type ReceiptRow = { label: string; value: string }

/** Hairline rows, a micro label on the left and the value on the right. */
export function Receipt({ rows }: { rows: ReceiptRow[] }) {
  return (
    <dl className="border-t border-ink">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-6 border-b border-mist py-3 sm:py-3.5">
          <dt className={`${MICRO_CLASS} shrink-0 text-stone`}>{row.label}</dt>
          <dd className="min-w-0 text-right font-sans text-[1rem] leading-[1.5] text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The total, in large lining numerals with the cents set smaller; closes the receipt with a rule. */
export function Amount({ label, text }: { label: string; text: string }) {
  const { whole, cents } = splitMoney(text)
  // Twenty million with cents is the ceiling; keep it inside a 390 px screen.
  const size = text.length > 11 ? "text-[clamp(2rem,9.5vw,3.5rem)]" : "text-[clamp(3rem,14vw,4.5rem)]"
  return (
    <div className="border-b border-ink py-8 text-center sm:py-10">
      <p className={`${MICRO_CLASS} text-stone`}>{label}</p>
      <p className={`${NUMERAL} mt-3 text-ink ${size}`}>
        {whole}
        {cents ? <span className="text-[0.5em]">{cents}</span> : null}
      </p>
    </div>
  )
}

export function SmallPrint({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-sans text-[0.8125rem] leading-[1.6] text-stone ${className}`}>{children}</p>
}

/** "Questions about this payment? Write to hello@…" */
export function Questions() {
  return (
    <SmallPrint>
      {site.pay.questions}{" "}
      <a href={`mailto:${site.contactEmail}`} className="text-ink underline underline-offset-4">
        {site.contactEmail}
      </a>
    </SmallPrint>
  )
}

/** Plain paragraph above the receipt in the states that explain something. */
export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mx-auto mb-10 max-w-[40ch] text-balance text-center font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">
      {children}
    </p>
  )
}

/** Quiet hairline-framed note, for "no charge was made" and "we are confirming". */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="border border-mist px-4 py-3 text-center font-sans text-[0.9375rem] leading-[1.6] text-ink-soft">
      {children}
    </p>
  )
}
