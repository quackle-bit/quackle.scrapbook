"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Concept, SparkNote } from "@/components/book/SpreadView";
import type { CardData, CardType, SlotId } from "../deck";
import type { Ledger } from "../ledger";

/**
 * Studio data (CLAUDE.md §6.3): a shared library of books, spreads with status, comments,
 * votes, version history and the Appraiser's notes, plus the Back Room's minted cards.
 *
 * Two backends behind one interface:
 *  - LocalStudioRepo: this browser only. Used as a preview until Supabase is configured.
 *  - SupabaseStudioRepo: the real shared library; access is enforced by RLS (supabase/migrations).
 */

export type Status = "idea" | "prototype" | "production";
export const STATUSES: Status[] = ["idea", "prototype", "production"];

export type StudioBook = { id: string; title: string; color: string; createdAt: string };
export type Comment = { id: string; author: string; body: string; at: string };
export type Version = {
  at: string;
  cards: Partial<Record<SlotId, CardData>>;
  concept: Concept | null;
};
export type StudioSpread = {
  id: string;
  bookId: string;
  slots: SlotId[];
  cards: Partial<Record<SlotId, CardData>>;
  concept: Concept | null;
  notes: SparkNote[];
  status: Status;
  ledger?: Ledger | null;
  appraisal?: unknown;
  creditedTo?: string | null;
  createdAt: string;
  comments: Comment[];
  votes: { up: number; down: number; mine: -1 | 0 | 1 };
  versions: Version[];
};
export type MintedCard = {
  id: string;
  type: CardType;
  text: string;
  rarity: CardData["rarity"];
  flavor?: string;
  tags: string[];
};

export interface StudioRepo {
  readonly kind: "local" | "supabase";
  me(): Promise<{ name: string } | null>;
  listBooks(): Promise<StudioBook[]>;
  createBook(title: string, color: string): Promise<StudioBook>;
  listSpreads(bookId: string): Promise<StudioSpread[]>;
  addSpread(
    bookId: string,
    s: Pick<StudioSpread, "slots" | "cards" | "concept" | "notes"> & { creditedTo?: string },
  ): Promise<string>;
  updateSpread(
    id: string,
    patch: Partial<Pick<StudioSpread, "status" | "concept" | "cards" | "ledger" | "appraisal">>,
  ): Promise<void>;
  addComment(spreadId: string, body: string): Promise<void>;
  vote(spreadId: string, value: -1 | 0 | 1): Promise<void>;
  deleteSpread(id: string): Promise<void>;
  listCards(): Promise<MintedCard[]>;
  mintCard(c: Omit<MintedCard, "id">): Promise<void>;
  unmintCard(id: string): Promise<void>;
}

