import { Container } from "@/components/ui"
import { site } from "@/content/site"
import { Micro, Wordmark } from "./primitives"

export function Nav() {
  return (
    <header className="border-b border-mist bg-bone">
      <Container>
        <nav aria-label="Primary" className="grid h-24 grid-cols-[1fr_auto_1fr] items-center">
          <Micro tone="stone" className="hidden md:block">
            {site.finalCta.eyebrow}
          </Micro>
          <p className="col-start-2 text-ink">
            <Wordmark />
          </p>
          <a
            href="#founding"
            className="hidden justify-self-end font-sans text-[0.6875rem] font-medium uppercase leading-[1.9] tracking-[0.28em] text-ink underline decoration-transparent decoration-1 underline-offset-[10px] transition-colors hover:decoration-ink md:block"
          >
            {site.hero.cta}
          </a>
        </nav>
      </Container>
    </header>
  )
}
