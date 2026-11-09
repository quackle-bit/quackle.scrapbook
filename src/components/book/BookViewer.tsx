"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { SLOT_LABEL, type CardData } from "@/lib/deck";
import { play } from "@/lib/motion";
import { ROUTES } from "@/lib/route";
import { settings, useSettings } from "@/lib/settings";
import { shareUrl } from "@/lib/share";
import { sfx } from "@/lib/sound";
import {
  STICKERS,
  store,
  useStore,
  VISITOR_DAILY_COINS,
  VISITOR_MAX_SPREADS,
  type LocalBook,
  type SavedSpread,
} from "@/lib/store";
import { CardFace } from "../Card";
import { DuckSprite } from "../Duck";
import { COVER_COLORS } from "../route/Gate";
import { SpreadView } from "./SpreadView";

type Page = { key: string; label: string; render: () => ReactNode };

/**
 * The visitor's book (CLAUDE.md §2): cover → inside cover → one spread per idea → discard
 * pile → collection index. Turn pages by swiping, dragging, arrow keys or the buttons.
 */
export function BookViewer() {
  const { book, wallet, ready } = useStore();
  const { muted, speed } = useSettings();
  const [index, setIndex] = useState(0);
  const leaf = useRef<HTMLDivElement>(null);
  const turning = useRef(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const pages: Page[] = [
    { key: "cover", label: "Cover", render: () => <Cover book={book} coinsLeft={wallet.coins} /> },
    { key: "inside", label: "Inside cover", render: () => <InsideCover book={book} /> },
    ...book.spreads.map((sp, i) => ({
      key: sp.id,
      label: sp.concept?.title ?? `Spread ${i + 1}`,
      render: () => <SpreadPage sp={sp} n={i + 1} book={book} />,
    })),
    ...(book.spreads.length === 0
      ? [{ key: "empty", label: "Empty page", render: () => <EmptyPage /> }]
      : []),
    { key: "discard", label: "Discard pile", render: () => <DiscardPage cards={book.discard} /> },
    { key: "collection", label: "Collection", render: () => <CollectionPage book={book} /> },
  ];
  const last = pages.length - 1;
  const safeIndex = Math.min(index, last);

  const turn = useCallback(
    async (dir: 1 | -1) => {
      const target = safeIndex + dir;
      if (turning.current || target < 0 || target > last) return;
      turning.current = true;
      sfx.peel();
      const el = leaf.current;
      const s = settings.get();
      if (s.reducedMotion || s.speed) {
        setIndex(target);
      } else {
        // Page curl: the leaf swings away on its spine, the next one swings in.
        await play(
          el,
          [
            { transform: "perspective(1400px) rotateY(0deg)", filter: "brightness(1)" },
            {
              transform: `perspective(1400px) rotateY(${dir === 1 ? -88 : 88}deg)`,
              filter: "brightness(.75)",
            },
          ],
          220,
          { easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards" },
        );
        setIndex(target);
        await new Promise((r) => setTimeout(r, 20));
        el?.getAnimations().forEach((a) => a.cancel());
        await play(
          el,
          [
            {
              transform: `perspective(1400px) rotateY(${dir === 1 ? 88 : -88}deg)`,
              filter: "brightness(.75)",
            },
            { transform: "perspective(1400px) rotateY(0deg)", filter: "brightness(1)" },
          ],
          260,
          { easing: "cubic-bezier(.1,.6,.3,1)" },
        );
      }
      turning.current = false;
    },
    [safeIndex, last],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") void turn(1);
      if (e.key === "ArrowLeft") void turn(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  // Open on a specific spread: /book#sp123
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const i = pages.findIndex((p) => p.key === id);
    if (i > 0) setIndex(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function onDown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest("button, a, input, .stamped-btn")) return;
    swipe.current = { x: e.clientX, y: e.clientY };
  }
  function onUp(e: PointerEvent) {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) void turn(dx < 0 ? 1 : -1);
  }

  if (!ready) return <div className="proto" aria-busy="true" />;
  const page = pages[safeIndex];

  return (
    <div className="proto book-app" style={{ ["--cover" as string]: book.color }}>
      <header className="topbar">
        <Link href="/" className="home-mini" aria-label="Home">
          <DuckSprite act={null} scale={1} />
        </Link>
        <span className="counts">
          {book.title} · {book.spreads.length}/{VISITOR_MAX_SPREADS} spreads
        </span>
        <span className="toggles">
          <button
            type="button"
            aria-pressed={muted}
            aria-label="Mute"
            onClick={() => settings.set({ muted: !muted })}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            type="button"
            aria-pressed={speed}
            aria-label="Speed mode"
            onClick={() => settings.set({ speed: !speed })}
          >
            {speed ? "⚡ fast" : "⚡ off"}
          </button>
        </span>
      </header>

      <main className="book-stage" onPointerDown={onDown} onPointerUp={onUp}>
        <div className="book-binding">
          <div
            ref={leaf}
            className={`book-leaf leaf-${page.key === "cover" ? "cover" : "paper"}`}
            aria-live="polite"
          >
            {page.render()}
          </div>
        </div>
      </main>

      <nav className="page-nav" aria-label="Pages">
        <button
          type="button"
          className="big-btn"
          onClick={() => void turn(-1)}
          disabled={safeIndex === 0}
          aria-label="Previous page"
        >
          ‹
        </button>
        <div className="page-dots">
          {pages.map((p, i) => (
            <button
              key={p.key}
              type="button"
              className={`dot${i === safeIndex ? " on" : ""}`}
              onClick={() =>
                i !== safeIndex && void turn(i > safeIndex ? 1 : -1).then(() => setIndex(i))
              }
              aria-label={p.label}
              aria-current={i === safeIndex ? "page" : undefined}
            />
          ))}
          <span className="page-label">{page.label}</span>
        </div>
        <button
          type="button"
          className="big-btn"
          onClick={() => void turn(1)}
          disabled={safeIndex === last}
          aria-label="Next page"
        >
          ›
        </button>
      </nav>
    </div>
  );
}

function Cover({ book, coinsLeft }: { book: LocalBook; coinsLeft: number }) {
  const full = book.spreads.length >= VISITOR_MAX_SPREADS;
  return (
    <div className="cover-page">
      <input
        className="cover-title"
        value={book.title}
        maxLength={40}
        onChange={(e) => store.updateBook({ title: e.target.value })}
        aria-label="Book title"
      />
      <div className="swatches" role="radiogroup" aria-label="Cover colour">
        {COVER_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={book.color === c}
            aria-label={`Cover colour ${c}`}
            className={`swatch-btn${book.color === c ? " on" : ""}`}
            style={{ background: c }}
            onClick={() => store.updateBook({ color: c })}
          />
        ))}
      </div>
      <div className="stickers" aria-label={`${book.stickers.length} stickers`}>
        {Object.entries(STICKERS).map(([id, s]) => (
          <span
            key={id}
            className={`sticker${book.stickers.includes(id) ? " got" : ""}`}
            title={s.hint}
          >
            {book.stickers.includes(id) ? s.label : "?"}
          </span>
        ))}
      </div>
      <div className="cover-cta">
        {full ? (
          <p className="hint on-dark">The book is full. Tear out a spread to make room.</p>
        ) : (
          <Link className="big-btn" href="/play">
            Walk the street →
          </Link>
        )}
        <p className="hint on-dark">
          ¢ {coinsLeft}/{VISITOR_DAILY_COINS} coins today · the bazaar refills at midnight
        </p>
      </div>
    </div>
  );
}

