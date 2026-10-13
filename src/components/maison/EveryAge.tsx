import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Body, H2, Micro, NUMERAL, Words } from "./primitives"

export function EveryAge() {
  const { everyAge } = site
  return (
    <section aria-labelledby="mm-age-title" className="bg-bone-deep py-28 lg:py-44">
      <Container>
        <div className="reveal text-center">
          <Micro tone="soft">{everyAge.eyebrow}</Micro>
          <H2 id="mm-age-title" className="mx-auto mt-8 max-w-[22ch]">
            <Words text={everyAge.headline} />
          </H2>
          <Body className="mx-auto mt-10 text-center">{everyAge.body}</Body>
          <blockquote className="mx-auto mt-16 max-w-[32ch] font-display text-[clamp(1.75rem,3.5vw,3rem)] italic leading-[1.2] text-ink lg:mt-24">
            {everyAge.quote}
          </blockquote>
        </div>

        <ol role="list" className="mx-auto mt-20 max-w-[72rem] lg:mt-28">
          {everyAge.tiers.map((tier) => {
            const numeric = /\d/.test(tier.range)
            return (
              <li
                key={tier.name}
                className="grid gap-6 border-t border-mist py-10 last:border-b lg:grid-cols-[12rem_1fr_2fr_10rem] lg:items-center lg:gap-x-10 lg:py-12"
              >
                <p
                  className={
                    numeric
                      ? `${NUMERAL} text-[3rem] text-ink lg:text-[4rem]`
                      : "font-display text-[1.75rem] italic leading-none text-ink"
                  }
                >
                  {tier.range}
                </p>
                <h3 className="font-sans text-[0.6875rem] font-medium uppercase leading-[1.9] tracking-[0.28em] text-ink">{tier.name}</h3>
                <p className="max-w-[56ch] font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">{tier.body}</p>
                <div className="relative size-40 overflow-hidden lg:justify-self-end">
                  <Photo photo={photos[tier.photo]} sizes="160px" className="grayscale-[.3] saturate-[.8]" />
                </div>
              </li>
            )
          })}
        </ol>
      </Container>
    </section>
  )
}
