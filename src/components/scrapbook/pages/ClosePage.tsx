"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSettings } from "@/lib/settings";
import { ForgeOverlay, Receipt } from "../../feel/Rewards";
import { PAGES } from "./registry";
import { buildPitchModel, filledCount } from "@/lib/scrapbook/pitch";
import { PageFrame } from "./PageFrame";
import type { PageCtx } from "./registry";

/** Last page: close the scrapbook and forge it into a pitch. */
export function ClosePage({ book, concept, page }: PageCtx) {
  const router = useRouter();
  const { showExtras: extras } = useSettings();
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
    ...cur.perspective.map((c) => c.title),
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
        Forge “{cur.title || "your game"}” into a pitch
      </button>
      {filledCount(cur) === 0 && (
        <p className="dk-hint">
          Fill in at least one page first: there&apos;s nothing to forge yet.
        </p>
      )}
      <Receipt book={book} pagesTotal={PAGES.length} />
      {forging && (
        <ForgeOverlay
          pieces={pieces}
          title={cur.title}
          onOpen={() => {
            setForging(false);
            router.push(`/scrapbook/summary?id=${book.id}&concept=${concept.id}`);
          }}
          onClose={() => setForging(false)}
        />
      )}
      {extras && (
        <p className="dk-hint">
          Only what you filled in shows up. Nothing is invented for the rest, and you can come back
          and change anything.
        </p>
      )}
    </PageFrame>
  );
}
