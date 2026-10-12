import type { Metadata } from "next"
import { ConceptTheme } from "@/components/concepts/ConceptTheme"
import { Closing } from "@/components/concepts/maison/Closing"
import { Destinations } from "@/components/concepts/maison/Destinations"
import { EveryAge } from "@/components/concepts/maison/EveryAge"
import { Faq } from "@/components/concepts/maison/Faq"
import { FirstSummer } from "@/components/concepts/maison/FirstSummer"
import { Footer } from "@/components/concepts/maison/Footer"
import { Founding } from "@/components/concepts/maison/Founding"
import { Hero } from "@/components/concepts/maison/Hero"
import { HowItWorks } from "@/components/concepts/maison/HowItWorks"
import { Nav } from "@/components/concepts/maison/Nav"
import { tokens } from "@/components/concepts/maison/tokens"

export const metadata: Metadata = { title: "Maison · concept" }

export default function MaisonPage() {
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
