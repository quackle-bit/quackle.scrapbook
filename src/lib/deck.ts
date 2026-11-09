/**
 * Turns the vocab banks into playable cards: packs, Tailor reels, Trickster twists and the
 * concept title. All draws go through a seeded RNG so a seed reproduces a pack.
 */
import constraints from "../../data/vocab/constraints.json";
import lookCamera from "../../data/vocab/look-camera.json";
import lookDimension from "../../data/vocab/look-dimension.json";
import lookTreatment from "../../data/vocab/look-treatment.json";
import mechanics from "../../data/vocab/mechanics.json";
import moods from "../../data/vocab/moods.json";
import seedObjects from "../../data/vocab/seed-objects.json";
import twists from "../../data/vocab/twists.json";
import verbs from "../../data/vocab/verbs.json";
import worldEras from "../../data/vocab/world-eras.json";
import worldInhabitants from "../../data/vocab/world-inhabitants.json";
import worldPlaces from "../../data/vocab/world-places.json";
import type { Rng } from "./rng";
import type { BankFile, Rarity, VocabEntry } from "./vocab";

export type SlotId = "seed" | "verb" | "world" | "mood" | "look" | "twist" | "constraint" | "free";
/** Card types (a FREE slot holds any of them). */
export type CardType = Exclude<SlotId, "free">;

export const SLOT_LABEL: Record<SlotId, string> = {
  seed: "SEED",
  verb: "CORE VERB",
  world: "WORLD",
  mood: "MOOD",
  look: "LOOK",
  twist: "TWIST",
  constraint: "CONSTRAINT",
  free: "FREE",
};

/** The 4-slot mini page used by the /prototype feel lab. */
export const SLOTS: { id: SlotId; label: string }[] = [
  { id: "seed", label: "SEED" },
  { id: "verb", label: "CORE VERB" },
  { id: "look", label: "LOOK" },
  { id: "twist", label: "TWIST" },
];

export type CardData = {
  id: string;
  /** The card's type (named `slot` because it decides which slot it fits). */
  slot: CardType;
  text: string;
  rarity: Rarity;
  tags: string[];
  flavor?: string;
  serial: number;
  /** Look cards carry a tiny generated palette. */
  palette?: string[];
};

const bank = (b: unknown) => (b as BankFile).entries;
const POOLS: Record<"seed" | "verb" | "twist" | "mood" | "constraint", VocabEntry[]> = {
  seed: bank(seedObjects),
  verb: [...bank(verbs), ...bank(mechanics)],
  twist: bank(twists),
  mood: bank(moods),
  constraint: bank(constraints),
};
export const WORLD_PARTS = [
  { label: "Place", entries: bank(worldPlaces) },
  { label: "Era", entries: bank(worldEras) },
  { label: "Inhabitant", entries: bank(worldInhabitants) },
];
export const LOOK_REELS = [
  { label: "Dimension", entries: bank(lookDimension) },
  { label: "Pixel", entries: bank(lookTreatment) },
  { label: "Camera", entries: bank(lookCamera) },
];
export const CONSTRAINTS = bank(constraints);

const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, uncommon: 25, rare: 12, mythic: 3 };
const RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, mythic: 3 };

let uid = 0;
export const nextId = () => `c${Date.now().toString(36)}${(uid++).toString(36)}`;

/**
 * Card-pool rules for the current player (CLAUDE.md §6): Visitors and Jam guests never see
 * Mythic or studio-only cards. Display-side only; the server enforces it once accounts exist.
 */
export const poolRules = { allowMythic: true, allowStudioOnly: true };
export function setPoolRules(rules: Partial<typeof poolRules>) {
  Object.assign(poolRules, rules);
}
const allowed = (e: VocabEntry) =>
  (poolRules.allowMythic || e.rarity !== "mythic") && (poolRules.allowStudioOnly || !e.studioOnly);

export function draw(rng: Rng, entries: VocabEntry[]): VocabEntry {
  const pool = entries.filter(allowed);
  return rng.pick(pool.length ? pool : entries, (e) => (e.weight ?? 1) * RARITY_WEIGHT[e.rarity]);
}

export function toCard(rng: Rng, slot: CardType, e: VocabEntry): CardData {
  return {
    id: nextId(),
    slot,
    text: e.word,
    rarity: e.rarity,
    tags: e.tags,
    flavor: e.flavor,
    serial: 1 + rng.int(9999),
  };
}

