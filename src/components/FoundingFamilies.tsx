import { site } from "@/content/site"
import { photos } from "@/content/photos"
import { Container, Eyebrow, HeadlineText, Index } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { SignupForm } from "@/components/signup/SignupForm"

export function FoundingFamilies() {
  const { founding } = site
  return (
    <section id="founding" aria-labelledby="founding-heading">
      <div className="relative isolate min-h-[60svh] overflow-hidden bg-cacao">
        <Photo photo={photos[founding.photo]} sizes="100vw" />
        <div className="absolute inset-0 bg-cacao/60" />
        <Container className="relative flex min-h-[60svh] flex-col justify-end py-16 lg:py-24">
          <div className="lg:w-2/3">
            <Eyebrow tone="moon">{founding.eyebrow}</Eyebrow>
            <h2
              id="founding-heading"
              className="display mt-6 font-semibold text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.98] tracking-[-0.015em] text-moon"
            >
              <HeadlineText text={founding.headline} />
            </h2>
            <p className="measure mt-8 text-lg leading-[1.5] text-bone lg:text-xl">{founding.body}</p>
          </div>
        </Container>
      </div>

      <Container className="py-20 lg:py-28">
        <ol className="[&>li+li]:border-t-2 [&>li+li]:border-ember/70">
          {founding.perks.map((perk, i) => (
            <li key={perk.title} className="reveal grid gap-4 py-8 lg:grid-cols-12 lg:gap-x-6 lg:py-10">
              <div className="lg:col-span-2">
                <Index n={i + 1} className="text-5xl text-stone" />
              </div>
              <h3 className="font-display text-[1.75rem] font-semibold leading-[1.1] text-ink [font-variation-settings:'opsz'_48,'SOFT'_0,'WONK'_0] lg:col-span-4 lg:text-[2rem]">
                {perk.title}
              </h3>
              <p className="max-w-[52ch] text-[1.0625rem] leading-[1.55] text-ink lg:col-span-6">{perk.body}</p>
            </li>
          ))}
        </ol>

        <div className="reveal mt-16 border border-ink/15 p-6 lg:w-2/3 lg:p-10">
          <SignupForm source="founding" variant="light" cta={founding.form.cta} microcopy={founding.form.microcopy} />
        </div>
      </Container>
    </section>
  )
}
