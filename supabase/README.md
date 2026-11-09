# Supabase setup (Studio + Jam rooms)

Until these steps are done, `/studio` and `/jam` run as **local previews** in the browser and
the Appraiser refuses in production. Nothing else changes for visitors.

1. Create a project at supabase.com.
2. **SQL editor →** paste and run `migrations/0001_init.sql`.
3. **Authentication → Providers:** enable _Email_ (magic link) and _Anonymous sign-ins_ (jam guests).
4. **Authentication → URL configuration:** add `http://localhost:3000/auth/callback` and your
   Vercel URL + `/auth/callback` as redirect URLs.
5. Add studio emails to the allowlist (SQL editor):
   ```sql
   insert into public.allowlist (email, role) values ('you@quacklebit.com', 'admin');
   ```
   Members are created automatically the first time an allowlisted email signs in.
6. Copy the keys into `.env.local` (and Vercel → Settings → Environment Variables):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `ANTHROPIC_API_KEY` for the Appraiser.

`npm run db:test` runs the migration in PGlite (Postgres in WebAssembly) with Supabase stand-ins
and checks every RLS rule and server-side limit as different users. No Supabase account needed.
