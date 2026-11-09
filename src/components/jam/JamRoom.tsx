"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { setPoolRules, SLOT_LABEL, type CardData } from "@/lib/deck";
import { isOpen, type Page, type ReactionKind, type RoomSnapshot } from "@/lib/jam/types";
import { fmtClock, getJam, useCountdown, useRoom } from "@/lib/jam/useJam";
import { cutList } from "@/lib/ledger";
import { sfx } from "@/lib/sound";
import { activeBook, useStudioAccess } from "@/lib/studio/useStudio";
import { CardFace } from "../Card";
import { DuckSprite, say } from "../Duck";
import { SpreadView } from "../book/SpreadView";
import { Route } from "../route/Route";

type Tab = "walk" | "album" | "trade";
const REACTIONS: { kind: ReactionKind; icon: string; label: string }[] = [
  { kind: "heart", icon: "❤", label: "love" },
  { kind: "fire", icon: "🔥", label: "fire" },
  { kind: "think", icon: "🤔", label: "hmm" },
];

/** /jam/room?code=XXXXX — the room: walk the theme street, trade cards, read the album. */
export function JamRoomFromQuery() {
  const code = useSearchParams().get("code") ?? "";
  const [roomId, setRoomId] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    void getJam()
      .roomByCode(code)
      .then(
        (r) => (r ? setRoomId(r.id) : setMissing(true)),
        () => setMissing(true),
      );
  }, [code]);
  if (missing)
    return (
      <div className="proto jam-app">
        <main className="jam-main">
          <div className="panel">
            <h2 className="page-title">No room “{code}”</h2>
            <Link className="big-btn" href="/jam">
              Back to the lobby
            </Link>
          </div>
        </main>
      </div>
    );
  return roomId ? <JamRoom roomId={roomId} /> : <div className="proto" aria-busy="true" />;
}

