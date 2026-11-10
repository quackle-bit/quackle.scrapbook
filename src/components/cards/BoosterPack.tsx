"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { feel } from "@/feel";
import { drawPack, TYPE_LABEL, type InspirationCard } from "@/lib/inspiration";
import { haptic, OVERSHOOT, play } from "@/lib/motion";
import { createRng, freshSeed } from "@/lib/rng";
import type { CardType, CollectedCard } from "@/lib/scrapbook/types";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { say, sayRandom } from "../Duck";
import { KEEPERS, pickLine } from "../feel/keepers";
import { FoldedMap, GearPress, ShellGame, TailorReels, TarotSpread } from "../feel/openers";

type Props = {
  type: CardType;
  label: string;
  /** Cards per pack (2×2 grid). */
  count?: number;
  /** Cards already collected (by inspiration id): they won't be drawn again. */
  hideIds?: string[];
  isKept: (c: InspirationCard) => boolean;
  isFavorite?: (c: InspirationCard) => boolean;
  onToggleKeep: (c: InspirationCard) => void;
  onToggleFavorite?: (c: InspirationCard) => void;
  onAddCustom?: (c: { title: string; description: string }) => void;
  onOpened?: () => void;
  onTrashed?: () => void;
  /** What's already kept on this page (shown as taped labels, removable). */
  kept?: CollectedCard[];
  onRemove?: (id: string) => void;
  /** At most this many kept on this page. */
  max?: number;
  canFavorite?: boolean;
  keepLabel?: string;
  keptLabel?: string;
  /** Shown under the board only (hidden while a pack is open, so the page never scrolls). */
  boardExtra?: ReactNode;
};

/** Stalls with their own reveal; the others use a pixel envelope. */
const OPENERS: Partial<Record<CardType, typeof GearPress>> = {
  mechanic: GearPress,
  setting: FoldedMap,
  mood: TarotSpread,
  visual: TailorReels,
  twist: ShellGame,
};

type Phase = "board" | "opening" | "choose";

/**
 * A stall on the page, sized for a phone with no scrolling:
 * board (what you kept) → open a pack (the stall's mini-game) → 4 cards in a 2×2 grid →
 * tap to flip, tap to choose → Keep chosen. The rest go in the bin, which you can still open.
 */