function InsideCover({ book }: { book: LocalBook }) {
  return (
    <div className="paper-page">
      <h2 className="page-title">Inside cover</h2>
      <label className="field">
        <span>Today I will NOT make…</span>
        <input
          className="hand"
          value={book.antiGoal}
          maxLength={120}
          onChange={(e) => store.updateBook({ antiGoal: e.target.value })}
          placeholder="(an anti-goal)"
        />
      </label>
      <dl className="book-stats">
        <div>
          <dt>packs opened</dt>
          <dd>{book.stats.packs}</dd>
        </div>
        <div>
          <dt>cards kept</dt>
          <dd>{book.stats.kept}</dd>
        </div>
        <div>
          <dt>QUACKED</dt>
          <dd>{book.stats.trashed}</dd>
        </div>
        <div>
          <dt>ideas forged</dt>
          <dd>{book.stats.forged}</dd>
        </div>
      </dl>
      <p className="hint">Swipe or use ← → to turn the page.</p>
    </div>
  );
}

function EmptyPage() {
  return (
    <div className="paper-page center">
      <DuckSprite act={{ tag: "sleepy", ms: 999999 }} />
      <p className="hand-note">Quack. Empty book? Let&apos;s fix that.</p>
      <Link className="big-btn" href="/play">
        Walk the street →
      </Link>
    </div>
  );
}

