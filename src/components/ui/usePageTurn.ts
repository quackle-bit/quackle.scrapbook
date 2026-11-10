"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { play } from "@/lib/motion";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";

/**
 * Page turning for the scrapbook: a swing on the spine, swipe left/right, and arrow keys.
 * `setIndex` is called when the old page is edge-on, so the new one swings in.
 */
export function usePageTurn(index: number, count: number, setIndex: (i: number) => void) {
  const leaf = useRef<HTMLDivElement>(null);
  const turning = useRef(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback(
    async (target: number) => {
      if (turning.current || target < 0 || target >= count || target === index) return;
      turning.current = true;
      const dir = target > index ? 1 : -1;
      sfx.peel();
      const el = leaf.current;
      const s = settings.get();
      if (s.reducedMotion || s.speed) {
        setIndex(target);
      } else {
        await play(
          el,
          [
            { transform: "perspective(1400px) rotateY(0deg)", filter: "brightness(1)" },
            {
              transform: `perspective(1400px) rotateY(${dir === 1 ? -86 : 86}deg)`,
              filter: "brightness(.78)",
            },
          ],
          200,
          { easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards" },
        );
        setIndex(target);
        await new Promise((r) => setTimeout(r, 20));
        el?.getAnimations().forEach((a) => a.cancel());
        await play(
          el,
          [
            {
              transform: `perspective(1400px) rotateY(${dir === 1 ? 86 : -86}deg)`,
              filter: "brightness(.78)",
            },
            { transform: "perspective(1400px) rotateY(0deg)", filter: "brightness(1)" },
          ],
          240,
          { easing: "cubic-bezier(.1,.6,.3,1)" },
        );
      }
      turning.current = false;
      el?.scrollTo?.({ top: 0 });
    },
    [index, count, setIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest("input, textarea, select, [contenteditable]")) return;
      if (document.querySelector(".dk-sheet-back")) return;
      if (e.key === "ArrowRight") void goTo(index + 1);
      if (e.key === "ArrowLeft") void goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index]);

  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as Element).closest("button, a, input, textarea, select, label, [data-noswipe]"))
      return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6)
      void goTo(index + (dx < 0 ? 1 : -1));
  };

  return { leaf, goTo, onPointerDown, onPointerUp };
}