export function BoosterPack({
  type,
  label,
  count = 4,
  hideIds = [],
  isKept,
  onToggleKeep,
  onAddCustom,
  onOpened,
  onTrashed,
  kept = [],
  onRemove,
  max,
  boardExtra,
}: Props) {
  const keeper = KEEPERS[type];
  const [line, setLine] = useState(keeper.greet[0]);
  const [phase, setPhase] = useState<Phase>("board");
  const [cards, setCards] = useState<InspirationCard[]>([]);
  const [up, setUp] = useState<Set<string>>(new Set());
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [bin, setBin] = useState<InspirationCard[]>([]);
  const [binOpen, setBinOpen] = useState(false);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const [empty, setEmpty] = useState(false);
  const seen = useRef(new Set<string>());
  const pending = useRef<InspirationCard[] | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const quick = () => settings.get().reducedMotion || settings.get().speed;

  useEffect(() => {
    const t = setTimeout(() => setLine(pickLine(keeper.greet)), 0);
    return () => clearTimeout(t);
  }, [keeper]);

  const room = max ? Math.max(0, max - kept.length) : Infinity;

  /** Draw once per pack (openers may peek at the titles first). */
  function peek() {
    if (!pending.current) {
      const c = drawPack(type, count, createRng(freshSeed()), [...hideIds, ...seen.current]);
      c.forEach((x) => seen.current.add(x.id));
      pending.current = c;
    }
    return pending.current;
  }

  function startOpening() {
    pending.current = null;
    setChosen(new Set());
    setUp(new Set());
    setBinOpen(false);
    setWriting(false);
    setPhase("opening");
  }

  function deal(faceUp: boolean) {
    const c = peek();
    pending.current = null;
    if (!c.length) {
      setEmpty(true);
      setPhase("board");
      return;
    }
    onOpened?.();
    sayRandom("open");
    setCards(c);
    setUp(new Set(faceUp ? c.map((x) => x.id) : []));
    setPhase("choose");
    if (!quick())
      requestAnimationFrame(() =>
        Array.from(grid.current?.children ?? []).forEach((el, i) =>
          play(
            el,
            [
              { transform: "translateY(-24px) scale(.85)", opacity: 0 },
              { transform: "none", opacity: 1 },
            ],
            260,
            {
              delay: i * 70,
              easing: OVERSHOOT,
              fill: "backwards",
            },
          ),
        ),
      );
    sfx.riffle();
  }

  function tap(c: InspirationCard) {
    if (!up.has(c.id)) {
      sfx.thup();
      setUp((u) => new Set(u).add(c.id));
      return;
    }
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(c.id)) {
        n.delete(c.id);
        sfx.peel();
      } else {
        if (n.size >= room) {
          say(max === 1 ? "Just one here." : `Room for ${room} more.`);
          return s;
        }
        n.add(c.id);
        sfx.tick();
      }
      return n;
    });
  }

  async function keepChosen() {
    const els = Array.from(grid.current?.children ?? []) as HTMLElement[];
    const keep = cards.filter((c) => chosen.has(c.id));
    const toss = cards.filter((c) => !chosen.has(c.id));
    if (!quick())
      await Promise.all(
        cards.map((c, i) =>
          chosen.has(c.id)
            ? play(
                els[i],
                [
                  { transform: "none" },
                  { transform: "translateY(-30px) scale(1.05)" },
                  { transform: "translateY(-90px) scale(.6)", opacity: 0 },
                ],
                380,
                {
                  fill: "forwards",
                },
              )
            : play(
                els[i],
                [{ transform: "none" }, { transform: "scale(.3) rotate(160deg)", opacity: 0 }],
                320,
                { fill: "forwards", delay: 80 },
              ),
        ),
      );
    keep.forEach((c) => !isKept(c) && onToggleKeep(c));
    toss.forEach(() => onTrashed?.());
    setBin((b) => [...toss, ...b]);
    if (keep.length) {
      sfx.thud();
      haptic(feel.haptic.thud);
      setLine(pickLine(keeper.kept));
      sayRandom("stamp");
    } else {
      sfx.crumple();
      setLine(pickLine(keeper.trashed));
      sayRandom("trash");
    }
    setCards([]);
    setPhase("board");
  }

  const Opener = OPENERS[type];

  return (
    <div className="px-stall">
      <header className="px-stall-head">
        <strong>{keeper.stall}</strong>
        <span aria-live="polite">“{line}”</span>
        <button
          type="button"
          className="px-bin"
          onClick={() => setBinOpen((o) => !o)}
          aria-label={`Bin: ${bin.length} card${bin.length === 1 ? "" : "s"}. Open it to take cards back.`}
          aria-expanded={binOpen}
        >
          <i aria-hidden />
          {bin.length}
        </button>
      </header>

      <div className="px-stall-body">
        {binOpen ? (
          <div className="px-binlist">
            {bin.length === 0 ? (
              <p className="dk-hint">The bin is empty.</p>
            ) : (
              <ul>
                {bin.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <span>{c.title}</span>
                    <button
                      type="button"
                      className="dk-btn small"
                      onClick={() => {
                        onToggleKeep(c);
                        setBin((b) => b.filter((x) => x.id !== c.id));
                        sfx.peel();
                      }}
                    >
                      Take back
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="dk-btn small ghost" onClick={() => setBinOpen(false)}>
              Close the bin
            </button>
          </div>
        ) : phase === "board" ? (
          <div className="px-board">
            {kept.length > 0 ? (
              <ul className="px-taped">
                {kept.map((c, i) => (
                  <li key={c.id} style={{ rotate: `${((i * 37) % 7) - 3}deg` }}>
                    <span>{c.title}</span>
                    {onRemove && (
                      <button
                        type="button"
                        aria-label={`Remove ${c.title}`}
                        onClick={() => onRemove(c.id)}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-board-empty">Nothing kept yet. Open a pack!</p>
            )}
            {boardExtra}
            {empty && (
              <p className="dk-hint">
                You&apos;ve seen every {TYPE_LABEL[type].toLowerCase()} card.{" "}
                <button
                  type="button"
                  className="dk-link"
                  onClick={() => {
                    seen.current.clear();
                    setEmpty(false);
                  }}
                >
                  Shuffle them back in
                </button>
              </p>
            )}
            {writing && onAddCustom ? (
              <form
                className="px-write"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  onAddCustom({ title: draft.trim(), description: "" });
                  setDraft("");
                  setWriting(false);
                  sfx.thud();
                }}
              >
                <input
                  className="dk-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={50}
                  placeholder={`Your own ${TYPE_LABEL[type].toLowerCase()}`}
                  aria-label={`Your own ${TYPE_LABEL[type].toLowerCase()}`}
                  autoFocus
                />
                <button type="submit" className="dk-btn small primary" disabled={!draft.trim()}>
                  Add
                </button>
              </form>
            ) : (
              <div className="px-actions">
                <button
                  type="button"
                  className="dk-btn primary"
                  onClick={startOpening}
                  disabled={room === 0}
                >
                  {room === 0
                    ? "Page full"
                    : kept.length
                      ? "Open another pack"
                      : `Open a ${label.toLowerCase()}`}
                </button>
                {onAddCustom && (
                  <button
                    type="button"
                    className="dk-btn small ghost"
                    onClick={() => setWriting(true)}
                  >
                    Write my own
                  </button>
                )}
              </div>
            )}
          </div>
        ) : phase === "opening" ? (
          Opener ? (
            <Opener open={() => deal(type !== "mood")} titles={() => peek().map((c) => c.title)} />
          ) : (
            <button type="button" className="px-envelope" onClick={() => deal(false)}>
              <span className="px-envelope-flap" aria-hidden />
              <strong>{label}</strong>
              <small>tap to open</small>
            </button>
          )
        ) : (
          <div className="px-choose">
            <div ref={grid} className="px-grid">
              {cards.map((c) => {
                const isUp = up.has(c.id);
                const on = chosen.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`px-card t-${type}${isUp ? " up" : ""}${on ? " chosen" : ""}`}
                    onClick={() => tap(c)}
                    aria-pressed={isUp ? on : undefined}
                    aria-label={
                      isUp
                        ? `${c.title}. ${c.description}. ${on ? "Chosen" : "Tap to choose"}`
                        : "Face-down card. Tap to flip."
                    }
                  >
                    <span className="px-card-inner">
                      <span className="px-card-back" aria-hidden>
                        ?
                      </span>
                      <span className="px-card-face">
                        <small>{TYPE_LABEL[type]}</small>
                        <strong>{c.title}</strong>
                        <em>{c.description}</em>
                      </span>
                    </span>
                    {on && (
                      <span className="px-check" aria-hidden>
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="px-actions">
              {up.size < cards.length ? (
                <button
                  type="button"
                  className="dk-btn"
                  onClick={() =>
                    cards.forEach((c, i) =>
                      setTimeout(() => setUp((u) => new Set(u).add(c.id)), i * 90),
                    )
                  }
                >
                  Flip all
                </button>
              ) : (
                <button type="button" className="dk-btn primary" onClick={() => void keepChosen()}>
                  {chosen.size ? `Keep chosen (${chosen.size})` : "None of these"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
