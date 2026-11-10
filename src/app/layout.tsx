import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Nunito, Pixelify_Sans, Silkscreen } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";
import "@/styles/desk.css";
import "@/styles/pixel.css";

/** Display: Silkscreen (card words, titles). UI: Pixelify Sans (readable pixel). Notes: Caveat. */
const pixel = Silkscreen({ variable: "--font-pixel", weight: ["400", "700"], subsets: ["latin"] });
const ui = Pixelify_Sans({ variable: "--font-body", subsets: ["latin"] });
const hand = Caveat({ variable: "--font-hand", subsets: ["latin"] });
/** Desk redesign: warm serif for headings, rounded sans for body. */
const display = Fraunces({ variable: "--font-display", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-ui", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "quackle.scrapbook", template: "%s" },
  description:
    "A cozy desk for game ideas by quackle.bit. Open packs, collect what sparks something, stamp it into your scrapbook and end up with a game pitch. Less thinking. More tinkering.",
  applicationName: "quackle.scrapbook",
  authors: [{ name: "quackle.bit", url: "https://quacklebit.com" }],
  openGraph: {
    type: "website",
    siteName: "quackle.scrapbook",
    title: "quackle.scrapbook",
    description: "Open packs, collect ideas, build a game pitch. Less thinking. More tinkering.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2a1d16",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pixel.variable} ${ui.variable} ${hand.variable} ${display.variable} ${nunito.variable}`}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
