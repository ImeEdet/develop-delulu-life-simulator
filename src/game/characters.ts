import type { Char, CustomSpec, GameState, Gender, JobDef } from "./types";
import { country, COUNTRY_LIST } from "./world";
import { JOBS, TRAITS, TRAIT_LIST, jobSalary } from "./content";
import { nominal } from "./economy";
import { chance, clamp, pick, random, ri } from "./rng";
import {
  customOrGenerated, fullName, legacyGroupId, makeFirstName, makeIdentity, makeSurname,
  rollGender, type NameUsage,
} from "./names";

// Re-export the engine randomness under the V1 import surface.
export { chance, clamp, pick, ri, fullName };

/** V1-compatible shims (new code should call names.ts directly). */
export function genName(culture: string, gender: Gender): string {
  return makeFirstName("us", gender, legacyGroupId(culture));
}
export function genSurname(culture: string): string {
  return makeSurname("us", null, legacyGroupId(culture));
}

/** Heritage language associated with a naming group, if any. */
const GROUP_LANG: Record<string, string> = {
  yoruba: "yoruba",
  hausa: "hausa",
  igbo: "igbo",
  "tamil-south": "tamil",
  bengali: "bengali",
  punjabi: "punjabi",
};

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
    loans: [],
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
  ["barista", "retail", "delivery", "factory", "careworker"],
  ["office", "nurse", "chef", "retail", "mechanic", "electrician", "plumber"],
  ["engineer", "doctor", "lawyer", "dev", "designer", "scientist", "teacher", "accountant", "nurse"],
  ["exec", "business", "lawyer", "doctor", "architect", "pilot", "founder"],
  ["exec", "founder", "business", "lawyer", "doctor"],
];

export function jobForTier(tier: number): JobDef {
  const pool = TIER_JOBS[clamp(tier, 0, 4)] ?? TIER_JOBS[1];
  return JOBS[pick(pool)];
}

/** Give a generated adult NPC a job, assets and savings that fit their tier. */
function parentJob(c: Char, tier: number, year: number) {
  if (c.age < 18 || !c.alive) return;
  const def = jobForTier(tier);
  const seniority = c.age > 38 ? ri(1, 2) : 0;
  c.job = {
    jobId: def.id,
    seniority,
    salary: nominal(jobSalary(def, c, seniority), year),
    years: clamp(c.age - 22, 0, 30),
    employer: pick(["the family business", "a local firm", "the big office downtown", "a well-known company", "the government", "their own practice"]),
  };
  c.education = tier >= 2 ? "university" : tier === 1 && chance(0.5) ? "university" : "secondary";
  c.money = c.job.salary * ri(1, 5);
  const cty = country(c.countryId);
  if (tier >= 2) c.house = { value: nominal(Math.round((120000 + tier * 70000) * cty.costIndex), year), city: c.city };
  if (tier >= 4) c.car = { name: "a very nice car", value: nominal(60000, year) };
  else if (tier >= 1 && chance(0.5)) c.car = { name: "a dependable car", value: nominal(15000, year) };
}

/** Education/career state for an NPC the moment they enter the world. */
export function npcLifeSetup(c: Char, year: number) {
  if (c.age < country(c.countryId).schoolStart) {
    c.education = "none";
    return;
  }
  if (c.age < country(c.countryId).secondaryStart) c.education = "primary";
  else if (c.age < country(c.countryId).examAge + 1) c.education = "secondary";
  if (c.age >= country(c.countryId).examAge + 1) {
    c.examScore = ri(35, 92);
    if (chance(c.smarts > 60 ? 0.45 : 0.2)) {
      c.education = "university";
    } else {
      c.education = "secondary";
    }
  }
  if (c.age >= 18 && !c.retired && chance(0.65)) {
    const def = jobForTier(clamp((c.wealthTier ?? ri(0, 2)), 0, 3));
    c.job = {
      jobId: def.id,
      seniority: clamp(Math.floor((c.age - 22) / 12), 0, 3),
      salary: nominal(jobSalary(def, c, 0), year),
      years: clamp(c.age - 20, 0, 20),
      employer: "a local company",
    };
    c.money = Math.max(c.money, c.job.salary * ri(0, 3));
  }
  if (c.age >= 62 && c.job) {
    c.retired = true;
    c.pension = Math.round(c.job.salary * 0.45);
    c.job = null;
  }
}

