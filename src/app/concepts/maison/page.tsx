import type { Metadata } from "next"
import { MaisonPage } from "@/components/concepts/maison/MaisonPage"

export const metadata: Metadata = { title: "Maison · concept" }

export default function Page() {
  return <MaisonPage />
}
