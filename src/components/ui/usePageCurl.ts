"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { feel } from "@/feel";
import { haptic } from "@/lib/motion";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { curlReady, playCurl } from "@/lib/pageCurl3d";

const FADE_OUT = 120;
const SWING = 440;
const CURL = 720;
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
 * Book page turns (Back/Next buttons, arrow keys), built so the real page content never animates:
 *   1. the current page's content fades out,
 *   2. the page switches instantly (exactly like speed mode, which never blinked), new content hidden,
 *   3. a 3D paper sheet curls over the spine (lib/pageCurl3d.ts: a 36×8 grid bent every frame),
 *      or, without WebGL, a flat blank sheet swings,
 *   4. the new content fades in.
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

      haptic(feel.haptic.tear);
      // 4. (used by both turns) New content in.
      const reveal = async () => {
        const page = root.querySelector<HTMLElement>(".dk-leaf .dk-page");
        const fade = page?.animate({ opacity: [0, 1] }, { duration: FADE_IN, fill: "forwards" });
        root.classList.remove("revealing");
        await done(fade, FADE_IN);
        fade?.cancel();
      };

      // 3. A 3D paper sheet curls over the spine (see lib/pageCurl3d.ts); content appears as it
      //    clears (Next) or once it has landed (Back).
      if (await curlReady()) {
        const shadow = root.querySelector<HTMLElement>(".dk-curl-shadow");
        const turn3d = playCurl(root, fwd ? 1 : -1, CURL, shadow);
        if (fwd) {
          await new Promise((r) => setTimeout(r, CURL * 0.5));
          const r = reveal();
          await turn3d;
          await r;
        } else {
          await turn3d;
          await reveal();
        }
      } else {
        // Fallback (no WebGL): the flat blank sheet swings in CSS 3D.
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
      }
      setTurning(null);
      busy.current = false;
    },
    [count, index, setIndex],
  );

  // Fetch the 3D page turn quietly once the page is idle, so the first turn doesn't wait for it.
  useEffect(() => {
    if (settings.get().reducedMotion || settings.get().speed) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const go = () => void curlReady();
    const id = w.requestIdleCallback ? w.requestIdleCallback(go) : window.setTimeout(go, 1500);
    return () => {
      if (!w.requestIdleCallback) window.clearTimeout(id);
    };
  }, []);

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
