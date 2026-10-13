import { ThemeOverride } from "@/components/ThemeOverride"
import { site } from "@/content/site"
import { H1_CLASS, Micro, NUMERAL, Words, Wordmark } from "./primitives"

type Props = { slug: string; family: string }

/** The shared H1 style minus its own size, so the specimen size is the only font-size class. */
const SPECIMEN_H1 = H1_CLASS.replace(/text-\[clamp\([^\]]*\)\]/, "")

/**
 * A compact slice of the Maison type system in one candidate face: wordmark,
 * hero stack, numerals, section and card titles. Static replica of the form
 * so eight specimens do not mount eight live forms.
 */
export function TypeSpecimen({ slug, family }: Props) {
  const { hero, firstSummer, destinations, faq } = site
  const moment = destinations.places[0].moments[1]
  return (
    <div data-display={slug} className="contents">
      <ThemeOverride tokens={{ display: family }} className="border border-mist bg-bone p-6 lg:p-12">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-ink">
              <Wordmark />
            </p>
            <div className="mt-10 flex items-start gap-6">
              <span aria-hidden="true" className="block h-14 w-px shrink-0 bg-moon" />
              <Micro className="max-w-[44ch]">{hero.eyebrow}</Micro>
            </div>
            <h3 className={`specimen-h1 ${SPECIMEN_H1} mt-8 text-[clamp(2.5rem,6vw,5.25rem)] text-ink [overflow-wrap:break-word]`}>
              <Words text={hero.headline} />
            </h3>
            <p className="mt-8 max-w-[44ch] font-sans text-[1.125rem] leading-[1.7] text-ink-soft">{hero.subheadMobile}</p>
            <div aria-hidden="true" className="mt-10 flex max-w-xl flex-col gap-6 sm:flex-row sm:items-end">
              <div className="flex-1 border-b border-ink/40 pb-3 font-sans text-[1rem] text-stone">{site.signup.emailPlaceholder}</div>
              <div className="inline-flex h-12 items-center justify-center bg-ink px-8 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-bone">
                {hero.cta}
              </div>
            </div>
          </div>
          <div>
            <ul className="flex items-center gap-4 sm:gap-8" aria-hidden="true">
              {firstSummer.stats.map((s, i) => (
                <li key={s.label} className="contents">
                  {i > 0 ? <span className="h-14 w-px shrink-0 bg-mist" /> : null}
                  <div className="text-center">
                    <span className={`${NUMERAL} block text-[3.5rem] text-ink`}>{s.value}</span>
                    <Micro className="mt-3">{s.label}</Micro>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-12 font-display text-[clamp(1.75rem,3vw,2.5rem)] font-normal leading-[1.1] text-balance text-ink">
              <Words text={firstSummer.headline} />
            </p>
            <div className="mt-10 border-t border-mist pt-8">
              <p className="font-display text-[1.5rem] font-medium leading-[1.15] text-ink lg:text-[1.75rem]">
                {moment.title}
              </p>
              <p className="mt-4 max-w-[56ch] font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">{moment.body}</p>
            </div>
            <p className="mt-8 border-t border-mist pt-8 font-display text-[1.25rem] font-medium leading-[1.3] text-ink lg:text-[1.5rem]">
              {faq.items[0].q}
            </p>
          </div>
        </div>
      </ThemeOverride>
    </div>
  )
}
