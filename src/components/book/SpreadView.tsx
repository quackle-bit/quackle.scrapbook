"use client";

import { forwardRef, type ReactNode } from "react";
import { SLOT_LABEL, type CardData, type SlotId } from "@/lib/deck";
import { CardFace } from "../Card";

export type Concept = {
  title: string;
  logline: string;
  palette: string[];
};

export type SparkNote = { stop: string; q: string; a: string };

/** Deterministic small tilt per card id, so stamps look hand-placed but don't jump around. */
export function tiltFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 600) / 100 - 3).toFixed(2);
}

export function StampedMini({
  card,
  onClick,
  label,
}: {
  card: CardData;
  onClick?: () => void;
  label?: string;
}) {
  const body = (
    <div className="stamped" style={{ transform: `rotate(${tiltFor(card.id)}deg)` }}>
      <CardFace card={card} small />
      <div className="tape" style={{ background: `var(--t-${card.slot})` }} />
    </div>
  );
  return onClick ? (
    <button type="button" className="stamped-btn" onClick={onClick} aria-label={label ?? card.text}>
      {body}
    </button>
  ) : (
    body
  );
}

export function Polaroid({ concept, children }: { concept: Concept; children?: ReactNode }) {
  const [p0, p1, p2, p3] = concept.palette;
  return (
    <div className="polaroid">
      <div
        className="polaroid-img"
        style={{
          ["--p0" as string]: p0,
          ["--p1" as string]: p1,
          ["--p2" as string]: p2,
          ["--p3" as string]: p3,
        }}
      >
        <span>{concept.title}</span>
      </div>
      {children ?? <div className="polaroid-title static">{concept.title}</div>}
      <p className="logline">{concept.logline}</p>
    </div>
  );
}

type Props = {
  slots: SlotId[];
  cards: Partial<Record<SlotId, CardData>>;
  concept?: Concept | null;
  notes?: SparkNote[];
  /** Left-page extra (e.g. a forge button) and right-page override. */
  right?: ReactNode;
  onSlot?: (slot: SlotId) => void;
  activeSlot?: SlotId | null;
  className?: string;
};

/** A book spread: stamped slots on the left page, the concept and notes on the right. */
export const SpreadView = forwardRef<HTMLDivElement, Props>(function SpreadView(
  { slots, cards, concept, notes, right, onSlot, activeSlot, className },
  ref,
) {
  return (
    <div ref={ref} className={`book-spread ${className ?? ""}`}>
      <div className="book-page left">
        <div className="book-slots">
          {slots.map((s) => {
            const card = cards[s];
            return (
              <div
                key={s}
                className={`book-slot${activeSlot === s ? " active" : ""}`}
                data-slot-view={s}
              >
                <span className="slot-label">{SLOT_LABEL[s]}</span>
                {card ? (
                  <StampedMini card={card} onClick={onSlot ? () => onSlot(s) : undefined} />
                ) : onSlot ? (
                  <button
                    type="button"
                    className="slot-empty"
                    onClick={() => onSlot(s)}
                    aria-label={`${SLOT_LABEL[s]} (empty)`}
                  >
                    ?
                  </button>
                ) : (
                  <span className="slot-empty">?</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="book-page right">
        {right ?? (
          <>
            {concept ? (
              <Polaroid concept={concept} />
            ) : (
              <div className="concept-empty">
                <span>concept</span>
                <small>forge it at the end of the street</small>
              </div>
            )}
            {!!notes?.length && (
              <ul className="notes">
                {notes
                  .filter((n) => n.a.trim())
                  .map((n) => (
                    <li key={n.q}>
                      <small>{n.q}</small>
                      <span>{n.a}</span>
                    </li>
                  ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
});
