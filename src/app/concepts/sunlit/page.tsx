import { ConceptTheme } from "@/components/concepts/ConceptTheme"
import { Closing } from "@/components/concepts/sunlit/Closing"
import { Destinations } from "@/components/concepts/sunlit/Destinations"
import { EveryAge } from "@/components/concepts/sunlit/EveryAge"
import { Faq } from "@/components/concepts/sunlit/Faq"
import { FirstSummer } from "@/components/concepts/sunlit/FirstSummer"
import { Footer } from "@/components/concepts/sunlit/Footer"
import { Founding } from "@/components/concepts/sunlit/Founding"
import { Hero } from "@/components/concepts/sunlit/Hero"
import { HowItWorks } from "@/components/concepts/sunlit/HowItWorks"
import { Marquee } from "@/components/concepts/sunlit/Marquee"
import { Nav } from "@/components/concepts/sunlit/Nav"
import { sunlitTokens } from "@/components/concepts/sunlit/tokens"

export const metadata = { title: "Sunlit · concept" }

export default function SunlitConcept() {
  return (
    <ConceptTheme tokens={sunlitTokens}>
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
    </ConceptTheme>
  )
}
