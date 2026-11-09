import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "quackle.scrapbook",
    short_name: "scrapbook",
    description:
      "Open card packs, QUACK the bad ideas, tape the good ones into a scrapbook of game concepts.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f0e1",
    theme_color: "#f6f0e1",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
