import { Container } from "@/components/ui"
import { site } from "@/content/site"
import { Body, H2, Micro, Words } from "./primitives"

export function Faq() {
  const { faq } = site
  return (
    <section aria-labelledby="mm-faq-title" className="bg-bone py-28 lg:py-44">
      <Container>
        <div className="mx-auto max-w-[44rem]">
          <div className="reveal text-center">
            <Micro>{faq.eyebrow}</Micro>
            <H2 id="mm-faq-title" className="mt-8">
              <Words text={faq.headline} />
            </H2>
            <Body className="mx-auto mt-10 text-center">{faq.body}</Body>
          </div>
          <div className="mt-20 border-b border-mist lg:mt-28">
            {faq.items.map((item) => (
              <details key={item.q} className="group border-t border-mist">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-8 py-7 [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-[1.25rem] font-medium leading-[1.3] text-ink lg:text-[1.5rem]">
                    {item.q}
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="size-4 shrink-0 text-stone transition-transform duration-500 group-open:rotate-45"
                  >
                    <path d="M8 0v16M0 8h16" stroke="currentColor" strokeWidth="1" fill="none" />
                  </svg>
                </summary>
                <p className="max-w-[56ch] pb-9 pr-12 font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
