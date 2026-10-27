import type { Char, CustomSpec, GameState, Gender, JobDef } from "./types";
import { NAMES, country, COUNTRY_LIST } from "./world";
import { JOBS, TRAITS, TRAIT_LIST, jobSalary } from "./content";

export const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p: number) => Math.random() < p;
export const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export function genName(culture: string, gender: Gender): string {
  const pool = NAMES[culture] ?? NAMES.anglo;
  return gender === "male" ? pick(pool.m) : pick(pool.f);
}

export function genSurname(culture: string): string {
  return pick((NAMES[culture] ?? NAMES.anglo).s);
}

export function fullName(c: Char): string {
  return `${c.firstName} ${c.lastName}`;
}

function mkChar(s: GameState, part: Partial<Char>): Char {
  const id = `c${s.seq++}`;
  const c: Char = {
    id,
    firstName: "",
    lastName: "",
    gender: "male",
    birthYear: s.worldYear,
    age: 0,
    alive: true,
    countryId: "us",
    city: "",
    isPlayer: false,
    generation: 1,
    health: ri(70, 95),
    happiness: ri(50, 85),
    smarts: ri(35, 85),
    looks: ri(30, 80),
    traits: [pick(TRAIT_LIST).id],
    money: 0,
    debts: 0,
    pension: 0,
    partnerHistory: [],
    childrenIds: [],
    friends: [],
    education: "none",
    uni: null,
    job: null,
    retired: false,
    languages: {},
    skills: {},
    flags: [],
    milestones: [],
    usedActions: [],
    eventCooldowns: {},
    ...part,
  };
  s.chars[id] = c;
  return c;
}

const TIER_JOBS: string[][] = [
  ["barista", "retail", "delivery", "factory"],
  ["office", "nurse", "chef", "retail", "mechanic"],
  ["engineer", "doctor", "lawyer", "dev", "designer", "scientist", "teacher"],
  ["exec", "business"],
];

export function jobForTier(tier: number): JobDef {
  const pool = TIER_JOBS[clamp(tier, 0, 3)] ?? TIER_JOBS[1];
  return JOBS[pick(pool)];
}

function parentJob(c: Char, tier: number) {
  if (c.age < 18 || !c.alive) return;
  const def = jobForTier(tier);
  c.job = {
    jobId: def.id,
    seniority: c.age > 38 ? ri(1, 2) : 0,
    salary: jobSalary(def, c, c.age > 38 ? 1 : 0),
    years: clamp(c.age - 22, 0, 30),
    employer: pick(["the family business", "a local firm", "the big office downtown", "a well-known company"]),
  };
  c.education = tier >= 2 ? "university" : tier === 1 && chance(0.5) ? "university" : "secondary";
  c.money = c.job.salary * ri(2, 6);
  const cty = country(c.countryId);
  if (tier >= 2) c.house = { value: Math.round((140000 + tier * 70000) * cty.costIndex), city: c.city };
  if (tier >= 3) c.car = { name: "a very nice car", value: 45000 };
  if (tier >= 1 && chance(0.5)) c.car = { name: "a dependable car", value: 18000 };
}

function npcEducation(c: Char) {
  if (c.age < 6) return;
  c.education = c.age < 12 ? "primary" : "secondary";
  if (c.age >= 23 && chance(0.45)) {
    c.education = "university";
    c.money += 10000;
  } else if (c.age >= 18 && chance(0.4)) {
    c.uni = { year: ri(1, 3), major: "business", gpa: ri(50, 80) };
  }
  if (c.age >= 18 && chance(0.55)) {
    const def = jobForTier(ri(0, 2));
    c.job = { jobId: def.id, seniority: 0, salary: jobSalary(def, c, 0), years: clamp(c.age - 20, 0, 20), employer: "a local company" };
    c.money = c.job.salary * ri(1, 4);
  }
  if (c.age >= 62 && c.job) {
    c.retired = true;
    c.pension = Math.round(c.job.salary * 0.45);
    c.job = null;
  }
}

