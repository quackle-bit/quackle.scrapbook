import type { CardType } from "@/lib/scrapbook/types";

/** The stall keeper who sells each kind of card: a sign, a greeting, and lines for keeping / trashing. */
export type Keeper = {
  stall: string;
  who: string;
  greet: string[];
  kept: string[];
  trashed: string[];
  pack: string;
};

export const KEEPERS: Record<CardType, Keeper> = {
  word: {
    stall: "The Word Merchant",
    who: "a talkative old merchant",
    greet: [
      "Fresh words! Lovely words!",
      "Every great title starts with one good word.",
      "Smell that? Nouns. Just in.",
    ],
    kept: ["A fine word.", "That one's got legs."],
    trashed: ["Plenty more where that came from.", "Fair. Too wordy."],
    pack: "Word pack",
  },
  genre: {
    stall: "The Label Maker",
    who: "a fussy archivist",
    greet: ["Every game needs a shelf to sit on.", "What kind of game is it? Let's file it."],
    kept: ["Filed.", "A good shelf for it."],
    trashed: ["Not that shelf, then.", "Back in the drawer."],
    pack: "Genre pack",
  },
  mechanic: {
    stall: "The Gear Booth",
    who: "a tinkerer with oily hands",
    greet: [
      "Every game needs an engine.",
      "What does the player do with their hands, a hundred times?",
    ],
    kept: ["Ka-chunk. That'll run.", "Solid engine part."],
    trashed: ["Scrap metal.", "Doesn't fit the engine."],
    pack: "Mechanics pack",
  },
  objective: {
    stall: "The Signpost",
    who: "a patient guide",
    greet: ["Where is the player trying to go?", "Every road needs an end."],
    kept: ["Now we know where we're headed.", "A good destination."],
    trashed: ["Another road, then.", "Not that way."],
    pack: "Objective pack",
  },
  twist: {
    stall: "The Trickster",
    who: "a grinning stranger",
    greet: ["Want to make it weird?", "Pick a cup. Any cup.", "Rules are more fun bent."],
    kept: ["Heh. They'll never see it coming.", "Delightfully wrong."],
    trashed: ["Too normal anyway.", "Coward. (Kidding.)"],
    pack: "Twist pack",
  },
  mood: {
    stall: "The Fortune Teller",
    who: "a woman behind a velvet curtain",
    greet: ["I see… fog. And regret.", "Tell me how the player should feel."],
    kept: ["The cards agree.", "Yes. That's the feeling."],
    trashed: ["The spirits say no.", "Not this fate."],
    pack: "Mood pack",
  },
  setting: {
    stall: "The Mapmaker",
    who: "a mapmaker buried in paper",
    greet: ["Where shall we go?", "Every map needs one place worth getting lost in."],
    kept: ["Marked on the map.", "I know the way there."],
    trashed: ["Uncharted, and staying that way.", "Fold that one up."],
    pack: "Setting pack",
  },
  visual: {
    stall: "The Tailor",
    who: "a tailor with pins in their mouth",
    greet: ["Let's dress your game.", "What should it look like from across the room?"],
    kept: ["That suits it.", "A perfect fit."],
    trashed: ["Wrong cut.", "Not its colour."],
    pack: "Look pack",
  },
  perspective: {
    stall: "The Lookout",
    who: "a lookout with a brass spyglass",
    greet: ["Flat or deep? Above or beside?", "Every game needs a place to stand."],
    kept: ["Good vantage point.", "I can see it all from here."],
    trashed: ["Can't see a thing from there.", "Wrong angle."],
    pack: "Perspective pack",
  },
  audio: {
    stall: "The Music Box",
    who: "a quiet musician",
    greet: ["Listen. What does it sound like?", "Every world hums something."],
    kept: ["I can hear it already.", "That's the tune."],
    trashed: ["Off key.", "Too loud for this one."],
    pack: "Sound pack",
  },
};

export const pickLine = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];
