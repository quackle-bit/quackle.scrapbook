"use client";

import { useRef, useState } from "react";
import { feel } from "@/feel";
import type { CardData, SlotId } from "@/lib/deck";
import { shake, play } from "@/lib/motion";
import { settings, useSettings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { Duck, say, sayRandom } from "./Duck";
import type { TrashHow } from "./HandCard";
import { MiniPage, type Concept } from "./MiniPage";
import { PackStation } from "./PackStation";
import { ShellGame } from "./ShellGame";
import { TailorReels } from "./TailorReels";

const START_COINS = 8;
type Station = "pack" | "tailor" | "trickster";

export function Prototype() {
  const { muted, speed, reducedMotion } = useSettings();
  const [coins, setCoins] = useState(START_COINS);
  const [station, setStation] = useState<Station>("pack");
  const [slots, setSlots] = useState<Partial<Record<SlotId, CardData>>>({});
  const [tilts, setTilts] = useState<Partial<Record<SlotId, number>>>({});
  const [discard, setDiscard] = useState<CardData[]>([]);
  const [kept, setKept] = useState(0);
  const [concept, setConcept] = useState<Concept | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<SlotId | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const binRef = useRef<HTMLDivElement>(null);

  function spend() {
    if (coins <= 0) {
      sayRandom("broke");
      setCoins(START_COINS);
      return false;
    }
    setCoins((c) => c - 1);
    return true;
  }

  function stamp(card: CardData, slot: SlotId) {
    if (card.slot !== slot || slots[slot] || concept) return false;
    setSlots((s) => ({ ...s, [slot]: card }));
    setTilts((t) => ({ ...t, [slot]: (Math.random() * 2 - 1) * feel.stampTiltDeg }));
    setKept((k) => k + 1);
    setTimeout(() => {
      void shake(rootRef.current, feel.shakePx, feel.shake);
      sayRandom("stamp");
    }, feel.stampSnap);
    return true;
  }

  function trash(card: CardData, how: TrashHow) {
    setDiscard((d) => [card, ...d]);
    sfx.quack();
    sayRandom("trash");
    void play(
      binRef.current,
      [
        { transform: "rotate(0)" },
        { transform: "rotate(-10deg) scale(1.1)" },
        { transform: "rotate(8deg)" },
        { transform: "rotate(0)" },
      ],
      feel.binShake,
    );
    if (how === "rip") say("Ripped to bits. QUACK!");
  }

  function peel(slot: SlotId) {
    const card = slots[slot];
    if (!card) return;
    sfx.peel();
    setSlots((s) => {
      const next = { ...s };
      delete next[slot];
      return next;
    });
    setDiscard((d) => [card, ...d]);
    say("Peeled. It's in the discard pile.");
  }

  function newPage() {
    setSlots({});
    setTilts({});
    setConcept(null);
    sfx.peel();
    say("Fresh page. Let's go again.");
  }

  const props = { coins, spend, onStamp: stamp, onTrash: trash, onDragSlot: setDraggingSlot };

  return (
    <div ref={rootRef} className="proto">
      <header className="topbar">
        <span className="purse" aria-label={`${coins} coins`}>
          <span className="coin" aria-hidden>
            ¢
          </span>
          {coins}
        </span>
        <span className="counts">
          {kept} kept · {discard.length} quacked
        </span>
        <span className="toggles">
          <button
            type="button"
            aria-pressed={muted}
            aria-label="Mute"
            onClick={() => settings.set({ muted: !muted })}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            type="button"
            aria-pressed={speed}
            aria-label="Speed mode"
            onClick={() => settings.set({ speed: !speed })}
          >
            {speed ? "⚡ fast" : "⚡ off"}
          </button>
        </span>
      </header>
      {reducedMotion && (
        <p className="rm-note">Reduced motion is on: effects fade instead of moving.</p>
      )}

      <div className="layout">
        <div className="stage">
          <nav className="tabs" aria-label="Stalls">
            {(
              [
                ["pack", "Word Merchant"],
                ["tailor", "Tailor"],
                ["trickster", "Trickster"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-current={station === id}
                onClick={() => setStation(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          {station === "pack" && <PackStation {...props} />}
          {station === "tailor" && <TailorReels {...props} />}
          {station === "trickster" && <ShellGame {...props} />}
          <div
            ref={binRef}
            className="bin"
            data-drop="bin"
            aria-label={`Bin, ${discard.length} cards`}
          >
            <span>BIN</span>
            <small>{discard.length}</small>
          </div>
          <Duck />
        </div>

        <MiniPage
          slots={slots}
          tilts={tilts}
          draggingSlot={draggingSlot}
          concept={concept}
          onPeel={peel}
          onForged={setConcept}
          onTitle={(title) => setConcept((c) => (c ? { ...c, title } : c))}
          onNewPage={newPage}
        />
      </div>
    </div>
  );
}
