import audio from "../../data/inspiration/audio-directions.json";
import genres from "../../data/inspiration/genres.json";
import loopVerbs from "../../data/inspiration/loop-verbs.json";
import mechanics from "../../data/inspiration/mechanics.json";
import moods from "../../data/inspiration/moods.json";
import objectives from "../../data/inspiration/objectives.json";
import players from "../../data/inspiration/players.json";
import settingsData from "../../data/inspiration/settings.json";
import starters from "../../data/inspiration/sentence-starters.json";
import taglines from "../../data/inspiration/taglines.json";
import twists from "../../data/inspiration/twists.json";
import visual from "../../data/inspiration/visual-directions.json";
import words from "../../data/inspiration/word-packs.json";
import type { Rng } from "./rng";
import type { CardSource, CardType, CollectedCard, Concept } from "./scrapbook/types";

/** The content behind every pack: structured JSON in data/inspiration, not hardcoded in screens. */

export type InspirationCard = { id: string; title: string; description: string; category?: string };

export const INSPIRATION: Record<CardType, InspirationCard[]> = {
  genre: genres.cards,
  mechanic: mechanics.cards,
  objective: objectives.cards,
  twist: twists.cards,
  mood: moods.cards,
  setting: settingsData.cards,
  visual: visual.cards,
  audio: audio.cards,
  word: words.cards,
};

export const LOOP_VERBS: string[] = loopVerbs.verbs;
export const SENTENCE_STARTERS: string[] = starters.starters;
export const PLAYER_ROLES: string[] = players.roles;

/** Singular card names for UI text. */
export const TYPE_LABEL: Record<CardType, string> = {
  genre: "Genre",
  mechanic: "Mechanic",
  objective: "Objective",
  twist: "Twist",
  mood: "Mood",
  setting: "Setting",
  visual: "Visual",
  audio: "Audio",
  word: "Word",
};

/**
 * Draw `n` cards for a pack. Never repeats within a pack, and skips anything in `exclude`
 * (already kept, or already seen this session). Returns fewer if the deck is running out.
 */
export function drawPack(
  type: CardType,
  n: number,
  rng: Rng,
  exclude: Iterable<string> = [],
): InspirationCard[] {
  const skip = new Set(exclude);
  const pool = INSPIRATION[type].filter((c) => !skip.has(c.id));
  // Fisher–Yates with the seeded RNG
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

export function toCollected(
  card: InspirationCard,
  type: CardType,
  source: CardSource = "pack",
): Omit<CollectedCard, "id" | "isFavorite"> {
  return {
    type,
    title: card.title,
    description: card.description,
    category: card.category,
    source,
    contentId: card.id,
  };
}

// ── Tagline suggestions ──────────────────────────────────────

const strip = (s: string) => s.trim().replace(/[.!?…]+$/, "");
const lcFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

/**
 * Suggested taglines, built ONLY from words the user already has on their concept: a template
 * appears only when every {placeholder} it needs is filled. Nothing is applied automatically.
 */
export function suggestTaglines(
  concept: Concept,
  collected: CollectedCard[],
  rng: Rng,
  max = 3,
): string[] {
  const byId = new Map(collected.map((c) => [c.id, c]));
  const title = (id?: string) => (id ? byId.get(id)?.title : undefined);
  const first = (ids: string[], i = 0) => title(ids[i]);
  const v: Record<string, string | undefined> = {
    title: concept.title.trim() || undefined,
    genre: title(concept.genres.primary)?.toLowerCase(),
    genre2: title(concept.genres.secondary)?.toLowerCase(),
    mechanic: first(concept.mechanics)?.toLowerCase(),
    mechanic2: first(concept.mechanics, 1)?.toLowerCase(),
    // Settings read as names ("Night Market"), so they keep their capitals.
    setting: title(concept.primary.setting) ?? first(concept.setting),
    mood: (title(concept.primary.mood) ?? first(concept.mood))?.toLowerCase(),
    // Only kept twist *cards* (written as clauses). Free-written hooks don't fit a template.
    twist: lcFirst(strip(first(concept.hookTwists) ?? "")) || undefined,
    objective: lcFirst(strip(concept.objective.trim())) || undefined,
  };
  const out: string[] = [];
  for (const tpl of taglines.templates) {
    const needs = [...tpl.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    if (!needs.every((k) => v[k])) continue;
    let s = tpl.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");
    s = s.replace(/\b([Aa]) (?=[aeiou]\w)/g, "$1n ");
    s = s[0].toUpperCase() + s.slice(1);
    if (!/[.!?]$/.test(s)) s += ".";
    if (!out.includes(s)) out.push(s);
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, max);
}
