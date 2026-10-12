import { site } from "@/content/site"
import { photos } from "@/content/photos"
import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { BODY, Eyebrow, H2, H3, Headline, RoundForm, SOFT_SHADOW } from "./parts"

export function Founding() {
  const f = site.founding
  return (
    <section aria-labelledby="sunlit-founding" className="pb-16 lg:pb-24">
      <Container>
        <div className="rounded-[2.5rem] bg-ember-deep p-6 text-bone sm:p-8 lg:p-16">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
            <div className="lg:col-span-7">
              <Eyebrow className="text-moon">{f.eyebrow}</Eyebrow>
              <h2 id="sunlit-founding" className={`${H2} mt-5`}>
                <Headline text={f.headline} accentClass="text-moon" />
              </h2>
              <p className={`${BODY} mt-6 max-w-[56ch]`}>{f.body}</p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] lg:col-span-5">
              <Photo photo={photos[f.photo]} sizes="(min-width: 1024px) 40vw, 100vw" />
            </div>
          </div>
          <ol className="mt-10 grid gap-x-12 gap-y-8 border-t border-bone/30 pt-10 md:grid-cols-2 lg:mt-14 lg:pt-14">
            {f.perks.map((perk, i) => (
              <li key={perk.title} className="grid grid-cols-[auto_1fr] gap-x-5">
                <span aria-hidden="true" className="font-display text-[3rem] font-extrabold leading-none tabular-nums text-moon lg:text-[4rem]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className={H3}>{perk.title}</h3>
                  <p className="mt-2 text-[1.0625rem] leading-[1.6]">{perk.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className={`mt-10 rounded-[2rem] bg-bone p-6 text-ink sm:p-8 lg:mt-14 lg:p-12 ${SOFT_SHADOW}`}>
            <div className="max-w-2xl">
              <RoundForm source="founding" variant="light" cta={f.form.cta} microcopy={f.form.microcopy} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
