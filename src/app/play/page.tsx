import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayFromQuery } from "@/components/VisitorPlay";
import "@/styles/scrapbook.css";
import "@/styles/route.css";
import "@/styles/book.css";
import "@/styles/pitch.css";

export const metadata: Metadata = {
  title: "The Street · quackle.scrapbook",
  description: "Walk the bazaar, open card packs and forge a game idea.",
};

export default function PlayPage() {
  // ?mode=jam|studio is read on the client so the page itself stays static.
  return (
    <Suspense fallback={<div className="proto" aria-busy="true" />}>
      <PlayFromQuery />
    </Suspense>
  );
}
