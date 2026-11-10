"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { feel } from "@/feel";
import { haptic, OVERSHOOT, play } from "@/lib/motion";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { say } from "../Duck";

/**
 * Each stall reveals its pack its own way. Every opener ends by calling `open()`, which deals the
 * cards into the usual fan (drag onto the page / bin). All work by tap as well as gesture.
 */
type Api = { open: () => void; titles: () => string[] };

const quick = () => settings.get().reducedMotion || settings.get().speed;

/** The Gear Booth: pull the lever down; the press comes down, ka-chunk, and the cards come out stamped. */
export function GearPress({ open }: Api) {
  const [pull, setPull] = useState(0);
  const drag = useRef<{ y0: number; h: number } | null>(null);
  const head = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  async function slam() {
    if (done.current) return;
    done.current = true;
    setPull(1);
    if (!quick())
      await play(
        head.current,
        [
          { transform: "translateY(0)" },
          { transform: "translateY(64px)", offset: 0.5 },
          { transform: "translateY(0)" },
        ],
        420,
        {
          easing: "cubic-bezier(.6,0,.4,1)",
        },
      );
    sfx.thud();
    haptic(feel.haptic.thud);
    say("Ka-chunk!");
    open();
  }
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, h: 120 };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = Math.max(0, Math.min(1, (e.clientY - d.y0) / d.h));
    if (Math.floor(p * 6) > Math.floor(pull * 6)) sfx.tick();
    setPull(p);
    if (p >= 0.92) {
      drag.current = null;
      void slam();
    }
  };
  const up = () => {
    if (!drag.current) return;
    drag.current = null;
    if (!done.current) setPull(0);
  };

  return (
    <div className="op op-press">
      <div className="op-press-frame">
        <div ref={head} className="op-press-head" aria-hidden>
          <span className="op-gear" style={{ rotate: `${pull * 180}deg` }} />
        </div>
        <div className="op-press-bed" aria-hidden>
          <i />
          <i />
          <i />
        </div>
      </div>
      <div
        className="op-lever-track"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        data-noswipe
      >
        <div
          className="op-lever"
          style={{ transform: `translateY(${pull * 110}px)` }}
          aria-hidden
        />
      </div>
      <button type="button" className="dk-btn small" onClick={() => void slam()}>
        Pull the lever
      </button>
      <p className="dk-hint">Drag the lever down to press the cards.</p>
    </div>
  );
}

/** The Mapmaker: a folded map; three taps unfold it, each fold with a paper rustle. */
export function FoldedMap({ open }: Api) {
  const [folds, setFolds] = useState(0);
  const map = useRef<HTMLButtonElement>(null);
  async function unfold() {
    if (folds >= 3) return;
    const n = folds + 1;
    sfx.peel();
    haptic(6);
    if (!quick())
      void play(
        map.current,
        [{ transform: "scale(.96) rotate(-1deg)" }, { transform: "none" }],
        260,
        { easing: OVERSHOOT },
      );
    setFolds(n);
    if (n === 3) setTimeout(open, quick() ? 0 : 450);
  }
  return (
    <div className="op op-map">
      <button
        ref={map}
        type="button"
        className={`op-map-paper f${folds}`}
        onClick={() => void unfold()}
        aria-label={`Folded map. Tap to unfold (${3 - folds} folds left).`}
      >
        <span className="op-map-grid" aria-hidden />
        <span className="op-map-x" aria-hidden>
          ✕
        </span>
      </button>
      <p className="dk-hint">{folds < 3 ? `Tap to unfold (${3 - folds} left)` : "Here we are…"}</p>
    </div>
  );
}

