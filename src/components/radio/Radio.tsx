"use client";

import { Icon } from "../ui/Icon";
import { useState } from "react";
import { radio, STATIONS } from "@/lib/radio";
import { settings, useSettings } from "@/lib/settings";
import { BottomSheet } from "../ui/BottomSheet";

/** Radio controls: play/pause, station, volume, mute. Music is always opt-in. */
export function RadioPanel() {
  const { musicOn, station, musicVolume, muted } = useSettings();
  return (
    <div className="dk-radio-panel">
      <button
        type="button"
        className="dk-btn primary"
        onClick={() => radio.toggle()}
        aria-pressed={musicOn}
      >
        {musicOn ? "❚❚ Pause" : "▶ Play"}
      </button>
      <fieldset className="dk-stations">
        <legend>Station</legend>
        {STATIONS.map((s) => (
          <label key={s.id} className={`dk-station${station === s.id ? " on" : ""}`}>
            <input
              type="radio"
              name="station"
              checked={station === s.id}
              onChange={() => radio.setStation(s.id)}
            />
            <strong>{s.label}</strong>
            <small>{s.blurb}</small>
          </label>
        ))}
      </fieldset>
      <label className="dk-slider">
        <span>Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={musicVolume}
          onChange={(e) => radio.setVolume(+e.target.value)}
          aria-label="Music volume"
        />
      </label>
      <label className="dk-switch">
        <input
          type="checkbox"
          checked={muted}
          onChange={(e) => settings.set({ muted: e.target.checked })}
        />
        <span>Mute everything (music and sounds)</span>
      </label>
      {!musicOn && <p className="dk-hint">Music only plays when you press Play.</p>}
    </div>
  );
}

/** Small button for top bars; opens the radio in a bottom sheet. */
export function RadioButton() {
  const { musicOn } = useSettings();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`dk-icon-btn radio-btn${musicOn ? " playing" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={musicOn ? "Radio (playing)" : "Radio"}
      >
        <Icon name="music" />
      </button>
      <BottomSheet open={open} title="Radio" onClose={() => setOpen(false)}>
        <RadioPanel />
      </BottomSheet>
    </>
  );
}
