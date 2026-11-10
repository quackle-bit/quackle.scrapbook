import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Served under a sub-path on the studio site (quacklebit.com/scrapbook): set NEXT_PUBLIC_BASE_PATH=/scrapbook
  // when building for it. Empty in local dev. Share links read the same variable (src/lib/site.ts).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  cacheComponents: true,
  partialPrefetching: true,
  // Dev only: let phones on the local network load the dev server (e.g. http://192.168.x.x:3000).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  // The old street and book are retired. /play stays only for the Studio and Jam streets (?mode=).
  async redirects() {
    return [
      { source: "/book", destination: "/", permanent: false },
      { source: "/prototype", destination: "/", permanent: false },
      {
        source: "/play",
        missing: [{ type: "query", key: "mode" }],
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
