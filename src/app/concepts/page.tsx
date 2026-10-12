import Link from "next/link"
import { Container } from "@/components/ui"
import { concepts } from "./concepts"

export default function ConceptsIndex() {
  return (
    <main className="min-h-dvh bg-bone py-16 lg:py-24">
      <Container>
        <p className="eyebrow text-ember">Avelune · design concepts</p>
        <h1 className="display mt-4 max-w-[18ch] text-[clamp(2.5rem,5vw,4.5rem)] font-semibold text-ink">
          Three directions that differ from the current site.
        </h1>
        <p className="measure mt-6 text-lg text-ink">
          Same copy, same photographs, same signup form. Only the design system changes. Each page is a full-length draft so the
          direction can be judged at real size on desktop and phone.
        </p>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {concepts.map((c, i) => (
            <li key={c.slug} className="border border-ink/15 p-6">
              <p className="eyebrow text-stone">Concept {String.fromCharCode(65 + i)}</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-ink">{c.name}</h2>
              <p className="mt-3 text-[1.0625rem] leading-[1.55] text-ink">{c.blurb}</p>
              <Link href={`/concepts/${c.slug}`} className="mt-6 inline-flex h-12 items-center bg-ember px-5 font-medium text-bone hover:bg-ember-deep">
                Open {c.name} →
              </Link>
              {c.slug === "sunlit" ? (
                <Link href="/concepts/sunlit/type" className="ml-4 inline-flex h-12 items-center text-ember underline-offset-4 hover:underline">
                  Type trial →
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="mt-12 text-[0.9375rem] text-stone">
          The current site is the editorial direction:{" "}
          <Link href="/" className="underline underline-offset-4">
            open it
          </Link>
          . These pages are hidden from search engines and not linked from the site.
        </p>
      </Container>
    </main>
  )
}
