/**
 * Small seeded RNG so packs can be reproduced from a seed (share links, debugging).
 * mulberry32 over a string hash: fast, tiny, good enough for card draws (not for security).
 */

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export type Rng = {
  /** Float in [0, 1). */
  next: () => number;
  /** Integer in [0, max). */
  int: (max: number) => number;
  /** Pick one item, optionally weighted. */
  pick: <T>(items: readonly T[], weight?: (item: T) => number) => T;
};

export function createRng(seed: string): Rng {
  let a = hashSeed(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (max: number) => Math.floor(next() * max);
  const pick = <T>(items: readonly T[], weight?: (item: T) => number): T => {
    if (items.length === 0) throw new Error("pick from empty list");
    if (!weight) return items[int(items.length)];
    const total = items.reduce((sum, item) => sum + weight(item), 0);
    let r = next() * total;
    for (const item of items) {
      r -= weight(item);
      if (r < 0) return item;
    }
    return items[items.length - 1];
  };
  return { next, int, pick };
}
