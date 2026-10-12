import { Container } from "@/components/ui"
import { site } from "@/content/site"
import { BODY, GRID, H2, H3, Num, SectionLabel, Title } from "./parts"

export function Protocol() {
  const { howItWorks } = site
  return (
    <section aria-labelledby="how-heading" className={`bg-ink py-20 lg:py-32 ${GRID}`}>
      <Container>
        <div className="reveal grid gap-8 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            <SectionLabel>{howItWorks.eyebrow}</SectionLabel>
            <h2 id="how-heading" className={`${H2} mt-6 text-bone`}>
              <Title text={howItWorks.headline} />
            </h2>
          </div>
          <p className={`${BODY} max-w-[52ch] lg:col-span-5 lg:self-end`}>{howItWorks.body}</p>
        </div>
        <ol className="mt-16 grid gap-x-16 lg:mt-24 lg:grid-cols-2">
          {howItWorks.pillars.map((pillar, i) => (
            <li key={pillar.title} className="reveal border-t border-moon/40 pb-12 pt-6">
              <Num n={i + 1} />
              <h3 className={`${H3} mt-4 text-bone`}>{pillar.title}</h3>
              <p className={`${BODY} mt-4 max-w-[52ch]`}>{pillar.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
