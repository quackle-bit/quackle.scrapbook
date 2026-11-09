import type { Metadata, Viewport } from "next";
import { Caveat, Pixelify_Sans, Silkscreen } from "next/font/google";
import "./globals.css";

/** Display: Silkscreen (card words, titles). UI: Pixelify Sans (readable pixel). Notes: Caveat. */
const pixel = Silkscreen({ variable: "--font-pixel", weight: ["400", "700"], subsets: ["latin"] });
const ui = Pixelify_Sans({ variable: "--font-body", subsets: ["latin"] });
const hand = Caveat({ variable: "--font-hand", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "quackle.scrapbook",
  description: "A card-hunting game-idea scrapbook by quackle.bit.",
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
      <body>{children}</body>
    </html>
  );
}
