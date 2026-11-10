"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useScrapbook } from "@/lib/scrapbook/store";
import { ForgeOverlay, Receipt } from "../../feel/Rewards";
import { PAGES } from "./registry";
import { buildPitchModel, filledCount, SECTIONS } from "@/lib/scrapbook/pitch";
import { PageFrame } from "./PageFrame";
import type { PageCtx } from "./registry";

/** Stage 07: close the scrapbook and see each concept as a pitch spread. */
export function ClosePage({ book, concept, page }: PageCtx) {
  const { concepts } = useScrapbook(book.id);
  const router = useRouter();
  const [forging, setForging] = useState(false);
  const cur = buildPitchModel(book, concept);
  const pieces = [
    ...cur.genres,
    ...cur.mechanics.map((c) => c.title),
    cur.objective,
    cur.hook,
    ...cur.mood.map((c) => c.title),
    ...cur.setting.map((c) => c.title),
    ...cur.visual.map((c) => c.title),
  ]
    .filter((x): x is string => !!x)
    .map((x) => (x.length > 28 ? `${x.slice(0, 26)}…` : x))
    .slice(0, 9);
  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      <button
        type="button"
        className="dk-btn primary dk-forge-btn"
        onClick={() => setForging(true)}
        disabled={filledCount(cur) === 0}
      >
        Forge “{cur.title || "this concept"}” into a pitch
      </button>
      {filledCount(cur) === 0 && (
        <p className="dk-hint">
          Fill in at least one page first: there&apos;s nothing to forge yet.
        </p>
      )}
      <Receipt book={book} concepts={concepts.length} pagesTotal={PAGES.length} />
      {forging && (
        <ForgeOverlay
          pieces={pieces}
          title={cur.title}
          tagline={cur.tagline}
          onOpen={() => router.push(`/scrapbook/summary?id=${book.id}&concept=${concept.id}`)}
          onClose={() => setForging(false)}
        />
      )}
      <ul className="dk-list">
        {concepts.map((c, i) => {
          const m = buildPitchModel(book, c);
          return (
            <li key={c.id} className="dk-list-item">
              <h3>
                {c.id === concept.id && "● "}
                {m.title || `Concept ${i + 1}`}
              </h3>
              <small>
                {filledCount(m)} / {SECTIONS.length} sections filled
                {c.status === "pitched" ? " · pitched" : ""}
              </small>
              {m.tagline && <p className="dk-quote">“{m.tagline}”</p>}
              <div className="dk-row">
                <Link
                  className="dk-btn small primary"
                  href={`/scrapbook/summary?id=${book.id}&concept=${c.id}`}
                >
                  See pitch
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="dk-hint">
        Only what you filled in shows up. Nothing is invented for the rest, and you can come back
        and change anything.
      </p>
    </PageFrame>
  );
}
