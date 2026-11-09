import type { Metadata } from "next";
import { SharedView } from "@/components/book/SharedView";
import "@/styles/scrapbook.css";
import "@/styles/route.css";
import "@/styles/book.css";

export const metadata: Metadata = {
  title: "A game idea · quackle.scrapbook",
  description: "A spread from someone's quackle.scrapbook idea book.",
  // Shared spreads are personal; keep them out of search results.
  robots: { index: false, follow: true },
};

export default function SharedPage() {
  return <SharedView />;
}