// ── Local ───────────────────────────────────────────────────────
type LocalState = { books: StudioBook[]; spreads: StudioSpread[]; cards: MintedCard[] };
const KEY = "qs.studio.v1";
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export class LocalStudioRepo implements StudioRepo {
  readonly kind = "local" as const;
  private read(): LocalState {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as LocalState | null;
      if (s?.books?.length) return s;
    } catch {
      /* fall through */
    }
    const first: StudioBook = {
      id: uid(),
      title: "Studio Ideas",
      color: "#2f6f8f",
      createdAt: new Date().toISOString(),
    };
    return { books: [first], spreads: [], cards: [] };
  }
  private write(s: LocalState) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage full */
    }
    window.dispatchEvent(new Event("qs-studio"));
  }
  private mutate(fn: (s: LocalState) => void) {
    const s = this.read();
    fn(s);
    this.write(s);
  }
  async me() {
    return { name: "you (local preview)" };
  }
  async listBooks() {
    const s = this.read();
    if (!localStorage.getItem(KEY)) this.write(s);
    return s.books;
  }
  async createBook(title: string, color: string) {
    const b = { id: uid(), title, color, createdAt: new Date().toISOString() };
    this.mutate((s) => s.books.push(b));
    return b;
  }
  async listSpreads(bookId: string) {
    return this.read().spreads.filter((x) => x.bookId === bookId);
  }
  async addSpread(
    bookId: string,
    s: Pick<StudioSpread, "slots" | "cards" | "concept" | "notes"> & { creditedTo?: string },
  ) {
    const id = uid();
    this.mutate((st) =>
      st.spreads.push({
        ...s,
        id,
        bookId,
        status: "idea",
        createdAt: new Date().toISOString(),
        comments: [],
        votes: { up: 0, down: 0, mine: 0 },
        versions: [{ at: new Date().toISOString(), cards: s.cards, concept: s.concept }],
      }),
    );
    return id;
  }
  async updateSpread(
    id: string,
    patch: Partial<Pick<StudioSpread, "status" | "concept" | "cards" | "ledger" | "appraisal">>,
  ) {
    this.mutate((s) => {
      const sp = s.spreads.find((x) => x.id === id);
      if (!sp) return;
      Object.assign(sp, patch);
      if (patch.concept || patch.cards)
        sp.versions.push({ at: new Date().toISOString(), cards: sp.cards, concept: sp.concept });
    });
  }
  async addComment(spreadId: string, body: string) {
    this.mutate((s) =>
      s.spreads
        .find((x) => x.id === spreadId)
        ?.comments.push({ id: uid(), author: "you", body, at: new Date().toISOString() }),
    );
  }
  async vote(spreadId: string, value: -1 | 0 | 1) {
    this.mutate((s) => {
      const sp = s.spreads.find((x) => x.id === spreadId);
      if (!sp) return;
      if (sp.votes.mine === 1) sp.votes.up--;
      if (sp.votes.mine === -1) sp.votes.down--;
      if (value === 1) sp.votes.up++;
      if (value === -1) sp.votes.down++;
      sp.votes.mine = value;
    });
  }
  async deleteSpread(id: string) {
    this.mutate((s) => (s.spreads = s.spreads.filter((x) => x.id !== id)));
  }
  async listCards() {
    return this.read().cards;
  }
  async mintCard(c: Omit<MintedCard, "id">) {
    this.mutate((s) => s.cards.push({ ...c, id: uid() }));
  }
  async unmintCard(id: string) {
    this.mutate((s) => (s.cards = s.cards.filter((x) => x.id !== id)));
  }
}

// ── Supabase ────────────────────────────────────────────────────
type SpreadRow = {
  id: string;
  book_id: string;
  slots: SlotId[];
  cards: Partial<Record<SlotId, CardData>>;
  concept: Concept | null;
  notes: SparkNote[];
  status: Status;
  ledger: Ledger | null;
  appraisal: unknown;
  credited_to: string | null;
  created_at: string;
  comments?: { id: number; body: string; created_at: string; user_id: string }[];
  votes?: { value: number; user_id: string }[];
  spread_versions?: {
    cards: Partial<Record<SlotId, CardData>>;
    concept: Concept | null;
    created_at: string;
  }[];
};

