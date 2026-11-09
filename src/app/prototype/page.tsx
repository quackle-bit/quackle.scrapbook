import type { Metadata } from "next";
import { Prototype } from "@/components/Prototype";
import "./prototype.css";

export const metadata: Metadata = { title: "Feel prototype · quackle.scrapbook" };

export default function PrototypePage() {
  return <Prototype />;
}
