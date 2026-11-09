"use client";

import { useState } from "react";
import { echo, mysteryCard } from "@/lib/deck";
import { OVERSHOOT, play } from "@/lib/motion";
import { createRng, freshSeed } from "@/lib/rng";
import { sfx } from "@/lib/sound";
import { HandCard } from "../HandCard";
import type { CardData, StopProps } from "./types";

/** The Mystery Crate: one random card of any type, for the FREE slot. No refunds. */
export function MysteryCrate({ coins, spend, onStamp, onTrash, onDragSlot }: StopProps) {
  const [card, setCard] = useState<CardData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  async function open() {
    if (!spend()) return;
    sfx.crumple();
    await play(
      document.querySelector(".crate"),
      [{ transform: "rotate(-4deg)" }, { transform: "rotate(4deg)" }, { transform: "none" }],
      300,
    );
    setCard(mysteryCard(createRng(freshSeed())));
    setOpened(true);
  }

  if (card) {
    return (
      <div className="stop-play single-card">
        <HandCard
          key={card.id}
          card={card}
          selected={selected === card.id}
          onSelect={setSelected}
          onStamp={(c, s) => {
            const ok = onStamp(c, s);
            if (ok) setCard(null);
            return ok;
          }}
          onTrash={(c, how) => {
            onTrash(c, how);
            setCard(null);
          }}
          onDragSlot={onDragSlot}
        />
        <span className="hint">flip it · drag it to FREE</span>
      </div>
    );
  }
  return (
    <div className="stop-play">
      <button
        type="button"
        className="crate"
        onClick={() => void open()}
        disabled={coins <= 0}
        aria-label="Open the crate · 1 coin"
      >
        <span>?</span>
      </button>
      <span className="hint">{opened ? "another one?" : "tap the crate · 1¢"}</span>
    </div>
  );
}

/** The Echo Well: shout a word in, get back 5 related words. Free. */
export function EchoWell({ context }: { context: string[] }) {
  const [word, setWord] = useState("");
  const [echoes, setEchoes] = useState<string[]>([]);
  return (
    <div className="stop-play">
      <form
        className="echo-form"
        onSubmit={(e) => {
          e.preventDefault();
          const out = echo(createRng(freshSeed()), word, context);
          setEchoes(out);
          sfx.whoosh();
          requestAnimationFrame(() =>
            document.querySelectorAll(".echo-word").forEach((el, i) =>
              play(
                el,
                [
                  { transform: "translateY(30px) scale(.6)", opacity: 0 },
                  { transform: "none", opacity: 1 },
                ],
                300,
                {
                  delay: i * 90,
                  easing: OVERSHOOT,
                  fill: "backwards",
                },
              ),
            ),
          );
        }}
      >
        <div className="well" aria-hidden />
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="shout a word…"
          aria-label="Word to shout"
          maxLength={30}
        />
        <button type="submit" className="big-btn">
          Shout!
        </button>
      </form>
      <ul className="echoes" aria-live="polite">
        {echoes.map((w) => (
          <li key={w} className="echo-word">
            {w}
          </li>
        ))}
      </ul>
      {!!echoes.length && (
        <span className="hint">just for thinking: echoes don&apos;t cost or stamp anything</span>
      )}
    </div>
  );
}
