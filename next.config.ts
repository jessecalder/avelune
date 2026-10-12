import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Stage 1 hotlinks Unsplash through a custom loader (src/components/Photo.tsx).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }],
    qualities: [60, 75, 85],
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