export const MIN_BIRTH_YEAR = 1940;
export const MAX_BIRTH_YEAR = 2010;

export function buildRandomSpec(): CustomSpec {
  const c = pick(COUNTRY_LIST);
  const gender = rollGender();
  const group = pick(c.groups);
  const r = random();
  const tier = r < 0.14 ? 0 : r < 0.5 ? 1 : r < 0.82 ? 2 : r < 0.95 ? 3 : 4;
  const mother = { firstName: makeFirstName(c.id, "female", group), age: ri(24, 42), alive: chance(0.93) };
  const father = { firstName: makeFirstName(c.id, "male", group), age: ri(26, 44), alive: chance(0.9) };
  const sc = random();
  const sibCount = sc < 0.45 ? 0 : sc < 0.75 ? 1 : sc < 0.9 ? 2 : 3;
  const siblings = Array.from({ length: sibCount }, () => {
    const g = rollGender();
    return { firstName: makeFirstName(c.id, g, group), gender: g, age: ri(1, 15) };
  });
  const t1 = pick(TRAIT_LIST).id;
  let t2 = pick(TRAIT_LIST).id;
  if (t2 === t1) t2 = pick(TRAIT_LIST.filter((t) => t.id !== t1)).id;
  return {
    firstName: makeFirstName(c.id, gender, group),
    surname: "",
    gender,
    countryId: c.id,
    group,
    city: "",
    birthYear: ri(1945, 2005),
    traits: [t1, t2],
    wealthTier: tier,
    parentStatus: mother.alive && father.alive ? (chance(0.82) ? "together" : "apart") : "apart",
    mother,
    father,
    siblings,
    designFamily: false,
  };
}

const TIER_NAMES = [
  "a tight, loud household",
  "a hard-working family home",
  "a comfortable family home",
  "a well-off family",
  "old money and newer money",
];

