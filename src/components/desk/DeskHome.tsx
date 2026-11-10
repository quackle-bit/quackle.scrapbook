"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAGES } from "../scrapbook/pages/registry";
import { RadioPanel } from "../radio/Radio";
import { BottomSheet } from "../ui/BottomSheet";
import { DeskRoot } from "../ui/DeskRoot";
import { SettingsButton } from "../ui/SettingsSheet";
import { DuckSprite } from "../Duck";
import { scrapbookStore, useScrapbooks } from "@/lib/scrapbook/store";
import { useSettings } from "@/lib/settings";
import { importDone, importOldSpreads, markImportDone } from "@/lib/scrapbook/import";
import { useStore } from "@/lib/store";

function Lamp() {
  return (
    <div className="dk-lamp" aria-hidden>
      <div className="dk-lamp-glow" />
      <svg width="96" height="104" viewBox="0 0 24 26" shapeRendering="crispEdges">
        {/* pixel desk lamp: base, arm, joint, shade, bulb */}
        <rect x="3" y="23" width="12" height="2" fill="#24211f" />
        <rect x="4" y="22" width="10" height="1" fill="#6b645c" />
        <rect x="8" y="14" width="2" height="8" fill="#24211f" />
        <rect x="9" y="12" width="2" height="2" fill="#24211f" />
        <rect x="10" y="10" width="2" height="2" fill="#24211f" />
        <rect x="11" y="9" width="2" height="2" fill="#f5b83d" />
        <rect x="13" y="7" width="2" height="2" fill="#24211f" />
        <rect x="15" y="5" width="2" height="2" fill="#24211f" />
        <rect x="14" y="2" width="8" height="2" fill="#24211f" />
        <rect x="13" y="4" width="10" height="3" fill="#e05a3a" />
        <rect x="12" y="7" width="12" height="1" fill="#24211f" />
        <rect x="16" y="8" width="4" height="1" fill="#f5b83d" />
      </svg>
    </div>
  );
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function DeskHome() {
  const router = useRouter();
  const { ready, scrapbooks, lastId } = useScrapbooks();
  const { musicOn } = useSettings();
  const [list, setList] = useState(false);
  const [radioOpen, setRadioOpen] = useState(false);
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
          <Lamp />
          <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
            <SettingsButton />
            <button
              type="button"
              className={`dk-radio-obj${musicOn ? " playing" : ""}`}
              onClick={() => setRadioOpen(true)}
              aria-label={musicOn ? "Radio, playing. Open controls." : "Radio. Open controls."}
            >
              <span className="dk-radio-dial" aria-hidden />
              <span className="dk-radio-led" aria-hidden />
              <span className="dk-radio-label">{musicOn ? "now playing" : "radio"}</span>
            </button>
          </div>
        </div>

        <div className="dk-desk-title">
          <h1>Quackle Scrapbook</h1>
          <p>Less thinking. More tinkering.</p>
        </div>

        <div className="dk-desk-middle">
          <span className="dk-envelope a" aria-hidden />
          <span className="dk-envelope b" aria-hidden />
          <span className="dk-envelope c" aria-hidden />
          <div className="dk-book" aria-hidden>
            <div className="dk-book-label">
              <strong>{last?.name.trim() || "Game ideas"}</strong>
              <small>
                {last
                  ? `${last.progress.visitedPages.filter((id) => PAGES.some((p) => p.id === id)).length} / ${PAGES.length} pages`
                  : "an empty scrapbook"}
              </small>
            </div>
          </div>
          <div className="dk-desk-duck">
            <DuckSprite act={null} scale={3} />
          </div>
        </div>

        <div className="dk-desk-actions">
          {ready && last ? (
            <Link className="dk-btn primary" href={`/scrapbook?id=${last.id}`}>
              <span>
                Continue Scrapbook
                <small>{last.name.trim() || "Untitled scrapbook"}</small>
              </span>
            </Link>
          ) : (
            <button type="button" className="dk-btn primary" onClick={start} disabled={!ready}>
              Start your first scrapbook
            </button>
          )}
          {last && (
            <button type="button" className="dk-btn" onClick={start}>
              New Scrapbook
            </button>
          )}
          <button
            type="button"
            className="dk-btn ghost"
            onClick={() => setList(true)}
            disabled={!scrapbooks.length}
          >
            My Scrapbooks{scrapbooks.length ? ` (${scrapbooks.length})` : ""}
          </button>
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
          <a href="https://quacklebit.com" rel="noopener">
            Quackle.bit
          </a>
          <Link href="/about">About</Link>
          <Link href="/studio">Studio</Link>
          <Link href="/jam">Jam rooms</Link>
        </footer>
      </main>

      <BottomSheet open={radioOpen} title="Radio" onClose={() => setRadioOpen(false)}>
        <RadioPanel />
      </BottomSheet>

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
