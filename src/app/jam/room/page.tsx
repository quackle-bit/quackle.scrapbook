import type { Metadata } from "next";
import { Suspense } from "react";
import { JamRoomFromQuery } from "@/components/jam/JamRoom";
import "@/styles/scrapbook.css";
import "@/styles/route.css";
import "@/styles/book.css";
import "@/styles/pitch.css";
import "@/styles/studio.css";

export const metadata: Metadata = { title: "Jam room · quackle.scrapbook" };

export default function JamRoomPage() {
  return (
    <Suspense fallback={<div className="proto" aria-busy="true" />}>
      <JamRoomFromQuery />
    </Suspense>
  );
}
