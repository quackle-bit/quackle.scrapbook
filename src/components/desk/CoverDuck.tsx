"use client";

import { STUDIO } from "@/lib/studio";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { feel } from "@/feel";
import { haptic } from "@/lib/motion";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { DuckSprite, type DuckAct } from "../Duck";

/**
 * The cover duck, after the one on quacklebit.com: he perches on the scrapbook, walks along its
 * edge, flies laps around the cover and lands back, dozes off. Tap: quack + hop (tap again quickly
 * and he takes off). Drag: he flaps in your hand; let go over the book and he lands on it, anywhere
 * else he falls, sits stunned, then flies home. Livelier than the duck inside the scrapbook.
 */
const SCALE = 3;
const SIZE = 26 * SCALE;
const FLY = 190; // px/s
const WALK = 34;
const TAP_LINES = ["Quack!", "Hello!", "Open the book!", "Quack quack.", "Hey, that tickles."];
const FLY_LINES = ["Wheee!", "Look, no hands!", "Flap flap flap!"];
const DROP_LINES = ["Oof!", "My feathers…", "I meant to do that."];
const IDLE_LINES = ["Got a game idea?", "This book wants pages.", "*preens*", "Quack."];
/** Now and then he mentions where he lives; these bubbles are links (tap them). */
const STUDIO_LINES: { text: string; href: string }[] = [
  { text: "I live at quackle.bit. Come say hi →", href: STUDIO.url },
  { text: "My team makes pixel games. Peek? →", href: STUDIO.portfolio },
  { text: "Follow quackle.bit for new card packs →", href: STUDIO.connect },
];
const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];

type Mode = "perch" | "walk" | "fly" | "held" | "fall" | "stunned" | "sleep";
type P = { x: number; y: number };

/** Where he sits: on top of the book, right of centre; and the book's top edge to walk along. */
function geoOf(stage: RefObject<HTMLDivElement | null>, book: RefObject<HTMLButtonElement | null>) {
  const s = stage.current?.getBoundingClientRect();
  const b = book.current?.getBoundingClientRect();
  if (!s || !b) return null;
  // The book lies flat on the desk: he stands on the cover, near its top edge.
  const top = b.top - s.top - SIZE + 52;
  return {
    home: { x: b.right - s.left - SIZE - 18, y: top },
    minX: b.left - s.left + 4,
    maxX: b.right - s.left - SIZE - 4,
    bookTop: top,
    floor: s.height - SIZE,
    w: s.width,
    h: s.height,
  };
}

