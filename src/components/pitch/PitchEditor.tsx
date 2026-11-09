"use client";

import { useEffect, useRef, useState } from "react";
import type { CardData, SlotId } from "@/lib/deck";
import { download, slug, spreadPng } from "@/lib/export";
import {
  DETAIL_ORDER,
  draftTagline,
  GENRES,
  itchText,
  keyword,
  PLATFORMS,
  pitchMarkdown,
  readiness,
  spinFrom,
  spinTitle,
  type Pitch,
} from "@/lib/pitch";
import { createRng, freshSeed } from "@/lib/rng";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { PitchCard } from "./PitchCard";

type Props = {
  pitch: Pitch;
  cards: Partial<Record<SlotId, CardData>>;
  onChange: (p: Pitch) => void;
  /** Detail lines this street can fill with cards (others can still be typed). */
  slots?: SlotId[];
  /** Walk to the stall that fills this line. */
  onJump?: (slot: SlotId) => void;
  stallName?: (slot: SlotId) => string | undefined;
  palette?: string[];
  /** Show the live card preview + export under the fields. */
  preview?: boolean;
};

/** Spin through options like a reel, landing on a random one (a suggestion, never forced). */
function useSpin<T>() {
  const [spinning, setSpinning] = useState(false);
  const [shown, setShown] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  function spin(next: () => T, land: (v: T) => void, ticks = 9) {
    if (spinning) return;
    if (settings.get().speed) return land(next());
    setSpinning(true);
    let n = 0;
    timer.current = setInterval(() => {
      const v = next();
      setShown(v);
      sfx.tick();
      if (++n >= ticks) {
        clearInterval(timer.current!);
        setSpinning(false);
        setShown(null);
        sfx.thup();
        land(v);
      }
    }, 70);
  }
  return { spinning, shown, spin };
}

