"use client";

import { useSyncExternalStore } from "react";

/** Player toggles (mute, speed mode) plus the OS reduced-motion preference. */
export type StationId = "lofi" | "rain" | "morning" | "jazz" | "study";
export type Settings = {
  muted: boolean;
  speed: boolean;
  reducedMotion: boolean;
  /** Radio: volume 0..1 and station persist; playing never does (browsers need a tap). */
  musicVolume: number;
  station: StationId;
  musicOn: boolean;
  /** Player override for reduced motion (null = follow the OS). */
  motionOverride: boolean | null;
  /** Show the pages hidden from the short pitch (high concept, objective, audio, extra options). */
  showExtras: boolean;
  /** Dark mode: the paper is inverted (art keeps its colours). */
  dark: boolean;
};

const KEY = "qs.settings";
let state: Settings = {
  muted: false,
  speed: false,
  reducedMotion: false,
  musicVolume: 0.5,
  station: "lofi",
  musicOn: false,
  motionOverride: null,
  showExtras: false,
  dark: false,
};
let osReduced = false;
const listeners = new Set<() => void>();
let started = false;

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    state = {
      ...state,
      muted: !!saved.muted,
      speed: !!saved.speed,
      musicVolume:
        typeof saved.musicVolume === "number" ? Math.min(1, Math.max(0, saved.musicVolume)) : 0.5,
      station: ["lofi", "rain", "morning", "jazz", "study"].includes(saved.station)
        ? saved.station
        : "lofi",
      motionOverride: typeof saved.motionOverride === "boolean" ? saved.motionOverride : null,
      showExtras: !!saved.showExtras,
      dark: !!saved.dark,
    };
  } catch {
    /* storage unavailable: keep defaults */
  }
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  osReduced = mq.matches;
  state = { ...state, reducedMotion: state.motionOverride ?? osReduced };
  mq.addEventListener("change", (e) => {
    osReduced = e.matches;
    setState({ reducedMotion: state.motionOverride ?? osReduced });
  });
}

function setState(patch: Partial<Settings>) {
  state = { ...state, ...patch };
  if ("motionOverride" in patch) state.reducedMotion = state.motionOverride ?? osReduced;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        muted: state.muted,
        speed: state.speed,
        musicVolume: state.musicVolume,
        station: state.station,
        motionOverride: state.motionOverride,
        showExtras: state.showExtras,
        dark: state.dark,
      }),
    );
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

const SERVER: Settings = {
  muted: false,
  speed: false,
  reducedMotion: false,
  musicVolume: 0.5,
  station: "lofi",
  musicOn: false,
  motionOverride: null,
  showExtras: false,
  dark: false,
};

export function useSettings(): Settings {
  return useSyncExternalStore(settings.subscribe, settings.get, () => SERVER);
}
