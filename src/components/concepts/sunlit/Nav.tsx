import { site } from "@/content/site"
import { Container } from "@/components/ui"

export function Nav() {
  return (
    <header className="bg-bone">
      <Container className="flex h-20 items-center justify-between">
        <p className="font-display text-[1.5rem] font-extrabold leading-none tracking-[-0.02em] text-ink [font-variation-settings:'opsz'_36,'wdth'_100]">
          {site.name.toLowerCase()}
        </p>
        <p className="rounded-full bg-cacao px-4 py-2 font-sans text-[0.8125rem] font-semibold text-ink">{site.finalCta.eyebrow}</p>
      </Container>
    </header>
  )
}
