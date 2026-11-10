import { pitchOf } from "../pitch";
import type { SavedSpread } from "../store";
import { scrapbookStore } from "./store";
import type { CardType } from "./types";

/**
 * One-time import of pitches saved by the first version of the app (street + book) into a new
 * scrapbook. Each old spread becomes a concept; typed lines become custom cards. Only text the
 * user already had is carried over, nothing is invented.
 */

const PLATFORM_MAP: Record<string, string> = {
  PC: "PC",
  Web: "Web",
  Mobile: "Mobile",
  Console: "Console",
};
const IMPORT_KEY = "qs.imported.v1";

export const importDone = () => {
  try {
    return localStorage.getItem(IMPORT_KEY) === "1";
  } catch {
    return true;
  }
};
export const markImportDone = () => {
  try {
    localStorage.setItem(IMPORT_KEY, "1");
  } catch {
    /* ignore */
  }
};

export function importOldSpreads(spreads: SavedSpread[]): string | null {
  if (!spreads.length) return null;
  const bookId = scrapbookStore.createScrapbook("Imported pitches");
  const state = () => scrapbookStore.get();
  const platforms = new Set<string>();
  const restrictions: string[] = [];

  spreads.forEach((sp, i) => {
    const conceptId =
      i === 0
        ? state().scrapbooks.find((b) => b.id === bookId)!.activeConceptId
        : scrapbookStore.addConcept(bookId);
    const p = pitchOf(sp);
    const line = (slot: keyof typeof sp.cards) =>
      (p.details[slot] ?? "").trim() || sp.cards[slot]?.text?.trim() || "";
    const custom = (type: CardType, title: string) =>
      title
        ? scrapbookStore.collect(bookId, { type, title, description: "", source: "custom" })
        : "";
    const many = (type: CardType, text: string) =>
      text
        .split(" · ")
        .map((t) => custom(type, t.trim()))
        .filter(Boolean);

    const genre = custom("genre", p.genre);
    const twist = line("twist");
    scrapbookStore.updateConcept(conceptId, {
      title: p.title || sp.concept?.title || "",
      tagline: p.tagline,
      highConcept: p.notes.replace(/^•\s*/gm, "").trim().slice(0, 300),
      genres: genre ? { primary: genre } : {},
      mechanics: [custom("mechanic", line("verb"))].filter(Boolean),
      setting: many("setting", line("world")),
      mood: many("mood", line("mood")),
      visualDirection: many("visual", line("look")),
      hookTwists: [custom("twist", twist)].filter(Boolean),
      uniqueHook: twist,
    });
    p.platforms.forEach((x) => platforms.add(PLATFORM_MAP[x] ?? "Other"));
    const rule = line("constraint");
    if (rule && !restrictions.includes(rule)) restrictions.push(rule);
  });

  scrapbookStore.updateScrapbook(bookId, {
    platforms: [...platforms],
    restrictions: restrictions.join("; "),
  });
  return bookId;
}