function SpreadPage({ sp, n, book }: { sp: SavedSpread; n: number; book: LocalBook }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  async function share() {
    const url = shareUrl(sp, book);
    try {
      if (navigator.share)
        await navigator.share({ title: sp.concept?.title ?? "A game idea", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied("Link copied!");
      }
    } catch {
      setCopied(url);
    }
  }
  return (
    <div className="paper-page">
      <div className="spread-head">
        <span>
          #{n} · {sp.createdAt.slice(0, 10)} · {ROUTES[sp.mode]?.label ?? sp.mode} street
        </span>
        <span className="row">
          <button type="button" className="act" onClick={() => void share()}>
            Share
          </button>
          {confirm ? (
            <>
              <button
                type="button"
                className="act danger"
                onClick={() => {
                  sfx.crumple();
                  store.deleteSpread(sp.id);
                }}
              >
                Tear it out
              </button>
              <button type="button" className="act" onClick={() => setConfirm(false)}>
                keep
              </button>
            </>
          ) : (
            <button type="button" className="act" onClick={() => setConfirm(true)}>
              Tear out…
            </button>
          )}
        </span>
      </div>
      {copied && (
        <p className="hint share-note" role="status">
          {copied}
        </p>
      )}
      <SpreadView slots={sp.slots} cards={sp.cards} concept={sp.concept} notes={sp.notes} />
    </div>
  );
}

function DiscardPage({ cards }: { cards: CardData[] }) {
  return (
    <div className="paper-page">
      <h2 className="page-title">Discard pile · {cards.length}</h2>
      <p className="hint">Nothing good is ever lost. These are the cards you QUACKED.</p>
      <div className="card-grid">
        {cards.length ? (
          cards.map((c) => (
            <div key={c.id} className="discarded">
              <CardFace card={c} small />
              <span className="quacked-stamp">QUACKED</span>
            </div>
          ))
        ) : (
          <p className="hand-note">Nothing trashed yet. Be braver!</p>
        )}
      </div>
    </div>
  );
}

function CollectionPage({ book }: { book: LocalBook }) {
  const entries = Object.values(book.collection);
  const byRarity = { common: 0, uncommon: 0, rare: 0, mythic: 0 } as Record<
    CardData["rarity"],
    number
  >;
  entries.forEach((e) => (byRarity[e.rarity] += 1));
  const types = [...new Set(entries.map((e) => e.type))];
  return (
    <div className="paper-page">
      <h2 className="page-title">Collection · {entries.length} cards</h2>
      <div className="rarity-row">
        {(Object.keys(byRarity) as CardData["rarity"][]).map((r) => (
          <span key={r} className={`rarity-chip r-${r}`}>
            {r} {byRarity[r]}
          </span>
        ))}
      </div>
      {types.length === 0 && (
        <p className="hand-note">Your collection fills up as you walk the street.</p>
      )}
      {types.map((t) => (
        <section key={t} className="collection-group">
          <h3>{SLOT_LABEL[t]}</h3>
          <ul>
            {entries
              .filter((e) => e.type === t)
              .sort((a, b) => b.count - a.count)
              .map((e) => (
                <li key={e.text} className={`r-${e.rarity}`}>
                  <span>{e.text}</span>
                  <small>
                    ×{e.count}
                    {e.kept ? ` · kept ${e.kept}` : ""}
                  </small>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
