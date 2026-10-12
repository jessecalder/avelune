import { Container, Eyebrow, HeadlineText, Rule } from "@/components/ui"
import { MomentsRail } from "@/components/MomentsRail"
import { Photo } from "@/components/Photo"
import { photos } from "@/content/photos"
import { site } from "@/content/site"

// Full class strings so Tailwind can see them.
const surfaces = {
  atlantic: { bg: "bg-atlantic", overlay: "bg-atlantic/40", from: "from-atlantic" },
  cacao: { bg: "bg-cacao", overlay: "bg-cacao/40", from: "from-cacao" },
} as const

export function Destinations() {
  const { destinations } = site
  return (
    <section id="destinations" aria-labelledby="destinations-heading" className="bg-bone">
      <Container className="py-20 text-center lg:py-32">
        <Rule className="mx-auto" />
        <Eyebrow className="mt-6">{destinations.eyebrow}</Eyebrow>
        <h2
          id="destinations-heading"
          className="display mx-auto mt-6 max-w-[18ch] text-[clamp(2.5rem,5.5vw,5rem)] font-semibold leading-[0.98] tracking-[-0.015em] text-ink"
        >
          <HeadlineText text={destinations.headline} />
        </h2>
        <p className="measure mx-auto mt-8 text-lg leading-[1.5] text-ink lg:text-xl">{destinations.body}</p>
      </Container>

      {destinations.places.map((place, i) => {
        const s = surfaces[place.surface]
        const flipped = i === 1
        return (
          <article key={place.id} aria-labelledby={`place-${place.id}-heading`}>
            <div className={`relative isolate min-h-[90svh] overflow-hidden ${s.bg}`}>
              <Photo photo={photos[place.photo]} sizes="100vw" />
              <div className={`absolute inset-0 ${s.overlay}`} />
              <div className={`absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t ${s.from} to-transparent`} />
              <Container className="relative flex min-h-[90svh] flex-col justify-end pb-12 lg:pb-16">
                <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-x-6">
                  <div className={flipped ? "lg:col-span-6 lg:col-start-7 lg:text-right" : "lg:col-span-6"}>
                    <Eyebrow tone="moon">{place.when}</Eyebrow>
                    <h2
                      id={`place-${place.id}-heading`}
                      className="display mt-3 text-[clamp(3rem,7vw,7rem)] font-semibold leading-[0.95] text-moon"
                    >
                      {place.name}
                    </h2>
                    <p className="eyebrow mt-2 text-bone/70">{place.country}</p>
                  </div>
                  <div className={flipped ? "lg:col-span-5 lg:col-start-1 lg:row-start-1" : "lg:col-span-5 lg:col-start-8"}>
                    <p className="max-w-[40ch] text-lg leading-[1.5] text-bone lg:text-xl">{place.body}</p>
                  </div>
                </div>
              </Container>
            </div>
            <MomentsRail moments={place.moments} surface={place.surface} label={`${place.name} moments`} />
          </article>
        )
      })}
    </section>
  )
}
