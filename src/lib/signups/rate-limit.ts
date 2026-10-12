// Per-process sliding window. Fine for a single Railway/Vercel instance; each
// instance keeps its own counts, so swap for Upstash (or similar) when scaling out.

const MAX_KEYS = 10_000

export type RateLimiterOptions = {
  limit: number
  windowMs: number
  now?: () => number
}

export function createRateLimiter({
  limit,
  windowMs,
  now = () => Date.now(),
}: RateLimiterOptions) {
  const hits = new Map<string, number[]>()

  return {
    check(key: string): { ok: boolean; retryAfterMs: number } {
      const t = now()
      const cutoff = t - windowMs

      for (const [k, stamps] of hits) {
        const live = stamps.filter((s) => s > cutoff)
        if (live.length === 0) hits.delete(k)
        else if (live.length !== stamps.length) hits.set(k, live)
      }

      const stamps = hits.get(key) ?? []
      if (stamps.length >= limit) {
        return { ok: false, retryAfterMs: Math.max(0, stamps[0] + windowMs - t) }
      }

      stamps.push(t)
      // Re-insert so Map order tracks recency of last activity.
      hits.delete(key)
      hits.set(key, stamps)

      while (hits.size > MAX_KEYS) {
        const oldest = hits.keys().next().value
        if (oldest === undefined) break
        hits.delete(oldest)
      }
      return { ok: true, retryAfterMs: 0 }
    },
  }
}
