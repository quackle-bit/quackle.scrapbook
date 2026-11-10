"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { feel } from "@/feel";
import { haptic } from "@/lib/motion";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";

/** A turn in progress: which page is the leaf that moves, and which way. */
export type Turn = { from: number; to: number; dir: 1 | -1 };

const TURN_MS = 620;
const EASE = "cubic-bezier(.45,.05,.3,1)";

/**
 * Book page turns, played by the Back/Next buttons and arrow keys.
 * The top page swings over the spine like a real leaf (rotateY around the left edge), shows its blank
 * back once it passes upright, and the page underneath comes out of its shadow. Everything runs as
 * Web Animations on transform and opacity only, so the phone's compositor does the work and React
 * doesn't re-render during the turn.
 */
export function usePageCurl(index: number, count: number, setIndex: (i: number) => void) {
  const binding = useRef<HTMLDivElement>(null);
  const [turn, setTurn] = useState<Turn | null>(null);
  const busy = useRef(false);

  const goTo = useCallback(
    async (to: number) => {
      if (busy.current || to < 0 || to >= count || to === index) return;
      const s = settings.get();
      sfx.peel();
      if (s.reducedMotion || s.speed) {
        setIndex(to);
        return;
      }
      busy.current = true;
      const t: Turn = { from: index, to, dir: to > index ? 1 : -1 };
      setTurn(t);
      // Wait for both leaves to be on screen.
      await new Promise((r) => {
        requestAnimationFrame(() => requestAnimationFrame(r));
        setTimeout(r, 60);
      });
      const root = binding.current;
      const leaf = root?.querySelector<HTMLElement>(".dk-moving");
      const under = root?.querySelector<HTMLElement>(".dk-under");
      const fwd = t.dir === 1;
      const flat = "perspective(1800px) rotateY(0deg)";
      const over = "perspective(1800px) rotateY(-180deg)";
      const lifted = "perspective(1800px) rotateY(-90deg) scale(1.02)";
      const opts = { duration: TURN_MS, easing: EASE, fill: "forwards" as const };
      const anims: Animation[] = [];
      const extra: Animation[] = [];
      if (leaf) {
        anims.push(
          leaf.animate({ transform: fwd ? [flat, lifted, over] : [over, lifted, flat] }, opts),
        );
        // Past upright you see the back of the page, not its front.
        const back = leaf.querySelector<HTMLElement>(".dk-leaf-back");
        const b = back?.animate(
          [
            { opacity: fwd ? 0 : 1, offset: 0 },
            { opacity: fwd ? 0 : 1, offset: 0.5 },
            { opacity: fwd ? 1 : 0, offset: 0.5 },
            { opacity: fwd ? 1 : 0, offset: 1 },
          ],
          opts,
        );
        if (b) extra.push(b);
        // Light rolls across the leaf as it bends.
        const sh = leaf
          .querySelector<HTMLElement>(".dk-leaf-shade")
          ?.animate({ opacity: [0, 0.5, 0] }, opts);
        if (sh) extra.push(sh);
      }
      // The page underneath sits in the leaf's shadow until it's uncovered.
      const dim = under
        ?.querySelector<HTMLElement>(".dk-leaf-dim")
        ?.animate({ opacity: fwd ? [0.55, 0] : [0, 0.55] }, opts);
      if (dim) extra.push(dim);
      // A hidden tab can pause animations; never leave the book stuck mid-turn.
      await Promise.race([
        Promise.all(anims.map((a) => a.finished.catch(() => undefined))),
        new Promise((r) => setTimeout(r, TURN_MS + 250)),
      ]);
      haptic(feel.haptic.tear);
      setIndex(t.to);
      setTurn(null);
      busy.current = false;
      // Drop the finished animations once React has drawn the new page.
      requestAnimationFrame(() => [...anims, ...extra].forEach((a) => a.cancel()));
    },
    [count, index, setIndex],
  );

  // Arrow keys turn pages too.
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

  return { binding, turn, goTo };
}
