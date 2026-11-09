import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Caveat, Pixelify_Sans, Silkscreen } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

/** Display: Silkscreen (card words, titles). UI: Pixelify Sans (readable pixel). Notes: Caveat. */
const pixel = Silkscreen({ variable: "--font-pixel", weight: ["400", "700"], subsets: ["latin"] });
const ui = Pixelify_Sans({ variable: "--font-body", subsets: ["latin"] });
const hand = Caveat({ variable: "--font-hand", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "quackle.scrapbook", template: "%s" },
  description:
    "A game-idea toy by quackle.bit: open card packs, QUACK the bad ideas, tape the good ones into a scrapbook. Every spread is a pixel-art game concept.",
  applicationName: "quackle.scrapbook",
  authors: [{ name: "quackle.bit", url: "https://quacklebit.com" }],
  openGraph: {
    type: "website",
    siteName: "quackle.scrapbook",
    title: "quackle.scrapbook",
    description: "Open card packs, QUACK bad ideas, forge a game concept.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f0e1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pixel.variable} ${ui.variable} ${hand.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
