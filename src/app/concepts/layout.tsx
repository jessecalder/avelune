import type { Metadata } from "next"
import Link from "next/link"
import { concepts } from "./concepts"
import {
  archivo,
  bodoni,
  bricolage,
  cormorant,
  familjen,
  figtree,
  gabarito,
  gilda,
  gloock,
  hanken,
  inter,
  josefin,
  jost,
  plexMono,
  sora,
  unbounded,
  youngSerif,
  playfair,
  prata,
  marcellus,
  libreBodoni,
  newsreader,
  cormorantDisplay,
  dmSerif,
} from "./fonts"
import "./sunlit/type/type-trial.css"

export const metadata: Metadata = {
  title: "Design concepts",
  robots: { index: false, follow: false },
}

/** Switcher bar + font variables shared by every concept route. Not linked from the site. */
export default function ConceptsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${cormorant.variable} ${inter.variable} ${bricolage.variable} ${figtree.variable} ${archivo.variable} ${plexMono.variable} ${gabarito.variable} ${sora.variable} ${familjen.variable} ${unbounded.variable} ${youngSerif.variable} ${gloock.variable} ${bodoni.variable} ${jost.variable} ${gilda.variable} ${josefin.variable} ${hanken.variable} ${playfair.variable} ${prata.variable} ${marcellus.variable} ${libreBodoni.variable} ${newsreader.variable} ${cormorantDisplay.variable} ${dmSerif.variable}`}>
      <nav aria-label="Design concepts" className="sticky top-0 z-50 flex flex-wrap items-center gap-x-5 gap-y-1 bg-[#14181f] px-4 py-2 text-[13px] text-[#f3ede2]/80 sm:px-6">
        <Link href="/concepts" className="font-medium text-[#f3ede2] hover:underline">
          Concepts
        </Link>
        {concepts.map((c) => (
          <Link key={c.slug} href={`/concepts/${c.slug}`} className="hover:text-[#f3ede2] hover:underline">
            {c.name}
          </Link>
        ))}
        <Link href="/" className="ml-auto hover:text-[#f3ede2] hover:underline">
          Current site →
        </Link>
      </nav>
      {children}
    </div>
  )
}
