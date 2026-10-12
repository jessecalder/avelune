import { Index } from "@/components/ui"

type Moment = { title: string; body: string; ages: string }

const surfaces = {
  atlantic: "bg-atlantic",
  cacao: "bg-cacao",
} as const

/** Horizontal scroll-snap rail of moment cards under a destination panel. */
export function MomentsRail({
  moments,
  surface,
  label,
}: {
  moments: readonly Moment[]
  surface: keyof typeof surfaces
  label: string
}) {
  return (
    <div className={surfaces[surface]}>
      {/* Focusable so keyboard users can scroll the rail with the arrow keys. */}
      <ul
        aria-label={label}
        tabIndex={0}
        className="flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 py-10 sm:scroll-px-6 sm:px-6 lg:scroll-px-12 lg:px-12 lg:py-14 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {moments.map((moment, i) => (
          <li
            key={moment.title}
            className="group flex min-h-[22rem] w-[85vw] shrink-0 snap-start flex-col border border-moon/20 p-6 sm:w-[22rem] lg:p-7"
          >
            <Index n={i + 1} className="text-6xl text-moon/60 transition-colors duration-200 group-hover:text-moon" />
            <h3 className="mt-4 font-display text-[1.5rem] font-semibold leading-[1.1] text-moon [font-variation-settings:'opsz'_48,'SOFT'_0,'WONK'_0] lg:text-[1.75rem]">
              {moment.title}
            </h3>
            <p className="mt-3 text-base leading-[1.5] text-bone">{moment.body}</p>
            <p className="mt-auto pt-6">
              <span className="inline-flex border border-moon/60 px-3 py-1 text-xs font-medium text-moon">{moment.ages}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
