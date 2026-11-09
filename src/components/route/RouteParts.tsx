"use client";

import { useEffect, useRef, useState } from "react";
import { SLOT_LABEL, type CardData, type SlotId } from "@/lib/deck";
import { OVERSHOOT, play } from "@/lib/motion";
import { STOPS, type StopId } from "@/lib/route";
import { sfx } from "@/lib/sound";
import { StampedCard } from "../MiniPage";
import { SpreadView, type Concept, type SparkNote } from "../book/SpreadView";

/** Street lamps along the top: lit = done, current glows, tap a lit lamp to walk back. */
export function RouteBar({
  stops,
  index,
  lit,
  skipped,
  canSkip,
  onGo,
  onSkip,
  timer,
}: {
  stops: StopId[];
  index: number;
  lit: StopId[];
  skipped: StopId[];
  canSkip: boolean;
  onGo: (i: number) => void;
  onSkip: () => void;
  timer: number | null;
}) {
  const ref = useRef<HTMLOListElement>(null);
  const prevLit = useRef(lit.length);
  useEffect(() => {
    if (lit.length > prevLit.current) {
      const el = ref.current?.querySelector(`[data-stop="${lit[lit.length - 1]}"]`);
      void play(
        el,
        [{ transform: "scale(1.6)", filter: "brightness(2)" }, { transform: "none" }],
        400,
        { easing: OVERSHOOT },
      );
    }
    prevLit.current = lit.length;
  }, [lit]);
  const total = stops.length;
  return (
    <nav className="route-bar" aria-label="The street">
      <ol ref={ref} className="lamps">
        {stops.map((s, i) => {
          const isLit = lit.includes(s);
          const state =
            i === index ? "current" : isLit ? "lit" : skipped.includes(s) ? "skipped" : "off";
          return (
            <li key={s}>
              <button
                type="button"
                data-stop={s}
                className={`lamp ${state}`}
                disabled={!isLit && !skipped.includes(s) && i !== index}
                onClick={() => onGo(i)}
                aria-label={`${STOPS[s].name}${isLit ? " (done)" : ""}`}
                aria-current={i === index ? "step" : undefined}
              />
            </li>
          );
        })}
      </ol>
      <span className="route-count">
        Stop {index + 1} of {total}
      </span>
      {timer !== null && (
        <span
          className={`route-timer${timer <= 10 ? " low" : ""}`}
          aria-label={`${timer} seconds left at this stop`}
        >
          {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
        </span>
      )}
      {canSkip && (
        <button type="button" className="skip" onClick={onSkip}>
          skip ›
        </button>
      )}
    </nav>
  );
}

/** Bottom of every stop: only the slot being filled today, plus the book button. */
export function BookPeek({
  slot,
  card,
  want,
  filled,
  total,
  onPeel,
  onOpenBook,
  justStamped,
}: {
  slot?: SlotId;
  card?: CardData;
  want: boolean;
  filled: number;
  total: number;
  onPeel: () => void;
  onOpenBook: () => void;
  justStamped: string | null;
}) {
  return (
    <div className="book-peek">
      {slot ? (
        <div
          className={`slot peek-slot${card ? " filled" : ""}${want ? " want" : ""}`}
          data-drop="slot"
          data-slot={slot}
        >
          {card ? (
            <StampedCard
              key={card.id}
              card={card}
              tilt={0}
              onPeel={onPeel}
              animate={justStamped === card.id}
            />
          ) : (
            <span className="slot-label">{SLOT_LABEL[slot]}</span>
          )}
        </div>
      ) : (
        <div className="peek-spacer" />
      )}
      <div className="peek-info">
        <span className="progress">
          {filled}/{total} stamped
        </span>
        {slot && !card && <span className="hint">drag a card down here</span>}
      </div>
      <button type="button" className="big-btn book-btn" onClick={onOpenBook}>
        Book
      </button>
    </div>
  );
}

/** The duck's spark question, shown after a card is stamped. One optional line. */
export function SparkCard({
  question,
  answer,
  onAnswer,
  onNext,
  nextLabel,
  detour,
}: {
  question: string;
  answer: string;
  onAnswer: (a: string) => void;
  onNext: () => void;
  nextLabel: string;
  detour?: { label: string; onGo: () => void };
}) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    void play(
      ref.current,
      [
        { transform: "translateY(20px) scale(.95)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      300,
      {
        easing: OVERSHOOT,
      },
    );
  }, []);
  return (
    <form
      ref={ref}
      className="spark"
      onSubmit={(e) => {
        e.preventDefault();
        sfx.tink();
        onNext();
      }}
    >
      <p className="spark-q">🦆 {question}</p>
      <input
        className="hand"
        value={answer}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="(optional) one line…"
        maxLength={140}
        aria-label={question}
      />
      <div className="row">
        <button type="submit" className="big-btn">
          {nextLabel}
        </button>
        {detour && (
          <button type="button" className="signpost" onClick={detour.onGo}>
            ↪ {detour.label}
          </button>
        )}
      </div>
    </form>
  );
}

/** Full book overlay: the spread, the inside cover (anti-goal) and spark notes. */
export function BookOverlay({
  title,
  color,
  antiGoal,
  slots,
  cards,
  concept,
  notes,
  onClose,
}: {
  title: string;
  color: string;
  antiGoal: string;
  slots: SlotId[];
  cards: Partial<Record<SlotId, CardData>>;
  concept: Concept | null;
  notes: SparkNote[];
  onClose: () => void;
}) {
  const [page, setPage] = useState<"cover" | "spread">("spread");
  useEffect(() => {
    sfx.peel();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="overlay-book" style={{ ["--cover" as string]: color }}>
        <div className="overlay-head">
          <strong>{title}</strong>
          <div className="row">
            <button
              type="button"
              className="act"
              aria-pressed={page === "cover"}
              onClick={() => setPage("cover")}
            >
              inside cover
            </button>
            <button
              type="button"
              className="act"
              aria-pressed={page === "spread"}
              onClick={() => setPage("spread")}
            >
              spread
            </button>
            <button type="button" className="act" onClick={onClose} aria-label="Close book">
              ✕
            </button>
          </div>
        </div>
        {page === "cover" ? (
          <div className="inside-cover">
            <small>Today I will NOT make…</small>
            <p className="hand-note">{antiGoal || "(nothing written)"}</p>
          </div>
        ) : (
          <SpreadView slots={slots} cards={cards} concept={concept} notes={notes} />
        )}
      </div>
    </div>
  );
}
