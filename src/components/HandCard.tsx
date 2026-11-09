"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { feel } from "@/feel";
import type { CardData, SlotId } from "@/lib/deck";
import { haptic, OVERSHOOT, play, wait } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { CardBack, CardFace } from "./Card";
import { say, sayRandom } from "./Duck";

export type TrashHow = "crumple" | "rip" | "fling";

type Props = {
  card: CardData;
  faceUp?: boolean;
  /** Rest pose inside the fan. */
  tilt?: number;
  lift?: number;
  /** Increment to flip this card (used by "Flip all"); `flipDelay` staggers it. */
  flipSignal?: number;
  flipDelay?: number;
  selected?: boolean;
  onSelect?: (id: string | null) => void;
  onFlipped?: (card: CardData) => void;
  /** Return false if the card can't go there (slot full or wrong type). */
  onStamp: (card: CardData, slot: SlotId) => boolean;
  onTrash: (card: CardData, how: TrashHow) => void;
  onDragSlot?: (slot: SlotId | null) => void;
  style?: CSSProperties;
};

type Drag = {
  id: number;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  moved: boolean;
  samples: { x: number; y: number; t: number }[];
  hold?: ReturnType<typeof setTimeout>;
  hover?: HTMLElement | null;
};

function dropTargetAt(x: number, y: number): HTMLElement | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const d = (el as HTMLElement).closest<HTMLElement>("[data-drop]");
    if (d) return d;
  }
  return null;
}

function centerDelta(from: Element, to: Element) {
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  return {
    x: b.left + b.width / 2 - (a.left + a.width / 2),
    y: b.top + b.height / 2 - (a.top + a.height / 2),
  };
}

