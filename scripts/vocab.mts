/**
 * Vocabulary tooling. Runs on Node's built-in TypeScript support (no extra deps).
 *
 *   npm run vocab:lint            check every bank in data/vocab
 *   npm run vocab:sample [seed]   print one sample card per slot (reproducible with a seed)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_TAGS, RARITIES, type BankFile, type VocabEntry } from "../src/lib/vocab.ts";
import { createRng } from "../src/lib/rng.ts";

const DIR = join(import.meta.dirname, "..", "data", "vocab");
/** Draw weight per rarity (Visitor mode never draws mythic; see CLAUDE.md §6.1). */
const RARITY_WEIGHT = { common: 60, uncommon: 25, rare: 12, mythic: 3 } as const;

function loadBanks(): Map<string, BankFile> {
  const banks = new Map<string, BankFile>();
  for (const file of readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    banks.set(file, JSON.parse(readFileSync(join(DIR, file), "utf8")) as BankFile);
  }
  return banks;
}

function lint(): number {
  const banks = loadBanks();
  const errors: string[] = [];
  const seenInSlot = new Map<string, string>();
  console.log("bank".padEnd(26), "size".padStart(5), "target".padStart(7), " progress");

  for (const [file, bank] of banks) {
    if (!bank.slot || !Array.isArray(bank.entries)) {
      errors.push(`${file}: missing slot or entries`);
      continue;
    }
    bank.entries.forEach((e: VocabEntry, i) => {
      const where = `${file}#${i} "${e.word}"`;
      if (!e.word?.trim()) errors.push(`${where}: empty word`);
      if (!RARITIES.includes(e.rarity)) errors.push(`${where}: bad rarity "${e.rarity}"`);
      if (!Array.isArray(e.tags) || e.tags.length === 0) errors.push(`${where}: no tags`);
      for (const t of e.tags ?? []) {
        if (!ALL_TAGS.includes(t)) errors.push(`${where}: unknown tag "${t}" (add it to TAGS)`);
      }
      if (new Set(e.tags).size !== e.tags?.length) errors.push(`${where}: duplicate tag`);
      if (e.weight !== undefined && !(e.weight > 0)) errors.push(`${where}: weight must be > 0`);
      const key = `${bank.slot}/${bank.part ?? ""}/${e.word.toLowerCase()}`;
      const prev = seenInSlot.get(key);
      if (prev) errors.push(`${where}: duplicate of ${prev}`);
      else seenInSlot.set(key, where);
    });
    const pct = Math.min(100, Math.round((bank.entries.length / bank.target) * 100));
    const bar = "█".repeat(Math.round(pct / 10)).padEnd(10, "·");
    console.log(
      file.replace(".json", "").padEnd(26),
      String(bank.entries.length).padStart(5),
      String(bank.target).padStart(7),
      ` ${bar} ${pct}%`,
    );
  }

  if (errors.length) {
    console.error(`\n${errors.length} problem(s):`);
    for (const e of errors) console.error("  ✗", e);
    return 1;
  }
  console.log("\n✓ all banks valid");
  return 0;
}

function sample(seed: string): number {
  const rng = createRng(seed);
  const banks = [...loadBanks().values()];
  const draw = (bank: BankFile) =>
    rng.pick(bank.entries, (e) => (e.weight ?? 1) * RARITY_WEIGHT[e.rarity]);
  const PART_ORDER = ["place", "era", "inhabitant", "dimension", "treatment", "camera"];
  const bySlot = (slot: string) =>
    banks
      .filter((b) => b.slot === slot)
      .sort((a, b) => PART_ORDER.indexOf(a.part ?? "") - PART_ORDER.indexOf(b.part ?? ""));

  console.log(`seed: ${seed}\n`);
  for (const slot of ["seed", "verb", "world", "mood", "look", "twist", "constraint"]) {
    const group = bySlot(slot);
    // world and look combine one entry from each part; other slots pick one bank then one entry.
    const picks = slot === "world" || slot === "look" ? group.map(draw) : [draw(rng.pick(group))];
    const text = picks.map((p) => p.word).join(" · ");
    const rarity = picks.map((p) => p.rarity[0].toUpperCase()).join("");
    const flavor = picks.length === 1 && picks[0].flavor ? `  "${picks[0].flavor}"` : "";
    console.log(`${slot.toUpperCase().padEnd(11)} [${rarity}] ${text}${flavor}`);
  }
  return 0;
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "lint") process.exit(lint());
if (cmd === "sample") process.exit(sample(arg ?? String(Date.now())));
console.error("usage: vocab.mts lint | sample [seed]");
process.exit(1);
