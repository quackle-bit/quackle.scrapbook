"use client";

import { useSyncExternalStore } from "react";
import type { Concept, SparkNote } from "@/components/book/SpreadView";
import type { CardData, SlotId } from "./deck";
import type { Mode } from "./route";

/**
 * Visitor save (CLAUDE.md §6.1): one local book, up to 5 spreads, 10 coins per day.
 * Everything lives in localStorage, so it's per-browser and display-only: real limits move
 * to the server with accounts (Phase 3/4).
 */

export const VISITOR_MAX_SPREADS = 5;
export const VISITOR_DAILY_COINS = 10;

export type SavedSpread = {
  id: string;
  createdAt: string;
  mode: Mode;
  slots: SlotId[];
  cards: Partial<Record<SlotId, CardData>>;
  concept: Concept | null;
  notes: SparkNote[];
};

export type CollectionEntry = {
  text: string;
  type: CardData["slot"];
  rarity: CardData["rarity"];
  count: number;
  kept: number;
  firstAt: string;
};

export type LocalBook = {
  title: string;
  color: string;
  antiGoal: string;
  spreads: SavedSpread[];
  discard: CardData[];
  collection: Record<string, CollectionEntry>;
  stickers: string[];
  stats: { packs: number; kept: number; trashed: number; forged: number };
};

export type Wallet = { coins: number; day: string };

const BOOK_KEY = "qs.book.v1";
const WALLET_KEY = "qs.wallet.v1";

export const emptyBook = (): LocalBook => ({
  title: "My Idea Book",
  color: "#c0392b",
  antiGoal: "",
  spreads: [],
  discard: [],
  collection: {},
  stickers: [],
  stats: { packs: 0, kept: 0, trashed: 0, forged: 0 },
});

/** Local calendar day: the bazaar closes at local midnight. */
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function read<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback(), ...JSON.parse(raw) } : fallback();
  } catch {
    return fallback();
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the session still works */
  }
}

// ── tiny external store ──────────────────────────────────────────
type State = { book: LocalBook; wallet: Wallet; ready: boolean };
const SERVER_STATE: State = {
  book: emptyBook(),
  wallet: { coins: VISITOR_DAILY_COINS, day: "" },
  ready: false,
};
let state: State = SERVER_STATE;
const subs = new Set<() => void>();
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const book = read(BOOK_KEY, emptyBook);
  let wallet = read<Wallet>(WALLET_KEY, () => ({ coins: VISITOR_DAILY_COINS, day: today() }));
  if (wallet.day !== today()) wallet = { coins: VISITOR_DAILY_COINS, day: today() };
  state = { book, wallet, ready: true };
  window.addEventListener("storage", (e) => {
    if (e.key === BOOK_KEY || e.key === WALLET_KEY) {
      loaded = false;
      load();
      emit();
    }
  });
}
function emit() {
  subs.forEach((s) => s());
}
function set(patch: Partial<Pick<State, "book" | "wallet">>) {
  state = { ...state, ...patch };
  if (patch.book) write(BOOK_KEY, state.book);
  if (patch.wallet) write(WALLET_KEY, state.wallet);
  emit();
}