export function newCustomLife(spec: CustomSpec, prevLives: number): GameState {
  const startYear = clamp(spec.birthYear ?? ri(1948, 1990), MIN_BIRTH_YEAR, MAX_BIRTH_YEAR);
  const s: GameState = {
    version: 2,
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
    nameUsage: { first: {}, last: {}, recent: [] },
  };
  const L = (kind: GameState["log"][number]["kind"], text: string) =>
    s.log.push({ id: s.seq++, year: s.worldYear, age: 0, text, kind });

  const c = country(spec.countryId);
  const groupId = spec.group && c.groups.includes(spec.group) ? spec.group : c.groups[0];
  const usage: NameUsage = s.nameUsage;
  const familySurname = spec.surname.trim() || makeSurname(c.id, null, groupId, usage);
  const first = customOrGenerated(spec.firstName, c.id, spec.gender, groupId, usage);
  const city = spec.city.trim() && c.cities.includes(spec.city.trim()) ? spec.city.trim() : pick(c.cities);

  const player = mkChar(s, {
    firstName: first,
    lastName: familySurname,
    group: groupId,
    gender: spec.gender,
    birthYear: startYear,
    countryId: c.id,
    city,
    isPlayer: true,
    wealthTier: spec.wealthTier,
    traits: spec.traits.length >= 2 ? spec.traits.slice(0, 2) : [...spec.traits, pick(TRAIT_LIST).id],
    languages: {
      [c.languages[0]]: 55,
      ...(c.languages[1] ? { [c.languages[1]]: 25 } : {}),
      ...(GROUP_LANG[groupId] && !c.languages.includes(GROUP_LANG[groupId]) ? { [GROUP_LANG[groupId]]: 35 } : {}),
    },
    citizenOf: c.id,
    milestones: [{ year: startYear, age: 0, text: `Born in ${city}` }],
  });
  s.currentId = player.id;

  const tier = clamp(spec.wealthTier, 0, 4);
  const makeParent = (kind: "mother" | "father") => {
    const ps = spec[kind];
    if (!ps) return undefined;
    const gender: Gender = kind === "mother" ? "female" : "male";
    const maxAge = kind === "mother" ? 50 : 65;
    const age = clamp(ps.age, 16, maxAge);
    const par = mkChar(s, {
      firstName: customOrGenerated(ps.firstName, c.id, gender, groupId, usage),
      lastName: spec.parentStatus === "together" ? familySurname : makeSurname(c.id, gender, groupId, usage),
      group: groupId,
      gender,
      age,
      birthYear: startYear - age,
      alive: ps.alive,
      countryId: c.id,
      city,
      wealthTier: tier,
      citizenOf: c.id,
      languages: { [c.languages[0]]: 85, ...(GROUP_LANG[groupId] ? { [GROUP_LANG[groupId]]: 60 } : {}) },
    });
    if (!par.alive) {
      par.deathYear = startYear - ri(1, 4);
      par.causeOfDeath = "passed before your birth";
    }
    parentJob(par, tier, startYear);
    return par;
  };
  const mother = makeParent("mother");
  const father = makeParent("father");

  const together = spec.parentStatus === "together" && !!mother?.alive && !!father?.alive;
  if (mother) {
    mother.partnerId = together ? father!.id : undefined;
    player.motherId = mother.id;
  }
  if (father) {
    father.partnerId = together ? mother!.id : undefined;
    player.fatherId = father.id;
  }

  const sibs = spec.siblings.slice(0, 4);
  for (const sib of sibs) {
    const age = clamp(sib.age, 0, 45);
    const sc = mkChar(s, {
      firstName: customOrGenerated(sib.firstName, c.id, sib.gender, groupId, usage),
      lastName: familySurname,
      group: groupId,
      gender: sib.gender,
      age,
      birthYear: startYear - age,
      countryId: c.id,
      city,
      wealthTier: tier,
      motherId: mother?.id,
      fatherId: father?.id,
      citizenOf: c.id,
      languages: { [c.languages[0]]: 70 },
    });
    npcLifeSetup(sc, startYear);
    if (mother) mother.childrenIds.push(sc.id);
    if (father) father.childrenIds.push(sc.id);
  }

  if (mother && chance(0.5)) {
    const age = ri(58, 78);
    const gm = mkChar(s, {
      firstName: makeFirstName(c.id, "female", groupId, usage),
      lastName: mother.lastName,
      group: groupId,
      gender: "female",
      age,
      birthYear: startYear - age,
      countryId: c.id,
      city,
    });
    gm.childrenIds.push(mother.id);
    mother.motherId = gm.id;
  }
  if (father && chance(0.5)) {
    const age = ri(60, 80);
    const gf = mkChar(s, {
      firstName: makeFirstName(c.id, "male", groupId, usage),
      lastName: father.lastName,
      group: groupId,
      gender: "male",
      age,
      birthYear: startYear - age,
      countryId: c.id,
      city,
    });
    gf.childrenIds.push(father.id);
    father.fatherId = gf.id;
  }

  L("birth", `You were born ${first} ${familySurname} in ${city}, ${c.name}. ${c.blurb}`);
  if (mother?.alive && father?.alive) {
    L("family", `Your mother, ${mother.firstName}, and father, ${father.firstName}, met your first cry with total confusion and total love.`);
  } else if (mother?.alive || father?.alive) {
    L("family", `Your ${mother?.alive ? "mother, " + mother.firstName : "father, " + father!.firstName}, raised you with the help of everyone on the street.`);
  } else {
    L("family", "You arrived into a house full of relatives, loud opinions, and one very important new baby.");
  }
  L("neutral", `Household: ${TIER_NAMES[tier] ?? TIER_NAMES[1]}. Starting traits: ${player.traits.map((t) => TRAITS[t]?.name).filter(Boolean).join(", ")}.`);
  if (tier >= 4 && chance(0.4)) {
    player.flags.push("old-money");
    L("event", "The family name is on the bank. The bank is, in a quiet way, nervous.");
  }
  if (mother) mother.milestones.push({ year: startYear, age: mother.age, text: "Became a parent" });
  if (father) father.milestones.push({ year: startYear, age: father.age, text: "Became a parent" });
  return s;
}

