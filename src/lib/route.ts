/**
 * The Route (CLAUDE.md §1B): the bazaar is a street you walk down, one stall per screen.
 * Each stop fills one slot, has its own mini-game, a keeper line and a pool of spark questions.
 */
import type { SlotId } from "./deck";

export type Mode = "visitor" | "jam" | "studio";

export type StopId =
  | "gate"
  | "word"
  | "theme"
  | "gear"
  | "map"
  | "fortune"
  | "tailor"
  | "trickster"
  | "rule"
  | "forge"
  | "night";

export type AlleyId = "crate" | "echo";

export type StopDef = {
  id: StopId;
  name: string;
  /** Slot this stop fills (gate / forge / night fill none). */
  slot?: SlotId;
  keeper: string;
  /** Awning colour (a card-type CSS variable). */
  color: string;
  sparks: string[];
};

export const STOPS: Record<StopId, StopDef> = {
  gate: {
    id: "gate",
    name: "THE GATE",
    keeper: "Name your book and step inside.",
    color: "var(--accent)",
    sparks: [
      "What kind of game do you NOT want to make today?",
      "What would bore you to build?",
      "Which genre are you tired of?",
      "What should this game never feel like?",
    ],
  },
  word: {
    id: "word",
    name: "THE WORD MERCHANT",
    slot: "seed",
    keeper: "Fresh words! One coin a pack!",
    color: "var(--t-seed)",
    sparks: [
      "Say the word out loud. What's the first thing you picture?",
      "Who owns this thing?",
      "What happens if it breaks?",
      "Where would you find it at 3am?",
      "What does it smell like?",
      "Make it 100 times bigger. Now what?",
      "What memory does this word drag up?",
      "Who would steal it, and why?",
      "What's the sound it makes when you drop it?",
      "If it could talk, what's its first line?",
      "What's hidden inside it?",
      "Make it tiny. Who uses it now?",
    ],
  },
  theme: {
    id: "theme",
    name: "THE THEME STALL",
    slot: "seed",
    keeper: "Every pack has a piece of today's theme.",
    color: "var(--accent)",
    sparks: [
      "What's the most obvious take on the theme? Now dodge it.",
      "How does the theme sound?",
      "Where is the theme hiding in your card?",
      "What would a duck think the theme means?",
      "Which word in the theme is doing the most work?",
    ],
  },
  gear: {
    id: "gear",
    name: "THE GEAR BOOTH",
    slot: "verb",
    keeper: "Every game needs an engine.",
    color: "var(--t-verb)",
    sparks: [
      "What does the player do with their hands 100 times?",
      "What's the first time this verb feels great?",
      "How does doing it badly look?",
      "What makes the 50th time different from the 1st?",
      "What resists the player when they do it?",
      "Can you do it with one button?",
      "What sound plays when it works?",
      "Who else in the world does this verb?",
      "What does mastery of this look like?",
      "How could two players do it together?",
      "What's the opposite verb, and is it in the game too?",
    ],
  },
  map: {
    id: "map",
    name: "THE MAPMAKER",
    slot: "world",
    keeper: "Where shall we go?",
    color: "var(--t-world)",
    sparks: [
      "What does this place sound like at night?",
      "What's the oldest thing here?",
      "Who left, and why?",
      "What's the weather doing?",
      "Where's the one place the player can't go?",
      "What does the ground feel like?",
      "What do the inhabitants eat?",
      "What's on the walls?",
      "What would a tourist get wrong here?",
      "What's the law nobody follows?",
    ],
  },
  fortune: {
    id: "fortune",
    name: "THE FORTUNE TELLER",
    slot: "mood",
    keeper: "I see… fog. And regret.",
    color: "var(--t-mood)",
    sparks: [
      "Finish the sentence: The player feels…",
      "What colour is this mood?",
      "What song is playing?",
      "When in the day does this feel strongest?",
      "What's the moment the mood breaks?",
      "Which game made you feel this way before?",
      "What does the player NOT feel?",
      "Is this mood loud or quiet?",
      "What's the last thing the player sees?",
      "What does relief look like here?",
    ],
  },
  tailor: {
    id: "tailor",
    name: "THE TAILOR",
    slot: "look",
    keeper: "Let's dress your game in pixels.",
    color: "var(--t-look)",
    sparks: [
      "Name one game whose look is close, and one thing you'd change.",
      "What's the hardest sprite to draw in this style?",
      "How many colours, really?",
      "What moves on screen when nothing's happening?",
      "What's the one effect you'd spend a week on?",
      "Where does the camera never go?",
      "What's the screenshot people share?",
      "What would this look like in 4 colours?",
      "Big pixels or small pixels?",
      "What's the UI made of in this world?",
    ],
  },
  trickster: {
    id: "trickster",
    name: "THE TRICKSTER",
    slot: "twist",
    keeper: "Want to make it weird?",
    color: "var(--t-twist)",
    sparks: [
      "How would this twist break your core verb?",
      "When does the player find out?",
      "What's the twist's twist?",
      "How do you hint at it in the first minute?",
      "Who in the world knows already?",
      "Does the twist make it funnier or sadder?",
      "What would the duck do here?",
      "What's the smallest version of this twist?",
      "What rule does it bend?",
      "Could this twist be the whole game?",
    ],
  },
  rule: {
    id: "rule",
    name: "THE RULEKEEPER",
    slot: "constraint",
    keeper: "Limits make it interesting.",
    color: "var(--t-constraint)",
    sparks: [
      "What's the first thing this rule forces you to cut?",
      "What gets easier because of this rule?",
      "How do you sneak around it?",
      "What would make the rule even harsher?",
      "Does the player know the rule exists?",
      "What's the best thing that only exists because of it?",
      "Which of your cards fights this rule most?",
      "Could the rule be the core verb?",
    ],
  },
  forge: {
    id: "forge",
    name: "THE FORGE",
    keeper: "Bring me your stamps.",
    color: "#e8a33c",
    sparks: [
      "Pitch it to the duck in one sentence.",
      "What's the trailer's first shot?",
      "Who is this game for?",
      "What's the one-line review you want?",
    ],
  },
  night: {
    id: "night",
    name: "THE NIGHT MARKET",
    keeper: "Last chance to swap. Then close the book.",
    color: "#2f3a6b",
    sparks: [
      "Which card would you remove to make it simpler?",
      "Which card surprised you most?",
      "What would you prototype first, tomorrow?",
      "Which card is secretly the main character?",
    ],
  },
};

