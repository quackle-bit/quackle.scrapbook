import type { Metadata } from "next";
import { Suspense } from "react";
import { ScrapbookRoute } from "@/components/scrapbook/ScrapbookRoute";

export const metadata: Metadata = { title: "Scrapbook · Quackle Scrapbook" };

export default function ScrapbookPage() {
  // ?id=…&page=… are read on the client (inside Suspense) so the page stays static.
  return (
    <Suspense fallback={null}>
      <ScrapbookRoute />
    </Suspense>
  );
}
