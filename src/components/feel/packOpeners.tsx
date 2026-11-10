"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { feel } from "@/feel";
import { haptic, play } from "@/lib/motion";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { say } from "../Duck";

type Api = { open: () => void; titles: () => string[] };

const quick = () => settings.get().reducedMotion || settings.get().speed;
const wait = (ms: number) => new Promise((r) => setTimeout(r, quick() ? 0 : ms));

// ── Tear pack ───────────────────────────────────────────────────────────────

const PACK_COLORS = ["#e05a3a", "#4f7cc0", "#5aa469", "#9a6fc0"];

/**
 * One pack, handed to you. Drag across its top to tear it: the tear follows your finger with
 * rising rip sounds and little buzzes, and past 80 % the strip flies off in a burst of paper,
 * the pack jolts and the cards rise out. A tap tears it too.
 */
export function TearPack({ open, label }: Api & { label: string }) {
  const [color] = useState(() => PACK_COLORS[Math.floor(Math.random() * PACK_COLORS.length)]);
  const [p, setP] = useState(0);
  const [torn, setTorn] = useState(false);
  const pack = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLButtonElement>(null);
  const burst = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; w: number; moved: boolean; step: number } | null>(null);

  // The pack is handed over: it slides up from below the counter in pixel steps.
  useEffect(() => {
    sfx.slide();
    void play(
      pack.current,
      [
        { transform: "translateY(60px)", opacity: 0 },
        { transform: "translateY(-8px)", opacity: 1, offset: 0.7 },
        { transform: "none", opacity: 1 },
      ],
      360,
      { easing: "steps(6, end)" },
    );
  }, []);

  async function tearOff() {
    if (torn) return;
    setTorn(true);
    setP(1);
    drag.current = null;
    sfx.tearOff();
    haptic(feel.haptic.tear);
    void play(
      top.current,
      [
        { transform: "none", opacity: 1 },
        { transform: "translate(90px,-120px) rotate(30deg)", opacity: 0 },
      ],
      feel.tearFlyOff,
      { easing: "steps(6, end)", fill: "forwards" },
    );
    Array.from(burst.current?.children ?? []).forEach((el, i) => {
      const a = (i / 14) * Math.PI - Math.PI;
      const r = 50 + ((i * 37) % 40);
      void play(
        el,
        [
          { transform: "translate(0,0)", opacity: 1 },
          {
            transform: `translate(${Math.round(Math.cos(a) * r)}px, ${Math.round(Math.sin(a) * r - 20)}px)`,
            opacity: 0,
          },
        ],
        520,
        { easing: "steps(8, end)", fill: "forwards" },
      );
    });
    await play(
      pack.current,
      [
        { transform: "none" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(-2px)" },
        { transform: "none" },
      ],
      240,
      { easing: "steps(4, end)" },
    );
    sfx.riffle();
    await play(
      pack.current?.querySelector(".pb-cards"),
      [{ transform: "translateY(0)" }, { transform: "translateY(-54px)" }],
      280,
      { easing: "steps(5, end)", fill: "forwards" },
    );
    await wait(160);
    open();
  }

  async function autoTear() {
    // Tap (or keyboard) still tears it, with the same rip steps, just quicker.
    for (let s = 1; s <= 8; s++) {
      setP(s / 10);
      sfx.rip(1 + s / 10);
      haptic(4);
      await wait(40);
    }
    void tearOff();
  }

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (torn) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone: the drag still works without capture */
    }
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { x0: Math.max(e.clientX, r.left), w: r.width, moved: false, step: 0 };
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || torn) return;
    const v = Math.max(0, Math.min(1, (e.clientX - d.x0) / (d.w * 0.95)));
    if (Math.abs(e.clientX - d.x0) > 6) d.moved = true;
    const step = Math.floor(v * 20);
    if (step > d.step) {
      d.step = step;
      sfx.rip(1 + v);
      haptic(4);
    }
    setP(v);
    if (v >= feel.tearThreshold) void tearOff();
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || torn) return;
    if (!d.moved) void autoTear();
    else setP(0); // let go too early: the strip springs back
  };

  return (
    <div className="op pb-stage">
      <div
        ref={pack}
        className={`pb-pack${torn ? " torn" : ""}`}
        style={{ "--pc": color, "--p": p } as CSSProperties}
      >
        <div className="pb-cards" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <div className="pb-body" aria-hidden>
          <span className="pb-star" />
          <span className="pb-plate">
            <strong>{label}</strong>
            <small>4 cards</small>
          </span>
          <span className="pb-brand">quackle.scrapbook</span>
        </div>
        <button
          ref={top}
          type="button"
          className="pb-top"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && void autoTear()}
          aria-label="Tear the pack open"
          data-noswipe
        >
          <span className="pb-tear" aria-hidden />
        </button>
        <div ref={burst} className="pb-burst" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ left: `${8 + i * 6}%` }} />
          ))}
        </div>
      </div>
      <p className="dk-hint pb-hint">{torn ? " " : "Drag across the top to tear it open →"}</p>
    </div>
  );
}

