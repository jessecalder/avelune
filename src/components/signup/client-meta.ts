/** Browser-only context sent with a signup: utm_* params and the referrer. */
export function readClientMeta(): { utm: string; referrer: string } {
  if (typeof window === "undefined") return { utm: "", referrer: "" }
  const utm: Record<string, string> = {}
  let count = 0
  for (const [key, value] of new URLSearchParams(window.location.search)) {
    if (!key.startsWith("utm_") || count >= 10) continue
    utm[key.slice(0, 40)] = value.slice(0, 200)
    count += 1
  }
  return {
    utm: count > 0 ? JSON.stringify(utm) : "",
    referrer: document.referrer.slice(0, 500),
  }
}
