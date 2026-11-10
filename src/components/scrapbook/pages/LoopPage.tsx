"use client";

import { useState } from "react";
import { LOOP_VERBS } from "@/lib/inspiration";
import { scrapbookStore, uid } from "@/lib/scrapbook/store";
import type { CoreLoop, LoopStep } from "@/lib/scrapbook/types";
import { PageFrame } from "./PageFrame";
import { cardsOf } from "./cardOps";
import type { PageCtx } from "./registry";

/** Build a loop by tapping: add steps, reorder with arrows, rename inline. No dragging needed. */
export function LoopPage({ book, concept, page }: PageCtx) {
  const loops = concept.coreLoops;
  const active = loops.find((l) => l.id === concept.activeLoopId) ?? loops[0];
  const [custom, setCustom] = useState("");
  const [moreVerbs, setMoreVerbs] = useState(false);
  const mechanics = cardsOf(book, concept.mechanics);

  const save = (coreLoops: CoreLoop[], activeLoopId = active?.id) =>
    scrapbookStore.updateConcept(concept.id, { coreLoops, activeLoopId });
  const patchActive = (p: Partial<CoreLoop>) =>
    active && save(loops.map((l) => (l.id === active.id ? { ...l, ...p } : l)));
  const newLoop = (copy = false) => {
    const l: CoreLoop = {
      id: uid(),
      name: `Loop ${loops.length + 1}`,
      steps: copy && active ? active.steps.map((s) => ({ ...s, id: uid() })) : [],
    };
    save([...loops, l], l.id);
  };
  const addStep = (label: string, cardId?: string) => {
    const t = label.trim();
    if (!t) return;
    if (!active) {
      const l: CoreLoop = { id: uid(), name: "Loop 1", steps: [{ id: uid(), label: t, cardId }] };
      return save([l], l.id);
    }
    patchActive({ steps: [...active.steps, { id: uid(), label: t, cardId }] });
  };
  const moveStep = (i: number, d: number) => {
    if (!active) return;
    const j = i + d;
    if (j < 0 || j >= active.steps.length) return;
    const s = [...active.steps];
    [s[i], s[j]] = [s[j], s[i]];
    patchActive({ steps: s });
  };
  const editStep = (i: number, label: string) =>
    active &&
    patchActive({ steps: active.steps.map((s, k): LoopStep => (k === i ? { ...s, label } : s)) });
  const removeStep = (i: number) =>
    active && patchActive({ steps: active.steps.filter((_, k) => k !== i) });

  const glance = active?.steps.map((s) => s.label.toUpperCase()).filter(Boolean);

  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      {!!loops.length && (
        <div className="dk-chips" role="tablist" aria-label="Loop variations">
          {loops.map((l) => (
            <button
              key={l.id}
              type="button"
              role="tab"
              className="dk-chip"
              aria-pressed={l.id === active?.id}
              aria-selected={l.id === active?.id}
              onClick={() => save(loops, l.id)}
            >
              {l.name}
            </button>
          ))}
          <button type="button" className="dk-chip" onClick={() => newLoop(false)}>
            + New variation
          </button>
        </div>
      )}

      {active && (
        <>
          <div className="dk-row">
            <label className="dk-field" style={{ flex: 1 }}>
              <span>Variation name</span>
              <input
                className="dk-input"
                value={active.name}
                onChange={(e) => patchActive({ name: e.target.value })}
                maxLength={30}
              />
            </label>
          </div>
          <div className="dk-loop-glance" aria-label="Loop at a glance">
            {glance && glance.length ? (
              <p>
                {glance.join(" → ")} <strong>→ REPEAT ↻</strong>
              </p>
            ) : (
              <p className="dk-hint">Your loop shows up here as you add steps.</p>
            )}
          </div>

          <ol className="dk-steps">
            {active.steps.map((s, i) => (
              <li key={s.id}>
                <span className="dk-step-n">{i + 1}</span>
                <input
                  className="dk-input"
                  value={s.label}
                  onChange={(e) => editStep(i, e.target.value)}
                  aria-label={`Step ${i + 1}`}
                  maxLength={30}
                />
                <button
                  type="button"
                  className="dk-icon-btn"
                  onClick={() => moveStep(i, -1)}
                  disabled={i === 0}
                  aria-label="Move step up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="dk-icon-btn"
                  onClick={() => moveStep(i, 1)}
                  disabled={i === active.steps.length - 1}
                  aria-label="Move step down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="dk-icon-btn"
                  onClick={() => removeStep(i)}
                  aria-label="Remove step"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        </>
      )}

      <section className="dk-block">
        <h3>Add a step</h3>
        {!!mechanics.length && (
          <>
            <p className="dk-hint">From your mechanics</p>
            <div className="dk-chips">
              {mechanics.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="dk-chip"
                  onClick={() => addStep(m.title, m.id)}
                >
                  + {m.title}
                </button>
              ))}
            </div>
          </>
        )}
        <p className="dk-hint">Common actions</p>
        <div className="dk-chips">
          {(moreVerbs ? LOOP_VERBS : LOOP_VERBS.slice(0, 12)).map((v) => (
            <button key={v} type="button" className="dk-chip" onClick={() => addStep(v)}>
              + {v}
            </button>
          ))}
          <button type="button" className="dk-chip" onClick={() => setMoreVerbs((m) => !m)}>
            {moreVerbs ? "Fewer" : "More…"}
          </button>
        </div>
        <form
          className="dk-row"
          onSubmit={(e) => {
            e.preventDefault();
            addStep(custom);
            setCustom("");
          }}
        >
          <input
            className="dk-input"
            style={{ flex: 1 }}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Or type your own step"
            aria-label="Custom step"
            maxLength={30}
          />
          <button type="submit" className="dk-btn small primary" disabled={!custom.trim()}>
            Add
          </button>
        </form>
      </section>

      {active && (
        <div className="dk-row">
          <button type="button" className="dk-btn small" onClick={() => newLoop(true)}>
            Duplicate as a new variation
          </button>
          {loops.length > 1 && (
            <button
              type="button"
              className="dk-btn small ghost"
              onClick={() => {
                const rest = loops.filter((l) => l.id !== active.id);
                save(rest, rest[0].id);
              }}
            >
              Delete this variation
            </button>
          )}
        </div>
      )}
      {!loops.length && (
        <button type="button" className="dk-btn" onClick={() => newLoop(false)}>
          Start a loop
        </button>
      )}
    </PageFrame>
  );
}
