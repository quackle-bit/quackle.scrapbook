"use client";

import { PUBLIC_URL } from "./site";
import type { Concept, SparkNote } from "@/components/book/SpreadView";
import { SLOT_LABEL, type CardData, type SlotId } from "./deck";
import type { Ledger } from "./ledger";

/** Exports for a spread (CLAUDE.md §6.3): Markdown, JSON and a PNG of the page. */

type ExportSpread = {
  slots: SlotId[];
  cards: Partial<Record<SlotId, CardData>>;
  concept: Concept | null;
  notes: SparkNote[];
  status?: string;
  ledger?: Ledger | null;
};

export function spreadMarkdown(s: ExportSpread, bookTitle: string): string {
  const lines = [
    `# ${s.concept?.title ?? "Untitled idea"}`,
    "",
    s.concept?.logline ? `> ${s.concept.logline}` : "",
    "",
    `*From “${bookTitle}”${s.status ? ` · status: ${s.status}` : ""} · [Quackle Scrapbook](${PUBLIC_URL})*`,
    "",
    "## Cards",
    "",
    "| Slot | Card | Rarity |",
    "| --- | --- | --- |",
    ...s.slots.map((slot) => {
      const c = s.cards[slot];
      return `| ${SLOT_LABEL[slot]} | ${c ? c.text.replace(/\|/g, "/") : "?"} | ${c?.rarity ?? ""} |`;
    }),
  ];
  const notes = s.notes.filter((n) => n.a.trim());
  if (notes.length) lines.push("", "## Notes", "", ...notes.map((n) => `- **${n.q}** ${n.a}`));
  if (s.ledger) {
    lines.push(
      "",
      `## Ledger · ~${s.ledger.hours} h · ${s.ledger.tier}`,
      "",
      "| Item | Count | Hours |",
      "| --- | --- | --- |",
      ...s.ledger.lines.map(
        (l) => `| ${l.item} | ${l.count} | ${Math.round(l.count * l.hoursEach)} |`,
      ),
      "",
      ...s.ledger.milestones.map((m) => `- ${m}`),
    );
    if (s.ledger.risks.length)
      lines.push("", "**Risks**", "", ...s.ledger.risks.map((r) => `- ${r}`));
  }
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n") + "\n";
}

export function download(filename: string, data: string | Blob, type = "text/plain") {
  const blob = typeof data === "string" ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "idea";

export async function spreadPng(node: HTMLElement, filename: string) {
  const { toPng } = await import("html-to-image");
  const url = await toPng(node, { pixelRatio: 2, backgroundColor: "#fbf6ea", cacheBust: true });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