/** Every pitch field, in any order: type, pick, or spin. */
export function PitchEditor({
  pitch,
  cards,
  onChange,
  slots,
  onJump,
  stallName,
  palette,
  preview = true,
}: Props) {
  const set = (patch: Partial<Pitch>) => onChange({ ...pitch, ...patch });
  const rng = useRef(createRng(freshSeed()));
  const titleSpin = useSpin<string>();
  const genreSpin = useSpin<string>();
  const platSpin = useSpin<string>();
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { ready, missing } = readiness(pitch, cards);
  const detailRows = DETAIL_ORDER.filter(
    (d) => d.slot !== "free" || slots?.includes("free") || pitch.details.free,
  );

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`${label} copied`);
    } catch {
      download(`${slug(pitch.title || "pitch")}.txt`, text);
      setCopied(`${label} downloaded`);
    }
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="pitch-editor">
      {/* 1. Title */}
      <section className="pe-field" id="pe-title">
        <label htmlFor="pe-title-input">1 · Title</label>
        <div className="pe-row">
          <input
            id="pe-title-input"
            value={titleSpin.shown ?? pitch.title}
            readOnly={titleSpin.spinning}
            className={titleSpin.spinning ? "spinning-text" : ""}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="type a title, or spin"
            maxLength={60}
          />
          <button
            type="button"
            className="act spin"
            aria-label="Spin a title"
            onClick={() =>
              titleSpin.spin(
                () => spinTitle(rng.current, pitch, cards),
                (title) => set({ title }),
              )
            }
          >
            🎰 spin
          </button>
        </div>
      </section>

      {/* 2. Tagline */}
      <section className="pe-field" id="pe-tagline">
        <label htmlFor="pe-tagline-input">2 · Tagline</label>
        <div className="pe-row">
          <input
            id="pe-tagline-input"
            value={pitch.tagline}
            onChange={(e) => set({ tagline: e.target.value })}
            placeholder="In this game, you…"
            maxLength={110}
          />
          <button
            type="button"
            className="act"
            onClick={() => {
              const t = draftTagline(rng.current, pitch, cards);
              if (t) {
                set({ tagline: t });
                sfx.thup();
              }
            }}
          >
            ✎ draft
          </button>
        </div>
        <small className="hint">
          Often easiest last. “Draft” writes one from your details to edit.
        </small>
      </section>

      {/* 3. Genre */}
      <section className="pe-field" id="pe-genre">
        <div className="pe-head">
          <span>3 · Genre</span>
          <button
            type="button"
            className="act spin"
            aria-label="Spin a genre"
            onClick={() =>
              genreSpin.spin(
                () => spinFrom(rng.current, GENRES),
                (genre) => set({ genre }),
              )
            }
          >
            🎰 spin
          </button>
        </div>
        <div className="chips" role="radiogroup" aria-label="Genre">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={pitch.genre === g}
              className={`chip${pitch.genre === g ? " on" : ""}${genreSpin.shown === g ? " flash" : ""}`}
              onClick={() => set({ genre: pitch.genre === g ? "" : g })}
            >
              {g}
            </button>
          ))}
          <input
            className="chip-input"
            value={GENRES.includes(pitch.genre) ? "" : pitch.genre}
            onChange={(e) => set({ genre: e.target.value })}
            placeholder="other…"
            aria-label="Other genre"
            maxLength={30}
          />
        </div>
      </section>

      {/* 4. Platform */}
      <section className="pe-field" id="pe-platform">
        <div className="pe-head">
          <span>4 · Platform</span>
          <button
            type="button"
            className="act spin"
            aria-label="Spin a platform"
            onClick={() =>
              platSpin.spin(
                () => spinFrom(rng.current, PLATFORMS),
                (p) =>
                  set({
                    platforms: pitch.platforms.includes(p)
                      ? pitch.platforms
                      : [...pitch.platforms, p],
                  }),
                7,
              )
            }
          >
            🎰 spin
          </button>
        </div>
        <div className="chips" role="group" aria-label="Platforms">
          {PLATFORMS.map((p) => {
            const on = pitch.platforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                className={`chip${on ? " on" : ""}${platSpin.shown === p ? " flash" : ""}`}
                onClick={() =>
                  set({
                    platforms: on
                      ? pitch.platforms.filter((x) => x !== p)
                      : [...pitch.platforms, p],
                  })
                }
              >
                {p}
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Details */}
      <section className="pe-field" id="pe-details">
        <span className="pe-label">5 · Details</span>
        <small className="hint">
          Stamped cards fill these. Type over any line, or walk to its stall.
        </small>
        <div className="pe-details">
          {detailRows.map((d) => {
            const fromCard = keyword(cards[d.slot]);
            const canWalk = onJump && slots?.includes(d.slot);
            return (
              <div key={d.slot} className="pe-detail">
                <label htmlFor={`pe-d-${d.slot}`}>{d.label}</label>
                <input
                  id={`pe-d-${d.slot}`}
                  value={pitch.details[d.slot] ?? ""}
                  onChange={(e) => set({ details: { ...pitch.details, [d.slot]: e.target.value } })}
                  placeholder={
                    fromCard ||
                    (canWalk
                      ? `type, or visit ${stallName?.(d.slot) ?? "its stall"}`
                      : "type your own")
                  }
                  maxLength={60}
                />
                {canWalk && (
                  <button
                    type="button"
                    className="act walk"
                    onClick={() => onJump!(d.slot)}
                    aria-label={`Walk to ${stallName?.(d.slot) ?? d.label}`}
                  >
                    🎴
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Notes */}
      <section className="pe-field" id="pe-notes">
        <label htmlFor="pe-notes-input">6 · Notes (optional)</label>
        <textarea
          id="pe-notes-input"
          value={pitch.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="anything else the team should know"
          rows={3}
          maxLength={800}
        />
      </section>

      <p className={`pe-ready${ready ? " ok" : ""}`} role="status">
        {ready ? "✓ Ready to pitch" : `To be pitch-ready: ${missing.join(", ")} (optional)`}
      </p>

      {preview && (
        <>
          <PitchCard ref={cardRef} pitch={pitch} cards={cards} palette={palette} />
          <div className="row">
            <button
              type="button"
              className="act"
              onClick={() => void copy(pitchMarkdown(pitch, cards), "Pitch")}
            >
              Copy pitch
            </button>
            <button
              type="button"
              className="act"
              onClick={() => void copy(itchText(pitch, cards), "itch.io text")}
            >
              Copy for itch.io
            </button>
            <button
              type="button"
              className="act"
              onClick={() =>
                cardRef.current &&
                void spreadPng(cardRef.current, `${slug(pitch.title || "pitch")}.png`)
              }
            >
              Save image
            </button>
          </div>
          {copied && (
            <p className="hint" role="status">
              {copied}
            </p>
          )}
        </>
      )}
    </div>
  );
}
