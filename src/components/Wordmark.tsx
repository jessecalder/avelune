import type { SVGProps } from "react"

/**
 * The mark: a bold crescent (ave·lune) with a swallow gliding out of its
 * hollow. Single colour, inherits currentColor, legible at 16px.
 */
export function Mark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" fill="none" {...props}>
      <path d="M16 2A14 14 0 1 0 16 30A20 20 0 0 1 16 2Z" fill="currentColor" />
      <path
        d="M11.5 15.6C14.2 11.4 17.4 11.4 19.8 15.1C22.2 11 25.4 11 28.4 14.6"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type WordmarkProps = {
  className?: string
  /** Pixel size of the mark; the word scales with it. */
  size?: number
  withMark?: boolean
}

export function Wordmark({ className = "", size = 28, withMark = true }: WordmarkProps) {
  return (
    <span className={`inline-flex items-center gap-[0.4em] ${className}`} style={{ fontSize: size }}>
      {withMark && <Mark width={size * 0.92} height={size * 0.92} className="shrink-0" />}
      <span className="wordmark leading-none" style={{ fontSize: "1.05em" }}>
        avelune
      </span>
    </span>
  )
}
