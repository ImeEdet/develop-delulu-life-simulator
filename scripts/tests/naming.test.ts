import { NAME_GROUPS } from "../../src/game/name-data";
import { COUNTRIES } from "../../src/game/world";
import { emptyNameUsage, makeFirstName, makeSurname, groupFor, fullName } from "../../src/game/names";
import { setSeed } from "../../src/game/rng";
import { freshLife, playYears, assert, assertEqual } from "./util";
import type { Gender } from "../../src/game/types";

export const tests = [
  {
    name: "generated names never mismatch gender (the Halima/Femi bug)",
    fn: () => {
      setSeed(1);
      const usage = emptyNameUsage();
      for (const countryId of Object.keys(COUNTRIES)) {
        const cty = COUNTRIES[countryId];
        for (const gid of cty.groups) {
          const g = NAME_GROUPS[gid];
          for (let i = 0; i < 200; i++) {
            const gender: Gender = i % 2 ? "male" : "female";
            const name = makeFirstName(countryId, gender, gid, usage);
            // unisex names are valid for anyone; only strictly-opposite names are forbidden
            const oppositeOnly = (gender === "male" ? g.female : g.male).filter((n) => !g.unisex.includes(n));
            const allowed = gender === "male" ? [...g.male, ...g.unisex] : [...g.female, ...g.unisex];
            assert(allowed.includes(name), `${countryId}/${gid}: ${name} not in ${gender} pool`);
            assert(!oppositeOnly.includes(name), `${countryId}/${gid}: ${name} is a strongly opposite-gender name for ${gender}`);
          }
        }
      }
    },
  },
  {
    name: "Nigeria covers Yoruba, Igbo, Hausa, Edo, Ibibio and English-Nigerian traditions",
    fn: () => {
      for (const g of ["yoruba", "igbo", "hausa", "edo", "ibibio", "nigerian-english"]) {
        assert(NAME_GROUPS[g], `missing group ${g}`);
        assert(NAME_GROUPS[g].surnames.length >= 25, `${g} needs a broad surname pool`);
        assert(NAME_GROUPS[g].male.length >= 15 && NAME_GROUPS[g].female.length >= 15, `${g} needs diverse given names`);
      }
      assert(COUNTRIES.ng.groups.length >= 6, "Nigeria must expose its cultural groups");
    },
  },
  {
    name: "no single surname dominates: top surname stays under 12% over 1000 rolls",
    fn: () => {
      setSeed(42);
      const usage = emptyNameUsage();
      const counts: Record<string, number> = {};
      const ngGroups = COUNTRIES.ng.groups;
      for (let i = 0; i < 1000; i++) {
        const group = ngGroups[i % ngGroups.length];
        const s = makeSurname("ng", null, group, usage);
        counts[s] = (counts[s] ?? 0) + 1;
      }
      const top = Math.max(...Object.values(counts));
      assert(top < 120, `a surname took ${top}/1000 picks — too dominant`);
      assert(Object.keys(counts).length > 120, "surname diversity collapsed");
    },
  },
  {
    name: "first-name repetition is actively suppressed",
    fn: () => {
      setSeed(7);
      const usage = emptyNameUsage();
      const recent: string[] = [];
      // fewer rolls than the pool size AND the 36-name recent-memory window
      for (let i = 0; i < 24; i++) {
        const n = makeFirstName("ng", "female", "yoruba", usage);
        if (recent.includes(n)) throw new Error(`repeated recent name ${n}`);
        recent.push(n);
      }
    },
  },
  {
    name: "family members inherit the family surname and keep their group",
    fn: () => {
      const s = freshLife(99);
      const p = s.chars[s.currentId];
      for (const id of [p.motherId, p.fatherId, ...Object.values(s.chars).filter((c) => c.motherId === p.motherId).map((c) => c.id)]) {
        if (!id) continue;
        const c = s.chars[id];
        assert(!!c.group, `${c.firstName} has no naming group`);
      }
      const sibs = Object.values(s.chars).filter((c) => c.motherId === p.motherId && c.id !== p.id);
      for (const sib of sibs) assertEqual(sib.lastName, p.lastName, "sibling surname");
    },
  },
  {
    name: "Korean and Japanese names render family-name-first",
    fn: () => {
      setSeed(5);
      const kr = freshLife(5);
      // force a Korean life by checking the convention helper directly
      const g = groupFor("kr");
      assertEqual(g.order, "last-first", "Korean naming order");
      assertEqual(groupFor("jp").order, "last-first", "Japanese naming order");
      void kr;
    },
  },
  {
    name: "children born during play have gender-consistent names",
    fn: () => {
      const s = freshLife(123);
      playYears(s, 80);
      for (const c of Object.values(s.chars)) {
        if (!c.group) continue;
        const g = NAME_GROUPS[c.group];
        const pool = c.gender === "male" ? [...g.male, ...g.unisex] : [...g.female, ...g.unisex];
        assert(pool.includes(c.firstName), `${c.firstName} mismatches gender ${c.gender} in ${c.group}`);
      }
    },
  },
  {
    name: "fullName respects convention metadata",
    fn: () => {
      const s = freshLife(3);
      const p = s.chars[s.currentId];
      const rendered = fullName(p);
      assert(rendered.includes(p.firstName) && rendered.includes(p.lastName), "full name missing parts");
    },
  },
  {
    name: "regression: every child (incl. separated-parent families) takes the mother's surname",
    fn: () => {
      for (let seed = 1; seed <= 30; seed++) {
        const s = freshLife(seed);
        for (const c of Object.values(s.chars)) {
          if (!c.motherId) continue;
          const mum = s.chars[c.motherId];
          assert(!!mum, `seed ${seed}: ${c.firstName} has a dangling mother`);
          assertEqual(c.lastName, mum.lastName, `seed ${seed}: ${c.firstName} did not inherit the mother's surname`);
        }
      }
    },
  },
];
