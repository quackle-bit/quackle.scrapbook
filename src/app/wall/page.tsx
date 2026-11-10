import type { Metadata } from "next";
import { Suspense } from "react";
import { PitchWallRoute } from "@/components/wall/PitchWallRoute";

export const metadata: Metadata = { title: "Pitch Wall · Quackle Scrapbook" };

export default function WallPage() {
  return (
    <Suspense fallback={null}>
      <PitchWallRoute />
    </Suspense>
  );
}
