import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { site } from "@/content/site"

export const metadata: Metadata = {
  title: site.pay.metaTitle,
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

/**
 * Where src/proxy.ts rewrites a /pay link with a malformed or unknown token. It reaches notFound()
 * while prerendering, so its 404 status is known before anything is sent, unlike /pay/[token],
 * which has already started streaming (and answered 200) by the time it finds no link.
 */
export default function MissingPayLink(): never {
  notFound()
}
