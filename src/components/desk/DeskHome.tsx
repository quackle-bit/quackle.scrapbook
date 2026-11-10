"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAGES } from "../scrapbook/pages/registry";
import { RadioButton } from "../radio/Radio";
import { BottomSheet } from "../ui/BottomSheet";
import { DeskRoot } from "../ui/DeskRoot";
import { SettingsButton } from "../ui/SettingsSheet";
import { DuckSprite } from "../Duck";
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

  function start() {
    const id = scrapbookStore.createScrapbook();
    router.push(`/scrapbook?id=${id}&page=setup`);
  }

  return (
    <DeskRoot className="dk-desk">
      <main className="dk-desk-main">
        <div className="dk-desk-top">
          <RadioButton />
          <SettingsButton />
        </div>

        <h1 className="dk-cover-title">Quackle Scrapbook</h1>

        <div className="dk-desk-middle">
          <div className="dk-book" aria-hidden>
            <div className="dk-book-label">
              <strong>{last?.name.trim() || "Game ideas"}</strong>
            </div>
          </div>
          <div className="dk-desk-duck">
            <DuckSprite act={null} scale={3} />
          </div>
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
          {last && (
            <div className="dk-cover-links">
              <button type="button" className="dk-link-btn" onClick={start}>
                New scrapbook
              </button>
              <button type="button" className="dk-link-btn" onClick={() => setList(true)}>
                My scrapbooks ({scrapbooks.length})
              </button>
            </div>
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
                Updated {when(s.updatedAt)} · {s.progress.visitedPages.length} / {PAGES.length}{" "}
                pages · {s.conceptIds.length} concept
                {s.conceptIds.length === 1 ? "" : "s"}
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
