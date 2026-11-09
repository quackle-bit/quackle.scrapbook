import type { Metadata } from "next";
import { JamLobby } from "@/components/jam/JamLobby";
import "@/styles/scrapbook.css";
import "@/styles/route.css";
import "@/styles/book.css";
import "@/styles/studio.css";

export const metadata: Metadata = { title: "Jam rooms · quackle.scrapbook" };

export default function JamPage() {
  return <JamLobby />;
}
