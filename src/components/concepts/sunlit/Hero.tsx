import { site } from "@/content/site"
import { photos } from "@/content/photos"
import { Photo } from "@/components/Photo"
import { Eyebrow, H1, Headline, RoundForm, SOFT_SHADOW } from "./parts"

export function Hero() {
  const { hero, firstSummer } = site
  return (
    <section aria-labelledby="sunlit-hero" className="bg-bone">
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-12">
        <div className="order-1 px-4 pb-4 pt-0 sm:px-6 lg:order-2 lg:col-span-6 lg:p-6 lg:pl-0">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] lg:aspect-auto lg:h-full lg:min-h-[calc(100svh-5rem)] lg:rounded-[2.5rem]">
            <Photo
              photo={photos.conchaAerial}
              preload
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="animate-settle"
            />
            <ul
              className={`absolute inset-x-3 bottom-3 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 rounded-[1.5rem] bg-bone/95 px-4 py-3 text-ink backdrop-blur sm:inset-x-auto sm:left-5 sm:bottom-5 sm:justify-start sm:gap-x-6 sm:rounded-full sm:px-6 lg:left-6 lg:bottom-6 ${SOFT_SHADOW}`}
            >
              {firstSummer.stats.map((s) => (
                <li key={s.label} className="flex items-baseline gap-1.5 text-[0.875rem] sm:text-base">
                  <span className="font-display text-[1.375rem] font-extrabold leading-none sm:text-[1.625rem]">{s.value}</span>
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="order-2 flex flex-col justify-center px-4 pb-14 pt-8 sm:px-6 lg:order-1 lg:col-span-6 lg:py-16 lg:pl-12 lg:pr-10">
          <Eyebrow className="text-stone">{hero.eyebrow}</Eyebrow>
          <h1
            id="sunlit-hero"
            className={`${H1} mt-5 text-[clamp(3.25rem,12vw,5.5rem)] lg:text-[clamp(3.5rem,6.2vw,7rem)] [overflow-wrap:break-word]`}
          >
            <Headline text={hero.headline} />
          </h1>
          <p className="mt-6 max-w-[40ch] text-[1.125rem] leading-[1.6] text-ink-soft lg:hidden">{hero.subheadMobile}</p>
          <p className="mt-6 hidden max-w-[44ch] text-[1.1875rem] leading-[1.6] text-ink-soft lg:block">{hero.subhead}</p>
          <div className="mt-8 max-w-xl">
            <RoundForm source="hero" variant="light" cta={hero.cta} microcopy={hero.microcopy} />
          </div>
        </div>
      </div>
    </section>
  )
}
