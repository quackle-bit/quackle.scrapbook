import type { Metadata } from "next";
import { StudioApp } from "@/components/studio/StudioApp";
import "@/styles/scrapbook.css";
import "@/styles/route.css";
import "@/styles/book.css";
import "@/styles/studio.css";

export const metadata: Metadata = {
  title: "Studio · quackle.scrapbook",
  robots: { index: false },
};

export default function StudioPage() {
  return <StudioApp />;
}
