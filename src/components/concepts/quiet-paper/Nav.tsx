import { Container } from "@/components/ui"
import { site } from "@/content/site"

export function Nav() {
  return (
    <header className="border-b border-mist">
      <Container>
        <div className="flex h-16 items-center justify-center lg:h-20">
          <span className="font-display text-[1.375rem] font-normal tracking-[0.04em] text-ink">{site.name}</span>
        </div>
      </Container>
    </header>
  )
}
