/**
 * All motion and sound timings live here so the feel can be tuned in one place.
 * Values are in milliseconds unless noted. See CLAUDE.md §5 (feel spec).
 */
export const feel = {
  /** Upper bound for a normal effect (anticipation → action → reaction). */
  maxEffect: 600,
  coinFlip: 250,
  packSlide: 300,
  cardFlip: 350,
  /** Rare/Mythic cards pause half-turned before revealing. */
  rarePause: 300,
  mythicPause: 600,
  stampThud: 180,
  /** Screen shake amplitude on stamp, in px. */
  shakePx: 4,
  /** Random sticker rotation range on stamp, in degrees (±). */
  stampTiltDeg: 3,
  forge: 2000,
  /** Sound pitch variation (±fraction). */
  pitchJitter: 0.05,
} as const;

export type Feel = typeof feel;
