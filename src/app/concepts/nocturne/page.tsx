import type { Metadata } from "next"
import { ConceptTheme } from "@/components/concepts/ConceptTheme"
import { Closing } from "@/components/concepts/nocturne/Closing"
import { Destinations } from "@/components/concepts/nocturne/Destinations"
import { EveryAge } from "@/components/concepts/nocturne/EveryAge"
import { Faq } from "@/components/concepts/nocturne/Faq"
import { FirstSummer } from "@/components/concepts/nocturne/FirstSummer"
import { Footer } from "@/components/concepts/nocturne/Footer"
import { Founding } from "@/components/concepts/nocturne/Founding"
import { Hero } from "@/components/concepts/nocturne/Hero"
import { HowItWorks } from "@/components/concepts/nocturne/HowItWorks"
import { Nav } from "@/components/concepts/nocturne/Nav"
import { tokens } from "@/components/concepts/nocturne/tokens"

export const metadata: Metadata = { title: "Nocturne · concept" }

export default function NocturnePage() {
  return (
    <ConceptTheme tokens={tokens}>
      {/* The default focus ring is ember (bronze), too dim on ink; gold reads. */}
      <div className="bg-ink text-bone [&_*:focus-visible]:outline-moon">
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
      </div>
    </ConceptTheme>
  )
}
