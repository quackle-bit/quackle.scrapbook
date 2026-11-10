"use client";

import { Icon } from "../ui/Icon";
import { FullscreenButton } from "../ui/FullscreenButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PAGES } from "../scrapbook/pages/registry";
import { RadioButton } from "../radio/Radio";
import { BottomSheet } from "../ui/BottomSheet";
import { DeskRoot } from "../ui/DeskRoot";
import { SettingsButton } from "../ui/SettingsSheet";
import { CoverDuck } from "./CoverDuck";
import { scrapbookStore, useScrapbooks } from "@/lib/scrapbook/store";
import { importDone, importOldSpreads, markImportDone } from "@/lib/scrapbook/import";
import { useStore } from "@/lib/store";

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function DeskHome() {
  const router = useRouter();
  const { ready, scrapbooks, lastId } = useScrapbooks();
  const [list, setList] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const last = scrapbooks.find((s) => s.id === lastId) ?? scrapbooks[0];
  // Pitches from the first version of the app can be brought across once.
  const old = useStore();
  const [skipImport, setSkipImport] = useState(false);
  const oldCount = old.ready && !skipImport && !importDone() ? old.book.spreads.length : 0;

  const stage = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLButtonElement>(null);
  const visited = last
    ? last.progress.visitedPages.filter((id) => PAGES.some((p) => p.id === id)).length
    : 0;

  function start() {
    const id = scrapbookStore.createScrapbook();
    router.push(`/scrapbook?id=${id}&page=setup`);
  }

  return (
    <DeskRoot className="dk-desk">
      <main className="dk-desk-main">
        <div className="dk-desk-top">
          {/* Your scrapbooks (and New) live here, top left. */}
          <button
            type="button"
            className="dk-icon-btn cv-shelf"
            onClick={() => setList(true)}
            disabled={!ready}
            aria-label={`My scrapbooks (${scrapbooks.length})`}
          >
            <Icon name="library" />
            {scrapbooks.length > 0 && <span className="cv-count">{scrapbooks.length}</span>}
          </button>
          <span className="cv-top-gap" />
          <FullscreenButton />
          <RadioButton />
          <SettingsButton />
        </div>

        {/* The cover: the scrapbook itself, with the duck living on it. */}
        <div ref={stage} className="cv-stage">
          {/* Dust drifting in the lamp light over the desk. */}
          <div className="cv-scene" aria-hidden>
            <span className="cv-motes">
              {Array.from({ length: 7 }, (_, i) => (
                <i key={i} style={{ left: `${18 + i * 11}%`, animationDelay: `${-i * 1.7}s` }} />
              ))}
            </span>
          </div>
          <button
            ref={bookRef}
            type="button"
            className="cv-book"
            onClick={() => (last ? router.push(`/scrapbook?id=${last.id}`) : start())}
            disabled={!ready}
            aria-label={last ? `Open ${last.name.trim() || "your scrapbook"}` : "Start a scrapbook"}
          >
            <span className="cv-spine" aria-hidden />
            <span className="cv-plate">
              <h1>
                Quackle
                <br />
                Scrapbook
              </h1>
              <span className="cv-rule" aria-hidden />
              <small>
                {last
                  ? `${last.name.trim() || "Untitled scrapbook"} · ${visited} / ${PAGES.length} pages`
                  : "Game ideas, one pack at a time"}
              </small>
            </span>
            <span className="cv-ribbon" aria-hidden />
          </button>
          <CoverDuck stage={stage} book={bookRef} />
        </div>

        <div className="dk-desk-actions">
          {ready && last ? (
            <Link className="dk-btn primary" href={`/scrapbook?id=${last.id}`}>
              Continue
            </Link>
          ) : (
            <button type="button" className="dk-btn primary" onClick={start} disabled={!ready}>
              Start a scrapbook
            </button>
          )}
        </div>

        {oldCount > 0 && (
          <div className="dk-import" role="note">
            <p>
              You have {oldCount} pitch{oldCount === 1 ? "" : "es"} from the first version of
              Quackle Scrapbook. Bring {oldCount === 1 ? "it" : "them"} into a new scrapbook?
            </p>
            <div className="dk-row">
              <button
                type="button"
                className="dk-btn small primary"
                onClick={() => {
                  const id = importOldSpreads(old.book.spreads);
                  markImportDone();
                  if (id) router.push(`/scrapbook?id=${id}&page=close`);
                }}
              >
                Import {oldCount === 1 ? "it" : "them"}
              </button>
              <button
                type="button"
                className="dk-btn small ghost"
                onClick={() => {
                  markImportDone();
                  setSkipImport(true);
                }}
              >
                No thanks
              </button>
            </div>
          </div>
        )}

        <footer className="dk-desk-foot">
          <Link href="/about">About</Link>
          <a href="https://quacklebit.com" rel="noopener">
            Quackle.bit
          </a>
        </footer>
      </main>

      <BottomSheet open={list} title="My Scrapbooks" onClose={() => setList(false)}>
        <button type="button" className="dk-btn primary cv-new" onClick={start}>
          <Icon name="plus" size={18} /> New scrapbook
        </button>
        <ul className="dk-list">
          {scrapbooks.map((s) => (
            <li key={s.id} className="dk-list-item">
              {renaming === s.id ? (
                <input
                  className="dk-input"
                  autoFocus
                  defaultValue={s.name}
                  aria-label="Scrapbook name"
                  maxLength={60}
                  onBlur={(e) => {
                    scrapbookStore.updateScrapbook(s.id, { name: e.target.value });
                    setRenaming(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                />
              ) : (
                <h3>{s.name.trim() || "Untitled scrapbook"}</h3>
              )}
              <small>
                Updated {when(s.updatedAt)} ·{" "}
                {s.progress.visitedPages.filter((id) => PAGES.some((p) => p.id === id)).length} /{" "}
                {PAGES.length} pages
              </small>
              <div className="dk-row">
                <Link className="dk-btn small primary" href={`/scrapbook?id=${s.id}`}>
                  Open
                </Link>
                <button type="button" className="dk-btn small" onClick={() => setRenaming(s.id)}>
                  Rename
                </button>
                {confirm === s.id ? (
                  <>
                    <button
                      type="button"
                      className="dk-btn small terra"
                      onClick={() => {
                        scrapbookStore.deleteScrapbook(s.id);
                        setConfirm(null);
                      }}
                    >
                      Delete for good
                    </button>
                    <button
                      type="button"
                      className="dk-btn small ghost"
                      onClick={() => setConfirm(null)}
                    >
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="dk-btn small ghost"
                    onClick={() => setConfirm(s.id)}
                    style={{ color: "var(--terra)" }}
                  >
                    Delete…
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </DeskRoot>
  );
}
