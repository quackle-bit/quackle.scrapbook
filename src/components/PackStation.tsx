"use client";

import { useRef, useState } from "react";
import { feel } from "@/feel";
import { drawPack, type CardData, type Pull, type SlotId } from "@/lib/deck";
import { play } from "@/lib/motion";
import { createRng, freshSeed } from "@/lib/rng";
import { sfx } from "@/lib/sound";
import { streetCard, type TrashHow } from "./HandCard";
import { PackOpen } from "./feel/PackOpen";

type Props = {
  coins: number;
  spend: () => boolean;
  onStamp: (card: CardData, slot: SlotId) => boolean;
  onTrash: (card: CardData, how: TrashHow) => void;
  onDragSlot: (slot: SlotId | null) => void;
  /** Route mode: the shell draws the sign and keeper line. */
  bare?: boolean;
  /** Custom contents (defaults to the mixed prototype pack). */
  draw?: (seed: string, pull: Pull) => CardData[];
  /** Offer a Fresh (related) and a Wild pack instead of one. */
  pulls?: boolean;
  /** The first pack at this stall is free. */
  firstFree?: boolean;
  packLabel?: string;
  onPulled?: (cards: CardData[]) => void;
};

export function PackStation({
  coins,
  spend,
  onStamp,
  onTrash,
  onDragSlot,
  bare,
  draw,
  pulls,
  firstFree,
  packLabel = "SCRAP PACK",
  onPulled,
}: Props) {
  const [bought, setBought] = useState(0);
  const [pull, setPull] = useState<Pull>("wild");
  const [phase, setPhase] = useState<"shop" | "pack">("shop");
  const coinRef = useRef<HTMLSpanElement>(null);
  const [seed, setSeed] = useState("");

  const free = firstFree && bought === 0;
  async function buy(p: Pull = "wild") {
    if (!free && !spend()) return;
    setBought((b) => b + 1);
    setPull(p);
    const s = freshSeed();
    setSeed(s);
    sfx.clink();
    await play(
      coinRef.current,
      [
        { transform: "translateY(0) rotateY(0)", opacity: 1 },
        { transform: "translateY(-40px) rotateY(540deg)", opacity: 1, offset: 0.6 },
        { transform: "translateY(10px) rotateY(720deg)", opacity: 0 },
      ],
      feel.coinFlip,
    );
    setPhase("pack");
  }

  return (
    <section className="station" aria-label="Pack stall">
      {phase === "shop" && (
        <div className="shop">
          {!bare && (
            <>
              <div className="stall-sign">THE WORD MERCHANT</div>
              <p className="keeper">“Fresh words! One coin a pack!”</p>
            </>
          )}
          <div className="pack-shelf" aria-hidden>
            <div className="pack mini" />
            <div className="pack mini" />
            <div className="pack mini" />
          </div>
          {pulls && !free ? (
            <div className="row">
              <button
                type="button"
                className="big-btn"
                onClick={() => void buy("fresh")}
                disabled={coins <= 0}
                title="Cards related to what you've stamped"
              >
                <span ref={coinRef} className="coin" aria-hidden>
                  ¢
                </span>
                Fresh pack
              </button>
              <button
                type="button"
                className="big-btn"
                onClick={() => void buy("wild")}
                disabled={coins <= 0}
                title="Anything goes"
              >
                Wild pack
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="big-btn"
              onClick={() => void buy()}
              disabled={!free && coins <= 0}
            >
              <span ref={coinRef} className="coin" aria-hidden>
                ¢
              </span>
              {free ? "Take a free pack" : "Buy a pack · 1 coin"}
            </button>
          )}
          {pulls && !free && (
            <span className="hint">fresh = related to your stamps · wild = anything</span>
          )}
        </div>
      )}

      {phase === "pack" && (
        <PackOpen<CardData>
          key={seed}
          label={packLabel}
          draw={() => {
            const cards = draw ? draw(seed, pull) : drawPack(createRng(seed));
            onPulled?.(cards);
            return cards;
          }}
          onDone={() => setPhase("shop")}
          card={streetCard(onStamp, onTrash, onDragSlot)}
        />
      )}
    </section>
  );
}
