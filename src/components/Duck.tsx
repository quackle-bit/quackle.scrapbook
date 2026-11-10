"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { feel } from "@/feel";
import { useSettings } from "@/lib/settings";

/**
 * The quackle.bit studio duck, using the same sprite as the website
 * (website/art/duck/duck.aseprite → public/duck/duck.png): a strip of 26×26 frames.
 * Tags and frame durations come straight from the Aseprite file (see website qb-interactive.js).
 */
const FRAME = 26;
const SHEET_FRAMES = 25;
export const DUCK_TAGS = {
  idle: { from: 0, d: [400, 300, 400, 300] },
  sleepy: { from: 4, d: [300, 200, 200, 300] },
  walk: { from: 8, d: [100, 100] },
  jump: { from: 10, d: [100] },
  fly: { from: 11, d: [100, 100] },
  eat: { from: 13, d: [100, 100] },
  gulp: { from: 15, d: [200] },
  burp: { from: 16, d: [300] },
  stunned: { from: 17, d: [200, 200, 200, 200, 200] },
  land: { from: 22, d: [100] },
  fall: { from: 23, d: [100, 100] },
} as const;
export type DuckTag = keyof typeof DUCK_TAGS;

function frameAt(tag: DuckTag, t: number) {
  const T = DUCK_TAGS[tag];
  const total = T.d.reduce((a: number, b: number) => a + b, 0);
  let m = t % total;
  for (let i = 0; i < T.d.length; i++) {
    if (m < T.d[i]) return T.from + i;
    m -= T.d[i];
  }
  return T.from;
}

/** Plays `tag` (looping) for `ms`, then a follow-up tag, then back to idle. */
type Act = { tag: DuckTag; ms: number; then?: Act };

export function DuckSprite({ act, scale: rawScale = 3 }: { act: Act | null; scale?: number }) {
  const scale = Math.max(1, Math.round(rawScale));
  const { reducedMotion } = useSettings();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    let current: Act | null = act;
    let start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      if (current && now - start > current.ms) {
        current = current.then ?? null;
        start = now;
      }
      const tag = current?.tag ?? "idle";
      setFrame(reducedMotion ? DUCK_TAGS[tag].from : frameAt(tag, now - start));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [act, reducedMotion]);
  const size = FRAME * scale;
  return (
    <div
      className="duck-sprite"
      aria-hidden
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/duck/duck.png)",
        backgroundSize: `${SHEET_FRAMES * size}px ${size}px`,
        backgroundPosition: `${-frame * size}px 0`,
        // Crisp pixels: whole-number scale, no smoothing.
        imageRendering: "pixelated",
      }}
    />
  );
}

// Tiny global "say" channel so any component can make the duck talk and act.
let line: { text: string; key: number; act: Act | null } | null = null;
const subs = new Set<() => void>();
let keySeq = 0;
export function say(text: string, act: Act | null = null) {
  line = { text, key: ++keySeq, act };
  subs.forEach((s) => s());
}
const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];
export const LINES = {
  trash: ["QUACK!", "Nope.", "Bad duck.", "Next!", "Begone!", "Into the bin!"],
  stamp: ["Ooh, keeper.", "Good one.", "Stick it!", "Nice.", "That's going in the book."],
  rare: ["Shiny!", "Ooh, a rare one!"],
  mythic: ["…is that MYTHIC?!"],
  open: ["Let's see what we got.", "Rip it!"],
  broke: ["Out of coins. Here, have more. (prototype)"],
};
/** Each kind of line comes with a little sprite reaction. */
const ACTS: Record<keyof typeof LINES, Act> = {
  trash: { tag: "eat", ms: 400, then: { tag: "gulp", ms: 200, then: { tag: "burp", ms: 300 } } },
  stamp: { tag: "jump", ms: 250, then: { tag: "land", ms: 120 } },
  rare: { tag: "stunned", ms: 1000 },
  mythic: { tag: "stunned", ms: 1600 },
  open: { tag: "walk", ms: 600 },
  broke: { tag: "fall", ms: 800, then: { tag: "sleepy", ms: 1000 } },
};
export const FORGE_ACT: Act = { tag: "fly", ms: 1600, then: { tag: "land", ms: 150 } };
export const sayRandom = (k: keyof typeof LINES) => say(pick(LINES[k]), ACTS[k]);

/** The duck's current line (null until it speaks). */
export function useDuckLine() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => line,
    () => null,
  );
}

export function Duck() {
  const current = useDuckLine();
  const [hiddenKey, setHiddenKey] = useState<number | null>(null);
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setHiddenKey(current.key), feel.duckLine);
    return () => clearTimeout(t);
  }, [current]);
  const visible = current && hiddenKey !== current.key;
  return (
    <div className="duck" aria-live="polite">
      <DuckSprite act={current?.act ?? null} />
      {visible && (
        <div key={current.key} className="bubble">
          {current.text}
        </div>
      )}
    </div>
  );
}
