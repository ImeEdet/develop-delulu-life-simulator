/**
 * Engine-wide randomness.
 *
 * By default every helper falls back to Math.random (normal play).
 * Tests and seeded long-life simulations call setSeed() so a whole life
 * can be replayed deterministically from one integer.
 */

let seedState = 0x9e3779b9;
let seeded = false;

export function setSeed(seed: number): void {
  seedState = (seed >>> 0) || 0x9e3779b9;
  seeded = true;
}

export function useEntropy(): void {
  seeded = false;
}

export function isSeeded(): boolean {
  return seeded;
}

/** mulberry32 — small, fast, repeatable PRNG in [0, 1) */
export function random(): number {
  if (!seeded) return Math.random();
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const ri = (a: number, b: number): number =>
  a + Math.floor(random() * (b - a + 1));

export const chance = (p: number): boolean => random() < p;

export const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(random() * arr.length)];

export function pickWeighted<T>(items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, it) => sum + Math.max(0, weight(it)), 0);
  let r = random() * total;
  for (const it of items) {
    r -= Math.max(0, weight(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function sampleCount<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

export function clamp(v: number, a = 0, b = 100): number {
  return Math.max(a, Math.min(b, v));
}
