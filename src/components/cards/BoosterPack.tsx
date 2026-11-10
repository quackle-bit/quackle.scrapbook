"use client";

import { useEffect, useRef, useState } from "react";
import { feel } from "@/feel";
import { drawPack, TYPE_LABEL, type InspirationCard } from "@/lib/inspiration";
import { haptic, play } from "@/lib/motion";
import { createRng, freshSeed } from "@/lib/rng";
import type { CardType } from "@/lib/scrapbook/types";
import { sfx } from "@/lib/sound";
import { sayRandom } from "../Duck";
import { KEEPERS, pickLine } from "../feel/keepers";
import { PackOpen } from "../feel/PackOpen";
import { FoldedMap, GearPress, ShellGame, TailorReels, TarotSpread } from "../feel/openers";

/** Stalls with their own mini-game; the rest use the envelope. faceUp = the game already revealed them. */
const OPENERS: Partial<
  Record<CardType, { Game: typeof GearPress; faceUp: boolean; hint: string }>
> = {
  mechanic: { Game: GearPress, faceUp: true, hint: "Press the cards out" },
  setting: { Game: FoldedMap, faceUp: true, hint: "Unfold the map" },
  mood: { Game: TarotSpread, faceUp: false, hint: "Flip the cards: past, present, future" },
  visual: { Game: TailorReels, faceUp: true, hint: "Spin the reels" },
  twist: { Game: ShellGame, faceUp: true, hint: "Find the twist under the cups" },
};
import { CardBack, PaperCard } from "./PaperCard";

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
  onOpened?: () => void;
  /** A card went in the bin (progress: cards trashed). */
  onTrashed?: () => void;
  canFavorite?: boolean;
  keepLabel?: string;
  keptLabel?: string;
};

/**
 * A stall on the page: its keeper greets you, you tear a pack, the cards fan out face-down, you flip them,
 * then drag the good ones onto the page (thud, tape, stamp) and crumple / rip / fling the rest into the bin.
 * Nothing is lost: the bin keeps this visit's cards so you can fish them back out.
 */
