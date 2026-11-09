-- quackle.scrapbook — initial schema (Studio + Jam rooms). CLAUDE.md §6, §9.
-- Every limit (membership, coins, card pools, room access) is enforced here with row-level
-- security and security-definer functions. Client-side counts are display only.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Studio membership: an email allowlist. Signing in with a listed email makes you a member.
-- ─────────────────────────────────────────────────────────────
create table public.allowlist (
  email text primary key check (email = lower(email)),
  role text not null default 'member' check (role in ('member', 'admin')),
  added_at timestamptz not null default now()
);

create table public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

-- When a user signs up (magic link), promote them to member if their email is allowlisted.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare a public.allowlist;
begin
  if new.email is null then return new; end if; -- anonymous jam guests have no email
  select * into a from public.allowlist where email = lower(new.email);
  if found then
    insert into public.members (user_id, email, role) values (new.id, lower(new.email), a.role)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role = 'admin');
$$;

-- ─────────────────────────────────────────────────────────────
-- Books & spreads. Studio books are shared by the whole team; a room's album is a book too.
-- Cards are stored inline on the spread (they're small and immutable once pulled).
-- ─────────────────────────────────────────────────────────────
create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_kind text not null check (owner_kind in ('member', 'room')),
  owner_id uuid, -- member user_id for studio books, room id for albums
  title text not null check (char_length(title) between 1 and 80),
  color text not null default '#c0392b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  visibility text not null default 'private' check (visibility in ('private', 'link', 'public')),
  created_at timestamptz not null default now()
);

