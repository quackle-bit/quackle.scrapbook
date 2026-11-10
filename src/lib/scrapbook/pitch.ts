import {
  ASSET_KINDS,
  SCOPE_AREAS,
  type CollectedCard,
  type Concept,
  type Mvp,
  type PageId,
  type Scrapbook,
} from "./types";

/**
 * The pitch as it's read: one display model made from a concept (and its scrapbook's cards).
 * Only things the user actually provided are included; nothing is invented to fill gaps.
 * The same model feeds the pitch page, the share image, exports and share links.
 */

export type PitchCardLine = {
  title: string;
  description?: string;
  primary?: boolean;
  favorite?: boolean;
  note?: string;
};

export type PitchModel = {
  title: string;
  tagline: string;
  highConcept: string;
  platforms: string[];
  genres: string[];
  mechanics: PitchCardLine[];
  loops: { name: string; steps: string[] }[];
  activeLoop: number;
  objective: string;
  hook: string;
  twists: PitchCardLine[];
  mood: PitchCardLine[];
  setting: PitchCardLine[];
  visual: PitchCardLine[];
  perspective: PitchCardLine[];
  audio: PitchCardLine[];
  scope: { label: string; points: number }[];
  mvp: Mvp;
  /** Asset counts and notes, only the rows that have something. */
  assets: { label: string; count: number; note: string }[];
  assetNotes: string;
  project: {
    name: string;
    jamTheme: string;
    duration: string;
    teamSize: string;
    restrictions: string;
  };
  status: "draft" | "pitched";
  date: string;
};

const DURATION: Record<string, string> = {
  "24h": "24 hours",
  "48h": "48 hours",
  "72h": "72 hours",
  "1w": "1 week",
};
const TEAM: Record<string, string> = {
  solo: "Solo",
  "2-3": "2–3 people",
  "4-5": "4–5 people",
  "6+": "6+ people",
};

function lines(book: Scrapbook, ids: string[], primaryId?: string): PitchCardLine[] {
  const out: PitchCardLine[] = [];
  for (const id of ids) {
    const c = book.collected.find((x) => x.id === id);
    if (!c) continue;
    out.push({
      title: c.title,
      description: c.description || undefined,
      primary: id === primaryId || undefined,
      favorite: c.isFavorite || undefined,
      note: c.note?.trim() || undefined,
    });
  }
  // primary first
  return out.sort((a, b) => Number(!!b.primary) - Number(!!a.primary));
}

export function buildPitchModel(book: Scrapbook, concept: Concept): PitchModel {
  const title = (id?: string) => book.collected.find((c: CollectedCard) => c.id === id)?.title;
  const loops = concept.coreLoops
    .map((l) => ({ name: l.name, steps: l.steps.map((s) => s.label.trim()).filter(Boolean) }))
    .filter((l) => l.steps.length);
  const activeIdx = Math.max(
    0,
    loops.findIndex(
      (l) => l.name === concept.coreLoops.find((x) => x.id === concept.activeLoopId)?.name,
    ),
  );
  return {
    title: concept.title.trim(),
    tagline: concept.tagline.trim(),
    highConcept: concept.highConcept.trim(),
    platforms: book.platforms,
    genres: [title(concept.genres.primary), title(concept.genres.secondary)].filter(
      (x): x is string => !!x,
    ),
    mechanics: lines(book, concept.mechanics),
    loops,
    activeLoop: activeIdx,
    objective: concept.objective.trim(),
    hook: concept.uniqueHook.trim(),
    twists: lines(book, concept.hookTwists),
    mood: lines(book, concept.mood, concept.primary.mood),
    setting: lines(book, concept.setting, concept.primary.setting),
    visual: lines(book, concept.visualDirection, concept.primary.visual),
    perspective: lines(book, concept.perspective ?? [], concept.primary.perspective),
    audio: lines(book, concept.audioDirection, concept.primary.audio),
    scope: SCOPE_AREAS.map((a) => ({ label: a.label, points: concept.scope[a.id] ?? 0 })).filter(
      (s) => s.points > 0,
    ),
    mvp: concept.mvp,
    assets: ASSET_KINDS.map((k) => ({
      label: k.label,
      count: concept.assets?.counts[k.id] ?? 0,
      note: (concept.assets?.notes[k.id] ?? "").trim(),
    })).filter((a) => a.count > 0 || a.note),
    assetNotes: (concept.assets?.general ?? "").trim(),
    project: {
      name: book.name.trim(),
      jamTheme: book.jamTheme.trim(),
      duration:
        book.duration === "custom" ? book.customDuration.trim() : (DURATION[book.duration] ?? ""),
      teamSize: TEAM[book.teamSize] ?? "",
      restrictions: book.restrictions.trim(),
    },
    status: concept.status,
    date: concept.updatedAt.slice(0, 10),
  };
}