export function BoosterPack({
  type,
  label,
  count = 5,
  hideIds = [],
  isKept,
  onToggleKeep,
  onAddCustom,
  onOpened,
  onTrashed,
  keepLabel = "Stick it in",
}: Props) {
  const keeper = KEEPERS[type];
  const [line, setLine] = useState(keeper.greet[0]);
  const [packNo, setPackNo] = useState(0);
  const [phase, setPhase] = useState<"pack" | "done" | "empty">("pack");
  const [stuck, setStuck] = useState<InspirationCard[]>([]);
  const [bin, setBin] = useState<InspirationCard[]>([]);
  const [binOpen, setBinOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [stampKey, setStampKey] = useState(0);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "" });
  const seen = useRef(new Set<string>());
  const dropRef = useRef<HTMLDivElement>(null);
  const binRef = useRef<HTMLDivElement>(null);

  // A different greeting each visit (after hydration, so server and client agree).
  useEffect(() => {
    const t = setTimeout(() => setLine(pickLine(keeper.greet)), 0);
    return () => clearTimeout(t);
  }, [keeper]);

  function draw() {
    const cards = drawPack(type, count, createRng(freshSeed()), [...hideIds, ...seen.current]);
    cards.forEach((c) => seen.current.add(c.id));
    if (!cards.length) setTimeout(() => setPhase("empty"), 0);
    return cards;
  }

  function stick(c: InspirationCard) {
    if (!isKept(c)) onToggleKeep(c);
    setStuck((s) => [c, ...s.filter((x) => x.id !== c.id)].slice(0, 4));
    setBin((b) => b.filter((x) => x.id !== c.id));
    sfx.thud();
    haptic(feel.haptic.thud);
    setStampKey((k) => k + 1);
    setLine(pickLine(keeper.kept));
    sayRandom("stamp");
    void play(
      dropRef.current,
      [
        { transform: "none" },
        { transform: "translate(-4px,2px)" },
        { transform: "translate(4px,-2px)" },
        { transform: "translate(-2px,1px)" },
        { transform: "none" },
      ],
      feel.shake,
    );
  }

  function another() {
    setPackNo((n) => n + 1);
    setPhase("pack");
    setWriting(false);
  }

  return (
    <div className="dk-pack">
      <header className="dk-stall">
        <div className="dk-awning" aria-hidden />
        <div className="dk-stall-sign">
          <strong>{keeper.stall}</strong>
          <p className="dk-stall-line" aria-live="polite">
            “{line}”
          </p>
        </div>
      </header>

      {phase === "pack" && (
        <PackOpen<InspirationCard>
          key={packNo}
          skin="paper"
          label={label}
          sub={`${count} cards inside`}
          hint="drag a card onto the page · hold to crumple · swipe down to rip · fling it away"
          draw={draw}
          faceUp={OPENERS[type]?.faceUp}
          opener={
            OPENERS[type]
              ? ({ open, peek }) => {
                  const { Game } = OPENERS[type]!;
                  return <Game open={open} titles={() => peek().map((c) => c.title)} />;
                }
              : undefined
          }
          onOpened={() => onOpened?.()}
          onDone={() => setPhase("done")}
          card={{
            renderFace: (c, style) => (
              <div style={style}>
                <PaperCard
                  type={type}
                  title={c.title}
                  description={c.description}
                  category={c.category}
                  kept={isKept(c)}
                />
              </div>
            ),
            renderBack: () => <CardBack label={TYPE_LABEL[type]} />,
            label: (c, up) =>
              up
                ? `${c.title}. Drag onto the page to keep, or press for actions.`
                : "Face-down card. Press to flip.",
            accepts: () => true,
            findTarget: () => dropRef.current,
            stampLabel: keepLabel,
            onStamp: (c) => {
              stick(c);
              return true;
            },
            onTrash: (c) => {
              setBin((b) => [c, ...b]);
              onTrashed?.();
              setLine(pickLine(keeper.trashed));
              sayRandom("trash");
              void play(
                binRef.current,
                [
                  { transform: "none" },
                  { transform: "rotate(-8deg)" },
                  { transform: "rotate(6deg)" },
                  { transform: "none" },
                ],
                320,
              );
            },
            onDragging: (c) => setDragging(!!c),
          }}
        />
      )}

      {phase === "empty" && (
        <p className="dk-empty">
          You&apos;ve seen every {TYPE_LABEL[type].toLowerCase()} card at this stall.{" "}
          <button
            type="button"
            className="dk-link"
            onClick={() => {
              seen.current.clear();
              another();
            }}
          >
            Shuffle them back in
          </button>
        </p>
      )}

      <div className="dk-drop-row">
        <div ref={dropRef} data-drop="slot" className={`dk-drop${dragging ? " ready" : ""}`}>
          {(dragging || stuck.length === 0) && (
            <span className="dk-drop-hint">
              {dragging
                ? "Let go to stick it in"
                : "Drop cards here to stick them in your scrapbook"}
            </span>
          )}
          {stuck.length > 0 && (
            <ul className="dk-drop-stuck">
              {stuck.map((c, i) => (
                <li key={c.id} style={{ rotate: `${((i * 37) % 7) - 3}deg` }}>
                  {c.title}
                </li>
              ))}
            </ul>
          )}
          {stampKey > 0 && (
            <span key={stampKey} className="dk-drop-stamp" aria-hidden>
              KEPT
            </span>
          )}
        </div>
        <div
          ref={binRef}
          data-drop="bin"
          className={`dk-bin${dragging ? " ready" : ""}`}
          role="button"
          tabIndex={0}
          aria-label={`Bin, ${bin.length} card${bin.length === 1 ? "" : "s"}. Open to fish cards back out.`}
          onClick={() => setBinOpen((o) => !o)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setBinOpen((o) => !o)}
        >
          <span className="dk-bin-can" aria-hidden />
          <small>{bin.length}</small>
        </div>
      </div>

      {binOpen && (
        <div className="dk-bin-list">
          {bin.length === 0 ? (
            <p className="dk-hint">
              The bin is empty. Crumple, rip or fling a card to throw it here.
            </p>
          ) : (
            <>
              <p className="dk-hint">Changed your mind? Fish one out.</p>
              <ul>
                {bin.map((c) => (
                  <li key={c.id}>
                    <span>{c.title}</span>
                    <button type="button" className="dk-btn small" onClick={() => stick(c)}>
                      Smooth it out
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="dk-pack-foot">
        {phase !== "pack" && (
          <button type="button" className="dk-btn small primary" onClick={another}>
            Open another pack
          </button>
        )}
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
            setStampKey((k) => k + 1);
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
