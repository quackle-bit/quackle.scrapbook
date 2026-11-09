"use client";

import { useSyncExternalStore } from "react";

/** Player toggles (mute, speed mode) plus the OS reduced-motion preference. */
export type Settings = { muted: boolean; speed: boolean; reducedMotion: boolean };

const KEY = "qs.settings";
let state: Settings = { muted: false, speed: false, reducedMotion: false };
const listeners = new Set<() => void>();
let started = false;

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    state = { ...state, muted: !!saved.muted, speed: !!saved.speed };
  } catch {
    /* storage unavailable: keep defaults */
  }
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  state = { ...state, reducedMotion: mq.matches };
  mq.addEventListener("change", (e) => setState({ reducedMotion: e.matches }));
}

function setState(patch: Partial<Settings>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify({ muted: state.muted, speed: state.speed }));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const settings = {
  get: (): Settings => {
    start();
    return state;
  },
  set: setState,
  subscribe(l: () => void) {
    start();
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

const SERVER: Settings = { muted: false, speed: false, reducedMotion: false };

export function useSettings(): Settings {
  return useSyncExternalStore(settings.subscribe, settings.get, () => SERVER);
}
