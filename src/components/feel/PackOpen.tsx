"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { feel } from "@/feel";
import { haptic, OVERSHOOT, play } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { sayRandom } from "../Duck";
import { DragCard, type DragCardProps, type FeelSkin } from "./DragCard";

type CardBits<T extends { id: string }> = Omit<
  DragCardProps<T>,
  | "card"
  | "skin"
  | "tilt"
  | "lift"
  | "flipSignal"
  | "flipDelay"
  | "selected"
  | "onSelect"
  | "onFlipped"
  | "style"
  | "faceUp"
>;

/**
 * A pack on the counter: slides in, tear it by dragging across the top (rip rises in pitch), the top flies off,
 * cards fan out face-down, flip them one by one (or all). Every card is a DragCard. Calls onDone when the hand is empty.
 */
export function PackOpen<T extends { id: string }>({
  skin = "street",
  draw,
  label,
  sub = "5 ideas inside",
  hint = "drag to a slot · hold to crumple · swipe down to rip · fling away",
  extraTools,
  onDone,
  onOpened,
  card,
  opener,
  faceUp = false,
}: {
  skin?: FeelSkin;
  /** Called once when the pack opens. */
  draw: () => T[];
  label: ReactNode;
  sub?: ReactNode;
  hint?: ReactNode;
  extraTools?: ReactNode;
  onDone?: () => void;
  onOpened?: (cards: T[]) => void;
  card: CardBits<T>;
  /**
   * A stall's own way to reveal the pack (gear press, folded map, reels...) instead of the envelope.
   * `peek` draws the cards early (same cards `open` will deal), for openers that show them first.
   */
  opener?: (api: { open: () => void; peek: () => T[] }) => ReactNode;
  /** Deal the cards face-up (when the opener already revealed them). */
  faceUp?: boolean;
}) {
  const k = (n: string) => (skin === "paper" ? `fc-${n}` : n);
  const [phase, setPhase] = useState<"pack" | "fan">("pack");
  const [hand, setHand] = useState<T[]>([]);
  const [left, setLeft] = useState<Set<string>>(new Set());
  const [up, setUp] = useState<Set<string>>(new Set());
  const [flipSignal, setFlipSignal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [tear, setTear] = useState(0);
  const packRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const tearDrag = useRef<{ x0: number; w: number; lastStep: number } | null>(null);
  const opening = useRef(false);
  const drawn = useRef<T[] | null>(null);
  const peek = () => (drawn.current ??= draw());

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
      {
        easing: OVERSHOOT,
      },
    );
  }, [phase]);

  async function openPack() {
    if (phase !== "pack" || opening.current) return;
    opening.current = true;
    tearDrag.current = null;
    if (!opener) {
      sfx.tearOff();
      haptic(feel.haptic.tear);
      setTear(1);
    }
    sayRandom("open");
    if (!opener)
      await play(
        flapRef.current,
        [{ transform: "none" }, { transform: "translate(80px,-160px) rotate(35deg)", opacity: 0 }],
        feel.tearFlyOff,
        {
          fill: "forwards",
        },
      );
    const cards = peek();
    onOpened?.(cards);
    setHand(cards);
    setLeft(new Set(cards.map((c) => c.id)));
    setUp(new Set(faceUp ? cards.map((c) => c.id) : []));
    setPhase("fan");
  }

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
        {
          delay: i * feel.fanStagger,
          easing: OVERSHOOT,
          fill: "backwards",
        },
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
      if (next.size === 0) setTimeout(() => onDone?.(), 250);
      return next;
    });
  }

  if (phase === "pack" && opener) return <>{opener({ open: () => void openPack(), peek })}</>;
  if (phase === "pack")
    return (
      <div className={k("pack-stage")}>
        <div ref={packRef} className={k("pack")} style={{ ["--tear" as string]: tear }}>
          <div
            ref={flapRef}
            className={k("pack-flap")}
            onPointerDown={onTearDown}
            onPointerMove={onTearMove}
            onPointerUp={onTearUp}
            onPointerCancel={onTearUp}
          >
            <div className={k("tear-line")} />
            <span className={k("tear-hint")}>drag across to tear →</span>
          </div>
          <div className={k("pack-body")}>
            <div className={k("pack-label")}>{label}</div>
            <div className={k("pack-sub")}>{sub}</div>
          </div>
        </div>
        <button
          type="button"
          className={skin === "paper" ? "dk-btn ghost small" : "link-btn"}
          onClick={() => void openPack()}
        >
          or tap to open
        </button>
      </div>
    );

  const n = hand.length;
  const faceDown = hand.filter((c) => left.has(c.id) && !up.has(c.id)).length;
  return (
    <>
      <div
        ref={fanRef}
        className={k("fan")}
        onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
      >
        {hand.map((c, i) => {
          const off = i - (n - 1) / 2;
          return (
            <DragCard<T>
              key={c.id}
              {...card}
              skin={skin}
              faceUp={faceUp}
              card={c}
              tilt={off * feel.fanSpreadDeg}
              lift={off * off * 6}
              flipSignal={flipSignal}
              flipDelay={i * 110}
              onFlipped={(x) => setUp((u) => new Set(u).add(x.id))}
              selected={selected === c.id}
              onSelect={setSelected}
              onStamp={(x, t) => {
                const ok = card.onStamp(x, t);
                if (ok) resolve(x.id);
                return ok;
              }}
              onTrash={(x, how) => {
                card.onTrash(x, how);
                resolve(x.id);
              }}
              style={{ zIndex: selected === c.id ? 20 : i }}
            />
          );
        })}
      </div>
      <div className={k("fan-tools")}>
        {faceDown > 0 && (
          <button
            type="button"
            className={skin === "paper" ? "dk-btn small" : "link-btn"}
            onClick={() => setFlipSignal((s) => s + 1)}
          >
            Flip all
          </button>
        )}
        {extraTools}
        <span className={skin === "paper" ? "dk-hint" : "hint"}>{hint}</span>
      </div>
    </>
  );
}
