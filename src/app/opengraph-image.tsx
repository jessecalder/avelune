import { ImageResponse } from "next/og"
import { photos } from "@/content/photos"

export const alt = "Avelune — the summer your kids will tell their kids about"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Satori cannot reach next/image; fetch the bytes once and inline them.
async function heroDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(
      `https://images.unsplash.com/${photos.conchaBlueHour.src}?w=1200&h=630&fit=crop&q=55&fm=jpg`,
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
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#14181F" }}>
        {hero ? (
          <img src={hero} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }} />
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background: "linear-gradient(to top, rgba(20,24,31,0.85), rgba(20,24,31,0.1))",
          }}
        />
        <div style={{ position: "absolute", top: 56, left: 64, display: "flex", alignItems: "center" }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <path d="M16 2A14 14 0 1 0 16 30A20 20 0 0 1 16 2Z" fill="#E8D9B5" />
          </svg>
          <div style={{ display: "flex", marginLeft: 16, color: "#E8D9B5", fontSize: 40, letterSpacing: -1 }}>avelune</div>
        </div>
        <div style={{ position: "absolute", left: 64, bottom: 56, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: "#E8D9B5", fontSize: 22, letterSpacing: 4 }}>SUMMER 2027 · SAN SEBASTIÁN · ANTIGUA</div>
          <div style={{ display: "flex", marginTop: 20, maxWidth: 900, color: "#F3EDE2", fontSize: 72, fontWeight: 700, lineHeight: 1.0 }}>
            The summer your kids will tell their kids about.
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
