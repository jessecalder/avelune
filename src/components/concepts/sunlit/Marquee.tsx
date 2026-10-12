import { site } from "@/content/site"

const keyframes = "@keyframes sunlit-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}"

/** Place names and moment titles on a loop; the same list is exposed once, statically, to assistive tech. */
export function Marquee() {
  const items = site.destinations.places.flatMap((p) => [p.name, ...p.moments.map((m) => m.title)])
  const track = (
    <ul className="flex shrink-0 items-center">
      {items.map((label, i) => (
        <li key={`${label}-${i}`} className="flex items-center whitespace-nowrap">
          <span>{label}</span>
          <span aria-hidden="true" className="mx-6 text-[1.25rem] lg:mx-8">
            ●
          </span>
        </li>
      ))}
    </ul>
  )
  return (
    <div className="overflow-hidden bg-cacao py-4 text-ink lg:py-5">
      <style>{keyframes}</style>
      <ul className="sr-only" aria-label="Places and moments">
        {items.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      <div
        aria-hidden="true"
        className="flex w-max font-display text-[1.5rem] font-bold uppercase leading-none [animation:sunlit-marquee_40s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:[animation:none]"
      >
        {track}
        {track}
      </div>
    </div>
  )
}
