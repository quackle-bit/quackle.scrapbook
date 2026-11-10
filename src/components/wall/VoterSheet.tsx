"use client";

import { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";

/** Pass-the-phone: pick who is voting, or add a new name. Names live only on this device. */
export function VoterSheet({
  open,
  voters,
  current,
  onPick,
  onClose,
}: {
  open: boolean;
  voters: string[];
  current: string;
  onPick: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  return (
    <BottomSheet open={open} title="Who's voting?" onClose={onClose}>
      <p className="dk-hint">
        Hand the phone to the next person. One vote each per round, and you can change it until the
        round closes.
      </p>
      {!!voters.length && (
        <div className="dk-chips" role="group" aria-label="Voters">
          {voters.map((v) => (
            <button
              key={v}
              type="button"
              className="dk-chip"
              aria-pressed={v === current}
              onClick={() => onPick(v)}
            >
              {v}
            </button>
          ))}
        </div>
      )}
      <form
        className="dk-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onPick(name.trim());
          setName("");
        }}
      >
        <input
          className="dk-input"
          style={{ flex: 1 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          maxLength={30}
        />
        <button type="submit" className="dk-btn primary" disabled={!name.trim()}>
          Vote as me
        </button>
      </form>
    </BottomSheet>
  );
}