export class SupabaseStudioRepo implements StudioRepo {
  readonly kind = "supabase" as const;
  constructor(private sb: SupabaseClient) {}
  private async uid() {
    const { data } = await this.sb.auth.getUser();
    return data.user?.id ?? null;
  }
  private check<T>({
    data,
    error,
  }: {
    data: T;
    error: { message: string } | null;
  }): NonNullable<T> {
    if (error) throw new Error(error.message);
    return data as NonNullable<T>;
  }
  async me() {
    const id = await this.uid();
    if (!id) return null;
    const { data } = await this.sb
      .from("members")
      .select("email, display_name")
      .eq("user_id", id)
      .maybeSingle();
    return data ? { name: data.display_name ?? data.email } : null;
  }
  async listBooks() {
    const rows = this.check(
      await this.sb
        .from("books")
        .select("id, title, color, created_at")
        .eq("owner_kind", "member")
        .order("created_at"),
    );
    return (rows ?? []).map((b) => ({
      id: b.id,
      title: b.title,
      color: b.color,
      createdAt: b.created_at,
    }));
  }
  async createBook(title: string, color: string) {
    const b = this.check(
      await this.sb
        .from("books")
        .insert({ owner_kind: "member", owner_id: await this.uid(), title, color })
        .select()
        .single(),
    );
    return { id: b.id, title: b.title, color: b.color, createdAt: b.created_at };
  }
  async listSpreads(bookId: string) {
    const me = await this.uid();
    const rows = this.check(
      await this.sb
        .from("spreads")
        .select(
          "*, comments(id, body, created_at, user_id), votes(value, user_id), spread_versions(cards, concept, created_at)",
        )
        .eq("book_id", bookId)
        .order("created_at"),
    ) as SpreadRow[];
    return rows.map((r) => ({
      id: r.id,
      bookId: r.book_id,
      slots: r.slots,
      cards: r.cards,
      concept: r.concept,
      notes: r.notes,
      status: r.status,
      ledger: r.ledger,
      appraisal: r.appraisal,
      creditedTo: r.credited_to,
      createdAt: r.created_at,
      comments: (r.comments ?? []).map((c) => ({
        id: String(c.id),
        author: c.user_id === me ? "you" : "teammate",
        body: c.body,
        at: c.created_at,
      })),
      votes: {
        up: (r.votes ?? []).filter((v) => v.value === 1).length,
        down: (r.votes ?? []).filter((v) => v.value === -1).length,
        mine: ((r.votes ?? []).find((v) => v.user_id === me)?.value ?? 0) as -1 | 0 | 1,
      },
      versions: (r.spread_versions ?? []).map((v) => ({
        at: v.created_at,
        cards: v.cards,
        concept: v.concept,
      })),
    }));
  }
  async addSpread(
    bookId: string,
    s: Pick<StudioSpread, "slots" | "cards" | "concept" | "notes"> & { creditedTo?: string },
  ) {
    const row = this.check(
      await this.sb
        .from("spreads")
        .insert({
          book_id: bookId,
          slots: s.slots,
          cards: s.cards,
          concept: s.concept,
          notes: s.notes,
          credited_to: s.creditedTo ?? null,
        })
        .select("id")
        .single(),
    );
    await this.sb
      .from("spread_versions")
      .insert({ spread_id: row.id, cards: s.cards, concept: s.concept });
    return row.id as string;
  }
  async updateSpread(
    id: string,
    patch: Partial<Pick<StudioSpread, "status" | "concept" | "cards" | "ledger" | "appraisal">>,
  ) {
    await this.sb
      .from("spreads")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .throwOnError();
    if (patch.concept || patch.cards) {
      const cur = this.check(
        await this.sb.from("spreads").select("cards, concept").eq("id", id).single(),
      );
      await this.sb
        .from("spread_versions")
        .insert({ spread_id: id, cards: cur.cards, concept: cur.concept });
    }
  }
  async addComment(spreadId: string, body: string) {
    await this.sb.from("comments").insert({ spread_id: spreadId, body }).throwOnError();
  }
  async vote(spreadId: string, value: -1 | 0 | 1) {
    if (value === 0)
      await this.sb
        .from("votes")
        .delete()
        .eq("spread_id", spreadId)
        .eq("user_id", await this.uid())
        .throwOnError();
    else await this.sb.from("votes").upsert({ spread_id: spreadId, value }).throwOnError();
  }
  async deleteSpread(id: string) {
    await this.sb.from("spreads").delete().eq("id", id).throwOnError();
  }
  async listCards() {
    const rows = this.check(
      await this.sb
        .from("custom_cards")
        .select("id, type, text, rarity, flavor, tags")
        .order("created_at"),
    );
    return (rows ?? []) as MintedCard[];
  }
  async mintCard(c: Omit<MintedCard, "id">) {
    await this.sb.from("custom_cards").insert(c).throwOnError();
  }
  async unmintCard(id: string) {
    await this.sb.from("custom_cards").delete().eq("id", id).throwOnError();
  }
}
