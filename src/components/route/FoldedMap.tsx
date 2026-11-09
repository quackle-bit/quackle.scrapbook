"use client";

import { useRef, useState } from "react";
import { drawFrom, worldCard, WORLD_PARTS } from "@/lib/deck";
import { OVERSHOOT, play } from "@/lib/motion";
import { createRng, freshSeed, type Rng } from "@/lib/rng";
import { sfx } from "@/lib/sound";
import type { VocabEntry } from "@/lib/vocab";
import { HandCard } from "../HandCard";
import type { CardData, StopProps } from "./types";

/**
 * The Mapmaker: a paper map folded in three. Each tap unfolds one panel
 * (place → era → inhabitant). Keep the whole map, or swap one part (once per part).
 */
export function FoldedMap({ coins, spend, context, onStamp, onTrash, onDragSlot }: StopProps) {
  const [parts, setParts] = useState<VocabEntry[] | null>(null);
  const [open, setOpen] = useState(0);
  const [swapped, setSwapped] = useState<boolean[]>([false, false, false]);
  const [card, setCard] = useState<CardData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const rng = useRef<Rng | null>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  function buy() {
    if (!spend()) return;
    const r = createRng(freshSeed());
    rng.current = r;
    setParts(WORLD_PARTS.map((p) => drawFrom(r, p.entries, 1, context, "fresh")[0]));
    setOpen(0);
    setSwapped([false, false, false]);
    setCard(null);
    sfx.slide();
  }

  function unfold() {
    if (!parts || open >= 3) return;
    const i = open;
    setOpen(i + 1);
    sfx.peel();
    requestAnimationFrame(() =>
      play(
        panels.current[i],
        [
          { transform: "rotateY(-100deg)", opacity: 0.3 },
          { transform: "none", opacity: 1 },
        ],
        380,
        {
          easing: OVERSHOOT,
        },
      ),
    );
  }

  function swap(i: number) {
    if (!parts || !rng.current || swapped[i]) return;
    const next = drawFrom(rng.current, WORLD_PARTS[i].entries, 1, context, "wild", [
      parts[i].word,
    ])[0];
    setParts(parts.map((p, j) => (j === i ? next : p)));
    setSwapped(swapped.map((s, j) => s || j === i));
    sfx.whoosh();
    void play(panels.current[i], [{ transform: "rotateX(90deg)" }, { transform: "none" }], 260);
  }

  function keep() {
    if (!parts || !rng.current) return;
    setCard(worldCard(rng.current, parts));
    sfx.sparkle();
  }

  if (card) {
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
            if (ok) setParts(null);
            return ok;
          }}
          onTrash={(c, how) => {
            onTrash(c, how);
            setParts(null);
            setCard(null);
          }}
          onDragSlot={onDragSlot}
        />
        <span className="hint">drag it to WORLD</span>
      </div>
    );
  }

  if (!parts) {
    return (
      <div className="stop-play">
        <div className="map folded" aria-hidden>
          <div className="map-panel back" />
        </div>
        <button type="button" className="big-btn" onClick={buy} disabled={coins <= 0}>
          Buy a map · 1¢
        </button>
      </div>
    );
  }

  return (
    <div className="stop-play">
      <button
        type="button"
        className="map"
        onClick={unfold}
        disabled={open >= 3}
        aria-label="Unfold the map"
      >
        {WORLD_PARTS.map((p, i) => (
          <div
            key={p.label}
            ref={(el) => {
              panels.current[i] = el;
            }}
            className={`map-panel${i < open ? " open" : ""}`}
          >
            {i < open ? (
              <>
                <small>{p.label}</small>
                <strong>{parts[i].word}</strong>
              </>
            ) : (
              <span className="fold-mark">?</span>
            )}
          </div>
        ))}
      </button>
      {open < 3 ? (
        <span className="hint">tap the map to unfold ({open}/3)</span>
      ) : (
        <>
          <div className="row">
            {WORLD_PARTS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                className="link-btn"
                disabled={swapped[i]}
                onClick={() => swap(i)}
              >
                swap {p.label.toLowerCase()}
              </button>
            ))}
          </div>
          <button type="button" className="big-btn" onClick={keep}>
            Keep this map
          </button>
        </>
      )}
    </div>
  );
}
