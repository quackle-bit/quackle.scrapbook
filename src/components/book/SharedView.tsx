"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { decodeSpread, type SharedSpread } from "@/lib/share";
import { DuckSprite } from "../Duck";
import { SpreadView } from "./SpreadView";

// The spread lives in the URL hash, which only exists in the browser.
const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const getHash = () => window.location.hash;

let cache: { hash: string; value: SharedSpread | null } | null = null;
function decodeCached(hash: string) {
  if (cache?.hash !== hash) cache = { hash, value: decodeSpread(hash) };
  return cache.value;
}

/** Read-only view of a shared spread: turn nothing, edit nothing, just look (and make your own). */
export function SharedView() {
  const hash = useSyncExternalStore(subscribe, getHash, () => "");
  const sp = hash ? decodeCached(hash) : null;

  return (
    <div
      className="proto book-app shared"
      style={{ ["--cover" as string]: sp?.color ?? "#c0392b" }}
    >
      <header className="topbar">
        <Link href="/" className="home-mini" aria-label="quackle.scrapbook home">
          <DuckSprite act={null} scale={1} />
        </Link>
        <span className="counts">
          {sp ? `from “${sp.bookTitle}” · ${sp.date}` : "quackle.scrapbook"}
        </span>
      </header>
      <main className="book-stage">
        <div className="book-binding">
          <div className="book-leaf leaf-paper">
            {sp ? (
              <div className="paper-page">
                <div className="spread-head">
                  <span>a page from someone&apos;s idea book</span>
                  <span className="read-only">read-only</span>
                </div>
                <SpreadView
                  slots={sp.slots}
                  cards={sp.cards}
                  concept={sp.concept}
                  notes={sp.notes}
                />
              </div>
            ) : (
              <div className="paper-page center">
                <DuckSprite act={{ tag: "stunned", ms: 999999 }} />
                <p className="hand-note">
                  {hash ? "This page got crumpled. The link looks broken." : "Loading the page…"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <nav className="page-nav">
        <Link className="big-btn" href="/play">
          Make your own →
        </Link>
      </nav>
    </div>
  );
}
