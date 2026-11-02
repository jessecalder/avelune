import { site } from "@/content/site"
import { MICRO_CLASS } from "./primitives"

/**
 * Sticky row of in-page links under the header. When it is wider than the screen
 * it scrolls sideways, hinted by a fixed 2.5rem fade on the right edge (shorter than
 * the row's end padding, so the last link is never dimmed once scrolled, and turned
 * off while a link has keyboard focus). Safe centring keeps the first link reachable.
 */
export function SectionNav() {
  return (
    <nav aria-label={site.nav.label} className="sticky top-0 z-40 border-b border-mist bg-bone/95 backdrop-blur-sm">
      <ul className="mx-auto flex h-12 max-w-[1440px] items-center gap-8 overflow-x-auto px-4 [justify-content:safe_center] [mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)] focus-within:[mask-image:none] [scrollbar-width:none] sm:px-6 lg:gap-12 lg:px-12 xl:[mask-image:none] [&::-webkit-scrollbar]:hidden">
        {site.nav.items.map((item, i) => (
          <li key={item.href} className={`shrink-0 ${i === site.nav.items.length - 1 ? "pr-16 xl:pr-0" : ""}`}>
            <a
              href={item.href}
              className={`${MICRO_CLASS} block whitespace-nowrap text-ink-soft underline decoration-transparent decoration-1 underline-offset-[10px] transition-colors hover:text-ink hover:decoration-ink`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
