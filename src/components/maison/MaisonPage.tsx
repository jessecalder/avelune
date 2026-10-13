import Link from "next/link"
import { ThemeOverride } from "@/components/ThemeOverride"
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

type Props = {
  /** Display font override for the type trial; the site itself passes nothing. */
  display?: { slug: string; name: string; family: string }
}

function Sections() {
  return (
    <>
      <Nav />
      <main id="main">
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
    </>
  )
}

export function MaisonPage({ display }: Props) {
  if (!display) return <Sections />
  return (
    <div data-display={display.slug} className="contents">
      <ThemeOverride tokens={{ display: display.family }}>
        <Sections />
        <Link
          href="/type"
          className="fixed bottom-4 right-4 z-50 bg-ink px-4 py-3 font-sans text-[0.75rem] uppercase tracking-[0.2em] text-bone hover:bg-ink-soft"
        >
          Type: {display.name} · back to the trial
        </Link>
      </ThemeOverride>
    </div>
  )
}
