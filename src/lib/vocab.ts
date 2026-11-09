/**
 * Vocabulary types shared by the data files in /data/vocab, the lint script and (later) the
 * pack-drawing code. See CLAUDE.md §4 and §7.
 */

export const RARITIES = ["common", "uncommon", "rare", "mythic"] as const;
export type Rarity = (typeof RARITIES)[number];

/**
 * Closed tag vocabulary. Fresh packs match on shared tags, so tags must come from this list
 * (the lint script enforces it). Add new tags here first.
 */
export const TAGS = {
  mood: [
    "cozy",
    "grim",
    "eerie",
    "whimsical",
    "melancholy",
    "tense",
    "serene",
    "chaotic",
    "hopeful",
  ],
  domain: [
    "nature",
    "domestic",
    "urban",
    "sea",
    "sky",
    "underground",
    "machine",
    "magic",
    "food",
    "social",
    "body",
    "time",
  ],
  scale: ["tiny", "human", "vast"],
  energy: ["calm", "frantic"],
  sense: ["light", "dark", "sound", "silence", "smell", "touch", "taste", "cold", "warm"],
} as const;

export type Tag = (typeof TAGS)[keyof typeof TAGS][number];
export const ALL_TAGS: readonly string[] = Object.values(TAGS).flat();

export type VocabEntry = {
  /** The card text: a word, a mechanic, a place, a mood line, a twist… */
  word: string;
  tags: Tag[];
  /** Relative draw weight within its bank (default 1). */
  weight?: number;
  rarity: Rarity;
  flavor?: string;
  studioOnly?: boolean;
};

/** Which slot a bank fills. `world` and `look` are made of several sub-banks. */
export type BankSlot = "seed" | "verb" | "world" | "mood" | "look" | "twist" | "constraint";

export type BankFile = {
  slot: BankSlot;
  /** Sub-part for multi-part cards, e.g. world → place/era/inhabitant, look → dimension/treatment/camera. */
  part?: string;
  /** Long-term size goal from CLAUDE.md §7 (lint reports progress, it doesn't fail on it). */
  target: number;
  entries: VocabEntry[];
};