export function buildRandomSpec(): CustomSpec {
  const c = pick(COUNTRY_LIST);
  const gender: Gender = chance(0.5) ? "male" : "female";
  const r = Math.random();
  const tier = r < 0.14 ? 0 : r < 0.62 ? 1 : r < 0.88 ? 2 : 3;
  const mother = { firstName: genName(c.culture, "female"), age: ri(24, 42), alive: chance(0.93) };
  const father = { firstName: genName(c.culture, "male"), age: ri(26, 44), alive: chance(0.9) };
  const sc = Math.random();
  const sibCount = sc < 0.45 ? 0 : sc < 0.75 ? 1 : sc < 0.9 ? 2 : 3;
  const siblings = Array.from({ length: sibCount }, () => ({
    firstName: genName(c.culture, chance(0.5) ? "male" : "female"),
    gender: (chance(0.5) ? "male" : "female") as Gender,
    age: ri(1, 15),
  }));
  const t1 = pick(TRAIT_LIST).id;
  let t2 = pick(TRAIT_LIST).id;
  if (t2 === t1) t2 = pick(TRAIT_LIST.filter((t) => t.id !== t1)).id;
  return {
    firstName: genName(c.culture, gender),
    gender,
    countryId: c.id,
    traits: [t1, t2],
    wealthTier: tier,
    parentStatus: mother.alive && father.alive ? (chance(0.82) ? "together" : "apart") : "apart",
    mother,
    father,
    siblings,
  };
}

const TIER_NAMES = ["a tight, loud household", "a comfortable working home", "a well-off family", "old money and newer money"];

