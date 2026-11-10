"use client";

import { Icon } from "../../ui/Icon";
import { useSettings } from "@/lib/settings";
import { useState } from "react";
import { scrapbookStore } from "@/lib/scrapbook/store";
import { SCOPE_AREAS, SCOPE_POINTS, type Mvp, type ScopeArea } from "@/lib/scrapbook/types";
import { PageFrame } from "./PageFrame";
import { cardsOf } from "./cardOps";
import type { PageCtx } from "./registry";

type Bucket = keyof Mvp;
const BUCKETS: { id: Bucket; label: string; hint: string }[] = [
  { id: "must", label: "Must have", hint: "Essential features" },
  { id: "nice", label: "Nice to have", hint: "Improves the experience" },
  { id: "cut", label: "Cut first", hint: "Goes if time runs out" },
];

/** A planning aid, not an estimate: spread 10 points, then sort features into three lists. */
export function ScopePage({ book, concept, page }: PageCtx) {
  const { showExtras: extras } = useSettings();
  const used = SCOPE_AREAS.reduce((n, a) => n + (concept.scope[a.id] ?? 0), 0);
  const left = SCOPE_POINTS - used;
  const [drafts, setDrafts] = useState<Record<Bucket, string>>({ must: "", nice: "", cut: "" });
  const mechanics = cardsOf(book, concept.mechanics);

  const setScope = (area: ScopeArea, delta: number) => {
    const cur = concept.scope[area] ?? 0;
    const next = Math.max(0, Math.min(cur + delta, cur + left));
    if (next !== cur)
      scrapbookStore.updateConcept(concept.id, { scope: { ...concept.scope, [area]: next } });
  };
  const setMvp = (mvp: Mvp) => scrapbookStore.updateConcept(concept.id, { mvp });
  const add = (b: Bucket, text: string) => {
    const t = text.trim();
    if (!t || concept.mvp[b].includes(t)) return;
    setMvp({ ...concept.mvp, [b]: [...concept.mvp[b], t] });
  };
  const remove = (b: Bucket, i: number) =>
    setMvp({ ...concept.mvp, [b]: concept.mvp[b].filter((_, k) => k !== i) });
  const move = (from: Bucket, i: number, to: Bucket) => {
    const item = concept.mvp[from][i];
    if (concept.mvp[to].includes(item)) return remove(from, i);
    setMvp({
      ...concept.mvp,
      [from]: concept.mvp[from].filter((_, k) => k !== i),
      [to]: [...concept.mvp[to], item],
    });
  };

  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      {extras && (
        <section className="dk-block">
          <div className="dk-pack-head">
            <h3>Development points</h3>
            <span className={`dk-points${left === 0 ? " full" : ""}`} aria-live="polite">
              {left} left of {SCOPE_POINTS}
            </span>
          </div>
          <p className="dk-hint">Where would the effort go? There&apos;s no right answer.</p>
          <ul className="dk-alloc">
            {SCOPE_AREAS.map((a) => {
              const n = concept.scope[a.id] ?? 0;
              return (
                <li key={a.id}>
                  <span>{a.label}</span>
                  <span className="dk-pips" aria-hidden>
                    {Array.from({ length: SCOPE_POINTS }, (_, i) => (
                      <i key={i} className={i < n ? "on" : ""} />
                    ))}
                  </span>
                  <button
                    type="button"
                    className="dk-icon-btn"
                    onClick={() => setScope(a.id, -1)}
                    disabled={n === 0}
                    aria-label={`Fewer points for ${a.label}`}
                  >
                    −
                  </button>
                  <b aria-label={`${n} points`}>{n}</b>
                  <button
                    type="button"
                    className="dk-icon-btn"
                    onClick={() => setScope(a.id, 1)}
                    disabled={left === 0}
                    aria-label={`More points for ${a.label}`}
                  >
                    +
                  </button>
                </li>
              );
            })}
          </ul>
          {used > 0 && (
            <button
              type="button"
              className="dk-btn small ghost"
              onClick={() => scrapbookStore.updateConcept(concept.id, { scope: {} })}
            >
              Reset points
            </button>
          )}
        </section>
      )}
      <section className="dk-block">
        {extras && <h3>What is the smallest playable version?</h3>}
        {BUCKETS.filter((b) => extras || b.id !== "nice").map((b) => (
          <div key={b.id} className="dk-bucket">
            <h4>
              {b.label} <small>{b.hint}</small>
            </h4>
            <ul className="dk-bucket-list">
              {concept.mvp[b.id].map((t, i) => (
                <li key={t}>
                  <span>{t}</span>
                  <span className="dk-row" style={{ gap: 4 }}>
                    {BUCKETS.filter((o) => o.id !== b.id && (extras || o.id !== "nice")).map(
                      (o) => (
                        <button
                          key={o.id}
                          type="button"
                          className="dk-btn small"
                          onClick={() => move(b.id, i, o.id)}
                          aria-label={`Move to ${o.label}`}
                        >
                          → {o.label.split(" ")[0]}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      className="dk-icon-btn"
                      onClick={() => remove(b.id, i)}
                      aria-label={`Remove ${t}`}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <form
              className="dk-row"
              onSubmit={(e) => {
                e.preventDefault();
                add(b.id, drafts[b.id]);
                setDrafts({ ...drafts, [b.id]: "" });
              }}
            >
              <input
                className="dk-input"
                style={{ flex: 1 }}
                value={drafts[b.id]}
                onChange={(e) => setDrafts({ ...drafts, [b.id]: e.target.value })}
                placeholder="Add a feature"
                aria-label={`Add to ${b.label}`}
                maxLength={80}
              />
              <button
                type="submit"
                className="dk-btn small primary"
                disabled={!drafts[b.id].trim()}
              >
                Add
              </button>
            </form>
          </div>
        ))}
        {!!mechanics.length && (
          <>
            <p className="dk-hint">Quick add from your mechanics (to Must have)</p>
            <div className="dk-chips">
              {mechanics.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="dk-chip"
                  onClick={() => add("must", m.title)}
                  disabled={concept.mvp.must.includes(m.title)}
                >
                  + {m.title}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </PageFrame>
  );
}
