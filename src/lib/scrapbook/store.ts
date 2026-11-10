"use client";

import { useSyncExternalStore } from "react";
import { freshSeed } from "../rng";
import { emptyMvp, type CollectedCard, type Concept, type PageId, type Scrapbook } from "./types";

/**
 * Scrapbooks and concepts, saved in this browser on every change (autosave).
 * Same pattern as the older book store: one versioned key, an external store, SSR-safe.
 */

const KEY = "qs.scrapbooks.v1";

export type ScrapbookState = {
  scrapbooks: Scrapbook[];
  concepts: Concept[];
  lastId: string | null;
  ready: boolean;
};

const EMPTY: ScrapbookState = { scrapbooks: [], concepts: [], lastId: null, ready: false };
let state: ScrapbookState = EMPTY;
const subs = new Set<() => void>();
let loaded = false;

export const uid = () => freshSeed().replace(/-/g, "");
const now = () => new Date().toISOString();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && Array.isArray(raw.scrapbooks)) {
      state = {
        scrapbooks: raw.scrapbooks,
        concepts: Array.isArray(raw.concepts) ? raw.concepts : [],
        lastId: raw.lastId ?? null,
        ready: true,
      };
      return;
    }
  } catch {
    /* corrupt or blocked storage: start fresh */
  }
  state = { ...EMPTY, ready: true };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
/** Write to localStorage at most a few times a second (typing would otherwise save on every key). */
function flush() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  try {
    const { scrapbooks, concepts, lastId } = state;
    localStorage.setItem(KEY, JSON.stringify({ scrapbooks, concepts, lastId }));
  } catch {
    /* storage full or blocked: the session still works */
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && saveTimer) flush();
  });
}

function commit(next: Omit<ScrapbookState, "ready">) {
  state = { ...next, ready: true };
  if (!saveTimer) saveTimer = setTimeout(flush, 400);
  subs.forEach((s) => s());
}

export const newConcept = (scrapbookId: string, title = ""): Concept => ({
  id: uid(),
  scrapbookId,
  title,
  titleCandidates: [],
  tagline: "",
  highConcept: "",
  genres: {},
  mechanics: [],
  coreLoops: [],
  objective: "",
  uniqueHook: "",
  hookTwists: [],
  mood: [],
  setting: [],
  visualDirection: [],
  audioDirection: [],
  primary: {},
  scope: {},
  mvp: emptyMvp(),
  status: "draft",
  createdAt: now(),
  updatedAt: now(),
});

const touch = <T extends { updatedAt: string }>(x: T): T => ({ ...x, updatedAt: now() });

