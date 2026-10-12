import { Photo } from "@/components/Photo"
import { Container } from "@/components/ui"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { BODY, Bracketed, GRID, H2, Label, MONO, Num, SectionLabel, Title } from "./parts"

export function TheLog() {
  const { firstSummer } = site
  return (
    <section aria-labelledby="first-summer-heading" className={`bg-ink py-20 lg:py-32 ${GRID}`}>
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-x-12">
          <div className="reveal lg:col-span-7">
            <SectionLabel>{firstSummer.eyebrow}</SectionLabel>
            <h2 id="first-summer-heading" className={`${H2} mt-6 text-bone`}>
              <Title text={firstSummer.headline} />
            </h2>
            <p className={`${BODY} mt-8 max-w-[58ch]`}>{firstSummer.body}</p>
          </div>
          <div className="lg:col-span-5">
            <Bracketed className="aspect-[4/5]">
              <Photo photo={photos[firstSummer.photo]} sizes="(min-width: 1024px) 40vw, 100vw" />
            </Bracketed>
          </div>
        </div>

        <dl className="mt-16 grid grid-cols-3 border border-moon/40 bg-ink lg:mt-24">
          {firstSummer.stats.map((stat) => (
            <div key={stat.label} className="border-l border-moon/40 p-3 first:border-l-0 sm:p-6">
              <dt className={`${MONO} text-[0.75rem] uppercase tracking-[0.12em] text-moon [overflow-wrap:anywhere]`}>{stat.label}</dt>
              <dd className="mt-3 font-display text-[2.25rem] font-bold leading-none text-moon [font-variation-settings:'wdth'_75] sm:text-[3rem]">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        <ol className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-3">
          {firstSummer.rhythm.map((entry, i) => (
            <li key={entry.title} className="reveal border-t border-moon/40 pt-5">
              <div className="flex items-baseline justify-between gap-4">
                <Label as="h3">{entry.title}</Label>
                <Num n={i + 1} />
              </div>
              <p className={`${BODY} mt-4`}>{entry.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
