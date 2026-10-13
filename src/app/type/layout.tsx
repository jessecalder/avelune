import type { Metadata } from "next"
import { bodoni, cormorantDisplay, dmSerif, libreBodoni, marcellus, newsreader, prata } from "./fonts"
import "./type-trial.css"

export const metadata: Metadata = {
  title: "Type trial",
  robots: { index: false, follow: false },
}

/** Font variables for the candidate display faces. Not linked from the site. */
export default function TypeTrialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${bodoni.variable} ${prata.variable} ${marcellus.variable} ${libreBodoni.variable} ${newsreader.variable} ${cormorantDisplay.variable} ${dmSerif.variable}`}>
      {children}
    </div>
  )
}
