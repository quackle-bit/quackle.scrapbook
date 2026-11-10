"use client";

import { motion, useMotionValue } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { feel } from "@/feel";
import { haptic, play, wait } from "@/lib/motion";
import { glide, go } from "@/lib/physics";
import { sfx } from "@/lib/sound";
import { say } from "../Duck";

export type TrashHow = "crumple" | "rip" | "fling";
/** "street" keeps the original class names (pixel CSS); "paper" uses fc-* classes styled in desk.css. */
export type FeelSkin = "street" | "paper";

export type DragCardProps<T extends { id: string }> = {
  card: T;
  skin?: FeelSkin;
  renderFace: (card: T, style?: CSSProperties) => ReactNode;
  renderBack: () => ReactNode;
  /** Accessible name for the card button. */
  label: (card: T, faceUp: boolean) => string;
  /** Extra half-turned pause on the flip (rare cards). */
  flipPause?: (card: T) => number;
  /** Rarity sounds / duck lines after the flip lands. */
  onRevealed?: (card: T) => void;
  /** Can this drop target take the card? true, or a refusal line for the duck. */
  accepts: (target: HTMLElement, card: T) => true | string;
  /** The target the "Stamp" button flies to (null if none fits). */
  findTarget: (card: T) => HTMLElement | null;
  /** The card landed on `target`. Return false to refuse (it springs back). */
  onStamp: (card: T, target: HTMLElement) => boolean;
  onTrash: (card: T, how: TrashHow) => void;
  /** Dragging starts / ends: lets targets pulse. */
  onDragging?: (card: T | null) => void;
  faceUp?: boolean;
  tilt?: number;
  lift?: number;
  flipSignal?: number;
  flipDelay?: number;
  selected?: boolean;
  onSelect?: (id: string | null) => void;
  onFlipped?: (card: T) => void;
  stampLabel?: string;
  style?: CSSProperties;
};

