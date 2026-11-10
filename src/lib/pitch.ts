/**
 * The pitch: what a walk down the street produces, in a fixed, readable shape everyone can
 * compare and vote on. Every part is optional and independent (filling one never changes
 * another); the cards only suggest.
 *
 *   1. Title      typed, or spun
 *   2. Tagline    typed, or drafted from the details
 *   3. Genre      picked, or spun (you choose in the end)
 *   4. Platform   picked, or spun
 *   5. Details    one short keyword line per stall (mechanic, world, mood, look, twist, rule…)
 *   6. Notes      optional
 */
import { PUBLIC_URL } from "./site";
import { SLOT_LABEL, type CardData, type SlotId } from "./deck";
import type { Rng } from "./rng";

export type Pitch = {
  title: string;
  tagline: string;
  genre: string;
  platforms: string[];
  /** Typed detail lines. A line without one falls back to its stamped card's keyword. */
  details: Partial<Record<SlotId, string>>;
  notes: string;
};

/** A saved spread's pitch (older spreads saved before pitches existed get one from their concept). */
export function pitchOf(s: { pitch?: Pitch | null; concept?: { title: string } | null }): Pitch {
  return s.pitch
    ? { ...emptyPitch(), ...s.pitch }
    : { ...emptyPitch(), title: s.concept?.title ?? "" };
}

export const emptyPitch = (): Pitch => ({
  title: "",
  tagline: "",
  genre: "",
  platforms: [],
  details: {},
  notes: "",
});

/** itch.io's genre list, plus a couple of extras. */
export const GENRES = [
  "Action",
  "Adventure",
  "Card Game",
  "Educational",
  "Fighting",
  "Interactive Fiction",
  "Platformer",
  "Puzzle",
  "Racing",
  "Rhythm",
  "Role Playing",
  "Roguelike",
  "Shooter",
  "Simulation",
  "Sports",
  "Strategy",
  "Survival",
  "Visual Novel",
  "Cozy",
  "Horror",
];
export const PLATFORMS = ["PC", "Mobile", "Web", "Console", "Handheld", "VR", "Tabletop"];

/** Detail lines, in reading order, with the name a reader sees. */
export const DETAIL_ORDER: { slot: SlotId; label: string }[] = [
  { slot: "verb", label: "Mechanic" },
  { slot: "world", label: "World" },
  { slot: "mood", label: "Mood" },
  { slot: "look", label: "Look" },
  { slot: "twist", label: "Twist" },
  { slot: "constraint", label: "Rule" },
  { slot: "seed", label: "Seed" },
  { slot: "free", label: "Extra" },
];
export const detailLabel = (slot: SlotId) =>
  DETAIL_ORDER.find((d) => d.slot === slot)?.label ?? SLOT_LABEL[slot];

/** A card's text as a short keyword line (sentences get trimmed). */
export function keyword(card: CardData | undefined): string {
  if (!card) return "";
  let t = card.text.trim().replace(/\.$/, "");
  if (t.length > 44) {
    const cut = t.slice(0, 44);
    t = cut.slice(0, cut.lastIndexOf(" ") > 20 ? cut.lastIndexOf(" ") : 44) + "…";
  }
  return t;
}

export function detailText(
  p: Pitch,
  cards: Partial<Record<SlotId, CardData>>,
  slot: SlotId,
): string {
  return (p.details[slot] ?? "").trim() || keyword(cards[slot]);
}

/** The detail lines that have something in them, in reading order. */
export function filledDetails(
  p: Pitch,
  cards: Partial<Record<SlotId, CardData>>,
  slots?: SlotId[],
) {
  return DETAIL_ORDER.filter((d) => !slots || slots.includes(d.slot) || p.details[d.slot])
    .map((d) => ({ ...d, text: detailText(p, cards, d.slot) }))
    .filter((d) => d.text);
}

/** A nudge, not a lock: title, genre and at least 3 details. */
export function readiness(p: Pitch, cards: Partial<Record<SlotId, CardData>>) {
  const details = filledDetails(p, cards).length;
  const missing: string[] = [];
  if (!p.title.trim()) missing.push("title");
  if (!p.genre) missing.push("genre");
  if (details < 3) missing.push(`${3 - details} more detail${3 - details === 1 ? "" : "s"}`);
  return { ready: missing.length === 0, missing, details };
}

// ── Spins (suggestions only; the player always chooses) ──────────

