"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { scrapbookStore, useScrapbook } from "@/lib/scrapbook/store";
import type { PageId } from "@/lib/scrapbook/types";
import { RadioButton } from "../radio/Radio";
import { BottomSheet } from "../ui/BottomSheet";
import { DeskRoot } from "../ui/DeskRoot";
import { SettingsButton } from "../ui/SettingsSheet";
import { usePageTurn } from "../ui/usePageTurn";
import { PAGES, PageScreen } from "./pages/registry";

/** The open scrapbook: one page at a time, any order, with swipe, buttons and a page index. */
export function ScrapbookShell({ bookId, startPage }: { bookId: string; startPage?: PageId }) {
  const { ready, book, concept } = useScrapbook(bookId);
  const [index, setIndex] = useState(() => {
    const i = PAGES.findIndex((p) => p.id === startPage);
    return i >= 0 ? i : -1;
  });
  const [sheet, setSheet] = useState(false);

  // First render: pick the start page (URL, else where the user left off, else the first page).
  useEffect(() => {
    if (index >= 0 || !book) return;
    const i = PAGES.findIndex((p) => p.id === book.progress.lastPage);
    setIndex(i >= 0 ? i : 0);
  }, [index, book]);

  const page = PAGES[Math.max(0, index)];
  useEffect(() => {
    if (!book || index < 0) return;
    scrapbookStore.open(book.id);
    scrapbookStore.visitPage(book.id, page.id);
    const url = new URL(window.location.href);
    url.searchParams.set("id", book.id);
    url.searchParams.set("page", page.id);
    window.history.replaceState(null, "", url);
  }, [book, index, page.id]);

  const set = useCallback((i: number) => setIndex(i), []);
  const turn = usePageTurn(Math.max(0, index), PAGES.length, set);
  const goToId = useCallback(
    (id: PageId) => {
      const i = PAGES.findIndex((p) => p.id === id);
      if (i >= 0) void turn.goTo(i);
    },
    [turn],
  );

  const groups = useMemo(() => {
    const out: { name: string; pages: typeof PAGES }[] = [];
    PAGES.forEach((p) => {
      const g = out.find((x) => x.name === p.group);
      if (g) g.pages.push(p);
      else out.push({ name: p.group, pages: [p] });
    });
    return out;
  }, []);

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

  const explored = book.progress.visitedPages.length;

  return (
    <DeskRoot className="dk-shell">
      <header className="dk-topbar">
        <Link href="/" className="dk-icon-btn" aria-label="Back to the desk">
          ⌂
        </Link>
        <div className="dk-title">
          <strong>{book.name.trim() || "Untitled scrapbook"}</strong>
          <small>
            {explored} / {PAGES.length} pages explored
          </small>
        </div>
        <RadioButton />
        <SettingsButton />
      </header>

      <main className="dk-stage" onPointerDown={turn.onPointerDown} onPointerUp={turn.onPointerUp}>
        <div className="dk-binding">
          <div ref={turn.leaf} className="dk-leaf" aria-live="polite">
            <PageScreen book={book} concept={concept} page={page} goTo={goToId} />
          </div>
        </div>
      </main>

      <nav className="dk-bottomnav" aria-label="Pages">
        <button
          type="button"
          className="dk-btn"
          onClick={() => void turn.goTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous page"
        >
          ‹
        </button>
        <button type="button" className="dk-btn" onClick={() => setSheet(true)}>
          <span className="dk-nav-page">
            {page.title}
            <small>
              Page {index + 1} of {PAGES.length}
            </small>
          </span>
        </button>
        <button
          type="button"
          className="dk-btn primary"
          onClick={() => void turn.goTo(index + 1)}
          disabled={index === PAGES.length - 1}
          aria-label="Next page"
        >
          ›
        </button>
      </nav>

      <BottomSheet open={sheet} title="Pages" onClose={() => setSheet(false)}>
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
                          ✓
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
    </DeskRoot>
  );
}
