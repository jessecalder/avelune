import { Fraunces, Instrument_Sans } from "next/font/google"

/**
 * Fraunces carries the brand: optical size 144 for display, SOFT 0 / WONK 0
 * for headlines (crisp), WONK 1 only in the wordmark. Axis tags are validated
 * by next/font and case-sensitive.
 */
export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
})

export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
})
