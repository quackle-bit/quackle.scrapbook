"use client";

import { useRef, useState, type PointerEvent } from "react";
import { feel } from "@/feel";
import { drawPack, TYPE_LABEL, type InspirationCard } from "@/lib/inspiration";
import { haptic, OVERSHOOT, play } from "@/lib/motion";
import { createRng, freshSeed } from "@/lib/rng";
import type { CardType } from "@/lib/scrapbook/types";
import { sfx } from "@/lib/sound";
import { PaperCard } from "./PaperCard";

type Props = {
  type: CardType;
  /** Shown on the envelope, e.g. "Mechanics pack". */
  label: string;
  count?: number;
  /** Cards already in the collection (by inspiration id): they won't be drawn again. */
  hideIds?: string[];
  isKept: (c: InspirationCard) => boolean;
  isFavorite: (c: InspirationCard) => boolean;
  onToggleKeep: (c: InspirationCard) => void;
  onToggleFavorite: (c: InspirationCard) => void;
  onAddCustom?: (c: { title: string; description: string }) => void;
  /** Called once per envelope opened (progress: packs opened). */
  onOpened?: () => void;
  /** Word packs have no favorites; cards can still be kept (used) or set aside. */
  canFavorite?: boolean;
  keepLabel?: string;
  keptLabel?: string;
};

type Phase = "sealed" | "open";

/**
 * A booster pack: tear the envelope, flip the cards, then keep, favorite or set aside each one.
 * Keeping is a toggle (everything can be changed). Randomness only suggests; nothing is forced.
 */
