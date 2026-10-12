import { Container } from "@/components/ui"
import { SignupForm } from "@/components/signup/SignupForm"
import { site } from "@/content/site"
import { Body, FORM_LIGHT, H2, Micro, Words } from "./primitives"

export function Founding() {
  const { founding } = site
  return (
    <section id="founding" aria-labelledby="mm-founding-title" className="bg-bone py-28 lg:py-44">
      <Container>
        <div className="reveal text-center">
          <Micro>{founding.eyebrow}</Micro>
          <H2 id="mm-founding-title" className="mx-auto mt-8 max-w-[22ch]">
            <Words text={founding.headline} />
          </H2>
          <Body className="mx-auto mt-10 text-center">{founding.body}</Body>
        </div>
        <ol role="list" className="mx-auto mt-20 max-w-[44rem] lg:mt-28">
          {founding.perks.map((perk, i) => (
            <li key={perk.title} className="border-t border-mist py-10 text-center last:border-b">
              <Micro>
                <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              </Micro>
              <h3 className="mt-5 font-display text-[1.5rem] font-medium leading-[1.15] text-ink [font-variation-settings:'opsz'_36] lg:text-[1.75rem]">
                {perk.title}
              </h3>
              <Body className="mx-auto mt-4 text-center">{perk.body}</Body>
            </li>
          ))}
        </ol>
        <SignupForm
          source="founding"
          variant="light"
          cta={founding.form.cta}
          microcopy={founding.form.microcopy}
          className={`mx-auto mt-20 max-w-[36rem] ${FORM_LIGHT}`}
        />
      </Container>
    </section>
  )
}
