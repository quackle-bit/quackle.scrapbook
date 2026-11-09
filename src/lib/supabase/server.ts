import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** Server client acting as the signed-in user (row-level security applies). */
export async function supabaseServer(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component: the proxy refreshes the session instead */
        }
      },
    },
  });
}

export type Member = { user: User; role: "member" | "admin" };

/**
 * The signed-in studio member, or null. Membership is the `members` allowlist table
 * (an email must be listed there to count), checked on the server for every Studio API call.
 */
export async function currentMember(sb: SupabaseClient): Promise<Member | null> {
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: row } = await sb
    .from("members")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!row) return null;
  return { user: data.user, role: row.role === "admin" ? "admin" : "member" };
}
