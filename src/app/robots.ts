import type { MetadataRoute } from "next"

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
/** Set SITE_NOINDEX=true on staging deploys so the whole site stays out of search engines. */
const noindex = process.env.SITE_NOINDEX === "true"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: noindex ? { userAgent: "*", disallow: "/" } : { userAgent: "*", allow: "/", disallow: ["/type", "/api/", "/deposit"] },
    sitemap: `${base}/sitemap.xml`,
  }
}
