"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { feel } from "@/feel";
import { haptic } from "@/lib/motion";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";

/** A turn in progress: which page is the leaf that moves, and which way. */
export type Turn = { from: number; to: number; dir: 1 | -1 };

const TURN_MS = 340;
const EASE = "cubic-bezier(.3,0,.2,1)";

/**
 * Page turns, played by the Back/Next buttons and arrow keys: the top page slides off to the left
 * (or back in from the left) over the other page, which stays perfectly still. Transform only, no
 * overlays or clipping: earlier fold and 3D versions repainted on the phone's main thread and read
 * as a blink. Web Animations, so React doesn't re-render during the turn.
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
    const leaf = binding.current?.querySelector<HTMLElement>(".dk-moving");
    const fwd = turn.dir === 1;
    // Only transform moves, so phones run it on the graphics chip: the top page slides off to the
    // left (Next) or back in from the left (Back) over the other page, which never changes.
    const opts: KeyframeAnimationOptions = {
      duration: TURN_MS,
      easing: EASE,
      fill: "forwards",
      direction: fwd ? "normal" : "reverse",
    };
    const all: Animation[] = [];
    const main = leaf?.animate(
      { transform: ["translate3d(0,0,0)", "translate3d(-108%,0,0)"] },
      opts,
    );
    if (main) all.push(main);

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
