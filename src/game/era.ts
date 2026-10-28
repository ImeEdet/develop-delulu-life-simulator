/**
 * Era scaling — standalone so content.ts and economy.ts can both use it
 * without an import cycle.
 */

/** Approximate nominal-price anchors (US CPI-style), 2023-25 = 1.0. */
const ERA_ANCHORS: readonly (readonly [number, number])[] = [
  [1940, 0.1], [1950, 0.12], [1960, 0.17], [1970, 0.22], [1980, 0.42],
  [1990, 0.58], [2000, 0.72], [2010, 0.86], [2020, 0.98], [2025, 1.0],
];

export function eraFactor(year: number): number {
  if (year <= ERA_ANCHORS[0][0]) return ERA_ANCHORS[0][1];
  for (let i = 0; i < ERA_ANCHORS.length - 1; i++) {
    const [y0, v0] = ERA_ANCHORS[i];
    const [y1, v1] = ERA_ANCHORS[i + 1];
    if (year >= y0 && year <= y1) {
      const t = (year - y0) / (y1 - y0);
      return v0 + (v1 - v0) * t;
    }
  }
  return ERA_ANCHORS[ERA_ANCHORS.length - 1][1];
}

/** Convert a modern-USD figure into the nominal amount used in a given year. */
export function nominal(modernUsd: number, year: number): number {
  return Math.round(modernUsd * eraFactor(year));
}

/** Technology availability, so 1962 never gets a smartphone event. */
export const TECH_ERA: Record<string, number> = {
  television: 1952,
  internet: 1996,
  social: 2006,
  smartphone: 2009,
  streaming: 2011,
  crypto: 2013,
};

export function hasTech(year: number, tech: keyof typeof TECH_ERA): boolean {
  return year >= TECH_ERA[tech];
}
