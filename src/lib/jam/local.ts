"use client";

import type { CardData } from "../deck";
import {
  isOpen,
  type Guest,
  type JamTransport,
  type Page,
  type Pull,
  type ReactionKind,
  type Room,
  type RoomSnapshot,
  type TeamJoin,
  type Trade,
} from "./types";

/**
 * Local jam rooms: everything in localStorage, and every browser tab is its own guest
 * (identity in sessionStorage). Other tabs see changes live through the `storage` event.
 * Mirrors the rules the Supabase migration enforces, so the preview behaves the same.
 */

type Db = {
  rooms: Room[];
  guests: (Guest & { roomId: string })[];
  pages: (Page & { roomId: string })[];
  reactions: { pageId: string; userId: string; kind: ReactionKind }[];
  pulls: (Pull & { roomId: string })[];
  trades: (Trade & { roomId: string })[];
  joins: TeamJoin[];
};
const KEY = "qs.jam.v1";
const EVT = "qs-jam";
const id = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function read(): Db {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (d?.rooms) return d;
  } catch {
    /* fall through */
  }
  return { rooms: [], guests: [], pages: [], reactions: [], pulls: [], trades: [], joins: [] };
}
function write(d: Db) {
  localStorage.setItem(KEY, JSON.stringify(d));
  window.dispatchEvent(new Event(EVT));
}
function tx<T>(fn: (d: Db) => T): T {
  const d = read();
  const out = fn(d);
  write(d);
  return out;
}
const fail = (msg: string): never => {
  throw new Error(msg);
};

