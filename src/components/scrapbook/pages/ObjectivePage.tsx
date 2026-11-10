"use client";

import { Icon } from "../../ui/Icon";
import { useMemo, useState } from "react";
import { drawPack } from "@/lib/inspiration";
import { createRng } from "@/lib/rng";
import { scrapbookStore } from "@/lib/scrapbook/store";
import { PaperCard } from "../../cards/PaperCard";
import { TextField } from "../../ui/TextField";
import { PageFrame } from "./PageFrame";
import type { PageCtx } from "./registry";

/** Suggestion cards you can use, shuffle or ignore, plus a box to write your own. */
export function ObjectivePage({ concept, page }: PageCtx) {
  const [seed, setSeed] = useState(1);
  const ideas = useMemo(() => drawPack("objective", 6, createRng(`obj-${seed}`)), [seed]);
  const set = (objective: string) => scrapbookStore.updateConcept(concept.id, { objective });
  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      <TextField
        label="Your objective"
        value={concept.objective}
        onChange={set}
        placeholder="What is the player trying to achieve?"
        multiline
        maxLength={200}
      />
      <div className="dk-pack-head">
        <h3 style={{ fontSize: 20 }}>Ideas</h3>
        <button type="button" className="dk-btn small" onClick={() => setSeed((n) => n + 1)}>
          <Icon name="refresh" size={16} /> Shuffle
        </button>
      </div>
      <div className="dk-pack-grid">
        {ideas.map((c) => {
          const on = concept.objective === c.title;
          return (
            <div key={c.id} className="dk-slotcard">
              <PaperCard type="objective" title={c.title} description={c.description} kept={on} />
              <button
                type="button"
                className={`dk-btn small${on ? "" : " primary"}`}
                onClick={() => set(on ? "" : c.title)}
              >
                {on ? "✓ Using this (undo)" : "Use this"}
              </button>
            </div>
          );
        })}
      </div>
    </PageFrame>
  );
}
