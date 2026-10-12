import { Photo } from "@/components/Photo"
import { Container } from "@/components/ui"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { BODY, Bracketed, GRID, H2, H3, Label, MONO, Num, SectionLabel, Title } from "./parts"

type Place = (typeof site.destinations.places)[number]

const SURFACE = {
  atlantic: "bg-atlantic",
  cacao: "bg-cacao",
} as const

function Dossier({ place }: { place: Place }) {
  const [days, families] = site.firstSummer.stats
  const surface = SURFACE[place.surface]
  const rows: [string, string][] = [
    ["Place", place.name],
    ["Country", place.country],
    ["Window", place.when],
    ["Days", days.value],
    ["Families", families.value],
  ]
  return (
    <article aria-labelledby={`${place.id}-heading`} className={`${surface} py-16 lg:py-28 ${GRID}`}>
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-x-16">
          <Bracketed className="aspect-[4/3]">
            <Photo photo={photos[place.photo]} sizes="(min-width: 1024px) 50vw, 100vw" />
          </Bracketed>
          <div>
            <h3 id={`${place.id}-heading`} className={`${H2} text-bone`}>
              {place.name}
            </h3>
            <dl className={`${MONO} mt-8 border-b border-moon/40 text-[0.75rem] uppercase tracking-[0.12em]`}>
              {rows.map(([term, value]) => (
                <div key={term} className="flex justify-between gap-6 border-t border-moon/40 py-3">
                  <dt className="text-moon">{term}</dt>
                  <dd className="text-right text-bone">{value}</dd>
                </div>
              ))}
            </dl>
            <p className={`${BODY} mt-8 max-w-[58ch]`}>{place.body}</p>
          </div>
        </div>

        <ol className="ml-3 mt-16 border-l border-moon lg:mt-24">
          {place.moments.map((moment, i) => (
            <li key={moment.title} className="relative pb-12 pl-8 last:pb-0 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:pl-12">
              <Num n={i + 1} className={`absolute left-0 top-0 -translate-x-1/2 px-1 py-1 ${surface}`} />
              <div className="lg:col-span-5">
                <h4 className={`${H3} text-bone`}>{moment.title}</h4>
                <Label className="mt-3">{moment.ages}</Label>
              </div>
              <p className={`${BODY} mt-4 max-w-[62ch] lg:col-span-7 lg:mt-0`}>{moment.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </article>
  )
}

export function Dossiers() {
  const { destinations } = site
  return (
    <section aria-labelledby="destinations-heading">
      <div className={`bg-ink py-20 lg:py-32 ${GRID}`}>
        <Container>
          <div className="reveal grid gap-8 lg:grid-cols-12 lg:gap-x-12">
            <div className="lg:col-span-7">
              <SectionLabel>{destinations.eyebrow}</SectionLabel>
              <h2 id="destinations-heading" className={`${H2} mt-6 text-bone`}>
                <Title text={destinations.headline} />
              </h2>
            </div>
            <p className={`${BODY} max-w-[52ch] lg:col-span-5 lg:self-end`}>{destinations.body}</p>
          </div>
        </Container>
      </div>
      {destinations.places.map((place) => (
        <Dossier key={place.id} place={place} />
      ))}
    </section>
  )
}
