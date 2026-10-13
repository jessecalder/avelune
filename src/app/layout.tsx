import type { Metadata, Viewport } from "next"
import { fraunces, instrumentSans } from "./fonts"
import "./globals.css"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Avelune — The summer your kids will tell their kids about",
    template: "%s · Avelune",
  },
  description:
    "Avelune plans one extraordinary summer journey a year for a small group of families. San Sebastián and Antigua, summer 2027. Every age genuinely in on it, every detail handled. Sign up for early access.",
  openGraph: {
    type: "website",
    siteName: "Avelune",
    title: "Avelune — The summer your kids will tell their kids about",
    description:
      "Meticulously planned summer journeys for families travelling together. San Sebastián and Antigua, 2027. Early access is open.",
    url: siteUrl,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
  robots: process.env.SITE_NOINDEX === "true" ? { index: false, follow: false } : { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: "#14181f",
  colorScheme: "light",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${instrumentSans.variable}`} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  )
}
