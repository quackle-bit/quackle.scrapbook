"use client";

import { scrapbookStore } from "@/lib/scrapbook/store";
import { BoosterPack } from "../../cards/BoosterPack";
import { CollectionShelf, PinnedShelf } from "../../cards/PinnedShelf";
import { PageFrame } from "./PageFrame";
import {
  addCustom,
  addToConcept,
  cardsOf,
  isFav,
  isKept,
  removeFromConcept,
  toggleFavorite,
  toggleFavoriteById,
  toggleKeep,
} from "./cardOps";
import type { PageCtx } from "./registry";

/** Mechanics packs. Randomness inspires; nothing here is forced into the game. */
export function MechanicsPage({ book, concept, page }: PageCtx) {
  const mine = cardsOf(book, concept.mechanics);
  const spare = book.collected.filter(
    (c) => c.type === "mechanic" && !concept.mechanics.includes(c.id),
  );
  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      <BoosterPack
        type="mechanic"
        label="Mechanics pack"
        count={5}
        hideIds={book.collected
          .filter((c) => c.type === "mechanic" && c.contentId)
          .map((c) => c.contentId!)}
        isKept={(c) => isKept(book, concept, "mechanic", c)}
        isFavorite={(c) => isFav(book, "mechanic", c)}
        onToggleKeep={(c) => toggleKeep(book.id, concept.id, "mechanic", c)}
        onToggleFavorite={(c) => toggleFavorite(book.id, "mechanic", c)}
        onAddCustom={(c) => addCustom(book.id, concept.id, "mechanic", c)}
        onOpened={() => scrapbookStore.countPack(book.id)}
        onTrashed={() => scrapbookStore.countTrash(book.id)}
      />
      <section className="dk-block">
        <h3>On this page{mine.length ? ` (${mine.length})` : ""}</h3>
        <PinnedShelf
          cards={mine}
          onFavorite={(id) => toggleFavoriteById(book.id, id)}
          onRemove={(id) => removeFromConcept(book.id, concept.id, "mechanic", id)}
          empty="Mechanics you keep land here, stamped into your scrapbook."
        />
      </section>
      <CollectionShelf
        cards={spare}
        onUse={(id) => addToConcept(book.id, concept.id, "mechanic", id)}
        onFavorite={(id) => toggleFavoriteById(book.id, id)}
      />
    </PageFrame>
  );
}