type Drag = {
  id: number;
  ox: number;
  oy: number;
  startX: number;
  startY: number;
  moved: boolean;
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

const STREET = (n: string) => n;
const PAPER = (n: string) => `fc-${n}`;

/**
 * A card you flip, drag onto a target, or trash (hold to crumple, swipe down to rip, fling).
 * Shared by the street (Studio/Jam) and the desk scrapbook; only the skin differs.
 */
export function DragCard<T extends { id: string }>({
  card,
  skin = "street",
  renderFace,
  renderBack,
  label,
  flipPause,
  onRevealed,
  accepts,
  findTarget,
  onStamp,
  onTrash,
  onDragging,
  faceUp: initialFaceUp = false,
  tilt = 0,
  lift = 0,
  flipSignal = 0,
  flipDelay = 0,
  selected,
  onSelect,
  onFlipped,
  stampLabel = "Stamp",
  style,
}: DragCardProps<T>) {
  const k = skin === "paper" ? PAPER : STREET;
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
  const swallowClick = useRef(false);
  const bornAt = useRef(Infinity);
  useEffect(() => {
    bornAt.current = performance.now();
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(lift);
  const rotate = useMotionValue(tilt);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(1);

  useEffect(() => {
    if (drag.current || busy.current) return;
    void go(y, lift, feel.spring.fan);
    void go(rotate, tilt, feel.spring.fan);
  }, [lift, tilt, y, rotate]);

  async function flip() {
    if (faceUp || flipping) return;
    setFlipping(true);
    const pause = flipPause?.(card) ?? 0;
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
    onRevealed?.(card);
    setFaceUp(true);
    setFlipping(false);
    onFlipped?.(card);
  }

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

  function deltaTo(el: Element) {
    const a = wrap.current!.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return {
      dx: b.left + b.width / 2 - (a.left + a.width / 2),
      dy: b.top + b.height / 2 - (a.top + a.height / 2),
      scale: Math.min(1.2, b.width / Math.max(1, a.width)),
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

  async function fling(vx: number, vy: number) {
    busy.current = true;
    sfx.whoosh();
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

  async function flyTo(target: HTMLElement) {
    busy.current = true;
    const { dx, dy, scale: s } = deltaTo(target);
    await Promise.all([
      go(x, x.get() + dx, feel.spring.stamp, 700),
      go(y, y.get() + dy, feel.spring.stamp, 700),
      go(rotate, 0, feel.spring.stamp, 700),
      go(scale, s, feel.spring.stamp, 700),
    ]);
    if (onStamp(card, target)) setGone(true);
    else {
      busy.current = false;
      await snapBack(0, 0);
    }
  }

  async function snapBack(vx: number, vy: number) {
    await Promise.all([
      go(x, 0, { ...feel.spring.snap, velocity: vx }),
      go(y, lift, { ...feel.spring.snap, velocity: vy }),
      go(rotate, tilt, feel.spring.snap),
      go(scale, 1, feel.spring.snap),
    ]);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (busy.current || !faceUp || e.button > 0) return;
    swallowClick.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
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
      onDragging?.(card);
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
    onDragging?.(null);
    drag.current = null;

    const last = d.samples[d.samples.length - 1];
    const first = d.samples.find((s) => last.t - s.t < 80) ?? d.samples[0];
    const dt = Math.max(1, last.t - first.t);
    const vx = (last.x - first.x) / dt;
    const vy = (last.y - first.y) / dt;
    const speed = Math.hypot(vx, vy);

    if (!d.moved) {
      if (crumpled) {
        swallowClick.current = true;
        await crumpleToBin();
      }
      return;
    }

    swallowClick.current = true;
    const target = e.type === "pointerup" ? dropTargetAt(e.clientX, e.clientY) : null;
    if (target?.dataset.drop === "slot") {
      const ok = accepts(target, card);
      if (ok === true) {
        if (crumpled) {
          setCrumpled(false);
          say("Smoothed it out.");
        }
        await flyTo(target);
      } else if (crumpled) {
        await crumpleToBin();
      } else {
        say(ok);
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
    const target = findTarget(card);
    const ok = target ? accepts(target, card) : "Nowhere to put it.";
    if (target && ok === true) await flyTo(target);
    else say(typeof ok === "string" ? ok : "Nowhere to put it.");
  }

  if (gone && !ripping)
    return <div className={`${k("hand-card")} gone`} style={style} aria-hidden />;

  return (
    <div className={`${k("hand-card")}${selected ? " selected" : ""}`} style={style}>
      <motion.div
        ref={wrap}
        className={`${k("hand-card-body")}${crumpled ? " crumpled" : ""}${faceUp ? " up" : ""}`}
        style={{ x, y, rotate, scale, opacity }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={() => {
          const d = drag.current;
          if (!d?.down) return;
          endPress();
          setHover(null);
          onDragging?.(null);
          drag.current = null;
          void snapBack(0, 0);
        }}
        onClick={() => {
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
          <div ref={halves} className={k("rip-halves")}>
            {renderFace(card, {
              clipPath: "polygon(0 0,52% 0,46% 22%,54% 41%,47% 63%,53% 82%,48% 100%,0 100%)",
            })}
            {renderFace(card, {
              clipPath: "polygon(52% 0,100% 0,100% 100%,48% 100%,53% 82%,47% 63%,54% 41%,46% 22%)",
            })}
          </div>
        ) : (
          <button type="button" className={k("card-button")} aria-label={label(card, faceUp)}>
            <div ref={flipper} className={`${k("flipper")}${faceUp ? " flipped" : ""}`}>
              {renderBack()}
              {renderFace(card)}
            </div>
          </button>
        )}
      </motion.div>
      {selected && faceUp && !gone && (
        <div className={k("card-actions")} role="group" aria-label="Card actions">
          <button type="button" className={`${k("act")} keep`} onClick={() => void stampAction()}>
            {stampLabel}
          </button>
          <button type="button" className={k("act")} onClick={() => void crumpleAction()}>
            Crumple
          </button>
          <button type="button" className={k("act")} onClick={() => void rip()}>
            Rip
          </button>
          <button
            type="button"
            className={k("act")}
            onClick={() => void fling((Math.random() - 0.5) * 1200, -1800)}
          >
            Flick
          </button>
        </div>
      )}
    </div>
  );
}
