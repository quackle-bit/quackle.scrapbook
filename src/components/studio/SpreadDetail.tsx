"use client";

import { useRef, useState } from "react";
import { download, slug, spreadMarkdown, spreadPng } from "@/lib/export";
import { estimateLedger, type Ledger } from "@/lib/ledger";
import { STATUSES, type StudioRepo, type StudioSpread } from "@/lib/studio/repo";
import { sfx } from "@/lib/sound";
import { SpreadView } from "../book/SpreadView";
import { pitchMarkdown, pitchOf, type Pitch } from "@/lib/pitch";
import { PitchCard } from "../pitch/PitchCard";
import { PitchEditor } from "../pitch/PitchEditor";

type Appraisal = {
  pitch: {
    title: string;
    logline: string;
    hook: string;
    core_loop: string;
    look_and_feel: string;
    audience: string;
    why_now: string;
  };
  alternative_twists: { twist: string; why: string }[];
  risks: { risk: string; mitigation: string; severity: "low" | "medium" | "high" }[];
  suggestion: string;
};

/** One spread in the studio library: status, votes, comments, Ledger, Appraiser, export, history. */
export function SpreadDetail({
  sp,
  repo,
  bookTitle,
  onChanged,
  onBack,
}: {
  sp: StudioSpread;
  repo: StudioRepo;
  bookTitle: string;
  onChanged: () => void;
  onBack: () => void;
}) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const ledger: Ledger = (sp.ledger as Ledger | null) ?? estimateLedger(sp.cards);
  const appraisal = sp.appraisal as Appraisal | undefined;
  const savedPitch = pitchOf(sp);
  const [draft, setDraft] = useState<Pitch | null>(null);
  const pitch = draft ?? savedPitch;
  const title = pitch.title || "Untitled";

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function appraise() {
    await run("appraise", async () => {
      const res = await fetch("/api/appraise", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          logline:
            [pitch.tagline, pitch.genre, pitch.platforms.join("/")].filter(Boolean).join(" · ") ||
            sp.concept?.logline,
          cards: sp.slots
            .filter((s) => sp.cards[s])
            .map((s) => ({ slot: s, type: sp.cards[s]!.slot, text: sp.cards[s]!.text })),
          notes: sp.notes.map((n) => ({ q: n.q, a: n.a })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `The Appraiser is unavailable (${res.status}).`);
      await repo.updateSpread(sp.id, { appraisal: body });
      sfx.fanfare();
    });
  }

  return (
    <div className="studio-detail">
      <div className="row between">
        <button type="button" className="link-btn" onClick={onBack}>
          ← {bookTitle}
        </button>
        <span className="hint">
          {sp.creditedTo
            ? `adopted from jam · credit: ${sp.creditedTo}`
            : sp.createdAt.slice(0, 10)}
        </span>
      </div>

      <div ref={pageRef} className="studio-page">
        <PitchCard
          pitch={pitch}
          cards={sp.cards}
          palette={sp.concept?.palette ?? sp.cards.look?.palette}
        />
      </div>
      {draft ? (
        <section className="panel">
          <PitchEditor
            pitch={draft}
            cards={sp.cards}
            onChange={setDraft}
            slots={sp.slots}
            preview={false}
          />
          <div className="row">
            <button
              type="button"
              className="big-btn"
              onClick={() =>
                void run("pitch", async () => {
                  await repo.updateSpread(sp.id, {
                    pitch: draft,
                    concept: sp.concept
                      ? { ...sp.concept, title: draft.title || sp.concept.title }
                      : sp.concept,
                  });
                  setDraft(null);
                })
              }
            >
              Save pitch
            </button>
            <button type="button" className="link-btn" onClick={() => setDraft(null)}>
              cancel
            </button>
          </div>
        </section>
      ) : (
        <button type="button" className="act" onClick={() => setDraft(savedPitch)}>
          Edit pitch
        </button>
      )}
      <details className="behind panel">
        <summary>The cards behind it</summary>
        <SpreadView slots={sp.slots} cards={sp.cards} concept={sp.concept} notes={sp.notes} />
      </details>

      <section className="panel">
        <h3>Status</h3>
        <div className="status-track" role="radiogroup" aria-label="Status">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={sp.status === s}
              className={`status-step${sp.status === s ? " on" : ""}`}
              onClick={() => void run("status", () => repo.updateSpread(sp.id, { status: s }))}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="votes">
          <button
            type="button"
            className={`act${sp.votes.mine === 1 ? " keep" : ""}`}
            aria-pressed={sp.votes.mine === 1}
            onClick={() => void run("vote", () => repo.vote(sp.id, sp.votes.mine === 1 ? 0 : 1))}
          >
            ▲ {sp.votes.up}
          </button>
          <button
            type="button"
            className={`act${sp.votes.mine === -1 ? " danger" : ""}`}
            aria-pressed={sp.votes.mine === -1}
            onClick={() => void run("vote", () => repo.vote(sp.id, sp.votes.mine === -1 ? 0 : -1))}
          >
            ▼ {sp.votes.down}
          </button>
        </div>
      </section>

      <section className="panel">
        <h3>The Appraiser</h3>
        {appraisal ? (
          <div className="appraisal">
            <p className="hand-note">{appraisal.pitch.logline}</p>
            <dl>
              <dt>Hook</dt>
              <dd>{appraisal.pitch.hook}</dd>
              <dt>Core loop</dt>
              <dd>{appraisal.pitch.core_loop}</dd>
              <dt>Look &amp; feel</dt>
              <dd>{appraisal.pitch.look_and_feel}</dd>
              <dt>For</dt>
              <dd>{appraisal.pitch.audience}</dd>
              <dt>Why now</dt>
              <dd>{appraisal.pitch.why_now}</dd>
            </dl>
            <h4>Three other twists</h4>
            <ul>
              {appraisal.alternative_twists.map((t) => (
                <li key={t.twist}>
                  <strong>{t.twist}</strong> — {t.why}
                </li>
              ))}
            </ul>
            <h4>Risks</h4>
            <ul>
              {appraisal.risks.map((r) => (
                <li key={r.risk}>
                  <span className={`sev sev-${r.severity}`}>{r.severity}</span> {r.risk}{" "}
                  <em>→ {r.mitigation}</em>
                </li>
              ))}
            </ul>
            <p className="suggestion">🦆 {appraisal.suggestion}</p>
          </div>
        ) : (
          <p className="hint">
            Claude reads the spread and writes a one-page pitch, three alternative twists and the
            risks.
          </p>
        )}
        <button
          type="button"
          className="big-btn"
          disabled={busy === "appraise"}
          onClick={() => void appraise()}
        >
          {busy === "appraise" ? "Appraising…" : appraisal ? "Ask again" : "Ask the Appraiser"}
        </button>
      </section>

      <section className="panel">
        <h3>
          The Ledger · ~{ledger.hours} h · {ledger.tier}
        </h3>
        <table className="ledger">
          <tbody>
            {ledger.lines.map((l) => (
              <tr key={l.item}>
                <td>
                  {l.item}
                  {l.note && <small>{l.note}</small>}
                </td>
                <td>{l.count}</td>
                <td>{Math.round(l.count * l.hoursEach)} h</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ol className="milestones">
          {ledger.milestones.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ol>
        {!!ledger.risks.length && (
          <ul className="risks">
            {ledger.risks.map((r) => (
              <li key={r}>⚠ {r}</li>
            ))}
          </ul>
        )}
        <p className="hint">
          A rough estimate from the cards: a conversation starter, not a quote.
        </p>
      </section>

      <section className="panel">
        <h3>Comments · {sp.comments.length}</h3>
        <ul className="comments">
          {sp.comments.map((c) => (
            <li key={c.id}>
              <small>
                {c.author} · {c.at.slice(0, 16).replace("T", " ")}
              </small>
              <p>{c.body}</p>
            </li>
          ))}
        </ul>
        <form
          className="comment-form"
          onSubmit={(e) => {
            e.preventDefault();
            const body = comment.trim();
            if (!body) return;
            setComment("");
            void run("comment", () => repo.addComment(sp.id, body));
          }}
        >
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Say something…"
            maxLength={1000}
            aria-label="Comment"
          />
          <button type="submit" className="act">
            Post
          </button>
        </form>
      </section>

      <section className="panel">
        <h3>Export &amp; history</h3>
        <div className="row">
          <button
            type="button"
            className="act"
            onClick={() =>
              download(
                `${slug(title)}.md`,
                pitchMarkdown(pitch, sp.cards) +
                  "\n---\n\n" +
                  spreadMarkdown({ ...sp, ledger }, bookTitle),
                "text/markdown",
              )
            }
          >
            Markdown
          </button>
          <button
            type="button"
            className="act"
            onClick={() =>
              download(
                `${slug(title)}.json`,
                JSON.stringify({ ...sp, ledger }, null, 2),
                "application/json",
              )
            }
          >
            JSON
          </button>
          <button
            type="button"
            className="act"
            onClick={() =>
              pageRef.current &&
              void run("png", () => spreadPng(pageRef.current!, `${slug(title)}.png`))
            }
          >
            PNG
          </button>
        </div>
        <ul className="versions">
          {sp.versions
            .slice()
            .reverse()
            .map((v, i) => (
              <li key={v.at + i}>
                <span>
                  {v.at.slice(0, 16).replace("T", " ")} · {v.concept?.title ?? "unforged"}
                </span>
                {i > 0 && (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() =>
                      void run("restore", () =>
                        repo.updateSpread(sp.id, { cards: v.cards, concept: v.concept }),
                      )
                    }
                  >
                    restore
                  </button>
                )}
              </li>
            ))}
        </ul>
        {confirmDelete ? (
          <div className="row">
            <button
              type="button"
              className="act danger"
              onClick={() => void run("delete", () => repo.deleteSpread(sp.id)).then(onBack)}
            >
              Delete this spread
            </button>
            <button type="button" className="act" onClick={() => setConfirmDelete(false)}>
              keep
            </button>
          </div>
        ) : (
          <button type="button" className="link-btn" onClick={() => setConfirmDelete(true)}>
            delete…
          </button>
        )}
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
