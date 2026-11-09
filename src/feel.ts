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
  holdToCrumple: 420,
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
