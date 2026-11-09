"use client";

import { settings } from "./settings";

/**
 * Play a Web Animation that respects speed mode (instant) and reduced motion (fade instead of
 * movement). Resolves when finished. Every effect goes through here so it stays skippable.
 */
export function play(
  el: Element | null | undefined,
  keyframes: Keyframe[],
  duration: number,
  opts: { easing?: string; fill?: FillMode; delay?: number; motion?: boolean } = {},
): Promise<void> {
  if (!el) return Promise.resolve();
  const s = settings.get();
  let frames = keyframes;
  // Reduced motion: drop transforms, keep only opacity so state changes are still visible.
  if (s.reducedMotion && opts.motion !== false) {
    frames = keyframes.map((k) => (k.opacity !== undefined ? { opacity: k.opacity } : {}));
    if (frames.every((k) => Object.keys(k).length === 0)) return Promise.resolve();
    duration = Math.min(duration, 200);
  }
  if (s.speed) duration = 0;
  const anim = el.animate(frames, {
    duration,
    delay: s.speed ? 0 : (opts.delay ?? 0),
    easing: opts.easing ?? "cubic-bezier(.2,.8,.2,1)",
    fill: opts.fill ?? "none",
  });
  return anim.finished.then(
    () => undefined,
    () => undefined,
  );
}

export const wait = (ms: number) =>
  settings.get().speed ? Promise.resolve() : new Promise<void>((r) => setTimeout(r, ms));

/** Overshoot easing for snaps and landings. */
export const OVERSHOOT = "cubic-bezier(.34,1.56,.64,1)";

export function haptic(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator && !settings.get().muted) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* unsupported */
    }
  }
}

export function shake(el: Element | null, px: number, ms: number) {
  return play(
    el,
    [
      { transform: "translate(0,0)" },
      { transform: `translate(${px}px,${-px / 2}px)` },
      { transform: `translate(${-px}px,${px / 2}px)` },
      { transform: `translate(${px / 2}px,0)` },
      { transform: "translate(0,0)" },
    ],
    ms,
    { easing: "linear" },
  );
}