export function newRandomLife(prevLives: number): GameState {
  return newCustomLife(buildRandomSpec(), prevLives);
}

export function createChild(s: GameState, mother: Char, father: Char, originCountryId?: string): Char {
  const gender = rollGender();
  const origin = originCountryId ? country(originCountryId) : null;
  // Children usually take the mother's naming group; mixed families can go either way.
  const groupId = mother.group && father.group && mother.group !== father.group && chance(0.5)
    ? father.group
    : mother.group ?? father.group ?? country(mother.countryId).groups[0];
  const identity = makeIdentity(mother.countryId, gender, {
    groupId,
    usage: s.nameUsage,
    surname: mother.lastName,
  });
  const child = mkChar(s, {
    firstName: identity.firstName,
    lastName: identity.lastName,
    group: identity.group,
    gender,
    age: 0,
    birthYear: s.worldYear,
    countryId: mother.countryId,
    city: mother.city,
    generation: Math.max(mother.generation, father.generation) + 1,
    motherId: mother.id,
    fatherId: father.id,
    wealthTier: mother.wealthTier,
    citizenOf: mother.citizenOf ?? mother.countryId,
  });
  const cty = country(mother.countryId);
  const mNative = cty.languages[0];
  const fNative = country(father.countryId).languages[0];
  child.languages[mNative] = 55;
  if (fNative !== mNative) child.languages[fNative] = 50;
  if (origin) {
    child.languages[origin.languages[0]] = 60;
    child.flags.push("adopted");
  }
  mother.childrenIds.push(child.id);
  father.childrenIds.push(child.id);
  return child;
}

export function makeFriend(s: GameState, model: Char): Char {
  const c = country(model.countryId);
  const gender = rollGender();
  const age = Math.max(1, model.age + ri(-1, 1));
  const identity = makeIdentity(c.id, gender, { groupId: model.group, usage: s.nameUsage });
  const f = mkChar(s, {
    firstName: identity.firstName,
    lastName: identity.lastName,
    group: identity.group,
    gender,
    age,
    birthYear: s.worldYear - age,
    countryId: c.id,
    city: model.city,
    generation: model.generation,
    languages: { [c.languages[0]]: 50 },
    traits: [pick(TRAIT_LIST).id],
    citizenOf: c.id,
  });
  f.milestones.push({ year: s.worldYear, age: f.age, text: `Met ${model.firstName} in ${model.city}` });
  return f;
}

/** A fresh adult NPC (partner, colleague, etc.). Gender is rolled ONCE. */
export function makeNpcPerson(s: GameState, age: number, countryId: string, groupId?: string): Char {
  const c = country(countryId);
  const gender = rollGender();
  const realAge = clamp(age, 16, 70);
  const identity = makeIdentity(countryId, gender, { groupId, usage: s.nameUsage });
  const p = mkChar(s, {
    firstName: identity.firstName,
    lastName: identity.lastName,
    group: identity.group,
    gender,
    age: realAge,
    birthYear: s.worldYear - realAge,
    countryId,
    city: pick(c.cities),
    generation: 1,
    languages: { [c.languages[0]]: 80 },
    citizenOf: countryId,
  });
  npcLifeSetup(p, s.worldYear);
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
