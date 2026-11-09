"use client";

import { useRef, useState, type PointerEvent } from "react";
import { feel } from "@/feel";
import { drawCards } from "@/lib/deck";
import { haptic, OVERSHOOT, play, wait } from "@/lib/motion";
import { createRng, freshSeed } from "@/lib/rng";
import { sfx } from "@/lib/sound";
import { HandCard } from "../HandCard";
import type { CardData, Pull, StopProps } from "./types";

/**
 * The Gear Booth: three verb cards sit face-down under a press. Pull the lever down and the
 * press stamps them face-up one by one, ka-chunk.
 */
export function GearPress({
  coins,
  spend,
  context,
  onStamp,
  onTrash,
  onDragSlot,
  onPulled,
}: StopProps) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [left, setLeft] = useState<Set<string>>(new Set());
  const [pressed, setPressed] = useState(false);
  const [lever, setLever] = useState(0);
  const [flipSignal, setFlipSignal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const plate = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; h: number } | null>(null);

  function load(pull: Pull) {
    if (!spend()) return;
    const c = drawCards(createRng(freshSeed()), "verb", 3, context, pull);
    setCards(c);
    onPulled?.(c);
    setLeft(new Set(c.map((x) => x.id)));
    setPressed(false);
    setLever(0);
    sfx.slide();
  }

  async function press() {
    if (pressed || !cards.length) return;
    setPressed(true);
    setLever(1);
    for (let i = 0; i < cards.length; i++) {
      // Plate slams down over card i, then lifts; the card flips as it lifts.
      const x = (i - 1) * 100;
      await play(
        plate.current,
        [
          { transform: `translateX(${x}%) translateY(-60%)` },
          { transform: `translateX(${x}%) translateY(0)`, offset: 0.45 },
          { transform: `translateX(${x}%) translateY(-60%)` },
        ],
        360,
        { easing: "cubic-bezier(.7,0,.3,1)" },
      );
      sfx.thud();
      sfx.tick();
      haptic(feel.haptic.thud);
      if (i === 0) setFlipSignal((s) => s + 1);
      await wait(60);
    }
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (pressed || !cards.length) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, h: track.current?.getBoundingClientRect().height ?? 100 };
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const p = Math.max(0, Math.min(1, (e.clientY - d.y0) / (d.h * 0.8)));
    setLever(p);
    if (p >= 1) {
      drag.current = null;
      void press();
    }
  }
  function onUp() {
    if (!drag.current) return;
    drag.current = null;
    if (!pressed) {
      void play(
        track.current?.firstElementChild,
        [{ transform: "translateY(10px)" }, { transform: "none" }],
        200,
        {
          easing: OVERSHOOT,
        },
      );
      setLever(0);
    }
  }

  function resolve(id: string) {
    setLeft((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (next.size === 0) setTimeout(() => setCards([]), 250);
      return next;
    });
  }

  if (!cards.length) {
    return (
      <div className="stop-play">
        <div className="press-frame idle" aria-hidden>
          <div className="press-plate" />
        </div>
        <div className="row">
          <button
            type="button"
            className="big-btn"
            onClick={() => load("fresh")}
            disabled={coins <= 0}
          >
            Fresh gears · 1¢
          </button>
          <button
            type="button"
            className="big-btn"
            onClick={() => load("wild")}
            disabled={coins <= 0}
          >
            Wild gears · 1¢
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stop-play">
      <div className="press-wrap">
        <div className="press-frame">
          <div
            ref={plate}
            className="press-plate"
            style={{ transform: "translateX(-100%) translateY(-60%)" }}
          />
          <div className="press-bed">
            {cards.map((c, i) => (
              <HandCard
                key={c.id}
                card={c}
                flipSignal={flipSignal}
                flipDelay={i * 430 + 160}
                selected={selected === c.id}
                onSelect={setSelected}
                onStamp={(card, slot) => {
                  const ok = onStamp(card, slot);
                  if (ok) resolve(card.id);
                  return ok;
                }}
                onTrash={(card, how) => {
                  onTrash(card, how);
                  resolve(card.id);
                }}
                onDragSlot={onDragSlot}
              />
            ))}
          </div>
        </div>
        <div
          ref={track}
          className="lever-track"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <button
            type="button"
            className="lever-knob"
            style={{ transform: `translateY(${lever * 100}%)` }}
            onClick={() => void press()}
            disabled={pressed}
            aria-label="Pull the lever"
          />
        </div>
      </div>
      <span className="hint">{pressed ? "drag one to CORE VERB" : "pull the lever down ↓"}</span>
    </div>
  );
}
