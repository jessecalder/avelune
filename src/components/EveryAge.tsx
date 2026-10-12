import { site } from "@/content/site"
import { photos } from "@/content/photos"
import { Container, Eyebrow, HeadlineText, Numeral } from "@/components/ui"
import { Photo } from "@/components/Photo"

export function EveryAge() {
  const { everyAge } = site
  return (
    <section id="every-age" aria-labelledby="ages-heading" className="bg-ink py-24 text-bone lg:py-36">
      <Container>
        <Eyebrow tone="moon">{everyAge.eyebrow}</Eyebrow>
        <h2
          id="ages-heading"
          className="display mt-6 max-w-[16ch] font-semibold text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.98] tracking-[-0.015em] text-bone"
        >
          <HeadlineText text={everyAge.headline} />
        </h2>
        <p className="measure mt-8 text-lg leading-[1.5] text-bone/85 lg:text-xl">{everyAge.body}</p>

        <blockquote className="reveal my-16 max-w-[28ch] font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold italic leading-[1.05] text-moon [font-variation-settings:'opsz'_144,'SOFT'_30,'WONK'_1] lg:my-24">
          <p>{everyAge.quote}</p>
        </blockquote>

        <ul
          tabIndex={0}
          aria-label="Age tiers"
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0"
        >
          {everyAge.tiers.map((tier) => (
            <li
              key={tier.name}
              className="reveal w-[78vw] shrink-0 snap-start border-t-2 border-moon pt-6 sm:w-[20rem] lg:w-auto"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <Photo photo={photos[tier.photo]} sizes="(min-width:1024px) 18vw, 78vw" />
              </div>
              {/\d/.test(tier.range) ? (
                <Numeral className="mt-6 block text-5xl text-moon lg:text-[3.25rem]">{tier.range}</Numeral>
              ) : (
                <span className="mt-6 block font-display text-5xl font-semibold text-moon [font-variation-settings:'opsz'_144,'SOFT'_0,'WONK'_0] lg:text-[3.25rem]">
                  {tier.range}
                </span>
              )}
              <h3 className="eyebrow mt-3 text-bone">{tier.name}</h3>
              <p className="mt-4 text-base leading-[1.5] text-bone/85">{tier.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
