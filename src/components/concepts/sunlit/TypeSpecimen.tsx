import { site } from "@/content/site"
import { ConceptTheme } from "@/components/concepts/ConceptTheme"
import { BIG_NUM, BODY, Eyebrow, H1, H2, H3, Headline } from "./parts"
import { sunlitTokens } from "./tokens"

type Props = { slug: string; family: string }

/**
 * A compact slice of the Sunlit type system in one candidate face: wordmark,
 * hero stack, numerals, section and card titles. Static replica of the form
 * so eight specimens do not mount eight live forms.
 */
export function TypeSpecimen({ slug, family }: Props) {
  const { hero, firstSummer, destinations, faq } = site
  const moment = destinations.places[0].moments[1]
  return (
    <div data-display={slug} className="contents">
      <ConceptTheme tokens={{ ...sunlitTokens, display: family }} className="rounded-[2rem] bg-bone-deep p-6 lg:rounded-[2.5rem] lg:p-10">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <p className="font-display text-[1.5rem] font-extrabold leading-none tracking-[-0.02em] text-ink [font-variation-settings:'opsz'_36,'wdth'_100]">
              {site.name.toLowerCase()}
            </p>
            <Eyebrow className="mt-8 text-stone">{hero.eyebrow}</Eyebrow>
            <h3 className={`${H1} mt-4 text-[clamp(2.75rem,8vw,5.25rem)] text-ink [overflow-wrap:break-word]`}>
              <Headline text={hero.headline} />
            </h3>
            <p className="mt-5 max-w-[40ch] text-[1.125rem] leading-[1.6] text-ink-soft">{hero.subheadMobile}</p>
            <div aria-hidden="true" className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row">
              <div className="flex h-14 flex-1 items-center rounded-full border border-ink/25 px-6 text-stone">{site.signup.emailPlaceholder}</div>
              <div className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-ember px-6 font-sans font-semibold text-ink">
                {hero.cta} <span>→</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <ul className="flex flex-wrap gap-3" aria-hidden="true">
              {firstSummer.stats.map((s) => (
                <li key={s.label} className="rounded-[1.25rem] bg-moon px-5 py-4 text-ink">
                  <span className={`${BIG_NUM} block text-[3rem] lg:text-[3.5rem]`}>{s.value}</span>
                  <span className="font-sans text-[0.9375rem] font-semibold">{s.label}</span>
                </li>
              ))}
            </ul>
            <p className={`${H2} mt-8 text-[clamp(1.75rem,3vw,2.5rem)] text-ink`}>
              <Headline text={firstSummer.headline} />
            </p>
            <div className="mt-6 rounded-[1.25rem] bg-bone p-5">
              <p className={`${H3} text-[1.25rem] text-ink lg:text-[1.375rem]`}>{moment.title}</p>
              <p className={`${BODY} mt-2 text-ink-soft`}>{moment.body}</p>
              <span className="mt-3 inline-flex rounded-full bg-ink px-3 py-1 font-sans text-[0.75rem] font-semibold text-bone">{moment.ages}</span>
            </div>
            <p className="mt-6 font-display text-[1.1875rem] font-semibold leading-[1.2] text-ink [font-variation-settings:'opsz'_36,'wdth'_100]">
              {faq.items[0].q}
            </p>
          </div>
        </div>
      </ConceptTheme>
    </div>
  )
}
