import { site } from "@/content/site"
import { photos } from "@/content/photos"
import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { BODY, H1, Headline, RoundForm } from "./parts"

export function Closing() {
  const c = site.finalCta
  return (
    <section aria-labelledby="sunlit-closing" className="bg-atlantic-deep py-20 text-bone lg:py-28">
      <Container>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] sm:hidden">
          <Photo photo={photos[c.photoMobile]} sizes="100vw" />
        </div>
        <div className="relative hidden aspect-[16/9] overflow-hidden rounded-[2.5rem] sm:block lg:aspect-[21/9]">
          <Photo photo={photos[c.photo]} sizes="(min-width: 1440px) 1344px, 100vw" />
        </div>
        <div className="mt-10 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <p className="inline-block rounded-full bg-moon px-4 py-2 font-sans text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-ink">
              {c.eyebrow}
            </p>
            <h2 id="sunlit-closing" className={`${H1} mt-6 text-[clamp(3rem,8vw,8rem)]`}>
              <Headline text={c.headline} accentClass="text-moon" />
            </h2>
          </div>
          <div className="lg:col-span-5 lg:self-end">
            <p className={`${BODY} text-[1.125rem]`}>{c.body}</p>
            <div className="mt-8">
              <RoundForm source="closing" variant="dark" cta={site.hero.cta} microcopy={site.hero.microcopy} />
            </div>
            <p className="mt-8 text-[0.9375rem] leading-[1.5] text-bone/80">{c.honesty}</p>
          </div>
        </div>
      </Container>
    </section>
  )
}
