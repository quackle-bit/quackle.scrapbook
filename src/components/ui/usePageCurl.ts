"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
 * Portrait page turn: a vertical fold sweeps from the right edge to the spine. Left of the fold is
 * the page's front, the folded part lies on top as its blank back, and the next page shows to the
 * right in the fold's shadow. Everything stays inside the page frame (on a phone a 3D swing around
 * the spine just vanishes off-screen, which reads as a blink). Web Animations only, so React doesn't
 * re-render during the turn.
 */
export function usePageCurl(index: number, count: number, setIndex: (i: number) => void) {
  const binding = useRef<HTMLDivElement>(null);
  const [turn, setTurn] = useState<Turn | null>(null);
  const busy = useRef(false);

  const goTo = useCallback(
    (to: number) => {
      if (busy.current || to < 0 || to >= count || to === index) return;
      const s = settings.get();
      sfx.peel();
      if (s.reducedMotion || s.speed) {
        setIndex(to);
        return;
      }
      busy.current = true;
      setTurn({ from: index, to, dir: to > index ? 1 : -1 });
    },
    [count, index, setIndex],
  );

  // Runs right after React has put both leaves in the DOM (before the browser paints them),
  // so the turn always starts from its first frame, however slow the phone is.
  useLayoutEffect(() => {
    if (!turn) return;
    const root = binding.current;
    const leaf = root?.querySelector<HTMLElement>(".dk-moving");
    const flap = root?.querySelector<HTMLElement>(".dk-flap");
    const fold = root?.querySelector<HTMLElement>(".dk-fold-shadow");
    const fwd = turn.dir === 1;
    // Turning back plays the same turn in reverse.
    const opts: KeyframeAnimationOptions = {
      duration: TURN_MS,
      easing: EASE,
      fill: "forwards",
      direction: fwd ? "normal" : "reverse",
    };
    const all: Animation[] = [];
    const add = (a?: Animation) => a && all.push(a);
    // A vertical fold sweeps from the right edge (p = 0) to the spine (p = 1).
    // The front of the turning page is what's left of the fold…
    const main = leaf?.animate({ clipPath: ["inset(0 0% 0 0)", "inset(0 100% 0 0)"] }, opts);
    add(main);
    // …the part past the fold flips over and lies on top as the blank back of the page…
    add(
      flap?.animate(
        [
          { transform: "translateX(0%)", clipPath: "inset(0 0 0 100%)" },
          { transform: "translateX(-50%)", clipPath: "inset(0 0 0 50%)" },
          { transform: "translateX(-100%)", clipPath: "inset(0 0 0 100%)" },
        ],
        opts,
      ),
    );
    // …and the next page shows to the right of the fold, in its shadow.
    add(
      fold?.animate(
        [
          { transform: "translateX(100%)", opacity: 0 },
          { transform: "translateX(85%)", opacity: 1, offset: 0.15 },
          { transform: "translateX(15%)", opacity: 1, offset: 0.85 },
          { transform: "translateX(0%)", opacity: 0 },
        ],
        opts,
      ),
    );
    // The next page sits in the turning leaf's shadow until it's uncovered. This overlay lives in the
    // book, not inside the page, so nothing on the page itself changes when the turn ends (phones
    // re-draw a page whose layers change, which shows as a blink).
    add(root?.querySelector<HTMLElement>(".dk-under-dim")?.animate({ opacity: [0.25, 0] }, opts));

    let done = false;
    const finish = (stalled = false) => {
      if (done) return;
      done = true;
      // A stalled turn (hidden tab, frozen frames) must not leave a page clipped: clear it now.
      if (stalled) all.forEach((a) => a.cancel());
      haptic(feel.haptic.tear);
      setIndex(turn.to);
      setTurn(null);
      busy.current = false;
      // Drop the finished animations once React has drawn the new page.
      requestAnimationFrame(() => all.forEach((a) => a.cancel()));
    };
    if (main)
      void main.finished.then(
        () => finish(),
        () => finish(),
      );
    else finish();
    // Safety net only: a hidden tab can pause animations.
    const t = setTimeout(() => finish(true), TURN_MS * 4);
    return () => {
      clearTimeout(t);
      if (!done) all.forEach((a) => a.cancel());
      done = true; // StrictMode re-runs this effect; only the live run may finish the turn.
    };
  }, [turn, setIndex]);

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
