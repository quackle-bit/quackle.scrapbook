import type { Metadata } from "next";
import { Suspense } from "react";
import { SummaryRoute } from "@/components/summary/SummaryRoute";

export const metadata: Metadata = { title: "Pitch · Quackle Scrapbook" };

export default function SummaryPage() {
  return (
    <Suspense fallback={null}>
      <SummaryRoute />
    </Suspense>
  );
}
