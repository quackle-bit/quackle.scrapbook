import type { Metadata } from "next";
import { Caveat, Inter, Silkscreen } from "next/font/google";
import "./globals.css";

const pixel = Silkscreen({ variable: "--font-pixel", weight: ["400", "700"], subsets: ["latin"] });
const hand = Caveat({ variable: "--font-hand", subsets: ["latin"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "quackle.scrapbook",
  description: "A card-hunting game-idea scrapbook by quackle.bit.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pixel.variable} ${hand.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
