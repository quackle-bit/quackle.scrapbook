"use client";

import { useState } from "react";
import { drawCards } from "@/lib/deck";
import { createRng, freshSeed } from "@/lib/rng";
import { sfx } from "@/lib/sound";
import { say } from "../Duck";
import { HandCard } from "../HandCard";
import type { CardData, StopProps } from "./types";

const SPREAD = ["Past", "Present", "Future"];

/**
 * The Fortune Teller: three face-down mood cards, Past / Present / Future.
 * Flip them one by one; she reads the spread; keep the one that rings true.
 */
export function Tarot({ coins, spend, context, onStamp, onTrash, onDragSlot }: StopProps) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [left, setLeft] = useState<Set<string>>(new Set());
  const [up, setUp] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);

  function deal() {
    if (!spend()) return;
    const c = drawCards(createRng(freshSeed()), "mood", 3, context, "fresh");
    setCards(c);
    setLeft(new Set(c.map((x) => x.id)));
    setUp(new Set());
    sfx.riffle();
  }

  function flipped(card: CardData) {
    setUp((u) => {
      const next = new Set(u).add(card.id);
      if (next.size === cards.length) {
        const present = cards[1]?.text.replace(/\.$/, "").toLowerCase();
        setTimeout(() => say(`I see… ${present}. Choose wisely.`, { tag: "sleepy", ms: 900 }), 300);
      }
      return next;
    });
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
        <div className="tarot-table" aria-hidden>
          {SPREAD.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <button type="button" className="big-btn" onClick={deal} disabled={coins <= 0}>
          Read my fortune · 1¢
        </button>
      </div>
    );
  }

  return (
    <div className="stop-play">
      <div className="tarot-row">
        {cards.map((c, i) => (
          <div key={c.id} className="tarot-slot">
            <span className="tarot-label">{SPREAD[i]}</span>
            {left.has(c.id) ? (
              <HandCard
                card={c}
                selected={selected === c.id}
                onSelect={setSelected}
                onFlipped={flipped}
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
            ) : (
              <div className="tarot-empty" />
            )}
          </div>
        ))}
      </div>
      <span className="hint">
        {up.size < cards.length ? "flip them one by one" : "drag the one that rings true to MOOD"}
      </span>
    </div>
  );
}
