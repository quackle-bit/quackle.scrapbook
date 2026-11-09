"use client";

import { useEffect, useRef, useState } from "react";
import { feel } from "@/feel";
import { conceptTitle, logline, SLOTS, type CardData, type SlotId } from "@/lib/deck";
import { haptic, OVERSHOOT, play, wait } from "@/lib/motion";
import { createRng } from "@/lib/rng";
import { sfx } from "@/lib/sound";
import { CardFace } from "./Card";
import { FORGE_ACT, say } from "./Duck";

export type Concept = { title: string; logline: string; palette: string[] };

const TAPE: Record<SlotId, string> = {
  seed: "var(--t-seed)",
  verb: "var(--t-verb)",
  look: "var(--t-look)",
  twist: "var(--t-twist)",
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function StampedCard({ card, tilt, onPeel }: { card: CardData; tilt: number; onPeel: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const tape = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Land: snap with overshoot → THUD → tape slaps over the corner → ink stamp fades in.
    void (async () => {
      await play(
        ref.current,
        [
          { transform: `scale(1.35) rotate(${tilt * 3}deg)`, opacity: 0.4 },
          { transform: `scale(.94) rotate(${tilt}deg)`, opacity: 1, offset: 0.7 },
          { transform: `scale(1) rotate(${tilt}deg)`, opacity: 1 },
        ],
        feel.stampSnap,
        { easing: OVERSHOOT },
      );
      sfx.thud();
      haptic(feel.haptic.thud);
      await Promise.all([
        play(
          tape.current,
          [{ transform: "translateY(-14px) rotate(-30deg)", opacity: 0 }, { opacity: 1 }],
          140,
          {
            fill: "backwards",
          },
        ),
        play(
          ink.current,
          [{ opacity: 0, transform: "scale(1.6) rotate(-14deg)" }, { opacity: 0.85 }],
          feel.stampInk,
          {
            delay: 90,
            fill: "backwards",
          },
        ),
      ]);
    })();
  }, [tilt]);
  return (
    <div ref={ref} className="stamped" style={{ transform: `rotate(${tilt}deg)` }}>
      <CardFace card={card} small />
      <div ref={tape} className="tape" style={{ background: TAPE[card.slot] }} />
      <div ref={ink} className="ink">
        KEPT
        <small>{today()}</small>
      </div>
      <button type="button" className="peel" onClick={onPeel} aria-label={`Peel ${card.text} off`}>
        peel
      </button>
    </div>
  );
}

type Props = {
  slots: Partial<Record<SlotId, CardData>>;
  tilts: Partial<Record<SlotId, number>>;
  draggingSlot: SlotId | null;
  concept: Concept | null;
  onPeel: (slot: SlotId) => void;
  onForged: (c: Concept) => void;
  onTitle: (t: string) => void;
  onNewPage: () => void;
};