/** A mixed pack of `size` cards for the seed / verb / twist slots, no duplicates. */
export function drawPack(rng: Rng, size = 5): CardData[] {
  const out: CardData[] = [];
  const seen = new Set<string>();
  const kinds: ("seed" | "verb" | "twist")[] = ["seed", "verb", "twist"];
  let guard = 0;
  while (out.length < size && guard++ < 100) {
    // Always at least one of each kind, then random.
    const slot = out.length < kinds.length ? kinds[out.length] : rng.pick(kinds);
    const e = draw(rng, POOLS[slot]);
    if (seen.has(e.word)) continue;
    seen.add(e.word);
    out.push(toCard(rng, slot, e));
  }
  // Shuffle so the kinds aren't always in the same order.
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function drawTwists(rng: Rng, n = 3): CardData[] {
  const seen = new Set<string>();
  const out: CardData[] = [];
  while (out.length < n) {
    const e = draw(rng, POOLS.twist);
    if (seen.has(e.word)) continue;
    seen.add(e.word);
    out.push(toCard(rng, "twist", e));
  }
  return out;
}

export const highest = (rs: Rarity[]) => rs.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "common");

/** Four-colour palette: one hue family plus an accent, dark to light. */
export function makePalette(rng: Rng): string[] {
  const h = rng.int(360);
  const accent = (h + 150 + rng.int(60)) % 360;
  return [
    `hsl(${h} 35% 16%)`,
    `hsl(${h} 40% 38%)`,
    `hsl(${(h + 20) % 360} 45% 66%)`,
    `hsl(${accent} 75% 60%)`,
  ];
}

export function lookCard(rng: Rng, picks: VocabEntry[]): CardData {
  return {
    id: nextId(),
    slot: "look",
    text: picks.map((p) => p.word).join(" · "),
    rarity: highest(picks.map((p) => p.rarity)),
    tags: [...new Set(picks.flatMap((p) => p.tags))],
    serial: 1 + rng.int(9999),
    palette: makePalette(rng),
  };
}

/** "a" or "an" + word. */
export const article = (w: string) => `${/^[aeiou]/i.test(w) ? "an" : "a"} ${w}`;

const cap = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());

/** Concept title from the stamped cards. Placeholder grammar; Studio will polish with Claude. */
export function conceptTitle(rng: Rng, cards: Partial<Record<SlotId, CardData>>): string {
  const seed = cards.seed?.text ?? "duck";
  const verb = (cards.verb?.text ?? "quack").split(" ")[0];
  const templates = [
    () => `${cap(seed)} ${cap(verb)}`,
    () => `The ${cap(seed)} Job`,
    () => `${cap(verb)} the ${cap(seed)}`,
    () => `${cap(seed)}fall`,
    () => `Last ${cap(seed)}`,
    () => `${cap(seed)} & Co.`,
  ];
  return rng.pick(templates)();
}

export function logline(cards: Partial<Record<SlotId, CardData>>): string {
  const twist = cards.twist?.text.replace(/\.$/, "") ?? "nothing is as it seems";
  return `A ${cards.verb?.text ?? "quacking"} game about ${article(cards.seed?.text ?? "duck")}. ${twist}.`;
}

// ── Route draws ────────────────────────────────────────────────

/** Tags of everything stamped so far; drives the "Fresh" pull and keeper lines. */
export type Pull = "fresh" | "wild";

/**
 * Draw `n` distinct entries. Fresh = prefer entries sharing 2+ tags with `context`
 * (falls back to 1+, then anything); Wild = prefer entries sharing none.
 */
export function drawFrom(
  rng: Rng,
  entries: VocabEntry[],
  n: number,
  context: string[] = [],
  pull: Pull = "wild",
  exclude: string[] = [],
): VocabEntry[] {
  const ctx = new Set(context);
  const shared = (e: VocabEntry) => e.tags.filter((t) => ctx.has(t)).length;
  const avail = entries.filter((e) => !exclude.includes(e.word) && allowed(e));
  let pool = avail;
  if (ctx.size) {
    const tiers =
      pull === "fresh"
        ? [avail.filter((e) => shared(e) >= 2), avail.filter((e) => shared(e) >= 1)]
        : [avail.filter((e) => shared(e) === 0)];
    pool = tiers.find((t) => t.length >= n) ?? avail;
  }
  const out: VocabEntry[] = [];
  let guard = 0;
  while (out.length < Math.min(n, pool.length) && guard++ < 200) {
    const e = draw(rng, pool);
    if (!out.includes(e)) out.push(e);
  }
  return out;
}

export function drawCards(
  rng: Rng,
  type: "seed" | "verb" | "twist" | "mood" | "constraint",
  n: number,
  context: string[] = [],
  pull: Pull = "wild",
): CardData[] {
  return drawFrom(rng, POOLS[type], n, context, pull).map((e) => toCard(rng, type, e));
}

