import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Stage 1 hotlinks Unsplash through a custom loader (src/components/Photo.tsx).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }],
    qualities: [60, 75, 85],
  },
  // www.avelunefamily.com is attached to the same Railway service; send it to the bare domain.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.avelunefamily.com" }],
        destination: "https://avelunefamily.com/:path*",
        permanent: true,
      },
    ]
  },
  // The private payment page is a bearer link: keep it out of search, caches and Referer headers.
  async headers() {
    return [
      {
        source: "/pay/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ]
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
