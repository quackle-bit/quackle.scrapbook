// Runs the migration in PGlite (Postgres in WASM) with Supabase stand-ins and checks every
// RLS rule and server-side limit as different users. `npm run db:test`, no Supabase needed.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8");
const db = new PGlite({ extensions: { pgcrypto } });

// Minimal Supabase stand-ins.
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role authenticated;
  create role anon;
  create publication supabase_realtime;
`);
await db.exec(migration);
await db.exec(`grant usage on schema public, auth to authenticated; grant all on all tables in schema public to authenticated;
  grant execute on all functions in schema public to authenticated; grant usage, select on all sequences in schema public to authenticated;
  grant select on auth.users to authenticated;`);
console.log("✓ migration applied");

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const MEMBER = "00000000-0000-0000-0000-00000000000b";
const STRANGER = "00000000-0000-0000-0000-00000000000c";
const GUEST1 = "00000000-0000-0000-0000-00000000000d";
const GUEST2 = "00000000-0000-0000-0000-00000000000e";

await db.exec(
  `insert into public.allowlist (email, role) values ('boss@quackle.bit','admin'), ('dev@quackle.bit','member')`,
);
await db.exec(
  `insert into auth.users values ('${ADMIN}','Boss@quackle.bit'), ('${MEMBER}','dev@quackle.bit'), ('${STRANGER}','x@evil.com'), ('${GUEST1}', null), ('${GUEST2}', null)`,
);
const members = await db.query(`select email, role from public.members order by email`);
console.log("members via trigger:", members.rows);

async function as(uid, sql, params) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`,
  );
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`reset role;`);
  }
}
async function expectFail(label, p) {
  try {
    const r = await p;
    console.log(`✗ ${label}: expected failure, got`, r.rows ?? r);
    process.exitCode = 1;
  } catch (e) {
    console.log(`✓ ${label} → refused (${e.message.split("\n")[0]})`);
  }
}
const ok = (label, v) =>
  console.log(`${v ? "✓" : "✗"} ${label}`, v === true ? "" : JSON.stringify(v));

// Studio: members create books and spreads; strangers see nothing.
const book = (
  await as(
    MEMBER,
    `insert into public.books (owner_kind, owner_id, title) values ('member', auth.uid(), 'Studio Ideas') returning id`,
  )
).rows[0].id;
await as(
  MEMBER,
  `insert into public.spreads (book_id, slots, cards) values ($1, '{seed}', '{"seed":{"text":"lantern"}}')`,
  [book],
);
ok(
  "member reads spreads",
  (await as(MEMBER, `select count(*)::int n from public.spreads`)).rows[0].n === 1,
);
ok(
  "stranger sees 0 spreads",
  (await as(STRANGER, `select count(*)::int n from public.spreads`)).rows[0].n === 0,
);
ok(
  "stranger sees 0 custom cards",
  (await as(STRANGER, `select count(*)::int n from public.custom_cards`)).rows[0].n === 0,
);
await expectFail(
  "stranger inserts studio book",
  as(STRANGER, `insert into public.books (owner_kind, title) values ('member','x')`),
);
await as(
  MEMBER,
  `insert into public.custom_cards (type, text, rarity) values ('seed','the founder''s mug','mythic')`,
);
await expectFail(
  "stranger mints a card",
  as(STRANGER, `insert into public.custom_cards (type, text) values ('seed','hack')`),
);
await expectFail(
  "member promotes self to admin",
  as(MEMBER, `update public.members set role='admin' where user_id = auth.uid() returning *`).then(
    (r) => {
      if (!r.rows.length) throw new Error("no rows updated");
      return r;
    },
  ),
);

// Appraiser quota
for (let i = 0; i < 3; i++) await as(MEMBER, `select public.appraisal_quota(3) ok`);
ok(
  "4th appraisal over the limit is refused",
  (await as(MEMBER, `select public.appraisal_quota(3) ok`)).rows[0].ok === false,
);
ok(
  "stranger gets no appraisal",
  (await as(STRANGER, `select public.appraisal_quota(3) ok`)).rows[0].ok === false,
);