export type RouteDef = {
  mode: Mode;
  label: string;
  blurb: string;
  stops: StopId[];
  coins: number | null;
  /** Seconds per stop (Jam only). */
  timer?: number;
  sparksPerStop: number;
  /** Side alleys appear after these stops. */
  alleys?: Partial<Record<StopId, AlleyId>>;
};

export const ROUTES: Record<Mode, RouteDef> = {
  visitor: {
    mode: "visitor",
    label: "Visitor",
    blurb: "Short street · 5 stops · ~30 s each",
    stops: ["gate", "word", "gear", "tailor", "trickster", "forge"],
    coins: 10,
    sparksPerStop: 1,
  },
  jam: {
    mode: "jam",
    label: "Jam",
    blurb: "Sprint street · theme · 1 min per stop",
    stops: ["gate", "theme", "gear", "tailor", "trickster", "forge"],
    coins: 6,
    timer: 60,
    sparksPerStop: 1,
  },
  studio: {
    mode: "studio",
    label: "Studio",
    blurb: "Full street · 7 stops · side alleys · no timer",
    stops: [
      "gate",
      "word",
      "gear",
      "map",
      "fortune",
      "tailor",
      "trickster",
      "rule",
      "forge",
      "night",
    ],
    coins: null,
    sparksPerStop: 1,
    alleys: { gear: "echo", trickster: "crate" },
  },
};

export const ALLEYS: Record<AlleyId, { name: string; sign: string; keeper: string }> = {
  crate: { name: "THE MYSTERY CRATE", sign: "Mystery Crate", keeper: "No refunds." },
  echo: { name: "THE ECHO WELL", sign: "Echo Well", keeper: "Shout a word in. It shouts back." },
};

/** Slots on the spread for a route (stops in order + FREE when it has the crate alley). */
export function routeSlots(route: RouteDef): SlotId[] {
  const slots = route.stops.map((s) => STOPS[s].slot).filter((s): s is SlotId => !!s);
  if (route.alleys && Object.values(route.alleys).includes("crate")) slots.push("free");
  return slots;
}

/** Pick a spark question for a stop, avoiding ones already asked this run. */
export function pickSpark(stop: StopId, asked: string[], rand: () => number): string {
  const pool = STOPS[stop].sparks.filter((q) => !asked.includes(q));
  const from = pool.length ? pool : STOPS[stop].sparks;
  return from[Math.floor(rand() * from.length)];
}

/** Background "weather" from the stamped MOOD card's tags. */
export type Weather = "clear" | "fog" | "dusk" | "neon" | "rain" | "snow";
export function weatherFor(tags: string[] | undefined): Weather {
  if (!tags?.length) return "clear";
  const has = (...t: string[]) => t.some((x) => tags.includes(x));
  if (has("cold", "serene")) return "snow";
  if (has("eerie", "silence", "dark")) return "fog";
  if (has("melancholy", "sea", "sound")) return "rain";
  if (has("chaotic", "frantic", "light")) return "neon";
  if (has("cozy", "warm", "hopeful")) return "dusk";
  return "clear";
}
