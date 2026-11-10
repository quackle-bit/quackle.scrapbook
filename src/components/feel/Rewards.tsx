"use client";

import { STUDIO } from "@/lib/studio";
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
export function Receipt({ book, pagesTotal }: { book: Scrapbook; pagesTotal: number }) {
  const rows: [string, string | number][] = [
    ["Packs opened", book.progress.packsOpened],
    ["Cards kept", book.collected.length],
    ["Cards QUACKED", book.progress.cardsTrashed ?? 0],
    ["Pages explored", `${book.progress.visitedPages.length} / ${pagesTotal}`],
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
 * Forging the pitch, as a scrapbook moment in pixels: a page drops in, every piece you kept gets
 * taped onto it one by one, the title types itself out, and a PITCHED rubber stamp slams down.
 * Tap anywhere to skip to the end.
 */
export function ForgeOverlay({
  pieces,
  title,
  onOpen,
  onClose,
}: {
  pieces: string[];
  title: string;
  tagline?: string;
  onOpen: () => void;
  onClose: () => void;
}) {
  const shown = pieces.slice(0, 8);
  const name = title || "Untitled game";
  const [taped, setTaped] = useState(0);
  const [typed, setTyped] = useState(0);
  const [stamped, setStamped] = useState(false);
  const page = useRef<HTMLDivElement>(null);
  const skip = useRef(false);

  const finish = () => {
    skip.current = true;
    setTaped(shown.length);
    setTyped(name.length);
    setStamped(true);
  };

  useEffect(() => {
    const s = settings.get();
    if (s.reducedMotion || s.speed) {
      const t = setTimeout(finish, 0);
      return () => clearTimeout(t);
    }
    skip.current = false;
    let alive = true;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      sfx.slide();
      await play(
        page.current,
        [
          { transform: "translateY(-40px)", opacity: 0 },
          { transform: "translateY(4px)", opacity: 1, offset: 0.7 },
          { transform: "none", opacity: 1 },
        ],
        320,
        { easing: "steps(5, end)" },
      );
      for (let i = 1; i <= shown.length; i++) {
        if (!alive || skip.current) return;
        setTaped(i);
        sfx.thud();
        haptic(6);
        await wait(230);
      }
      for (let i = 1; i <= name.length; i++) {
        if (!alive || skip.current) return;
        setTyped(i);
        if (i % 2) sfx.tick();
        await wait(45);
      }
      await wait(250);
      if (!alive || skip.current) return;
      setStamped(true);
      sfx.forge();
      haptic(feel.haptic.forge);
      say("Pitched! Look at that.");
      void play(
        page.current,
        [
          { transform: "none" },
          { transform: "translate(-4px, 2px)" },
          { transform: "translate(4px, -2px)" },
          { transform: "translate(-2px, 0)" },
          { transform: "none" },
        ],
        240,
        { easing: "steps(4, end)" },
      );
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = stamped;
  // Rendered at the app root so it covers everything (the page leaf has its own stacking context).
  const root = typeof document !== "undefined" ? document.querySelector(".dk") : null;
  const ui = (
    <div
      className="fg"
      role="dialog"
      aria-label="Forging your pitch"
      onClick={() => !done && finish()}
    >
      <div ref={page} className="fg-page">
        <span className="fg-spine" aria-hidden />
        <p className="fg-kicker">Pitch</p>
        <h2 className="fg-title" aria-label={name}>
          {name.slice(0, typed)}
          {typed < name.length && <span className="fg-caret" aria-hidden />}
        </h2>
        <ul className="fg-pieces">
          {shown.slice(0, taped).map((p, i) => (
            <li key={i}>
              <span className="fg-tape" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
        {stamped && (
          <span className="fg-stamp" aria-hidden>
            Pitched
          </span>
        )}
      </div>
      {done ? (
        <div className="fg-actions" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="dk-btn primary" onClick={onOpen}>
            Open the pitch
          </button>
          <button type="button" className="dk-link-btn fg-back" onClick={onClose}>
            Back to the book
          </button>
          <p className="fg-studio">
            Made something you like? {STUDIO.name} makes games like this.{" "}
            <a href={STUDIO.portfolio} target="_blank" rel="noopener">
              See our games →
            </a>
          </p>
        </div>
      ) : (
        <p className="fg-skip">Tap to skip</p>
      )}
    </div>
  );
  return root ? createPortal(ui, root) : ui;
}
