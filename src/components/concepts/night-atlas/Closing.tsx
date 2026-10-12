import { Photo } from "@/components/Photo"
import { SignupForm } from "@/components/signup/SignupForm"
import { Container } from "@/components/ui"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { BODY, GRID, H1, Label, MONO, Title } from "./parts"

export function Closing() {
  const { finalCta } = site
  return (
    <section
      id="closing"
      aria-labelledby="closing-heading"
      className="relative isolate min-h-[90svh] overflow-clip bg-ink"
    >
      <div className="absolute inset-0">
        <Photo photo={photos.atitlanDusk} sizes="100vw" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(11,16,32,0.8)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/60 to-ink/30" />
      <div aria-hidden="true" className={`absolute inset-0 ${GRID}`} />

      <Container className="relative z-10 flex min-h-[inherit] flex-col justify-end pb-10 pt-24 sm:pb-14 lg:pb-20">
        <div className="reveal">
          <Label>{finalCta.eyebrow}</Label>
          <h2 id="closing-heading" className={`${H1} mt-5 max-w-[14ch] text-bone`}>
            <Title text={finalCta.headline} />
          </h2>
          <p className={`${BODY} mt-6 max-w-[46ch]`}>{finalCta.body}</p>
          <SignupForm
            source="closing"
            variant="dark"
            cta={site.hero.cta}
            microcopy={site.hero.microcopy}
            className="mt-8 max-w-[40rem]"
          />
          <p className={`${MONO} mt-6 max-w-[56ch] text-[0.75rem] uppercase leading-[1.6] tracking-[0.12em] text-bone/60`}>
            {finalCta.honesty}
          </p>
        </div>
      </Container>
    </section>
  )
}