export const store = {
  get: () => {
    load();
    return state;
  },
  subscribe(cb: () => void) {
    load();
    subs.add(cb);
    return () => subs.delete(cb);
  },

  /** Spend one coin from today's purse (resets at local midnight). */
  spendCoin(): boolean {
    load();
    let w = state.wallet;
    if (w.day !== today()) w = { coins: VISITOR_DAILY_COINS, day: today() };
    if (w.coins <= 0) {
      set({ wallet: w });
      return false;
    }
    set({
      wallet: { ...w, coins: w.coins - 1 },
      book: { ...state.book, stats: { ...state.book.stats, packs: state.book.stats.packs + 1 } },
    });
    return true;
  },

  updateBook(patch: Partial<LocalBook>) {
    load();
    set({ book: { ...state.book, ...patch } });
  },

  /** Save a finished run as a spread, log its cards and award stickers. */
  saveSpread(
    s: Omit<SavedSpread, "id" | "createdAt">,
    discard: CardData[],
    meta: { title: string; color: string; antiGoal: string },
  ): { ok: boolean; reason?: string; newStickers: string[] } {
    load();
    const book = state.book;
    if (book.spreads.length >= VISITOR_MAX_SPREADS) {
      return {
        ok: false,
        reason: `The book is full (${VISITOR_MAX_SPREADS} spreads). Tear one out first.`,
        newStickers: [],
      };
    }
    const spread: SavedSpread = {
      ...s,
      id: `sp${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    const collection = { ...book.collection };
    const log = (c: CardData, kept: boolean) => {
      const key = `${c.slot}:${c.text}`;
      const prev = collection[key];
      collection[key] = prev
        ? { ...prev, count: prev.count + 1, kept: prev.kept + (kept ? 1 : 0) }
        : {
            text: c.text,
            type: c.slot,
            rarity: c.rarity,
            count: 1,
            kept: kept ? 1 : 0,
            firstAt: spread.createdAt,
          };
    };
    Object.values(s.cards).forEach((c) => c && log(c, true));
    discard.forEach((c) => log(c, false));
    const stats = {
      ...book.stats,
      kept: book.stats.kept + Object.values(s.cards).filter(Boolean).length,
      trashed: book.stats.trashed + discard.length,
      forged: book.stats.forged + (s.concept ? 1 : 0),
    };
    const next: LocalBook = {
      ...book,
      ...meta,
      spreads: [...book.spreads, spread],
      discard: [...discard, ...book.discard].slice(0, 120),
      collection,
      stats,
    };
    const newStickers = earnedStickers(next).filter((x) => !book.stickers.includes(x));
    next.stickers = [...book.stickers, ...newStickers];
    set({ book: next });
    return { ok: true, newStickers };
  },

  deleteSpread(id: string) {
    load();
    set({ book: { ...state.book, spreads: state.book.spreads.filter((s) => s.id !== id) } });
  },

  renameSpread(id: string, title: string) {
    load();
    set({
      book: {
        ...state.book,
        spreads: state.book.spreads.map((s) =>
          s.id === id && s.concept ? { ...s, concept: { ...s.concept, title } } : s,
        ),
      },
    });
  },

  reset() {
    set({ book: emptyBook() });
  },
};

export const STICKERS: Record<string, { label: string; hint: string }> = {
  first: { label: "first idea", hint: "Forge your first spread" },
  rare: { label: "shiny!", hint: "Keep a rare card" },
  mythic: { label: "MYTHIC", hint: "Keep a mythic card (Studio)" },
  quack10: { label: "10 QUACKS", hint: "Trash 10 cards" },
  quack50: { label: "QUACK MASTER", hint: "Trash 50 cards" },
  full: { label: "full book", hint: `Fill all ${VISITOR_MAX_SPREADS} spreads` },
  cards25: { label: "collector", hint: "Pull 25 different cards" },
};

function earnedStickers(b: LocalBook): string[] {
  const out: string[] = [];
  const kept = b.spreads.flatMap((s) => Object.values(s.cards).filter(Boolean)) as CardData[];
  if (b.stats.forged >= 1) out.push("first");
  if (kept.some((c) => c.rarity === "rare")) out.push("rare");
  if (kept.some((c) => c.rarity === "mythic")) out.push("mythic");
  if (b.stats.trashed >= 10) out.push("quack10");
  if (b.stats.trashed >= 50) out.push("quack50");
  if (b.spreads.length >= VISITOR_MAX_SPREADS) out.push("full");
  if (Object.keys(b.collection).length >= 25) out.push("cards25");
  return out;
}

export function useStore(): State {
  return useSyncExternalStore(store.subscribe, store.get, () => SERVER_STATE);
}
