"use client";

import { pageNav, usePageNavLabel } from "./pages/pageNav";
import { Icon } from "../ui/Icon";
import { DuckBubble } from "../feel/DuckBubble";
import { PageStamps, StickerPop, StickerRow } from "../feel/Rewards";
import { earnedStickers, filledPages, type StickerId } from "@/lib/scrapbook/rewards";
import { sfx } from "@/lib/sound";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scrapbookStore, useScrapbook } from "@/lib/scrapbook/store";
import type { PageId } from "@/lib/scrapbook/types";
import { RadioButton } from "../radio/Radio";
import { BottomSheet } from "../ui/BottomSheet";
import { DeskRoot } from "../ui/DeskRoot";
import { SettingsButton } from "../ui/SettingsSheet";
import { usePageCurl } from "../ui/usePageCurl";
import { pagesFor, PageScreen } from "./pages/registry";
import { useSettings } from "@/lib/settings";

/** The open scrapbook: one page at a time, any order, with swipe, buttons and a page index. */
export function ScrapbookShell({ bookId, startPage }: { bookId: string; startPage?: PageId }) {
  const { ready, book, concept } = useScrapbook(bookId);
  const { showExtras } = useSettings();
  const nextLabel = usePageNavLabel();
  const PAGES = useMemo(() => pagesFor(showExtras), [showExtras]);
  const [index, setIndex] = useState(() => {
    const i = PAGES.findIndex((p) => p.id === startPage);
    return i >= 0 ? i : -1;
  });
  const [sheet, setSheet] = useState(false);
  const [fresh, setFresh] = useState<PageId | null>(null);
  const [pop, setPop] = useState<StickerId | null>(null);
  const lastEarned = useRef<{ concept: string; ids: StickerId[] } | null>(null);

  // First render: pick the start page (URL, else where the user left off, else the first page).
  useEffect(() => {
    if (index >= 0 || !book) return;
    const i = PAGES.findIndex((p) => p.id === book.progress.lastPage);
    setIndex(i >= 0 ? i : 0);
  }, [index, book, PAGES]);

  // The route can stay mounted in the background; follow a new ?page= when coming back to it.
  const [seenStart, setSeenStart] = useState(startPage);
  if (startPage !== seenStart) {
    setSeenStart(startPage);
    const i = PAGES.findIndex((p) => p.id === startPage);
    if (i >= 0) setIndex(i);
  }

  const page = PAGES[Math.max(0, index)];
  useEffect(() => {
    if (!book || index < 0) return;
    scrapbookStore.open(book.id);
    if (!book.progress.visitedPages.includes(page.id)) {
      // First time on this page: it gets stamped in the top bar.
      setFresh(page.id);
      sfx.tick();
    }
    scrapbookStore.visitPage(book.id, page.id);
    const url = new URL(window.location.href);
    url.searchParams.set("id", book.id);
    url.searchParams.set("page", page.id);
    window.history.replaceState(null, "", url);
  }, [book, index, page.id]);

  // A sticker pops when a whole part of the scrapbook gets filled in (not on load, not on switching concept).
  const earned = useMemo(
    () => (book && concept ? earnedStickers(book, concept) : []),
    [book, concept],
  );
  const filled = useMemo(
    () => (book && concept ? filledPages(book, concept) : new Set<PageId>()),
    [book, concept],
  );
  useEffect(() => {
    if (!concept) return;
    const prev = lastEarned.current;
    lastEarned.current = { concept: concept.id, ids: earned };
    if (!prev || prev.concept !== concept.id) return;
    const gained = earned.find((id) => !prev.ids.includes(id));
    if (gained) {
      const t = setTimeout(() => setPop(gained), 0);
      return () => clearTimeout(t);
    }
  }, [earned, concept]);
  const closePop = useCallback(() => setPop(null), []);

  const set = useCallback((i: number) => setIndex(i), []);
  const { binding, turn: active, goTo } = usePageCurl(Math.max(0, index), PAGES.length, set);
  const goToId = useCallback(
    (id: PageId) => {
      const i = PAGES.findIndex((p) => p.id === id);
      pageNav.setDir(1); // jumping to a page always opens it at its start
      if (i >= 0) void goTo(i);
    },
    [goTo, PAGES],
  );

  const groups = useMemo(() => {
    const out: { name: string; pages: typeof PAGES }[] = [];
    PAGES.forEach((p) => {
      const g = out.find((x) => x.name === p.group);
      if (g) g.pages.push(p);
      else out.push({ name: p.group, pages: [p] });
    });
    return out;
  }, [PAGES]);

  if (!ready || (book && index < 0)) return <DeskRoot className="dk-shell" />;
  if (!book || !concept)
    return (
      <DeskRoot className="dk-shell">
        <div style={{ margin: "auto", padding: 24, display: "grid", gap: 14, textAlign: "center" }}>
          <h1>That scrapbook isn&apos;t here</h1>
          <p>It may have been deleted, or it was saved in a different browser.</p>
          <Link className="dk-btn primary" href="/">
            Back to the desk
          </Link>
        </div>
      </DeskRoot>
    );

  return (
    <DeskRoot className="dk-shell">
      <header className="dk-topbar">
        <Link href="/" className="dk-icon-btn" aria-label="Back to the desk">
          <Icon name="home" />
        </Link>
        <div className="dk-title">
          <strong>{book.name.trim() || "Untitled scrapbook"}</strong>
          <PageStamps
            pages={PAGES}
            visited={book.progress.visitedPages}
            filled={filled}
            current={page.id}
            fresh={fresh}
          />
        </div>
        <RadioButton />
        <SettingsButton />
      </header>

      <main className="dk-stage">
        <div
          ref={binding}
          className={`dk-binding${active ? (active.dir === 1 ? " turning turn-fwd" : " turning turn-back") : ""}`}
        >
          {active && <span className="dk-flap" aria-hidden />}
          {active && <span className="dk-fold-shadow" aria-hidden />}
          {active && <span className="dk-under-dim" aria-hidden />}
          <div className="dk-stack" aria-hidden />
          {(active ? [active.from, active.to].sort((a, b) => a - b) : [index]).map((i) => {
            const moving = active && i === (active.dir === 1 ? active.from : active.to);
            const under = active && !moving;
            return (
              <div
                key={PAGES[i].id}
                className={`dk-leaf${moving ? " dk-moving" : ""}${under ? " dk-under" : ""}`}
                aria-live={moving || under ? undefined : "polite"}
                inert={!!active}
              >
                <PageScreen book={book} concept={concept} page={PAGES[i]} goTo={goToId} />
              </div>
            );
          })}
        </div>
      </main>

      <nav className="dk-bottomnav" aria-label="Pages">
        <button
          type="button"
          className="dk-btn"
          onClick={() => {
            if (pageNav.back()) return;
            pageNav.setDir(-1);
            void goTo(index - 1);
          }}
          disabled={index === 0}
          aria-label="Previous page"
        >
          <Icon name="chevronLeft" size={18} /> Back
        </button>
        <button type="button" className="dk-btn" onClick={() => setSheet(true)}>
          <span className="dk-nav-page">
            {page.title}
            <small>
              {index + 1} / {PAGES.length}
            </small>
          </span>
        </button>
        <button
          type="button"
          className="dk-btn primary"
          onClick={() => {
            if (pageNav.next()) return;
            pageNav.setDir(1);
            void goTo(index + 1);
          }}
          disabled={index === PAGES.length - 1 && !nextLabel}
          aria-label="Next page"
        >
          {nextLabel ?? "Next"} <Icon name="chevronRight" size={18} />
        </button>
      </nav>

      <BottomSheet open={sheet} title="Pages" onClose={() => setSheet(false)}>
        <Link
          className="dk-btn primary dk-sheet-pitch"
          href={`/scrapbook/summary?id=${book.id}&concept=${concept.id}`}
        >
          View pitch
        </Link>

        <StickerRow earned={earned} />
        <div className="dk-index">
          {groups.map((g) => (
            <div key={g.name}>
              <h3>{g.name}</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                {g.pages.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      aria-current={p.id === page.id ? "page" : undefined}
                      onClick={() => {
                        setSheet(false);
                        goToId(p.id);
                      }}
                    >
                      {p.title}
                      {book.progress.visitedPages.includes(p.id) && (
                        <span className="tick" aria-label="explored">
                          <Icon name="check" size={16} />
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </BottomSheet>
      {pop && <StickerPop id={pop} onDone={closePop} />}
      <DuckBubble />
    </DeskRoot>
  );
}
