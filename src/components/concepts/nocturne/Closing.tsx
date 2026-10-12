import { Photo } from "@/components/Photo"
import { SignupForm } from "@/components/signup/SignupForm"
import { Container } from "@/components/ui"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Dusk, FORM_SKIN, H1_SIZE, Label, Words } from "./primitives"

export function Closing() {
  const { finalCta: c, hero } = site
  return (
    <section
      aria-labelledby="nocturne-closing-title"
      className="relative isolate flex min-h-[100svh] items-end overflow-hidden"
    >
      <div className="absolute inset-0">
        <Photo photo={photos.conchaBlueHour} sizes="100vw" className="brightness-[.92] saturate-[.85]" />
      </div>
      <Dusk strong />
      <Container className="relative">
        <div className="flex flex-col items-center py-28 text-center lg:py-44">
          <Label>{c.eyebrow}</Label>
          <h2 id="nocturne-closing-title" className={`${H1_SIZE} mx-auto mt-8 max-w-[18ch] text-bone`}>
            <Words text={c.headline} />
          </h2>
          <p className="mx-auto mt-8 max-w-[48ch] font-sans text-[1.125rem] leading-[1.7] text-bone/85">{c.body}</p>
          <div className={`mx-auto mt-12 w-full max-w-[36rem] text-left ${FORM_SKIN}`}>
            <SignupForm source="closing" variant="dark" cta={hero.cta} microcopy={hero.microcopy} />
          </div>
          <Label tone="bone-faint" className="mx-auto mt-14 max-w-[44ch]">
            {c.honesty}
          </Label>
        </div>
      </Container>
    </section>
  )
}
