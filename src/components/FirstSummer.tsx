import { Container, Eyebrow, HeadlineText, Numeral, Rule } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { photos } from "@/content/photos"
import { site } from "@/content/site"

export function FirstSummer() {
  const { firstSummer } = site
  return (
    <section id="first-summer" aria-labelledby="first-summer-heading" className="bg-bone py-20 lg:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-x-6">
          <div className="lg:col-span-5">
            <Rule />
            <Eyebrow className="mt-6">{firstSummer.eyebrow}</Eyebrow>
            <h2
              id="first-summer-heading"
              className="display mt-6 text-[clamp(2.5rem,5.5vw,5rem)] font-semibold leading-[0.98] tracking-[-0.015em] text-ink"
            >
              <HeadlineText text={firstSummer.headline} />
            </h2>
            <p className="measure mt-8 text-lg leading-[1.5] text-ink lg:text-xl">{firstSummer.body}</p>

            <dl className="mt-12 grid grid-cols-3 gap-6">
              {firstSummer.stats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse justify-end">
                  <dt className="eyebrow mt-2 text-stone">{stat.label}</dt>
                  <dd>
                    <Numeral className="text-5xl text-ember lg:text-6xl">{stat.value}</Numeral>
                  </dd>
                </div>
              ))}
            </dl>

            <ol className="mt-14 space-y-10">
              {firstSummer.rhythm.map((item) => (
                <li key={item.title} className="reveal">
                  <Rule />
                  <h3 className="mt-4 font-display text-[1.5rem] font-semibold leading-[1.1] text-ink [font-variation-settings:'opsz'_48,'SOFT'_0,'WONK'_0] lg:text-[1.75rem]">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-[48ch] text-[1.0625rem] leading-[1.55] text-ink">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative order-first aspect-[4/5] overflow-hidden lg:order-last lg:col-span-7 lg:-mr-12 lg:aspect-auto lg:min-h-[48rem] lg:self-stretch reveal">
            <Photo photo={photos[firstSummer.photo]} sizes="(min-width:1024px) 58vw, 100vw" />
          </div>
        </div>
      </Container>
    </section>
  )
}
