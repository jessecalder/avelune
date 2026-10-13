import Link from "next/link"
import { ConceptTheme } from "@/components/concepts/ConceptTheme"
import { Closing } from "./Closing"
import { Destinations } from "./Destinations"
import { EveryAge } from "./EveryAge"
import { Faq } from "./Faq"
import { FirstSummer } from "./FirstSummer"
import { Footer } from "./Footer"
import { Founding } from "./Founding"
import { Hero } from "./Hero"
import { HowItWorks } from "./HowItWorks"
import { Nav } from "./Nav"
import { tokens } from "./tokens"

type Props = {
  /** Display font override for the type trial; defaults to the concept's face. */
  display?: { slug: string; name: string; family: string }
}

export function MaisonPage({ display }: Props) {
  const themed = display ? { ...tokens, display: display.family } : tokens
  return (
    <div data-display={display?.slug} className="contents">
      <ConceptTheme tokens={themed}>
        <Nav />
        <main>
          <Hero />
          <FirstSummer />
          <Destinations />
          <HowItWorks />
          <EveryAge />
          <Founding />
          <Faq />
          <Closing />
        </main>
        <Footer />
        {display ? (
          <Link
            href="/concepts/maison/type"
            className="fixed bottom-4 right-4 z-50 bg-ink px-4 py-3 font-sans text-[0.75rem] uppercase tracking-[0.2em] text-bone hover:bg-ink-soft"
          >
            Type: {display.name} · back to the trial
          </Link>
        ) : null}
      </ConceptTheme>
    </div>
  )
}
