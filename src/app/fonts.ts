import { Jost, Playfair_Display } from "next/font/google"

/** Playfair Display is the display face (no optical-size axis); Jost is the text face. */
export const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-playfair",
})

export const jost = Jost({ subsets: ["latin"], display: "swap", variable: "--font-jost" })