export class LocalJam implements JamTransport {
  readonly kind = "local" as const;
  async userId() {
    let u = sessionStorage.getItem("qs.jam.uid");
    if (!u) {
      u = `guest-${id()}`;
      sessionStorage.setItem("qs.jam.uid", u);
    }
    return u;
  }
  async canHost() {
    return true; // local preview: anyone can open a room
  }
  async createRoom(o: { theme: string; minutes: number; guestCap: number; startCoins: number }) {
    const code = Array.from(
      { length: 5 },
      () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)],
    ).join("");
    const room: Room = {
      id: id(),
      code,
      theme: o.theme.trim().slice(0, 60),
      endsAt: new Date(Date.now() + Math.max(1, o.minutes) * 60_000).toISOString(),
      guestCap: o.guestCap,
      startCoins: o.startCoins,
      closed: false,
    };
    tx((d) => d.rooms.push(room));
    return room;
  }
  async roomByCode(code: string) {
    return read().rooms.find((r) => r.code === code.trim().toUpperCase()) ?? null;
  }
  async join(code: string, nickname: string) {
    const me = await this.userId();
    return tx((d) => {
      const room =
        d.rooms.find((r) => r.code === code.trim().toUpperCase()) ?? fail("No such room.");
      const existing = d.guests.find((g) => g.roomId === room.id && g.userId === me);
      if (existing) return { room, guest: existing };
      if (!isOpen(room)) fail("The market is closed.");
      const nick = nickname.trim().slice(0, 24);
      if (!nick) fail("Pick a nickname.");
      const inRoom = d.guests.filter((g) => g.roomId === room.id);
      if (inRoom.length >= room.guestCap) fail("The room is full.");
      if (inRoom.some((g) => g.nickname.toLowerCase() === nick.toLowerCase()))
        fail("That nickname is taken.");
      const guest = { roomId: room.id, userId: me, nickname: nick, coins: room.startCoins };
      d.guests.push(guest);
      return { room, guest };
    });
  }
  async snapshot(roomId: string): Promise<RoomSnapshot> {
    const d = read();
    const room = d.rooms.find((r) => r.id === roomId) ?? fail("No such room.");
    const pages = d.pages.filter((p) => p.roomId === roomId);
    const pageIds = new Set(pages.map((p) => p.id));
    return {
      room,
      guests: d.guests.filter((g) => g.roomId === roomId),
      pages,
      reactions: d.reactions.filter((r) => pageIds.has(r.pageId)),
      pulls: d.pulls.filter((p) => p.roomId === roomId),
      trades: d.trades.filter((t) => t.roomId === roomId),
      joins: d.joins.filter((j) => pageIds.has(j.pageId)),
    };
  }
  subscribe(_roomId: string, onChange: () => void) {
    const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, onChange);
    // The countdown can close the market without any write.
    const t = setInterval(onChange, 5000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, onChange);
      clearInterval(t);
    };
  }
  private async guard(roomId: string) {
    const me = await this.userId();
    const d = read();
    const room = d.rooms.find((r) => r.id === roomId) ?? fail("No such room.");
    if (!isOpen(room)) fail("The market is closed.");
    if (!d.guests.some((g) => g.roomId === roomId && g.userId === me)) fail("Join the room first.");
    return me;
  }
  async spendCoin(roomId: string) {
    const me = await this.guard(roomId);
    return tx((d) => {
      const g = d.guests.find((x) => x.roomId === roomId && x.userId === me)!;
      if (g.coins <= 0) fail("Out of coins.");
      g.coins -= 1;
      return g.coins;
    });
  }
  async postCards(roomId: string, cards: CardData[]) {
    const me = await this.guard(roomId);
    const safe = cards.filter((c) => c.rarity !== "mythic");
    tx((d) =>
      safe.forEach((card) => d.pulls.push({ id: id(), roomId, ownerId: me, card, status: "held" })),
    );
  }
  async markPull(pullId: string, status: Pull["status"]) {
    const me = await this.userId();
    tx((d) => {
      const p = d.pulls.find((x) => x.id === pullId && x.ownerId === me);
      if (p) p.status = status;
    });
  }
  async offerTrade(roomId: string, toUser: string, fromPull: string, toPull: string) {
    const me = await this.guard(roomId);
    tx((d) => {
      const mine = d.pulls.find(
        (p) => p.id === fromPull && p.ownerId === me && p.status === "held",
      );
      const theirs = d.pulls.find(
        (p) => p.id === toPull && p.ownerId === toUser && p.status === "held",
      );
      if (!mine || !theirs) fail("Those cards aren't available.");
      d.trades.push({ id: id(), roomId, fromUser: me, toUser, fromPull, toPull, state: "offered" });
    });
  }
  async respondTrade(tradeId: string, accept: boolean) {
    const me = await this.userId();
    tx((d) => {
      const t = d.trades.find((x) => x.id === tradeId) ?? fail("No such trade.");
      if (t.state !== "offered") fail("That trade is no longer open.");
      if (!accept) {
        if (t.toUser !== me && t.fromUser !== me) fail("Not your trade.");
        t.state = "declined";
        return;
      }
      if (t.toUser !== me) fail("Not your trade.");
      const room = d.rooms.find((r) => r.id === t.roomId)!;
      if (!isOpen(room)) fail("The market is closed.");
      const a = d.pulls.find(
        (p) => p.id === t.fromPull && p.ownerId === t.fromUser && p.status === "held",
      );
      const b = d.pulls.find(
        (p) => p.id === t.toPull && p.ownerId === t.toUser && p.status === "held",
      );
      if (!a || !b) fail("Those cards are gone.");
      a!.ownerId = t.toUser;
      b!.ownerId = t.fromUser;
      t.state = "accepted";
    });
  }
  async publishPage(roomId: string, page: Pick<Page, "slots" | "cards" | "concept" | "notes">) {
    const me = await this.guard(roomId);
    if (Object.values(page.cards).some((c) => c?.rarity === "mythic"))
      fail("Mythic cards aren't allowed in jams.");
    tx((d) => {
      const g = d.guests.find((x) => x.roomId === roomId && x.userId === me)!;
      const existing = d.pages.find((p) => p.roomId === roomId && p.userId === me);
      if (existing) Object.assign(existing, page);
      else
        d.pages.push({
          ...page,
          id: id(),
          roomId,
          userId: me,
          nickname: g.nickname,
          hidden: false,
          createdAt: new Date().toISOString(),
        });
    });
  }
  async react(pageId: string, kind: ReactionKind, on: boolean) {
    const me = await this.userId();
    tx((d) => {
      d.reactions = d.reactions.filter(
        (r) => !(r.pageId === pageId && r.userId === me && r.kind === kind),
      );
      if (on) d.reactions.push({ pageId, userId: me, kind });
    });
  }
  async joinIdea(pageId: string, on: boolean) {
    const me = await this.userId();
    tx((d) => {
      const page = d.pages.find((p) => p.id === pageId) ?? fail("No such page.");
      const room = d.rooms.find((r) => r.id === page.roomId)!;
      if (isOpen(room)) fail("Teams form after the market closes.");
      d.joins = d.joins.filter((j) => !(j.pageId === pageId && j.userId === me));
      if (on) d.joins.push({ pageId, userId: me });
    });
  }
  async hidePage(pageId: string, hidden: boolean) {
    tx((d) => {
      const p = d.pages.find((x) => x.id === pageId);
      if (p) p.hidden = hidden;
    });
  }
  async closeRoom(roomId: string) {
    tx((d) => {
      const r = d.rooms.find((x) => x.id === roomId);
      if (r) r.closed = true;
    });
  }
}