const cap = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());
const NAME_ADJ = [
  "Little",
  "Last",
  "Lost",
  "Tiny",
  "Hollow",
  "Neon",
  "Paper",
  "Quiet",
  "Brass",
  "Velvet",
  "Feral",
  "Sunken",
  "Pocket",
  "Midnight",
  "Wobbly",
];
const NAME_NOUN = [
  "Keepers",
  "Drift",
  "Hours",
  "Tales",
  "Run",
  "Society",
  "Protocol",
  "Garden",
  "Engine",
  "Club",
  "Lights",
  "Express",
  "Ballad",
  "Odyssey",
  "Quarters",
];

/** A title idea from the pitch's own words, mixed with name templates. */
export function spinTitle(rng: Rng, p: Pitch, cards: Partial<Record<SlotId, CardData>>): string {
  const words = [
    detailText(p, cards, "seed"),
    detailText(p, cards, "world").split(" · ")[0],
    detailText(p, cards, "world").split(" · ")[2] ?? "",
    detailText(p, cards, "verb").split(" ")[0],
  ]
    .map((w) => w.replace(/[^a-zA-Z' ]/g, "").trim())
    .filter((w) => w && w.split(" ").length <= 2);
  const word = words.length ? cap(rng.pick(words)) : cap(rng.pick(NAME_NOUN));
  const adj = rng.pick(NAME_ADJ);
  const noun = rng.pick(NAME_NOUN);
  const templates = [
    () => `${adj} ${word}`,
    () => `${word} ${noun}`,
    () => `The ${word} ${noun}`,
    () => `${word}fall`,
    () => `${adj} ${noun}`,
    () => `${word} & Co.`,
    () => `Tiny ${word}`,
    () => `${word}.exe`,
    () => `Last ${word}`,
    () => `${word} Quest`,
  ];
  return rng.pick(templates)();
}

export const spinFrom = <T>(rng: Rng, xs: readonly T[]) => rng.pick(xs);

/** A tagline draft from the details (a starting point to edit). */
export function draftTagline(rng: Rng, p: Pitch, cards: Partial<Record<SlotId, CardData>>): string {
  const mech = detailText(p, cards, "verb").toLowerCase();
  const seed = detailText(p, cards, "seed").toLowerCase();
  const world = detailText(p, cards, "world").split(" · ")[0]?.toLowerCase();
  const twist = detailText(p, cards, "twist").replace(/\.?$/, "").replace(/…$/, "");
  const genre = p.genre ? p.genre.toLowerCase() : "game";
  const a = (w: string) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);
  const options = [
    mech && seed ? `A ${mech} ${genre} about ${a(seed)}${world ? ` in ${a(world)}` : ""}.` : "",
    twist ? `${twist.charAt(0).toUpperCase()}${twist.slice(1)}.` : "",
    world && mech ? `${cap(mech)} your way through ${a(world)}.` : "",
    seed ? `Everything depends on ${a(seed)}.` : "",
  ].filter(Boolean);
  return options.length ? rng.pick(options) : "";
}

// ── Export ────────────────────────────────────────────────────────

export function pitchMarkdown(p: Pitch, cards: Partial<Record<SlotId, CardData>>): string {
  const lines = [
    `# ${p.title || "Untitled"}`,
    p.tagline ? `> ${p.tagline}` : "",
    "",
    [p.genre, p.platforms.join(" / ")].filter(Boolean).join(" · "),
    "",
    ...filledDetails(p, cards).map((d) => `- **${d.label}:** ${d.text}`),
  ];
  if (p.notes.trim()) lines.push("", "**Notes**", "", p.notes.trim());
  lines.push("", `_Made with [Quackle Scrapbook](${PUBLIC_URL})_`);
  return (
    lines
      .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
      .join("\n")
      .trim() + "\n"
  );
}

/** Text shaped like an itch.io project page (title, short description, genre, tags, description). */
export function itchText(p: Pitch, cards: Partial<Record<SlotId, CardData>>): string {
  const tags = [...new Set(Object.values(cards).flatMap((c) => c?.tags ?? []))].slice(0, 5);
  return [
    `Title: ${p.title}`,
    `Short description: ${p.tagline}`,
    `Genre: ${p.genre}`,
    `Platforms: ${p.platforms.join(", ")}`,
    `Tags: ${tags.join(", ")}`,
    "",
    "Description:",
    ...filledDetails(p, cards).map((d) => `${d.label}: ${d.text}`),
  ].join("\n");
}
