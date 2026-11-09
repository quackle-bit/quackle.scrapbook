/**
 * All motion, gesture and sound tuning lives here so the feel can be adjusted in one place.
 * Durations are in milliseconds. See CLAUDE.md §5 (feel spec).
 */
export const feel = {
  /** Upper bound for a normal effect (anticipation → action → reaction). */
  maxEffect: 600,

  // Buying
  coinFlip: 380,
  packSlide: 420,

  // Opening
  /** Fraction of the pack width you must drag across to tear it open. */
  tearThreshold: 0.8,
  tearFlyOff: 380,
  fanIn: 380,
  fanStagger: 70,
  /** Degrees between fanned cards. */
  fanSpreadDeg: 7,
  cardFlip: 420,
  /** Rare/Mythic cards pause half-turned before revealing. */
  rarePause: 320,
  mythicPause: 650,

  // Gestures
  /** Hold still this long to crumple a card. */
  holdToCrumple: 520,
  /** Pointer travel (px) that cancels the hold and starts a drag. */
  dragSlop: 8,
  /** Release speed (px/ms) that counts as a fling / rip. */
  flingVelocity: 0.9,
  snapBack: 260,

  // Trash
  crumple: 260,
  rip: 520,
  fling: 520,
  intoBin: 320,
  binShake: 300,

  // Stamp
  stampSnap: 300,
  stampInk: 260,
  /** Screen shake amplitude on stamp, in px. */
  shakePx: 4,
  shake: 200,
  /** Random sticker rotation range on stamp, in degrees (±). */
  stampTiltDeg: 3,

  // Forge
  forge: 2000,

  // Mini-games
  reelTick: 70,
  respins: 2,
  shellSwap: 280,
  shellSwaps: 7,

  // Springs (Motion). Stiffness/damping: higher stiffness = snappier, lower damping = bouncier.
  spring: {
    /** Snap back to the hand. */
    snap: { type: "spring", stiffness: 520, damping: 30 } as const,
    /** Fly into a slot. */
    stamp: { type: "spring", stiffness: 380, damping: 32 } as const,
    /** Fly into the bin. */
    bin: { type: "spring", stiffness: 260, damping: 26 } as const,
    /** Fan re-spacing when a card leaves. */
    fan: { type: "spring", stiffness: 300, damping: 26 } as const,
    /** Fling glide (Motion inertia). */
    glide: { power: 0.9, timeConstant: 420, distance: 0.38 },
  },

  // Duck
  duckLine: 1700,

  // Sound
  /** Sound pitch variation (±fraction). */
  pitchJitter: 0.05,
  volume: 0.35,

  // Haptics (ms of vibration on phones that support it)
  haptic: { tear: 12, thud: 25, forge: [20, 40, 60] as number[] },
} as const;

export type Feel = typeof feel;
