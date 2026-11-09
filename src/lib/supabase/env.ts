/** Supabase is optional until Phase 3/4 is deployed: everything falls back to local previews. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isSupabaseConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
