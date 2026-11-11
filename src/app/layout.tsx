import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Nunito, Pixelify_Sans, Silkscreen } from "next/font/google";
import { METADATA_BASE } from "@/lib/site";
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

/** What a shared link says: what it is, what you do, what you get, what it costs. */
const TITLE = "Quackle Scrapbook · Game idea generator for jams";
const DESCRIPTION =
  "Stuck on a game idea? Open card packs for mechanics, a twist, mood and look, keep what sparks, and get a one-page game pitch to share with your team. Free, no sign-up. By quackle.bit.";

export const metadata: Metadata = {
  metadataBase: new URL(METADATA_BASE),
  title: { default: TITLE, template: "%s" },
  description: DESCRIPTION,
  applicationName: "Quackle Scrapbook",
  authors: [{ name: "quackle.bit", url: "https://quacklebit.com" }],
  openGraph: {
    type: "website",
    siteName: "Quackle Scrapbook by quackle.bit",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
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
        {/* Vercel analytics only exists on Vercel hosting, not in the GitHub Pages export. */}
        {process.env.STATIC_EXPORT !== "1" && <Analytics />}
      </body>
    </html>
  );
}
