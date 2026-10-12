import { Photo } from "@/components/Photo"
import { SignupForm } from "@/components/signup/SignupForm"
import { Container } from "@/components/ui"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { delay, GRID, H1, Label, MONO, Title } from "./parts"

export function NightHero() {
  const dateline = site.hero.eyebrow.split(" · ")
  return (
    <section
      id="early-access"
      aria-labelledby="hero-heading"
      className="relative isolate min-h-[max(100svh,640px)] overflow-hidden bg-ink"
    >
      <div className="absolute inset-0 animate-settle">
        <Photo photo={photos.fuegoNight} sizes="100vw" preload />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(11,16,32,0.85)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
      <div aria-hidden="true" className={`absolute inset-0 ${GRID}`} />

      <Container className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden pt-10 md:block">
        <div aria-hidden="true" className={`${MONO} ml-auto w-fit animate-fade text-right text-[0.75rem] uppercase leading-[1.8] tracking-[0.12em]`} style={delay(700)}>
          {site.hero.verticalLabel.map((label) => (
            <p key={label} className="text-moon">
              {label}
            </p>
          ))}
          <span className="my-3 ml-auto block h-px w-12 bg-moon" />
          {dateline.map((part) => (
            <p key={part} className="text-bone/80">
              {part}
            </p>
          ))}
        </div>
      </Container>

      <Container className="relative z-10 flex min-h-[inherit] flex-col justify-end pb-10 pt-24 sm:pb-14 lg:pb-20">
        <Label className="animate-rise">{site.hero.eyebrow}</Label>
        <h1 id="hero-heading" className={`${H1} mt-5 max-w-[12ch] animate-rise text-bone`} style={delay(150)}>
          <Title text={site.hero.headline} />
        </h1>
        <p className="mt-5 max-w-[46ch] animate-rise text-base leading-[1.5] text-bone/85 sm:hidden" style={delay(300)}>
          {site.hero.subheadMobile}
        </p>
        <p className="mt-6 hidden max-w-[46ch] animate-rise text-[1.0625rem] leading-[1.6] text-bone/85 sm:block" style={delay(300)}>
          {site.hero.subhead}
        </p>
        <div className="mt-8 max-w-[40rem] animate-rise" style={delay(450)}>
          <SignupForm source="hero" variant="dark" cta={site.hero.cta} microcopy={site.hero.microcopy} />
        </div>
      </Container>
    </section>
  )
}
