import type { Concept, SparkNote } from "@/components/book/SpreadView";
import type { CardData, SlotId } from "../deck";

/** Jam rooms (CLAUDE.md §6.2). */

export type Room = {
  id: string;
  code: string;
  theme: string;
  endsAt: string;
  guestCap: number;
  startCoins: number;
  closed: boolean;
};
export type Guest = { userId: string; nickname: string; coins: number };
export type Page = {
  id: string;
  userId: string;
  nickname: string;
  slots: SlotId[];
  cards: Partial<Record<SlotId, CardData>>;
  concept: Concept | null;
  notes: SparkNote[];
  hidden: boolean;
  createdAt: string;
};
export type ReactionKind = "heart" | "fire" | "think";
export type Reaction = { pageId: string; userId: string; kind: ReactionKind };
export type Pull = {
  id: string;
  ownerId: string;
  card: CardData;
  status: "held" | "stamped" | "trashed";
};
export type Trade = {
  id: string;
  fromUser: string;
  toUser: string;
  fromPull: string;
  toPull: string;
  state: "offered" | "accepted" | "declined";
};
export type TeamJoin = { pageId: string; userId: string };

export type RoomSnapshot = {
  room: Room;
  guests: Guest[];
  pages: Page[];
  reactions: Reaction[];
  pulls: Pull[];
  trades: Trade[];
  joins: TeamJoin[];
};

export const isOpen = (r: Room, now = Date.now()) =>
  !r.closed && new Date(r.endsAt).getTime() > now;

export interface JamTransport {
  readonly kind: "local" | "supabase";
  /** Current user id (a per-tab id locally; an anonymous or member auth id on Supabase). */
  userId(): Promise<string>;
  /** May this user open rooms? */
  canHost(): Promise<boolean>;
  /** May this user run this room (hide pages, adopt, close)? */
  isHost(roomId: string): Promise<boolean>;
  createRoom(o: {
    theme: string;
    minutes: number;
    guestCap: number;
    startCoins: number;
  }): Promise<Room>;
  join(code: string, nickname: string): Promise<{ room: Room; guest: Guest }>;
  roomByCode(code: string): Promise<Room | null>;
  snapshot(roomId: string): Promise<RoomSnapshot>;
  subscribe(roomId: string, onChange: () => void): () => void;
  spendCoin(roomId: string): Promise<number>;
  postCards(roomId: string, cards: CardData[]): Promise<void>;
  markPull(pullId: string, status: Pull["status"]): Promise<void>;
  offerTrade(roomId: string, toUser: string, fromPull: string, toPull: string): Promise<void>;
  respondTrade(tradeId: string, accept: boolean): Promise<void>;
  publishPage(
    roomId: string,
    page: Pick<Page, "slots" | "cards" | "concept" | "notes">,
  ): Promise<void>;
  react(pageId: string, kind: ReactionKind, on: boolean): Promise<void>;
  joinIdea(pageId: string, on: boolean): Promise<void>;
  hidePage(pageId: string, hidden: boolean): Promise<void>;
  closeRoom(roomId: string): Promise<void>;
}
