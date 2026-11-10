"use client";

import { useSettings } from "@/lib/settings";
import { useState } from "react";
import { scrapbookStore } from "@/lib/scrapbook/store";
import { BoosterPack } from "../../cards/BoosterPack";
import { CollectionShelf, PinnedShelf } from "../../cards/PinnedShelf";
import { TextField } from "../../ui/TextField";
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

const lc = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s).replace(/[.!?…]+$/, "");

/** Twist cards, plus a way to combine a twist with a mechanic you've kept. Combining only drafts text when tapped. */
export function HookPage({ book, concept, page }: PageCtx) {
  const { showExtras: extras } = useSettings();
  const twists = cardsOf(book, concept.hookTwists);
  const mechanics = cardsOf(book, concept.mechanics);
  const [twistId, setTwistId] = useState<string>("");
  const [mechId, setMechId] = useState<string>("");
  const spare = book.collected.filter(
    (c) => c.type === "twist" && !concept.hookTwists.includes(c.id),
  );
  const tw = twists.find((t) => t.id === twistId);
  const me = mechanics.find((m) => m.id === mechId);
  const set = (uniqueHook: string) => scrapbookStore.updateConcept(concept.id, { uniqueHook });

  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      <BoosterPack
        type="twist"
        label="Twist pack"
        count={3}
        kept={twists}
        max={extras ? undefined : 1}
        onRemove={(id) => removeFromConcept(book.id, concept.id, "twist", id)}
        hideIds={book.collected
          .filter((c) => c.type === "twist" && c.contentId)
          .map((c) => c.contentId!)}
        isKept={(c) => isKept(book, concept, "twist", c)}
        isFavorite={(c) => isFav(book, "twist", c)}
        onToggleKeep={(c) => toggleKeep(book.id, concept.id, "twist", c)}
        onToggleFavorite={(c) => toggleFavorite(book.id, "twist", c)}
        onAddCustom={(c) => addCustom(book.id, concept.id, "twist", c)}
        onOpened={() => scrapbookStore.countPack(book.id)}
        onTrashed={() => scrapbookStore.countTrash(book.id)}
      />
      <TextField
        label="In one line: how does the twist change play?"
        value={concept.uniqueHook}
        onChange={set}
        placeholder="e.g. You can only move when the music stops"
        maxLength={300}
      />

      {extras && (
        <>
          <section className="dk-block">
            <h3>Kept twists{twists.length ? ` (${twists.length})` : ""}</h3>
            <PinnedShelf
              cards={twists}
              onFavorite={(id) => toggleFavoriteById(book.id, id)}
              onRemove={(id) => removeFromConcept(book.id, concept.id, "twist", id)}
              empty="Twists you keep appear here."
            />
          </section>
          <CollectionShelf
            cards={spare}
            onUse={(id) => addToConcept(book.id, concept.id, "twist", id)}
            onFavorite={(id) => toggleFavoriteById(book.id, id)}
            title="Other twists you've collected"
          />

          {!!twists.length && !!mechanics.length && (
            <section className="dk-block">
              <h3>Combine a twist with a mechanic</h3>
              <p className="dk-hint">
                Pick one of each, then add the line to your hook if you like it.
              </p>
              <div className="dk-chips" role="group" aria-label="Twist">
                {twists.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="dk-chip"
                    aria-pressed={twistId === t.id}
                    onClick={() => setTwistId(twistId === t.id ? "" : t.id)}
                  >
                    {t.title.length > 34 ? t.title.slice(0, 32) + "…" : t.title}
                  </button>
                ))}
              </div>
              <div className="dk-chips" role="group" aria-label="Mechanic">
                {mechanics.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="dk-chip"
                    aria-pressed={mechId === m.id}
                    onClick={() => setMechId(mechId === m.id ? "" : m.id)}
                  >
                    {m.title}
                  </button>
                ))}
              </div>
              {tw && me && (
                <>
                  <p className="dk-quote">
                    {me.title}, but {lc(tw.title)}.
                  </p>
                  <button
                    type="button"
                    className="dk-btn primary"
                    onClick={() =>
                      set(
                        `${concept.uniqueHook.trim() ? concept.uniqueHook.trim() + " " : ""}${me.title}, but ${lc(tw.title)}.`,
                      )
                    }
                  >
                    Add this line to my hook
                  </button>
                </>
              )}
            </section>
          )}
        </>
      )}
    </PageFrame>
  );
}
