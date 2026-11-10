import { buildPitchModel, SECTIONS, sectionHasContent } from "./pitch";
import type { Concept, PageId, Scrapbook } from "./types";

/** Stickers earned by filling a whole part of the scrapbook (for the current concept). */
export const STICKERS = [
  { id: "identity", label: "Named it", pages: ["title", "tagline", "concept"] as PageId[] },
  {
    id: "playground",
    label: "Found the fun",
    pages: ["genre", "mechanics", "loop", "objective", "hook"] as PageId[],
  },
  { id: "atmosphere", label: "Set the mood", pages: ["mood"] as PageId[] },
  { id: "production", label: "Scoped it", pages: ["scope"] as PageId[] },
] as const;
export type StickerId = (typeof STICKERS)[number]["id"];

/** Pages that have at least one filled pitch section. */
export function filledPages(book: Scrapbook, concept: Concept): Set<PageId> {
  const m = buildPitchModel(book, concept);
  return new Set(SECTIONS.filter((s) => sectionHasContent(m, s.id)).map((s) => s.page));
}

export function earnedStickers(book: Scrapbook, concept: Concept): StickerId[] {
  const f = filledPages(book, concept);
  return STICKERS.filter((s) => s.pages.every((p) => f.has(p))).map((s) => s.id);
}
