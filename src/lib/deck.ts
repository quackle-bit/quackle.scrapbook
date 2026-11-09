/**
 * Turns the vocab banks into playable cards: packs, Tailor reels, Trickster twists and the
 * concept title. All draws go through a seeded RNG so a seed reproduces a pack.
 */
import constraints from "../../data/vocab/constraints.json";
import lookCamera from "../../data/vocab/look-camera.json";
import lookDimension from "../../data/vocab/look-dimension.json";
import lookTreatment from "../../data/vocab/look-treatment.json";
import mechanics from "../../data/vocab/mechanics.json";
import seedObjects from "../../data/vocab/seed-objects.json";
import twists from "../../data/vocab/twists.json";
import verbs from "../../data/vocab/verbs.json";
import type { Rng } from "./rng";
import type { BankFile, Rarity, VocabEntry } from "./vocab";

export type SlotId = "seed" | "verb" | "look" | "twist";
export const SLOTS: { id: SlotId; label: string }[] = [
  { id: "seed", label: "SEED" },
  { id: "verb", label: "CORE VERB" },
  { id: "look", label: "LOOK" },
  { id: "twist", label: "TWIST" },
];

export type CardData = {
  id: string;
  slot: SlotId;
  text: string;
  rarity: Rarity;
  tags: string[];
  flavor?: string;
  serial: number;
  /** Look cards carry a tiny generated palette. */
  palette?: string[];
};

const bank = (b: unknown) => (b as BankFile).entries;
const POOLS: Record<"seed" | "verb" | "twist", VocabEntry[]> = {
  seed: bank(seedObjects),
  verb: [...bank(verbs), ...bank(mechanics)],
  twist: bank(twists),
};
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

export function draw(rng: Rng, entries: VocabEntry[]): VocabEntry {
  return rng.pick(entries, (e) => (e.weight ?? 1) * RARITY_WEIGHT[e.rarity]);
}

export function toCard(rng: Rng, slot: SlotId, e: VocabEntry): CardData {
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
  return `A ${cards.verb?.text ?? "quacking"} game about a ${cards.seed?.text ?? "duck"}. ${twist}.`;
}
