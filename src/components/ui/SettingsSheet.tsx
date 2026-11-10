"use client";

import { Icon } from "./Icon";
import { useState } from "react";
import { radio } from "@/lib/radio";
import { settings, useSettings } from "@/lib/settings";
import { BottomSheet } from "./BottomSheet";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const s = useSettings();
  return (
    <>
      <button
        type="button"
        className="dk-icon-btn"
        onClick={() => setOpen(true)}
        aria-label="Settings"
      >
        <Icon name="settings" />
      </button>
      <BottomSheet open={open} title="Settings" onClose={() => setOpen(false)}>
        <div className="dk-settings">
          <label className="dk-switch">
            <input
              type="checkbox"
              checked={!s.muted}
              onChange={(e) => settings.set({ muted: !e.target.checked })}
            />
            <span>Sound effects</span>
          </label>
          <label className="dk-slider">
            <span>Music volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.musicVolume}
              onChange={(e) => radio.setVolume(+e.target.value)}
              aria-label="Music volume"
            />
          </label>
          <label className="dk-switch">
            <input
              type="checkbox"
              checked={s.reducedMotion}
              onChange={(e) => settings.set({ motionOverride: e.target.checked })}
            />
            <span>Reduce motion</span>
          </label>
          <label className="dk-switch">
            <input
              type="checkbox"
              checked={s.speed}
              onChange={(e) => settings.set({ speed: e.target.checked })}
            />
            <span>Skip animations (speed mode)</span>
          </label>
          <label className="dk-switch">
            <input
              type="checkbox"
              checked={s.showExtras}
              onChange={(e) => settings.set({ showExtras: e.target.checked })}
            />
            <span>Show extra pages (high concept, objective, sound, more options)</span>
          </label>
          {s.motionOverride !== null && (
            <button
              type="button"
              className="dk-btn ghost"
              onClick={() => settings.set({ motionOverride: null })}
            >
              Follow my device&apos;s motion setting
            </button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
