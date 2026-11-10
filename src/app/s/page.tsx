import type { Metadata } from "next";
import { SharedEntry } from "@/components/summary/SharedEntry";
import "@/styles/scrapbook.css";
import "@/styles/route.css";
import "@/styles/book.css";
import "@/styles/pitch.css";

export const metadata: Metadata = {
  title: "A game pitch · Quackle Scrapbook",
  description: "A game pitch made with Quackle Scrapbook.",
  // Shared pitches are personal; keep them out of search results.
  robots: { index: false, follow: true },
};

export default function SharedPage() {
  return <SharedEntry />;
}