export function HandCard({
  card,
  faceUp: initialFaceUp = false,
  tilt = 0,
  lift = 0,
  flipSignal = 0,
  flipDelay = 0,
  selected,
  onSelect,
  onFlipped,
  onStamp,
  onTrash,
  onDragSlot,
  style,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const flipper = useRef<HTMLDivElement>(null);
  const halves = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [faceUp, setFaceUp] = useState(initialFaceUp);
  const [flipping, setFlipping] = useState(false);
  const [crumpled, setCrumpled] = useState(false);
  const [ripping, setRipping] = useState(false);
  const [gone, setGone] = useState(false);
  const busy = useRef(false);
  /** Set after a drag or crumple so the click that follows doesn't toggle selection. */
  const swallowClick = useRef(false);
  // Ignore taps right after the card appears (e.g. the tear gesture ending on top of it).
  const bornAt = useRef(Infinity);
  useEffect(() => {
    bornAt.current = performance.now();
  }, []);

  const rest = `translate(0px, ${lift}px) rotate(${tilt}deg)`;
  const posed = (dx: number, dy: number) =>
    `translate(${dx}px, ${lift + dy}px) rotate(${tilt + dx * 0.04}deg)`;

  async function flip() {
    if (faceUp || flipping) return;
    setFlipping(true);
    const pause =
      card.rarity === "mythic" ? feel.mythicPause : card.rarity === "rare" ? feel.rarePause : 0;
    const total = feel.cardFlip + pause;
    if (pause) sfx.drumroll();
    const half = feel.cardFlip / 2 / total;
    await play(
      flipper.current,
      [
        { transform: "rotateY(0deg)", offset: 0 },
        { transform: "rotateY(84deg)", offset: half },
        ...(pause ? [{ transform: "rotateY(96deg)", offset: half + pause / total }] : []),
        { transform: "rotateY(192deg)", offset: 0.9 },
        { transform: "rotateY(180deg)", offset: 1 },
      ],
      total,
      { easing: "ease-in-out" },
    );
    sfx.thup();
    if (card.rarity === "rare") {
      sfx.sparkle();
      sayRandom("rare");
    }
    if (card.rarity === "mythic") {
      sfx.fanfare();
      sayRandom("mythic");
    }
    setFaceUp(true);
    setFlipping(false);
    onFlipped?.(card);
  }

  // "Flip all": flip after a stagger when the signal changes.
  const lastSignal = useRef(flipSignal);
  useEffect(() => {
    if (flipSignal === lastSignal.current) return;
    lastSignal.current = flipSignal;
    const t = setTimeout(() => void flip(), flipDelay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipSignal]);

  function setHover(el: HTMLElement | null) {
    const d = drag.current;
    if (!d || d.hover === el) return;
    d.hover?.classList.remove("hover");
    el?.classList.add("hover");
    d.hover = el;
  }

  async function finishTrash(how: TrashHow) {
    setGone(true);
    onTrash(card, how);
  }

  async function crumpleToBin(fromTransform: string) {
    busy.current = true;
    const bin = document.querySelector('[data-drop="bin"]');
    if (!wrap.current || !bin) return finishTrash("crumple");
    setCrumpled(true);
    const d = centerDelta(wrap.current, bin);
    sfx.whoosh();
    // Start from the current (dragged) pose so the flight continues from the finger.
    const cur = drag.current;
    const base = cur ? { x: cur.dx, y: cur.dy } : { x: 0, y: 0 };
    await play(
      wrap.current,
      [
        { transform: fromTransform },
        {
          transform: `translate(${base.x + d.x * 0.5}px, ${lift + base.y + d.y * 0.5 - 60}px) rotate(200deg) scale(.55)`,
          offset: 0.5,
        },
        {
          transform: `translate(${base.x + d.x}px, ${lift + base.y + d.y}px) rotate(400deg) scale(.3)`,
          opacity: 0.2,
        },
      ],
      feel.intoBin,
      { easing: "cubic-bezier(.3,.1,.7,1)", fill: "forwards" },
    );
    sfx.bin();
    finishTrash("crumple");
  }

  async function rip() {
    busy.current = true;
    sfx.peel();
    haptic(feel.haptic.tear);
    setRipping(true);
    await wait(16);
    const [l, r] = Array.from(halves.current?.children ?? []);
    await Promise.all([
      play(
        l,
        [
          { transform: "none" },
          { transform: "translate(-50px, 140px) rotate(-28deg)", opacity: 0 },
        ],
        feel.rip,
        {
          easing: "cubic-bezier(.5,0,.9,.6)",
          fill: "forwards",
        },
      ),
      play(
        r,
        [{ transform: "none" }, { transform: "translate(50px, 160px) rotate(24deg)", opacity: 0 }],
        feel.rip,
        {
          easing: "cubic-bezier(.5,0,.9,.6)",
          fill: "forwards",
        },
      ),
    ]);
    finishTrash("rip");
  }

  async function fling(vx: number, vy: number, from: string) {
    busy.current = true;
    sfx.whoosh();
    const d = drag.current ?? { dx: 0, dy: 0 };
    const len = Math.hypot(vx, vy) || 1;
    const far = 900;
    await play(
      wrap.current,
      [
        { transform: from },
        {
          transform: `translate(${d.dx + (vx / len) * far}px, ${lift + d.dy + (vy / len) * far}px) rotate(${vx >= 0 ? 720 : -720}deg)`,
          opacity: 0,
        },
      ],
      feel.fling,
      { easing: "cubic-bezier(.2,.6,.4,1)", fill: "forwards" },
    );
    finishTrash("fling");
  }

  function stampTo(slot: SlotId) {
    if (onStamp(card, slot)) {
      setGone(true);
      return true;
    }
    return false;
  }

  async function snapBack(from: string) {
    await play(wrap.current, [{ transform: from }, { transform: rest }], feel.snapBack, {
      easing: OVERSHOOT,
    });
  }

  // ── Pointer gestures ─────────────────────────────────────────────
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (busy.current || !faceUp || e.button > 0) return;
    swallowClick.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    const d: Drag = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      dx: 0,
      dy: 0,
      moved: false,
      samples: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }],
    };
    d.hold = setTimeout(() => {
      if (!d.moved) {
        setCrumpled(true);
        sfx.crumple();
        haptic(feel.haptic.tear);
      }
    }, feel.holdToCrumple);
    drag.current = d;
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.dx = e.clientX - d.x0;
    d.dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(d.dx, d.dy) > feel.dragSlop) {
      d.moved = true;
      clearTimeout(d.hold);
      onSelect?.(null);
      onDragSlot?.(card.slot);
    }
    d.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (d.samples.length > 6) d.samples.shift();
    if (d.moved && wrap.current) {
      wrap.current.style.transform = posed(d.dx, d.dy);
      setHover(dropTargetAt(e.clientX, e.clientY));
    }
  }

  async function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    clearTimeout(d.hold);
    setHover(null);
    onDragSlot?.(null);
    const from = posed(d.dx, d.dy);

    // Velocity from the last ~80 ms of samples.
    const last = d.samples[d.samples.length - 1];
    const first = d.samples.find((s) => last.t - s.t < 80) ?? d.samples[0];
    const dt = Math.max(1, last.t - first.t);
    const vx = (last.x - first.x) / dt;
    const vy = (last.y - first.y) / dt;
    const speed = Math.hypot(vx, vy);

    if (!d.moved) {
      drag.current = null;
      if (crumpled) {
        // Held to crumple, released without flicking: let it go into the bin.
        swallowClick.current = true;
        await crumpleToBin(rest);
      }
      return;
    }

    swallowClick.current = true;
    const target = e.type === "pointerup" ? dropTargetAt(e.clientX, e.clientY) : null;
    if (target?.dataset.drop === "slot" && !crumpled) {
      const ok = stampTo(target.dataset.slot as SlotId);
      if (!ok) {
        say(
          target.dataset.slot === card.slot
            ? "That slot's taken. Peel it first."
            : "Wrong slot, friend.",
        );
        await snapBack(from);
        if (wrap.current) wrap.current.style.transform = "";
      }
    } else if (target?.dataset.drop === "bin" || crumpled) {
      await crumpleToBin(from);
    } else if (speed > feel.flingVelocity && vy > 0 && Math.abs(vy) > Math.abs(vx) * 2) {
      await rip();
    } else if (speed > feel.flingVelocity) {
      await fling(vx, vy, from);
    } else {
      await snapBack(from);
      if (wrap.current) wrap.current.style.transform = "";
    }
    drag.current = null;
  }

  // ── Button / keyboard actions ───────────────────────────────────
  async function crumpleAction() {
    busy.current = true;
    onSelect?.(null);
    setCrumpled(true);
    sfx.crumple();
    await wait(feel.crumple);
    await crumpleToBin(rest);
  }

  if (gone && !ripping) return <div className="hand-card gone" style={style} aria-hidden />;

  return (
    <div className={`hand-card${selected ? " selected" : ""}`} style={style}>
      <div
        ref={wrap}
        className={`hand-card-body${crumpled ? " crumpled" : ""}${faceUp ? " up" : ""}`}
        style={{ transform: rest }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          // Taps and keyboard both land here; clicks that end a drag are swallowed.
          if (swallowClick.current) {
            swallowClick.current = false;
            return;
          }
          if (!faceUp) {
            if (performance.now() - bornAt.current > 450) void flip();
          } else onSelect?.(selected ? null : card.id);
        }}
      >
        {ripping ? (
          <div ref={halves} className="rip-halves">
            <CardFace
              card={card}
              style={{
                clipPath: "polygon(0 0,52% 0,46% 22%,54% 41%,47% 63%,53% 82%,48% 100%,0 100%)",
              }}
            />
            <CardFace
              card={card}
              style={{
                clipPath:
                  "polygon(52% 0,100% 0,100% 100%,48% 100%,53% 82%,47% 63%,54% 41%,46% 22%)",
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            className="card-button"
            aria-label={
              faceUp
                ? `${card.text}, ${card.rarity} ${card.slot} card. Press for actions.`
                : "Face-down card. Press to flip."
            }
          >
            <div ref={flipper} className={`flipper${faceUp ? " flipped" : ""}`}>
              <CardBack />
              <CardFace card={card} />
            </div>
          </button>
        )}
      </div>
      {selected && faceUp && !gone && (
        <div className="card-actions" role="group" aria-label="Card actions">
          <button
            type="button"
            className="act keep"
            onClick={() => stampTo(card.slot) || say("That slot's taken.")}
          >
            Stamp
          </button>
          <button type="button" className="act" onClick={() => void crumpleAction()}>
            Crumple
          </button>
          <button type="button" className="act" onClick={() => void rip()}>
            Rip
          </button>
          <button
            type="button"
            className="act"
            onClick={() => void fling(Math.random() - 0.5, -1, rest)}
          >
            Flick
          </button>
        </div>
      )}
    </div>
  );
}
