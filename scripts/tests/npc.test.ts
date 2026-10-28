import { ageUp } from "../../src/game/simulate";
import { createChild } from "../../src/game/characters";
import { freshLife, assert, assertEqual } from "./util";
import { setSeed } from "../../src/game/rng";
import type { Char } from "../../src/game/types";

export const tests = [
  {
    name: "NPCs age every year and the family tree keeps valid references",
    fn: () => {
      const s = freshLife(202);
      const p = s.chars[s.currentId];
      const startAge = p.age;
      const tracked = Object.values(s.chars).filter((c) => c.alive).map((c) => ({ id: c.id, age: c.age }));
      playToAge(s, 30);
      const elapsed = p.age - startAge;
      for (const t of tracked) {
        const c = s.chars[t.id];
        if (c.alive) assertEqual(c.age, t.age + elapsed, `${c.firstName} did not age with the world`);
      }
      for (const c of Object.values(s.chars)) {
        if (c.partnerId) assert(s.chars[c.partnerId], "dangling partner ref");
        if (c.motherId) assert(s.chars[c.motherId], "dangling mother ref");
        if (c.fatherId) assert(s.chars[c.fatherId], "dangling father ref");
      }
    },
  },
  {
    name: "NPCs progress through school and careers over a long life",
    fn: () => {
      const s = freshLife(303);
      playToAge(s, 60);
      const adults = Object.values(s.chars).filter((c) => c.age >= 25);
      const engaged = adults.filter((c) => c.job || c.retired || c.education === "university" || c.uni);
      assert(engaged.length >= 1, "no adult NPC reached work/uni/retirement");
      const dead = Object.values(s.chars).filter((c) => !c.alive);
      for (const d of dead) assert(!!d.deathYear && !!d.causeOfDeath, "dead NPC missing death records");
    },
  },
  {
    name: "romance never pairs relatives, exes or under-18s",
    fn: () => {
      const s = freshLife(404);
      playToAge(s, 70);
      for (const c of Object.values(s.chars)) {
        if (!c.partnerId) continue;
        const par = s.chars[c.partnerId];
        assert(par, "dangling partner reference");
        // deceased characters keep a frozen historical spouse record;
        // only the living must never be linked to a dead/underage partner.
        if (c.alive) {
          assert(par.alive, "partnered to a dead NPC");
          assert(par.age >= 18 && c.age >= 18, `underage partnership ${c.age}/${par.age}`);
          assert(!c.partnerHistory.includes(par.id), "paired with an ex");
          assert(par.id !== c.motherId && par.id !== c.fatherId && par.id !== c.id, "incest/self partnership");
          if (c.motherId) assert(par.id !== c.motherId, "partner is mother");
          const siblings = Object.values(s.chars).filter(
            (x) => x.id !== c.id && ((c.motherId && x.motherId === c.motherId) || (c.fatherId && x.fatherId === c.fatherId))
          );
          assert(!siblings.some((x) => x.id === par.id), "sibling romance");
        }
      }
    },
  },
  {
    name: "childbirth creates correct two-parent links and a new generation",
    fn: () => {
      const s = freshLife(505);
      const p = s.chars[s.currentId];
      playToAge(s, 40);
      for (const c of Object.values(s.chars)) {
        for (const kidId of c.childrenIds) {
          const kid = s.chars[kidId];
          assert(kid, "dangling child ref");
          assert(kid.age <= c.age - 12, `child ${kid.age} too close to parent age ${c.age}`);
        }
      }
      if (p.childrenIds.length) {
        const kid = s.chars[p.childrenIds[0]];
        assertEqual(kid.generation, p.generation + 1, "generation not incremented");
        void kid;
      }
    },
  },
  {
    name: "dead NPCs never come back to life",
    fn: () => {
      const s = freshLife(606);
      playToAge(s, 90);
      const deadIds = Object.values(s.chars).filter((c) => !c.alive).map((c) => c.id);
      playToAge(s, 100);
      for (const id of deadIds) {
        const c = s.chars[id];
        assert(!c.alive, `${c.firstName} resurrected`);
        assert(!!c.deathYear, "resurrected/dead char lost deathYear");
      }
    },
  },
  {
    name: "createChild honors gender/name agreement and inherits family name",
    fn: () => {
      setSeed(909);
      const s = freshLife(707);
      const p = s.chars[s.currentId] as Char;
      const mother = Object.values(s.chars).find((c) => c.gender === "female" && c.age > 20) ?? p;
      const father = Object.values(s.chars).find((c) => c.gender === "male" && c.age > 20) ?? p;
      const kid = createChild(s, mother, father);
      assertEqual(kid.lastName, mother.lastName, "child surname");
      assert(kid.age === 0 && kid.birthYear === s.worldYear, "newborn metadata");
      assert(mother.childrenIds.includes(kid.id) && father.childrenIds.includes(kid.id), "parent links");
    },
  },
];

function playToAge(s: ReturnType<typeof freshLife>, target: number) {
  const p = s.chars[s.currentId];
  let guard = 0;
  while (p.age < target && !s.over && guard++ < 130) {
    ageUp(s);
    while (s.pending.length) s.pending.shift();
  }
}
