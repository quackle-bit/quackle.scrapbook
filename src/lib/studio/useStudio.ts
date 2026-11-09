"use client";

import { useEffect, useState } from "react";
import { setCustomCards } from "../deck";
import { supabaseBrowser } from "../supabase/browser";
import { LocalStudioRepo, SupabaseStudioRepo, type StudioRepo } from "./repo";

export type StudioAccess =
  | { state: "loading" }
  | { state: "signed-out" }
  | { state: "not-member"; email: string }
  | { state: "ready"; repo: StudioRepo };

/**
 * Picks the Studio backend: the shared Supabase library for signed-in allowlisted members,
 * or a local preview when Supabase isn't configured yet.
 */
export function useStudioAccess(): StudioAccess {
  const [access, setAccess] = useState<StudioAccess>({ state: "loading" });
  useEffect(() => {
    let alive = true;
    const sb = supabaseBrowser();
    if (!sb) {
      setAccess({ state: "ready", repo: new LocalStudioRepo() });
      return;
    }
    const check = async () => {
      const { data } = await sb.auth.getUser();
      if (!alive) return;
      if (!data.user) return setAccess({ state: "signed-out" });
      const { data: member } = await sb
        .from("members")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!alive) return;
      setAccess(
        member
          ? { state: "ready", repo: new SupabaseStudioRepo(sb) }
          : { state: "not-member", email: data.user.email ?? "" },
      );
    };
    void check();
    const { data: sub } = sb.auth.onAuthStateChange(() => void check());
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return access;
}

const ACTIVE_KEY = "qs.studio.activeBook";
export const activeBook = {
  get: () => {
    try {
      return localStorage.getItem(ACTIVE_KEY);
    } catch {
      return null;
    }
  },
  set: (id: string) => {
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      /* ignore */
    }
  },
};

/** Load minted cards into the deck so the Back Room stall can sell them. */
export async function loadBackRoom(repo: StudioRepo) {
  try {
    setCustomCards(await repo.listCards());
  } catch {
    setCustomCards([]);
  }
}
