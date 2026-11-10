"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { feel } from "@/feel";
import { haptic } from "@/lib/motion";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { DuckSprite, say, useDuckLine, type DuckAct } from "../Duck";

/**
 * The scrapbook's duck, after the one on quacklebit.com: he wanders along the bottom bar, stops to
 * look around, dozes off, and chats now and then. Tap him: he quacks and hops. Pick him up (drag):
 * he flaps; let go and he falls, lands a bit stunned, then waddles on. Lines from the rest of the
 * app (packs, stamps, the forge) still come through his speech bubble.
 */
const SIZE = 52; // 26 px sprite at 2×
const SPEED = 30; // px per second while walking
const TAP_LINES = ["Quack!", "Hey!", "That tickles.", "Quack quack.", "Yes?", "I'm working here."];
const DROP_LINES = ["Whoa!", "Oof.", "My feathers!", "Again! …no wait."];
const IDLE_LINES = [
  "Take your time.",
  "Packs don't open themselves.",
  "I believe in this game.",
  "Small and finished beats big and stuck.",
  "Stuck? Try a twist.",
  "*waddle waddle*",
];
const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];
const actMs = (a: DuckAct | null | undefined): number => (a ? a.ms + actMs(a.then) : 0);

type Mode = "idle" | "walk" | "sleep" | "held" | "fall" | "busy";

