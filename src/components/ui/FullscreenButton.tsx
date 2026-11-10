"use client";

import { Icon } from "./Icon";
import { useFullscreen } from "./useFullscreen";

/** Top-bar full screen toggle; renders nothing where pages can't go full screen (iPhone Safari). */
export function FullscreenButton() {
  const fs = useFullscreen();
  if (!fs.supported) return null;
  return (
    <button
      type="button"
      className="dk-icon-btn"
      onClick={fs.toggle}
      aria-pressed={fs.on}
      aria-label={fs.on ? "Exit full screen" : "Full screen"}
    >
      <Icon name={fs.on ? "exitFullscreen" : "fullscreen"} />
    </button>
  );
}
