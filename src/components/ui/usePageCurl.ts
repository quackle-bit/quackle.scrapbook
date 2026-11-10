"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { feel } from "@/feel";
import { haptic } from "@/lib/motion";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";

const FADE_OUT = 120;
const SWING = 440;
const FADE_IN = 240;
const EASE = "cubic-bezier(.45,.05,.55,.95)";

/** Next frame (or 50 ms, if frames are paused in a background tab). */
const frame = () =>
  new Promise<void>((r) => {
    requestAnimationFrame(() => r());
    setTimeout(r, 50);
  });
/** A hidden tab can pause animations: never wait on one longer than it should take. */
const done = (a: Animation | undefined, ms: number) =>
  Promise.race([
    a?.finished.then(
      () => undefined,
      () => undefined,
    ) ?? Promise.resolve(),
    new Promise<void>((r) => setTimeout(r, ms + 250)),
  ]);

/**
 * Book page turns (Back/Next buttons, arrow keys), built so nothing heavy ever animates:
 *   1. the current page's content fades out,
 *   2. the page switches instantly (exactly like speed mode, which never blinked), new content hidden,
 *   3. a blank paper sheet (always in the book, hidden) swings over the spine like a real leaf,
 *   4. the new content fades in.
 * Only a plain sheet and opacity move, so phones never show a half-drawn page.
 */
export function usePageCurl(index: number, count: number, setIndex: (i: number) => void) {
  const binding = useRef<HTMLDivElement>(null);
  const [turning, setTurning] = useState<1 | -1 | null>(null);
  const busy = useRef(false);

  const goTo = useCallback(
    async (to: number) => {
      if (busy.current || to < 0 || to >= count || to === index) return;
      const s = settings.get();
      sfx.peel();
      const root = binding.current;
      if (s.reducedMotion || s.speed || !root) {
        setIndex(to);
        return;
      }
      busy.current = true;
      const fwd = to > index;
      setTurning(fwd ? 1 : -1);

      // 1. Old content out.
      const oldPage = root.querySelector<HTMLElement>(".dk-leaf .dk-page");
      const out = oldPage?.animate({ opacity: [1, 0] }, { duration: FADE_OUT, fill: "forwards" });
      await done(out, FADE_OUT);

      // 2. Switch now, new content hidden (the .revealing class), then let it be drawn.
      root.classList.add("revealing");
      flushSync(() => setIndex(to));
      out?.cancel();
      await frame();
      await frame();

      // 3. The blank sheet swings: away over the spine on Next, back onto the page on Back.
      const sheet = root.querySelector<HTMLElement>(".dk-turn-sheet");
      const shade = sheet?.querySelector<HTMLElement>(".dk-turn-shade");
      const flat = "perspective(1100px) rotateY(0deg)";
      const over = "perspective(1100px) rotateY(-100deg)";
      let swing: Animation | undefined;
      let dim: Animation | undefined;
      if (sheet) {
        sheet.style.visibility = "visible";
        swing = sheet.animate(
          { transform: fwd ? [flat, over] : [over, flat] },
          { duration: SWING, easing: EASE, fill: "forwards" },
        );
        dim = shade?.animate(
          { opacity: fwd ? [0, 0.5] : [0.5, 0] },
          { duration: SWING, easing: EASE, fill: "forwards" },
        );
      }
      haptic(feel.haptic.tear);

      // 4. New content in: as the sheet clears (Next) or once it has landed (Back).
      const reveal = async () => {
        const page = root.querySelector<HTMLElement>(".dk-leaf .dk-page");
        const fade = page?.animate({ opacity: [0, 1] }, { duration: FADE_IN, fill: "forwards" });
        root.classList.remove("revealing");
        await done(fade, FADE_IN);
        fade?.cancel();
      };
      if (fwd) {
        await new Promise((r) => setTimeout(r, SWING * 0.45));
        const r = reveal();
        await done(swing, SWING);
        await r;
      } else {
        await done(swing, SWING);
        if (sheet) sheet.style.visibility = "hidden";
        await reveal();
      }
      if (sheet) sheet.style.visibility = "hidden";
      swing?.cancel();
      dim?.cancel();
      setTurning(null);
      busy.current = false;
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

  return { binding, turning, goTo };
}
