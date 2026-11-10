"use client";

import { Icon } from "../../ui/Icon";
import { useMemo, useState } from "react";
import { drawPack, PLAYER_ROLES } from "@/lib/inspiration";
import { createRng } from "@/lib/rng";
import { scrapbookStore } from "@/lib/scrapbook/store";
import { TextField } from "../../ui/TextField";
import { PageFrame } from "./PageFrame";
import type { PageCtx } from "./registry";

const lc = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s).replace(/[.!?…]+$/, "");

/** A fill-in-the-blanks template, or free writing. The sentence is only used when you say so. */
export function HighConceptPage({ concept, page }: PageCtx) {
  const [mode, setMode] = useState<"template" | "free">(concept.highConcept ? "free" : "template");
  const [blanks, setBlanks] = useState({ player: "", objective: "", twist: "" });
  const [seed, setSeed] = useState(1);
  const ideas = useMemo(() => {
    const rng = createRng(`hc-${seed}`);
    return {
      player: [...PLAYER_ROLES].sort(() => rng.next() - 0.5).slice(0, 5),
      objective: drawPack("objective", 4, rng).map((c) => lc(c.title)),
      twist: drawPack("twist", 4, rng).map((c) => lc(c.title)),
    };
  }, [seed]);
  const sentence = `You play as ${blanks.player || "[PLAYER]"} who must ${blanks.objective || "[OBJECTIVE]"} in a world where ${blanks.twist || "[UNIQUE TWIST]"}.`;
  const filled = blanks.player && blanks.objective && blanks.twist;
  const set = (highConcept: string) => scrapbookStore.updateConcept(concept.id, { highConcept });

  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      <div className="dk-chips" role="group" aria-label="How to write it">
        <button
          type="button"
          className="dk-chip"
          aria-pressed={mode === "template"}
          onClick={() => setMode("template")}
        >
          Fill the template
        </button>
        <button
          type="button"
          className="dk-chip"
          aria-pressed={mode === "free"}
          onClick={() => setMode("free")}
        >
          Write freely
        </button>
      </div>

      {mode === "template" ? (
        <>
          <p className="dk-quote">{sentence}</p>
          {(["player", "objective", "twist"] as const).map((k) => (
            <div key={k} className="dk-block">
              <TextField
                label={
                  { player: "You play as…", objective: "…who must…", twist: "…in a world where…" }[
                    k
                  ]
                }
                value={blanks[k]}
                onChange={(v) => setBlanks((b) => ({ ...b, [k]: v }))}
                placeholder={
                  {
                    player: "a lighthouse keeper",
                    objective: "keep the light alive",
                    twist: "the sea gives things back",
                  }[k]
                }
                maxLength={90}
              />
              <div className="dk-chips">
                {ideas[k].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="dk-chip"
                    onClick={() => setBlanks((b) => ({ ...b, [k]: s }))}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="dk-row">
            <button type="button" className="dk-btn small" onClick={() => setSeed((n) => n + 1)}>
              <Icon name="refresh" size={16} /> New ideas
            </button>
            <button
              type="button"
              className="dk-btn primary"
              disabled={!filled}
              onClick={() => {
                set(sentence);
                setMode("free");
              }}
            >
              Use this sentence
            </button>
          </div>
          <p className="dk-hint">
            Fill every blank to use the template, or switch to &ldquo;Write freely&rdquo;.
          </p>
        </>
      ) : (
        <TextField
          label="Your high concept"
          value={concept.highConcept}
          onChange={set}
          placeholder="One or two sentences about your game"
          multiline
          maxLength={300}
        />
      )}
    </PageFrame>
  );
}
