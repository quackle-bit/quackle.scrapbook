"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { setPoolRules } from "@/lib/deck";
import { estimateLedger } from "@/lib/ledger";
import { activeBook, loadBackRoom, useStudioAccess } from "@/lib/studio/useStudio";
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
  const studio = useStudioAccess();
  const studioRepo = mode === "studio" && studio.state === "ready" ? studio.repo : null;

  useEffect(() => {
    if (studioRepo) void loadBackRoom(studioRepo);
  }, [studioRepo]);

  useEffect(() => {
    setPoolRules({ allowMythic: mode === "studio", allowStudioOnly: mode === "studio" });
  }, [mode]);

  if (!ready) return <div className="proto" aria-busy="true" />;

  const full = book.spreads.length >= VISITOR_MAX_SPREADS;

  function onFinish(run: FinishedSpread) {
    if (savedRun.current === run) return;
    savedRun.current = run;
    if (studioRepo) {
      void (async () => {
        try {
          const books = await studioRepo.listBooks();
          const target = books.find((b) => b.id === activeBook.get()) ?? books[0];
          const id = await studioRepo.addSpread(target.id, {
            slots: run.slots,
            cards: run.cards,
            concept: run.concept,
            notes: run.notes,
            pitch: run.pitch,
          });
          await studioRepo.updateSpread(id, { ledger: estimateLedger(run.cards) });
          setSaved({ ok: true });
          say(`Filed in “${target.title}”.`, {
            tag: "jump",
            ms: 300,
            then: { tag: "land", ms: 120 },
          });
        } catch (e) {
          setSaved({
            ok: false,
            reason: e instanceof Error ? e.message : "Couldn't save to the library.",
          });
        }
      })();
      return;
    }
    const res = store.saveSpread(
      {
        mode: run.gate.mode,
        slots: run.slots,
        cards: run.cards,
        concept: run.concept,
        notes: run.notes,
        pitch: run.pitch,
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
          {mode === "studio"
            ? studioRepo?.kind === "supabase"
              ? "Studio street · saving to the shared library"
              : "Studio street · local preview (sign-in not configured)"
            : "Jam street preview · open a jam room at /jam"}
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
            <Link className="big-btn" href={mode === "studio" ? "/studio" : "/book"}>
              {mode === "studio" ? "Open the library →" : "Open my book →"}
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
