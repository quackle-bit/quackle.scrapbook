import { BASE_PATH } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quackle Scrapbook",
    short_name: "Scrapbook",
    description:
      "A cozy desk for game ideas. Open packs, collect what sparks something, and build a game pitch. Less thinking. More tinkering.",
    start_url: `${BASE_PATH}/`,
    display: "standalone",
    background_color: "#2a1d16",
    theme_color: "#2a1d16",
    icons: [
      { src: `${BASE_PATH}/icon.png`, sizes: "256x256", type: "image/png" },
      { src: `${BASE_PATH}/apple-icon.png`, sizes: "180x180", type: "image/png" },
    ],
  };
}

// Static file, so it works in the GitHub Pages export too.
export const dynamic = "force-static";