export function MiniPage({
  slots,
  tilts,
  draggingSlot,
  concept,
  onPeel,
  onForged,
  onTitle,
  onNewPage,
}: Props) {
  const filled = SLOTS.filter((s) => slots[s.id]).length;
  const full = filled === SLOTS.length;
  const [forging, setForging] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const conceptRef = useRef<HTMLDivElement>(null);
  const wasFull = useRef(false);

  useEffect(() => {
    if (full && !wasFull.current && !concept) {
      sfx.fanfare();
      say("Spread complete! Hit FORGE.", { tag: "jump", ms: 300, then: { tag: "land", ms: 120 } });
    }
    wasFull.current = full;
  }, [full, concept]);

  async function forge() {
    if (!full || forging) return;
    setForging(true);
    sfx.forge();
    say("FORGING!", FORGE_ACT);
    haptic(feel.haptic.forge);
    const page = pageRef.current;
    const cards = Array.from(page?.querySelectorAll<HTMLElement>(".slot .stamped") ?? []);
    const target = conceptRef.current;
    const lift = feel.forge * 0.25;
    const fly = feel.forge * 0.55;
    await Promise.all(
      cards.map((el, i) => {
        const a = el.getBoundingClientRect();
        const b = target?.getBoundingClientRect();
        const dx = b ? b.left + b.width / 2 - (a.left + a.width / 2) : 0;
        const dy = b ? b.top + b.height / 2 - (a.top + a.height / 2) : 0;
        return play(
          el,
          [
            { transform: "none", filter: "brightness(1)" },
            {
              transform: "translateY(-14px) scale(1.06)",
              filter: "brightness(1.4)",
              offset: lift / (lift + fly),
            },
            {
              transform: `translate(${dx}px, ${dy}px) rotate(${360 + i * 90}deg) scale(.15)`,
              filter: "brightness(3)",
              opacity: 0.4,
            },
          ],
          lift + fly,
          { easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards", delay: i * 60 },
        );
      }),
    );
    await play(
      flashRef.current,
      [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }],
      feel.forge * 0.2,
      { motion: false },
    );
    const rng = createRng(
      Object.values(slots)
        .map((c) => c?.id)
        .join(""),
    );
    onForged({
      title: conceptTitle(rng, slots),
      logline: logline(slots),
      palette: slots.look?.palette ?? [],
    });
    cards.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    setForging(false);
    await wait(16);
    void play(
      conceptRef.current?.firstElementChild,
      [
        { transform: "scale(.2) rotate(-12deg)", opacity: 0 },
        { transform: "rotate(-2deg)", opacity: 1 },
      ],
      500,
      { easing: OVERSHOOT },
    );
  }

  return (
    <div ref={pageRef} className="spread">
      <div className="page left">
        <div className="page-head">
          <span>Spread 1</span>
          <span className="progress">
            {filled}/{SLOTS.length} stamped
          </span>
        </div>
        <div className="slots">
          {SLOTS.map((s) => {
            const card = slots[s.id];
            const want = draggingSlot === s.id && !card;
            return (
              <div
                key={s.id}
                className={`slot s-${s.id}${card ? " filled" : ""}${want ? " want" : ""}`}
                data-drop="slot"
                data-slot={s.id}
              >
                {card && !concept ? (
                  <StampedCard
                    key={card.id}
                    card={card}
                    tilt={tilts[s.id] ?? 0}
                    onPeel={() => onPeel(s.id)}
                  />
                ) : card && concept ? (
                  <div className="stamped" style={{ transform: `rotate(${tilts[s.id] ?? 0}deg)` }}>
                    <CardFace card={card} small />
                  </div>
                ) : (
                  <span className="slot-label">{s.label}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="page right">
        <div ref={conceptRef} className="concept-area">
          {concept ? (
            <div className="polaroid">
              <div
                className="polaroid-img"
                style={{
                  ["--p0" as string]: concept.palette[0],
                  ["--p1" as string]: concept.palette[1],
                  ["--p2" as string]: concept.palette[2],
                  ["--p3" as string]: concept.palette[3],
                }}
              >
                <span>{concept.title}</span>
              </div>
              <input
                className="polaroid-title"
                value={concept.title}
                onChange={(e) => onTitle(e.target.value)}
                aria-label="Concept title"
              />
              <p className="logline">{concept.logline}</p>
            </div>
          ) : (
            <div className="concept-empty">
              <span>concept</span>
              <small>fill every slot, then forge</small>
            </div>
          )}
        </div>
        {concept ? (
          <button type="button" className="big-btn" onClick={onNewPage}>
            Turn the page →
          </button>
        ) : (
          <button
            type="button"
            className={`big-btn forge${full ? " lit" : ""}`}
            disabled={!full || forging}
            onClick={() => void forge()}
          >
            {forging ? "Forging…" : "FORGE"}
          </button>
        )}
      </div>
      <div ref={flashRef} className="flash" aria-hidden />
    </div>
  );
}
