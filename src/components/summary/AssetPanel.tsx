"use client";

import { useState } from "react";
import { scrapbookStore } from "@/lib/scrapbook/store";
import { ASSET_KINDS, type AssetKind, type AssetSheet, type Concept } from "@/lib/scrapbook/types";
import { sfx } from "@/lib/sound";
import { Icon } from "../ui/Icon";

const EMPTY: AssetSheet = { counts: {}, notes: {}, general: "" };

/**
 * Optional production detail under the pitch: rough asset counts with a note each, plus free notes.
 * For people who want to think it through; it never blocks anything.
 */
export function AssetPanel({ concept }: { concept: Concept }) {
  const sheet = concept.assets ?? EMPTY;
  const total = ASSET_KINDS.reduce((n, k) => n + (sheet.counts[k.id] ?? 0), 0);
  // Opens by itself if there is something in it; after that it stays the way you left it.
  const [open, setOpen] = useState(() => total > 0 || !!sheet.general);
  const save = (next: AssetSheet) => scrapbookStore.updateConcept(concept.id, { assets: next });
  const setCount = (k: AssetKind, n: number) => {
    save({ ...sheet, counts: { ...sheet.counts, [k]: Math.max(0, Math.min(999, n)) } });
    sfx.tick();
  };

  return (
    <details
      className="ap no-print"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>
        <span>Asset list &amp; notes</span>
        <small>{total ? `${total} assets` : "optional"}</small>
      </summary>
      <ul className="ap-rows">
        {ASSET_KINDS.map((k) => {
          const n = sheet.counts[k.id] ?? 0;
          return (
            <li key={k.id}>
              <span className="ap-label">{k.label}</span>
              <span className="ap-step">
                <button
                  type="button"
                  onClick={() => setCount(k.id, n - 1)}
                  disabled={n === 0}
                  aria-label={`Fewer ${k.label}`}
                >
                  −
                </button>
                <output aria-label={`${k.label}: ${n}`}>{n}</output>
                <button
                  type="button"
                  onClick={() => setCount(k.id, n + 1)}
                  aria-label={`More ${k.label}`}
                >
                  +
                </button>
              </span>
              <input
                className="dk-input ap-note"
                value={sheet.notes[k.id] ?? ""}
                onChange={(e) =>
                  save({ ...sheet, notes: { ...sheet.notes, [k.id]: e.target.value } })
                }
                placeholder="Note (e.g. 4 directions, 3 frames)"
                aria-label={`${k.label} note`}
                maxLength={80}
              />
            </li>
          );
        })}
      </ul>
      <p className="ap-total">
        <Icon name="check" size={16} /> Total: <strong>{total}</strong> assets
      </p>
      <label className="ap-notes">
        <span>Notes</span>
        <textarea
          className="dk-input"
          rows={3}
          value={sheet.general ?? ""}
          onChange={(e) => save({ ...sheet, general: e.target.value })}
          placeholder="Anything else: tools, art style rules, who makes what…"
          maxLength={600}
        />
      </label>
    </details>
  );
}
