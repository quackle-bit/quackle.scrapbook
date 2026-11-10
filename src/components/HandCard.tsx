"use client";

import type { CSSProperties } from "react";
import { feel } from "@/feel";
import type { CardData, SlotId } from "@/lib/deck";
import { sfx } from "@/lib/sound";
import { CardBack, CardFace } from "./Card";
import { sayRandom } from "./Duck";
import { DragCard, type TrashHow } from "./feel/DragCard";

export type { TrashHow };

type Props = {
  card: CardData;
  faceUp?: boolean;
  tilt?: number;
  lift?: number;
  flipSignal?: number;
  flipDelay?: number;
  selected?: boolean;
  onSelect?: (id: string | null) => void;
  onFlipped?: (card: CardData) => void;
  /** Return false if the card can't go there (slot full or wrong type). */
  onStamp: (card: CardData, slot: SlotId) => boolean;
  onTrash: (card: CardData, how: TrashHow) => void;
  onDragSlot?: (slot: SlotId | null) => void;
  style?: CSSProperties;
};

/** The street's card rules for DragCard: pixel faces, rarity ceremony, slot matching. */
export function streetCard(
  onStamp: Props["onStamp"],
  onTrash: Props["onTrash"],
  onDragSlot?: Props["onDragSlot"],
) {
  return {
    renderFace: (c: CardData, style?: CSSProperties) => <CardFace card={c} style={style} />,
    renderBack: () => <CardBack />,
    label: (c: CardData, up: boolean) =>
      up
        ? `${c.text}, ${c.rarity} ${c.slot} card. Press for actions.`
        : "Face-down card. Press to flip.",
    flipPause: (c: CardData) =>
      c.rarity === "mythic" ? feel.mythicPause : c.rarity === "rare" ? feel.rarePause : 0,
    onRevealed: (c: CardData) => {
      if (c.rarity === "rare") {
        sfx.sparkle();
        sayRandom("rare");
      }
      if (c.rarity === "mythic") {
        sfx.fanfare();
        sayRandom("mythic");
      }
    },
    accepts: (t: HTMLElement, c: CardData): true | string => {
      const slot = t.dataset.slot;
      if (slot !== c.slot && slot !== "free") return "Wrong slot, friend.";
      if (t.classList.contains("filled")) return "That slot's taken. Peel it first.";
      return true;
    },
    findTarget: (c: CardData) =>
      document.querySelector<HTMLElement>(
        `[data-drop="slot"][data-slot="${c.slot}"]:not(.filled), [data-drop="slot"][data-slot="free"]:not(.filled)`,
      ) ?? document.querySelector<HTMLElement>(`[data-drop="slot"][data-slot="${c.slot}"]`),
    onStamp: (c: CardData, t: HTMLElement) => onStamp(c, t.dataset.slot as SlotId),
    onTrash,
    onDragging: (c: CardData | null) => onDragSlot?.(c ? c.slot : null),
  };
}

/** The street's card: DragCard with the street skin and slot rules. */
export function HandCard({ onStamp, onTrash, onDragSlot, ...p }: Props) {
  return <DragCard<CardData> {...p} skin="street" {...streetCard(onStamp, onTrash, onDragSlot)} />;
}
