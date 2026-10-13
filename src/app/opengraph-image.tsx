import { ImageResponse } from "next/og"
import { photos } from "@/content/photos"
import { site } from "@/content/site"

const headline = [site.hero.headline.before, site.hero.headline.accent, site.hero.headline.after].filter(Boolean).join(" ")
export const alt = `${site.name} — ${headline}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Satori cannot reach next/image; fetch the bytes once and inline them.
async function heroDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(
      `https://images.unsplash.com/${photos.conchaFromIgueldo.src}?w=600&h=630&fit=crop&q=55&fm=jpg`,
      { cache: "force-cache" },
    )
    if (!res.ok) return null
    const type = res.headers.get("content-type") ?? "image/jpeg"
    const bytes = Buffer.from(await res.arrayBuffer())
    return `data:${type};base64,${bytes.toString("base64")}`
  } catch {
    return null
  }
}

export default async function OpengraphImage() {
  const hero = await heroDataUrl()
  const { before, accent, after } = site.hero.headline
  const headline = [before, accent, after].filter(Boolean).join(" ")
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#F4F1EA" }}>
        <div
          style={{
            width: "55%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px",
          }}
        >
          <div style={{ display: "flex", color: "#1A1A1A", fontSize: 28, letterSpacing: 10 }}>{site.name.toUpperCase()}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", width: 56, height: 1, background: "#D8C7A1" }} />
            <div style={{ display: "flex", marginTop: 32, maxWidth: 560, color: "#1A1A1A", fontSize: 64, lineHeight: 1.05 }}>{headline}</div>
          </div>
        </div>
        <div style={{ width: "45%", height: "100%", display: "flex" }}>
          {hero ? <img src={hero} alt="" width={540} height={630} style={{ width: 540, height: 630, objectFit: "cover" }} /> : null}
        </div>
      </div>
    ),
    { ...size },
  )
}
