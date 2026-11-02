import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { H1_CLASS, Index, Micro, ROMAN } from "./primitives"

type Place = (typeof site.destinations.places)[number]

/* Literal class strings so Tailwind can see them. */
const SURFACE = {
  atlantic: { bg: "bg-atlantic", scrim: "from-atlantic/90 via-atlantic/70" },
  cacao: { bg: "bg-cacao", scrim: "from-cacao/90 via-cacao/70" },
} as const

function ChapterPhoto({ id }: { id: Place["id"] }) {
  if (id === "san-sebastian") {
    return (
      <div className="absolute inset-0">
        <Photo photo={photos.conchaAerial} sizes="100vw" />
      </div>
    )
  }
  return (
    <>
      <div className="absolute inset-0 md:hidden">
        <Photo photo={photos.arcoVolcan} sizes="100vw" />
      </div>
      <div className="absolute inset-0 hidden md:block">
        <Photo photo={photos.antiguaStreetVolcano} sizes="100vw" />
      </div>
    </>
  )
}

/** One destination: a full-screen photograph with its name, then the summary on the place's surface colour. */
function Chapter({ place, index }: { place: Place; index: number }) {
  const surface = SURFACE[place.surface]
  const titleId = `mm-place-${place.id}`
  return (
    <section id={place.id} aria-labelledby={titleId}>
      <div className="relative flex min-h-[100svh] items-end justify-center overflow-hidden">
        <ChapterPhoto id={place.id} />
        <div aria-hidden="true" className={`absolute inset-0 bg-linear-to-t ${surface.scrim} via-50% to-transparent`} />
        <div className="relative z-10 w-full px-4 pb-20 pt-40 text-center sm:px-6">
          <Index className="text-[5rem] text-moon/80">{ROMAN[index]}</Index>
          <h2 id={titleId} className={`${H1_CLASS} mt-6 text-bone`}>
            {place.name}
          </h2>
          <Micro tone="moon" className="mt-8">
            {place.when} · {place.country}
          </Micro>
        </div>
      </div>

      <div className={`${surface.bg} py-20 text-bone lg:py-28`}>
        <Container>
          <p className="mx-auto max-w-[52ch] text-center font-sans text-[1.125rem] leading-[1.75] text-bone/85 lg:text-[1.25rem]">
            {place.body}
          </p>
        </Container>
      </div>
    </section>
  )
}

export function Destinations() {
  return (
    <>
      {site.destinations.places.map((place, i) => (
        <Chapter key={place.id} place={place} index={i} />
      ))}
    </>
  )
}
