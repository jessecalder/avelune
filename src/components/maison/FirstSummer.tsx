import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Body, H2, Index, Micro, NUMERAL, ROMAN, Words } from "./primitives"

export function FirstSummer() {
  const { firstSummer } = site
  return (
    <section aria-labelledby="mm-summer-title" className="bg-bone">
      <div className="py-28 lg:py-44">
        <Container>
          <div className="reveal text-center">
            <Micro>{firstSummer.eyebrow}</Micro>
            <H2 id="mm-summer-title" className="mx-auto mt-8 max-w-[22ch]">
              <Words text={firstSummer.headline} />
            </H2>
            <Body className="mx-auto mt-10 text-center">{firstSummer.body}</Body>
          </div>

          <ul className="mt-20 flex items-center justify-center gap-4 sm:gap-10 lg:mt-28 lg:gap-20">
            {firstSummer.stats.map((stat, i) => (
              <li key={stat.label} className="contents">
                {i > 0 ? <span aria-hidden="true" className="h-16 w-px shrink-0 bg-mist" /> : null}
                <div className="text-center">
                  <p className={`${NUMERAL} text-[4rem] text-ink lg:text-[6rem]`}>{stat.value}</p>
                  <Micro tone="stone" className="mt-4">
                    {stat.label}
                  </Micro>
                </div>
              </li>
            ))}
          </ul>

          <ol role="list" className="mt-24 grid border-t border-mist lg:mt-32 lg:grid-cols-3">
            {firstSummer.rhythm.map((step, i) => (
              <li key={step.title} className="reveal px-2 py-14 text-center lg:px-10">
                <Index className="text-[1.5rem] text-stone">{ROMAN[i]}</Index>
                <h3 className="mt-6 font-display text-[1.5rem] font-medium leading-[1.15] text-ink lg:text-[1.75rem]">
                  {step.title}
                </h3>
                <Body className="mx-auto mt-5 text-center">{step.body}</Body>
              </li>
            ))}
          </ol>
        </Container>
      </div>
      <div className="relative aspect-[4/5] w-full lg:aspect-[21/9]">
        <Photo photo={photos.longTableOcean} sizes="100vw" />
      </div>
    </section>
  )
}
