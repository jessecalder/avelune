import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Avelune" },
  robots: { index: false, follow: false },
}

/**
 * Shared by the login route group and the signed-in route group. The chrome (top bar, nav, sign out)
 * lives in (app)/layout.tsx so the login page stays bare.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children
}
