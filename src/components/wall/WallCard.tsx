"use client";

import type { PitchModel } from "@/lib/scrapbook/pitch";

const TILE = ["mood", "setting", "visual", "audio"] as const;

/** A small moodboard from the pitch's primary (or first) pick in each collection. Empty if none. */
function MoodStrip({ m }: { m: PitchModel }) {
  const tiles = TILE.map((k) => {
    const list = m[k];
    const pick = list.find((c) => c.primary) ?? list[0];
    return pick ? { k, title: pick.title } : null;
  }).filter((t): t is { k: (typeof TILE)[number]; title: string } => !!t);
  if (!tiles.length) return null;
  return (
    <div className="dk-wall-strip" aria-label="Moodboard">
      {tiles.map((t) => (
        <span key={t.k} className={`t-${t.k === "visual" ? "visual" : t.k}`} title={t.k}>
          {t.title}
        </span>
      ))}
    </div>
  );
}

export function WallCard({
  model,
  votes,
  voters,
  showVotes,
  winner,
  canVote,
  voted,
  comparing,
  commentCount,
  onRead,
  onVote,
  onCompare,
}: {
  model: PitchModel;
  votes: number;
  voters: string[];
  showVotes: boolean;
  winner: boolean;
  canVote: boolean;
  voted: boolean;
  comparing: boolean;
  commentCount: number;
  onRead: () => void;
  onVote: () => void;
  onCompare: () => void;
}) {
  const meta = [model.genres.join(" + "), model.platforms.join(" / ")].filter(Boolean).join(" · ");
  return (
    <article className={`dk-wall-card${winner ? " winner" : ""}${voted ? " voted" : ""}`}>
      {winner && <span className="dk-wall-crown">★ Winner</span>}
      <MoodStrip m={model} />
      <div className="dk-wall-body">
        <h3>{model.title || "Untitled game"}</h3>
        {model.tagline && <p className="dk-wall-tag">“{model.tagline}”</p>}
        {meta && <p className="dk-wall-meta">{meta}</p>}
        {model.highConcept && <p className="dk-wall-desc">{model.highConcept}</p>}
        {showVotes && (
          <p className="dk-wall-votes" aria-live="polite">
            <b>{votes}</b> vote{votes === 1 ? "" : "s"}
            {voters.length > 0 && <small> · {voters.join(", ")}</small>}
          </p>
        )}
      </div>
      <div className="dk-wall-actions">
        <button type="button" className="dk-btn small" onClick={onRead}>
          Read{commentCount ? ` · ${commentCount} 💬` : ""}
        </button>
        <button type="button" className="dk-btn small" aria-pressed={comparing} onClick={onCompare}>
          {comparing ? "✓ Comparing" : "Compare"}
        </button>
        {canVote && (
          <button
            type="button"
            className={`dk-btn small${voted ? "" : " primary"}`}
            aria-pressed={voted}
            onClick={onVote}
          >
            {voted ? "✓ Your vote" : "Vote"}
          </button>
        )}
      </div>
    </article>
  );
}
