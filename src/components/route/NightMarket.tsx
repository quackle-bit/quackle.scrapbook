"use client";

import { useState } from "react";
import { SLOT_LABEL, type CardData, type SlotId } from "@/lib/deck";
import { sfx } from "@/lib/sound";
import { CardFace } from "../Card";
import { say } from "../Duck";
import { SpreadView, type Concept, type SparkNote } from "../book/SpreadView";

/**
 * The Night Market: swap any stamped card with one from today's discard pile, read your spark
 * answers together, then close the book.
 */
export function NightMarket({
  slots,
  cards,
  discard,
  concept,
  notes,
  onSwap,
  onClose,
}: {
  slots: SlotId[];
  cards: Partial<Record<SlotId, CardData>>;
  discard: CardData[];
  concept: Concept | null;
  notes: SparkNote[];
  onSwap: (slot: SlotId, card: CardData) => void;
  onClose: () => void;
}) {
  const [slot, setSlot] = useState<SlotId | null>(null);
  const fits = (c: CardData) => slot && (slot === "free" || c.slot === slot);
  const candidates = slot ? discard.filter(fits) : [];

  return (
    <div className="stop-play night">
      <SpreadView
        slots={slots}
        cards={cards}
        concept={concept}
        notes={notes}
        onSlot={setSlot}
        activeSlot={slot}
      />
      {slot ? (
        <div className="discard-pick">
          <span className="hint">
            Swap {SLOT_LABEL[slot]} with a card from the discard pile ({candidates.length})
          </span>
          <div className="discard-row">
            {candidates.length ? (
              candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="discard-card"
                  onClick={() => {
                    onSwap(slot, c);
                    sfx.peel();
                    say("Un-crumpled. Good as new.");
                    setSlot(null);
                  }}
                >
                  <CardFace card={c} small />
                </button>
              ))
            ) : (
              <span className="hint">Nothing in the pile fits that slot.</span>
            )}
          </div>
          <button type="button" className="link-btn" onClick={() => setSlot(null)}>
            cancel
          </button>
        </div>
      ) : (
        <span className="hint">tap a slot to swap it with a trashed card</span>
      )}
      <button type="button" className="big-btn" onClick={onClose}>
        Close the book
      </button>
    </div>
  );
}
