import type { Metadata } from "next"
import { ConceptTheme } from "@/components/concepts/ConceptTheme"
import { Closing } from "@/components/concepts/quiet-paper/Closing"
import { Destinations } from "@/components/concepts/quiet-paper/Destinations"
import { EveryAge } from "@/components/concepts/quiet-paper/EveryAge"
import { Faq } from "@/components/concepts/quiet-paper/Faq"
import { FirstSummer } from "@/components/concepts/quiet-paper/FirstSummer"
import { Footer } from "@/components/concepts/quiet-paper/Footer"
import { Founding } from "@/components/concepts/quiet-paper/Founding"
import { Hero } from "@/components/concepts/quiet-paper/Hero"
import { HowItWorks } from "@/components/concepts/quiet-paper/HowItWorks"
import { Nav } from "@/components/concepts/quiet-paper/Nav"
import { tokens } from "@/components/concepts/quiet-paper/tokens"

export const metadata: Metadata = { title: "Quiet Paper · concept" }

export default function QuietPaperPage() {
  return (
    <ConceptTheme tokens={tokens}>
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
    </ConceptTheme>
  )
}
