import Link from "next/link"
import { Container } from "@/components/ui"
import { site } from "@/content/site"
import { MONO } from "./parts"

export function NightNav() {
  return (
    <header className="border-b border-moon/40 bg-ink">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link
          href="/concepts/night-atlas"
          aria-label={`${site.name} home`}
          className="font-display text-[1.125rem] font-bold uppercase tracking-[0.18em] text-bone [font-variation-settings:'wdth'_70]"
        >
          {site.name}
        </Link>
        <p className={`${MONO} hidden text-[0.75rem] uppercase tracking-[0.12em] text-moon md:block`}>
          {site.hero.verticalLabel.join(" · ")}
        </p>
      </Container>
    </header>
  )
}