export function newCustomLife(spec: CustomSpec, prevLives: number): GameState {
  const startYear = ri(1948, 1972);
  const s: GameState = {
    version: 1,
    startYear,
    worldYear: startYear,
    currentId: "",
    generation: 1,
    chars: {},
    log: [],
    pending: [],
    seq: 1,
    livesLived: prevLives,
    over: false,
  };
  const L = (kind: GameState["log"][number]["kind"], text: string) =>
    s.log.push({ id: s.seq++, year: s.worldYear, age: 0, text, kind });

  const c = country(spec.countryId);
  const lastName = genSurname(c.culture);
  const first = spec.firstName.trim() || genName(c.culture, spec.gender);

  const player = mkChar(s, {
    firstName: first,
    lastName,
    gender: spec.gender,
    birthYear: startYear,
    countryId: c.id,
    city: pick(c.cities),
    isPlayer: true,
    wealthTier: spec.wealthTier,
    traits: spec.traits.length >= 2 ? spec.traits.slice(0, 2) : [...spec.traits, pick(TRAIT_LIST).id],
    languages: { [c.languages[0]]: 55, ...(c.languages[1] ? { [c.languages[1]]: 25 } : {}) },
    milestones: [{ year: startYear, age: 0, text: `Born in ${pick(c.cities)}` }],
  });
  player.city = pick(c.cities);
  player.milestones[0] = { year: startYear, age: 0, text: `Born in ${player.city}` };
  s.currentId = player.id;

  const tier = spec.wealthTier;
  const mother = spec.mother
    ? mkChar(s, {
        firstName: spec.mother.firstName.trim() || genName(c.culture, "female"),
        lastName: spec.parentStatus === "together" ? lastName : genSurname(c.culture),
        gender: "female",
        age: clamp(spec.mother.age, 18, 80),
        birthYear: startYear - clamp(spec.mother.age, 18, 80),
        alive: spec.mother.alive,
        countryId: c.id,
        city: player.city,
        wealthTier: tier,
      })
    : undefined;
  const father = spec.father
    ? mkChar(s, {
        firstName: spec.father.firstName.trim() || genName(c.culture, "male"),
        lastName: spec.parentStatus === "together" ? lastName : genSurname(c.culture),
        gender: "male",
        age: clamp(spec.father.age, 18, 80),
        birthYear: startYear - clamp(spec.father.age, 18, 80),
        alive: spec.father.alive,
        countryId: c.id,
        city: player.city,
        wealthTier: tier,
      })
    : undefined;

  const together = spec.parentStatus === "together" && !!mother?.alive && !!father?.alive;
  if (mother) {
    mother.partnerId = together ? father!.id : undefined;
    if (!mother.alive) {
      mother.deathYear = startYear - ri(1, 4);
      mother.causeOfDeath = "passed before your birth";
    }
    parentJob(mother, tier);
    player.motherId = mother.id;
  }
  if (father) {
    father.partnerId = together ? mother!.id : undefined;
    if (!father.alive) {
      father.deathYear = startYear - ri(1, 4);
      father.causeOfDeath = "passed before your birth";
    }
    parentJob(father, tier);
    player.fatherId = father.id;
  }

  const sibs = spec.siblings.slice(0, 4);
  for (const sib of sibs) {
    const age = clamp(sib.age, 0, 45);
    const sc = mkChar(s, {
      firstName: sib.firstName.trim() || genName(c.culture, sib.gender),
      lastName,
      gender: sib.gender,
      age,
      birthYear: startYear - age,
      countryId: c.id,
      city: player.city,
      wealthTier: tier,
      motherId: mother?.id,
      fatherId: father?.id,
    });
    npcEducation(sc);
    if (mother) mother.childrenIds.push(sc.id);
    if (father) father.childrenIds.push(sc.id);
  }

  if (mother && chance(0.5)) {
    const age = ri(58, 78);
    const gm = mkChar(s, {
      firstName: genName(c.culture, "female"),
      lastName: mother.lastName,
      gender: "female",
      age,
      birthYear: startYear - age,
      countryId: c.id,
      city: player.city,
    });
    gm.motherId = undefined;
    gm.childrenIds.push(mother.id);
    mother.motherId = gm.id;
  }
  if (father && chance(0.5)) {
    const age = ri(60, 80);
    const gf = mkChar(s, {
      firstName: genName(c.culture, "male"),
      lastName: father.lastName,
      gender: "male",
      age,
      birthYear: startYear - age,
      countryId: c.id,
      city: player.city,
    });
    gf.childrenIds.push(father.id);
    father.fatherId = gf.id;
  }

  L("birth", `You were born ${first} ${lastName} in ${player.city}, ${c.name}. ${c.blurb}`);
  if (mother?.alive && father?.alive) {
    L("family", `Your mother, ${mother.firstName}, and father, ${father.firstName}, met your first cry with total confusion and total love.`);
  } else if (mother?.alive || father?.alive) {
    L("family", `Your ${mother?.alive ? "mother, " + mother.firstName : "father, " + father!.firstName}, raised you with the help of everyone on the street.`);
  } else {
    L("family", "You arrived into a house full of relatives, loud opinions, and one very important new baby.");
  }
  L("neutral", `Household: ${TIER_NAMES[tier] ?? TIER_NAMES[1]}. Starting traits: ${player.traits.map((t) => TRAITS[t]?.name).filter(Boolean).join(", ")}.`);
  if (tier === 3 && chance(0.35)) {
    player.flags.push("old-money");
    L("event", "The family name is on the bank. The bank is, in a quiet way, nervous.");
  }
  if (mother) mother.milestones.push({ year: startYear, age: mother.age, text: `Became a parent` });
  if (father) father.milestones.push({ year: startYear, age: father.age, text: `Became a parent` });
  return s;
}

export function newRandomLife(prevLives: number): GameState {
  return newCustomLife(buildRandomSpec(), prevLives);
}

export function createChild(s: GameState, mother: Char, father: Char, originCountryId?: string): Char {
  const c = country(mother.countryId);
  const origin = originCountryId ? country(originCountryId) : null;
  const culture = origin ? origin.culture : c.culture;
  const child = mkChar(s, {
    firstName: genName(culture, chance(0.5) ? "male" : "female"),
    lastName: mother.lastName,
    gender: chance(0.5) ? "male" : "female",
    age: 0,
    birthYear: s.worldYear,
    countryId: mother.countryId,
    city: mother.city,
    generation: mother.generation + 1,
    motherId: mother.id,
    fatherId: father.id,
    wealthTier: mother.wealthTier,
  });
  child.languages[country(mother.countryId).languages[0]] = 40;
  const mNative = country(mother.countryId).languages[0];
  const fNative = country(father.countryId).languages[0];
  child.languages[mNative] = Math.max(child.languages[mNative] ?? 0, 55);
  if (fNative !== mNative) child.languages[fNative] = 50;
  if (origin) child.languages[origin.languages[0]] = 60;
  if (origin) child.flags.push("adopted");
  mother.childrenIds.push(child.id);
  father.childrenIds.push(child.id);
  return child;
}

