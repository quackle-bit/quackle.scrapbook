"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { buildPitchModel } from "@/lib/scrapbook/pitch";
import { useScrapbooks } from "@/lib/scrapbook/store";
import { sfx } from "@/lib/sound";
import { useWall } from "@/lib/wall/local";
import { tally, winners } from "@/lib/wall/types";
import { RadioButton } from "../radio/Radio";
import { DeskRoot } from "../ui/DeskRoot";
import { SettingsButton } from "../ui/SettingsSheet";
import { CompareSheet } from "./CompareSheet";
import { PitchSheet } from "./PitchSheet";
import { VoterSheet } from "./VoterSheet";
import { WallCard } from "./WallCard";

/** Stage 08: where brainstorming becomes a decision. Explore first; vote only when the team starts a round. */
export function PitchWallRoute() {
  const params = useSearchParams();
  const { ready, scrapbooks, concepts, lastId } = useScrapbooks();
  const book = scrapbooks.find((s) => s.id === (params.get("id") ?? lastId));
  const { session, comments, repo } = useWall(book?.id ?? "");
  const [voter, setVoter] = useState("");
  const [voterSheet, setVoterSheet] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [anon, setAnon] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const all = useMemo(
    () => (book ? concepts.filter((c) => c.scrapbookId === book.id) : []),
    [book, concepts],
  );
  const pitched = all.filter((c) => c.status === "pitched");
  const drafts = all.filter((c) => c.status !== "pitched");
  const inRound = session.round > 0;
  const ballotIds = inRound
    ? session.conceptIds.filter((id) => all.some((c) => c.id === id))
    : pitched.map((c) => c.id);
  const t = useMemo(() => tally(session, ballotIds), [session, ballotIds]);
  const won = session.status === "closed" && inRound ? winners(t) : [];
  const open = session.status === "open" && inRound;
  const order = session.status === "closed" && inRound ? t.map((x) => x.conceptId) : ballotIds;
  const models = useMemo(
    () => Object.fromEntries(all.map((c) => [c.id, buildPitchModel(book!, c)])),
    [all, book],
  );

  if (!ready) return <DeskRoot className="dk-shell" />;
  if (!book)
    return (
      <DeskRoot className="dk-shell">
        <div style={{ margin: "auto", padding: 24, display: "grid", gap: 14, textAlign: "center" }}>
          <h1>No scrapbook here</h1>
          <Link className="dk-btn primary" href="/">
            Go to the desk
          </Link>
        </div>
      </DeskRoot>
    );

  const flash = (s: string) => {
    setNote(s);
    setTimeout(() => setNote(null), 2400);
  };
  const myVote = session.votes.find((v) => v.voter === voter)?.conceptId;
  const vote = (conceptId: string) => {
    if (!voter) return setVoterSheet(true);
    const r = repo.castVote(book.id, voter, conceptId);
    sfx.thud();
    flash(
      r === "voted"
        ? `${voter} voted.`
        : r === "moved"
          ? `${voter} changed their vote.`
          : r === "removed"
            ? `${voter} took their vote back.`
            : "Voting is closed.",
    );
  };
  const toggleCompare = (id: string) =>
    setCompare((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : c.length >= 2 ? [c[1], id] : [...c, id],
    );
  const readingModel = reading ? models[reading] : null;
  const voterNames = session.voters;
  const voteCount = session.votes.length;

  return (
    <DeskRoot className="dk-summary">
      <header className="dk-topbar">
        <Link
          href={`/book?id=${book.id}&page=close`}
          className="dk-icon-btn"
          aria-label="Back to the scrapbook"
        >
          ‹
        </Link>
        <div className="dk-title">
          <strong>Pitch Wall</strong>
          <small>{book.name.trim() || "Untitled scrapbook"}</small>
        </div>
        <RadioButton />
        <SettingsButton />
      </header>

      <main className="dk-summary-main">
        <p className="dk-wall-note" role="note">
          Votes and comments here are saved on <b>this device only</b>. To vote together, pass the
          phone around.
        </p>

        <section className="dk-wall-bar paper">
          {!inRound && (
            <>
              <h2>Explore first, vote later</h2>
              <p className="dk-hint">
                Read the pitches, compare them, talk. When the team is ready, start a voting round.
              </p>
              <label className="dk-switch">
                <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
                <span>Anonymous voting (hide who voted for what)</span>
              </label>
              <button
                type="button"
                className="dk-btn primary"
                disabled={pitched.length < 2}
                onClick={() => {
                  repo.startRound(
                    book.id,
                    pitched.map((c) => c.id),
                    anon,
                  );
                  sfx.fanfare();
                }}
              >
                Start voting round
              </button>
              {pitched.length < 2 && (
                <p className="dk-hint">You need at least two pitched concepts to vote.</p>
              )}
            </>
          )}

          {open && (
            <>
              <h2>Round {session.round} · voting is open</h2>
              <div className="dk-row">
                <span className="dk-voter">
                  Voting as <b>{voter || "nobody yet"}</b>
                </span>
                <button type="button" className="dk-btn small" onClick={() => setVoterSheet(true)}>
                  {voter ? "Next voter" : "Choose who's voting"}
                </button>
              </div>
              <p className="dk-hint">
                {voteCount} vote{voteCount === 1 ? "" : "s"} so far ·{" "}
                {session.anonymous ? "anonymous" : "names shown"}. Each person has one vote and can
                change it until you close the round.
              </p>
              <div className="dk-row">
                <button
                  type="button"
                  className="dk-btn terra"
                  onClick={() => repo.closeRound(book.id)}
                >
                  Close the round
                </button>
                <label className="dk-switch" style={{ minHeight: 44 }}>
                  <input
                    type="checkbox"
                    checked={session.anonymous}
                    onChange={(e) => repo.setAnonymous(book.id, e.target.checked)}
                  />
                  <span>Anonymous</span>
                </label>
              </div>
            </>
          )}

          {!open && inRound && (
            <>
              <h2>Round {session.round} · results</h2>
              {won.length === 0 && <p className="dk-wall-result">Nobody voted this round.</p>}
              {won.length === 1 && (
                <p className="dk-wall-result">
                  ★ <b>{models[won[0].conceptId]?.title || "Untitled game"}</b> wins with{" "}
                  {won[0].votes} vote{won[0].votes === 1 ? "" : "s"}.
                </p>
              )}
              {won.length > 1 && (
                <p className="dk-wall-result">
                  It&apos;s a tie at {won[0].votes} vote{won[0].votes === 1 ? "" : "s"}:{" "}
                  <b>{won.map((w) => models[w.conceptId]?.title || "Untitled").join(" and ")}</b>.
                </p>
              )}
              <ol className="dk-results">
                {t.map((x) => (
                  <li key={x.conceptId}>
                    <span>{models[x.conceptId]?.title || "Untitled game"}</span>
                    <span className="dk-bar" aria-hidden>
                      <i style={{ width: `${(x.votes / Math.max(1, t[0].votes)) * 100}%` }} />
                    </span>
                    <b>{x.votes}</b>
                  </li>
                ))}
              </ol>
              {confirmNew ? (
                <div className="dk-row">
                  <button
                    type="button"
                    className="dk-btn terra"
                    onClick={() => {
                      repo.startRound(
                        book.id,
                        pitched.map((c) => c.id),
                        session.anonymous,
                      );
                      setConfirmNew(false);
                    }}
                  >
                    Clear these votes and start round {session.round + 1}
                  </button>
                  <button
                    type="button"
                    className="dk-btn ghost"
                    onClick={() => setConfirmNew(false)}
                  >
                    Keep results
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="dk-btn"
                  onClick={() => setConfirmNew(true)}
                  disabled={pitched.length < 2}
                >
                  Start a new round
                </button>
              )}
            </>
          )}
        </section>

        {pitched.length === 0 && (
          <div className="dk-empty" style={{ color: "var(--cream)" }}>
            <p>
              No pitched concepts yet. Open a concept&apos;s pitch and choose <b>Save as pitched</b>{" "}
              to put it on the wall.
            </p>
          </div>
        )}

        <div className="dk-wall-grid">
          {order.map((id) => {
            const m = models[id];
            const row = t.find((x) => x.conceptId === id);
            if (!m) return null;
            return (
              <WallCard
                key={id}
                model={m}
                votes={row?.votes ?? 0}
                voters={session.anonymous ? [] : (row?.voters ?? [])}
                showVotes={inRound}
                winner={won.some((w) => w.conceptId === id)}
                canVote={open}
                voted={!!voter && myVote === id}
                comparing={compare.includes(id)}
                commentCount={comments.filter((c) => c.conceptId === id).length}
                onRead={() => setReading(id)}
                onVote={() => vote(id)}
                onCompare={() => toggleCompare(id)}
              />
            );
          })}
        </div>

        {inRound && pitched.some((c) => !session.conceptIds.includes(c.id)) && (
          <p className="dk-hint" style={{ color: "var(--amber-soft)" }}>
            Some concepts were pitched after this round started. They join the next round.
          </p>
        )}

        {!!drafts.length && (
          <details className="dk-details" style={{ color: "var(--ink)" }}>
            <summary>Not pitched yet ({drafts.length})</summary>
            <ul className="dk-collection">
              {drafts.map((c) => (
                <li key={c.id} style={{ gridTemplateColumns: "1fr auto" }}>
                  <strong>{models[c.id]?.title || "Untitled concept"}</strong>
                  <Link className="dk-btn small" href={`/pitch?id=${book.id}`}>
                    Open pitch
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </main>

      {compare.length === 2 && (
        <div className="dk-compare-bar no-print">
          <button type="button" className="dk-btn primary" onClick={() => setShowCompare(true)}>
            Compare these two
          </button>
          <button type="button" className="dk-btn ghost" onClick={() => setCompare([])}>
            Clear
          </button>
        </div>
      )}
      {compare.length === 2 && models[compare[0]] && models[compare[1]] && (
        <CompareSheet
          open={showCompare}
          a={models[compare[0]]}
          b={models[compare[1]]}
          onClose={() => setShowCompare(false)}
        />
      )}
      {readingModel && reading && (
        <PitchSheet
          open
          model={readingModel}
          comments={comments.filter((c) => c.conceptId === reading)}
          author={voter}
          canVote={open}
          voted={!!voter && myVote === reading}
          onVote={() => vote(reading)}
          onComment={(a, b) => repo.addComment(reading, a, b)}
          onClose={() => setReading(null)}
        />
      )}
      <VoterSheet
        open={voterSheet}
        voters={voterNames}
        current={voter}
        onPick={(n) => {
          repo.addVoter(book.id, n);
          setVoter(n);
          setVoterSheet(false);
        }}
        onClose={() => setVoterSheet(false)}
      />
      {note && (
        <p className="dk-toast no-print" role="status">
          {note}
        </p>
      )}
    </DeskRoot>
  );
}
