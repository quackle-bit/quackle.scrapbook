"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { feel } from "@/feel";
import { drawPack, type CardData, type SlotId } from "@/lib/deck";
import { haptic, OVERSHOOT, play } from "@/lib/motion";
import { createRng, freshSeed } from "@/lib/rng";
import { sfx } from "@/lib/sound";
import { sayRandom } from "./Duck";
import { HandCard, type TrashHow } from "./HandCard";

type Props = {
  coins: number;
  spend: () => boolean;
  onStamp: (card: CardData, slot: SlotId) => boolean;
  onTrash: (card: CardData, how: TrashHow) => void;
  onDragSlot: (slot: SlotId | null) => void;
};

export function PackStation({ coins, spend, onStamp, onTrash, onDragSlot }: Props) {
  const [phase, setPhase] = useState<"shop" | "pack" | "fan">("shop");
  const [hand, setHand] = useState<CardData[]>([]);
  const [left, setLeft] = useState<Set<string>>(new Set());
  const [flipSignal, setFlipSignal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [tear, setTear] = useState(0);
  const packRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const coinRef = useRef<HTMLSpanElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const tearDrag = useRef<{ x0: number; w: number; lastStep: number } | null>(null);
  const [seed, setSeed] = useState("");

  async function buy() {
    if (!spend()) return;
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
    setTear(0);
    setPhase("pack");
  }

  // Slide the pack in once it mounts.
  useEffect(() => {
    if (phase !== "pack") return;
    sfx.slide();
    void play(
      packRef.current,
      [
        { transform: "translateX(120vw) rotate(8deg)" },
        { transform: "translateX(0) rotate(-2deg)" },
      ],
      feel.packSlide,
      { easing: OVERSHOOT },
    );
  }, [phase]);

  async function openPack() {
    if (phase !== "pack") return;
    tearDrag.current = null;
    sfx.tearOff();
    haptic(feel.haptic.tear);
    setTear(1);
    sayRandom("open");
    await play(
      flapRef.current,
      [{ transform: "none" }, { transform: "translate(80px,-160px) rotate(35deg)", opacity: 0 }],
      feel.tearFlyOff,
      { fill: "forwards" },
    );
    const cards = drawPack(createRng(seed));
    setHand(cards);
    setLeft(new Set(cards.map((c) => c.id)));
    setPhase("fan");
  }

  // Fan in when the hand appears.
  useEffect(() => {
    if (phase !== "fan" || !fanRef.current) return;
    sfx.riffle();
    Array.from(fanRef.current.children).forEach((el, i) =>
      play(
        el,
        [
          { transform: "translateY(-120px) scale(.5)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        feel.fanIn,
        { delay: i * feel.fanStagger, easing: OVERSHOOT, fill: "backwards" },
      ),
    );
  }, [phase]);

  function onTearDown(e: PointerEvent<HTMLDivElement>) {
    if (phase !== "pack") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    tearDrag.current = { x0: e.clientX, w: r.width, lastStep: 0 };
  }
  function onTearMove(e: PointerEvent<HTMLDivElement>) {
    const t = tearDrag.current;
    if (!t) return;
    const p = Math.min(1, Math.abs(e.clientX - t.x0) / t.w);
    setTear(p);
    const step = Math.floor(p * 12);
    if (step > t.lastStep) {
      t.lastStep = step;
      sfx.rip(1 + p);
      if (step % 3 === 0) haptic(6);
    }
    if (p >= feel.tearThreshold) void openPack();
  }
  function onTearUp() {
    if (!tearDrag.current) return;
    tearDrag.current = null;
    setTear(0);
  }

  function resolve(id: string) {
    setLeft((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (next.size === 0) setTimeout(() => setPhase("shop"), 250);
      return next;
    });
  }

  const n = hand.length;
  const faceDown = hand.filter((c) => left.has(c.id)).length;

  return (
    <section className="station" aria-label="Pack stall">
      {phase === "shop" && (
        <div className="shop">
          <div className="stall-sign">THE WORD MERCHANT</div>
          <p className="keeper">“Fresh words! One coin a pack!”</p>
          <div className="pack-shelf" aria-hidden>
            <div className="pack mini" />
            <div className="pack mini" />
            <div className="pack mini" />
          </div>
          <button
            type="button"
            className="big-btn"
            onClick={() => void buy()}
            disabled={coins <= 0}
          >
            <span ref={coinRef} className="coin" aria-hidden>
              ¢
            </span>
            Buy a pack · 1 coin
          </button>
        </div>
      )}

      {phase === "pack" && (
        <div className="pack-stage">
          <div ref={packRef} className="pack" style={{ ["--tear" as string]: tear }}>
            <div
              ref={flapRef}
              className="pack-flap"
              onPointerDown={onTearDown}
              onPointerMove={onTearMove}
              onPointerUp={onTearUp}
              onPointerCancel={onTearUp}
            >
              <div className="tear-line" />
              <span className="tear-hint">drag across to tear →</span>
            </div>
            <div className="pack-body">
              <div className="pack-label">SCRAP PACK</div>
              <div className="pack-sub">5 ideas inside</div>
            </div>
          </div>
          <button type="button" className="link-btn" onClick={() => void openPack()}>
            or tap to open
          </button>
        </div>
      )}

      {phase === "fan" && (
        <>
          <div
            ref={fanRef}
            className="fan"
            onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
          >
            {hand.map((c, i) => {
              const k = i - (n - 1) / 2;
              return (
                <HandCard
                  key={c.id}
                  card={c}
                  tilt={k * feel.fanSpreadDeg}
                  lift={Math.abs(k) * Math.abs(k) * 6}
                  flipSignal={flipSignal}
                  flipDelay={i * 110}
                  selected={selected === c.id}
                  onSelect={setSelected}
                  onStamp={(card, slot) => {
                    const ok = onStamp(card, slot);
                    if (ok) resolve(card.id);
                    return ok;
                  }}
                  onTrash={(card, how) => {
                    onTrash(card, how);
                    resolve(card.id);
                  }}
                  onDragSlot={onDragSlot}
                  style={{ zIndex: selected === c.id ? 20 : i }}
                />
              );
            })}
          </div>
          <div className="fan-tools">
            {faceDown > 0 && (
              <button
                type="button"
                className="link-btn"
                onClick={() => setFlipSignal((s) => s + 1)}
              >
                Flip all
              </button>
            )}
            <span className="hint">
              drag to a slot · hold to crumple · swipe down to rip · fling away
            </span>
          </div>
        </>
      )}
    </section>
  );
}
