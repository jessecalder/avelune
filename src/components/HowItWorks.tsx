import { site } from "@/content/site"
import { Container, Eyebrow, HeadlineText, Index, Rule } from "@/components/ui"

export function HowItWorks() {
  const { howItWorks } = site
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="bg-bone py-24 lg:py-40">
      <Container>
        <Rule />
        <Eyebrow className="mt-6">{howItWorks.eyebrow}</Eyebrow>
        <h2
          id="how-heading"
          className="display mt-6 max-w-[18ch] font-semibold text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.98] tracking-[-0.015em] text-ink lg:w-2/3 lg:max-w-none"
        >
          <HeadlineText text={howItWorks.headline} />
        </h2>
        <p className="measure mt-8 text-lg leading-[1.5] text-ink lg:text-xl">{howItWorks.body}</p>
        <ol className="mt-16 grid gap-x-16 gap-y-12 md:grid-cols-2">
          {howItWorks.pillars.map((pillar, i) => (
            <li key={pillar.title} className="reveal">
              <Rule />
              <div className="mt-4 flex items-baseline gap-4">
                <Index n={i + 1} className="text-5xl text-stone" />
              </div>
              <h3 className="mt-3 font-display text-[1.75rem] font-semibold leading-[1.1] text-ink [font-variation-settings:'opsz'_48,'SOFT'_0,'WONK'_0] lg:text-[2rem]">
                {pillar.title}
              </h3>
              <p className="mt-3 max-w-[52ch] text-[1.0625rem] leading-[1.55] text-ink">{pillar.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