export function makeFriend(s: GameState, model: Char): Char {
  const c = country(model.countryId);
  const f = mkChar(s, {
    firstName: genName(c.culture, chance(0.5) ? "male" : "female"),
    lastName: genSurname(c.culture),
    gender: chance(0.5) ? "male" : "female",
    age: Math.max(1, model.age + ri(-1, 1)),
    birthYear: s.worldYear - Math.max(1, model.age),
    countryId: c.id,
    city: model.city,
    generation: model.generation,
    languages: { [c.languages[0]]: 50 },
    traits: [pick(TRAIT_LIST).id],
  });
  f.milestones.push({ year: s.worldYear, age: f.age, text: `Met ${model.firstName} at ${model.city}` });
  return f;
}

export function makeNpcPerson(s: GameState, age: number, countryId: string): Char {
  const c = country(countryId);
  const p = mkChar(s, {
    firstName: genName(c.culture, chance(0.5) ? "male" : "female"),
    lastName: genSurname(c.culture),
    gender: chance(0.5) ? "male" : "female",
    age: clamp(age, 16, 70),
    birthYear: s.worldYear - clamp(age, 16, 70),
    countryId,
    city: pick(c.cities),
    generation: 1,
    languages: { [c.languages[0]]: 80 },
  });
  if (p.age >= 22 && chance(0.6)) {
    const def = jobForTier(ri(0, 2));
    p.job = { jobId: def.id, seniority: 0, salary: jobSalary(def, p, 0), years: clamp(p.age - 22, 0, 10), employer: "somewhere respectable" };
    p.education = chance(0.4) ? "university" : "secondary";
    p.money = (p.job.salary ?? 20000) * ri(0, 3);
  } else if (p.age >= 12) {
    p.education = p.age >= 17 ? "secondary" : "primary";
  }
  return p;
}

export function relLabel(p: Char, c: Char, chars: Record<string, Char>): string {
  if (c.id === p.motherId) return "Your mother";
  if (c.id === p.fatherId) return "Your father";
  if (c.id === p.partnerId) return c.gender === "female" ? "Your partner (she)" : "Your partner (he)";
  const isSibling = (p.motherId && c.motherId === p.motherId) || (p.fatherId && c.fatherId === p.fatherId);
  if (isSibling) return c.gender === "female" ? "Your sister" : "Your brother";
  const mother = p.motherId ? chars[p.motherId] : undefined;
  const father = p.fatherId ? chars[p.fatherId] : undefined;
  if ((mother?.motherId || mother?.fatherId) === c.id) return "Your grandmother";
  if ((father?.motherId || father?.fatherId) === c.id) return "Your grandfather";
  if (p.childrenIds.includes(c.id)) return c.gender === "female" ? "Your daughter" : "Your son";
  for (const kid of p.childrenIds) {
    if (chars[kid]?.childrenIds.includes(c.id)) return "Your grandchild";
  }
  const partner = p.partnerId ? chars[p.partnerId] : undefined;
  if (partner && (partner.motherId === c.id || partner.fatherId === c.id))
    return c.gender === "female" ? "Your mother-in-law" : "Your father-in-law";
  if (partner && partner.childrenIds.includes(c.id)) return "Your stepchild";
  for (const sibId of [p.motherId, p.fatherId]) {
    const sib = sibId ? chars[sibId] : undefined;
    if (sib?.childrenIds && !sib.childrenIds.includes(p.id) && sib.childrenIds.includes(c.id) && !isSibling) {
      return c.gender === "female" ? "Your niece" : "Your nephew";
    }
  }
  if (p.friends.some((f) => f.id === c.id)) return "A friend";
  return "A relative";
}
