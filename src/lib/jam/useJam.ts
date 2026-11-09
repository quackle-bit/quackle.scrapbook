"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "../supabase/browser";
import { LocalJam } from "./local";
import { SupabaseJam } from "./supabase";
import type { JamTransport, RoomSnapshot } from "./types";

let transport: JamTransport | null = null;
/** Shared Supabase rooms when configured, otherwise the local (multi-tab) preview. */
export function getJam(): JamTransport {
  if (!transport) {
    const sb = supabaseBrowser();
    transport = sb ? new SupabaseJam(sb) : new LocalJam();
  }
  return transport;
}

export function useRoom(roomId: string | null) {
  const jam = useMemo(() => getJam(), []);
  const [snap, setSnap] = useState<RoomSnapshot | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!roomId) return;
    try {
      setSnap(await jam.snapshot(roomId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the room.");
    }
  }, [jam, roomId]);

  useEffect(() => {
    void jam.userId().then(setMe, () => setMe(null));
  }, [jam]);
  useEffect(() => {
    if (!roomId) return;
    void refresh();
    return jam.subscribe(roomId, () => void refresh());
  }, [jam, roomId, refresh]);

  return { jam, snap, me, error, setError, refresh };
}

/** Seconds until the market closes (0 when closed), ticking every second. */
export function useCountdown(endsAt: string | undefined, closed: boolean | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!endsAt || closed) return 0;
  return Math.max(0, Math.round((new Date(endsAt).getTime() - now) / 1000));
}

export const fmtClock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
};