/** The mechanics stall's opener: a pack, handed straight over. */
export function MechanicPack(api: Api) {
  return <TearPack {...api} label="Mechanics" />;
}

// ── Slot lever ──────────────────────────────────────────────────────────────

/**
 * The Tailor's slot machine: a 2×2 window of reels and a lever. Pull the lever (drag it down or tap)
 * and the reels stop one by one on this pack's looks; the cards then stay right where they landed.
 */
export function SlotLever({ open, titles }: Api) {
  const [pull, setPull] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [stopped, setStopped] = useState<number[]>([]);
  const [final] = useState(titles);
  const drag = useRef<{ y0: number } | null>(null);
  const done = useRef(false);

  async function go() {
    if (done.current) return;
    done.current = true;
    setPull(1);
    sfx.clink();
    haptic(feel.haptic.tear);
    setSpinning(true);
    await wait(120);
    setPull(0);
    await wait(380);
    for (let i = 0; i < final.length; i++) {
      setStopped((s) => [...s, i]);
      sfx.thud();
      haptic(10);
      await wait(260);
    }
    say("Ka-ching! Which looks fit?");
    await wait(380);
    open();
  }

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (done.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone: the drag still works without capture */
    }
    drag.current = { y0: e.clientY };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const v = Math.max(0, Math.min(1, (e.clientY - d.y0) / 90));
    if (Math.floor(v * 5) > Math.floor(pull * 5)) sfx.tick();
    setPull(v);
    if (v >= 0.9) {
      drag.current = null;
      void go();
    }
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || done.current) return;
    if (pull < 0.1) void go();
    else setPull(0);
  };

  // Each reel strip: every look in the pack, twice, so the loop is seamless.
  const strip = [...final, ...final];
  return (
    <div className="op sl-stage">
      <div className="sl-machine">
        <div className="sl-windows">
          {final.map((w, i) => (
            <div key={i} className="sl-win">
              {stopped.includes(i) ? (
                <b className="sl-final">{w}</b>
              ) : (
                <span
                  className={`sl-strip${spinning ? " spin" : ""}`}
                  style={{ animationDelay: `${-i * 0.11}s` }}
                >
                  {/* each reel starts on a different look */}
                  {[...strip.slice(i), ...strip.slice(0, i)].map((s, j) => (
                    <b key={j}>{s}</b>
                  ))}
                </span>
              )}
            </div>
          ))}
        </div>
        <div
          className="sl-lever"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          data-noswipe
          role="button"
          tabIndex={0}
          aria-label="Pull the lever"
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && void go()}
        >
          <span className="sl-rod" style={{ transform: `scaleY(${1 - pull * 0.9})` }} aria-hidden />
          <span
            className="sl-ball"
            style={{ transform: `translateY(${pull * 92}px)` }}
            aria-hidden
          />
        </div>
      </div>
      <p className="dk-hint pb-hint">{spinning ? " " : "Pull the lever ↓"}</p>
    </div>
  );
}