// Jam rooms
await expectFail(
  "stranger creates a room",
  as(STRANGER, `select * from public.create_room('roots', 60, 2, 3)`),
);
const room = (await as(MEMBER, `select * from public.create_room('roots', 60, 2, 3)`)).rows[0];
ok("room created with code " + room.code, /^[A-Z0-9]{5}$/.test(room.code));
const g1 = (
  await as(GUEST1, `select * from public.join_room($1, 'pip')`, [room.code.toLowerCase()])
).rows[0];
ok("guest joins with start coins", g1.coins === 3);
await expectFail(
  "duplicate nickname",
  as(GUEST2, `select * from public.join_room($1, 'pip')`, [room.code]),
);
await as(GUEST2, `select * from public.join_room($1, 'quill')`, [room.code]);
await expectFail(
  "room full (cap 2)",
  as(STRANGER, `select * from public.join_room($1, 'zed')`, [room.code]),
);
for (let i = 0; i < 3; i++) await as(GUEST1, `select public.spend_room_coin($1) left_`, [room.id]);
await expectFail("4th coin when broke", as(GUEST1, `select public.spend_room_coin($1)`, [room.id]));
await expectFail(
  "guest edits own coins directly",
  as(
    GUEST1,
    `update public.room_guests set coins = 99 where user_id = auth.uid() returning *`,
  ).then((r) => {
    if (!r.rows.length) throw new Error("no rows updated");
    return r;
  }),
);

// Album: one page per guest while open; guests can't see studio books.
await as(GUEST1, `insert into public.spreads (book_id, slots, cards) values ($1, '{seed}', '{}')`, [
  room.album_book_id,
]);
await expectFail(
  "second page by same guest",
  as(GUEST1, `insert into public.spreads (book_id, slots, cards) values ($1, '{seed}', '{}')`, [
    room.album_book_id,
  ]),
);
ok(
  "guest sees only the album (1 spread)",
  (await as(GUEST1, `select count(*)::int n from public.spreads`)).rows[0].n === 1,
);
await expectFail(
  "stranger writes into album",
  as(STRANGER, `insert into public.spreads (book_id, slots, cards) values ($1, '{seed}', '{}')`, [
    room.album_book_id,
  ]),
);
const albumSpread = (await as(GUEST1, `select id from public.spreads`)).rows[0].id;
await as(GUEST2, `insert into public.reactions (spread_id, kind) values ($1, 'fire')`, [
  albumSpread,
]);
await expectFail(
  "stranger reacts",
  as(STRANGER, `insert into public.reactions (spread_id, kind) values ($1, 'heart')`, [
    albumSpread,
  ]),
);

// Trades: seed pulls as the server would, then trade.
const [p1, p2] = (
  await db.query(
    `insert into public.pulls (room_id, owner_id, card) values ($1,$2,'{"text":"bell"}'), ($1,$3,'{"text":"moth"}') returning id`,
    [room.id, GUEST1, GUEST2],
  )
).rows.map((r) => r.id);
const trade = (
  await as(
    GUEST1,
    `insert into public.trades (room_id, to_user, from_pull, to_pull) values ($1,$2,$3,$4) returning id`,
    [room.id, GUEST2, p1, p2],
  )
).rows[0].id;
await expectFail(
  "offerer accepts own trade",
  as(GUEST1, `select public.accept_trade($1)`, [trade]),
);
await as(GUEST2, `select public.accept_trade($1)`, [trade]);
const owners = (await db.query(`select id, owner_id from public.pulls`)).rows;
ok(
  "trade swapped owners",
  owners.find((r) => r.id === p1).owner_id === GUEST2 &&
    owners.find((r) => r.id === p2).owner_id === GUEST1,
);

// Adopt + close
const adopted = (await as(MEMBER, `select public.adopt_spread($1, $2) id`, [albumSpread, book]))
  .rows[0].id;
ok(
  "adopted page credited to pip",
  (await as(MEMBER, `select credited_to from public.spreads where id=$1`, [adopted])).rows[0]
    .credited_to === "pip",
);
await as(MEMBER, `update public.rooms set closed = true where id = $1`, [room.id]);
await expectFail(
  "revise page after close",
  as(GUEST1, `update public.spreads set notes='[1]' where id=$1 returning id`, [albumSpread]).then(
    (r) => {
      if (!r.rows.length) throw new Error("no rows updated");
      return r;
    },
  ),
);
await expectFail(
  "join a closed room",
  as(STRANGER, `select * from public.join_room($1, 'late')`, [room.code]),
);
console.log(process.exitCode ? "SOME CHECKS FAILED" : "ALL CHECKS PASSED");
