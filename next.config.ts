import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 builds the plain-files version for GitHub Pages (see .github/workflows/pages.yml):
 * no server, so no redirects, no image optimisation, and the server-only routes (Claude Appraiser,
 * login/Studio, Jam, Pitch Wall, the old street) are removed by the workflow before building.
 */
const STATIC = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Served under a sub-path of the studio site (quacklebit.com/scrapbook). The Pages workflow sets
  // NEXT_PUBLIC_BASE_PATH from the repo name; empty in local dev. Share links read it too (src/lib/site.ts).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  ...(STATIC
    ? {
        output: "export" as const,
        images: { unoptimized: true },
        // /scrapbook/about/ -> about/index.html, which GitHub Pages serves without extra setup.
        trailingSlash: true,
      }
    : {
        // Dev only: let phones on the local network load the dev server (e.g. http://192.168.x.x:3000).
        allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
        // The old street is retired. /play stays only for the Studio and Jam streets (?mode=).
        async redirects() {
          return [
            { source: "/prototype", destination: "/", permanent: false },
            {
              source: "/play",
              missing: [{ type: "query", key: "mode" }],
              destination: "/",
              permanent: false,
            },
          ];
        },
      }),
};

export default nextConfig;