/** A card made by the jam theme (always in Jam packs). */
export function themeCard(rng: Rng, theme: string): CardData {
  return {
    id: nextId(),
    slot: "seed",
    text: theme.trim() || "duck",
    rarity: "uncommon",
    tags: [],
    flavor: "Today's jam theme.",
    serial: 1 + rng.int(9999),
  };
}

export function worldCard(rng: Rng, picks: VocabEntry[]): CardData {
  return {
    id: nextId(),
    slot: "world",
    text: picks.map((p) => p.word).join(" · "),
    rarity: highest(picks.map((p) => p.rarity)),
    tags: [...new Set(picks.flatMap((p) => p.tags))],
    serial: 1 + rng.int(9999),
  };
}

// ── Back Room (Studio) ────────────────────────────────────────
type Minted = {
  id: string;
  type: CardType;
  text: string;
  rarity: Rarity;
  flavor?: string;
  tags: string[];
};
let minted: Minted[] = [];
/** Load the studio's minted cards (from the Studio repo) into the Back Room stall. */
export function setCustomCards(cards: Minted[]) {
  minted = cards;
}
export const customCardCount = () => minted.length;

/** Back Room pack: the studio's own cards first, topped up with rare and Mythic vocab. */
export function backroomPack(rng: Rng, size = 5): CardData[] {
  const out: CardData[] = [];
  const pool = [...minted];
  while (out.length < Math.min(3, pool.length)) {
    const m = pool.splice(rng.int(pool.length), 1)[0];
    out.push({
      id: nextId(),
      slot: m.type,
      text: m.text,
      rarity: m.rarity,
      tags: m.tags,
      flavor: m.flavor ?? "Minted in the Back Room.",
      serial: 1 + rng.int(9999),
    });
  }
  const types = ["seed", "verb", "twist", "mood", "constraint"] as const;
  let guard = 0;
  while (out.length < size && guard++ < 200) {
    const type = rng.pick(types);
    const special = POOLS[type].filter((e) => e.rarity === "rare" || e.rarity === "mythic");
    if (!special.length) continue;
    const e = rng.pick(special);
    if (out.some((c) => c.text === e.word)) continue;
    out.push(toCard(rng, type, e));
  }
  return out;
}

/** Mystery Crate: one random card of any type. */
export function mysteryCard(rng: Rng): CardData {
  const type = rng.pick(["seed", "verb", "twist", "mood", "constraint"] as const);
  return drawCards(rng, type, 1)[0];
}

/** Echo Well: words that share tags with the shouted word (or with the stamped tags). */
export function echo(rng: Rng, word: string, context: string[]): string[] {
  const w = word.trim().toLowerCase();
  const all = [...POOLS.seed, ...bank(worldPlaces), ...bank(worldInhabitants)];
  const hit = all.find((e) => e.word.toLowerCase() === w);
  const tags = hit?.tags ?? context;
  return drawFrom(rng, all, 5, tags, "fresh", [hit?.word ?? ""]).map((e) => e.word);
}

/** Three title options for the forge, from different templates. */
export function titleOptions(rng: Rng, cards: Partial<Record<SlotId, CardData>>): string[] {
  const seed = cap(
    (cards.seed?.text ?? cards.free?.text ?? "duck").split(" ").slice(0, 2).join(" "),
  );
  const verb = cap((cards.verb?.text ?? "quack").split(" ")[0]);
  const place = cap((cards.world?.text ?? "").split(" · ")[0] || "the street");
  const templates = [
    `${seed} ${verb}`,
    `The ${seed} Job`,
    `${verb} the ${seed}`,
    `${seed}fall`,
    `Last ${seed}`,
    `${seed} & Co.`,
    `${seed} of ${place}`,
    `${place} ${verb}ers`,
    `Tiny ${seed}`,
    `${seed}.exe`,
  ];
  const out: string[] = [];
  while (out.length < 3) {
    const t = rng.pick(templates);
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

/** Logline that reads the full spread. */
export function spreadLogline(cards: Partial<Record<SlotId, CardData>>): string {
  const parts = [
    `A ${cards.verb?.text ?? "quacking"} game about ${article(cards.seed?.text ?? cards.free?.text ?? "duck")}`,
    cards.world ? ` in ${cards.world.text.split(" · ")[0]}` : "",
    ".",
    cards.twist ? ` ${cards.twist.text.replace(/\.$/, "")}.` : "",
    cards.constraint ? ` Rule: ${cards.constraint.text.replace(/\.$/, "").toLowerCase()}.` : "",
  ];
  return parts.join("");
}