/** The fourteen pitch sections, in order, with the scrapbook page that edits each one. */
export type SectionId =
  | "title"
  | "tagline"
  | "highConcept"
  | "platform"
  | "genre"
  | "mechanics"
  | "loop"
  | "objective"
  | "hook"
  | "mood"
  | "visual"
  | "perspective"
  | "audio"
  | "scope"
  | "mvp";
export const SECTIONS: { id: SectionId; label: string; page: PageId }[] = [
  { id: "title", label: "Game title", page: "title" },
  { id: "tagline", label: "Tagline", page: "tagline" },
  { id: "highConcept", label: "High concept", page: "concept" },
  { id: "platform", label: "Platform", page: "setup" },
  { id: "genre", label: "Genre", page: "genre" },
  { id: "mechanics", label: "Core mechanics", page: "mechanics" },
  { id: "loop", label: "Core gameplay loop", page: "loop" },
  { id: "objective", label: "Player objective", page: "objective" },
  { id: "hook", label: "Unique hook", page: "hook" },
  { id: "mood", label: "Mood & setting", page: "mood" },
  { id: "visual", label: "Look", page: "mood" },
  { id: "perspective", label: "Perspective", page: "mood" },
  { id: "audio", label: "Audio direction", page: "mood" },
  { id: "scope", label: "Scope", page: "scope" },
  { id: "mvp", label: "MVP", page: "scope" },
];

export function sectionHasContent(m: PitchModel, id: SectionId): boolean {
  switch (id) {
    case "title":
      return !!m.title;
    case "tagline":
      return !!m.tagline;
    case "highConcept":
      return !!m.highConcept;
    case "platform":
      return m.platforms.length > 0;
    case "genre":
      return m.genres.length > 0;
    case "mechanics":
      return m.mechanics.length > 0;
    case "loop":
      return m.loops.length > 0;
    case "objective":
      return !!m.objective;
    case "hook":
      return !!m.hook || m.twists.length > 0;
    case "mood":
      return m.mood.length + m.setting.length > 0;
    case "visual":
      return m.visual.length > 0;
    case "perspective":
      return m.perspective.length > 0;
    case "audio":
      return m.audio.length > 0;
    case "scope":
      return m.scope.length > 0;
    case "mvp":
      return m.mvp.must.length + m.mvp.nice.length + m.mvp.cut.length > 0;
  }
}
export const filledCount = (m: PitchModel) =>
  SECTIONS.filter((s) => sectionHasContent(m, s.id)).length;

