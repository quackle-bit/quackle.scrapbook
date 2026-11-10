import type { VotingSession, WallComment } from "../scrapbook/types";

/**
 * The Pitch Wall's data layer. The UI only talks to this interface, so a shared (server-backed)
 * wall can be added later without touching it. Today there is one implementation: LocalWallRepo,
 * which saves to this device only. The UI says so, and never presents local votes as a team's.
 */
export interface WallRepo {
  readonly kind: "local" | "shared";
  /** The session for a scrapbook (created empty if there is none yet). */
  session(scrapbookId: string): VotingSession;
  comments(conceptId: string): WallComment[];
  /** Open a new voting round on these concepts. Clears the previous round's votes. */
  startRound(scrapbookId: string, conceptIds: string[], anonymous: boolean): void;
  closeRound(scrapbookId: string): void;
  setAnonymous(scrapbookId: string, anonymous: boolean): void;
  addVoter(scrapbookId: string, name: string): void;
  /** One vote per voter per round. Voting for the same concept again removes it; another moves it. */
  castVote(
    scrapbookId: string,
    voter: string,
    conceptId: string,
  ): "voted" | "moved" | "removed" | "closed";
  addComment(conceptId: string, author: string, body: string): void;
}

export type Tally = { conceptId: string; votes: number; voters: string[] };

/** Votes per concept, most first. */
export function tally(session: VotingSession, conceptIds: string[]): Tally[] {
  return conceptIds
    .map((conceptId) => {
      const v = session.votes.filter((x) => x.conceptId === conceptId);
      return { conceptId, votes: v.length, voters: v.map((x) => x.voter) };
    })
    .sort((a, b) => b.votes - a.votes);
}

/** The winner(s): everyone tied for the most votes (none if nobody voted). */
export function winners(t: Tally[]): Tally[] {
  const top = t[0]?.votes ?? 0;
  return top > 0 ? t.filter((x) => x.votes === top) : [];
}
