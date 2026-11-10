"use client";

import { toCollected } from "@/lib/inspiration";
import { scrapbookStore } from "@/lib/scrapbook/store";
import type { CollectedCard } from "@/lib/scrapbook/types";
import { BoosterPack } from "../../cards/BoosterPack";
import { CollectionShelf } from "../../cards/PinnedShelf";
import { PageFrame } from "./PageFrame";
import { cardsOf, findCollected, isFav, toggleFavorite, toggleFavoriteById } from "./cardOps";
import type { PageCtx } from "./registry";

/** Genres: pick a primary, maybe a secondary. Combinations are encouraged, never required. */
export function GenrePage({ book, concept, page }: PageCtx) {
  const { primary, secondary } = concept.genres;
  const setGenres = (g: { primary?: string; secondary?: string }) =>
    scrapbookStore.updateConcept(concept.id, { genres: g });

  /** Put a genre into the first free slot (or replace the secondary if both are taken). */
  function assign(cardId: string) {
    const g = scrapbookStore.get().concepts.find((c) => c.id === concept.id)?.genres ?? {};
    if (g.primary === cardId || g.secondary === cardId) return;
    if (!g.primary) setGenres({ ...g, primary: cardId });
    else if (!g.secondary) setGenres({ ...g, secondary: cardId });
    else setGenres({ ...g, secondary: cardId });
  }
  function unassign(cardId: string) {
    const g = scrapbookStore.get().concepts.find((c) => c.id === concept.id)?.genres ?? {};
    if (g.primary === cardId) setGenres({ primary: g.secondary, secondary: undefined });
    else if (g.secondary === cardId) setGenres({ ...g, secondary: undefined });
  }

  const slot = (id: string | undefined, label: string) => {
    const c = id ? book.collected.find((x) => x.id === id) : undefined;
    return (
      <div className="dk-genre-slot">
        <span className="dk-label">{label}</span>
        {c ? (
          <>
            <strong>{c.title}</strong>
            <small>{c.description}</small>
          </>
        ) : (
          <small>Not chosen yet</small>
        )}
        {c && (
          <div className="dk-row">
            {label === "Secondary" && (
              <button
                type="button"
                className="dk-btn small"
                onClick={() => setGenres({ primary: c.id, secondary: primary })}
              >
                Make primary
              </button>
            )}
            {label === "Primary" && secondary && (
              <button
                type="button"
                className="dk-btn small"
                onClick={() => setGenres({ primary: secondary, secondary: primary })}
              >
                Swap
              </button>
            )}
            <button type="button" className="dk-btn small ghost" onClick={() => unassign(c.id)}>
              Clear
            </button>
          </div>
        )}
      </div>
    );
  };

  const others: CollectedCard[] = book.collected.filter(
    (c) => c.type === "genre" && c.id !== primary && c.id !== secondary,
  );

  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      <div className="dk-genre-slots">
        {slot(primary, "Primary")}
        {slot(secondary, "Secondary")}
      </div>
      {primary && secondary && (
        <p className="dk-note">
          {cardsOf(book, [primary])[0]?.title} + {cardsOf(book, [secondary])[0]?.title}
        </p>
      )}

      <BoosterPack
        type="genre"
        label="Genre pack"
        count={5}
        hideIds={book.collected
          .filter((c) => c.type === "genre" && c.contentId)
          .map((c) => c.contentId!)}
        isKept={(c) => {
          const col = findCollected(book, "genre", c.id);
          return !!col && (col.id === primary || col.id === secondary);
        }}
        isFavorite={(c) => isFav(book, "genre", c)}
        onToggleKeep={(c) => {
          const id = scrapbookStore.collect(book.id, toCollected(c, "genre"));
          if (id === primary || id === secondary) unassign(id);
          else assign(id);
        }}
        onToggleFavorite={(c) => toggleFavorite(book.id, "genre", c)}
        onAddCustom={(c) =>
          assign(
            scrapbookStore.collect(book.id, {
              type: "genre",
              title: c.title,
              description: c.description,
              source: "custom",
            }),
          )
        }
        onOpened={() => scrapbookStore.countPack(book.id)}
        onTrashed={() => scrapbookStore.countTrash(book.id)}
      />
      <CollectionShelf
        cards={others}
        onUse={assign}
        onFavorite={(id) => toggleFavoriteById(book.id, id)}
        title="Other genres you've collected"
      />
    </PageFrame>
  );
}