export function BoosterPack({
  type,
  label,
  count = 5,
  hideIds = [],
  isKept,
  isFavorite,
  onToggleKeep,
  onToggleFavorite,
  onAddCustom,
  onOpened,
  canFavorite = true,
  keepLabel = "Keep",
  keptLabel = "✓ Kept (undo)",
}: Props) {
  const [phase, setPhase] = useState<Phase>("sealed");
  const [cards, setCards] = useState<InspirationCard[]>([]);
  const [faceUp, setFaceUp] = useState<Set<string>>(new Set());
  const [aside, setAside] = useState<Set<string>>(new Set());
  const [tear, setTear] = useState(0);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "" });
  const [empty, setEmpty] = useState(false);
  const seen = useRef(new Set<string>());
  const envRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; w: number; step: number } | null>(null);
  const opening = useRef(false);

  const draw = (n: number, extra: string[] = []) =>
    drawPack(type, n, createRng(freshSeed()), [...hideIds, ...seen.current, ...extra]);

  async function open() {
    if (phase !== "sealed" || opening.current) return;
    opening.current = true;
    drag.current = null;
    sfx.tearOff();
    haptic(feel.haptic.tear);
    setTear(1);
    await play(
      flapRef.current,
      [{ transform: "none" }, { transform: "translate(70px,-120px) rotate(30deg)", opacity: 0 }],
      feel.tearFlyOff,
      { fill: "forwards" },
    );
    const fresh = draw(count);
    fresh.forEach((c) => seen.current.add(c.id));
    setCards(fresh);
    setEmpty(fresh.length === 0);
    setFaceUp(new Set());
    setAside(new Set());
    setPhase("open");
    onOpened?.();
    opening.current = false;
    sfx.riffle();
    requestAnimationFrame(() =>
      Array.from(gridRef.current?.children ?? []).forEach((el, i) =>
        play(
          el,
          [
            { transform: "translateY(-30px) scale(.9)", opacity: 0 },
            { transform: "none", opacity: 1 },
          ],
          320,
          {
            delay: i * 70,
            easing: OVERSHOOT,
            fill: "backwards",
          },
        ),
      ),
    );
  }

  function openAnother() {
    setPhase("sealed");
    setTear(0);
    setWriting(false);
  }

  /** Replace the cards that weren't kept with fresh, face-down ones. */
  function reroll() {
    const keep = cards.filter((c) => isKept(c));
    const fresh = draw(
      count - keep.length,
      keep.map((c) => c.id),
    );
    fresh.forEach((c) => seen.current.add(c.id));
    setCards([...keep, ...fresh]);
    setFaceUp((f) => new Set([...f].filter((id) => keep.some((k) => k.id === id))));
    setAside(new Set());
    setEmpty(fresh.length === 0 && keep.length === 0);
    sfx.riffle();
  }

  function flip(c: InspirationCard) {
    if (faceUp.has(c.id)) return;
    sfx.thup();
    setFaceUp((f) => new Set(f).add(c.id));
  }
  function flipAll() {
    cards.forEach((c, i) => setTimeout(() => flip(c), i * 90));
  }

  // Tear gesture (drag across), with a tap fallback.
  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phase !== "sealed") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x0: e.clientX, w: e.currentTarget.getBoundingClientRect().width, step: 0 };
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const p = Math.min(1, Math.abs(e.clientX - d.x0) / d.w);
    setTear(p);
    const step = Math.floor(p * 10);
    if (step > d.step) {
      d.step = step;
      sfx.rip(1 + p);
    }
    if (p >= feel.tearThreshold) void open();
  }
  function onUp() {
    if (!drag.current) return;
    drag.current = null;
    if (!opening.current) setTear(0);
  }

  const unflipped = cards.filter((c) => !faceUp.has(c.id)).length;

  if (phase === "sealed") {
    return (
      <div className="dk-pack">
        <div ref={envRef} className="dk-env" style={{ ["--tear" as string]: tear }}>
          <div
            ref={flapRef}
            className="dk-env-flap"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <i className="dk-env-tear" />
            <span>drag across to tear →</span>
          </div>
          <div className="dk-env-body">
            <span className="dk-env-seal" aria-hidden />
            <strong>{label}</strong>
            <small>{count} cards inside</small>
          </div>
        </div>
        <button type="button" className="dk-btn small" onClick={() => void open()}>
          Open the envelope
        </button>
      </div>
    );
  }

  return (
    <div className="dk-pack">
      <div className="dk-pack-head">
        <strong>{label}</strong>
        {unflipped > 0 && (
          <button type="button" className="dk-btn small" onClick={flipAll}>
            Flip all
          </button>
        )}
      </div>

      {empty ? (
        <p className="dk-empty">
          You&apos;ve seen every {TYPE_LABEL[type].toLowerCase()} card in the deck.{" "}
          <button
            type="button"
            className="dk-link"
            onClick={() => {
              seen.current.clear();
              reroll();
            }}
          >
            Shuffle the set-aside ones back in
          </button>
        </p>
      ) : (
        <div ref={gridRef} className="dk-pack-grid">
          {cards.map((c) => {
            const up = faceUp.has(c.id);
            const kept = isKept(c);
            const fav = isFavorite(c);
            const away = aside.has(c.id) && !kept;
            return (
              <div key={c.id} className={`dk-slotcard${away ? " away" : ""}`}>
                {up ? (
                  <PaperCard
                    type={type}
                    title={c.title}
                    description={c.description}
                    category={c.category}
                    kept={kept}
                    favorite={fav}
                  />
                ) : (
                  <button
                    type="button"
                    className="dk-card dk-card-back"
                    onClick={() => flip(c)}
                    aria-label="Face-down card. Tap to flip."
                  >
                    <span>Q</span>
                    <small>tap to flip</small>
                  </button>
                )}
                {up && (
                  <div className="dk-card-actions">
                    {away ? (
                      <button
                        type="button"
                        className="dk-btn small"
                        onClick={() => setAside((s) => new Set([...s].filter((x) => x !== c.id)))}
                      >
                        ↶ Bring back
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`dk-btn small${kept ? "" : " primary"}`}
                          aria-pressed={kept}
                          onClick={() => {
                            if (!kept) {
                              sfx.thud();
                              haptic(feel.haptic.thud);
                            } else sfx.peel();
                            onToggleKeep(c);
                          }}
                        >
                          {kept ? keptLabel : keepLabel}
                        </button>
                        <div className="dk-row2">
                          {canFavorite && (
                            <button
                              type="button"
                              className="dk-btn small"
                              aria-pressed={fav}
                              onClick={() => {
                                sfx.tink();
                                onToggleFavorite(c);
                              }}
                              aria-label={fav ? "Remove favorite" : "Mark as favorite"}
                            >
                              {fav ? "★" : "☆"}
                            </button>
                          )}
                          {!kept && (
                            <button
                              type="button"
                              className="dk-btn small ghost"
                              style={{ color: "var(--ink-soft)" }}
                              onClick={() => {
                                sfx.crumple();
                                setAside((s) => new Set(s).add(c.id));
                              }}
                            >
                              Set aside
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="dk-pack-foot">
        <button type="button" className="dk-btn small" onClick={reroll}>
          ↻ Reroll the rest
        </button>
        <button type="button" className="dk-btn small primary" onClick={openAnother}>
          Open another pack
        </button>
        {onAddCustom && (
          <button
            type="button"
            className="dk-btn small ghost"
            onClick={() => setWriting((w) => !w)}
            aria-expanded={writing}
          >
            Write my own
          </button>
        )}
      </div>

      {writing && onAddCustom && (
        <form
          className="dk-custom"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.title.trim()) return;
            onAddCustom({ title: draft.title.trim(), description: draft.description.trim() });
            setDraft({ title: "", description: "" });
            sfx.thud();
          }}
        >
          <label className="dk-field">
            <span>Name</span>
            <input
              className="dk-input"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              maxLength={50}
              placeholder={`Your own ${TYPE_LABEL[type].toLowerCase()}`}
            />
          </label>
          <label className="dk-field">
            <span>Short explanation (optional)</span>
            <input
              className="dk-input"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              maxLength={140}
            />
          </label>
          <button type="submit" className="dk-btn primary" disabled={!draft.title.trim()}>
            Add to my scrapbook
          </button>
        </form>
      )}
    </div>
  );
}
