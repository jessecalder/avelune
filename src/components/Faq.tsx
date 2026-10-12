import { site } from "@/content/site"
import { Container, Eyebrow, HeadlineText, Rule } from "@/components/ui"

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="bg-bone py-20 lg:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
            <Rule />
            <Eyebrow className="mt-6">{site.faq.eyebrow}</Eyebrow>
            <h2
              id="faq-heading"
              className="display mt-6 text-[clamp(2.5rem,5.5vw,5rem)] font-semibold leading-[0.98] tracking-[-0.015em] text-ink"
            >
              <HeadlineText text={site.faq.headline} />
            </h2>
            <p className="mt-6 max-w-[36ch] text-[1.0625rem] leading-[1.55] text-stone">{site.faq.body}</p>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <div className="border-t border-ink/15">
              {site.faq.items.map((item) => (
                <details key={item.q} className="group border-b border-ink/15">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-[1.25rem] font-semibold leading-[1.2] text-ink [font-variation-settings:'opsz'_48,'SOFT'_0,'WONK'_0] lg:text-[1.5rem]">
                      {item.q}
                    </span>
                    <span
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-2xl leading-none text-ember transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-[62ch] pb-6 text-[1.0625rem] leading-[1.55] text-stone">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
