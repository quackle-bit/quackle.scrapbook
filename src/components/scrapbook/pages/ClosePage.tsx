"use client";

import Link from "next/link";
import { useScrapbook } from "@/lib/scrapbook/store";
import { buildPitchModel, filledCount, SECTIONS } from "@/lib/scrapbook/pitch";
import { PageFrame } from "./PageFrame";
import type { PageCtx } from "./registry";

/** Stage 07: close the scrapbook and see each concept as a pitch spread. */
export function ClosePage({ book, concept, page }: PageCtx) {
  const { concepts } = useScrapbook(book.id);
  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
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
