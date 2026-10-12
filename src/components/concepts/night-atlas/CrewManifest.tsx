import { Photo } from "@/components/Photo"
import { Container } from "@/components/ui"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { BODY, Bracketed, GRID, H2, Label, SectionLabel, Title } from "./parts"

export function CrewManifest() {
  const { everyAge } = site
  return (
    <section aria-labelledby="every-age-heading" className={`bg-ink py-20 lg:py-32 ${GRID}`}>
      <Container>
        <div className="reveal grid gap-8 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            <SectionLabel>{everyAge.eyebrow}</SectionLabel>
            <h2 id="every-age-heading" className={`${H2} mt-6 text-bone`}>
              <Title text={everyAge.headline} />
            </h2>
          </div>
          <p className={`${BODY} max-w-[52ch] lg:col-span-5 lg:self-end`}>{everyAge.body}</p>
        </div>

        <figure className="reveal mt-16 lg:mt-24">
          <blockquote className="max-w-[28ch] font-display text-[clamp(1.75rem,3.5vw,3rem)] font-semibold uppercase leading-[1.05] text-moon [font-variation-settings:'wdth'_70]">
            {everyAge.quote}
          </blockquote>
        </figure>

        <ol className="mt-16 border-b border-moon/40 lg:mt-24">
          {everyAge.tiers.map((tier) => (
            <li
              key={tier.name}
              className="grid grid-cols-[6rem_1fr] items-center gap-x-5 gap-y-1 border-t border-moon/40 py-8 lg:grid-cols-[6rem_11rem_14rem_1fr] lg:gap-x-8"
            >
              <Bracketed small className="row-span-2 h-24 w-24 lg:row-span-1">
                <Photo photo={photos[tier.photo]} sizes="96px" />
              </Bracketed>
              <p className="self-end font-display text-[2.5rem] font-bold uppercase leading-none text-moon [font-variation-settings:'wdth'_75] lg:self-center">
                {tier.range}
              </p>
              <Label as="h3" className="self-start lg:self-center">
                {tier.name}
              </Label>
              <p className={`${BODY} col-span-2 mt-4 max-w-[62ch] lg:col-span-1 lg:mt-0`}>{tier.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
