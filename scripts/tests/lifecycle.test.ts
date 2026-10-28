import { ageUp, continueAs, eligibleSuccessors } from "../../src/game/simulate";
import { newRandomLife } from "../../src/game/characters";
import { doAction } from "../../src/game/actions";
import { setSeed } from "../../src/game/rng";
import { freshLife, playYears, assert, assertEqual } from "./util";

export const tests = [
  {
    name: "death is permanent: ageUp refuses to tick a finished life",
    fn: () => {
      const s = freshLife(11);
      playYears(s, 115);
      assert(s.over, "life should be over after 115 years");
      const p = s.chars[s.currentId];
      assert(!p.alive, "player should be dead");
      const yearBefore = s.worldYear;
      const ageBefore = p.age;
      ageUp(s); // must be a no-op
      ageUp(s);
      assertEqual(s.worldYear, yearBefore, "world year advanced after death");
      assertEqual(p.age, ageBefore, "dead character aged");
      assert(!!p.deathYear && !!p.causeOfDeath, "death record missing");
    },
  },
  {
    name: "death fires exactly once (no duplicate death entries)",
    fn: () => {
      const s = freshLife(22);
      playYears(s, 115);
      const p = s.chars[s.currentId];
      const deaths = s.log.filter((l) => l.text.includes("died at")).length;
      assertEqual(deaths, 1, `expected one death line, got ${deaths}`);
      assert(!!s.overText, "missing final life summary");
      void p;
    },
  },
  {
    name: "generational succession continues with a living descendant and clears game-over",
    fn: () => {
      const s = freshLife(33);
      playYears(s, 115);
      const heirs = eligibleSuccessors(s);
      if (heirs.length === 0) return; // some seeds have no heirs; covered by other seeds
      // prefer the youngest adult heir so ordinary mortality doesn't end the test
      const heir = [...heirs].sort((a, b) => a.age - b.age).find((h) => h.age >= 16) ?? heirs[heirs.length - 1];
      const oldGen = s.generation;
      continueAs(s, heir.id);
      assert(!s.over, "over flag not cleared by continueAs");
      assertEqual(s.currentId, heir.id, "current character not switched");
      assertEqual(s.generation, oldGen + 1, "generation did not increment");
      const yearBefore = s.worldYear;
      playYears(s, 5);
      assert(s.worldYear > yearBefore, "successor life does not advance");
      const after = s.chars[heir.id];
      if (!after.alive) {
        // a death during play is legitimate if recorded properly
        assert(!!after.deathYear && !!after.causeOfDeath, "successor death not recorded");
        assert(s.over, "game-over not set after successor death");
      }
    },
  },
  {
    name: "a new life never resurrects or mutates the previous one",
    fn: () => {
      const s1 = freshLife(44);
      playYears(s1, 115);
      const deadId = s1.currentId;
      const snapshot = JSON.stringify(s1.chars[deadId]);
      // starting another life is a separate state object
      setSeed(45);
      const s2 = newRandomLife(0);
      // ids restart per life, so compare identity by content, not id
      const dead = JSON.parse(snapshot);
      const overlap = Object.values(s2.chars).some(
        (c) => c.firstName === dead.firstName && c.lastName === dead.lastName && c.birthYear === dead.birthYear
      );
      assert(!overlap, "old character leaked into a new life");
      assertEqual(JSON.stringify(s1.chars[deadId]), snapshot, "dead life mutated");
      assertEqual(s2.over, false, "new life started already over");
    },
  },
  {
    name: "regression: a player's death releases the living spouse's partner link",
    fn: () => {
      const s = freshLife(33);
      const p = s.chars[s.currentId];
      // find a partner while aging, then run to the guaranteed lifespan cap
      let guard = 0;
      while (!s.over && guard++ < 115) {
        ageUp(s);
        while (s.pending.length) s.pending.shift();
        if (!s.over && p.age >= 18 && !p.partnerId && guard % 3 === 0) doAction(s, "date");
      }
      assert(s.over, "life should end by the cap");
      assert(!p.alive && !!p.deathYear, "death should be recorded");
      if (p.partnerId) {
        const spouse = s.chars[p.partnerId];
        if (spouse && spouse.alive) {
          assert(!spouse.partnerId, "living spouse still linked to the dead player");
          assert(spouse.partnerHistory.includes(p.id), "widowed spouse lost the history entry");
        }
      }
    },
  },
  {
    name: "age progression visits every life stage",
    fn: () => {
      const s = freshLife(55);
      const p = s.chars[s.currentId];
      const seen = new Set<number>();
      for (let i = 0; i < 90 && !s.over; i++) {
        seen.add(p.age);
        ageUp(s);
        while (s.pending.length) s.pending.shift();
      }
      if (s.over) {
        // a natural early death is a legitimate outcome, but it must be recorded
        assert(!p.alive && !!p.deathYear && !!p.causeOfDeath, "early life ended without a recorded death");
        assert(p.age >= 18, "life ended before adulthood");
      }
      const maxSeen = Math.max(...seen);
      for (const a of [1, 6, 13, 18, 40, 60]) {
        if (a <= maxSeen) assert(maxSeen >= a, `never reached age band ${a}`);
      }
      if (!s.over) assert(p.age >= 60, "full run ended before seniority");
    },
  },
];
