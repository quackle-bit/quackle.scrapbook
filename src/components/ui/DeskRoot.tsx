"use client";

import type { CSSProperties, ReactNode } from "react";
import { useSettings } from "@/lib/settings";

/** Root of every desk-style page: applies the design tokens and the motion preferences. */
export function DeskRoot({
  children,
  className = "",
  style,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { reducedMotion, speed } = useSettings();
  return (
    <div className={`dk ${className}`} data-rm={reducedMotion || speed ? "1" : "0"} style={style}>
      {children}
    </div>
  );
}
