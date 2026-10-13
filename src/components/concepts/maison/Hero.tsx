import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { SignupForm } from "@/components/signup/SignupForm"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { FORM_LIGHT, H1_CLASS, Micro } from "./primitives"

export function Hero() {
  const { hero } = site
  return (
    <section aria-labelledby="mm-hero-title">
      <div className="relative flex min-h-[calc(100svh-6rem)] items-center justify-center overflow-hidden bg-ink">
        <div className="absolute inset-0 animate-settle">
          <Photo photo={photos.conchaFromIgueldo} preload sizes="100vw" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-ink/45" />
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/35 via-55% to-transparent" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-3 bg-bone" />
        <div className="animate-fade relative z-10 flex w-full flex-col items-center px-4 py-16 text-center sm:px-6">
          <span aria-hidden="true" className="block h-14 w-px bg-moon" />
          <Micro tone="moon" className="mt-8 max-w-[44ch]">
            {hero.eyebrow}
          </Micro>
          <h1 id="mm-hero-title" className={`${H1_CLASS} mx-auto mt-8 max-w-[18ch] text-center text-bone`}>
            {hero.headline.before} <em className="italic text-moon">{hero.headline.accent}</em> {hero.headline.after}
          </h1>
        </div>
      </div>
      <div className="bg-bone py-20 lg:py-28">
        <Container>
          <p className="mx-auto max-w-[52ch] text-center font-sans text-[1.125rem] leading-[1.7] text-ink-soft sm:hidden">{hero.subheadMobile}</p>
          <p className="mx-auto hidden max-w-[52ch] text-center font-sans text-[1.125rem] leading-[1.7] text-ink-soft sm:block lg:text-[1.25rem]">
            {hero.subhead}
          </p>
          <SignupForm
            source="hero"
            variant="light"
            cta={hero.cta}
            microcopy={hero.microcopy}
            className={`mx-auto mt-14 max-w-[36rem] ${FORM_LIGHT}`}
          />
        </Container>
      </div>
    </section>
  )
}
