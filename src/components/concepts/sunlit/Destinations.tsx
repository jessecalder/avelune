import { site } from "@/content/site"
import { photos } from "@/content/photos"
import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { BODY, Eyebrow, H2, Headline } from "./parts"

/** Body copy stays at full bone/ink: bone on atlantic is 4.6:1, ink on cacao 7.9:1. */
const surfaces = {
  atlantic: {
    card: "bg-atlantic text-bone",
    eyebrow: "text-bone",
    row: "bg-atlantic-deep/45",
    numeral: "text-moon",
    pill: "bg-moon text-ink",
  },
  cacao: {
    card: "bg-cacao text-ink",
    eyebrow: "text-ink",
    row: "bg-bone/40",
    numeral: "text-ink",
    pill: "bg-ink text-bone",
  },
} as const

export function Destinations() {
  const d = site.destinations
  return (
    <section aria-labelledby="sunlit-destinations" className="pb-16 lg:pb-24">
      <Container>
        <Eyebrow className="text-stone">{d.eyebrow}</Eyebrow>
        <div className="mt-5 grid gap-6 lg:grid-cols-12 lg:gap-12">
          <h2 id="sunlit-destinations" className={`${H2} reveal lg:col-span-7`}>
            <Headline text={d.headline} />
          </h2>
          <p className={`${BODY} text-ink-soft lg:col-span-5 lg:self-end`}>{d.body}</p>
        </div>
        <div className="mt-10 grid gap-6 lg:mt-16 lg:grid-cols-2">
          {d.places.map((place) => {
            const t = surfaces[place.surface]
            return (
              <article key={place.id} aria-labelledby={`sunlit-place-${place.id}`} className={`rounded-[2.5rem] p-4 sm:p-6 lg:p-8 ${t.card}`}>
                <div className="relative aspect-[3/2] overflow-hidden rounded-[2rem]">
                  <Photo photo={photos[place.photo]} sizes="(min-width: 1024px) 45vw, 100vw" />
                </div>
                <div className="px-2 pt-6 lg:pt-8">
                  <Eyebrow className={t.eyebrow}>
                    {place.when} · {place.country}
                  </Eyebrow>
                  <h3
                    id={`sunlit-place-${place.id}`}
                    className="mt-3 font-display text-[clamp(2.5rem,5.5vw,5rem)] font-bold leading-[0.95] tracking-[-0.02em] lg:text-[clamp(2.75rem,4.4vw,4.25rem)] [font-variation-settings:'opsz'_72,'wdth'_100]"
                  >
                    {place.name}
                  </h3>
                  <p className={`${BODY} mt-4`}>{place.body}</p>
                </div>
                <ol className="mt-8 grid gap-3">
                  {place.moments.map((m, i) => (
                    <li key={m.title} className={`grid grid-cols-[auto_1fr] gap-x-4 rounded-[1.25rem] p-4 sm:p-5 ${t.row}`}>
                      <span
                        aria-hidden="true"
                        className={`font-display text-[2.5rem] font-extrabold leading-none tabular-nums lg:text-[3.5rem] ${t.numeral}`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h4 className="font-display text-[1.25rem] font-semibold leading-[1.15] lg:text-[1.375rem]">{m.title}</h4>
                        <p className="mt-2 text-[1rem] leading-[1.6]">{m.body}</p>
                        <p className={`mt-3 inline-block rounded-full px-3 py-1 text-[0.8125rem] font-semibold ${t.pill}`}>{m.ages}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </article>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
