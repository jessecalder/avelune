import { SignupForm } from "@/components/signup/SignupForm"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Column, Framed, Kicker, Words } from "./primitives"

export function Hero() {
  const { hero } = site
  return (
    <section aria-labelledby="qp-hero-title" className="py-28 lg:py-40">
      <Column>
        <div className="animate-fade text-center">
          <Kicker>{hero.eyebrow}</Kicker>
          <h1
            id="qp-hero-title"
            className="mx-auto mt-8 max-w-[20ch] font-display font-light text-[length:clamp(3rem,7vw,7.5rem)] leading-[1.0] tracking-[-0.01em] text-balance text-ink"
          >
            <Words text={hero.headline} />
          </h1>
          <p className="mx-auto mt-8 max-w-[52ch] text-[1rem] leading-[1.7] text-ink-soft sm:hidden">{hero.subheadMobile}</p>
          <p className="mx-auto mt-8 hidden max-w-[52ch] text-[1rem] leading-[1.7] text-ink-soft sm:block">{hero.subhead}</p>
          <SignupForm
            source="hero"
            variant="light"
            cta={hero.cta}
            microcopy={hero.microcopy}
            className="mx-auto mt-10 max-w-[32rem] text-left [&_p]:text-center"
          />
        </div>
        <Framed
          photo={photos.conchaFromIgueldo}
          aspect="aspect-[16/9]"
          sizes="(min-width: 1024px) 1100px, 100vw"
          preload
          className="mt-20 lg:mt-28"
        />
      </Column>
    </section>
  )
}
