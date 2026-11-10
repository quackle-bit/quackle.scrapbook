"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { decodePitch, type PitchModel } from "@/lib/scrapbook/pitch";
import { SharedView } from "../book/SharedView";
import { DeskRoot } from "../ui/DeskRoot";
import { PitchSpread } from "./PitchSpread";

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const getHash = () => window.location.hash;

let cache: { hash: string; value: PitchModel | null } | null = null;
function decodeCached(hash: string) {
  if (cache?.hash !== hash) cache = { hash, value: decodePitch(hash) };
  return cache.value;
}

/** /s#…: a read-only shared pitch. Old (v1) street links still open in the old viewer. */
export function SharedEntry() {
  const hash = useSyncExternalStore(subscribe, getHash, () => "");
  const model = hash ? decodeCached(hash) : null;
  if (hash && !model) return <SharedView />; // v1 links, or a broken one (that view says so)
  return (
    <DeskRoot className="dk-summary">
      <header className="dk-topbar no-print">
        <Link href="/" className="dk-icon-btn" aria-label="Quackle Scrapbook home">
          ⌂
        </Link>
        <div className="dk-title">
          <strong>A game pitch</strong>
          <small>shared with you · read-only</small>
        </div>
      </header>
      <main className="dk-summary-main">
        {model ? (
          <PitchSpread model={model} />
        ) : (
          <p className="dk-empty" style={{ color: "var(--cream)" }}>
            Loading the pitch…
          </p>
        )}
        <div className="dk-sp-actions no-print">
          <Link className="dk-btn primary" href="/">
            Make your own scrapbook
          </Link>
        </div>
      </main>
    </DeskRoot>
  );
}
