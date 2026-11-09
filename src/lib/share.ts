/**
 * Read-only share links for a spread (CLAUDE.md §6.1). The spread is encoded into the URL
 * hash (`/s#…`), so it never hits a server and needs no database. Compact keys keep links short.
 */
import type { Concept, SparkNote } from "@/components/book/SpreadView";
import type { CardData, SlotId } from "./deck";
import { emptyPitch, pitchOf, type Pitch } from "./pitch";
import type { SavedSpread } from "./store";

type Packed = {
  v: 1;
  b: string; // book title
  k: string; // cover colour
  s: SlotId[];
  c: [SlotId, CardData["slot"], string, CardData["rarity"], string?, string?][]; // slot, type, text, rarity, flavor, palette
  t?: string;
  l?: string;
  p?: string[];
  n?: [string, string][];
  d: string;
  /** pitch: title, tagline, genre, platforms, typed detail lines, notes */
  q?: {
    t: string;
    l: string;
    g: string;
    p: string[];
    d: Partial<Record<SlotId, string>>;
    n: string;
  };
};

const VALID_SLOTS: SlotId[] = [
  "seed",
  "verb",
  "world",
  "mood",
  "look",
  "twist",
  "constraint",
  "free",
];
const VALID_TYPES = VALID_SLOTS.filter((x) => x !== "free");
const RARITY = { common: "c", uncommon: "u", rare: "r", mythic: "m" } as const;
const UNRARITY: Record<string, CardData["rarity"]> = {
  c: "common",
  u: "uncommon",
  r: "rare",
  m: "mythic",
};

function b64urlEncode(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSpread(sp: SavedSpread, book: { title: string; color: string }): string {
  const packed: Packed = {
    v: 1,
    b: book.title,
    k: book.color,
    s: sp.slots,
    c: sp.slots
      .filter((s) => sp.cards[s])
      .map((s) => {
        const c = sp.cards[s]!;
        return [
          s,
          c.slot,
          c.text,
          RARITY[c.rarity] as unknown as CardData["rarity"],
          c.flavor ?? "",
          c.palette?.join("|") ?? "",
        ];
      }),
    t: sp.concept?.title,
    l: sp.concept?.logline,
    p: sp.concept?.palette,
    n: sp.notes.filter((n) => n.a.trim()).map((n) => [n.q, n.a]),
    d: sp.createdAt.slice(0, 10),
    q: (() => {
      const p = pitchOf(sp);
      return { t: p.title, l: p.tagline, g: p.genre, p: p.platforms, d: p.details, n: p.notes };
    })(),
  };
  return b64urlEncode(JSON.stringify(packed));
}

/** Only plain colours from our own palette generator are allowed into CSS. */
const SAFE_COLOR = /^(hsl\(\d{1,3} \d{1,3}% \d{1,3}%\)|#[0-9a-f]{3,8})$/i;
const safeColors = (xs: string[]) => xs.filter((x) => SAFE_COLOR.test(x)).slice(0, 4);

export type SharedSpread = {
  bookTitle: string;
  color: string;
  date: string;
  slots: SlotId[];
  cards: Partial<Record<SlotId, CardData>>;
  concept: Concept | null;
  notes: SparkNote[];
  pitch: Pitch;
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export function decodeSpread(hash: string): SharedSpread | null {
  try {
    const p = JSON.parse(b64urlDecode(hash.replace(/^#/, ""))) as Packed;
    if (p.v !== 1 || !Array.isArray(p.c)) return null;
    const cards: Partial<Record<SlotId, CardData>> = {};
    p.c.forEach(([slot, type, text, r, flavor, palette], i) => {
      if (!VALID_SLOTS.includes(slot) || !VALID_TYPES.includes(type)) return;
      cards[slot] = {
        id: `shared-${i}`,
        slot: type,
        text: String(text).slice(0, 120),
        rarity: UNRARITY[r as unknown as string] ?? "common",
        tags: [],
        flavor: flavor || undefined,
        serial: 0,
        palette: palette ? safeColors(palette.split("|")) : undefined,
      };
    });
    return {
      bookTitle: String(p.b ?? "").slice(0, 60),
      color: /^#[0-9a-f]{6}$/i.test(p.k) ? p.k : "#c0392b",
      date: String(p.d ?? ""),
      slots: (Array.isArray(p.s) ? p.s : []).filter((x) => VALID_SLOTS.includes(x)),
      cards,
      concept: p.t
        ? {
            title: p.t.slice(0, 60),
            logline: (p.l ?? "").slice(0, 400),
            palette: safeColors(p.p ?? []),
          }
        : null,
      pitch: p.q
        ? {
            ...emptyPitch(),
            title: str(p.q.t, 60),
            tagline: str(p.q.l, 110),
            genre: str(p.q.g, 30),
            platforms: (Array.isArray(p.q.p) ? p.q.p : []).map((x) => str(x, 20)).slice(0, 8),
            details: Object.fromEntries(
              Object.entries(p.q.d ?? {})
                .filter(([k]) => VALID_SLOTS.includes(k as SlotId))
                .map(([k, v]) => [k, str(v, 60)]),
            ),
            notes: str(p.q.n, 800),
          }
        : { ...emptyPitch(), title: p.t ? p.t.slice(0, 60) : "" },
      notes: (p.n ?? [])
        .slice(0, 12)
        .map(([q, a]) => ({ stop: "", q: String(q).slice(0, 140), a: String(a).slice(0, 140) })),
    };
  } catch {
    return null;
  }
}

export function shareUrl(sp: SavedSpread, book: { title: string; color: string }) {
  return `${window.location.origin}/s#${encodeSpread(sp, book)}`;
}
