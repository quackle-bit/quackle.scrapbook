"use client";

import { useEffect, useRef, useState } from "react";
import { feel } from "@/feel";
import { makePalette, spreadLogline, titleOptions, type CardData, type SlotId } from "@/lib/deck";
import { haptic, OVERSHOOT, play, shake, wait } from "@/lib/motion";
import { createRng, freshSeed } from "@/lib/rng";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { FORGE_ACT, say } from "../Duck";
import { Polaroid, SpreadView, type Concept } from "../book/SpreadView";

const HOLD_MS = 1200;

/**
 * The Forge: the full spread opens for the first time, the stamps glow, you hold to forge
 * them into the concept card, then pick one of 3 titles or write your own.
 */
export function ForgeStop({
  slots,
  cards,
  existing,
  onForged,
  presetTitle,
}: {
  /** A title the player already typed or spun on the pitch: keep it as the first choice. */
  presetTitle?: string;
  slots: SlotId[];
  cards: Partial<Record<SlotId, CardData>>;
  existing: Concept | null;
  onForged: (c: Concept) => void;
}) {
  const [hold, setHold] = useState(0);
  const [phase, setPhase] = useState<"ready" | "forging" | "naming">(existing ? "naming" : "ready");
  const [options, setOptions] = useState<string[]>([]);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [palette, setPalette] = useState<string[]>(existing?.palette ?? []);
  const spreadRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const holdStart = useRef<number | null>(null);
  const raf = useRef(0);
  const filled = slots.filter((s) => cards[s]).length;

  useEffect(() => {
    if (existing) {
      const rng = createRng(freshSeed());
      setOptions(titleOptions(rng, cards));
    }
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startHold() {
    if (phase !== "ready" || filled === 0) return;
    if (settings.get().speed) return void forge();
    holdStart.current = performance.now();
    sfx.tick();
    const loop = (now: number) => {
      if (holdStart.current === null) return;
      const p = Math.min(1, (now - holdStart.current) / HOLD_MS);
      setHold(p);
      if (p >= 1) return void forge();
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }
  function endHold() {
    if (phase !== "ready") return;
    holdStart.current = null;
    cancelAnimationFrame(raf.current);
    setHold(0);
  }

  async function forge() {
    holdStart.current = null;
    setPhase("forging");
    sfx.forge();
    haptic(feel.haptic.forge);
    say("FORGING!", FORGE_ACT);
    const els = Array.from(
      spreadRef.current?.querySelectorAll<HTMLElement>(".book-slot .stamped") ?? [],
    );
    const center = spreadRef.current?.getBoundingClientRect();
    await Promise.all(
      els.map((el, i) => {
        const r = el.getBoundingClientRect();
        const dx = center ? center.left + center.width / 2 - (r.left + r.width / 2) : 0;
        const dy = center ? center.top + center.height / 2 - (r.top + r.height / 2) : 0;
        return play(
          el,
          [
            { transform: "none", filter: "brightness(1)" },
            { transform: "translateY(-10px) scale(1.08)", filter: "brightness(1.5)", offset: 0.3 },
            {
              transform: `translate(${dx}px, ${dy}px) rotate(${360 + i * 60}deg) scale(.1)`,
              filter: "brightness(3)",
              opacity: 0.3,
            },
          ],
          feel.forge * 0.8,
          { easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards", delay: i * 50 },
        );
      }),
    );
    void shake(spreadRef.current, feel.shakePx * 2, feel.shake);
    await play(
      flashRef.current,
      [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }],
      400,
      {
        motion: false,
      },
    );
    els.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    const rng = createRng(freshSeed());
    const opts = titleOptions(rng, cards);
    setOptions(opts);
    setOptions(
      presetTitle?.trim() && !opts.includes(presetTitle.trim())
        ? [presetTitle.trim(), ...opts.slice(0, 2)]
        : opts,
    );
    setTitle(presetTitle?.trim() || opts[0]);
    setPalette(cards.look?.palette ?? makePalette(rng));
    setPhase("naming");
    sfx.fanfare();
    await wait(16);
  }

  const concept: Concept = { title, logline: spreadLogline(cards), palette };

  if (phase === "naming") {
    return (
      <div className="stop-play forge-naming">
        <div className="forged-card">
          <Polaroid concept={concept}>
            <input
              className="polaroid-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Concept title"
              maxLength={48}
            />
          </Polaroid>
        </div>
        <div className="title-options" role="group" aria-label="Title options">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              className={`act${o === title ? " keep" : ""}`}
              onClick={() => {
                setTitle(o);
                sfx.thup();
              }}
            >
              {o}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="big-btn"
          disabled={!title.trim()}
          onClick={() => {
            onForged({ ...concept, title: title.trim() });
            void play(
              document.querySelector(".forged-card"),
              [{ transform: "scale(1.06)" }, { transform: "none" }],
              300,
              {
                easing: OVERSHOOT,
              },
            );
          }}
        >
          Seal it ✓
        </button>
      </div>
    );
  }

  return (
    <div className="stop-play">
      <SpreadView
        ref={spreadRef}
        slots={slots}
        cards={cards}
        className="glow"
        right={
          <div className="concept-empty">
            <span>?</span>
          </div>
        }
      />
      <span className="hint">
        {filled}/{slots.length} stamped{filled < slots.length ? " · empty slots stay as “?”" : ""}
      </span>
      <button
        type="button"
        className="big-btn forge lit hold-btn"
        style={{ ["--hold" as string]: hold }}
        disabled={filled === 0 || phase === "forging"}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && !e.repeat && (e.preventDefault(), startHold())
        }
        onKeyUp={endHold}
      >
        {phase === "forging" ? "Forging…" : "Hold to FORGE"}
      </button>
      <div ref={flashRef} className="flash" aria-hidden />
    </div>
  );
}
