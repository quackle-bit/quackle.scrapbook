"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardData } from "../deck";
import type { Guest, JamTransport, Page, Pull, ReactionKind, Room, RoomSnapshot } from "./types";

/**
 * Supabase jam rooms: RPCs (create_room, join_room, spend_room_coin, accept_trade) enforce the
 * limits; tables are read through RLS; Realtime pushes changes. Guests sign in anonymously.
 */

type RoomRow = {
  id: string;
  code: string;
  theme: string;
  ends_at: string;
  guest_cap: number;
  start_coins: number;
  closed: boolean;
  album_book_id: string;
};
const toRoom = (r: RoomRow): Room => ({
  id: r.id,
  code: r.code,
  theme: r.theme,
  endsAt: r.ends_at,
  guestCap: r.guest_cap,
  startCoins: r.start_coins,
  closed: r.closed,
});

export class SupabaseJam implements JamTransport {
  readonly kind = "supabase" as const;
  private albums = new Map<string, string>();
  constructor(private sb: SupabaseClient) {}

  async userId() {
    const { data } = await this.sb.auth.getUser();
    if (data.user) return data.user.id;
    const { data: anon, error } = await this.sb.auth.signInAnonymously();
    if (error || !anon.user) throw new Error(error?.message ?? "Couldn't sign in as a guest.");
    return anon.user.id;
  }
  async canHost() {
    const { data } = await this.sb.auth.getUser();
    if (!data.user) return false;
    const { data: m } = await this.sb
      .from("members")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    return !!m;
  }
  async isHost() {
    return this.canHost(); // RLS lets any studio member run a room
  }
  private async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.sb.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  }
  async createRoom(o: { theme: string; minutes: number; guestCap: number; startCoins: number }) {
    const r = await this.rpc<RoomRow>("create_room", {
      p_theme: o.theme,
      p_minutes: o.minutes,
      p_guest_cap: o.guestCap,
      p_start_coins: o.startCoins,
    });
    this.albums.set(r.id, r.album_book_id);
    return toRoom(r);
  }
  async roomByCode(code: string) {
    const { data } = await this.sb
      .from("rooms")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();
    if (!data) return null;
    this.albums.set(data.id, data.album_book_id);
    return toRoom(data as RoomRow);
  }
  async join(code: string, nickname: string) {
    await this.userId();
    const g = await this.rpc<{ room_id: string; user_id: string; nickname: string; coins: number }>(
      "join_room",
      {
        p_code: code,
        p_nickname: nickname,
      },
    );
    const room =
      (await this.roomByCode(code)) ??
      (() => {
        throw new Error("No such room.");
      })();
    return { room, guest: { userId: g.user_id, nickname: g.nickname, coins: g.coins } };
  }
  private async album(roomId: string) {
    let b = this.albums.get(roomId);
    if (!b) {
      const { data } = await this.sb
        .from("rooms")
        .select("album_book_id")
        .eq("id", roomId)
        .single();
      b = data?.album_book_id as string;
      this.albums.set(roomId, b);
    }
    return b;
  }
  async snapshot(roomId: string): Promise<RoomSnapshot> {
    const book = await this.album(roomId);
    const [room, guests, pages, pulls, trades] = await Promise.all([
      this.sb.from("rooms").select("*").eq("id", roomId).single(),
      this.sb.from("room_guests").select("user_id, nickname, coins").eq("room_id", roomId),
      this.sb.from("spreads").select("*").eq("book_id", book).order("created_at"),
      this.sb.from("pulls").select("id, owner_id, card, status").eq("room_id", roomId),
      this.sb.from("trades").select("*").eq("room_id", roomId),
    ]);
    if (room.error) throw new Error(room.error.message);
    const pageRows = pages.data ?? [];
    const ids = pageRows.map((p) => p.id);
    const [reactions, joins] = ids.length
      ? await Promise.all([
          this.sb.from("reactions").select("spread_id, user_id, kind").in("spread_id", ids),
          this.sb.from("team_joins").select("spread_id, user_id").in("spread_id", ids),
        ])
      : [{ data: [] }, { data: [] }];
    const nick = new Map((guests.data ?? []).map((g) => [g.user_id, g.nickname]));
    return {
      room: toRoom(room.data as RoomRow),
      guests: (guests.data ?? []).map((g): Guest => ({
        userId: g.user_id,
        nickname: g.nickname,
        coins: g.coins,
      })),
      pages: pageRows.map((p): Page => ({
        id: p.id,
        userId: p.created_by,
        nickname: nick.get(p.created_by) ?? "guest",
        slots: p.slots,
        cards: p.cards,
        concept: p.concept,
        notes: p.notes,
        pitch: p.pitch,
        hidden: p.hidden,
        createdAt: p.created_at,
      })),
      reactions: (reactions.data ?? []).map((r) => ({
        pageId: r.spread_id,
        userId: r.user_id,
        kind: r.kind,
      })),
      pulls: (pulls.data ?? []).map((p): Pull => ({
        id: p.id,
        ownerId: p.owner_id,
        card: p.card,
        status: p.status,
      })),
      trades: (trades.data ?? []).map((t) => ({
        id: t.id,
        fromUser: t.from_user,
        toUser: t.to_user,
        fromPull: t.from_pull,
        toPull: t.to_pull,
        state: t.state,
      })),
      joins: (joins.data ?? []).map((j) => ({ pageId: j.spread_id, userId: j.user_id })),
    };
  }
  subscribe(roomId: string, onChange: () => void) {
    const ch = this.sb.channel(`room-${roomId}`);
    for (const table of [
      "spreads",
      "trades",
      "reactions",
      "room_guests",
      "pulls",
      "team_joins",
      "rooms",
    ]) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, () => onChange());
    }
    ch.subscribe();
    const t = setInterval(onChange, 15000);
    return () => {
      clearInterval(t);
      void this.sb.removeChannel(ch);
    };
  }
  async spendCoin(roomId: string) {
    return this.rpc<number>("spend_room_coin", { p_room: roomId });
  }
  async postCards(roomId: string, cards: CardData[]) {
    const me = await this.userId();
    const rows = cards
      .filter((c) => c.rarity !== "mythic")
      .map((card) => ({ room_id: roomId, owner_id: me, card }));
    if (rows.length) await this.sb.from("pulls").insert(rows).throwOnError();
  }
  async markPull(pullId: string, status: Pull["status"]) {
    await this.sb.from("pulls").update({ status }).eq("id", pullId).throwOnError();
  }
  async offerTrade(roomId: string, toUser: string, fromPull: string, toPull: string) {
    await this.sb
      .from("trades")
      .insert({ room_id: roomId, to_user: toUser, from_pull: fromPull, to_pull: toPull })
      .throwOnError();
  }
  async respondTrade(tradeId: string, accept: boolean) {
    if (accept) await this.rpc("accept_trade", { p_trade: tradeId });
    else
      await this.sb.from("trades").update({ state: "declined" }).eq("id", tradeId).throwOnError();
  }
  async publishPage(
    roomId: string,
    page: Pick<Page, "slots" | "cards" | "concept" | "notes" | "pitch">,
  ) {
    const me = await this.userId();
    const book = await this.album(roomId);
    const { data: existing } = await this.sb
      .from("spreads")
      .select("id")
      .eq("book_id", book)
      .eq("created_by", me)
      .maybeSingle();
    if (existing) await this.sb.from("spreads").update(page).eq("id", existing.id).throwOnError();
    else
      await this.sb
        .from("spreads")
        .insert({ ...page, book_id: book })
        .throwOnError();
  }
  async react(pageId: string, kind: ReactionKind, on: boolean) {
    if (on) await this.sb.from("reactions").upsert({ spread_id: pageId, kind }).throwOnError();
    else
      await this.sb
        .from("reactions")
        .delete()
        .eq("spread_id", pageId)
        .eq("kind", kind)
        .eq("user_id", await this.userId())
        .throwOnError();
  }
  async joinIdea(pageId: string, on: boolean) {
    if (on) await this.sb.from("team_joins").upsert({ spread_id: pageId }).throwOnError();
    else
      await this.sb
        .from("team_joins")
        .delete()
        .eq("spread_id", pageId)
        .eq("user_id", await this.userId())
        .throwOnError();
  }
  async hidePage(pageId: string, hidden: boolean) {
    await this.sb.from("spreads").update({ hidden }).eq("id", pageId).throwOnError();
  }
  async closeRoom(roomId: string) {
    await this.sb.from("rooms").update({ closed: true }).eq("id", roomId).throwOnError();
  }
}
