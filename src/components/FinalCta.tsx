import { Photo } from "@/components/Photo"
import { SignupForm } from "@/components/signup/SignupForm"
import { Container, Eyebrow, HeadlineText } from "@/components/ui"
import { photos } from "@/content/photos"
import { site } from "@/content/site"

export function FinalCta() {
  return (
    <section
      id="closing"
      aria-labelledby="closing-heading"
      className="relative isolate min-h-[max(100svh,640px)] overflow-clip bg-ink"
    >
      <div className="absolute inset-0 hidden md:block">
        <Photo photo={photos[site.finalCta.photo]} sizes="100vw" />
      </div>
      <div className="absolute inset-0 md:hidden">
        <Photo photo={photos[site.finalCta.photoMobile]} sizes="100vw" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-ink/10" />

      <Container className="relative z-10 flex min-h-[inherit] flex-col justify-end pb-8 pt-24 sm:pb-12 sm:pt-32 lg:pb-16">
        <div className="reveal flex flex-col lg:items-end lg:text-right">
          <Eyebrow tone="moon">{site.finalCta.eyebrow}</Eyebrow>
          <h2
            id="closing-heading"
            className="display mt-5 max-w-[16ch] font-bold text-[clamp(3rem,7vw,7.5rem)] leading-[0.92] text-bone"
          >
            <HeadlineText text={site.finalCta.headline} accentClass="text-moon" />
          </h2>
          <p className="mt-6 max-w-[46ch] text-lg leading-[1.5] text-bone/90 lg:text-xl">{site.finalCta.body}</p>
          <SignupForm
            source="closing"
            variant="dark"
            cta={site.hero.cta}
            microcopy={site.hero.microcopy}
            className="mt-8 w-full max-w-[40rem] text-left"
          />
          <p className="mt-6 text-[0.8125rem] text-bone/70">{site.finalCta.honesty}</p>
        </div>
      </Container>
    </section>
  )
}
