import { site } from "@/content/site"
import { photos } from "@/content/photos"
import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { BODY, Eyebrow, H2, Headline } from "./parts"

/** ember cards carry ink text (4.7:1); bone on #D9633B is only 3.4:1. */
const tints = [
  { card: "bg-bone-deep text-ink", eyebrow: "text-stone" },
  { card: "bg-atlantic text-bone", eyebrow: "text-bone" },
  { card: "bg-cacao text-ink", eyebrow: "text-ink" },
  { card: "bg-ember text-ink", eyebrow: "text-ink" },
  { card: "bg-moon text-ink", eyebrow: "text-stone" },
] as const

export function EveryAge() {
  const e = site.everyAge
  return (
    <section aria-labelledby="sunlit-every-age" className="py-16 lg:py-24">
      <Container>
        <Eyebrow className="text-stone">{e.eyebrow}</Eyebrow>
        <div className="mt-5 grid gap-6 lg:grid-cols-12 lg:gap-12">
          <h2 id="sunlit-every-age" className={`${H2} reveal lg:col-span-7`}>
            <Headline text={e.headline} />
          </h2>
          <p className={`${BODY} text-ink-soft lg:col-span-5 lg:self-end`}>{e.body}</p>
        </div>
        <blockquote className="mt-12 max-w-[26ch] font-display text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[1.02] tracking-[-0.02em] text-ember text-balance lg:mt-20 [font-variation-settings:'opsz'_72,'wdth'_100]">
          {e.quote}
        </blockquote>
        <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:mt-16 lg:grid-cols-6 xl:grid-cols-5">
          {e.tiers.map((tier, i) => {
            const t = tints[i % tints.length]
            return (
              <li
                key={tier.name}
                className={`reveal flex flex-col rounded-[1.5rem] p-4 lg:p-5 ${t.card} ${i < 3 ? "lg:col-span-2" : "lg:col-span-3"} xl:col-span-1`}
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem]">
                  <Photo photo={photos[tier.photo]} sizes="(min-width: 1280px) 20vw, (min-width: 768px) 45vw, 100vw" />
                </div>
                <p className="mt-5 break-words font-display text-[4rem] font-extrabold leading-none tracking-[-0.03em] xl:text-[clamp(2.5rem,3.4vw,3.5rem)] [font-variation-settings:'opsz'_96,'wdth'_100]">
                  {tier.range}
                </p>
                <Eyebrow className={`mt-4 ${t.eyebrow}`}>{tier.name}</Eyebrow>
                <p className="mt-3 text-[0.9375rem] leading-[1.55]">{tier.body}</p>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}
