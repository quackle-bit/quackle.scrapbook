import type { Metadata } from "next";
import { Prototype } from "@/components/Prototype";
import "@/styles/scrapbook.css";

export const metadata: Metadata = { title: "Feel prototype · quackle.scrapbook" };

export default function PrototypePage() {
  return <Prototype />;
}
