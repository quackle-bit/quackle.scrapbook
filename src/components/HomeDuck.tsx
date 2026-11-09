"use client";

import { DuckSprite } from "./Duck";

export function HomeDuck() {
  return (
    <div className="home-duck">
      <DuckSprite act={{ tag: "walk", ms: 1200, then: { tag: "idle", ms: 99999 } }} scale={4} />
    </div>
  );
}
