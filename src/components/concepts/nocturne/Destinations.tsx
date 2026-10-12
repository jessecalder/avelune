import { Container } from "@/components/ui"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Body, Column, Frame, H1_SIZE, Label, pad, SectionHead } from "./primitives"

type Place = (typeof site.destinations.places)[number]

const SETTINGS = {
  "san-sebastian": { photo: photos.conchaBlueHour, surface: "bg-atlantic", flip: false },
  antigua: { photo: photos.arcoVolcan, surface: "bg-cacao", flip: true },
} as const

function Chapter({ place }: { place: Place }) {
  const { photo, surface, flip } = SETTINGS[place.id as keyof typeof SETTINGS]
  const titleId = `nocturne-place-${place.id}`
  return (
    <article aria-labelledby={titleId} className={`${surface} py-24 lg:py-36`}>
      <Container>
        <div className="mx-auto max-w-[72rem]">
          <div className="grid items-center gap-x-16 gap-y-20 lg:grid-cols-2">
            <div className={`reveal mx-auto w-full max-w-[30rem] ${flip ? "lg:order-2" : ""}`}>
              <Frame photo={photo} aspect="aspect-[4/5]" sizes="(min-width: 1024px) 30rem, 100vw" />
            </div>
            <div className="text-center lg:text-left">
              <Label>
                {place.when} · {place.country}
              </Label>
              <h3 id={titleId} className={`${H1_SIZE} mt-6 text-bone`}>
                {place.name}
              </h3>
              <Body className="mx-auto mt-8 lg:mx-0">{place.body}</Body>
            </div>
          </div>

          <ol className="mx-auto mt-24 max-w-[64rem] border-b border-moon/30 lg:mt-32">
            {place.moments.map((m, i) => (
              <li
                key={m.title}
                className="grid gap-y-4 border-t border-moon/30 py-10 lg:grid-cols-[4rem_minmax(0,1fr)_14rem] lg:gap-x-10 lg:py-12"
              >
                <Label aria-hidden="true" as="span">
                  {pad(i + 1)}
                </Label>
                <div>
                  <h4 className="font-display text-[1.5rem] font-normal leading-[1.25] text-bone">{m.title}</h4>
                  <p className="mt-4 max-w-[56ch] font-sans text-[1.0625rem] leading-[1.75] text-bone/80">{m.body}</p>
                </div>
                <Label tone="moon-soft">{m.ages}</Label>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </article>
  )
}

export function Destinations() {
  const { destinations: d } = site
  return (
    <section aria-labelledby="nocturne-destinations-title">
      <div className="bg-ink py-28 lg:py-44">
        <Column>
          <SectionHead
            id="nocturne-destinations-title"
            eyebrow={d.eyebrow}
            headline={d.headline}
            body={d.body}
            h2Class="max-w-[20ch]"
          />
        </Column>
      </div>
      {d.places.map((p) => (
        <Chapter key={p.id} place={p} />
      ))}
    </section>
  )
}
