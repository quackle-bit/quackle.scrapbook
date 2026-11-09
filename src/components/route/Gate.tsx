"use client";

import { useState } from "react";
import { ROUTES, type Mode } from "@/lib/route";
import { sfx } from "@/lib/sound";

export const COVER_COLORS = ["#c0392b", "#2f6f8f", "#4c8a4a", "#8a5a2b", "#6b4c9a", "#2b2620"];

export type GateResult = {
  title: string;
  color: string;
  mode: Mode;
  theme: string;
  antiGoal: string;
};

/** Stop 0: name the book, pick its cover, the mode and (for jams) the theme. */
export function Gate({
  initial,
  spark,
  modes,
  onEnter,
}: {
  initial: GateResult;
  spark: string;
  /** Which streets this player may walk (Studio needs a login later). */
  modes: Mode[];
  onEnter: (g: GateResult) => void;
}) {
  const [g, setG] = useState<GateResult>(initial);
  const set = (patch: Partial<GateResult>) => setG((prev) => ({ ...prev, ...patch }));

  return (
    <form
      className="gate"
      onSubmit={(e) => {
        e.preventDefault();
        sfx.tink();
        onEnter({ ...g, title: g.title.trim() || "My Idea Book" });
      }}
    >
      <div className="book-cover" style={{ ["--cover" as string]: g.color }}>
        <input
          className="cover-title"
          value={g.title}
          maxLength={40}
          onChange={(e) => set({ title: e.target.value })}
          aria-label="Book title"
          placeholder="My Idea Book"
        />
        <div className="swatches" role="radiogroup" aria-label="Cover colour">
          {COVER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={g.color === c}
              aria-label={`Cover colour ${c}`}
              className={`swatch-btn${g.color === c ? " on" : ""}`}
              style={{ background: c }}
              onClick={() => set({ color: c })}
            />
          ))}
        </div>
      </div>

      {modes.length > 1 && (
        <fieldset className="mode-pick">
          <legend>Which street?</legend>
          {modes.map((m) => (
            <label key={m} className={`mode-opt${g.mode === m ? " on" : ""}`}>
              <input
                type="radio"
                name="mode"
                checked={g.mode === m}
                onChange={() => set({ mode: m })}
              />
              <strong>{ROUTES[m].label}</strong>
              <small>{ROUTES[m].blurb}</small>
            </label>
          ))}
        </fieldset>
      )}

      {g.mode === "jam" && (
        <label className="field">
          <span>Jam theme (written on the gate)</span>
          <input
            value={g.theme}
            onChange={(e) => set({ theme: e.target.value })}
            placeholder="e.g. roots"
            maxLength={40}
          />
        </label>
      )}

      <label className="field">
        <span>🦆 {spark}</span>
        <input
          className="hand"
          value={g.antiGoal}
          onChange={(e) => set({ antiGoal: e.target.value })}
          placeholder="(optional) written on the inside cover"
          maxLength={120}
        />
      </label>

      <button type="submit" className="big-btn">
        Enter the street →
      </button>
    </form>
  );
}
