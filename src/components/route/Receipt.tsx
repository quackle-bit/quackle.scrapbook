"use client";

import type { Concept } from "../book/SpreadView";

export type RunStats = {
  packs: number;
  cards: number;
  kept: number;
  trashed: number;
  sparks: number;
};

/** The end-of-street receipt: fun to screenshot and share. */
export function Receipt({
  bookTitle,
  routeLabel,
  stats,
  concept,
  actions,
}: {
  bookTitle: string;
  routeLabel: string;
  stats: RunStats;
  concept: Concept | null;
  actions: React.ReactNode;
}) {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const line = (label: string, value: string | number) => (
    <div className="r-line">
      <span>{label}</span>
      <span className="r-dots" aria-hidden />
      <span>{value}</span>
    </div>
  );
  return (
    <div className="stop-play">
      <div className="receipt" role="document" aria-label="Receipt">
        <div className="r-head">
          <strong>QUACKLE BAZAAR</strong>
          <small>
            {date} · {time}
          </small>
          <small>{routeLabel} street</small>
        </div>
        <div className="r-rule" />
        {line("book", bookTitle)}
        {line("packs bought", stats.packs)}
        {line("cards sorted", stats.cards)}
        {line("kept", stats.kept)}
        {line("QUACKED", stats.trashed)}
        {line("sparks answered", stats.sparks)}
        <div className="r-rule" />
        <div className="r-total">
          <span>TODAY&apos;S IDEA</span>
          <strong>{concept?.title ?? "(unforged)"}</strong>
        </div>
        <p className="r-small">
          {stats.packs} packs · {stats.cards} cards · {stats.kept} kept · {stats.trashed} QUACKED
        </p>
        <div className="r-stamp">PAID IN QUACKS</div>
        <div className="r-foot">thank you · come again tomorrow</div>
      </div>
      <div className="row">{actions}</div>
    </div>
  );
}
