import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SunlitPage } from "@/components/concepts/sunlit/SunlitPage"
import { displayOptions, findDisplayOption } from "../options"

type Params = Promise<{ font: string }>

export function generateStaticParams() {
  return displayOptions.map((o) => ({ font: o.slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const opt = findDisplayOption((await params).font)
  return { title: opt ? `${opt.name} · Sunlit type trial` : "Sunlit type trial" }
}

/** The full Sunlit page with one candidate display face swapped in. */
export default async function SunlitTypeVariant({ params }: { params: Params }) {
  const opt = findDisplayOption((await params).font)
  if (!opt) notFound()
  return <SunlitPage display={opt} />
}
