"use client";

import { useSyncExternalStore } from "react";
import { uid } from "../scrapbook/store";
import type { VotingSession, WallComment } from "../scrapbook/types";
import type { WallRepo } from "./types";

const KEY = "qs.wall.v1";
type Data = { sessions: Record<string, VotingSession>; comments: WallComment[] };

const EMPTY: Data = { sessions: {}, comments: [] };
let data: Data = EMPTY;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && typeof raw.sessions === "object")
      data = { sessions: raw.sessions, comments: Array.isArray(raw.comments) ? raw.comments : [] };
  } catch {
    /* start empty */
  }
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      loaded = false;
      load();
      subs.forEach((s) => s());
    }
  });
}
function commit(next: Data) {
  data = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full */
  }
  subs.forEach((s) => s());
}

const blank = (scrapbookId: string): VotingSession => ({
  id: uid(),
  scrapbookId,
  conceptIds: [],
  votes: [],
  status: "closed",
  anonymous: false,
  round: 0,
  voters: [],
});

function patch(scrapbookId: string, fn: (s: VotingSession) => VotingSession) {
  load();
  const cur = data.sessions[scrapbookId] ?? blank(scrapbookId);
  commit({ ...data, sessions: { ...data.sessions, [scrapbookId]: fn(cur) } });
}

/** Saved on this device only. Votes here are one device's votes, not a shared team result. */
export const localWall: WallRepo & {
  subscribe: (cb: () => void) => () => void;
  snapshot: () => Data;
} = {
  kind: "local",
  subscribe(cb) {
    load();
    subs.add(cb);
    return () => subs.delete(cb);
  },
  snapshot() {
    load();
    return data;
  },
  session(scrapbookId) {
    load();
    return data.sessions[scrapbookId] ?? blank(scrapbookId);
  },
  comments(conceptId) {
    load();
    return data.comments.filter((c) => c.conceptId === conceptId);
  },
  startRound(scrapbookId, conceptIds, anonymous) {
    patch(scrapbookId, (s) => ({
      ...s,
      conceptIds,
      votes: [],
      status: "open",
      anonymous,
      round: s.round + 1,
    }));
  },
  closeRound(scrapbookId) {
    patch(scrapbookId, (s) => ({ ...s, status: "closed" }));
  },
  setAnonymous(scrapbookId, anonymous) {
    patch(scrapbookId, (s) => ({ ...s, anonymous }));
  },
  addVoter(scrapbookId, name) {
    const n = name.trim().slice(0, 30);
    if (!n) return;
    patch(scrapbookId, (s) =>
      s.voters.some((v) => v.toLowerCase() === n.toLowerCase())
        ? s
        : { ...s, voters: [...s.voters, n] },
    );
  },
  castVote(scrapbookId, voter, conceptId) {
    load();
    const s = data.sessions[scrapbookId];
    if (!s || s.status !== "open" || !s.conceptIds.includes(conceptId)) return "closed";
    const mine = s.votes.find((v) => v.voter === voter);
    let result: "voted" | "moved" | "removed" = "voted";
    let votes = s.votes.filter((v) => v.voter !== voter);
    if (mine?.conceptId === conceptId) result = "removed";
    else {
      votes = [...votes, { voter, conceptId }];
      if (mine) result = "moved";
    }
    patch(scrapbookId, (x) => ({
      ...x,
      votes,
      voters: x.voters.includes(voter) ? x.voters : [...x.voters, voter],
    }));
    return result;
  },
  addComment(conceptId, author, body) {
    const b = body.trim().slice(0, 500);
    if (!b) return;
    load();
    commit({
      ...data,
      comments: [
        ...data.comments,
        {
          id: uid(),
          conceptId,
          author: author.trim().slice(0, 30) || "Anonymous",
          body: b,
          at: new Date().toISOString(),
        },
      ],
    });
  },
};

/** The wall repo in use. Local for now; a shared one can be returned here when it exists. */
export const wallRepo: WallRepo & {
  subscribe: typeof localWall.subscribe;
  snapshot: typeof localWall.snapshot;
} = localWall;

export function useWall(scrapbookId: string) {
  const snap = useSyncExternalStore(wallRepo.subscribe, wallRepo.snapshot, () => EMPTY);
  return {
    session: snap.sessions[scrapbookId] ?? blank(scrapbookId),
    comments: snap.comments,
    repo: wallRepo,
  };
}
