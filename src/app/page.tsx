import { Mark, Wordmark } from "@/components/Wordmark"

export default function Home() {
  return (
    <main className="min-h-dvh px-6 py-10">
      <div className="flex items-end gap-12">
        <Mark width={220} height={220} />
        <Wordmark size={96} />
        <Wordmark size={28} />
        <Wordmark size={18} />
      </div>
      <div className="mt-10 inline-flex items-center gap-10 bg-ink p-10 text-bone">
        <Mark width={120} height={120} />
        <Wordmark size={48} className="text-moon" />
      </div>
      <h1 className="display mt-16 max-w-[18ch] text-[clamp(2.75rem,8vw,7rem)]">
        The summer your kids will tell <span className="display-italic">their</span> kids about.
      </h1>
      <p className="eyebrow mt-6 text-ember">Summer 2027 · Founding families</p>
      <p className="reveal measure mt-[120vh] text-xl">Reveal check (scroll-driven).</p>
    </main>
  )
}