export function CoverDuck({
  stage,
  book,
}: {
  stage: RefObject<HTMLDivElement | null>;
  book: RefObject<HTMLButtonElement | null>;
}) {
  const el = useRef<HTMLDivElement>(null);
  const pos = useRef<P>({ x: -1, y: 0 });
  const mode = useRef<Mode>("perch");
  const path = useRef<P[]>([]);
  const lastTap = useRef(0);
  const drag = useRef<{ dx: number; dy: number; x0: number; y0: number; moved: boolean } | null>(
    null,
  );
  const [act, setAct] = useState<DuckAct | null>(null);
  const [facing, setFacing] = useState<1 | -1>(-1);
  const [line, setLine] = useState<{ text: string; key: number; href?: string } | null>(null);

  const still = () => settings.get().reducedMotion;

  const geo = useCallback(() => geoOf(stage, book), [stage, book]);

  const say = useCallback((text: string, href?: string) => {
    const key = Date.now();
    setLine({ text, key, href });
    // Link lines stay up longer so there's time to tap them.
    setTimeout(() => setLine((l) => (l?.key === key ? null : l)), href ? 5000 : 2200);
  }, []);

  const place = useCallback(() => {
    const d = el.current;
    if (d)
      d.style.transform = `translate(${Math.round(pos.current.x)}px, ${Math.round(pos.current.y)}px)`;
  }, []);

  const flyTo = useCallback((pts: P[]) => {
    path.current = pts;
    mode.current = "fly";
    setAct({ tag: "fly", ms: 1e9 });
    sfx.slide();
  }, []);

  const lap = useCallback(() => {
    const g = geo();
    if (!g) return;
    const r = () => ({
      x: 10 + Math.random() * Math.max(0, g.w - SIZE - 20),
      y: 10 + Math.random() * Math.max(0, g.bookTop - 20),
    });
    flyTo([r(), r(), { ...g.home }]);
  }, [geo, flyTo]);

  const land = useCallback((then: DuckAct | null = { tag: "land", ms: 140 }) => {
    mode.current = "perch";
    setAct(then);
  }, []);

  useEffect(() => {
    const g = geo();
    if (g && pos.current.x < 0) pos.current = { ...g.home };
    place();
    let raf = 0;
    let last = performance.now();
    let think = last + 2500;
    let idleSince = last;
    let stunnedUntil = 0;
    let vy = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g2 = geo();
      const m = mode.current;
      if (g2 && (m === "fly" || m === "walk")) {
        const t = path.current[0];
        if (!t) {
          if (m === "fly") land();
          else mode.current = "perch";
          setAct((a) => (m === "walk" ? null : a));
          idleSince = now;
        } else {
          const dx = t.x - pos.current.x;
          const dy = t.y - pos.current.y;
          const dist = Math.hypot(dx, dy);
          const step = (m === "fly" ? FLY : WALK) * dt;
          if (dist <= step) {
            pos.current = { ...t };
            path.current.shift();
          } else {
            pos.current.x += (dx / dist) * step;
            pos.current.y += (dy / dist) * step;
            // a little bob while flying
            if (m === "fly") pos.current.y += Math.sin(now / 90) * 0.8;
          }
          if (Math.abs(dx) > 1) setFacing(dx > 0 ? 1 : -1);
          place();
        }
      }
      if (g2 && m === "fall") {
        vy += 1400 * dt;
        pos.current.y += vy * dt;
        // Lands on the book if he's above it, otherwise on the floor.
        const overBook = pos.current.x >= g2.minX - 20 && pos.current.x <= g2.maxX + 20;
        const ground = overBook && pos.current.y <= g2.bookTop + 4 ? g2.bookTop : g2.floor;
        if (pos.current.y >= ground) {
          pos.current.y = ground;
          vy = 0;
          sfx.thud();
          haptic(feel.haptic.thud);
          if (ground === g2.bookTop) {
            land();
            say("Nailed it.");
          } else {
            mode.current = "stunned";
            setAct({ tag: "stunned", ms: 1e9 });
            stunnedUntil = now + 1400;
            say(pick(DROP_LINES));
          }
        }
        place();
      }
      // Perched: stay on the book even if the layout shifted (fonts, resize, sheets).
      if (g2 && (m === "perch" || m === "sleep") && Math.abs(pos.current.y - g2.bookTop) > 1) {
        pos.current.y = g2.bookTop;
        pos.current.x = Math.min(Math.max(pos.current.x, g2.minX), g2.maxX);
        place();
      }
      if (g2 && m === "stunned" && now > stunnedUntil) flyTo([{ ...g2.home }]);
      if (g2 && !still() && (m === "perch" || m === "sleep") && now > think) {
        think = now + 3000 + Math.random() * 4000;
        const r = Math.random();
        if (m === "sleep" && r < 0.7) {
          // keep dozing
        } else if (r < 0.3) {
          const x = g2.minX + Math.random() * (g2.maxX - g2.minX);
          path.current = [{ x, y: g2.bookTop }];
          mode.current = "walk";
          setAct({ tag: "walk", ms: 1e9 });
        } else if (r < 0.5) {
          lap();
          if (Math.random() < 0.4) say(pick(FLY_LINES));
        } else if (r < 0.65) {
          setAct({ tag: "jump", ms: 220, then: { tag: "land", ms: 120 } });
        } else if (r < 0.75 && now - idleSince > 15000) {
          mode.current = "sleep";
          setAct({ tag: "sleepy", ms: 1e9 });
        } else if (r < 0.8) {
          say(pick(IDLE_LINES));
        } else if (r < 0.87) {
          const l = STUDIO_LINES[Math.floor(Math.random() * STUDIO_LINES.length)];
          say(l.text, l.href);
        } else {
          setFacing((f) => (f === 1 ? -1 : 1));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onResize = () => {
      const g3 = geo();
      if (g3 && (mode.current === "perch" || mode.current === "sleep")) {
        pos.current = { ...g3.home };
        place();
      }
    };
    window.addEventListener("resize", onResize);
    // The cover settles after fonts load; re-seat him whenever the stage changes size.
    const ro = new ResizeObserver(onResize);
    if (stage.current) ro.observe(stage.current);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [geo, place, land, lap, flyTo, say, stage]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* no capture: taps still work */
    }
    drag.current = {
      dx: pos.current.x,
      dy: pos.current.y,
      x0: e.clientX,
      y0: e.clientY,
      moved: false,
    };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const g = geo();
    if (!d || !g) return;
    const mx = e.clientX - d.x0;
    const my = e.clientY - d.y0;
    if (!d.moved && Math.hypot(mx, my) < 8) return;
    if (!d.moved) {
      d.moved = true;
      path.current = [];
      mode.current = "held";
      setAct({ tag: "fly", ms: 1e9 });
      sfx.quack();
      haptic(10);
      say("Put me down!");
    }
    pos.current = {
      x: Math.max(0, Math.min(g.w - SIZE, d.dx + mx)),
      y: Math.max(0, Math.min(g.floor, d.dy + my)),
    };
    setFacing(mx >= 0 ? 1 : -1);
    place();
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      mode.current = "fall";
      setAct({ tag: "fall", ms: 1e9 });
      return;
    }
    // Tap: quack and hop; a second tap soon after sends him off on a lap.
    const now = performance.now();
    sfx.quack();
    haptic(8);
    if (now - lastTap.current < 1200 && !still()) {
      say(pick(FLY_LINES));
      lap();
    } else if (mode.current !== "fly") {
      say(pick(TAP_LINES));
      if (mode.current === "sleep") mode.current = "perch";
      setAct({ tag: "jump", ms: 240, then: { tag: "land", ms: 120 } });
    }
    lastTap.current = now;
  };

  return (
    <div ref={el} className="cv-duck">
      {line &&
        (line.href ? (
          <a
            key={line.key}
            className="cv-bubble link"
            href={line.href}
            target="_blank"
            rel="noopener"
            aria-live="polite"
          >
            {line.text}
          </a>
        ) : (
          <p key={line.key} className="cv-bubble" aria-live="polite">
            {line.text}
          </p>
        ))}
      <div
        className="cv-duck-body"
        style={{ transform: facing === -1 ? "scaleX(-1)" : undefined }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        role="button"
        tabIndex={0}
        aria-label="The duck. Tap to say hi, tap twice to make him fly."
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            sfx.quack();
            say(pick(TAP_LINES));
            setAct({ tag: "jump", ms: 240, then: { tag: "land", ms: 120 } });
          }
        }}
      >
        <DuckSprite act={act} scale={SCALE} />
      </div>
    </div>
  );
}
