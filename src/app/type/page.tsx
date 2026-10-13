import type { Metadata } from "next"
import Link from "next/link"
import { H1_CLASS, Micro } from "@/components/maison/primitives"
import { TypeSpecimen } from "@/components/maison/TypeSpecimen"
import { Container } from "@/components/ui"
import { displayOptions } from "./options"

export const metadata: Metadata = { title: "Type trial" }

export default function TypeTrial() {
  return (
    <main className="min-h-dvh py-16 lg:py-24">
      <Container>
        <Micro>Type trial</Micro>
        <h1 className={`${H1_CLASS} mt-6 max-w-[18ch] text-ink`}>Eight serifs on the same page.</h1>
        <p className="mt-8 max-w-[60ch] font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">
          Everything else is held constant: the ivory ground, the charcoal ink, the champagne accent and the Jost body text. Each
          specimen links to the full Maison page set in that face, which is the real test on a phone.
        </p>
        <ol className="mt-16 space-y-16">
          {displayOptions.map((o, i) => (
            <li key={o.slug}>
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
                <h2 className="font-sans text-[0.8125rem] font-medium uppercase tracking-[0.2em] text-ink">
                  <span className="mr-4 text-stone">{String(i + 1).padStart(2, "0")}</span>
                  {o.name}
                </h2>
                <p className="max-w-[56ch] font-sans text-[0.9375rem] text-stone">{o.note}</p>
                <Link
                  href={`/type/${o.slug}`}
                  className="font-sans text-[0.75rem] font-medium uppercase tracking-[0.2em] text-ink underline decoration-ink/30 underline-offset-8 hover:decoration-ink"
                >
                  Full page in {o.name} →
                </Link>
              </div>
              <TypeSpecimen slug={o.slug} family={o.family} />
            </li>
          ))}
        </ol>
      </Container>
    </main>
  )
}
