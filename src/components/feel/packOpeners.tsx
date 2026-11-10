"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { feel } from "@/feel";
import { haptic, play } from "@/lib/motion";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { say } from "../Duck";

type Api = { open: () => void; titles: () => string[] };

const quick = () => settings.get().reducedMotion || settings.get().speed;
const wait = (ms: number) => new Promise((r) => setTimeout(r, quick() ? 0 : ms));

// ── Pack box ────────────────────────────────────────────────────────────────

const BOX_SIZE = 5;
const PACK_COLORS = ["#e05a3a", "#4f7cc0", "#5aa469", "#f5b83d", "#9a6fc0"];

function readBox(key: string) {
  try {
    const n = Number(localStorage.getItem(`qs.box.${key}`));
    return Number.isFinite(n) && localStorage.getItem(`qs.box.${key}`) !== null
      ? Math.max(0, Math.min(BOX_SIZE, n))
      : BOX_SIZE;
  } catch {
    return BOX_SIZE;
  }
}
function writeBox(key: string, n: number) {
  try {
    localStorage.setItem(`qs.box.${key}`, String(n));
  } catch {
    /* private mode: the box just refills next visit */
  }
}

/**
 * A box of packs. Tap one to lift it out, then drag across its top to tear it: the tear follows your
 * finger with rising rip sounds and little buzzes, and past 80 % the top flies off in a burst of paper.
 * When the box is empty, a fresh box slides in.
 */
export function PackBox({ open, boxKey, label }: Api & { boxKey: string; label: string }) {
  const [left, setLeft] = useState(() => readBox(boxKey));
  const [picked, setPicked] = useState<number | null>(null);
  const [p, setP] = useState(0);
  const [torn, setTorn] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pack = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLButtonElement>(null);
  const burst = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; w: number; moved: boolean; step: number } | null>(null);
  const busy = useRef(false);

  async function pick(i: number) {
    if (busy.current) return;
    busy.current = true;
    sfx.slide();
    haptic(8);
    const el = box.current?.querySelectorAll<HTMLElement>(".pb-slot")[i];
    if (el)
      await play(el, [{ transform: "translateY(0)" }, { transform: "translateY(-28px)" }], 160);
    setPicked(i);
    say("Ooh, that one. Rip it!");
    busy.current = false;
    requestAnimationFrame(() =>
      play(
        pack.current,
        [
          { transform: "translateY(40px) scale(.55)", opacity: 0 },
          { transform: "translateY(-6px) scale(1.04)", opacity: 1, offset: 0.7 },
          { transform: "none", opacity: 1 },
        ],
        320,
        { easing: "cubic-bezier(.2,.9,.3,1)" },
      ),
    );
  }

  async function tearOff() {
    if (torn) return;
    setTorn(true);
    setP(1);
    drag.current = null;
    sfx.tearOff();
    haptic(feel.haptic.tear);
    // The strip flies off, paper bits burst from the tear, the pack jolts.
    void play(
      top.current,
      [
        { transform: "none", opacity: 1 },
        { transform: "translate(90px,-120px) rotate(38deg)", opacity: 0 },
      ],
      feel.tearFlyOff,
      { easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" },
    );
    Array.from(burst.current?.children ?? []).forEach((el, i) => {
      const a = (i / 14) * Math.PI - Math.PI;
      const r = 50 + ((i * 37) % 40);
      void play(
        el,
        [
          { transform: "translate(0,0) rotate(0)", opacity: 1 },
          {
            transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r - 20}px) rotate(${i * 47}deg)`,
            opacity: 0,
          },
        ],
        520,
        { easing: "cubic-bezier(.1,.8,.3,1)", fill: "forwards" },
      );
    });
    await play(
      pack.current,
      [
        { transform: "none" },
        { transform: "translateX(-6px) rotate(-2deg)" },
        { transform: "translateX(5px) rotate(1.5deg)" },
        { transform: "translateX(-2px)" },
        { transform: "none" },
      ],
      260,
    );
    sfx.riffle();
    await play(
      pack.current?.querySelector(".pb-cards"),
      [{ transform: "translateY(0)" }, { transform: "translateY(-46px)" }],
      260,
      { easing: "cubic-bezier(.2,.9,.3,1)", fill: "forwards" },
    );
    await wait(160);
    const n = Math.max(0, left - 1);
    writeBox(boxKey, n);
    setLeft(n);
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

  async function newBox() {
    if (busy.current) return;
    busy.current = true;
    await play(
      box.current,
      [{ transform: "none" }, { transform: "translateX(-130%) rotate(-6deg)" }],
      260,
      {
        easing: "cubic-bezier(.5,0,.8,.4)",
      },
    );
    writeBox(boxKey, BOX_SIZE);
    setLeft(BOX_SIZE);
    sfx.thud();
    haptic(feel.haptic.thud);
    say("Fresh box!");
    await play(
      box.current,
      [
        { transform: "translateX(130%) rotate(6deg)" },
        { transform: "translateX(-4%) rotate(-1deg)", offset: 0.75 },
        { transform: "none" },
      ],
      380,
      { easing: "cubic-bezier(.2,.9,.3,1)" },
    );
    busy.current = false;
  }

  if (picked !== null) {
    const color = PACK_COLORS[picked % PACK_COLORS.length];
    return (
      <div className="op pb-stage">
        <div ref={pack} className="pb-pack" style={{ "--pc": color, "--p": p } as CSSProperties}>
          <div className="pb-cards" aria-hidden>
            <i />
            <i />
            <i />
          </div>
          <div className="pb-body" aria-hidden>
            <small>quackle.scrapbook</small>
            <strong>{label}</strong>
            <span>4 cards</span>
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
              <i key={i} style={{ left: `${8 + i * 6.3}%` }} />
            ))}
          </div>
        </div>
        <p className="dk-hint pb-hint">{torn ? " " : "Drag across the top to tear it open →"}</p>
      </div>
    );
  }

  return (
    <div className="op pb-stage">
      <div ref={box} className="pb-box">
        <div className="pb-slots">
          {Array.from({ length: BOX_SIZE }, (_, i) => {
            const there = i < left;
            return (
              <button
                key={i}
                type="button"
                className={`pb-slot${there ? "" : " gone"}`}
                style={{ "--pc": PACK_COLORS[i % PACK_COLORS.length] } as CSSProperties}
                disabled={!there}
                onClick={() => void pick(i)}
                aria-label={there ? `Pick pack ${i + 1}` : "Empty slot"}
              />
            );
          })}
        </div>
        <div className="pb-front">
          <strong>{label}</strong>
          <span>
            {left} / {BOX_SIZE} packs
          </span>
        </div>
      </div>
      {left > 0 ? (
        <p className="dk-hint pb-hint">Pick a pack.</p>
      ) : (
        <button type="button" className="dk-btn primary" onClick={() => void newBox()}>
          Get a new box
        </button>
      )}
    </div>
  );
}

/** The mechanics stall's opener: a box of mechanics packs. */
export function MechanicPackBox(api: Api) {
  return <PackBox {...api} boxKey="mechanic" label="Mechanics" />;
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
