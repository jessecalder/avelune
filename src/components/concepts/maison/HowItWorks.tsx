import { Container } from "@/components/ui"
import { site } from "@/content/site"
import { Body, H2, Index, Micro, ROMAN, Words } from "./primitives"

export function HowItWorks() {
  const { howItWorks } = site
  return (
    <section aria-labelledby="mm-how-title" className="bg-bone py-28 lg:py-44">
      <Container>
        <div className="reveal text-center">
          <Micro>{howItWorks.eyebrow}</Micro>
          <H2 id="mm-how-title" className="mx-auto mt-8 max-w-[22ch]">
            <Words text={howItWorks.headline} />
          </H2>
          <Body className="mx-auto mt-10 text-center">{howItWorks.body}</Body>
        </div>
        <ol role="list" className="mt-20 grid border-t border-mist md:grid-cols-2 lg:mt-28 lg:grid-cols-4">
          {howItWorks.pillars.map((pillar, i) => (
            <li key={pillar.title} className="border-b border-mist px-2 py-12 text-center lg:border-b-0 lg:border-l lg:px-8 lg:first:border-l-0">
              <Index className="text-[1.5rem] text-stone">{ROMAN[i]}</Index>
              <h3 className="mt-6 font-display text-[1.5rem] font-medium leading-[1.15] text-ink [font-variation-settings:'opsz'_36] lg:text-[1.75rem]">
                {pillar.title}
              </h3>
              <p className="mx-auto mt-5 max-w-[40ch] font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">{pillar.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
