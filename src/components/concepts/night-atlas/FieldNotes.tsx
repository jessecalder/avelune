import { Container } from "@/components/ui"
import { site } from "@/content/site"
import { BODY, GRID, H2, MONO, SectionLabel, Title } from "./parts"

export function FieldNotes() {
  const { faq } = site
  return (
    <section aria-labelledby="faq-heading" className={`bg-ink py-20 lg:py-32 ${GRID}`}>
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-x-12">
          <div className="reveal lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
            <SectionLabel>{faq.eyebrow}</SectionLabel>
            <h2 id="faq-heading" className={`${H2} mt-6 text-bone`}>
              <Title text={faq.headline} />
            </h2>
            <p className={`${BODY} mt-6 max-w-[36ch]`}>{faq.body}</p>
          </div>
          <div className="border-b border-moon/40 lg:col-span-7 lg:col-start-6">
            {faq.items.map((item, i) => (
              <details key={item.q} className="group border-t border-moon/40">
                <summary className="flex cursor-pointer list-none items-start gap-4 py-5 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden="true" className={`${MONO} w-7 shrink-0 pt-[0.35rem] text-[0.75rem] tracking-[0.12em] text-moon`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="flex-1 font-display text-[1.125rem] font-semibold uppercase leading-[1.2] tracking-[0.02em] text-bone [font-variation-settings:'wdth'_80] lg:text-[1.375rem]">
                    {item.q}
                  </h3>
                  <span aria-hidden="true" className={`${MONO} shrink-0 text-[1.25rem] leading-none text-moon`}>
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">−</span>
                  </span>
                </summary>
                <p className={`${BODY} max-w-[62ch] pb-7 pl-11`}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
