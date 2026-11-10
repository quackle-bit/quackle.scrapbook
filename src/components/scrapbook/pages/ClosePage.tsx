"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSettings } from "@/lib/settings";
import { ForgeOverlay } from "../../feel/Rewards";
import { Icon } from "../../ui/Icon";
import {
  buildPitchModel,
  filledCount,
  sectionHasContent,
  SECTIONS,
  type SectionId,
} from "@/lib/scrapbook/pitch";
import { PageFrame } from "./PageFrame";
import type { PageCtx } from "./registry";

/** Last page: close the scrapbook and forge it into a pitch. */
/** What a first pitch needs, in the order you fill it in. Extras (high concept, sound…) aren't nagged. */
const CHECKLIST: SectionId[] = [
  "mechanics",
  "loop",
  "hook",
  "mood",
  "visual",
  "perspective",
  "audio",
  "mvp",
  "genre",
  "title",
  "platform",
];
const LABEL: Partial<Record<SectionId, string>> = {
  mechanics: "Mechanics",
  hook: "Twist",
  mood: "Mood",
  audio: "Sound",
  mvp: "Scope",
  title: "Title",
  loop: "Loop",
};

export function ClosePage({ book, concept, page, goTo }: PageCtx) {
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
      <ul className="pc-list">
        {CHECKLIST.map((id) => {
          const sec = SECTIONS.find((x) => x.id === id)!;
          const ok = sectionHasContent(cur, id);
          return (
            <li key={id}>
              <button
                type="button"
                className={`pc-item${ok ? " ok" : ""}`}
                onClick={() => goTo(sec.page)}
                aria-label={`${LABEL[id] ?? sec.label}: ${ok ? "done" : "not yet"}. Go to the page.`}
              >
                <span className="pc-box" aria-hidden>
                  {ok && <Icon name="check" size={16} />}
                </span>
                <span className="pc-label">{LABEL[id] ?? sec.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="dk-btn primary dk-forge-btn"
        onClick={() => setForging(true)}
        disabled={filledCount(cur) === 0}
      >
        Stamp it: forge the pitch
      </button>
      {filledCount(cur) === 0 && (
        <p className="dk-hint">
          Fill in at least one page first: there&apos;s nothing to forge yet.
        </p>
      )}
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
