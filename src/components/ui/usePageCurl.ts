"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { feel } from "@/feel";
import { haptic } from "@/lib/motion";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";

/** A turn in progress: which page is the leaf that moves, and which way. */
export type Turn = { from: number; to: number; dir: 1 | -1 };

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Paper page turns. Drag a page corner and the page lifts off the spine and follows your finger,
 * with the next page already lying underneath; let go past a third and it turns, otherwise it falls back.
 * Buttons, arrow keys and swipes play the same turn. Progress lives in a CSS variable (--q on the
 * binding), so the pages don't re-render every frame.
 */
export function usePageCurl(index: number, count: number, setIndex: (i: number) => void) {
  const binding = useRef<HTMLDivElement>(null);
  const [turn, setTurn] = useState<Turn | null>(null);
  const q = useRef(0);
  const anim = useRef(0);
  const drag = useRef<{ x0: number; w: number; last: { x: number; t: number }[] } | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  /** q = how far the moving leaf has turned (0 = flat on the right, 1 = flat on the left). */
  const setQ = useCallback((v: number) => {
    q.current = v;
    const el = binding.current;
    if (!el) return;
    el.style.setProperty("--q", v.toFixed(4));
    el.classList.toggle("past-half", v > 0.5);
  }, []);

  /** Leaf progress for a turn: forward turns go 0→1, backward turns come 1→0. */
  const start = useCallback(
    (to: number) => {
      if (turn || to < 0 || to >= count || to === index) return null;
      const t: Turn = { from: index, to, dir: to > index ? 1 : -1 };
      setTurn(t);
      setQ(t.dir === 1 ? 0 : 1);
      sfx.peel();
      return t;
    },
    [turn, count, index, setQ],
  );

  const finish = useCallback(
    (t: Turn, done: boolean) => {
      cancelAnimationFrame(anim.current);
      if (done) {
        setIndex(t.to);
        haptic(feel.haptic.tear);
      }
      setTurn(null);
      setQ(0);
    },
    [setIndex, setQ],
  );

  const animateTo = useCallback(
    (t: Turn, target: number, ms: number) =>
      new Promise<void>((resolve) => {
        cancelAnimationFrame(anim.current);
        const from = q.current;
        const t0 = performance.now();
        const step = (now: number) => {
          const k = Math.min(1, (now - t0) / ms);
          setQ(from + (target - from) * ease(k));
          if (k < 1) anim.current = requestAnimationFrame(step);
          else resolve();
        };
        anim.current = requestAnimationFrame(step);
      }).then(() => {
        // Turned all the way over (forward → 1, back → 0) = the page changed.
        finish(t, t.dir === 1 ? target === 1 : target === 0);
      }),
    [setQ, finish],
  );

  const goTo = useCallback(
    async (to: number) => {
      const s = settings.get();
      if (s.reducedMotion || s.speed) {
        if (to >= 0 && to < count && to !== index && !turn) {
          sfx.peel();
          setIndex(to);
        }
        return;
      }
      const t = start(to);
      if (!t) return;
      await new Promise((r) => requestAnimationFrame(r));
      await animateTo(t, t.dir === 1 ? 1 : 0, 520);
    },
    [count, index, turn, start, animateTo, setIndex],
  );

  // ── Corner drag ─────────────────────────────────────────────
  const onCornerDown = (dir: 1 | -1) => (e: PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    const s = settings.get();
    if (s.reducedMotion || s.speed) return void goTo(index + dir);
    const t = start(index + dir);
    if (!t) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const w = binding.current?.getBoundingClientRect().width ?? 320;
    drag.current = { x0: e.clientX, w, last: [{ x: e.clientX, t: e.timeStamp }] };
  };
  const onCornerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || !turn) return;
    d.last.push({ x: e.clientX, t: e.timeStamp });
    if (d.last.length > 5) d.last.shift();
    // Pulling left turns forward; pulling right brings the previous page back.
    const moved = (d.x0 - e.clientX) / (d.w * 0.9);
    setQ(turn.dir === 1 ? Math.max(0, Math.min(1, moved)) : Math.max(0, Math.min(1, 1 + moved)));
  };
  const onCornerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !turn) return;
    const a = d.last[0];
    const b = d.last[d.last.length - 1];
    const v = (b.x - a.x) / Math.max(1, b.t - a.t); // px/ms, negative = leftwards
    const progress = turn.dir === 1 ? q.current : 1 - q.current;
    const flick = turn.dir === 1 ? v < -0.5 : v > 0.5;
    const go = progress > 0.33 || flick;
    const target = turn.dir === 1 ? (go ? 1 : 0) : go ? 0 : 1;
    void animateTo(turn, target, go ? 380 : 260);
  };

  // ── Swipe anywhere + arrow keys ────────────────────────────
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
  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  const onPointerDown = (e: PointerEvent) => {
    if (
      (e.target as Element).closest(
        "button, a, input, textarea, select, label, [data-noswipe], [data-drop], .fc-hand-card",
      )
    )
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

  return {
    binding,
    turn,
    goTo,
    onPointerDown,
    onPointerUp,
    corner: (dir: 1 | -1) => ({
      onPointerDown: onCornerDown(dir),
      onPointerMove: onCornerMove,
      onPointerUp: onCornerUp,
      onPointerCancel: onCornerUp,
    }),
  };
}
