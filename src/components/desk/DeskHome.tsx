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
      <svg width="120" height="130" viewBox="0 0 120 130">
        <ellipse cx="38" cy="122" rx="28" ry="6" fill="#1d130e" />
        <ellipse cx="38" cy="119" rx="24" ry="5" fill="#3a2a20" />
        <path
          d="M38 118 L48 66 L86 44"
          fill="none"
          stroke="#b68a45"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="48" cy="66" r="5" fill="#d9a85a" />
        <g transform="rotate(-20 92 40)">
          <path d="M68 22 H116 L128 56 H56 Z" fill="#c4623f" />
          <path d="M68 22 H116 L121 36 H63 Z" fill="#d97a55" />
        </g>
        <ellipse cx="94" cy="56" rx="14" ry="5" fill="#ffe2a1" />
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
                  ? `${last.progress.visitedPages.length} / ${PAGES.length} pages`
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
