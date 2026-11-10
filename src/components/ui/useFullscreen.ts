"use client";

import { useCallback, useSyncExternalStore } from "react";

type FsDoc = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

const doc = () => (typeof document === "undefined" ? null : (document as FsDoc));
const isOn = () => !!(doc()?.fullscreenElement ?? doc()?.webkitFullscreenElement);

/**
 * Browser full screen. `supported` is false where pages can't go full screen (iPhone Safari):
 * the button is hidden there instead of doing nothing.
 */
export function useFullscreen() {
  const on = useSyncExternalStore(
    (cb) => {
      document.addEventListener("fullscreenchange", cb);
      document.addEventListener("webkitfullscreenchange", cb);
      return () => {
        document.removeEventListener("fullscreenchange", cb);
        document.removeEventListener("webkitfullscreenchange", cb);
      };
    },
    isOn,
    () => false,
  );
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!(doc()?.fullscreenEnabled || doc()?.webkitFullscreenEnabled),
    () => false,
  );
  const toggle = useCallback(() => {
    const d = doc();
    if (!d) return;
    try {
      if (isOn()) void (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
      else {
        const el = d.documentElement as FsEl;
        void (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
      }
    } catch {
      /* refused by the browser: nothing to do */
    }
  }, []);
  return { on, supported, toggle };
}
