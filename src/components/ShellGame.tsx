"use client";

import { useState } from "react";
import { feel } from "@/feel";
import { drawTwists, type CardData, type SlotId } from "@/lib/deck";
import { wait } from "@/lib/motion";
import { createRng, freshSeed } from "@/lib/rng";
import { sfx } from "@/lib/sound";
import { CardFace } from "./Card";
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

/**
 * The Trickster: a twist hides under each of three cups. Cups shuffle, you pick one,
 * then the others lift too ("…or this") to plant a second idea.
 */
export function ShellGame({ coins, spend, onStamp, onTrash, onDragSlot, bare }: Props) {
  const [twists, setTwists] = useState<CardData[]>([]);
  /** order[cup] = position (0..2) of that cup. */
  const [order, setOrder] = useState([0, 1, 2]);
  const [phase, setPhase] = useState<"idle" | "shuffling" | "pick" | "reveal">("idle");
  const [picked, setPicked] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  async function play() {
    if (!spend()) return;
    const rng = createRng(freshSeed());
    setTwists(drawTwists(rng));
    setPicked(null);
    setPhase("shuffling");
    say("Keep your eye on the cups…");
    let o = [0, 1, 2];
    for (let i = 0; i < feel.shellSwaps; i++) {
      const a = rng.int(3);
      const b = (a + 1 + rng.int(2)) % 3;
      o = o.map((p) => (p === a ? b : p === b ? a : p));
      setOrder(o);
      sfx.slide();
      await wait(feel.shellSwap);
    }
    setPhase("pick");
    say("Pick a cup.");
  }

  async function pick(cup: number) {
    if (phase !== "pick") return;
    setPicked(cup);
    setPhase("reveal");
    sfx.thup();
    if (twists[cup].rarity !== "common") sfx.sparkle();
    await wait(500);
    say("…or this?");
  }

  function done() {
    setPhase("idle");
    setTwists([]);
  }

  const card = picked !== null ? twists[picked] : null;

  return (
    <section className="station" aria-label="The Trickster">
      {!bare && (
        <>
          <div className="stall-sign trickster">THE TRICKSTER</div>
          <p className="keeper">“Want to make it weird?”</p>
        </>
      )}

      <div className="cups" style={{ ["--swap" as string]: `${feel.shellSwap}ms` }}>
        {[0, 1, 2].map((cup) => {
          const lifted = phase === "reveal";
          return (
            <div key={cup} className="cup-spot" style={{ ["--pos" as string]: order[cup] }}>
              {lifted && cup !== picked && twists[cup] && (
                <div className="ghost-card">
                  <CardFace card={twists[cup]} small />
                </div>
              )}
              <button
                type="button"
                className={`cup${lifted ? " lifted" : ""}${cup === picked ? " picked" : ""}`}
                disabled={phase !== "pick"}
                onClick={() => void pick(cup)}
                aria-label={`Cup ${order[cup] + 1}`}
              />
            </div>
          );
        })}
      </div>

      {phase === "idle" && (
        <button type="button" className="big-btn" onClick={() => void play()} disabled={coins <= 0}>
          Play · 1 coin
        </button>
      )}
      {phase === "shuffling" && <span className="hint">shuffling…</span>}
      {phase === "pick" && <span className="hint">tap a cup</span>}

      {phase === "reveal" && card && (
        <div className="single-card">
          <HandCard
            key={card.id}
            card={card}
            faceUp
            selected={selected === card.id}
            onSelect={setSelected}
            onStamp={(c, s) => {
              const ok = onStamp(c, s);
              if (ok) done();
              return ok;
            }}
            onTrash={(c, how) => {
              onTrash(c, how);
              done();
            }}
            onDragSlot={onDragSlot}
          />
          <span className="hint">drag yours to TWIST</span>
        </div>
      )}
    </section>
  );
}
