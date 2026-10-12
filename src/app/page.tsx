import { Destinations } from "@/components/Destinations"
import { EveryAge } from "@/components/EveryAge"
import { Faq } from "@/components/Faq"
import { FinalCta } from "@/components/FinalCta"
import { FirstSummer } from "@/components/FirstSummer"
import { Footer } from "@/components/Footer"
import { FoundingFamilies } from "@/components/FoundingFamilies"
import { Hero } from "@/components/Hero"
import { HowItWorks } from "@/components/HowItWorks"

export default function Home() {
  return (
    <>
      <main id="main">
        <Hero />
        <FirstSummer />
        <Destinations />
        <HowItWorks />
        <EveryAge />
        <FoundingFamilies />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
