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
import { Marquee } from "./Marquee"
import { Nav } from "./Nav"
import { sunlitTokens } from "./tokens"

type Props = {
  /** Display font override for the type trial; defaults to the concept's face. */
  display?: { slug: string; name: string; family: string }
}

export function SunlitPage({ display }: Props) {
  const tokens = display ? { ...sunlitTokens, display: display.family } : sunlitTokens
  return (
    <div data-display={display?.slug} className="contents">
      <ConceptTheme tokens={tokens}>
        <Nav />
        <main>
          <Hero />
          <Marquee />
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
            href="/concepts/sunlit/type"
            className="fixed bottom-4 right-4 z-50 rounded-full bg-ink px-4 py-2 font-sans text-[0.8125rem] font-medium text-bone shadow-lg hover:bg-ink-soft"
          >
            Type: {display.name} · back to the trial
          </Link>
        ) : null}
      </ConceptTheme>
    </div>
  )
}
