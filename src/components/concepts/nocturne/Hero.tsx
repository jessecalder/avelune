import { Photo } from "@/components/Photo"
import { SignupForm } from "@/components/signup/SignupForm"
import { Container } from "@/components/ui"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Dusk, FORM_SKIN, H1_SIZE, Label, VRule, Words } from "./primitives"

export function Hero() {
  const { hero } = site
  return (
    <section
      aria-labelledby="nocturne-hero-title"
      className="relative isolate flex min-h-[100svh] items-end overflow-hidden"
    >
      <div className="absolute inset-0 animate-settle">
        <Photo photo={photos.atitlanDusk} sizes="100vw" preload className="brightness-[.92] saturate-[.85]" />
      </div>
      <Dusk strong />
      <Container className="relative">
        <div className="animate-fade flex flex-col items-center pb-24 pt-32 text-center">
          <VRule />
          <Label className="mt-10 max-w-[44ch]">{hero.eyebrow}</Label>
          <h1 id="nocturne-hero-title" className={`${H1_SIZE} mx-auto mt-8 max-w-[16ch] text-center text-bone`}>
            <Words text={hero.headline} />
          </h1>
          <p className="mx-auto mt-8 max-w-[48ch] font-sans text-[1.125rem] leading-[1.7] text-bone/85 sm:hidden">
            {hero.subheadMobile}
          </p>
          <p className="mx-auto mt-8 hidden max-w-[48ch] font-sans text-[1.125rem] leading-[1.7] text-bone/85 sm:block lg:text-[1.25rem]">
            {hero.subhead}
          </p>
          <div className={`mx-auto mt-12 w-full max-w-[36rem] text-left ${FORM_SKIN}`}>
            <SignupForm source="hero" variant="dark" cta={hero.cta} microcopy={hero.microcopy} />
          </div>
        </div>
      </Container>
    </section>
  )
}
