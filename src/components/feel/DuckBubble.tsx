"use client";

import { useEffect, useState } from "react";
import { feel } from "@/feel";
import { DuckSprite, useDuckLine } from "../Duck";

/** The duck in the corner of the scrapbook, reacting to what you do. Its line fades after a moment. */
export function DuckBubble() {
  const current = useDuckLine();
  const [hidden, setHidden] = useState<number | null>(null);
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setHidden(current.key), feel.duckLine);
    return () => clearTimeout(t);
  }, [current]);
  const visible = current && hidden !== current.key;
  return (
    <div className="dk-duck" aria-live="polite">
      {visible && (
        <p key={current.key} className="dk-duck-line">
          {current.text}
        </p>
      )}
      <DuckSprite act={current?.act ?? null} scale={2} />
    </div>
  );
}
