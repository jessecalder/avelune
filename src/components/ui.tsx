import type { ReactNode } from "react"

/** Page gutter + max width. Sections wrap their content in this. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-12 ${className}`}>{children}</div>
}
