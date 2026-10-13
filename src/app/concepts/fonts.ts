import { Archivo, Bricolage_Grotesque, Cormorant_Garamond, Figtree, IBM_Plex_Mono, Inter } from "next/font/google"

/** Concept A — Quiet Paper */
export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cormorant",
})
export const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" })

/** Concept B — Sunlit */
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
  axes: ["opsz", "wdth"],
})
export const figtree = Figtree({ subsets: ["latin"], display: "swap", variable: "--font-figtree" })

/** Concept C — Night Atlas */
export const archivo = Archivo({ subsets: ["latin"], display: "swap", variable: "--font-archivo", axes: ["wdth"] })
export const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-plex-mono" })

/** Sunlit type trial — candidate display faces (see src/app/concepts/sunlit/type/options.ts). */
import { Familjen_Grotesk, Gabarito, Gloock, Sora, Unbounded, Young_Serif } from "next/font/google"

export const gabarito = Gabarito({ subsets: ["latin"], display: "swap", variable: "--font-gabarito" })
export const sora = Sora({ subsets: ["latin"], display: "swap", variable: "--font-sora" })
export const familjen = Familjen_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-familjen" })
export const unbounded = Unbounded({ subsets: ["latin"], display: "swap", variable: "--font-unbounded" })
export const youngSerif = Young_Serif({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-young-serif" })
export const gloock = Gloock({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-gloock" })

/** Concept D — Maison (couture ivory) */
import { Bodoni_Moda, Jost } from "next/font/google"
export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-bodoni",
  axes: ["opsz"],
})
export const jost = Jost({ subsets: ["latin"], display: "swap", variable: "--font-jost" })

/** Concept E — Nocturne (private club, after dark) */
import { Gilda_Display, Hanken_Grotesk, Josefin_Sans } from "next/font/google"
export const gilda = Gilda_Display({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-gilda" })
export const josefin = Josefin_Sans({ subsets: ["latin"], display: "swap", variable: "--font-josefin" })
export const hanken = Hanken_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-hanken" })

/** Maison type trial — readable high-end serifs. */
import { Cormorant, DM_Serif_Display, Libre_Bodoni, Marcellus, Newsreader, Playfair_Display, Prata } from "next/font/google"
export const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-playfair" })
export const prata = Prata({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-prata" })
export const marcellus = Marcellus({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-marcellus" })
export const libreBodoni = Libre_Bodoni({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-libre-bodoni" })
export const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-newsreader", axes: ["opsz"] })
export const cormorantDisplay = Cormorant({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-cormorant-display" })
export const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap", variable: "--font-dm-serif" })
