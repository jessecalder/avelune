import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { SignupForm } from "@/components/signup/SignupForm"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { FORM_DARK, H1_CLASS, Micro } from "./primitives"

export function Closing() {
  const { finalCta, hero } = site
  return (
    <section aria-labelledby="mm-closing-title">
      <div className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink">
        <div className="absolute inset-0">
          <Photo photo={photos.atitlanDusk} sizes="100vw" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-ink/80" />
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink/40 to-transparent" />
        <Container className="relative z-10 py-28 text-center">
          <div className="reveal">
            <Micro tone="moon">{finalCta.eyebrow}</Micro>
            <h2 id="mm-closing-title" className={`${H1_CLASS} mx-auto mt-8 max-w-[18ch] text-bone`}>
              {finalCta.headline.before} <em className="italic text-moon">{finalCta.headline.accent}</em> {finalCta.headline.after}
            </h2>
            <p className="mx-auto mt-10 max-w-[44ch] font-sans text-[1.0625rem] leading-[1.75] text-bone/85">{finalCta.body}</p>
            <SignupForm
              source="closing"
              variant="dark"
              cta={hero.cta}
              microcopy={hero.microcopy}
              className={`mx-auto mt-14 max-w-[36rem] text-left ${FORM_DARK}`}
            />
            <Micro tone="bone70" className="mt-14">
              {finalCta.honesty}
            </Micro>
          </div>
        </Container>
      </div>
    </section>
  )
}
