/**
 * Scrapbook data model (redesign brief §15).
 * Three kinds of content stay distinguishable:
 *  - authored:  plain strings the user typed (title, tagline, objective…)
 *  - collected: CollectedCard rows kept from packs or written as custom cards
 *  - arranged:  loops, MVP lists, scope points, "primary" picks
 */

export type CardType =
  "word" | "genre" | "mechanic" | "objective" | "twist" | "mood" | "setting" | "visual" | "audio";

export type CardSource = "pack" | "custom" | "recommendation";

export type CollectedCard = {
  id: string;
  type: CardType;
  title: string;
  description: string;
  category?: string;
  source: CardSource;
  isFavorite: boolean;
  /** Id of the inspiration card this came from (packs/recommendations), for dedupe. */
  contentId?: string;
  /** Optional personal note (moodboard cards). */
  note?: string;
};

/** A reference to a CollectedCard by id. */
export type CardRef = string;

export type LoopStep = { id: string; label: string; cardId?: CardRef };
export type CoreLoop = { id: string; name: string; steps: LoopStep[] };

export type ScopeArea =
  "mechanics" | "levels" | "enemies" | "characters" | "environments" | "ui" | "audio" | "extras";
export const SCOPE_AREAS: { id: ScopeArea; label: string }[] = [
  { id: "mechanics", label: "Gameplay mechanics" },
  { id: "levels", label: "Levels" },
  { id: "enemies", label: "Enemies" },
  { id: "characters", label: "Characters" },
  { id: "environments", label: "Environments" },
  { id: "ui", label: "UI" },
  { id: "audio", label: "Audio" },
  { id: "extras", label: "Additional features" },
];
export const SCOPE_POINTS = 10;

export type Duration = "24h" | "48h" | "72h" | "1w" | "custom" | "";
export type TeamSize = "solo" | "2-3" | "4-5" | "6+" | "";

export type Mvp = { must: string[]; nice: string[]; cut: string[] };

export type PrimaryPicks = { mood?: CardRef; setting?: CardRef; visual?: CardRef; audio?: CardRef };

export type Concept = {
  id: string;
  scrapbookId: string;
  title: string;
  titleCandidates: string[];
  tagline: string;
  highConcept: string;
  genres: { primary?: CardRef; secondary?: CardRef };
  mechanics: CardRef[];
  coreLoops: CoreLoop[];
  activeLoopId?: string;
  objective: string;
  uniqueHook: string;
  hookTwists: CardRef[];
  mood: CardRef[];
  setting: CardRef[];
  visualDirection: CardRef[];
  audioDirection: CardRef[];
  primary: PrimaryPicks;
  scope: Partial<Record<ScopeArea, number>>;
  mvp: Mvp;
  status: "draft" | "pitched";
  createdAt: string;
  updatedAt: string;
};

export type PageId =
  | "setup"
  | "title"
  | "tagline"
  | "concept"
  | "genre"
  | "mechanics"
  | "loop"
  | "objective"
  | "hook"
  | "mood"
  | "scope"
  | "close";

export type Scrapbook = {
  id: string;
  name: string;
  jamTheme: string;
  platforms: string[];
  duration: Duration;
  customDuration: string;
  teamSize: TeamSize;
  restrictions: string;
  conceptIds: string[];
  activeConceptId: string;
  /** Cards kept so far; shared by every concept so they can be reused. */
  collected: CollectedCard[];
  /** Progress never decreases. */
  progress: { visitedPages: PageId[]; packsOpened: number; lastPage?: PageId };
  createdAt: string;
  updatedAt: string;
};

export type VotingStatus = "open" | "closed";
export type Vote = { voter: string; conceptId: string };
export type VotingSession = {
  id: string;
  scrapbookId: string;
  conceptIds: string[];
  votes: Vote[];
  status: VotingStatus;
  anonymous: boolean;
  round: number;
};
export type WallComment = {
  id: string;
  conceptId: string;
  author: string;
  body: string;
  at: string;
};

export const emptyMvp = (): Mvp => ({ must: [], nice: [], cut: [] });
