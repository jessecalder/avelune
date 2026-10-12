import { Container } from "@/components/ui"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Frame, Label, SectionHead } from "./primitives"

export function EveryAge() {
  const { everyAge: e } = site
  return (
    <section aria-labelledby="nocturne-age-title" className="bg-ink-soft py-28 lg:py-44">
      <Container>
        <div className="mx-auto max-w-[72rem]">
          <SectionHead id="nocturne-age-title" eyebrow={e.eyebrow} headline={e.headline} h2Class="max-w-[16ch]" />
          <blockquote className="reveal mx-auto mt-16 max-w-[30ch] text-center font-display text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.25] text-moon lg:mt-24">
            {e.quote}
          </blockquote>
        </div>

        <ul className="mx-auto mt-24 grid max-w-[1344px] gap-x-8 gap-y-24 md:grid-cols-2 lg:mt-36 xl:grid-cols-5">
          {e.tiers.map((t) => (
            <li key={t.name} className="reveal text-center">
              <Frame photo={photos[t.photo]} aspect="aspect-[3/4]" sizes="(min-width: 1280px) 20vw, (min-width: 768px) 45vw, 100vw" />
              <p className="mt-12 font-display text-[3rem] font-normal leading-none text-moon lining-nums 2xl:text-[3.5rem]">
                {t.range}
              </p>
              <Label as="h3" tone="bone-soft" className="mt-6">
                {t.name}
              </Label>
              <p className="mx-auto mt-5 max-w-[40ch] font-sans text-[1rem] leading-[1.75] text-bone/80 xl:text-[0.9375rem]">
                {t.body}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
