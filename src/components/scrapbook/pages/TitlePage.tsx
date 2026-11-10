"use client";

import { useState } from "react";
import { scrapbookStore } from "@/lib/scrapbook/store";
import { BoosterPack } from "../../cards/BoosterPack";
import { TextField } from "../../ui/TextField";
import { PageFrame } from "./PageFrame";
import type { PageCtx } from "./registry";

/** Typing first; the word pack is there for sparks. Several candidates can be saved. */
export function TitlePage({ book, concept, page }: PageCtx) {
  const [tray, setTray] = useState<string[]>([]);
  const update = (patch: Parameters<typeof scrapbookStore.updateConcept>[1]) =>
    scrapbookStore.updateConcept(concept.id, patch);
  const preview = tray.join(" ");
  const addCandidate = (t: string) => {
    const v = t.trim();
    if (v && !concept.titleCandidates.includes(v))
      update({ titleCandidates: [...concept.titleCandidates, v] });
  };
  const move = (i: number, d: number) =>
    setTray((t) => {
      const j = i + d;
      if (j < 0 || j >= t.length) return t;
      const n = [...t];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      <TextField
        label="Your title"
        value={concept.title}
        onChange={(title) => update({ title })}
        placeholder="Type anything. Change it any time."
        maxLength={60}
      />
      <div className="dk-row">
        <button
          type="button"
          className="dk-btn small"
          onClick={() => addCandidate(concept.title)}
          disabled={!concept.title.trim() || concept.titleCandidates.includes(concept.title.trim())}
        >
          Save as a candidate
        </button>
      </div>

      {!!concept.titleCandidates.length && (
        <section className="dk-block">
          <h3>Candidates</h3>
          <ul className="dk-list">
            {concept.titleCandidates.map((t) => {
              const fav = concept.title === t;
              return (
                <li key={t} className="dk-list-item">
                  <strong>
                    {fav && "★ "}
                    {t}
                  </strong>
                  <div className="dk-row">
                    <button
                      type="button"
                      className={`dk-btn small${fav ? "" : " primary"}`}
                      onClick={() => update({ title: t })}
                      disabled={fav}
                    >
                      {fav ? "Current favorite" : "Make it my title"}
                    </button>
                    <button
                      type="button"
                      className="dk-btn small ghost"
                      onClick={() =>
                        update({ titleCandidates: concept.titleCandidates.filter((x) => x !== t) })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="dk-block">
        <h3>Word pack</h3>
        <p className="dk-hint">Add words to the tray and combine them into a title.</p>
        <BoosterPack
          type="word"
          label="Word pack"
          count={6}
          isKept={(c) => tray.includes(c.title)}
          onToggleKeep={(c) =>
            setTray((t) => (t.includes(c.title) ? t.filter((x) => x !== c.title) : [...t, c.title]))
          }
          isFavorite={() => false}
          onToggleFavorite={() => {}}
          canFavorite={false}
          keepLabel="Add to title"
          keptLabel="✓ In your title"
          onOpened={() => scrapbookStore.countPack(book.id)}
          onTrashed={() => scrapbookStore.countTrash(book.id)}
        />
      </section>

      {!!tray.length && (
        <section className="dk-block dk-tray">
          <h3>Title tray</h3>
          <ul className="dk-tray-list">
            {tray.map((w, i) => (
              <li key={w}>
                <span>{w}</span>
                <button
                  type="button"
                  className="dk-icon-btn"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${w} earlier`}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="dk-icon-btn"
                  onClick={() => move(i, 1)}
                  disabled={i === tray.length - 1}
                  aria-label={`Move ${w} later`}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="dk-icon-btn"
                  onClick={() => setTray((t) => t.filter((x) => x !== w))}
                  aria-label={`Remove ${w}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <p className="dk-tray-preview">{preview}</p>
          <div className="dk-row">
            <button
              type="button"
              className="dk-btn small primary"
              onClick={() => update({ title: preview })}
            >
              Use as my title
            </button>
            <button type="button" className="dk-btn small" onClick={() => addCandidate(preview)}>
              Save as candidate
            </button>
            <button type="button" className="dk-btn small ghost" onClick={() => setTray([])}>
              Clear
            </button>
          </div>
        </section>
      )}
    </PageFrame>
  );
}
