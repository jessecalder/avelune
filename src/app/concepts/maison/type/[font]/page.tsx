import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MaisonPage } from "@/components/concepts/maison/MaisonPage"
import { displayOptions, findDisplayOption } from "../options"

type Params = Promise<{ font: string }>

export function generateStaticParams() {
  return displayOptions.map((o) => ({ font: o.slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const opt = findDisplayOption((await params).font)
  return { title: opt ? `${opt.name} · Maison type trial` : "Maison type trial" }
}

/** The full Maison page with one candidate display face swapped in. */
export default async function MaisonTypeVariant({ params }: { params: Params }) {
  const opt = findDisplayOption((await params).font)
  if (!opt) notFound()
  return <MaisonPage display={opt} />
}
