"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { setPoolRules } from "@/lib/deck";
import type { Mode } from "@/lib/route";
import { STICKERS, store, useStore, VISITOR_MAX_SPREADS } from "@/lib/store";
import { say } from "./Duck";
import { Route, type FinishedSpread } from "./route/Route";

/**
 * Hosts the street for a visitor: today's purse (10 coins, resets at midnight), the visitor
 * card pool (no Mythic), and saving the finished spread into the local book.
 * Jam/Studio streets are local previews until accounts and rooms exist (Phases 3–4).
 */
export function VisitorPlay({ mode }: { mode: Mode }) {
  const { book, wallet, ready } = useStore();
  const [saved, setSaved] = useState<{ ok: boolean; reason?: string } | null>(null);
  const savedRun = useRef<FinishedSpread | null>(null);

  useEffect(() => {
    setPoolRules({ allowMythic: mode === "studio", allowStudioOnly: mode === "studio" });
  }, [mode]);

  if (!ready) return <div className="proto" aria-busy="true" />;

  const full = book.spreads.length >= VISITOR_MAX_SPREADS;

  function onFinish(run: FinishedSpread) {
    if (savedRun.current === run) return;
    savedRun.current = run;
    const res = store.saveSpread(
      {
        mode: run.gate.mode,
        slots: run.slots,
        cards: run.cards,
        concept: run.concept,
        notes: run.notes,
      },
      run.discard,
      { title: run.gate.title, color: run.gate.color, antiGoal: run.gate.antiGoal },
    );
    setSaved(res);
    if (res.ok) {
      const st = res.newStickers.map((s) => STICKERS[s]?.label).filter(Boolean);
      setTimeout(
        () =>
          say(st.length ? `Saved! New sticker: ${st.join(", ")}` : "Saved to your book!", {
            tag: "jump",
            ms: 300,
            then: { tag: "land", ms: 120 },
          }),
        800,
      );
    } else setTimeout(() => say(res.reason ?? "Couldn't save.", { tag: "stunned", ms: 900 }), 800);
  }

  return (
    <>
      {mode !== "visitor" && (
        <div className="preview-banner" role="note">
          {mode === "studio" ? "Studio" : "Jam"} street preview: runs locally. Accounts and rooms
          come later.
        </div>
      )}
      <Route
        key={mode}
        modes={[mode]}
        initialGate={{ title: book.title, color: book.color, antiGoal: book.antiGoal, mode }}
        coins={mode === "visitor" ? wallet.coins : undefined}
        onSpendCoin={mode === "visitor" ? store.spendCoin : undefined}
        onFinish={onFinish}
        finishActions={(_run, restart) => (
          <>
            <Link className="big-btn" href="/book">
              Open my book →
            </Link>
            {!full && (
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setSaved(null);
                  restart();
                }}
              >
                walk again
              </button>
            )}
            {saved && !saved.ok && <span className="hint">{saved.reason}</span>}
          </>
        )}
      />
    </>
  );
}

/** Reads ?mode= on the client (inside Suspense) so /play can be prerendered. */
export function PlayFromQuery() {
  const m = useSearchParams().get("mode");
  return <VisitorPlay mode={m === "jam" || m === "studio" ? m : "visitor"} />;
}
