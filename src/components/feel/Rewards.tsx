"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { feel } from "@/feel";
import { haptic, play } from "@/lib/motion";
import { STICKERS, type StickerId } from "@/lib/scrapbook/rewards";
import type { PageId, Scrapbook } from "@/lib/scrapbook/types";
import { settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { say } from "../Duck";

/** A row of ink stamps, one per page: hollow = not opened yet, stamped = opened, ✓ = has something in it. */
export function PageStamps({
  pages,
  visited,
  filled,
  current,
  fresh,
}: {
  pages: { id: PageId; title: string }[];
  visited: PageId[];
  filled: Set<PageId>;
  current: PageId;
  fresh: PageId | null;
}) {
  return (
    <span
      className="dk-stamps"
      role="img"
      aria-label={`${visited.length} of ${pages.length} pages explored, ${filled.size} filled in`}
    >
      {pages.map((p) => (
        <i
          key={p.id}
          className={`${visited.includes(p.id) ? "on" : ""}${filled.has(p.id) ? " full" : ""}${p.id === current ? " here" : ""}${p.id === fresh ? " fresh" : ""}`}
        />
      ))}
    </span>
  );
}

/** A sticker slaps onto the screen when a part of the scrapbook is complete. */
export function StickerPop({ id, onDone }: { id: StickerId; onDone: () => void }) {
  const s = STICKERS.find((x) => x.id === id)!;
  useEffect(() => {
    sfx.fanfare();
    haptic(feel.haptic.thud);
    say(`Sticker! “${s.label}”`, { tag: "jump", ms: 300, then: { tag: "land", ms: 120 } });
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [s, onDone]);
  return (
    <div className="dk-sticker-pop" role="status" onClick={onDone}>
      <div className={`dk-sticker big s-${id}`}>
        <small>Sticker earned</small>
        <strong>{s.label}</strong>
      </div>
    </div>
  );
}

export function StickerRow({ earned }: { earned: StickerId[] }) {
  return (
    <div className="dk-sticker-row" aria-label="Stickers">
      {STICKERS.map((s) => (
        <span
          key={s.id}
          className={`dk-sticker s-${s.id}${earned.includes(s.id) ? "" : " missing"}`}
          title={s.label}
        >
          {earned.includes(s.id) ? s.label : "?"}
        </span>
      ))}
    </div>
  );
}

/** A printed receipt of the session: what you opened, kept and threw away. */
export function Receipt({
  book,
  concepts,
  pagesTotal,
}: {
  book: Scrapbook;
  concepts: number;
  pagesTotal: number;
}) {
  const rows: [string, string | number][] = [
    ["Packs opened", book.progress.packsOpened],
    ["Cards kept", book.collected.length],
    ["Cards QUACKED", book.progress.cardsTrashed ?? 0],
    ["Pages explored", `${book.progress.visitedPages.length} / ${pagesTotal}`],
    ["Concepts", concepts],
  ];
  return (
    <div className="dk-receipt" aria-label="Receipt">
      <p className="dk-receipt-head">
        <strong>QUACKLE SCRAPBOOK</strong>
        <br />
        {book.name.trim() || "Untitled scrapbook"}
        <br />
        {new Date().toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="dk-receipt-foot">Thank you for tinkering.</p>
    </div>
  );
}

/**
 * The finale: the cards you kept lift off, gather, flash and land as one polaroid of the pitch.
 * Tap to skip; reduced motion goes straight to the polaroid.
 */
export function ForgeOverlay({
  pieces,
  title,
  tagline,
  onOpen,
  onClose,
}: {
  pieces: string[];
  title: string;
  tagline?: string;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<"gather" | "done">("gather");
  const ring = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const skipped = useRef(false);

  useEffect(() => {
    const s = settings.get();
    if (s.reducedMotion || s.speed || pieces.length === 0) {
      const t = setTimeout(() => setStage("done"), 0);
      return () => clearTimeout(t);
    }
    skipped.current = false;
    sfx.forge();
    haptic(feel.haptic.forge);
    const els = Array.from(ring.current?.children ?? []) as HTMLElement[];
    const anims = els.map((el, i) => {
      const a = (i / els.length) * Math.PI * 2;
      const r = 130;
      return play(
        el,
        [
          {
            transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px) rotate(${i * 23 - 30}deg) scale(1)`,
            opacity: 1,
          },
          {
            transform: `translate(${Math.cos(a + 1.2) * r * 0.6}px, ${Math.sin(a + 1.2) * r * 0.6}px) rotate(${i * 60}deg) scale(.8)`,
            opacity: 1,
            offset: 0.6,
          },
          { transform: "translate(0,0) rotate(360deg) scale(.2)", opacity: 0 },
        ],
        1500,
        { delay: i * 60, easing: "cubic-bezier(.5,0,.6,1)", fill: "forwards" },
      );
    });
    void Promise.all(anims).then(async () => {
      if (skipped.current) return;
      await play(flash.current, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], 450);
      setStage("done");
    });
    return () => {
      skipped.current = true;
    };
  }, [pieces.length]);

  // Rendered at the app root so it covers everything (the page leaf has its own stacking context).
  const root = typeof document !== "undefined" ? document.querySelector(".dk") : null;
  const ui = (
    <div
      className="dk-forge"
      role="dialog"
      aria-label="Forging your pitch"
      onClick={() => stage === "gather" && setStage("done")}
    >
      {stage === "gather" && (
        <div ref={ring} className="dk-forge-ring" aria-hidden>
          {pieces.map((p, i) => (
            <span key={i}>{p}</span>
          ))}
        </div>
      )}
      <div ref={flash} className="dk-forge-flash" aria-hidden />
      {stage === "done" && (
        <div className="dk-forge-done" onClick={(e) => e.stopPropagation()}>
          <figure className="dk-polaroid">
            <div className="dk-polaroid-pic">
              <strong>{title || "Untitled game"}</strong>
              {tagline && <span>“{tagline}”</span>}
            </div>
            <figcaption>{title || "Untitled game"}</figcaption>
          </figure>
          <div className="dk-row" style={{ justifyContent: "center" }}>
            <button type="button" className="dk-btn primary" onClick={onOpen}>
              Open the pitch
            </button>
            <button type="button" className="dk-btn ghost" onClick={onClose}>
              Back to the book
            </button>
          </div>
        </div>
      )}
    </div>
  );
  return root ? createPortal(ui, root) : ui;
}
