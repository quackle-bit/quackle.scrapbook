import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