export const scrapbookStore = {
  get(): ScrapbookState {
    load();
    return state;
  },
  subscribe(cb: () => void) {
    load();
    subs.add(cb);
    return () => subs.delete(cb);
  },

  // ── Scrapbooks ──────────────────────────────────────────────
  createScrapbook(name = ""): string {
    load();
    const id = uid();
    const concept = newConcept(id);
    const book: Scrapbook = {
      id,
      name,
      jamTheme: "",
      platforms: [],
      duration: "",
      customDuration: "",
      teamSize: "",
      restrictions: "",
      conceptIds: [concept.id],
      activeConceptId: concept.id,
      collected: [],
      progress: { visitedPages: [], packsOpened: 0 },
      createdAt: now(),
      updatedAt: now(),
    };
    commit({
      scrapbooks: [book, ...state.scrapbooks],
      concepts: [...state.concepts, concept],
      lastId: id,
    });
    return id;
  },
  updateScrapbook(id: string, patch: Partial<Omit<Scrapbook, "id" | "progress">>) {
    load();
    commit({
      ...state,
      scrapbooks: state.scrapbooks.map((s) => (s.id === id ? touch({ ...s, ...patch }) : s)),
    });
  },
  deleteScrapbook(id: string) {
    load();
    const left = state.scrapbooks.filter((s) => s.id !== id);
    commit({
      scrapbooks: left,
      concepts: state.concepts.filter((c) => c.scrapbookId !== id),
      lastId: state.lastId === id ? (left[0]?.id ?? null) : state.lastId,
    });
  },
  /** Mark a scrapbook as the one to Continue. */
  open(id: string) {
    load();
    if (state.lastId !== id) commit({ ...state, lastId: id });
  },
  /** Progress only ever grows; also remembers the last page for Continue. */
  visitPage(id: string, page: PageId) {
    load();
    const b = state.scrapbooks.find((s) => s.id === id);
    if (!b) return;
    const seen = b.progress.visitedPages.includes(page);
    if (seen && b.progress.lastPage === page) return;
    commit({
      ...state,
      scrapbooks: state.scrapbooks.map((s) =>
        s.id === id
          ? {
              ...s,
              progress: {
                ...s.progress,
                lastPage: page,
                visitedPages: seen ? s.progress.visitedPages : [...s.progress.visitedPages, page],
              },
            }
          : s,
      ),
    });
  },
  countPack(id: string) {
    load();
    commit({
      ...state,
      scrapbooks: state.scrapbooks.map((s) =>
        s.id === id
          ? { ...s, progress: { ...s.progress, packsOpened: s.progress.packsOpened + 1 } }
          : s,
      ),
    });
  },

  countTrash(id: string) {
    load();
    commit({
      ...state,
      scrapbooks: state.scrapbooks.map((s) =>
        s.id === id
          ? { ...s, progress: { ...s.progress, cardsTrashed: (s.progress.cardsTrashed ?? 0) + 1 } }
          : s,
      ),
    });
  },

  // ── Concepts ────────────────────────────────────────────────
  updateConcept(id: string, patch: Partial<Omit<Concept, "id" | "scrapbookId">>) {
    load();
    commit({
      ...state,
      concepts: state.concepts.map((c) => (c.id === id ? touch({ ...c, ...patch }) : c)),
    });
  },
  addConcept(scrapbookId: string): string {
    load();
    const c = newConcept(scrapbookId);
    commit({
      ...state,
      concepts: [...state.concepts, c],
      scrapbooks: state.scrapbooks.map((s) =>
        s.id === scrapbookId
          ? touch({ ...s, conceptIds: [...s.conceptIds, c.id], activeConceptId: c.id })
          : s,
      ),
    });
    return c.id;
  },
  duplicateConcept(conceptId: string): string | null {
    load();
    const src = state.concepts.find((c) => c.id === conceptId);
    if (!src) return null;
    const copy: Concept = {
      ...structuredClone(src),
      id: uid(),
      title: src.title ? `${src.title} (copy)` : "",
      status: "draft",
      createdAt: now(),
      updatedAt: now(),
    };
    commit({
      ...state,
      concepts: [...state.concepts, copy],
      scrapbooks: state.scrapbooks.map((s) =>
        s.id === src.scrapbookId
          ? touch({ ...s, conceptIds: [...s.conceptIds, copy.id], activeConceptId: copy.id })
          : s,
      ),
    });
    return copy.id;
  },
  deleteConcept(conceptId: string) {
    load();
    const c = state.concepts.find((x) => x.id === conceptId);
    if (!c) return;
    const book = state.scrapbooks.find((s) => s.id === c.scrapbookId);
    if (!book || book.conceptIds.length <= 1) return; // a scrapbook always keeps one concept
    const ids = book.conceptIds.filter((i) => i !== conceptId);
    commit({
      ...state,
      concepts: state.concepts.filter((x) => x.id !== conceptId),
      scrapbooks: state.scrapbooks.map((s) =>
        s.id === book.id
          ? touch({
              ...s,
              conceptIds: ids,
              activeConceptId: s.activeConceptId === conceptId ? ids[0] : s.activeConceptId,
            })
          : s,
      ),
    });
  },
  setActiveConcept(scrapbookId: string, conceptId: string) {
    load();
    commit({
      ...state,
      scrapbooks: state.scrapbooks.map((s) =>
        s.id === scrapbookId ? { ...s, activeConceptId: conceptId } : s,
      ),
    });
  },

  // ── Collected cards ─────────────────────────────────────────
  /** Keep a card. A pack card already kept (same contentId) isn't added twice. */
  collect(
    scrapbookId: string,
    card: Omit<CollectedCard, "id" | "isFavorite"> & { isFavorite?: boolean },
  ): string {
    load();
    const b = state.scrapbooks.find((s) => s.id === scrapbookId);
    if (!b) return "";
    const dupe = card.contentId
      ? b.collected.find((c) => c.contentId === card.contentId && c.type === card.type)
      : undefined;
    if (dupe) return dupe.id;
    const id = uid();
    commit({
      ...state,
      scrapbooks: state.scrapbooks.map((s) =>
        s.id === scrapbookId
          ? touch({ ...s, collected: [...s.collected, { isFavorite: false, ...card, id }] })
          : s,
      ),
    });
    return id;
  },
  updateCard(scrapbookId: string, cardId: string, patch: Partial<CollectedCard>) {
    load();
    commit({
      ...state,
      scrapbooks: state.scrapbooks.map((s) =>
        s.id === scrapbookId
          ? touch({
              ...s,
              collected: s.collected.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
            })
          : s,
      ),
    });
  },
  /** Remove a card from the collection and from every concept that used it. */
  removeCard(scrapbookId: string, cardId: string) {
    load();
    const strip = (xs: string[]) => xs.filter((x) => x !== cardId);
    commit({
      ...state,
      scrapbooks: state.scrapbooks.map((s) =>
        s.id === scrapbookId
          ? touch({ ...s, collected: s.collected.filter((c) => c.id !== cardId) })
          : s,
      ),
      concepts: state.concepts.map((c) =>
        c.scrapbookId !== scrapbookId
          ? c
          : touch({
              ...c,
              mechanics: strip(c.mechanics),
              hookTwists: strip(c.hookTwists),
              mood: strip(c.mood),
              setting: strip(c.setting),
              visualDirection: strip(c.visualDirection),
              audioDirection: strip(c.audioDirection),
              genres: {
                primary: c.genres.primary === cardId ? undefined : c.genres.primary,
                secondary: c.genres.secondary === cardId ? undefined : c.genres.secondary,
              },
              primary: Object.fromEntries(
                Object.entries(c.primary).filter(([, v]) => v !== cardId),
              ),
              coreLoops: c.coreLoops.map((l) => ({
                ...l,
                steps: l.steps.map((st) =>
                  st.cardId === cardId ? { ...st, cardId: undefined } : st,
                ),
              })),
            }),
      ),
    });
  },
};

export function useScrapbooks(): ScrapbookState {
  return useSyncExternalStore(scrapbookStore.subscribe, scrapbookStore.get, () => EMPTY);
}

/** The scrapbook with this id, its active concept, and ready flag. */
export function useScrapbook(id: string | null) {
  const s = useScrapbooks();
  const book = id ? s.scrapbooks.find((b) => b.id === id) : undefined;
  const concept = book ? s.concepts.find((c) => c.id === book.activeConceptId) : undefined;
  const concepts = book ? s.concepts.filter((c) => c.scrapbookId === book.id) : [];
  return { ready: s.ready, book, concept, concepts };
}
