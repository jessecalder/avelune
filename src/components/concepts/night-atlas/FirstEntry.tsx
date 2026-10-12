import { Photo } from "@/components/Photo"
import { SignupForm } from "@/components/signup/SignupForm"
import { Container } from "@/components/ui"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { BODY, Bracketed, GRID, H2, H3, Num, SectionLabel, Title } from "./parts"

export function FirstEntry() {
  const { founding } = site
  return (
    <section aria-labelledby="founding-heading" className={`bg-ink py-20 lg:py-32 ${GRID}`}>
      <Container>
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            <div className="reveal">
              <SectionLabel>{founding.eyebrow}</SectionLabel>
              <h2 id="founding-heading" className={`${H2} mt-6 text-bone`}>
                <Title text={founding.headline} />
              </h2>
              <p className={`${BODY} mt-8 max-w-[58ch]`}>{founding.body}</p>
            </div>
            <ol className="mt-14 border-b border-moon/40">
              {founding.perks.map((perk, i) => (
                <li key={perk.title} className="reveal grid gap-3 border-t border-moon/40 py-7 sm:grid-cols-[3rem_1fr] sm:gap-x-4">
                  <Num n={i + 1} className="pt-1" />
                  <div>
                    <h3 className={`${H3} text-bone`}>{perk.title}</h3>
                    <p className={`${BODY} mt-3 max-w-[56ch]`}>{perk.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <Bracketed className="aspect-[3/2]">
                <Photo photo={photos[founding.photo]} sizes="(min-width: 1024px) 40vw, 100vw" />
              </Bracketed>
              <div className={`mt-8 border border-moon/40 bg-ink-soft p-6 lg:p-8 ${GRID}`}>
                <SignupForm source="founding" variant="dark" cta={founding.form.cta} microcopy={founding.form.microcopy} />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
