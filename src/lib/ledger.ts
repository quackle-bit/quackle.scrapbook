/**
 * The Ledger (CLAUDE.md §6.3): a rough asset-scope estimate for a spread, read from its cards.
 * sprites × directions × frames, tiles, props and UI → hours and a tier, plus a milestone sketch.
 * Heuristics only: it's a conversation starter for pre-production, not a quote.
 */
import type { CardData, SlotId } from "./deck";

export type LedgerLine = { item: string; count: number; hoursEach: number; note?: string };
export type Ledger = {
  lines: LedgerLine[];
  hours: number;
  tier: "Jam (48h)" | "Small" | "Medium" | "Large";
  risks: string[];
  milestones: string[];
};

const has = (text: string | undefined, ...words: string[]) =>
  !!text && words.some((w) => text.toLowerCase().includes(w));

export function estimateLedger(cards: Partial<Record<SlotId, CardData>>): Ledger {
  const look = cards.look?.text;
  const world = cards.world?.text;
  const verb = cards.verb?.text;
  const rule = cards.constraint?.text;
  const lines: LedgerLine[] = [];
  const risks: string[] = [];

  // Camera decides how many directions each character needs.
  const directions = has(look, "side")
    ? 1
    : has(look, "isometric", "three-quarter", "top-down")
      ? 4
      : has(look, "first-person")
        ? 0
        : has(look, "orbit", "third-person")
          ? 8
          : 4;
  const threeD = has(look, "full 3d", "voxels", "low-poly", "3d baked", "3d world");
  const tiny = has(rule, "16x16", "one screen", "four colours", "one level");
  const scale = tiny ? 0.5 : 1;

  const characters = has(
    world,
    "ducks",
    "knights",
    "robots",
    "folk",
    "crows",
    "frogs",
    "moths",
    "ghosts",
    "librarians",
  )
    ? 4
    : 3;
  const anims = has(verb, "stack", "sort", "match", "tile", "deck", "card", "one-button") ? 3 : 5;
  const frames = 6;

  if (directions > 0) {
    lines.push({
      item: "Character sprites",
      count: Math.round(characters * Math.max(1, directions) * anims * frames * scale),
      hoursEach: threeD ? 0.15 : 0.35,
      note: `${characters} characters × ${directions} dir × ${anims} anims × ${frames} frames`,
    });
  } else {
    lines.push({
      item: "First-person hands / viewmodels",
      count: Math.round(anims * frames),
      hoursEach: 0.5,
    });
  }
  if (threeD) {
    lines.push({
      item: "Low-poly / voxel models",
      count: Math.round(25 * scale),
      hoursEach: 3,
      note: "props + set pieces",
    });
    risks.push("3D pipeline: shaders, rigging and the pixel look need an early tech test.");
  }
  lines.push({
    item: "Tiles",
    count: Math.round(
      (has(world, "library", "market", "park", "town", "suburb") ? 120 : 80) * scale,
    ),
    hoursEach: 0.4,
  });
  lines.push({ item: "Props", count: Math.round(40 * scale), hoursEach: 0.6 });
  lines.push({
    item: "UI screens + icons",
    count: Math.round((has(verb, "inventory", "deck", "resource", "programming") ? 14 : 8) * scale),
    hoursEach: 2.5,
  });
  lines.push({ item: "FX (particles, flashes)", count: Math.round(15 * scale), hoursEach: 0.8 });
  if (has(look, "shader", "dither", "render target", "pixel ui/fx")) {
    lines.push({ item: "Pixel shader / render target", count: 1, hoursEach: 24 });
    risks.push(
      "Shader-driven pixel look: decide resolution and palette rules before art production.",
    );
  }
  if (has(verb, "time loop", "rewind", "body swapping", "asymmetric"))
    risks.push(`"${verb}" is a systems-heavy core verb: prototype it before any content.`);
  if (has(cards.twist?.text, "reverse", "ten minutes", "rearranges"))
    risks.push("The twist changes level structure: design tools may be needed.");
  if (has(rule, "two people", "eyes closed", "no ui", "no text"))
    risks.push(`The rule "${rule}" needs playtesting from day one.`);

  const hours = Math.round(lines.reduce((sum, l) => sum + l.count * l.hoursEach, 0));
  const tier: Ledger["tier"] =
    hours <= 60 ? "Jam (48h)" : hours <= 250 ? "Small" : hours <= 700 ? "Medium" : "Large";
  const milestones = [
    `Week 1: grey-box the core verb (${verb ?? "?"}) — is it fun 100 times?`,
    `Week 2: one ${world?.split(" · ")[0] ?? "level"} slice in the final look (${look?.split(" · ")[1] ?? "pixel treatment"}).`,
    cards.twist
      ? `Week 3: prototype the twist — ${cards.twist.text}`
      : "Week 3: add the first twist.",
    "Then: content production against this ledger, cut list ready.",
  ];
  return { lines, hours, tier, risks, milestones };
}

/** Jam cut list (§6.2): what to cut first for 48 hours. */
export function cutList(cards: Partial<Record<SlotId, CardData>>): string[] {
  const out: string[] = [];
  const l = estimateLedger(cards);
  if (l.lines.some((x) => x.item.includes("Low-poly")))
    out.push("Go 2D: drop the 3D models, fake depth with layers.");
  if (l.lines.some((x) => x.item.includes("shader")))
    out.push("Skip the shader: draw native sprites at final resolution.");
  out.push("One character, one direction set, 3 animations.");
  out.push("One level, hand-built. No menus beyond Start.");
  if (cards.twist) out.push(`Keep the twist small: "${cards.twist.text}" in a single moment.`);
  out.push("Sound: 5 effects, one loop.");
  return out.slice(0, 6);
}
