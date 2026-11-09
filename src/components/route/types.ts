import type { CardData, Pull, SlotId } from "@/lib/deck";
import type { TrashHow } from "../HandCard";

/** What every stop's mini-game receives from the route shell. */
export type StopProps = {
  /** Infinity in Studio (unlimited). */
  coins: number;
  spend: () => boolean;
  /** Tags of everything stamped so far (for Fresh pulls and keeper lines). */
  context: string[];
  onStamp: (card: CardData, slot: SlotId) => boolean;
  onTrash: (card: CardData, how: TrashHow) => void;
  onDragSlot: (slot: SlotId | null) => void;
  /** Cards dealt face-down/up into the hand (unsorted ones get swept into the discard pile). */
  onPulled?: (cards: CardData[]) => void;
};

export type { CardData, Pull };