export function DuckBubble() {
  const current = useDuckLine();
  const [hidden, setHidden] = useState<number | null>(null);
  const [act, setAct] = useState<DuckAct | null>(null);
  const [facing, setFacing] = useState<1 | -1>(-1);
  const [side, setSide] = useState<"left" | "right">("right");
  const walker = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -1, y: 0 });
  const target = useRef<number | null>(null);
  const mode = useRef<Mode>("idle");
  const busyUntil = useRef(0);
  const drag = useRef<{ x0: number; y0: number; dx: number; dy: number; moved: boolean } | null>(
    null,
  );

  const still = () => settings.get().reducedMotion;
  const width = () => walker.current?.parentElement?.clientWidth ?? 360;
  const place = useCallback(() => {
    const el = walker.current;
    if (!el) return;
    el.style.transform = `translate(${Math.round(pos.current.x)}px, ${Math.round(-pos.current.y)}px)`;
    setSide(pos.current.x > width() / 2 ? "right" : "left");
  }, []);
  const play = useCallback((a: DuckAct | null, m: Mode = "busy") => {
    setAct(a);
    mode.current = m;
    busyUntil.current = performance.now() + actMs(a);
  }, []);

  // Speech from anywhere in the app: show the line and play its little reaction.
  useEffect(() => {
    if (!current) return;
    if (current.act && mode.current !== "held" && mode.current !== "fall") {
      const t0 = setTimeout(() => play(current.act), 0);
      const t = setTimeout(() => setHidden(current.key), feel.duckLine);
      return () => {
        clearTimeout(t0);
        clearTimeout(t);
      };
    }
    const t = setTimeout(() => setHidden(current.key), feel.duckLine);
    return () => clearTimeout(t);
  }, [current, play]);

  // The wander loop: walk somewhere, stand, look around, doze, chat.
  useEffect(() => {
    if (pos.current.x < 0) pos.current.x = width() - SIZE - 12;
    place();
    let raf = 0;
    let last = performance.now();
    let nextThink = last + 2500;
    let nextChat = last + 30000 + Math.random() * 30000;
    let idleSince = last;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const m = mode.current;
      if (m === "busy" && now > busyUntil.current) {
        mode.current = "idle";
        setAct(null);
        idleSince = now;
      }
      if (m === "walk" && target.current !== null) {
        const dx = target.current - pos.current.x;
        const step = Math.sign(dx) * SPEED * dt;
        if (Math.abs(dx) <= Math.abs(step)) {
          pos.current.x = target.current;
          target.current = null;
          mode.current = "idle";
          setAct(null);
          idleSince = now;
        } else pos.current.x += step;
        place();
      }
      if (m === "fall") {
        pos.current.y = Math.max(0, pos.current.y - 700 * dt);
        place();
        if (pos.current.y === 0) {
          sfx.thud();
          haptic(feel.haptic.thud);
          say(pick(DROP_LINES), { tag: "land", ms: 120, then: { tag: "stunned", ms: 1000 } });
          play({ tag: "land", ms: 120, then: { tag: "stunned", ms: 1000 } });
        }
      }
      if (!still() && (m === "idle" || m === "sleep") && now > nextThink) {
        nextThink = now + 2500 + Math.random() * 4000;
        const r = Math.random();
        if (m === "sleep" && r < 0.6) {
          // keep dozing
        } else if (r < 0.45) {
          const w = width();
          const to = 8 + Math.random() * Math.max(0, w - SIZE - 16);
          if (Math.abs(to - pos.current.x) > 30) {
            target.current = to;
            setFacing(to > pos.current.x ? 1 : -1);
            mode.current = "walk";
            setAct({ tag: "walk", ms: 1e9 });
          }
        } else if (r < 0.6) {
          play({ tag: "jump", ms: 220, then: { tag: "land", ms: 120 } });
        } else if (r < 0.72 && now - idleSince > 12000) {
          mode.current = "sleep";
          setAct({ tag: "sleepy", ms: 1e9 });
        } else {
          setFacing((f) => (f === 1 ? -1 : 1)); // look the other way
        }
      }
      if (!still() && now > nextChat && (m === "idle" || m === "walk")) {
        nextChat = now + 40000 + Math.random() * 40000;
        say(pick(IDLE_LINES));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onResize = () => {
      pos.current.x = Math.min(pos.current.x, width() - SIZE - 8);
      place();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [place, play]);

  // Tap = quack and hop. Drag = pick him up; let go = he falls.
  const down = (e: PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* no capture: the tap still works */
    }
    drag.current = {
      x0: e.clientX,
      y0: e.clientY,
      dx: pos.current.x,
      dy: pos.current.y,
      moved: false,
    };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.x0;
    const my = e.clientY - d.y0;
    if (!d.moved && Math.hypot(mx, my) < 8) return;
    if (!d.moved) {
      d.moved = true;
      target.current = null;
      mode.current = "held";
      setAct({ tag: "fly", ms: 1e9 });
      sfx.quack();
      haptic(10);
    }
    pos.current.x = Math.max(0, Math.min(width() - SIZE, d.dx + mx));
    pos.current.y = Math.max(0, d.dy - my);
    setFacing(mx >= 0 ? 1 : -1);
    place();
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      mode.current = pos.current.y > 2 ? "fall" : "idle";
      setAct(mode.current === "fall" ? { tag: "fall", ms: 1e9 } : null);
      return;
    }
    sfx.quack();
    haptic(8);
    target.current = null;
    say(pick(TAP_LINES));
    play({ tag: "jump", ms: 240, then: { tag: "land", ms: 120 } });
  };

  const visible = current && hidden !== current.key;
  return (
    <div className="dk-duck-lane" aria-live="polite">
      <div ref={walker} className="dk-duck-walker">
        {visible && (
          <p key={current.key} className={`dk-duck-line ${side}`}>
            {current.text}
          </p>
        )}
        <div
          className="dk-duck-body"
          // the sprite faces right; mirror it to walk left
          style={{ transform: facing === -1 ? "scaleX(-1)" : undefined }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          role="button"
          tabIndex={0}
          aria-label="The duck. Tap to say hi."
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              sfx.quack();
              say(pick(TAP_LINES));
              play({ tag: "jump", ms: 240, then: { tag: "land", ms: 120 } });
            }
          }}
          data-noswipe
        >
          <DuckSprite act={act} scale={2} />
        </div>
      </div>
    </div>
  );
}
