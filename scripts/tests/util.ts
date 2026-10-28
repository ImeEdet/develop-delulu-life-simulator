import { random, setSeed } from "../../src/game/rng";
import { newRandomLife, newCustomLife, buildRandomSpec } from "../../src/game/characters";
import { ageUp, getEvent } from "../../src/game/simulate";
import { runEvent } from "../../src/game/events";
import { doAction } from "../../src/game/actions";
import type { GameState } from "../../src/game/types";

export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

export function assertEqual<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) throw new Error(`${msg} — expected ${String(expected)}, got ${String(actual)}`);
}

export function freshLife(seed = 1234): GameState {
  setSeed(seed);
  return newRandomLife(0);
}

export function playYears(s: GameState, years: number) {
  for (let y = 0; y < years && !s.over; y++) {
    ageUp(s);
    while (s.pending.length > 0 && !s.over) {
      const pc = s.pending.shift()!;
      const ev = getEvent(pc.eventId);
      const p = s.chars[s.currentId];
      if (ev) runEvent(s, p, ev, pc.choices[Math.floor(random() * pc.choices.length)]?.id);
    }
    const p = s.chars[s.currentId];
    if (!p.alive) break;
    if (p.age >= 16 && !p.job && !p.uni && random() < 0.6) doAction(s, "jobhunt");
    if (p.age >= 18 && !p.partnerId && random() < 0.4) doAction(s, "date");
    if (p.partnerId && !p.flags.includes("married") && (p.partnerValue ?? 0) >= 65) doAction(s, "propose");
    if (p.partnerId && (p.age === 30 || p.age === 34)) doAction(s, "baby");
    if (p.age === 35 && !p.house && p.money > 20000) doAction(s, "house");
    if (p.age === 45 && !p.car && p.money > 30000) doAction(s, "car");
    if (p.job && p.age % 4 === 0) doAction(s, "promote");
    if (p.age === 25) doAction(s, "exercise");
    if (p.age >= 6 && random() < 0.5) doAction(s, "learn", "french");
  }
}

export function customSpec(overrides: Partial<ReturnType<typeof buildRandomSpec>> = {}) {
  setSeed(77);
  return { ...buildRandomSpec(), ...overrides };
}

export function makeCustom(overrides: Partial<ReturnType<typeof buildRandomSpec>> = {}) {
  return newCustomLife(customSpec(overrides), 0);
}
