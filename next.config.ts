import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Standalone build produces a minimal, self-contained server bundle —
  // ideal for Docker / non-Vercel Node hosting (see Dockerfile).
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Next.js dev server blocks cross-origin requests to _next/static assets
  // by default (only localhost + the origin it was started with are
  // allowed). Without this, opening the dev server from a phone via the
  // computer's LAN IP (e.g. http://192.168.1.2:3000) returns 403 for every
  // JS/CSS chunk, producing a blank/unstyled page on mobile. This only
  // affects `next dev`; production builds are unaffected.
  allowedDevOrigins: [
    "*.local",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    ...(process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
  ],

  images: {
    formats: ["image/avif", "image/webp"],
    // Next 16 blocks local image srcs that include a query string unless
    // explicitly allow-listed (anti-enumeration default). /api/profile-photo
    // (src/app/api/profile-photo/route.ts) uses one for cache-busting.
    localPatterns: [{ pathname: "/api/profile-photo" }],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
