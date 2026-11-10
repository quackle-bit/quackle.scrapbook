"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { feel } from "@/feel";
import { haptic } from "@/lib/motion";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";

/** A turn in progress: which page is the leaf that moves, and which way. */
export type Turn = { from: number; to: number; dir: 1 | -1 };

const TURN_MS = 460;
const EASE = "cubic-bezier(.45,.05,.55,.95)";

/**
 * Book page turns, played by the Back/Next buttons and arrow keys. The page you leave swings like a
 * real leaf (over the spine on Next, away to the right on Back) and darkens as it turns; the page
 * you go to waits, perfectly still, underneath. The new page never animates and gets two frames to
 * be drawn before the turn starts: phones show a freshly mounted layer half-drawn during an
 * animation, which was the blink. Transform + opacity only, Web Animations, no React re-renders.
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
    // The page you're leaving (already fully drawn) is the one that moves: off to the left on Next,
    // off to the right on Back. The page you're going to sits still underneath and never animates,
    // so the phone never shows it half-drawn (that was the blink).
    const all: Animation[] = [];
    let done = false;
    let raf = 0;
    const finish = (stalled = false) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      if (stalled) all.forEach((a) => a.cancel());
      haptic(feel.haptic.tear);
      setIndex(turn.to);
      setTurn(null);
      busy.current = false;
      // The moving page is unmounted by then; drop its animation on the next frame.
      requestAnimationFrame(() => all.forEach((a) => a.cancel()));
    };
    // Give the phone two frames to draw the new page behind the old one before anything moves.
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        if (done || !leaf) return finish();
        // A real page swing: Next lifts the page off the right edge and turns it over the spine;
        // Back swings it away to the right. Perspective + rotateY only (transform), plus its own
        // shade darkening as it turns from the light. The page underneath never moves.
        leaf.style.transformOrigin = fwd ? "left center" : "right center";
        const main = leaf.animate(
          {
            transform: [
              "perspective(1100px) rotateY(0deg)",
              `perspective(1100px) rotateY(${fwd ? -100 : 100}deg)`,
            ],
          },
          { duration: TURN_MS, easing: EASE, fill: "forwards" },
        );
        const shade = leaf
          .querySelector<HTMLElement>(".dk-turn-shade")
          ?.animate({ opacity: [0, 0.55] }, { duration: TURN_MS, easing: EASE, fill: "forwards" });
        if (shade) all.push(shade);
        all.push(main);
        void main.finished.then(
          () => finish(),
          () => finish(),
        );
      });
    });
    // Safety net only: a hidden tab can pause frames and animations.
    const t = setTimeout(() => finish(true), TURN_MS * 4);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
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
