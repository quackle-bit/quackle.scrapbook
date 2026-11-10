"use client";

import { useSettings } from "@/lib/settings";
import { scrapbookStore } from "@/lib/scrapbook/store";
import type { Duration, TeamSize } from "@/lib/scrapbook/types";
import { Chips } from "../../ui/Chips";
import { TextField } from "../../ui/TextField";
import { PageFrame } from "./PageFrame";
import type { PageCtx } from "./registry";

const PLATFORMS = ["PC", "Web", "Mobile", "Console", "Other"].map((v) => ({ value: v, label: v }));
const DURATIONS: { value: Duration; label: string }[] = [
  { value: "24h", label: "24 hours" },
  { value: "48h", label: "48 hours" },
  { value: "72h", label: "72 hours" },
  { value: "1w", label: "1 week" },
  { value: "custom", label: "Custom" },
];
const TEAMS: { value: TeamSize; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "2-3", label: "2–3" },
  { value: "4-5", label: "4–5" },
  { value: "6+", label: "6+" },
];

/** Plain controls on purpose: this page is information, not a game. Everything is editable later. */
export function SetupPage({ book, page }: PageCtx) {
  const { showExtras: extras } = useSettings();
  const set = (patch: Parameters<typeof scrapbookStore.updateScrapbook>[1]) =>
    scrapbookStore.updateScrapbook(book.id, patch);
  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      {extras && (
        <TextField
          label="Project name"
          value={book.name}
          onChange={(name) => set({ name })}
          placeholder="e.g. Rainy Day Jam entry"
          maxLength={60}
        />
      )}
      <TextField
        label="Game jam theme"
        value={book.jamTheme}
        onChange={(jamTheme) => set({ jamTheme })}
        placeholder="The official theme, if there is one"
        maxLength={80}
      />
      <div className="dk-field">
        <span>Target platform</span>
        <Chips
          label="Target platform"
          multi
          options={PLATFORMS}
          value={book.platforms}
          onChange={(v) => set({ platforms: v as string[] })}
        />
      </div>
      <div className="dk-field">
        <span>Development duration</span>
        <Chips
          label="Development duration"
          options={DURATIONS}
          value={book.duration}
          onChange={(v) => set({ duration: v as Duration })}
        />
        {book.duration === "custom" && (
          <TextField
            value={book.customDuration}
            onChange={(customDuration) => set({ customDuration })}
            placeholder="e.g. 10 days"
            maxLength={30}
          />
        )}
      </div>
      <div className="dk-field">
        <span>Team size</span>
        <Chips
          label="Team size"
          options={TEAMS}
          value={book.teamSize}
          onChange={(v) => set({ teamSize: v as TeamSize })}
        />
      </div>
      {extras && (
        <TextField
          label="Restrictions"
          value={book.restrictions}
          onChange={(restrictions) => set({ restrictions })}
          placeholder="No external assets. Must support controllers. No multiplayer…"
          multiline
          maxLength={400}
        />
      )}
    </PageFrame>
  );
}