create table public.spreads (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  idx integer not null default 0,
  slots text[] not null default '{}',
  cards jsonb not null default '{}'::jsonb,
  concept jsonb,
  notes jsonb not null default '[]'::jsonb,
  pitch jsonb, -- title, tagline, genre, platforms, detail lines, notes
  ledger jsonb,
  appraisal jsonb,
  status text not null default 'idea' check (status in ('idea', 'prototype', 'production')),
  hidden boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users (id),
  credited_to text, -- e.g. the jam guest's nickname when a studio member adopts a page
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.spreads (book_id, idx);

-- Every forge is kept as a version (Studio: full history).
create table public.spread_versions (
  id bigint generated always as identity primary key,
  spread_id uuid not null references public.spreads (id) on delete cascade,
  cards jsonb not null,
  concept jsonb,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.comments (
  id bigint generated always as identity primary key,
  spread_id uuid not null references public.spreads (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.votes (
  spread_id uuid not null references public.spreads (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id),
  value smallint not null check (value in (-1, 1)),
  primary key (spread_id, user_id)
);

-- Back Room: the studio's own minted cards (Mythic and studio-only allowed).
create table public.custom_cards (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('seed', 'verb', 'world', 'mood', 'look', 'twist', 'constraint')),
  text text not null check (char_length(text) between 1 and 120),
  tags text[] not null default '{}',
  rarity text not null default 'rare' check (rarity in ('common', 'uncommon', 'rare', 'mythic')),
  flavor text check (char_length(flavor) <= 140),
  minted_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

-- Appraiser usage, for the durable per-member daily cap.
create table public.appraisals (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index on public.appraisals (user_id, created_at);

-- Returns true and records a use if the caller is a member under today's limit.
create or replace function public.appraisal_quota(daily_limit integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare used integer;
begin
  if not public.is_member() then return false; end if;
  select count(*) into used from public.appraisals
    where user_id = auth.uid() and created_at > now() - interval '1 day';
  if used >= daily_limit then return false; end if;
  insert into public.appraisals (user_id) values (auth.uid());
  return true;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Jam rooms (Phase 4). Guests sign in anonymously and join with a code + nickname.
-- ─────────────────────────────────────────────────────────────
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{4,8}$'),
  theme text not null check (char_length(theme) between 1 and 60),
  ends_at timestamptz not null,
  guest_cap integer not null default 30 check (guest_cap between 1 and 500),
  start_coins integer not null default 6 check (start_coins between 0 and 50),
  closed boolean not null default false,
  album_book_id uuid references public.books (id),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.room_guests (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  coins integer not null check (coins >= 0),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, nickname)
);

-- Cards a guest holds in a room (tradeable). Server-drawn in a later step; status tracks use.
create table public.pulls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  owner_id uuid not null references auth.users (id),
  card jsonb not null,
  status text not null default 'held' check (status in ('held', 'stamped', 'trashed')),
  created_at timestamptz not null default now()
);
create index on public.pulls (room_id, owner_id);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  from_user uuid not null default auth.uid() references auth.users (id),
  to_user uuid not null references auth.users (id),
  from_pull uuid not null references public.pulls (id),
  to_pull uuid not null references public.pulls (id),
  state text not null default 'offered' check (state in ('offered', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create table public.reactions (
  spread_id uuid not null references public.spreads (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id),
  kind text not null check (kind in ('heart', 'fire', 'think', 'vote')),
  created_at timestamptz not null default now(),
  primary key (spread_id, user_id, kind)
);

-- Team forming: after the market closes, guests can join the top ideas.
create table public.team_joins (
  spread_id uuid not null references public.spreads (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (spread_id, user_id)
);

-- Jam card pool rule: guests never hold Mythic or studio-only cards.
create or replace function public.guest_safe_card(c jsonb) returns boolean
language sql immutable as $$
  select coalesce(c->>'rarity', 'common') <> 'mythic' and coalesce((c->>'studioOnly')::boolean, false) = false;
$$;
create or replace function public.guest_safe_cards(cards jsonb) returns boolean
language sql immutable as $$
  select coalesce(bool_and(public.guest_safe_card(v)), true) from jsonb_each(cards) as e(k, v);
$$;

create or replace function public.room_is_open(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rooms where id = r and not closed and ends_at > now());
$$;

create or replace function public.is_guest(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.room_guests where room_id = r and user_id = auth.uid());
$$;

create or replace function public.room_of_book(b uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.rooms where album_book_id = b;
$$;

-- Has the caller already added a page to this book? (Used by RLS; a definer function avoids
-- the policy querying its own table, which Postgres rejects as recursion.)
create or replace function public.has_page(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.spreads where book_id = b and created_by = auth.uid());
$$;

-- Create a room + its album (members only).
create or replace function public.create_room(p_theme text, p_minutes integer, p_guest_cap integer, p_start_coins integer)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare r public.rooms; b uuid; c text;
begin
  if not public.is_member() then raise exception 'members only'; end if;
  loop
    c := upper(substr(translate(encode(gen_random_bytes(6), 'base64'), '+/=0O1Il', ''), 1, 5));
    exit when length(c) = 5 and not exists (select 1 from public.rooms where code = c);
  end loop;
  insert into public.books (owner_kind, title, visibility) values ('room', 'Jam Album: ' || p_theme, 'link')
    returning id into b;
  insert into public.rooms (code, theme, ends_at, guest_cap, start_coins, album_book_id)
    values (c, p_theme, now() + make_interval(mins => greatest(1, least(p_minutes, 7 * 24 * 60))),
            p_guest_cap, p_start_coins, b)
    returning * into r;
  update public.books set owner_id = r.id where id = b;
  return r;
end $$;

-- Join with a code and nickname. Enforces open room, guest cap and starting coins.
create or replace function public.join_room(p_code text, p_nickname text)
returns public.room_guests language plpgsql security definer set search_path = public as $$
declare r public.rooms; g public.room_guests; n integer;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into r from public.rooms where code = upper(trim(p_code)) for update;
  if not found then raise exception 'no such room'; end if;
  if r.closed or r.ends_at <= now() then raise exception 'the market is closed'; end if;
  select * into g from public.room_guests where room_id = r.id and user_id = auth.uid();
  if found then return g; end if;
  select count(*) into n from public.room_guests where room_id = r.id;
  if n >= r.guest_cap then raise exception 'the room is full'; end if;
  insert into public.room_guests (room_id, user_id, nickname, coins)
    values (r.id, auth.uid(), trim(p_nickname), r.start_coins) returning * into g;
  return g;
end $$;

-- Spend one coin in a room. Returns the coins left, or raises if broke / closed.
create or replace function public.spend_room_coin(p_room uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare left_ integer;
begin
  if not public.room_is_open(p_room) then raise exception 'the market is closed'; end if;
  update public.room_guests set coins = coins - 1
    where room_id = p_room and user_id = auth.uid() and coins > 0
    returning coins into left_;
  if not found then raise exception 'out of coins'; end if;
  return left_;
end $$;

-- Accept a trade: atomically swap the two pulls' owners.
create or replace function public.accept_trade(p_trade uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t public.trades;
begin
  select * into t from public.trades where id = p_trade for update;
  if not found or t.state <> 'offered' then raise exception 'trade not open'; end if;
  if t.to_user <> auth.uid() then raise exception 'not your trade'; end if;
  if not public.room_is_open(t.room_id) then raise exception 'the market is closed'; end if;
  if not exists (select 1 from public.pulls where id = t.from_pull and owner_id = t.from_user and status = 'held')
     or not exists (select 1 from public.pulls where id = t.to_pull and owner_id = t.to_user and status = 'held') then
    raise exception 'cards are no longer available';
  end if;
  update public.pulls set owner_id = t.to_user where id = t.from_pull;
  update public.pulls set owner_id = t.from_user where id = t.to_pull;
  update public.trades set state = 'accepted' where id = p_trade;
end $$;

-- Copy an album page into a studio book, credited to the guest (members only).
create or replace function public.adopt_spread(p_spread uuid, p_book uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare s public.spreads; nick text; new_id uuid;
begin
  if not public.is_member() then raise exception 'members only'; end if;
  select * into s from public.spreads where id = p_spread;
  if not found then raise exception 'no such spread'; end if;
  select g.nickname into nick from public.room_guests g
    join public.rooms r on r.id = g.room_id
    where r.album_book_id = s.book_id and g.user_id = s.created_by;
  insert into public.spreads (book_id, slots, cards, concept, notes, created_by, credited_to)
    values (p_book, s.slots, s.cards, s.concept, s.notes, auth.uid(), coalesce(nick, 'a jam guest'))
    returning id into new_id;
  return new_id;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────
alter table public.allowlist enable row level security;
alter table public.members enable row level security;
alter table public.books enable row level security;
alter table public.spreads enable row level security;
alter table public.spread_versions enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;
alter table public.custom_cards enable row level security;
alter table public.appraisals enable row level security;
alter table public.rooms enable row level security;
alter table public.room_guests enable row level security;
alter table public.pulls enable row level security;
alter table public.trades enable row level security;
alter table public.reactions enable row level security;
alter table public.team_joins enable row level security;

-- allowlist / members: admins manage, members can see the team.
create policy "admins manage allowlist" on public.allowlist for all using (public.is_admin()) with check (public.is_admin());
create policy "members see the team" on public.members for select using (public.is_member());
create policy "admins manage members" on public.members for all using (public.is_admin()) with check (public.is_admin());
create policy "members edit own profile" on public.members for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and role = (select role from public.members where user_id = auth.uid()));

-- books: members see all studio books and albums; guests see their room's album; link/public books are readable.
create policy "members read books" on public.books for select using (public.is_member());
create policy "guests read their album" on public.books for select
  using (owner_kind = 'room' and public.is_guest(public.room_of_book(id)));
create policy "shared books are readable" on public.books for select using (visibility in ('link', 'public'));
create policy "members write studio books" on public.books for insert with check (public.is_member() and owner_kind = 'member');
create policy "members update books" on public.books for update using (public.is_member());
create policy "members delete studio books" on public.books for delete using (public.is_member() and owner_kind = 'member');

-- spreads
create policy "members read spreads" on public.spreads for select using (public.is_member());
create policy "guests read album pages" on public.spreads for select
  using (not hidden and public.is_guest(public.room_of_book(book_id)));
create policy "shared spreads are readable" on public.spreads for select
  using (not hidden and exists (select 1 from public.books b where b.id = book_id and b.visibility in ('link', 'public')));
create policy "members write studio spreads" on public.spreads for insert
  with check (public.is_member() and created_by = auth.uid());
create policy "guests add one page while open" on public.spreads for insert
  with check (
    created_by = auth.uid()
    and public.is_guest(public.room_of_book(book_id))
    and public.room_is_open(public.room_of_book(book_id))
    and not public.has_page(book_id)
    and public.guest_safe_cards(cards)
  );
create policy "members update spreads" on public.spreads for update using (public.is_member());
create policy "guests revise own page while open" on public.spreads for update
  using (created_by = auth.uid() and public.room_is_open(public.room_of_book(book_id)))
  with check (created_by = auth.uid() and hidden = false and public.guest_safe_cards(cards));
create policy "members delete spreads" on public.spreads for delete using (public.is_member());

create policy "members read versions" on public.spread_versions for select using (public.is_member());
create policy "members add versions" on public.spread_versions for insert with check (public.is_member());

-- comments & votes: members only.
create policy "members read comments" on public.comments for select using (public.is_member());
create policy "members comment" on public.comments for insert with check (public.is_member() and user_id = auth.uid());
create policy "own comments" on public.comments for delete using (user_id = auth.uid() or public.is_admin());
create policy "members read votes" on public.votes for select using (public.is_member());
create policy "members vote" on public.votes for all using (user_id = auth.uid() and public.is_member())
  with check (user_id = auth.uid() and public.is_member());

-- Back Room cards: never visible to guests or visitors.
create policy "members read custom cards" on public.custom_cards for select using (public.is_member());
create policy "members mint" on public.custom_cards for insert with check (public.is_member() and minted_by = auth.uid());
create policy "unmint own" on public.custom_cards for delete using (minted_by = auth.uid() or public.is_admin());

-- appraisals: written only through appraisal_quota().
create policy "own appraisal log" on public.appraisals for select using (user_id = auth.uid());

-- rooms: members manage; guests read their own room.
create policy "members read rooms" on public.rooms for select using (public.is_member());
create policy "guests read their room" on public.rooms for select using (public.is_guest(id));
create policy "members update rooms" on public.rooms for update using (public.is_member());

-- guests: everyone in the room sees the guest list; rows are created only by join_room().
create policy "room sees guests" on public.room_guests for select using (public.is_guest(room_id) or public.is_member());

-- pulls: owners manage their own while the room is open; the room sees held cards for trading.
create policy "room sees pulls" on public.pulls for select using (public.is_guest(room_id) or public.is_member());
create policy "guests post cards while open" on public.pulls for insert with check (
  owner_id = auth.uid() and public.is_guest(room_id) and public.room_is_open(room_id) and public.guest_safe_card(card)
);
create policy "own pulls while open" on public.pulls for update
  using (owner_id = auth.uid() and public.room_is_open(room_id)) with check (owner_id = auth.uid());

-- trades: participants see and create; acceptance goes through accept_trade().
create policy "trade participants" on public.trades for select using (from_user = auth.uid() or to_user = auth.uid() or public.is_member());
create policy "offer trades" on public.trades for insert with check (
  from_user = auth.uid() and public.is_guest(room_id) and public.room_is_open(room_id)
  and exists (select 1 from public.pulls p where p.id = from_pull and p.owner_id = auth.uid() and p.status = 'held')
);
create policy "decline trades" on public.trades for update using (to_user = auth.uid() or from_user = auth.uid())
  with check (state = 'declined');

-- reactions: guests react to album pages, members to anything they can read.
create policy "read reactions" on public.reactions for select using (true);
create policy "react" on public.reactions for insert with check (
  user_id = auth.uid()
  -- no voting for your own pitch
  and (kind <> 'vote' or not exists (select 1 from public.spreads s where s.id = spread_id and s.created_by = auth.uid()))
  and (
    public.is_member()
    or exists (select 1 from public.spreads s where s.id = spread_id and public.is_guest(public.room_of_book(s.book_id)))
  )
);
create policy "unreact" on public.reactions for delete using (user_id = auth.uid());

-- team forming: guests of the room (or members) join ideas once the market has closed.
create policy "read team joins" on public.team_joins for select using (true);
create policy "join an idea after close" on public.team_joins for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.spreads s where s.id = spread_id
      and (public.is_member() or public.is_guest(public.room_of_book(s.book_id)))
      and not public.room_is_open(public.room_of_book(s.book_id))
  )
);
create policy "leave an idea" on public.team_joins for delete using (user_id = auth.uid());

-- Realtime for the jam room (album, trades, reactions, guests).
alter publication supabase_realtime add table public.spreads, public.trades, public.reactions, public.room_guests, public.pulls, public.team_joins, public.rooms;
