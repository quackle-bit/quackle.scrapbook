import type { Metadata } from "next";
import { Route } from "@/components/route/Route";
import "@/styles/scrapbook.css";
import "@/styles/route.css";

export const metadata: Metadata = { title: "The Street · quackle.scrapbook" };

export default function PlayPage() {
  return <Route />;
}
