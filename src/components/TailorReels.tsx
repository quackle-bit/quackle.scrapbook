"use client";

import { useEffect, useRef, useState } from "react";
import { feel } from "@/feel";
import { draw, LOOK_REELS, lookCard, type CardData, type SlotId } from "@/lib/deck";
import { OVERSHOOT, play } from "@/lib/motion";
import { createRng, freshSeed } from "@/lib/rng";
import { useSettings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { say } from "./Duck";
import { HandCard, type TrashHow } from "./HandCard";

type Props = {
  coins: number;
  spend: () => boolean;
  onStamp: (card: CardData, slot: SlotId) => boolean;
  onTrash: (card: CardData, how: TrashHow) => void;
  onDragSlot: (slot: SlotId | null) => void;
  bare?: boolean;
};

const N = LOOK_REELS.length;

/** The Tailor: three reels (dimension · pixel treatment · camera). Tap to stop, lock, respin. */
export function TailorReels({ coins, spend, onStamp, onTrash, onDragSlot, bare }: Props) {
  const { speed } = useSettings();
  const [shown, setShown] = useState<number[]>(() => Array(N).fill(0));
  const [spinning, setSpinning] = useState<boolean[]>(() => Array(N).fill(false));
  const [locked, setLocked] = useState<boolean[]>(() => Array(N).fill(false));
  const [started, setStarted] = useState(false);
  const [respins, setRespins] = useState<number>(feel.respins);
  const [result, setResult] = useState<CardData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const rng = useRef(createRng("tailor"));
  const reelRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const anySpinning = spinning.some(Boolean);
  const allStopped = started && !anySpinning;

  useEffect(() => {
    if (!anySpinning) return;
    const t = setInterval(() => {
      setShown((prev) =>
        prev.map((v, i) => (spinning[i] ? (v + 1) % LOOK_REELS[i].entries.length : v)),
      );
    }, feel.reelTick);
    return () => clearInterval(t);
  }, [anySpinning, spinning]);

  function spin(which: boolean[]) {
    setSpinning(which);
    sfx.whoosh();
    // Speed mode: reels stop at once.
    if (speed) which.forEach((w, i) => w && stop(i));
  }

  function start() {
    if (!spend()) return;
    rng.current = createRng(freshSeed());
    setStarted(true);
    setRespins(feel.respins);
    setLocked(Array(N).fill(false));
    setResult(null);
    spin(Array(N).fill(true));
  }

  function stop(i: number) {
    const entries = LOOK_REELS[i].entries;
    const pick = draw(rng.current, entries);
    setShown((prev) => prev.map((v, j) => (j === i ? entries.indexOf(pick) : v)));
    setSpinning((prev) => prev.map((v, j) => (j === i ? false : v)));
    sfx.tick();
    void play(
      reelRefs.current[i],
      [{ transform: "translateY(-8px)" }, { transform: "none" }],
      220,
      { easing: OVERSHOOT },
    );
  }

  function respin() {
    if (respins <= 0) return;
    const which = locked.map((l) => !l);
    if (!which.some(Boolean)) return say("Unlock a reel to respin it.");
    setRespins((r) => r - 1);
    spin(which);
  }

  function keep() {
    const picks = LOOK_REELS.map((r, i) => r.entries[shown[i]]);
    setResult(lookCard(rng.current, picks));
    sfx.sparkle();
  }

  function reset() {
    setStarted(false);
    setResult(null);
    setSpinning(Array(N).fill(false));
  }

  return (
    <section className="station" aria-label="The Tailor">
      {!bare && (
        <>
          <div className="stall-sign tailor">THE TAILOR</div>
          <p className="keeper">“Let&apos;s dress your game in pixels.”</p>
        </>
      )}

      {!result && (
        <>
          <div className="reels">
            {LOOK_REELS.map((r, i) => (
              <div key={r.label} className="reel-col">
                <span className="reel-label">{r.label}</span>
                <button
                  ref={(el) => {
                    reelRefs.current[i] = el;
                  }}
                  type="button"
                  className={`reel${spinning[i] ? " spinning" : ""}${locked[i] ? " locked" : ""}`}
                  onClick={() => spinning[i] && stop(i)}
                  disabled={!spinning[i]}
                  aria-label={
                    spinning[i] ? `Stop ${r.label} reel` : `${r.label}: ${r.entries[shown[i]].word}`
                  }
                >
                  {started ? r.entries[shown[i]].word : "?"}
                </button>
                <button
                  type="button"
                  className={`lock${locked[i] ? " on" : ""}`}
                  disabled={!allStopped}
                  onClick={() => setLocked((p) => p.map((v, j) => (j === i ? !v : v)))}
                  aria-pressed={locked[i]}
                >
                  {locked[i] ? "🔒 locked" : "lock"}
                </button>
              </div>
            ))}
          </div>
          <div className="row">
            {!started && (
              <button type="button" className="big-btn" onClick={start} disabled={coins <= 0}>
                Spin · 1 coin
              </button>
            )}
            {anySpinning && <span className="hint">tap each reel to stop it</span>}
            {allStopped && (
              <>
                <button type="button" className="big-btn" onClick={keep}>
                  Keep this look
                </button>
                <button type="button" className="link-btn" onClick={respin} disabled={respins <= 0}>
                  Respin unlocked ({respins} left)
                </button>
              </>
            )}
          </div>
        </>
      )}

      {result && (
        <div className="single-card">
          <HandCard
            key={result.id}
            card={result}
            faceUp
            selected={selected === result.id}
            onSelect={setSelected}
            onStamp={(c, s) => {
              const ok = onStamp(c, s);
              if (ok) reset();
              return ok;
            }}
            onTrash={(c, how) => {
              onTrash(c, how);
              reset();
            }}
            onDragSlot={onDragSlot}
          />
          <span className="hint">drag it to LOOK, or trash it</span>
        </div>
      )}
    </section>
  );
}
