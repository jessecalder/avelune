import { SignupForm } from "@/components/signup/SignupForm"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Column, Framed, Kicker, Words } from "./primitives"

export function Closing() {
  const { finalCta: c } = site
  return (
    <section aria-labelledby="qp-closing-title" className="bg-ink py-32 text-bone">
      <Column>
        <Framed
          photo={photos[c.photo]}
          aspect="aspect-[16/9]"
          sizes="(min-width: 1024px) 1100px, 100vw"
          surface="ink"
          className="hidden md:block"
        />
        <Framed
          photo={photos[c.photoMobile]}
          aspect="aspect-[4/5]"
          sizes="28rem"
          surface="ink"
          className="mx-auto max-w-[28rem] md:hidden"
        />

        <div className="mt-20 text-center lg:mt-28">
          <Kicker tone="moon">{c.eyebrow}</Kicker>
          <h2
            id="qp-closing-title"
            className="mx-auto mt-6 max-w-[18ch] font-display text-[length:clamp(2.5rem,6vw,6rem)] font-light leading-[1.05] tracking-[-0.01em] text-balance text-bone"
          >
            <Words text={c.headline} accentClass="text-moon" />
          </h2>
          <p className="mx-auto mt-8 max-w-[48ch] text-[1rem] leading-[1.7] text-bone/90">{c.body}</p>
          {/* ember is a dark green that vanishes on ink, so the button takes sage here */}
          <SignupForm
            source="closing"
            variant="dark"
            cta={site.hero.cta}
            microcopy={site.hero.microcopy}
            className="mx-auto mt-10 max-w-[32rem] text-left [--color-ember-deep:var(--color-atlantic-deep)] [--color-ember:var(--color-atlantic)] [&_p]:text-center"
          />
          <p className="mt-10 text-[0.875rem] leading-[1.6] text-bone/60">{c.honesty}</p>
        </div>
      </Column>
    </section>
  )
}
