"use client";

import { pageNav, usePageNav, type PageNavHook } from "./pageNav";
import { useSettings } from "@/lib/settings";
import { useMemo, useState } from "react";
import { INSPIRATION } from "@/lib/inspiration";
import { scrapbookStore } from "@/lib/scrapbook/store";
import type { CardType, PrimaryPicks } from "@/lib/scrapbook/types";
import { BoosterPack } from "../../cards/BoosterPack";
import { CollectionShelf, PinnedShelf } from "../../cards/PinnedShelf";
import { Chips } from "../../ui/Chips";
import { PageFrame } from "./PageFrame";
import {
  addCustom,
  addToConcept,
  cardsOf,
  isFav,
  isKept,
  LIST_KEY,
  removeFromConcept,
  toggleFavorite,
  toggleFavoriteById,
  toggleKeep,
  type ListType,
} from "./cardOps";
import type { PageCtx } from "./registry";

const TABS: {
  id: ListType;
  label: string;
  pack: string;
  prim: keyof PrimaryPicks;
  hint: string;
}[] = [
  { id: "mood", label: "Mood", pack: "Mood pack", prim: "mood", hint: "How should it feel?" },
  {
    id: "setting",
    label: "Setting",
    pack: "Setting pack",
    prim: "setting",
    hint: "Where does it happen?",
  },
  {
    id: "visual",
    label: "Look",
    pack: "Look pack",
    prim: "visual",
    hint: "What does it look like?",
  },
  {
    id: "perspective",
    label: "Perspective",
    pack: "Perspective pack",
    prim: "perspective",
    hint: "2D or 3D? Top-down, side view, first person?",
  },
  {
    id: "audio",
    label: "Audio",
    pack: "Audio pack",
    prim: "audio",
    hint: "What does it sound like?",
  },
];

/** A physical moodboard in four collections. None of it is required. */
export function MoodPage({ book, concept, page }: PageCtx) {
  const { showExtras: extras } = useSettings();
  // Coming back from the next page opens on the last tab, as if turning back through it.
  const [tabId, setTabId] = useState<ListType>(() => (pageNav.dir() === -1 ? "audio" : "mood"));
  const tab = TABS.find((t) => t.id === tabId)!;
  const type = tab.id as CardType;
  const cards = cardsOf(book, concept[LIST_KEY[tab.id]]);
  const spare = book.collected.filter(
    (c) => c.type === type && !concept[LIST_KEY[tab.id]].includes(c.id),
  );
  const primaryId = concept.primary[tab.prim];
  const counts = Object.fromEntries(TABS.map((t) => [t.id, concept[LIST_KEY[t.id]].length]));
  const steps = TABS;
  const at = steps.findIndex((t) => t.id === tabId);
  // Next/Back in the bottom bar walk through the tabs first, so none gets skipped by accident.
  const nav = useMemo<PageNavHook>(
    () => ({
      next: () => {
        if (at >= steps.length - 1) return false;
        setTabId(steps[at + 1].id);
        return true;
      },
      back: () => {
        if (at <= 0) return false;
        setTabId(steps[at - 1].id);
        return true;
      },
      nextLabel: at < steps.length - 1 ? steps[at + 1].label : undefined,
    }),
    [at, steps],
  );
  usePageNav(nav);

  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      <Chips
        label="Moodboard section"
        options={steps.map((t) => ({
          value: t.id,
          label: `${t.label}${counts[t.id] ? ` · ${counts[t.id]}` : ""}`,
        }))}
        value={tabId}
        onChange={(v) => v && setTabId(v as ListType)}
      />

      {extras && (
        <section className="dk-corkboard" aria-label={`${tab.label} board`}>
          <PinnedShelf
            cards={cards}
            onFavorite={(id) => toggleFavoriteById(book.id, id)}
            onRemove={(id) => removeFromConcept(book.id, concept.id, tab.id, id)}
            removeLabel="Unpin"
            primaryId={primaryId}
            onPrimary={(id) =>
              scrapbookStore.updateConcept(concept.id, {
                primary: { ...concept.primary, [tab.prim]: id },
              })
            }
            onNote={(id, note) => scrapbookStore.updateCard(book.id, id, { note })}
            empty={`Nothing pinned yet. Open a pack or browse the list below.`}
          />
        </section>
      )}
      <BoosterPack
        key={tab.id}
        type={type}
        label={tab.pack}
        count={4}
        kept={cards}
        max={extras ? undefined : 3}
        onRemove={(id) => removeFromConcept(book.id, concept.id, tab.id, id)}
        hideIds={book.collected
          .filter((c) => c.type === type && c.contentId)
          .map((c) => c.contentId!)}
        isKept={(c) => isKept(book, concept, tab.id, c)}
        isFavorite={(c) => isFav(book, type, c)}
        onToggleKeep={(c) => toggleKeep(book.id, concept.id, tab.id, c)}
        onToggleFavorite={(c) => toggleFavorite(book.id, type, c)}
        onAddCustom={(c) => addCustom(book.id, concept.id, tab.id, c)}
        onOpened={() => scrapbookStore.countPack(book.id)}
        onTrashed={() => scrapbookStore.countTrash(book.id)}
        keepLabel="Pin it"
        keptLabel="✓ Pinned (undo)"
      />

      {extras && (
        <>
          <details className="dk-details">
            <summary>Browse all {INSPIRATION[type].length}</summary>
            <div className="dk-chips" style={{ padding: "6px 0 12px" }}>
              {INSPIRATION[type].map((c) => {
                const on = isKept(book, concept, tab.id, c);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="dk-chip"
                    aria-pressed={on}
                    onClick={() => toggleKeep(book.id, concept.id, tab.id, c)}
                    title={c.description}
                  >
                    {c.title}
                  </button>
                );
              })}
            </div>
          </details>
          <CollectionShelf
            cards={spare}
            onUse={(id) => addToConcept(book.id, concept.id, tab.id, id)}
            onFavorite={(id) => toggleFavoriteById(book.id, id)}
            title={`Other ${tab.label.toLowerCase()} cards you've collected`}
          />
        </>
      )}
    </PageFrame>
  );
}