function JamRoom({ roomId }: { roomId: string }) {
  const { jam, snap, me, error, setError } = useRoom(roomId);
  const [tab, setTab] = useState<Tab>("walk");
  const [canHost, setCanHost] = useState(false);
  const left = useCountdown(snap?.room.endsAt, snap?.room.closed);

  useEffect(() => {
    setPoolRules({ allowMythic: false, allowStudioOnly: false });
    void jam.canHost().then(setCanHost, () => setCanHost(false));
  }, [jam]);

  if (!snap || !me) return <div className="proto" aria-busy="true" />;
  const room = snap.room;
  const open = isOpen(room) && left > 0;
  const guest = snap.guests.find((g) => g.userId === me);
  const offersToMe = snap.trades.filter((t) => t.toUser === me && t.state === "offered").length;

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <div className="proto jam-app jam-room">
      <header className="topbar jam-head">
        <Link href="/jam" className="home-mini" aria-label="Jam lobby">
          <DuckSprite act={null} scale={1} />
        </Link>
        <span className="counts">
          <strong className="theme-tag">{room.theme}</strong> · room {room.code} ·{" "}
          {snap.guests.length}/{room.guestCap} guests
        </span>
        <span
          className={`route-timer${open && left <= 60 ? " low" : ""}`}
          aria-label={open ? `Market closes in ${fmtClock(left)}` : "Market closed"}
        >
          {open ? fmtClock(left) : "CLOSED"}
        </span>
      </header>

      {!guest ? (
        open ? (
          <JoinForm onJoin={(nick) => act(() => jam.join(room.code, nick))} />
        ) : (
          <p className="hint jam-note">The market has closed. You can still read the album.</p>
        )
      ) : null}

      <nav className="tabs jam-tabs" aria-label="Room">
        {guest && (
          <button type="button" aria-current={tab === "walk"} onClick={() => setTab("walk")}>
            Walk
          </button>
        )}
        <button type="button" aria-current={tab === "album"} onClick={() => setTab("album")}>
          Album · {snap.pages.filter((p) => !p.hidden).length}
        </button>
        {guest && (
          <button type="button" aria-current={tab === "trade"} onClick={() => setTab("trade")}>
            Trading post{offersToMe ? ` · ${offersToMe}!` : ""}
          </button>
        )}
      </nav>

      {error && (
        <p className="error jam-note" role="alert">
          {error}
        </p>
      )}

      {/* The street stays mounted so traded cards can be taped in from the trading post. */}
      {guest && (
        <div className="jam-walk" hidden={tab !== "walk"}>
          {open || snap.pages.some((p) => p.userId === me) ? (
            <Route
              key={room.id}
              modes={["jam"]}
              initialGate={{
                mode: "jam",
                theme: room.theme,
                title: `${guest.nickname}'s jam page`,
              }}
              lockTheme
              coins={guest.coins}
              onSpendCoin={() => {
                if (!open || guest.coins <= 0) return false;
                void jam.spendCoin(room.id).catch((e) => {
                  setError(e instanceof Error ? e.message : "Couldn't pay.");
                });
                return true;
              }}
              onDiscarded={(cards) => {
                if (open && cards.length) void jam.postCards(room.id, cards).catch(() => undefined);
              }}
              onFinish={(run) =>
                void act(async () => {
                  await jam.publishPage(room.id, {
                    slots: run.slots,
                    cards: run.cards,
                    concept: run.concept,
                    notes: run.notes,
                  });
                  say("Your page is in the Jam Album!", {
                    tag: "fly",
                    ms: 900,
                    then: { tag: "land", ms: 120 },
                  });
                })
              }
              finishActions={(_run, restart) => (
                <>
                  <button type="button" className="big-btn" onClick={() => setTab("album")}>
                    See the album →
                  </button>
                  {open && (
                    <button type="button" className="link-btn" onClick={restart}>
                      revise my page
                    </button>
                  )}
                </>
              )}
            />
          ) : (
            <p className="hint jam-note">The market closed before you walked the street.</p>
          )}
        </div>
      )}

      {tab === "album" && <Album snap={snap} me={me} open={open} canHost={canHost} act={act} />}
      {tab === "trade" && guest && <TradingPost snap={snap} me={me} open={open} act={act} />}

      {canHost && (
        <section className="panel host-tools jam-main">
          <h3>Host</h3>
          <p className="hint">
            Share the code <strong>{room.code}</strong> or link:{" "}
            <code>/jam/room?code={room.code}</code>
          </p>
          {open && (
            <button
              type="button"
              className="act danger"
              onClick={() => void act(() => jam.closeRoom(room.id))}
            >
              Close the market now
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function JoinForm({ onJoin }: { onJoin: (nick: string) => Promise<void> }) {
  const [nick, setNick] = useState("");
  return (
    <form
      className="panel jam-form jam-main"
      onSubmit={(e) => {
        e.preventDefault();
        if (nick.trim()) void onJoin(nick.trim());
      }}
    >
      <label className="field">
        <span>Pick a nickname to join</span>
        <input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={24} required />
      </label>
      <button type="submit" className="big-btn">
        Join
      </button>
    </form>
  );
}

function Album({
  snap,
  me,
  open,
  canHost,
  act,
}: {
  snap: RoomSnapshot;
  me: string;
  open: boolean;
  canHost: boolean;
  act: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const jam = getJam();
  const studio = useStudioAccess();
  const [cutFor, setCutFor] = useState<string | null>(null);
  const [adopted, setAdopted] = useState<Set<string>>(new Set());
  const score = (p: Page) => snap.reactions.filter((r) => r.pageId === p.id).length;
  const pages = snap.pages
    .filter((p) => !p.hidden || canHost)
    .sort((a, b) => (open ? 0 : score(b) - score(a)));
  const top = new Set(
    open
      ? []
      : pages
          .filter((p) => !p.hidden)
          .slice(0, 3)
          .map((p) => p.id),
  );
  const nick = (uid: string) => snap.guests.find((g) => g.userId === uid)?.nickname ?? "someone";

  if (!pages.length)
    return <p className="hand-note jam-note">No pages yet. Forge one and it lands here.</p>;

  return (
    <div className="album jam-main">
      {!open && (
        <p className="hint">The market is closed. The top-voted ideas are forming teams.</p>
      )}
      {pages.map((p) => {
        const mine = (k: ReactionKind) =>
          snap.reactions.some((r) => r.pageId === p.id && r.userId === me && r.kind === k);
        const joiners = snap.joins.filter((j) => j.pageId === p.id);
        const joined = joiners.some((j) => j.userId === me);
        return (
          <article key={p.id} className={`panel album-page${p.hidden ? " hidden-page" : ""}`}>
            <div className="row between">
              <strong>
                {p.nickname}
                {p.userId === me ? " (you)" : ""}
              </strong>
              {top.has(p.id) && <span className="chip on">top idea</span>}
            </div>
            <SpreadView slots={p.slots} cards={p.cards} concept={p.concept} notes={p.notes} />
            <div className="row reactions" role="group" aria-label="React">
              {REACTIONS.map((r) => {
                const n = snap.reactions.filter(
                  (x) => x.pageId === p.id && x.kind === r.kind,
                ).length;
                return (
                  <button
                    key={r.kind}
                    type="button"
                    className={`act${mine(r.kind) ? " keep" : ""}`}
                    aria-pressed={mine(r.kind)}
                    aria-label={`${r.label} (${n})`}
                    onClick={() => {
                      sfx.thup();
                      void act(() => jam.react(p.id, r.kind, !mine(r.kind)));
                    }}
                  >
                    {r.icon} {n}
                  </button>
                );
              })}
              <button
                type="button"
                className="link-btn"
                onClick={() => setCutFor(cutFor === p.id ? null : p.id)}
              >
                48h cut list
              </button>
            </div>
            {cutFor === p.id && (
              <ul className="cut-list">
                {cutList(p.cards).map((c) => (
                  <li key={c}>✂ {c}</li>
                ))}
              </ul>
            )}
            {top.has(p.id) && (
              <div className="team">
                <button
                  type="button"
                  className={`big-btn${joined ? " forge lit" : ""}`}
                  onClick={() => void act(() => jam.joinIdea(p.id, !joined))}
                >
                  {joined ? "You're on this team ✓" : "Join this idea"}
                </button>
                <span className="hint">
                  {joiners.length
                    ? `team: ${joiners.map((j) => nick(j.userId)).join(", ")}`
                    : "no one yet"}
                </span>
              </div>
            )}
            {canHost && (
              <div className="row host-row">
                <button
                  type="button"
                  className="act"
                  onClick={() => void act(() => jam.hidePage(p.id, !p.hidden))}
                >
                  {p.hidden ? "unhide" : "hide"}
                </button>
                {studio.state === "ready" && (
                  <button
                    type="button"
                    className="act"
                    disabled={adopted.has(p.id)}
                    onClick={() =>
                      void act(async () => {
                        const repo = studio.repo;
                        const books = await repo.listBooks();
                        const target = books.find((b) => b.id === activeBook.get()) ?? books[0];
                        await repo.addSpread(target.id, {
                          slots: p.slots,
                          cards: p.cards,
                          concept: p.concept,
                          notes: p.notes,
                          creditedTo: p.nickname,
                        });
                        setAdopted((s) => new Set(s).add(p.id));
                        say(`Adopted into “${target.title}”, credited to ${p.nickname}.`);
                      })
                    }
                  >
                    {adopted.has(p.id) ? "adopted ✓" : "adopt to studio"}
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function TradingPost({
  snap,
  me,
  open,
  act,
}: {
  snap: RoomSnapshot;
  me: string;
  open: boolean;
  act: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const jam = getJam();
  const [want, setWant] = useState<string | null>(null);
  const held = snap.pulls.filter((p) => p.status === "held");
  const mine = held.filter((p) => p.ownerId === me);
  const theirs = held.filter((p) => p.ownerId !== me);
  const wanted = theirs.find((p) => p.id === want);
  const nick = (uid: string) => snap.guests.find((g) => g.userId === uid)?.nickname ?? "someone";
  const pullById = useMemo(() => new Map(snap.pulls.map((p) => [p.id, p])), [snap.pulls]);
  const incoming = snap.trades.filter((t) => t.toUser === me && t.state === "offered");
  const outgoing = snap.trades.filter((t) => t.fromUser === me && t.state === "offered");
  // Cards that came to me through an accepted trade, still unused.
  const received = snap.trades
    .filter((t) => t.state === "accepted" && (t.toUser === me || t.fromUser === me))
    .map((t) => pullById.get(t.toUser === me ? t.fromPull : t.toPull))
    .filter((p): p is NonNullable<typeof p> => !!p && p.ownerId === me && p.status === "held");
  const seenTrades = useRef(new Set<string>());
  useEffect(() => {
    incoming.forEach((t) => {
      if (!seenTrades.current.has(t.id)) {
        seenTrades.current.add(t.id);
        sfx.tink();
      }
    });
  }, [incoming]);

  const card = (c: CardData) => <CardFace card={c} small />;

  return (
    <div className="trade jam-main">
      {!open && <p className="hint">The market is closed: no more trades.</p>}

      {!!incoming.length && (
        <section className="panel">
          <h3>Offers for you</h3>
          {incoming.map((t) => {
            const give = pullById.get(t.toPull);
            const get = pullById.get(t.fromPull);
            return (
              <div key={t.id} className="offer">
                <span className="hint">{nick(t.fromUser)} offers</span>
                <div className="offer-cards">
                  {get && card(get.card)}
                  <span aria-hidden>⇄</span>
                  {give && card(give.card)}
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="act keep"
                    disabled={!open}
                    onClick={() => void act(() => jam.respondTrade(t.id, true))}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="act"
                    onClick={() => void act(() => jam.respondTrade(t.id, false))}
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {!!received.length && (
        <section className="panel">
          <h3>Traded to you</h3>
          <div className="card-grid">
            {received.map((p) => (
              <div key={p.id} className="minted-card">
                {card(p.card)}
                <button
                  type="button"
                  className="act keep"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("qs-stamp-card", {
                        detail: {
                          card: p.card,
                          done: (ok: boolean, why?: string) =>
                            ok
                              ? void act(() => jam.markPull(p.id, "stamped"))
                              : say(why ?? "Can't tape that in."),
                        },
                      }),
                    )
                  }
                >
                  Tape into {SLOT_LABEL[p.card.slot]}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h3>On the post · {theirs.length}</h3>
        <p className="hint">
          Cards other guests trashed or left over. Tap one you want, then offer one of yours.
        </p>
        <div className="card-grid">
          {theirs.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`pick${want === p.id ? " on" : ""}`}
              onClick={() => setWant(want === p.id ? null : p.id)}
            >
              {card(p.card)}
              <small>{nick(p.ownerId)}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>
          {wanted
            ? `Offer one of yours for “${wanted.card.text}”`
            : `Your cards on the post · ${mine.length}`}
        </h3>
        {!mine.length && (
          <p className="hint">Trash or leave cards on the street and they show up here to trade.</p>
        )}
        <div className="card-grid">
          {mine.map((p) => (
            <button
              key={p.id}
              type="button"
              className="pick"
              disabled={!wanted || !open}
              onClick={() =>
                wanted &&
                void act(async () => {
                  await jam.offerTrade(snap.room.id, wanted.ownerId, p.id, wanted.id);
                  setWant(null);
                  say("Offer sent!");
                })
              }
            >
              {card(p.card)}
            </button>
          ))}
        </div>
        {!!outgoing.length && (
          <p className="hint">{outgoing.length} offer(s) waiting for an answer.</p>
        )}
      </section>
    </div>
  );
}
