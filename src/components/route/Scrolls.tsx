"use client";

import { useEffect, useRef, useState } from "react";
import { feel } from "@/feel";
import { drawCards } from "@/lib/deck";
import { haptic, OVERSHOOT, play } from "@/lib/motion";
import { createRng, freshSeed } from "@/lib/rng";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { HandCard } from "../HandCard";
import type { CardData, StopProps } from "./types";

const HOLD_MS = 900;

/**
 * The Rulekeeper: three sealed scrolls. Pick one, then press and hold the wax seal until it
 * cracks to reveal the constraint.
 */
export function Scrolls({ coins, spend, onStamp, onTrash, onDragSlot }: StopProps) {
  const [scrolls, setScrolls] = useState<CardData[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [hold, setHold] = useState(0);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const holdStart = useRef<number | null>(null);
  const raf = useRef(0);
  const sealRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  function buy() {
    if (!spend()) return;
    setScrolls(drawCards(createRng(freshSeed()), "constraint", 3));
    setPicked(null);
    setHold(0);
    setOpen(false);
    sfx.slide();
  }

  function startHold() {
    if (open || picked === null) return;
    if (settings.get().speed) return void crack();
    holdStart.current = performance.now();
    let lastTick = 0;
    const loop = (now: number) => {
      if (holdStart.current === null) return;
      const p = Math.min(1, (now - holdStart.current) / HOLD_MS);
      setHold(p);
      if (Math.floor(p * 6) > lastTick) {
        lastTick = Math.floor(p * 6);
        sfx.tick();
        haptic(5);
      }
      if (p >= 1) return void crack();
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }
  function endHold() {
    if (open) return;
    holdStart.current = null;
    cancelAnimationFrame(raf.current);
    setHold(0);
  }
  async function crack() {
    holdStart.current = null;
    setHold(1);
    sfx.crumple();
    sfx.thud();
    haptic(feel.haptic.thud);
    await play(
      sealRef.current,
      [{ transform: "scale(1)" }, { transform: "scale(1.4) rotate(20deg)", opacity: 0 }],
      260,
      {
        fill: "forwards",
      },
    );
    setOpen(true);
  }

  function done() {
    setScrolls([]);
    setPicked(null);
    setOpen(false);
  }

  if (!scrolls.length) {
    return (
      <div className="stop-play">
        <div className="scroll-row" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="scroll">
              <span className="seal" />
            </div>
          ))}
        </div>
        <button type="button" className="big-btn" onClick={buy} disabled={coins <= 0}>
          Buy the scrolls · 1¢
        </button>
      </div>
    );
  }

  const card = picked !== null ? scrolls[picked] : null;

  if (open && card) {
    return (
      <div className="stop-play single-card">
        <HandCard
          key={card.id}
          card={card}
          faceUp
          selected={selected === card.id}
          onSelect={setSelected}
          onStamp={(c, s) => {
            const ok = onStamp(c, s);
            if (ok) done();
            return ok;
          }}
          onTrash={(c, how) => {
            onTrash(c, how);
            done();
          }}
          onDragSlot={onDragSlot}
        />
        <span className="hint">drag it to CONSTRAINT</span>
      </div>
    );
  }

  return (
    <div className="stop-play">
      <div className="scroll-row">
        {scrolls.map((s, i) =>
          picked === null || picked === i ? (
            <div key={s.id} className={`scroll${picked === i ? " chosen" : ""}`}>
              {picked === null ? (
                <button
                  type="button"
                  className="scroll-pick"
                  onClick={() => {
                    setPicked(i);
                    sfx.thup();
                    requestAnimationFrame(() =>
                      play(
                        sealRef.current?.parentElement,
                        [{ transform: "scale(.8)" }, { transform: "none" }],
                        300,
                        {
                          easing: OVERSHOOT,
                        },
                      ),
                    );
                  }}
                  aria-label={`Scroll ${i + 1}`}
                >
                  <span className="seal" />
                </button>
              ) : (
                <button
                  ref={sealRef}
                  type="button"
                  className="seal big"
                  style={{ ["--hold" as string]: hold }}
                  onPointerDown={startHold}
                  onPointerUp={endHold}
                  onPointerLeave={endHold}
                  onPointerCancel={endHold}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") && !e.repeat && startHold()
                  }
                  onKeyUp={endHold}
                  aria-label="Press and hold to break the seal"
                />
              )}
            </div>
          ) : null,
        )}
      </div>
      <span className="hint">
        {picked === null ? "pick one scroll" : "press and hold the seal"}
      </span>
    </div>
  );
}
