"use client";

import type { CollectedCard } from "@/lib/scrapbook/types";
import { PaperCard } from "./PaperCard";

/**
 * Cards pinned to a page: favorite, take off, optionally mark primary or add a note.
 * Also used for "your collection" with a different primary action.
 */
export function PinnedShelf({
  cards,
  onFavorite,
  onRemove,
  removeLabel = "Take off",
  primaryId,
  onPrimary,
  onNote,
  empty,
}: {
  cards: CollectedCard[];
  onFavorite?: (id: string) => void;
  onRemove?: (id: string) => void;
  removeLabel?: string;
  primaryId?: string;
  onPrimary?: (id: string) => void;
  onNote?: (id: string, note: string) => void;
  empty?: string;
}) {
  if (!cards.length) return empty ? <p className="dk-empty">{empty}</p> : null;
  return (
    <div className="dk-pack-grid">
      {cards.map((c) => (
        <div key={c.id} className="dk-slotcard">
          <PaperCard
            type={c.type}
            title={c.title}
            description={c.description}
            category={c.category}
            kept
            favorite={c.isFavorite}
          />
          {primaryId === c.id && <p className="dk-primary-tag">★ Primary</p>}
          {onNote && (
            <input
              className="dk-input"
              value={c.note ?? ""}
              onChange={(e) => onNote(c.id, e.target.value)}
              placeholder="Add a note (optional)"
              aria-label={`Note for ${c.title}`}
              maxLength={80}
            />
          )}
          <div className="dk-row2">
            {onFavorite && (
              <button
                type="button"
                className="dk-btn small"
                onClick={() => onFavorite(c.id)}
                aria-pressed={c.isFavorite}
                aria-label={c.isFavorite ? "Remove favorite" : "Mark as favorite"}
              >
                {c.isFavorite ? "★" : "☆"}
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                className="dk-btn small ghost"
                style={{ color: "var(--ink-soft)" }}
                onClick={() => onRemove(c.id)}
              >
                {removeLabel}
              </button>
            )}
          </div>
          {onPrimary && primaryId !== c.id && (
            <button type="button" className="dk-btn small" onClick={() => onPrimary(c.id)}>
              Make primary
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Cards in the scrapbook's collection that this concept isn't using yet: reuse them in one tap. */
export function CollectionShelf({
  cards,
  onUse,
  onFavorite,
  title = "Also in your collection",
}: {
  cards: CollectedCard[];
  onUse: (id: string) => void;
  onFavorite: (id: string) => void;
  title?: string;
}) {
  if (!cards.length) return null;
  return (
    <details className="dk-details">
      <summary>
        {title} ({cards.length})
      </summary>
      <ul className="dk-collection">
        {cards.map((c) => (
          <li key={c.id}>
            <div>
              <strong>{c.title}</strong>
              {c.description && <small>{c.description}</small>}
            </div>
            <button
              type="button"
              className="dk-btn small"
              onClick={() => onFavorite(c.id)}
              aria-pressed={c.isFavorite}
              aria-label={c.isFavorite ? "Remove favorite" : "Mark as favorite"}
            >
              {c.isFavorite ? "★" : "☆"}
            </button>
            <button type="button" className="dk-btn small primary" onClick={() => onUse(c.id)}>
              Use here
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
