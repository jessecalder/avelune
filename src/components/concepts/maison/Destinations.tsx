import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Body, H1_CLASS, H2, Index, Micro, ROMAN, Words } from "./primitives"

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

function Chapter({ place, index }: { place: Place; index: number }) {
  const surface = SURFACE[place.surface]
  const titleId = `mm-place-${place.id}`
  return (
    <article aria-labelledby={titleId}>
      <div className="relative flex min-h-[100svh] items-end justify-center overflow-hidden">
        <ChapterPhoto id={place.id} />
        <div aria-hidden="true" className={`absolute inset-0 bg-linear-to-t ${surface.scrim} via-50% to-transparent`} />
        <div className="relative z-10 w-full px-4 pb-20 pt-40 text-center sm:px-6">
          <Index className="text-[5rem] text-moon/80">{ROMAN[index]}</Index>
          <h3 id={titleId} className={`${H1_CLASS} mt-6 text-bone`}>
            {place.name}
          </h3>
          <Micro tone="moon" className="mt-8">
            {place.when} · {place.country}
          </Micro>
        </div>
      </div>

      <div className={`${surface.bg} py-24 text-bone lg:py-36`}>
        <Container>
          <Body tone="bone" className="mx-auto text-center">
            {place.body}
          </Body>
          <ol role="list" className="mx-auto mt-20 grid max-w-[72rem] gap-x-20 lg:mt-28 lg:grid-cols-2">
            {place.moments.map((moment, i) => (
              <li key={moment.title} className="border-t border-moon/30 py-10">
                <Micro tone="moon">
                  <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                </Micro>
                <h4 className="mt-5 font-display text-[1.5rem] font-medium leading-[1.2] text-bone [font-variation-settings:'opsz'_36]">
                  {moment.title}
                </h4>
                <p className="mt-4 max-w-[56ch] font-sans text-[1.0625rem] leading-[1.75] text-bone/85">{moment.body}</p>
                <Micro tone="moon90" className="mt-6">
                  {moment.ages}
                </Micro>
              </li>
            ))}
          </ol>
        </Container>
      </div>
    </article>
  )
}

export function Destinations() {
  const { destinations } = site
  return (
    <section aria-labelledby="mm-dest-title">
      <div className="bg-bone py-28 lg:py-44">
        <Container>
          <div className="reveal text-center">
            <Micro>{destinations.eyebrow}</Micro>
            <H2 id="mm-dest-title" className="mx-auto mt-8 max-w-[22ch]">
              <Words text={destinations.headline} />
            </H2>
            <Body className="mx-auto mt-10 text-center">{destinations.body}</Body>
          </div>
        </Container>
      </div>
      {destinations.places.map((place, i) => (
        <Chapter key={place.id} place={place} index={i} />
      ))}
    </section>
  )
}
