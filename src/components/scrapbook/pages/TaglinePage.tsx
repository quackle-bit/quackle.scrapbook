"use client";

import { useMemo, useState } from "react";
import { SENTENCE_STARTERS, suggestTaglines } from "@/lib/inspiration";
import { createRng } from "@/lib/rng";
import { scrapbookStore } from "@/lib/scrapbook/store";
import { TextField } from "../../ui/TextField";
import { PageFrame } from "./PageFrame";
import type { PageCtx } from "./registry";

/** Typing, with optional starters and suggestions made only from what you've already collected. */
export function TaglinePage({ book, concept, page }: PageCtx) {
  const [seed, setSeed] = useState(1);
  const suggestions = useMemo(
    () => suggestTaglines(concept, book.collected, createRng(`tag-${seed}`), 3),
    [concept, book.collected, seed],
  );
  const set = (tagline: string) => scrapbookStore.updateConcept(concept.id, { tagline });
  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      <TextField
        label="Your tagline"
        value={concept.tagline}
        onChange={set}
        placeholder="One memorable sentence"
        maxLength={110}
      />

      <section className="dk-block">
        <h3>Sentence starters</h3>
        <div className="dk-chips">
          {SENTENCE_STARTERS.slice(0, 8).map((s) => (
            <button key={s} type="button" className="dk-chip" onClick={() => set(s)}>
              {s}
            </button>
          ))}
        </div>
        <p className="dk-hint">Tap one, then finish it your way.</p>
      </section>

      <section className="dk-block">
        <h3>Suggestions</h3>
        {suggestions.length ? (
          <>
            <ul className="dk-list">
              {suggestions.map((s) => (
                <li key={s} className="dk-list-item">
                  <p className="dk-quote">{s}</p>
                  <div className="dk-row">
                    <button type="button" className="dk-btn small primary" onClick={() => set(s)}>
                      Use this
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className="dk-btn small" onClick={() => setSeed((n) => n + 1)}>
              ↻ Different ones
            </button>
          </>
        ) : (
          <p className="dk-empty">
            Suggestions appear here once you have a genre, a mechanic, a setting or an objective.
            They only use your own picks.
          </p>
        )}
      </section>
    </PageFrame>
  );
}
