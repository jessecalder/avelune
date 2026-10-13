/** Candidate display faces for the type trial only (see ./options.ts). Playfair Display is global. */
import { Bodoni_Moda, Cormorant, DM_Serif_Display, Libre_Bodoni, Marcellus, Newsreader, Prata } from "next/font/google"

export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-bodoni",
  axes: ["opsz"],
})
export const prata = Prata({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-prata" })
export const marcellus = Marcellus({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-marcellus" })
export const libreBodoni = Libre_Bodoni({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-libre-bodoni" })
export const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-newsreader", axes: ["opsz"] })
export const cormorantDisplay = Cormorant({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-cormorant-display" })
export const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap", variable: "--font-dm-serif" })
