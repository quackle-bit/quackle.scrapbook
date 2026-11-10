import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quackle Scrapbook",
    short_name: "Scrapbook",
    description:
      "A cozy desk for game ideas. Open packs, collect what sparks something, and build a game pitch. Less thinking. More tinkering.",
    start_url: "/",
    display: "standalone",
    background_color: "#2a1d16",
    theme_color: "#2a1d16",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
