import { setSeed } from "../../src/game/rng";
import { newRandomLife, newCustomLife, buildRandomSpec } from "../../src/game/characters";
import { COUNTRY_LIST } from "../../src/game/world";
import { ageUp, continueAs, eligibleSuccessors, getEvent } from "../../src/game/simulate";
import { runEvent } from "../../src/game/events";
import { doAction } from "../../src/game/actions";
import { assert } from "./util";
import type { GameState } from "../../src/game/types";

/** Deterministic full-life runner used by the long-haul simulations. */
function runLife(s: GameState, maxYears: number) {
  for (let y = 0; y < maxYears && !s.over; y++) {
    ageUp(s);
    while (s.pending.length > 0 && !s.over) {
      const pc = s.pending.shift()!;
      const ev = getEvent(pc.eventId);
      const p = s.chars[s.currentId];
      if (ev) runEvent(s, p, ev, pc.choices[Math.floor(Math.random() * pc.choices.length)]?.id);
    }
    const p = s.chars[s.currentId];
    if (!p.alive) break;
    if (p.age >= 16 && !p.job && !p.uni) doAction(s, "jobhunt");
    if (p.age >= 18 && !p.partnerId) doAction(s, "date");
    if (p.partnerId && !p.flags.includes("married") && (p.partnerValue ?? 0) >= 65) doAction(s, "propose");
    if (p.partnerId && (p.age === 29 || p.age === 33 || p.age === 37)) doAction(s, "baby");
    if (p.uni && p.age === 20) doAction(s, "drop-uni"); // exercise dropout path on some years
  }
}

function checkInvariants(s: GameState, seed: number) {
  for (const c of Object.values(s.chars)) {
    if (c.partnerId) assert(!!s.chars[c.partnerId], `seed ${seed}: broken partner ref`);
    for (const k of c.childrenIds) assert(!!s.chars[k], `seed ${seed}: broken child ref`);
    if (c.motherId) assert(!!s.chars[c.motherId], `seed ${seed}: broken mother ref`);
    if (c.fatherId) assert(!!s.chars[c.fatherId], `seed ${seed}: broken father ref`);
    if (!c.alive) {
      assert(c.deathYear !== undefined, `seed ${seed}: dead without deathYear`);
      assert(c.age <= 120, `seed ${seed}: dead NPC aged past 120`);
    } else {
      assert(c.money >= 0, `seed ${seed}: negative cash on ${c.firstName}`);
    }
    for (const k of ["health", "happiness", "smarts", "looks"] as const) {
      assert(c[k] >= 0 && c[k] <= 100, `seed ${seed}: stat out of range ${c.firstName} ${k}=${c[k]}`);
    }
    assert(c.debts === c.loans.reduce((sum, l) => sum + l.balance, 0), `seed ${seed}: debts/loans desync`);
  }
  assert(s.log.length <= 500, `seed ${seed}: log not capped`);
  if (!s.over) assert(s.pending.length === 0, `seed ${seed}: stuck pending events`);
}

export const tests = [
  {
    name: "10 seeded 100-year lives stay internally consistent",
    fn: () => {
      for (let seed = 1001; seed <= 1010; seed++) {
        setSeed(seed);
        const s = newRandomLife(0);
        // 120 ticks covers the engine's guaranteed maximum lifespan.
        runLife(s, 120);
        checkInvariants(s, seed);
        assert(s.over, `seed ${seed}: life did not end within the lifespan cap`);
        // continue as a descendant when possible
        const heirs = eligibleSuccessors(s);
        if (heirs.length) {
          continueAs(s, heirs[0].id);
          runLife(s, 60);
          checkInvariants(s, seed);
        }
      }
    },
  },
  {
    name: "a fully custom life honors every entered detail",
    fn: () => {
      setSeed(2024);
      const base = buildRandomSpec();
      const s = newCustomLife(
        {
          ...base,
          firstName: "Zyzzyx",
          surname: "Testworthy",
          gender: "female",
          countryId: "ng",
          group: "igbo",
          city: "Enugu",
          birthYear: 1975,
          wealthTier: 3,
          designFamily: true,
          mother: { firstName: "Custommum", age: 32, alive: true },
          father: { firstName: "Customdad", age: 35, alive: true },
          siblings: [{ firstName: "Customsib", gender: "male", age: 8 }],
        },
        0
      );
      const p = s.chars[s.currentId];
      assert(p.firstName === "Zyzzyx" && p.lastName === "Testworthy", "custom name not kept");
      assert(p.gender === "female" && p.countryId === "ng" && p.city === "Enugu", "origin details lost");
      assert(p.birthYear === 1975 && p.wealthTier === 3, "year/tier lost");
      const mum = Object.values(s.chars).find((c) => c.firstName === "Custommum");
      const sib = Object.values(s.chars).find((c) => c.firstName === "Customsib");
      assert(mum && sib, "custom family missing");
      assert(sib!.lastName === "Testworthy", "sibling did not inherit surname");
      assert(sib!.gender === "male", "sibling gender wrong");
      runLife(s, 90);
      checkInvariants(s, 2024);
    },
  },
  {
    name: "historical (1950) and modern (2005) births both complete full lives",
    fn: () => {
      for (const year of [1950, 2005]) {
        setSeed(year);
        const spec = { ...buildRandomSpec(), birthYear: year };
        const s = newCustomLife(spec, 0);
        runLife(s, 100);
        checkInvariants(s, year);
      }
    },
  },
  {
    name: "every country can sustain a full life without errors",
    fn: () => {
      for (const cty of COUNTRY_LIST) {
        setSeed(cty.id.length * 13 + 7);
        const spec = { ...buildRandomSpec(), countryId: cty.id };
        const s = newCustomLife(spec, 0);
        runLife(s, 95);
        checkInvariants(s, cty.id.length);
      }
    },
  },
];
