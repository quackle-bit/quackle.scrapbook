"use client";

import { animate, type MotionValue, type ValueAnimationTransition } from "motion/react";
import { feel } from "@/feel";
import { settings } from "./settings";

/**
 * Spring / inertia motion for cards (Motion), following the same rules as `play()`:
 * speed mode jumps straight to the end, reduced motion skips movement, and a timer
 * makes sure nothing hangs in a hidden tab (where animation frames pause).
 */
export function go(
  value: MotionValue<number>,
  to: number,
  transition: ValueAnimationTransition<number> = feel.spring.snap,
  maxMs = 1200,
): Promise<void> {
  const s = settings.get();
  if (s.speed || s.reducedMotion) {
    value.set(to);
    return Promise.resolve();
  }
  const anim = animate(value, to, transition);
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      anim.stop();
      value.set(to);
      resolve();
    }, maxMs);
    anim.then(() => {
      clearTimeout(t);
      resolve();
    });
  });
}

/** Inertia: keep the release velocity and glide to a stop (no fixed target). */
export function glide(value: MotionValue<number>, velocity: number, maxMs = 1000): Promise<void> {
  const s = settings.get();
  const end = value.get() + velocity * feel.spring.glide.distance;
  if (s.speed || s.reducedMotion) {
    value.set(end);
    return Promise.resolve();
  }
  return go(
    value,
    end,
    {
      type: "inertia",
      velocity,
      power: feel.spring.glide.power,
      timeConstant: feel.spring.glide.timeConstant,
    },
    maxMs,
  );
}
