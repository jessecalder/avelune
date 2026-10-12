import { Container } from "@/components/ui"
import { site } from "@/content/site"
import { Label } from "./primitives"

export function Nav() {
  return (
    <header className="border-b border-mist">
      <Container>
        <div className="flex h-24 items-center justify-between gap-6">
          <span className="font-display text-[1.125rem] uppercase tracking-[0.36em] text-bone">{site.name}</span>
          <Label className="text-right">{site.finalCta.eyebrow}</Label>
        </div>
      </Container>
    </header>
  )
}
