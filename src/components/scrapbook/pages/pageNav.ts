"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Lets a page with steps inside it (like Mood & world's tabs) take over the bottom bar's Back/Next
 * until its steps are done, so they can't be skipped by accident. `next`/`back` return true when
 * they handled the press; `nextLabel` replaces the Next button's text.
 */
export type PageNavHook = {
  next?: () => boolean;
  back?: () => boolean;
  nextLabel?: string;
};

let hook: PageNavHook | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

let lastDir: 1 | -1 = 1;

export const pageNav = {
  /** Which way the last page turn went, so a stepped page can open on its last step after Back. */
  setDir: (d: 1 | -1) => {
    lastDir = d;
  },
  dir: () => lastDir,
  next: () => hook?.next?.() ?? false,
  back: () => hook?.back?.() ?? false,
};

export function usePageNav(h: PageNavHook | null) {
  useEffect(() => {
    if (!h) return;
    hook = h;
    emit();
    return () => {
      if (hook === h) {
        hook = null;
        emit();
      }
    };
  }, [h]);
}

/** The current hook's Next label (for the bottom bar). */
export function usePageNavLabel() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => hook?.nextLabel,
    () => undefined,
  );
}
