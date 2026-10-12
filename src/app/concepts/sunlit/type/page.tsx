import type { Metadata } from "next"
import Link from "next/link"
import { ConceptTheme } from "@/components/concepts/ConceptTheme"
import { TypeSpecimen } from "@/components/concepts/sunlit/TypeSpecimen"
import { sunlitTokens } from "@/components/concepts/sunlit/tokens"
import { Container } from "@/components/ui"
import { displayOptions } from "./options"

export const metadata: Metadata = { title: "Sunlit · type trial" }

export default function SunlitTypeTrial() {
  return (
    <ConceptTheme tokens={sunlitTokens}>
      <main className="min-h-dvh py-14 lg:py-20">
        <Container>
          <p className="font-sans text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-ember">Sunlit · type trial</p>
          <h1 className="mt-4 max-w-[20ch] font-display text-[clamp(2.25rem,5vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-ink">
            Eight display faces on the same layout.
          </h1>
          <p className="mt-5 max-w-[60ch] text-[1.0625rem] leading-[1.6] text-ink-soft">
            Everything else is held constant: colours, shapes, photographs and the Figtree body text. Each specimen links to the full
            Sunlit page set in that face, which is the real test on a phone.
          </p>
          <ol className="mt-12 space-y-12">
            {displayOptions.map((o, i) => (
              <li key={o.slug}>
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <h2 className="font-sans text-[1.125rem] font-semibold text-ink">
                    <span className="mr-3 text-stone">{String(i + 1).padStart(2, "0")}</span>
                    {o.name}
                  </h2>
                  <p className="max-w-[56ch] font-sans text-[0.9375rem] text-stone">{o.note}</p>
                  <Link
                    href={`/concepts/sunlit/type/${o.slug}`}
                    className="font-sans text-[0.9375rem] font-semibold text-ember underline-offset-4 hover:underline"
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
    </ConceptTheme>
  )
}