/** The Fortune Teller: cards laid face-down on velvet as Past, Present, Future. Flip them in the fan. */
export function TarotSpread({ open }: Api) {
  const [laid, setLaid] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!laid) return;
    sfx.riffle();
    Array.from(row.current?.children ?? []).forEach((el, i) =>
      play(
        el,
        [
          { transform: "translateY(-60px) rotate(-20deg)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        380,
        {
          delay: i * 160,
          easing: OVERSHOOT,
          fill: "backwards",
        },
      ),
    );
    const t = setTimeout(open, quick() ? 0 : 1300);
    return () => clearTimeout(t);
  }, [laid, open]);
  return (
    <div className="op op-tarot">
      <div className="op-velvet">
        {laid ? (
          <div ref={row} className="op-tarot-row">
            {["Past", "Present", "Future"].map((l) => (
              <span key={l} className="op-tarot-card">
                <small>{l}</small>
              </span>
            ))}
          </div>
        ) : (
          <p className="op-velvet-line">The cards are waiting.</p>
        )}
      </div>
      {!laid && (
        <button
          type="button"
          className="dk-btn small primary"
          onClick={() => {
            say("Let the cards speak…");
            setLaid(true);
          }}
        >
          Lay out the cards
        </button>
      )}
    </div>
  );
}

/** The Tailor: three reels spin; tap each to stop it. When all three stop, the cards come out. */
export function TailorReels({ open, titles }: Api) {
  const words = useRef<string[]>([]);
  const [stopped, setStopped] = useState<boolean[]>([false, false, false]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    words.current = titles();
  }, [titles]);
  useEffect(() => {
    if (stopped.every(Boolean)) {
      sfx.fanfare();
      const t = setTimeout(open, quick() ? 0 : 500);
      return () => clearTimeout(t);
    }
    if (quick()) return;
    const id = setInterval(() => setTick((t) => t + 1), 90);
    return () => clearInterval(id);
  }, [stopped, open]);
  const w = words.current;
  const at = (i: number) => (w.length ? w[(tick + i * 3) % w.length] : "…");
  return (
    <div className="op op-reels">
      <div className="op-reel-row">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            className={`op-reel${stopped[i] ? " stopped" : ""}`}
            onClick={() => {
              if (stopped[i]) return;
              sfx.clink();
              haptic(8);
              setStopped((s) => s.map((x, j) => (j === i ? true : x)));
            }}
            aria-label={stopped[i] ? `Reel ${i + 1} stopped` : `Stop reel ${i + 1}`}
          >
            <span>{stopped[i] ? (w[i] ?? "…") : at(i)}</span>
          </button>
        ))}
      </div>
      <p className="dk-hint">Tap each reel to stop it.</p>
    </div>
  );
}

/** The Trickster: a card hides under each cup; the cups shuffle, you pick one, then all are revealed. */
export function ShellGame({ open }: Api) {
  const [stage, setStage] = useState<"ready" | "shuffling" | "pick">("ready");
  const cups = useRef<HTMLDivElement>(null);
  async function shuffle() {
    setStage("shuffling");
    say("Keep your eye on the cup…");
    if (!quick()) {
      const els = Array.from(cups.current?.children ?? []);
      for (let r = 0; r < 4; r++) {
        sfx.whoosh();
        const a = r % 3;
        const b = (r + 1) % 3;
        const dx = (b - a) * 96;
        await Promise.all([
          play(
            els[a],
            [
              { transform: "none" },
              { transform: `translate(${dx / 2}px,-24px)` },
              { transform: "none" },
            ],
            260,
          ),
          play(
            els[b],
            [
              { transform: "none" },
              { transform: `translate(${-dx / 2}px,24px)` },
              { transform: "none" },
            ],
            260,
          ),
        ]);
      }
    }
    setStage("pick");
  }
  async function pick(i: number) {
    if (stage !== "pick") return;
    const el = cups.current?.children[i];
    sfx.thup();
    if (!quick())
      await play(
        el,
        [{ transform: "none" }, { transform: "translateY(-70px) rotate(-12deg)" }],
        300,
        { fill: "forwards" },
      );
    say("Ooh. And look what the others hid…");
    open();
  }
  return (
    <div className="op op-shell">
      <div ref={cups} className="op-cups">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            className="op-cup"
            disabled={stage !== "pick"}
            onClick={() => void pick(i)}
            aria-label={`Cup ${i + 1}`}
          >
            <span aria-hidden />
          </button>
        ))}
      </div>
      {stage === "ready" && (
        <button type="button" className="dk-btn small primary" onClick={() => void shuffle()}>
          Shuffle the cups
        </button>
      )}
      <p className="dk-hint">
        {stage === "pick"
          ? "Pick a cup."
          : stage === "shuffling"
            ? "Watch closely…"
            : "A twist hides under every cup."}
      </p>
    </div>
  );
}
