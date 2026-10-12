import type { Metadata } from "next"
import { ConceptTheme, type ConceptTokens } from "@/components/concepts/ConceptTheme"
import { Closing } from "@/components/concepts/night-atlas/Closing"
import { CrewManifest } from "@/components/concepts/night-atlas/CrewManifest"
import { Dossiers } from "@/components/concepts/night-atlas/Dossiers"
import { FieldNotes } from "@/components/concepts/night-atlas/FieldNotes"
import { FirstEntry } from "@/components/concepts/night-atlas/FirstEntry"
import { NightFooter } from "@/components/concepts/night-atlas/Footer"
import { NightHero } from "@/components/concepts/night-atlas/Hero"
import { NightNav } from "@/components/concepts/night-atlas/Nav"
import { Protocol } from "@/components/concepts/night-atlas/Protocol"
import { TheLog } from "@/components/concepts/night-atlas/TheLog"

export const metadata: Metadata = { title: "Night Atlas · concept" }

const tokens: ConceptTokens = {
  ink: "#0B1020",
  "ink-soft": "#151C30",
  bone: "#EEE8DC",
  "bone-deep": "#DCD4C4",
  moon: "#C9A96E",
  ember: "#E24B3B",
  "ember-deep": "#C23C2E",
  atlantic: "#16213A",
  "atlantic-deep": "#0F172B",
  cacao: "#2A1F1A",
  "cacao-deep": "#1D1512",
  stone: "#8E8778",
  mist: "#2B3247",
  display: "var(--font-archivo), Archivo, sans-serif",
  sans: "var(--font-instrument-sans), 'Instrument Sans', system-ui, sans-serif",
}

export default function NightAtlasPage() {
  return (
    <ConceptTheme tokens={tokens}>
      {/* ConceptTheme's wrapper paints bone; this inner surface keeps the page on midnight. */}
      <div className="overflow-x-clip bg-ink text-bone">
        <NightNav />
        <main id="main">
          <NightHero />
          <TheLog />
          <Dossiers />
          <Protocol />
          <CrewManifest />
          <FirstEntry />
          <FieldNotes />
          <Closing />
        </main>
        <NightFooter />
      </div>
    </ConceptTheme>
  )
}
