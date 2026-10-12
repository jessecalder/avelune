import Link from "next/link"
import { Photo } from "@/components/Photo"
import { SignupForm } from "@/components/signup/SignupForm"
import { Container, Eyebrow, HeadlineText, Rule } from "@/components/ui"
import { Wordmark } from "@/components/Wordmark"
import { photos } from "@/content/photos"
import { site } from "@/content/site"

const delay = (ms: number) => ({ animationDelay: `${ms}ms` })

export function Hero() {
  const [north, highlands] = site.hero.verticalLabel
  return (
    <section
      id="early-access"
      aria-labelledby="hero-heading"
      className="relative isolate min-h-[max(100svh,640px)] overflow-hidden bg-ink"
    >
      <div className="absolute inset-0 animate-settle">
        <Photo photo={photos[site.hero.photo]} sizes="100vw" preload />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-ink/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/50 to-transparent" />

      <header className="absolute inset-x-0 top-0 z-10">
        <Container className="flex h-20 items-center">
          <Link href="/" aria-label="Avelune home" className="text-moon">
            <Wordmark size={28} />
          </Link>
        </Container>
      </header>

      <div aria-hidden="true" className="absolute right-6 top-1/2 z-10 hidden -translate-y-1/2 lg:block">
        <div className="flex flex-col items-center gap-4">
          <span className="eyebrow text-moon/80 [writing-mode:vertical-rl] rotate-180">{north}</span>
          <span className="block h-10 w-px bg-moon" />
          <span className="eyebrow text-moon/80 [writing-mode:vertical-rl] rotate-180">{highlands}</span>
        </div>
      </div>

      <Container className="relative z-10 flex min-h-[inherit] flex-col justify-end pb-8 pt-24 sm:pb-12 sm:pt-32 lg:pb-16">
        <div className="animate-rise" style={delay(250)}>
          <Rule tone="moon" />
        </div>
        <div className="mt-5 animate-rise" style={delay(350)}>
          <Eyebrow tone="moon">{site.hero.eyebrow}</Eyebrow>
        </div>
        <h1
          id="hero-heading"
          className="display mt-4 max-w-[18ch] animate-rise sm:mt-5 font-bold text-[clamp(3.25rem,8vw,8.5rem)] leading-[0.92] text-bone"
          style={delay(450)}
        >
          <HeadlineText text={site.hero.headline} accentClass="text-moon" />
        </h1>
        <p className="mt-4 max-w-[46ch] animate-rise text-base leading-[1.45] text-bone/90 sm:hidden" style={delay(550)}>
          {site.hero.subheadMobile}
        </p>
        <p className="mt-6 hidden max-w-[46ch] animate-rise text-lg leading-[1.5] text-bone/90 sm:block lg:text-xl" style={delay(550)}>
          {site.hero.subhead}
        </p>
        <div className="mt-5 max-w-[40rem] animate-rise sm:mt-8" style={delay(650)}>
          <SignupForm source="hero" variant="dark" cta={site.hero.cta} microcopy={site.hero.microcopy} />
        </div>
      </Container>
    </section>
  )
}