export function pitchMarkdown(m: PitchModel): string {
  const L: string[] = [];
  const h = (t: string) => L.push("", `## ${t}`, "");
  L.push(`# ${m.title || "Untitled game"}`);
  if (m.tagline) L.push("", `> ${m.tagline}`);
  const meta = [m.genres.join(" + "), m.platforms.join(" / ")].filter(Boolean).join(" · ");
  if (meta) L.push("", `**${meta}**`);
  const proj = [
    m.project.jamTheme && `Jam theme: ${m.project.jamTheme}`,
    m.project.duration && `Duration: ${m.project.duration}`,
    m.project.teamSize && `Team: ${m.project.teamSize}`,
  ].filter(Boolean);
  if (proj.length) L.push("", proj.join(" · "));
  if (m.project.restrictions) L.push("", `Restrictions: ${m.project.restrictions}`);
  if (m.highConcept) {
    h("High concept");
    L.push(m.highConcept);
  }
  if (m.mechanics.length) {
    h("Core mechanics");
    m.mechanics.forEach((c) =>
      L.push(`- **${c.title}**${c.description ? `: ${c.description}` : ""}`),
    );
  }
  if (m.loops.length) {
    h("Core gameplay loop");
    m.loops.forEach((l, i) =>
      L.push(
        `${m.loops.length > 1 ? `**${l.name}${i === m.activeLoop ? " (main)" : ""}:** ` : ""}${l.steps.map((s) => s.toUpperCase()).join(" → ")} → REPEAT`,
        "",
      ),
    );
  }
  if (m.objective) {
    h("Player objective");
    L.push(m.objective);
  }
  if (m.hook || m.twists.length) {
    h("Unique hook");
    if (m.hook) L.push(m.hook);
    m.twists.forEach((t) => L.push(`- ${t.title}`));
  }
  const world = [
    ...m.mood.map((c) => `Mood: ${c.title}${c.primary ? " (primary)" : ""}`),
    ...m.setting.map((c) => `Setting: ${c.title}${c.primary ? " (primary)" : ""}`),
  ];
  if (world.length) {
    h("Mood & setting");
    world.forEach((w) => L.push(`- ${w}`));
  }
  if (m.visual.length) {
    h("Visual direction");
    m.visual.forEach((c) => L.push(`- ${c.title}${c.primary ? " (primary)" : ""}`));
  }
  if (m.perspective.length) {
    h("Perspective");
    m.perspective.forEach((c) => L.push(`- ${c.title}${c.primary ? " (primary)" : ""}`));
  }
  if (m.audio.length) {
    h("Audio direction");
    m.audio.forEach((c) => L.push(`- ${c.title}${c.primary ? " (primary)" : ""}`));
  }
  if (m.scope.length) {
    h("Scope (10 development points)");
    m.scope.forEach((s) => L.push(`- ${s.label}: ${s.points}`));
  }
  if (m.mvp.must.length + m.mvp.nice.length + m.mvp.cut.length) {
    h("MVP");
    (
      [
        ["Must have", m.mvp.must],
        ["Nice to have", m.mvp.nice],
        ["Cut first", m.mvp.cut],
      ] as const
    ).forEach(([label, items]) => {
      if (items.length) L.push(`**${label}**`, ...items.map((i) => `- ${i}`), "");
    });
  }
  if (m.assets?.length || m.assetNotes) {
    h("Assets");
    (m.assets ?? []).forEach((a) =>
      L.push(`- ${a.label}: ${a.count}${a.note ? ` (${a.note})` : ""}`),
    );
    if (m.assetNotes) L.push("", m.assetNotes);
  }
  L.push("", "_Made with Quackle Scrapbook_");
  return (
    L.join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

// ── Share links (schema v2: the pitch model itself, in the URL hash) ───────

const b64e = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const b64d = (s: string) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
  );

export function encodePitch(m: PitchModel): string {
  return b64e(JSON.stringify({ v: 2, m }));
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const strs = (v: unknown, n: number, max: number) =>
  Array.isArray(v)
    ? v
        .slice(0, n)
        .map((x) => str(x, max))
        .filter(Boolean)
    : [];
const cardLines = (v: unknown): PitchCardLine[] =>
  Array.isArray(v)
    ? v
        .slice(0, 20)
        .map((c: Record<string, unknown>) => ({
          title: str(c?.title, 80),
          description: str(c?.description, 160) || undefined,
          primary: c?.primary === true || undefined,
          favorite: c?.favorite === true || undefined,
          note: str(c?.note, 80) || undefined,
        }))
        .filter((c) => c.title)
    : [];

/** Reads a v2 share link. Everything is length-capped and type-checked: it's untrusted input. */
export function decodePitch(hash: string): PitchModel | null {
  try {
    const raw = JSON.parse(b64d(hash.replace(/^#/, "")));
    if (raw?.v !== 2 || typeof raw.m !== "object" || !raw.m) return null;
    const m = raw.m as Record<string, unknown>;
    const mvp = (m.mvp ?? {}) as Record<string, unknown>;
    const proj = (m.project ?? {}) as Record<string, unknown>;
    return {
      title: str(m.title, 60),
      tagline: str(m.tagline, 110),
      highConcept: str(m.highConcept, 300),
      platforms: strs(m.platforms, 6, 20),
      genres: strs(m.genres, 2, 40),
      mechanics: cardLines(m.mechanics),
      loops: (Array.isArray(m.loops) ? m.loops.slice(0, 6) : [])
        .map((l: Record<string, unknown>) => ({
          name: str(l?.name, 30),
          steps: strs(l?.steps, 20, 30),
        }))
        .filter((l) => l.steps.length),
      activeLoop: typeof m.activeLoop === "number" ? Math.max(0, Math.min(5, m.activeLoop | 0)) : 0,
      objective: str(m.objective, 200),
      hook: str(m.hook, 300),
      twists: cardLines(m.twists),
      mood: cardLines(m.mood),
      setting: cardLines(m.setting),
      visual: cardLines(m.visual),
      perspective: cardLines(m.perspective ?? []),
      audio: cardLines(m.audio),
      scope: (Array.isArray(m.scope) ? m.scope.slice(0, 8) : [])
        .map((s: Record<string, unknown>) => ({
          label: str(s?.label, 30),
          points: Math.max(0, Math.min(10, Number(s?.points) | 0)),
        }))
        .filter((s) => s.label && s.points),
      mvp: {
        must: strs(mvp.must, 20, 80),
        nice: strs(mvp.nice, 20, 80),
        cut: strs(mvp.cut, 20, 80),
      },
      assets: (Array.isArray(m.assets) ? m.assets.slice(0, 5) : [])
        .map((a: Record<string, unknown>) => ({
          label: str(a?.label, 20),
          count: Math.max(0, Math.min(999, Number(a?.count) | 0)),
          note: str(a?.note, 80),
        }))
        .filter((a) => a.label && (a.count || a.note)),
      assetNotes: str(m.assetNotes, 600),
      project: {
        name: str(proj.name, 60),
        jamTheme: str(proj.jamTheme, 80),
        duration: str(proj.duration, 30),
        teamSize: str(proj.teamSize, 20),
        restrictions: str(proj.restrictions, 400),
      },
      status: m.status === "pitched" ? "pitched" : "draft",
      date: str(m.date, 10),
    };
  } catch {
    return null;
  }
}

export const pitchUrl = (m: PitchModel) => `${window.location.origin}/s#${encodePitch(m)}`;
