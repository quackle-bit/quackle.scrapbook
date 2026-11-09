"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CardType } from "@/lib/deck";
import { setPoolRules } from "@/lib/deck";
import {
  STATUSES,
  type MintedCard,
  type Status,
  type StudioBook,
  type StudioRepo,
  type StudioSpread,
} from "@/lib/studio/repo";
import { activeBook, useStudioAccess } from "@/lib/studio/useStudio";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { CardFace } from "../Card";
import { DuckSprite } from "../Duck";
import { COVER_COLORS } from "../route/Gate";
import { SpreadDetail } from "./SpreadDetail";
import { pitchOf } from "@/lib/pitch";

/** Studio mode (CLAUDE.md §6.3): the team's library, the Back Room and the way into jam rooms. */
export function StudioApp() {
  const access = useStudioAccess();
  return (
    <div className="proto studio-app">
      <header className="topbar">
        <Link href="/" className="home-mini" aria-label="Home">
          <DuckSprite act={null} scale={1} />
        </Link>
        <span className="counts">
          Studio
          {access.state === "ready"
            ? access.repo.kind === "local"
              ? " · local preview"
              : " · shared library"
            : ""}
        </span>
        {access.state === "ready" && access.repo.kind === "supabase" && (
          <button
            type="button"
            className="act"
            onClick={() => void supabaseBrowser()?.auth.signOut()}
          >
            sign out
          </button>
        )}
      </header>
      <main className="studio-main">
        {access.state === "loading" && <p className="hint">Opening the studio…</p>}
        {access.state === "signed-out" && <Login />}
        {access.state === "not-member" && (
          <div className="panel">
            <h2 className="page-title">Not on the list</h2>
            <p>
              {access.email} isn&apos;t on the studio allowlist. Ask an admin to add it, then sign
              in again.
            </p>
            <button
              type="button"
              className="act"
              onClick={() => void supabaseBrowser()?.auth.signOut()}
            >
              sign out
            </button>
          </div>
        )}
        {access.state === "ready" && <Library repo={access.repo} />}
      </main>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="panel login"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const sb = supabaseBrowser();
        if (!sb) return;
        const { error } = await sb.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/studio`,
            shouldCreateUser: true,
          },
        });
        if (error) setError(error.message);
        else setSent(true);
      }}
    >
      <h2 className="page-title">Studio sign-in</h2>
      {sent ? (
        <p>Check your inbox for a magic link. 🦆</p>
      ) : (
        <>
          <label className="field">
            <span>Studio email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <button type="submit" className="big-btn">
            Send magic link
          </button>
          <p className="hint">Only emails on the studio allowlist get in.</p>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

type Tab = "library" | "backroom";

function Library({ repo }: { repo: StudioRepo }) {
  const [tab, setTab] = useState<Tab>("library");
  const [books, setBooks] = useState<StudioBook[]>([]);
  const [bookId, setBookId] = useState<string | null>(null);
  const [spreads, setSpreads] = useState<StudioSpread[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPoolRules({ allowMythic: true, allowStudioOnly: true }), []);

  const loadBooks = useCallback(async () => {
    try {
      const bs = await repo.listBooks();
      setBooks(bs);
      setBookId((cur) => cur ?? (bs.find((b) => b.id === activeBook.get()) ?? bs[0])?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the library.");
    }
  }, [repo]);
  const loadSpreads = useCallback(async () => {
    if (!bookId) return;
    try {
      setSpreads(await repo.listSpreads(bookId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load spreads.");
    }
  }, [repo, bookId]);

  useEffect(() => void loadBooks(), [loadBooks]);
  useEffect(() => {
    if (bookId) activeBook.set(bookId);
    void loadSpreads();
  }, [bookId, loadSpreads]);
  useEffect(() => {
    const on = () => void loadSpreads();
    window.addEventListener("qs-studio", on);
    return () => window.removeEventListener("qs-studio", on);
  }, [loadSpreads]);

  const book = books.find((b) => b.id === bookId);
  const open = spreads.find((s) => s.id === openId);

  if (open && book) {
    return (
      <SpreadDetail
        sp={open}
        repo={repo}
        bookTitle={book.title}
        onChanged={() => void loadSpreads()}
        onBack={() => setOpenId(null)}
      />
    );
  }

  const shown = spreads.filter((s) => filter === "all" || s.status === filter);

  return (
    <>
      <nav className="tabs studio-tabs" aria-label="Studio">
        <button type="button" aria-current={tab === "library"} onClick={() => setTab("library")}>
          Library
        </button>
        <button type="button" aria-current={tab === "backroom"} onClick={() => setTab("backroom")}>
          Back Room
        </button>
        <Link className="tab-link" href="/jam">
          Jam rooms
        </Link>
      </nav>

      {tab === "backroom" ? (
        <BackRoom repo={repo} />
      ) : (
        <>
          <div className="shelf" role="list" aria-label="Books">
            {books.map((b) => (
              <button
                key={b.id}
                type="button"
                role="listitem"
                className={`spine${b.id === bookId ? " on" : ""}`}
                style={{ ["--cover" as string]: b.color }}
                onClick={() => setBookId(b.id)}
              >
                <span>{b.title}</span>
              </button>
            ))}
            <form
              className="spine new"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newTitle.trim()) return;
                const b = await repo.createBook(
                  newTitle.trim(),
                  COVER_COLORS[books.length % COVER_COLORS.length],
                );
                setNewTitle("");
                await loadBooks();
                setBookId(b.id);
              }}
            >
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="+ new book"
                aria-label="New book title"
                maxLength={60}
              />
            </form>
          </div>

          {book && (
            <section className="panel">
              <div className="row between">
                <h2 className="page-title">{book.title}</h2>
                <Link className="big-btn" href="/play?mode=studio">
                  Walk the studio street →
                </Link>
              </div>
              <div className="row filters" role="radiogroup" aria-label="Filter by status">
                {(["all", ...STATUSES] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={filter === s}
                    className={`chip${filter === s ? " on" : ""}`}
                    onClick={() => setFilter(s)}
                  >
                    {s}{" "}
                    {s === "all" ? spreads.length : spreads.filter((x) => x.status === s).length}
                  </button>
                ))}
              </div>
              {shown.length === 0 ? (
                <p className="hand-note">
                  No spreads here yet. Walk the studio street and they land in this book.
                </p>
              ) : (
                <ul className="spread-list">
                  {shown.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="spread-row" onClick={() => setOpenId(s.id)}>
                        <span className="swatch-mini" aria-hidden>
                          {(s.concept?.palette ?? []).map((c) => (
                            <i key={c} style={{ background: c }} />
                          ))}
                        </span>
                        <strong>{pitchOf(s).title || "Untitled"}</strong>
                        <span className={`chip status-${s.status}`}>{s.status}</span>
                        <small>
                          {pitchOf(s).genre ? `${pitchOf(s).genre} · ` : ""}▲{s.votes.up} · 💬
                          {s.comments.length}
                          {s.creditedTo ? ` · by ${s.creditedTo}` : ""}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

const TYPES: CardType[] = ["seed", "verb", "world", "mood", "look", "twist", "constraint"];

function BackRoom({ repo }: { repo: StudioRepo }) {
  const [cards, setCards] = useState<MintedCard[]>([]);
  const [draft, setDraft] = useState<Omit<MintedCard, "id">>({
    type: "seed",
    text: "",
    rarity: "rare",
    flavor: "",
    tags: [],
  });
  const load = useCallback(async () => setCards(await repo.listCards()), [repo]);
  useEffect(() => void load(), [load]);
  return (
    <section className="panel">
      <h2 className="page-title">The Back Room</h2>
      <p className="hint">
        Mint the studio&apos;s own cards: inside jokes, studio pillars, past project themes. They
        show up in Back Room packs on the studio street (never for visitors or jam guests).
      </p>
      <form
        className="mint-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.text.trim()) return;
          await repo.mintCard({
            ...draft,
            text: draft.text.trim(),
            flavor: draft.flavor?.trim() || undefined,
          });
          setDraft({ ...draft, text: "", flavor: "" });
          await load();
        }}
      >
        <select
          value={draft.type}
          onChange={(e) => setDraft({ ...draft, type: e.target.value as CardType })}
          aria-label="Card type"
        >
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder="card text"
          maxLength={120}
          aria-label="Card text"
          required
        />
        <select
          value={draft.rarity}
          onChange={(e) => setDraft({ ...draft, rarity: e.target.value as MintedCard["rarity"] })}
          aria-label="Rarity"
        >
          {(["common", "uncommon", "rare", "mythic"] as const).map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <input
          value={draft.flavor ?? ""}
          onChange={(e) => setDraft({ ...draft, flavor: e.target.value })}
          placeholder="flavor line (optional)"
          maxLength={140}
          aria-label="Flavor"
        />
        <button type="submit" className="big-btn">
          Mint
        </button>
      </form>
      <div className="card-grid minted">
        {cards.map((c) => (
          <div key={c.id} className="minted-card">
            <CardFace
              card={{
                id: c.id,
                slot: c.type,
                text: c.text,
                rarity: c.rarity,
                tags: c.tags,
                flavor: c.flavor,
                serial: 0,
              }}
              small
            />
            <button
              type="button"
              className="link-btn"
              onClick={async () => (await repo.unmintCard(c.id), load())}
            >
              unmint
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
