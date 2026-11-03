import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { H1_CLASS, Index, MICRO_CLASS, ROMAN } from "./primitives"

type Place = (typeof site.destinations.places)[number]

/* Literal class strings so Tailwind can see them. The scrim only covers the text block at the
 * bottom of the photograph and is transparent above it, so the image stays bright. */
const SURFACE = {
  atlantic: { bg: "bg-atlantic", scrim: "from-atlantic/90 via-atlantic/60 via-50%" },
  cacao: { bg: "bg-cacao", scrim: "from-cacao/90 via-cacao/60 via-50%" },
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
        <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-[26rem] max-h-[70%] bg-linear-to-t ${surface.scrim} to-transparent`} />
        <div className="relative z-10 w-full px-4 pb-20 pt-40 text-center [text-shadow:0_1px_2px_rgb(0_0_0/0.3),0_0_30px_rgb(0_0_0/0.35)] sm:px-6">
          <Index className="text-[5rem] text-moon">{ROMAN[index]}</Index>
          <h2 id={titleId} className={`${H1_CLASS} mt-6 text-bone`}>
            {place.name}
          </h2>
          <p className={`${MICRO_CLASS} mt-8 text-bone`}>
            {place.when} · {place.country}
          </p>
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
