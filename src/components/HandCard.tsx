"use client";

import { motion, useMotionValue } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { feel } from "@/feel";
import type { CardData, SlotId } from "@/lib/deck";
import { haptic, play, wait } from "@/lib/motion";
import { glide, go } from "@/lib/physics";
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
  /** Pointer position minus the card's offset at grab time, so a grab mid-animation continues smoothly. */
  ox: number;
  oy: number;
  startX: number;
  startY: number;
  moved: boolean;
  /** Still pressed? The crumple timer only fires while the finger is down. */
  down: boolean;
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

/** Can this slot take the card? (Checked before flying, so a refused card never leaves the hand.) */
function slotAccepts(target: HTMLElement, card: CardData) {
  const slot = target.dataset.slot;
  if (target.classList.contains("filled")) return false;
  return slot === card.slot || slot === "free";
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
  /** A one-way animation (stamp, trash) is running: ignore new grabs. */
  const busy = useRef(false);
  /** Set after a drag or crumple so the click that follows doesn't toggle selection. */
  const swallowClick = useRef(false);
  // Ignore taps right after the card appears (e.g. the tear gesture ending on top of it).
  const bornAt = useRef(Infinity);
  useEffect(() => {
    bornAt.current = performance.now();
  }, []);

  // Motion values: the card's offset from its slot in the fan.
  const x = useMotionValue(0);
  const y = useMotionValue(lift);
  const rotate = useMotionValue(tilt);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(1);

  // When the fan re-spaces (a neighbour left), spring to the new rest pose.
  useEffect(() => {
    if (drag.current || busy.current) return;
    void go(y, lift, feel.spring.fan);
    void go(rotate, tilt, feel.spring.fan);
  }, [lift, tilt, y, rotate]);

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

  function finishTrash(how: TrashHow) {
    setGone(true);
    onTrash(card, how);
  }

  /** Offset (in the card's current coordinates) that puts its centre on `el`'s centre. */
  function deltaTo(el: Element) {
    const a = wrap.current!.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return {
      dx: b.left + b.width / 2 - (a.left + a.width / 2),
      dy: b.top + b.height / 2 - (a.top + a.height / 2),
      scale: b.width / Math.max(1, a.width),
    };
  }

  async function crumpleToBin() {
    busy.current = true;
    const bin = document.querySelector('[data-drop="bin"]');
    if (!wrap.current || !bin) return finishTrash("crumple");
    setCrumpled(true);
    sfx.whoosh();
    const { dx, dy } = deltaTo(bin);
    await Promise.all([
      go(x, x.get() + dx, feel.spring.bin),
      go(y, y.get() + dy, feel.spring.bin),
      go(rotate, rotate.get() + 400, feel.spring.bin),
      go(scale, 0.3, feel.spring.bin),
      go(opacity, 0.2, { duration: 0.3 }),
    ]);
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
        { easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" },
      ),
      play(
        r,
        [{ transform: "none" }, { transform: "translate(50px, 160px) rotate(24deg)", opacity: 0 }],
        feel.rip,
        { easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" },
      ),
    ]);
    finishTrash("rip");
  }

  /** Throw: keeps the release velocity (px/s) and glides out, spinning with the throw. */
  async function fling(vx: number, vy: number) {
    busy.current = true;
    sfx.whoosh();
    // Make sure even a gentle throw leaves the screen.
    const speed = Math.hypot(vx, vy) || 1;
    const boost = Math.max(1, 2200 / speed);
    await Promise.all([
      glide(x, vx * boost),
      glide(y, vy * boost),
      glide(rotate, vx * boost * 0.6),
      go(opacity, 0, { duration: 0.45 }),
    ]);
    finishTrash("fling");
  }

  /** Fly into the slot with a spring, then hand over to the slot's landing thud. */
  async function flyToSlot(target: HTMLElement) {
    busy.current = true;
    const { dx, dy, scale: s } = deltaTo(target);
    await Promise.all([
      go(x, x.get() + dx, feel.spring.stamp, 700),
      go(y, y.get() + dy, feel.spring.stamp, 700),
      go(rotate, 0, feel.spring.stamp, 700),
      go(scale, s, feel.spring.stamp, 700),
    ]);
    if (!stampTo(target.dataset.slot as SlotId)) {
      busy.current = false;
      await snapBack(0, 0);
    }
  }

  function stampTo(slot: SlotId) {
    if (onStamp(card, slot)) {
      setGone(true);
      return true;
    }
    return false;
  }

  /** Spring back to the fan, starting with the release velocity. */
  async function snapBack(vx: number, vy: number) {
    await Promise.all([
      go(x, 0, { ...feel.spring.snap, velocity: vx }),
      go(y, lift, { ...feel.spring.snap, velocity: vy }),
      go(rotate, tilt, feel.spring.snap),
      go(scale, 1, feel.spring.snap),
    ]);
  }

  // ── Pointer gestures ─────────────────────────────────────────────
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (busy.current || !faceUp || e.button > 0) return;
    swallowClick.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Interruptible: grab the card wherever it is right now (mid snap-back included).
    [x, y, rotate, scale].forEach((v) => v.stop());
    const d: Drag = {
      id: e.pointerId,
      ox: e.clientX - x.get(),
      oy: e.clientY - (y.get() - lift),
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      down: true,
      samples: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }],
    };
    // A stale press (its release never reached us) must not linger.
    endPress();
    d.hold = setTimeout(() => {
      if (d.down && !d.moved && drag.current === d) {
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
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > feel.dragSlop) {
      d.moved = true;
      clearTimeout(d.hold);
      onSelect?.(null);
      onDragSlot?.(card.slot);
    }
    d.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (d.samples.length > 6) d.samples.shift();
    if (d.moved) {
      const dx = e.clientX - d.ox;
      x.set(dx);
      y.set(lift + e.clientY - d.oy);
      rotate.set(tilt + dx * 0.04);
      setHover(dropTargetAt(e.clientX, e.clientY));
    }
  }

  /** End the current press without acting on it (lost capture, unmount, stale press). */
  function endPress() {
    const d = drag.current;
    if (!d) return;
    clearTimeout(d.hold);
    d.down = false;
  }
  useEffect(() => () => endPress(), []);

  async function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (d) {
      clearTimeout(d.hold);
      d.down = false;
    }
    if (!d || d.id !== e.pointerId) return;
    setHover(null);
    onDragSlot?.(null);
    drag.current = null;

    // Velocity from the last ~80 ms of samples (px/ms; ×1000 for px/s).
    const last = d.samples[d.samples.length - 1];
    const first = d.samples.find((s) => last.t - s.t < 80) ?? d.samples[0];
    const dt = Math.max(1, last.t - first.t);
    const vx = (last.x - first.x) / dt;
    const vy = (last.y - first.y) / dt;
    const speed = Math.hypot(vx, vy);

    if (!d.moved) {
      if (crumpled) {
        // Held to crumple, released without moving: into the bin.
        swallowClick.current = true;
        await crumpleToBin();
      }
      return;
    }

    swallowClick.current = true;
    const target = e.type === "pointerup" ? dropTargetAt(e.clientX, e.clientY) : null;
    if (target?.dataset.drop === "slot" && (!crumpled || slotAccepts(target, card))) {
      if (crumpled) {
        // Held a moment too long, but clearly aimed at a slot: smooth it out and keep it.
        setCrumpled(false);
        say("Smoothed it out.");
      }
      if (slotAccepts(target, card)) await flyToSlot(target);
      else {
        say(
          target.dataset.slot === card.slot
            ? "That slot's taken. Peel it first."
            : "Wrong slot, friend.",
        );
        await snapBack(vx * 1000, vy * 1000);
      }
    } else if (target?.dataset.drop === "bin" || crumpled) {
      await crumpleToBin();
    } else if (speed > feel.flingVelocity && vy > 0 && Math.abs(vy) > Math.abs(vx) * 2) {
      await rip();
    } else if (speed > feel.flingVelocity) {
      await fling(vx * 1000, vy * 1000);
    } else {
      await snapBack(vx * 1000, vy * 1000);
    }
  }

  // ── Button / keyboard actions ───────────────────────────────────
  async function crumpleAction() {
    busy.current = true;
    onSelect?.(null);
    setCrumpled(true);
    sfx.crumple();
    await wait(feel.crumple);
    await crumpleToBin();
  }

  async function stampAction() {
    onSelect?.(null);
    const target = document.querySelector<HTMLElement>(
      `[data-drop="slot"][data-slot="${card.slot}"], [data-drop="slot"][data-slot="free"]:not(.filled)`,
    );
    if (target && slotAccepts(target, card)) await flyToSlot(target);
    else if (!stampTo(card.slot)) say("That slot's taken.");
  }

  if (gone && !ripping) return <div className="hand-card gone" style={style} aria-hidden />;

  return (
    <div className={`hand-card${selected ? " selected" : ""}`} style={style}>
      <motion.div
        ref={wrap}
        className={`hand-card-body${crumpled ? " crumpled" : ""}${faceUp ? " up" : ""}`}
        style={{ x, y, rotate, scale, opacity }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={() => {
          // Capture lost mid-press (e.g. the OS took the gesture): end it and spring home.
          const d = drag.current;
          if (!d?.down) return;
          endPress();
          setHover(null);
          onDragSlot?.(null);
          drag.current = null;
          void snapBack(0, 0);
        }}
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
      </motion.div>
      {selected && faceUp && !gone && (
        <div className="card-actions" role="group" aria-label="Card actions">
          <button type="button" className="act keep" onClick={() => void stampAction()}>
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
            onClick={() => void fling((Math.random() - 0.5) * 1200, -1800)}
          >
            Flick
          </button>
        </div>
      )}
    </div>
  );
}
