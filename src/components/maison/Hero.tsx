import { Photo } from "@/components/Photo"
import { SignupForm } from "@/components/signup/SignupForm"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { FORM_DARK, H1_CLASS } from "./primitives"

/**
 * The first screen: photograph, headline, the explanation and the early-access form,
 * all inside one pane that fills the viewport below the header and section row.
 */
export function Hero() {
  const { hero } = site
  return (
    <section aria-labelledby="mm-hero-title">
      <div className="relative flex min-h-[calc(100svh-9rem-2px)] items-center justify-center overflow-hidden bg-ink">
        <div className="absolute inset-0 animate-settle">
          <Photo photo={photos.conchaFromIgueldo} preload sizes="100vw" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-ink/50" />
        {/* Extra shade behind the text column so the paragraph and small print stay legible over bright sand. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_75%_at_50%_50%,rgb(26_26_26/0.6),rgb(26_26_26/0.35)_60%,transparent_100%)]"
        />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-2/5 bg-linear-to-b from-ink/50 to-transparent" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink/65 to-transparent" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-3 bg-bone" />
        <div className="animate-fade relative z-10 flex w-full flex-col items-center px-4 py-8 text-center sm:px-6 lg:py-10">
          <span aria-hidden="true" className="hidden h-8 w-px bg-moon sm:block" />
          <p className="max-w-[30ch] font-sans text-[0.875rem] font-medium uppercase leading-[1.6] tracking-[0.2em] text-bone sm:mt-5 sm:max-w-none sm:text-[0.9375rem] lg:text-[1.0625rem]">
            {hero.eyebrow}
          </p>
          <h1 id="mm-hero-title" className={`${H1_CLASS} mx-auto mt-5 max-w-[18ch] text-center text-bone sm:mt-6 lg:max-w-[24ch]`}>
            {hero.headline.before} <em className="italic text-moon">{hero.headline.accent}</em> {hero.headline.after}
          </h1>
          <p className="mx-auto mt-6 max-w-[40ch] font-sans text-[1.0625rem] leading-[1.65] text-bone/90 sm:hidden">
            {hero.subheadMobile}
          </p>
          <p className="mx-auto mt-6 hidden max-w-[62ch] font-sans text-[1.0625rem] leading-[1.7] text-bone/90 sm:block lg:text-[1.125rem]">
            {hero.subhead}
          </p>
          <SignupForm
            source="hero"
            variant="dark"
            cta={hero.cta}
            microcopy={hero.microcopy}
            className={`mx-auto mt-6 w-full max-w-[36rem] text-left ${FORM_DARK} [&_p]:text-bone/90!`}
          />
        </div>
      </div>
    </section>
  )
}
