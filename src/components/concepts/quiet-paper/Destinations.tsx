import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Body, Column, Framed, H2, Kicker, ROMAN, Words } from "./primitives"

type Place = (typeof site.destinations.places)[number]

/**
 * Small type on atlantic and cacao uses bone, not moon: moon is 3.8:1 on
 * atlantic and 4.1:1 on cacao, which only suits the large place names.
 */
function Chapter({ place, index, flip }: { place: Place; index: number; flip: boolean }) {
  const surface = place.surface === "atlantic" ? "bg-atlantic" : "bg-cacao"
  const titleId = `qp-place-${place.id}`
  return (
    <article aria-labelledby={titleId} className={`${surface} text-bone`}>
      <Column className="py-24 lg:py-32">
        <div className="grid gap-y-14 lg:grid-cols-12 lg:items-center lg:gap-x-16">
          <div className={`lg:col-span-5 ${flip ? "lg:order-2 lg:col-start-8" : "lg:col-start-1"}`}>
            <span aria-hidden="true" className="block font-display text-[6rem] font-light leading-none text-moon/70">
              {ROMAN[index]}
            </span>
            <Kicker tone="bone" className="mt-6">
              {place.when} · {place.country}
            </Kicker>
            <h3
              id={titleId}
              className="mt-4 font-display text-[length:clamp(2.25rem,4.5vw,4.5rem)] font-normal leading-[1.05] text-moon"
            >
              {place.name}
            </h3>
            <p className="mt-8 max-w-[48ch] text-[1rem] leading-[1.7] text-bone/90">{place.body}</p>
          </div>
          <Framed
            photo={photos[place.photo]}
            aspect="aspect-[3/2]"
            sizes="(min-width: 1024px) 40rem, 100vw"
            surface="chapter"
            className={`lg:col-span-7 ${flip ? "lg:order-1 lg:col-start-1" : "lg:col-start-6"}`}
          />
        </div>

        <ol className="mt-20 border-b border-moon/20 lg:mt-28">
          {place.moments.map((m, i) => (
            <li key={m.title} className="grid gap-x-10 gap-y-3 border-t border-moon/20 py-8 lg:grid-cols-12">
              <span aria-hidden="true" className="font-display text-[1.5rem] font-light leading-[1.2] lining-nums text-moon/70 lg:col-span-1">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h4 className="font-display text-[1.5rem] font-medium leading-[1.2] text-bone lg:col-span-4">{m.title}</h4>
              <div className="lg:col-span-7">
                <p className="max-w-[60ch] text-[1rem] leading-[1.7] text-bone/90">{m.body}</p>
                <p className="mt-4 font-sans text-[0.7rem] font-medium uppercase leading-[1.8] tracking-[0.18em] text-bone">{m.ages}</p>
              </div>
            </li>
          ))}
        </ol>
      </Column>
    </article>
  )
}

export function Destinations() {
  const { destinations: d } = site
  return (
    <section aria-labelledby="qp-destinations-title" className="border-t border-mist">
      <div className="py-28 text-center lg:py-40">
        <Column>
          <Kicker>{d.eyebrow}</Kicker>
          <H2 id="qp-destinations-title" className="mx-auto mt-6 max-w-[22ch]">
            <Words text={d.headline} />
          </H2>
          <Body className="mx-auto mt-8">{d.body}</Body>
        </Column>
      </div>
      {d.places.map((place, i) => (
        <Chapter key={place.id} place={place} index={i} flip={i % 2 === 1} />
      ))}
    </section>
  )
}
