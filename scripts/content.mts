/**
 * Lints the inspiration content in data/inspiration (the cards behind every pack).
 *   npm run content:lint
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(import.meta.dirname, "..", "data", "inspiration");
const CARD_FILES: Record<string, { type: string; prefix: string; min: number }> = {
  "genres.json": { type: "genre", prefix: "genre", min: 60 },
  "mechanics.json": { type: "mechanic", prefix: "mech", min: 200 },
  "objectives.json": { type: "objective", prefix: "obj", min: 80 },
  "twists.json": { type: "twist", prefix: "twist", min: 180 },
  "moods.json": { type: "mood", prefix: "mood", min: 100 },
  "settings.json": { type: "setting", prefix: "set", min: 150 },
  "visual-directions.json": { type: "visual", prefix: "vis", min: 80 },
  "perspectives.json": { type: "perspective", prefix: "per", min: 30 },
  "audio-directions.json": { type: "audio", prefix: "aud", min: 80 },
  "word-packs.json": { type: "word", prefix: "word", min: 150 },
};
const LIST_FILES: Record<string, string> = {
  "taglines.json": "templates",
  "sentence-starters.json": "starters",
  "loop-verbs.json": "verbs",
  "players.json": "roles",
};

const errors: string[] = [];
const ids = new Map<string, string>();
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));

console.log("file".padEnd(26), "cards");
for (const [file, spec] of Object.entries(CARD_FILES)) {
  if (!files.includes(file)) {
    errors.push(`${file}: missing`);
    continue;
  }
  const data = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  if (data.type !== spec.type) errors.push(`${file}: type should be "${spec.type}"`);
  const cards = Array.isArray(data.cards) ? data.cards : [];
  if (cards.length < spec.min)
    errors.push(`${file}: only ${cards.length} cards (want ${spec.min}+)`);
  const titles = new Set<string>();
  cards.forEach((c: Record<string, unknown>, i: number) => {
    const where = `${file}#${i} "${String(c.title)}"`;
    if (typeof c.id !== "string" || !c.id.startsWith(`${spec.prefix}-`))
      errors.push(`${where}: id must start with "${spec.prefix}-"`);
    else if (ids.has(c.id)) errors.push(`${where}: duplicate id (also in ${ids.get(c.id)})`);
    else ids.set(c.id, file);
    if (typeof c.title !== "string" || !c.title.trim()) errors.push(`${where}: empty title`);
    else {
      if (c.title.length > 60) errors.push(`${where}: title over 60 characters`);
      if (titles.has(c.title.toLowerCase())) errors.push(`${where}: duplicate title`);
      titles.add(c.title.toLowerCase());
    }
    if (spec.type !== "word" && (typeof c.description !== "string" || !c.description.trim()))
      errors.push(`${where}: missing description`);
    if (typeof c.description === "string" && c.description.length > 140)
      errors.push(`${where}: description over 140 characters`);
  });
  console.log(file.replace(".json", "").padEnd(26), String(cards.length).padStart(4));
}
for (const [file, key] of Object.entries(LIST_FILES)) {
  if (!files.includes(file)) {
    errors.push(`${file}: missing`);
    continue;
  }
  const list = JSON.parse(readFileSync(join(DIR, file), "utf8"))[key];
  if (
    !Array.isArray(list) ||
    list.length === 0 ||
    list.some((x: unknown) => typeof x !== "string" || !x.trim())
  )
    errors.push(`${file}: "${key}" must be a list of non-empty strings`);
  else console.log(file.replace(".json", "").padEnd(26), String(list.length).padStart(4));
}

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error("  ✗", e);
  process.exit(1);
}
console.log("\n✓ all inspiration content valid");
