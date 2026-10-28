import type { Char, GameState, LifeEvent, LogKind } from "./types";
import { country, COUNTRY_LIST, fmtMoney } from "./world";
import {
  EPITAPHS, FIRST_WORDS, JOBS, MAJOR_LIST, YOUNG_ACCIDENTS, MID_CAUSES, ILLNESS_CAUSES, OLD_CAUSES,
  eligibleJobs, suggestedMajor, traitMod,
} from "./content";
import {
  chance, clamp, createChild, makeFriend, makeNpcPerson, pick, relLabel, ri,
} from "./characters";
import {
  accrueLoans, allowanceFor, chargeHousehold, livingCost, nominal, nominalSalary,
  payTuition, repayLoans, syncDebts, takeLoan, eraFactor, netWorth,
} from "./economy";
import { EVENTS, makeCtx, runEvent } from "./events";
import { advanceCharacterSkills } from "./skills";
import { advanceSportCareer } from "./sports";
import { advanceFame } from "./fame";
import { advanceSuperNpc, queueSuperAwakening } from "./super";

function L(s: GameState, age: number, kind: LogKind, text: string) {
  s.log.push({ id: s.seq++, year: s.worldYear, age, text, kind });
  s.log = s.log.slice(-500);
}

export function deathChance(c: Char): number {
  const a = c.age;
  let base: number;
  if (a < 1) base = 0.008;
  else if (a < 15) base = 0.0015;
  else if (a < 41) base = 0.002;
  else if (a < 61) base = 0.006;
  else if (a < 76) base = 0.012 + (a - 60) * 0.0025;
  else if (a < 86) base = 0.03 + (a - 75) * 0.008;
  else if (a < 96) base = 0.08 + (a - 85) * 0.012;
  else base = Math.min(0.95, 0.18 + (a - 96) * 0.06);
  base += ((100 - c.health) / 100) * 0.004;
  if (a >= 15 && a <= 45) base += 0.0015;
  if (c.health <= 5) base += 0.3;
  return Math.min(0.95, base);
}

function deathCause(c: Char): string {
  if (c.age < 45) return pick(YOUNG_ACCIDENTS);
  if (c.age < 65) return chance(0.5) ? pick(MID_CAUSES) : pick(ILLNESS_CAUSES);
  return pick(OLD_CAUSES);
}

function pushPending(s: GameState, ev: LifeEvent, p: Char) {
  const e = makeCtx(s, p);
  s.pending.push({
    eventId: ev.id,
    title: ev.title,
    text: ev.text(e),
    choices: ev.choices ? ev.choices(e) : [],
  });
}

export function getEvent(id: string): LifeEvent | undefined {
  return EVENTS.find((e) => e.id === id);
}

function closeToPlayer(p: Char, c: Char): boolean {
  return (
    c.id === p.motherId ||
    c.id === p.fatherId ||
    c.id === p.partnerId ||
    p.childrenIds.includes(c.id) ||
    p.friends.some((f) => f.id === c.id) ||
    (p.motherId != null && c.motherId === p.motherId) ||
    (p.fatherId != null && c.fatherId === p.fatherId)
  );
}

/** Every id romance must avoid: ancestors, descendants, siblings, exes. */
function familyIds(s: GameState, c: Char): Set<string> {
  const out = new Set<string>([c.id, ...c.partnerHistory]);
  const walk = (id: string | undefined, depth: number) => {
    if (!id || depth > 3) return;
    const x = s.chars[id];
    if (!x || out.has(id)) return;
    out.add(id);
    walk(x.motherId, depth + 1);
    walk(x.fatherId, depth + 1);
    x.childrenIds.forEach((k) => walk(k, depth + 1));
  };
  walk(c.motherId, 0);
  walk(c.fatherId, 0);
  c.childrenIds.forEach((k) => walk(k, 0));
  return out;
}

function findOrMakePartner(s: GameState, c: Char): Char {
  const forbidden = familyIds(s, c);
  const existing = Object.values(s.chars).filter(
    (x) =>
      x.alive &&
      !x.partnerId &&
      x.age >= 18 &&
      x.countryId === c.countryId &&
      Math.abs(x.age - c.age) <= 12 &&
      !forbidden.has(x.id) &&
      !c.partnerHistory.includes(x.id)
  );
  if (existing.length > 0 && chance(0.6)) {
    return pick(existing);
  }
  return makeNpcPerson(s, c.age + ri(-4, 4), c.countryId, c.group);
}

function npcEducation(s: GameState, c: Char, notes: { prio: number; text: string; kind: LogKind }[]) {
  const cty = country(c.countryId);
  const p = s.chars[s.currentId];
  if (c.age === cty.schoolStart) {
    c.education = "primary";
  } else if (c.age === cty.secondaryStart) {
    c.education = "secondary";
  } else if (c.age === cty.examAge) {
    c.examScore = Math.round(clamp(c.smarts * 0.75 + (c.skills.mathematics ?? 0) * 0.06 + (c.skills.writing ?? 0) * 0.04 + ri(0, 20), 15, 99));
  } else if (c.age === cty.examAge + 1 && !c.uni && !c.job) {
    if ((c.examScore ?? 0) >= 55 && c.smarts > 55 && chance(0.45)) {
      c.uni = { year: 1, major: pick(["business", "cs", "law", "biology", "education", "engineering"]), gpa: ri(50, 85) };
      if (closeToPlayer(p, c)) {
        notes.push({ prio: 2, text: `${relLabel(p, c, s.chars)} ${c.firstName} left for university.`, kind: "world" });
      }
    }
  }
  if (c.uni) {
    c.uni.year++;
    if (c.uni.year > cty.uniYears) {
      const major = c.uni.major;
      c.education = "university";
      c.uni = null;
      if (closeToPlayer(p, c)) {
        notes.push({
          prio: 2,
          text: `${relLabel(p, c, s.chars)} ${c.firstName} graduated with a degree in ${MAJOR_LIST.find((m) => m.id === major)?.name ?? major}.`,
          kind: "world",
        });
      }
    }
  }
}

function npcCareer(s: GameState, c: Char) {
  const cty = country(c.countryId);
  if (c.retired || c.uni) return;
  if (c.age < cty.examAge + 1) return;
  if (c.job) {
    const job = c.job;
    job.years++;
    const def = JOBS[job.jobId];
    if (def?.unstable && chance(0.05)) {
      c.job = null;
    } else if (chance(0.07) && job.seniority < 3 && def) {
      job.seniority++;
      job.salary = nominalSalary(c, def, job.seniority, s.worldYear);
    }
    return;
  }
  if (chance(0.32)) {
    const jobs = eligibleJobs(c);
    if (jobs.length) {
      const def = pick(jobs);
      c.job = { jobId: def.id, seniority: 0, salary: nominalSalary(c, def, 0, s.worldYear), years: 0, employer: "a local company" };
    }
  }
}

function extraCareerIncome(c: Char): number {
  const sports = c.sportsCareer?.level === "professional" ? c.sportsCareer.salary + (c.sportsCareer.sponsorshipIncome ?? 0) : 0;
  return sports + (c.fameCareer?.annualIncome ?? 0);
}

function npcFinances(s: GameState, c: Char) {
  if (c.age < 18 && !c.job) {
    c.money += extraCareerIncome(c);
    chargeHousehold(s, c);
    return;
  }
  accrueLoans(c);
  const income = (c.retired ? c.pension : c.job ? c.job.salary : 0) + extraCareerIncome(c);
  const cost = livingCost(c, s.worldYear);
  let cash = c.money + income - cost;
  if (cash < 0 && c.loans.length === 0 && chance(0.5)) {
    // NPCs occasionally borrow to stay afloat; mostly they just tighten belts.
    cash = 0;
  }
  c.money = Math.max(0, Math.round(cash));
}

function npcRomance(s: GameState, c: Char, notes: { prio: number; text: string; kind: LogKind }[]) {
  const p = s.chars[s.currentId];
  if (c.partnerId) {
    const par = s.chars[c.partnerId];
    if (!par || !par.alive) {
      c.partnerId = undefined;
      c.partnerValue = 0;
      return;
    }
    const drift = ri(-3, 3);
    c.partnerValue = clamp((c.partnerValue ?? 60) + drift);
    par.partnerValue = clamp((par.partnerValue ?? 60) + drift);
    // divorce
    if ((c.partnerValue ?? 60) < 28 && c.flags.includes("married") && chance(0.08)) {
      c.partnerHistory.push(par.id);
      par.partnerHistory.push(c.id);
      c.partnerId = undefined;
      par.partnerId = undefined;
      c.partnerValue = 0;
      par.partnerValue = 0;
      c.flags.push("divorced");
      par.flags.push("divorced");
      if (closeToPlayer(p, c)) {
        notes.push({ prio: 3, text: `${relLabel(p, c, s.chars)} ${c.firstName} and ${par.firstName} divorced. The records say irreconcilable.`, kind: "bad" });
      }
      return;
    }
    // children: only where a biological mother exists and she is 20-42
    const mother = c.gender === "female" ? c : par.gender === "female" ? par : undefined;
    if (mother && mother.age >= 20 && mother.age <= 42 && mother.childrenIds.length < 4 && chance(0.1)) {
      const father = mother === c ? par : c;
      const child = createChild(s, mother, father);
      if (closeToPlayer(p, c) || closeToPlayer(p, par)) {
        notes.push({
          prio: 3,
          text: `${relLabel(p, c, s.chars)} ${c.firstName} welcomed a baby: ${child.firstName}.`,
          kind: "family",
        });
      }
    }
    return;
  }
  if (c.age >= 20 && c.age <= 42 && chance(0.06)) {
    const par = findOrMakePartner(s, c);
    par.partnerId = c.id;
    c.partnerId = par.id;
    c.partnerSince = s.worldYear;
    c.partnerValue = 70;
    par.partnerValue = 70;
    if (c.age > 27 || chance(0.35)) {
      c.flags.push("married");
      par.flags.push("married");
    }
    if (closeToPlayer(p, c)) {
      notes.push({
        prio: 2,
        text: c.flags.includes("married")
          ? `${relLabel(p, c, s.chars)} ${c.firstName} married ${par.firstName}. The cake was enormous.`
          : `${relLabel(p, c, s.chars)} ${c.firstName} is seeing someone new: ${par.firstName}.`,
        kind: "world",
      });
    }
  }
}

function npcMigration(s: GameState, c: Char, p: Char) {
  if (c.flags.includes("immigrant") && c.arrivedYear && !c.flags.includes("citizen") && s.worldYear - c.arrivedYear >= 8) {
    c.flags.push("citizen");
    c.citizenOf = c.countryId;
    c.citizenships ??= [];
    if (!c.citizenships.includes(c.countryId)) c.citizenships.push(c.countryId);
  }
  if (chance(0.012)) {
    c.city = pick(country(c.countryId).cities);
  }
  // Only distant NPCs emigrate, so the player's close family stays legible.
  if (chance(0.004) && !closeToPlayer(p, c)) {
    const dest = pick(COUNTRY_LIST);
    if (dest.id !== c.countryId) {
      c.countryId = dest.id;
      c.city = pick(dest.cities);
      c.flags.push("immigrant");
      c.arrivedYear = s.worldYear;
      c.job = null;
    }
  }
}

function handleNpcDeath(s: GameState, p: Char, c: Char, notes: { prio: number; text: string; kind: LogKind }[]) {
  c.alive = false;
  c.deathYear = s.worldYear;
  c.causeOfDeath = deathCause(c);
  const par = c.partnerId ? s.chars[c.partnerId] : undefined;
  if (par && par.alive) {
    par.partnerHistory.push(c.id);
    par.partnerId = undefined;
    par.partnerValue = 0;
    if (par.isPlayer) par.happiness = clamp(par.happiness - 25);
  }
  distributeEstate(s, c, p);
  const rel = relLabel(p, c, s.chars).toLowerCase();
  const label = rel === "a friend"
    ? "Your friend"
    : rel === "a relative"
      ? "A relative"
      : rel.charAt(0).toUpperCase() + rel.slice(1);
  notes.push({ prio: 3, text: `${label} ${c.firstName} passed away at ${c.age}, ${c.causeOfDeath}.`, kind: "bad" });
}

/** Shared inheritance rules for NPCs and the player. */
function distributeEstate(s: GameState, c: Char, p: Char) {
  const estate = Math.max(0, c.money + (c.house ? c.house.value * 0.8 : 0) + (c.car ? c.car.value * 0.5 : 0) - c.debts);
  if (estate < 2000) return;
  const children = c.childrenIds.map((id) => s.chars[id]).filter((k) => k && k.alive);
  let heirs: Char[] = children;
  const spouse = c.partnerId ? s.chars[c.partnerId] : undefined;
  if (heirs.length === 0 && spouse?.alive) heirs = [spouse];
  if (heirs.length === 0) {
    const sibIds = c.motherId
      ? Object.values(s.chars).filter((x) => x.motherId === c.motherId && x.id !== c.id)
      : [];
    heirs = sibIds.filter((x) => x.alive).slice(0, 3);
  }
  if (heirs.length === 0) return;
  const share = Math.round(estate / heirs.length);
  heirs.forEach((h) => {
    h.money += share;
    if (c.house && h === heirs[0]) {
      h.house = c.house;
      c.house = undefined;
    }
    if (h.id === p.id) {
      L(s, p.age, "money", `You inherited ${fmtMoney(share, p.countryId)} from ${c.firstName}. The letter had a drawing on it. It was the house.`);
    }
  });
}

function simulateNpcs(s: GameState, p: Char, Lf: (k: LogKind, t: string) => void) {
  const notes: { prio: number; text: string; kind: LogKind }[] = [];
  for (const c of Object.values(s.chars)) {
    if (c.id === p.id || !c.alive) continue;
    c.age++;
    advanceSuperNpc(s, c, false);
    if (c.age > 55) c.health = clamp(c.health - (0.4 + (c.age - 55) * 0.06));
    c.happiness = clamp(c.happiness + (c.happiness < 55 ? 0.8 : -0.4));
    npcEducation(s, c, notes);
    npcCareer(s, c);
    advanceCharacterSkills(c, s.worldYear, true);
    advanceSportCareer(s, c, true);
    advanceFame(s, c, true);
    npcRomance(s, c, notes);
    npcFinances(s, c);
    npcMigration(s, c, p);
    if (c.age >= country(c.countryId).retireAge && c.job) {
      c.pension = Math.round(c.job.salary * 0.45);
      c.job = null;
      c.retired = true;
    }
    if (c.age >= 120 || chance(deathChance(c))) handleNpcDeath(s, p, c, notes);
  }
  for (const f of p.friends) {
    f.value = clamp(f.value - 2, -100, 100);
  }
  p.friends = p.friends.filter((f) => s.chars[f.id]?.alive);
  notes.sort((a, b) => b.prio - a.prio);
  notes.slice(0, 3).forEach((n) => Lf(n.kind, n.text));
}

function milestones(s: GameState, p: Char, Lf: (k: LogKind, t: string) => void) {
  const cty = country(p.countryId);
  const has = (f: string) => p.flags.includes(f);
  const add = (f: string) => {
    if (!has(f)) p.flags.push(f);
  };
  if (p.age === 1 && !has("fw1")) {
    add("fw1");
    Lf("good", "You took your first steps. The furniture has never recovered. Two whole feet of ambition.");
  }
  if (p.age === 2 && !has("fw2")) {
    add("fw2");
    const w = FIRST_WORDS[cty.languages[0]] ?? "mama";
    Lf("good", `You said your first word: "${w}". The look on your parent's face was, by all accounts, a religious experience.`);
  }
  if (p.age === cty.schoolStart && !has("fschool")) {
    add("fschool");
    p.education = "primary";
    const f = makeFriend(s, p);
    p.friends.push({ id: f.id, value: 70 });
    Lf("neutral", "Primary school, day one. The building is a cathedral of noise.");
    Lf("family", `At the playground you met ${f.firstName}. Within a week, you were inseparable. Within a month, so were your parents' schedules.`);
    p.milestones.push({ year: s.worldYear, age: p.age, text: "First best friend" });
  }
  if (p.age === cty.secondaryStart && !has("fsecondary")) {
    add("fsecondary");
    p.education = "secondary";
    Lf("neutral", "Secondary school. The lockers are bigger than you. The hallways have opinions.");
  }
  if (p.age === 14 && !has("fcrush")) {
    add("fcrush");
    const ev = getEvent("crush");
    if (ev) pushPending(s, ev, p);
  }
  if (p.age === cty.examAge && !has("fexam")) {
    add("fexam");
    const score = Math.round(clamp(p.smarts * 0.75 + (p.skills.mathematics ?? 0) * 0.06 + (p.skills.writing ?? 0) * 0.04 + ri(0, 20) + traitMod(p, "career") * 4, 15, 99));
    p.examScore = score;
    p.education = "secondary";
    if (score >= 80) {
      Lf("milestone", `Your final exam results: ${score}/100. Distinction. The school sent a letter. It smells like ink and pride.`);
      p.milestones.push({ year: s.worldYear, age: p.age, text: "Exam distinction" });
    } else if (score >= 55) {
      Lf("good", `Your final exam results: ${score}/100. Solid. Enough to keep the map open.`);
    } else {
      Lf("bad", `Your final exam results: ${score}/100. The pencil did its best. It was not enough.`);
    }
  }
  if (p.age >= 18 && p.age <= 22 && !has("f18") && !has("f18-retry") && !p.uni && !p.job) {
    if (!p.plannedMajor) p.plannedMajor = suggestedMajorSafe(p);
    const ev = getEvent("crossroads");
    if (ev && !s.pending.some((q) => q.eventId === "crossroads")) pushPending(s, ev, p);
  }
  if (p.age >= 19 && p.age <= 21 && has("f18-retry") && !has("f18") && !p.uni && !p.job) {
    if (!p.plannedMajor) p.plannedMajor = suggestedMajorSafe(p);
    const ev = getEvent("crossroads");
    if (ev && !s.pending.some((q) => q.eventId === "crossroads")) pushPending(s, ev, p);
  }
  if (p.age === 22 && has("f18-retry") && !has("f18") && !p.uni && !p.job) {
    const jobs = eligibleJobs(p).sort((a, b) => b.salary - a.salary);
    if (jobs.length && chance(0.8)) {
      const def = jobs[0];
      p.job = { jobId: def.id, seniority: 0, salary: nominalSalary(p, def, 0, s.worldYear), years: 0, employer: "your first employer" };
      p.flags.push("f18");
      p.milestones.push({ year: s.worldYear, age: p.age, text: `First job: ${def.title}` });
      Lf("career", "The crossroads made its decision for you: work. It is not a bad decision. It is the decision.");
    } else {
      Lf("bad", "You were 22 with no plan. The year has a way of fixing that, gently or otherwise.");
    }
  }
  // university progress, on the country's real degree length
  if (p.uni) {
    p.uni.year++;
    if (p.uni.year > cty.uniYears) {
      const major = p.uni.major;
      const gpa = Math.round(clamp(45 + p.smarts / 2 + ri(0, 15), 30, 99));
      p.education = "university";
      p.uni = null;
      add("fgrad");
      Lf("good", `You graduated with a degree in ${MAJOR_LIST.find((m) => m.id === major)?.name ?? major}. GPA ${gpa}/100. The tassel was a small, heavy promise.`);
      p.milestones.push({ year: s.worldYear, age: p.age, text: `Graduated: ${MAJOR_LIST.find((m) => m.id === major)?.name ?? major}` });
      const ev = getEvent("uni-offer");
      if (ev) pushPending(s, ev, p);
    } else {
      Lf("neutral", `University, year ${p.uni.year} of ${cty.uniYears}. The library has your face now.`);
    }
  }
  // partner dynamics
  if (p.partnerId) {
    const par = s.chars[p.partnerId];
    if (par && par.alive) {
      const drift = -1.5 + traitMod(p, "social") + (p.happiness > 70 ? 1.5 : 0) + (p.happiness < 40 ? -1 : 0);
      p.partnerValue = clamp((p.partnerValue ?? 50) + drift);
      par.partnerValue = clamp((par.partnerValue ?? 50) + drift);
      if ((p.partnerValue ?? 50) < 25 && p.age >= 16) {
        const ev = getEvent("breakup");
        if (ev && (p.eventCooldowns[ev.id] ?? 0) <= s.worldYear) {
          p.eventCooldowns[ev.id] = s.worldYear + (ev.cool ?? 5);
          pushPending(s, ev, p);
        }
      }
      if (!has("married") && (p.partnerValue ?? 0) > 75 && p.age > 21 && chance(0.12)) {
        Lf("event", `You and ${par.firstName} keep "accidentally" walking past wedding venues. It is not accidental.`);
      }
      const femaleHalf = p.gender === "female" ? p : par.gender === "female" ? par : undefined;
      if (femaleHalf && p.age >= 18 && p.age <= 50 && par.age >= 18 && par.age <= 48 && p.childrenIds.length < 5 && chance(has("married") ? 0.16 : 0.1)) {
        const ev = getEvent("pregnancy");
        if (ev && !s.pending.some((q) => q.eventId === "pregnancy")) pushPending(s, ev, p);
      }
    }
  }
  // retirement offers follow the country's retirement age
  if (p.age >= cty.retireAge && p.job && !has("fretire") && !has("fretire-later")) {
    const ev = getEvent("retire-offer");
    if (ev) pushPending(s, ev, p);
  }
  if (p.age >= cty.retireAge + 8 && p.job && has("fretire-later") && !has("fretire")) {
    const ev = getEvent("retire-offer");
    if (ev) pushPending(s, ev, p);
  }
  if (p.age >= 75 && p.job && !has("fretire")) {
    add("fretire");
    p.pension = Math.round((p.job?.salary ?? 0) * 0.45);
    p.job = null;
    p.retired = true;
    Lf("milestone", "At 75, the job finally gave up first. You retired. The garden is very pleased.");
  }
  if (p.age === 70) Lf("neutral", "You stopped counting the days. The days, politely, kept counting you.");
  if (p.age === 80) Lf("neutral", "Eighty. The house knows your footsteps better than you do.");
}

function suggestedMajorSafe(p: Char): string {
  return suggestedMajor(p);
}

function fireRandom(s: GameState, p: Char) {
  const pool = EVENTS.filter(
    (ev) =>
      !ev.scripted &&
      p.age >= ev.minAge &&
      p.age <= ev.maxAge &&
      (ev.minYear === undefined || s.worldYear >= ev.minYear) &&
      (ev.maxYear === undefined || s.worldYear <= ev.maxYear) &&
      (!ev.once || !p.flags.includes(ev.id)) &&
      (p.eventCooldowns[ev.id] ?? 0) <= s.worldYear &&
      (!ev.when || ev.when(makeCtx(s, p)))
  );
  if (pool.length === 0) return;
  const fireOne = (chosen: typeof pool[number]) => {
    if (chosen.choices) {
      pushPending(s, chosen, p);
      if (chosen.once) p.flags.push(chosen.id);
      p.eventCooldowns[chosen.id] = s.worldYear + (chosen.cool ?? 5);
    } else {
      runEvent(s, p, chosen);
    }
  };
  const total = pool.reduce((sum, ev) => sum + ev.weight, 0);
  let r = Math.random() * total;
  let chosen = pool[0];
  for (const ev of pool) {
    r -= ev.weight;
    if (r <= 0) {
      chosen = ev;
      break;
    }
  }
  fireOne(chosen);
  if (pool.length > 1 && chance(0.25)) {
    const rest = pool.filter((ev) => ev.id !== chosen.id && !p.flags.includes(ev.id));
    if (rest.length) {
      const second = pick(rest);
      fireOne(second);
    }
  }
}

/** Annual money settlement. Children get allowances; adults run real finances. */
function settle(s: GameState, p: Char, Lf: (k: LogKind, t: string) => void) {
  const year = s.worldYear;
  // ---- dependent children: allowance only, the household covers the rest
  if (p.age < 18 && !p.job && !p.uni) {
    const allowance = allowanceFor(p, year);
    p.money += allowance + extraCareerIncome(p);
    chargeHousehold(s, p);
    if (p.age === country(p.countryId).schoolStart - 1) {
      Lf("money", "The allowance era begins. Small money, enormous power.");
    }
    return;
  }
  accrueLoans(p);
  if (p.job) {
    const def = JOBS[p.job.jobId];
    if (def) p.job.salary = nominalSalary(p, def, p.job.seniority, year);
  }
  const income = (p.retired ? p.pension : p.job ? p.job.salary : 0) + extraCareerIncome(p);
  const cost = livingCost(p, year);
  let cash = p.money + income - cost;

  if (p.uni) {
    const before = p.loans.length;
    const t = payTuition(s, p);
    cash -= t.paid + t.family;
    if (t.borrowed > 0 && p.loans.length > before && !p.flags.includes("student-loan-note")) {
      p.flags.push("student-loan-note");
      Lf("bad", `Tuition outran the account: ${fmtMoney(t.borrowed, p.countryId)} went onto a student loan. It writes back, with interest.`);
    } else if (t.family > 0 && !p.flags.includes("family-tuition-note")) {
      p.flags.push("family-tuition-note");
      Lf("money", `Your family covered ${fmtMoney(t.family, p.countryId)} of tuition this year. The phone calls are now slightly warmer.`);
    }
  }

  if (p.loans.length > 0 && cash > 0) {
    const budget = Math.round(Math.min(cash * 0.3, 25000));
    repayLoans(p, budget);
    cash -= budget;
    if (p.debts === 0 && !p.flags.includes("debt-cleared-note")) {
      p.flags.push("debt-cleared-note");
      Lf("good", "The debt is cleared. It feels like putting down a backpack you wore for years.");
    }
  }

  if (cash < 0) {
    const shortfall = Math.round(-cash);
    if (income > 0 && shortfall > income * 0.25) {
      takeLoan(p, "personal", shortfall, year);
      Lf("bad", "The year cost more than the year paid. A personal loan papered over the gap.");
      cash = 0;
    } else {
      cash = 0;
    }
  }
  p.money = Math.round(cash);
  syncDebts(p);

  if (income > 0 && !p.flags.includes("first-pay")) {
    p.flags.push("first-pay");
    Lf("money", `The first real income of your adult life: ${fmtMoney(income, p.countryId)} a year. It smells like independence.`);
  }
  if (income === 0 && !p.retired && !p.uni && p.age >= 18) {
    p.happiness = clamp(p.happiness - 2);
  }
  const sixFigModern = 100000 * eraFactor(year);
  if (p.money >= sixFigModern && !p.flags.includes("sixfig")) {
    p.flags.push("sixfig");
    Lf("milestone", `You crossed ${fmtMoney(sixFigModern, p.countryId)} in the bank. You told no one. The account knows.`);
    p.milestones.push({ year, age: p.age, text: "First six-figure balance" });
  }
  // bounded hardship: deep trouble triggers a family rescue or a fresh start
  if (p.debts > income * 3 + 30000 && p.age >= 18) {
    const mother = s.chars[p.motherId ?? ""];
    const father = s.chars[p.fatherId ?? ""];
    if ((mother?.alive || father?.alive) && !p.flags.includes("bailout")) {
      p.flags.push("bailout");
      const rescue = nominal(12000, year);
      p.money += rescue;
      repayLoans(p, Math.min(rescue, p.debts));
      Lf("money", "The accounts went underwater. Your family sent emergency money and a longer phone call. You fixed it. Mostly.");
    } else {
      p.loans = [];
      syncDebts(p);
      p.money = nominal(1500, year);
      if (p.car) {
        p.car = undefined;
        Lf("bad", "The money collapsed. The car went to a lot. You started over with one strong coffee.");
      } else {
        Lf("bad", "The money collapsed. A fresh start: debts wiped, wallet thinned, spine intact.");
      }
      p.happiness = clamp(p.happiness - 6);
    }
  }
}

function drift(s: GameState, p: Char) {
  if (p.age > 55) p.health = clamp(p.health - (0.4 + (p.age - 55) * 0.07));
  else if (p.age > 35) p.health = clamp(p.health - 0.1);
  if (p.health < 30) p.happiness = clamp(p.happiness - 1);
  let target = 55 + traitMod(p, "social") * 3;
  if (p.traits.includes("optimist")) target += 8;
  if (p.happiness < target) p.happiness = clamp(p.happiness + 0.8);
  else if (p.happiness > target) p.happiness = clamp(p.happiness - 0.5);
  // languages: household exposure starts early, formal fluency comes later
  const native = country(p.countryId).languages[0];
  p.languageExposure ??= {};
  if (p.age < 18) {
    p.languageExposure[native] = clamp((p.languageExposure[native] ?? 0) + 5, 0, 100);
    p.languages[native] = clamp((p.languages[native] ?? 0) + 6, 0, 95);
    for (const l of country(p.countryId).languages.slice(1)) {
      p.languages[l] = clamp((p.languages[l] ?? 0) + 4, 0, 95);
    }
    // heritage languages spoken at home
    for (const parId of [p.motherId, p.fatherId]) {
      const par = parId ? s.chars[parId] : undefined;
      if (par) for (const [l, v] of Object.entries(par.languages)) {
        if (v >= 25) {
          p.languageExposure[l] = clamp((p.languageExposure[l] ?? 0) + 5, 0, 100);
          if (v >= 60) p.languages[l] = clamp((p.languages[l] ?? 0) + 2, 0, 90);
        }
      }
    }
  } else if (p.flags.includes("immigrant")) {
    p.languages[native] = clamp((p.languages[native] ?? 0) + 2, 0, 95);
  }
  if (p.age < 18) p.smarts = clamp(p.smarts + 1);
  if (p.age >= 5 && p.age <= 25) p.looks = clamp(p.looks + 0.4);
  else if (p.age > 30) p.looks = clamp(p.looks - 0.1);
  if (p.age > 60) p.looks = clamp(p.looks - 0.15);
  // citizenship clock for immigrants
  if (p.flags.includes("immigrant") && p.arrivedYear && !p.flags.includes("citizen") && s.worldYear - p.arrivedYear >= 8) {
    p.flags.push("citizen");
    p.citizenOf = p.countryId;
    p.citizenships ??= [];
    if (!p.citizenships.includes(p.countryId)) p.citizenships.push(p.countryId);
  }
}

function onPlayerDeath(s: GameState, p: Char, Lf: (k: LogKind, t: string) => void) {
  if (!p.alive || s.over) return; // deaths are permanent and never double-fired
  p.alive = false;
  p.deathYear = s.worldYear;
  p.causeOfDeath = deathCause(p);
  // Release the surviving spouse so a living character is never left
  // partnered to someone who has died.
  const spouse = p.partnerId ? s.chars[p.partnerId] : undefined;
  if (spouse && spouse.alive) {
    spouse.partnerHistory.push(p.id);
    spouse.partnerId = undefined;
    spouse.partnerValue = 0;
  }
  const c = country(p.countryId);
  Lf("milestone", `${p.firstName} died at ${p.age}, ${p.causeOfDeath}.`);
  distributeEstate(s, p, p);
  const jobTitle = p.job ? JOBS[p.job.jobId]?.title : null;
  const kids = p.childrenIds.filter((id) => s.chars[id]).length;
  const net = netWorth(p);
  const topStat = (["health", "happiness", "smarts", "looks"] as const).reduce((a, b) => (p[a] >= p[b] ? a : b));
  s.overText =
    `${p.firstName} ${p.lastName} lived ${p.age} years in ${p.city}, ${c.name}. ` +
    (jobTitle
      ? `Known, finally, as ${jobTitle}. `
      : p.retired
        ? "A respected retiree, a keeper of the good stories. "
        : p.education === "university"
          ? "A graduate, a reader, a question-asker. "
          : "") +
    (kids > 0 ? `${kids} ${kids === 1 ? "child" : "children"} grew up with your stories in their pockets. ` : "") +
    `Final accounts: ${fmtMoney(net, p.countryId)}. ${EPITAPHS[topStat]}`;
  s.over = true;
  s.pending = [];
  s.livesLived++;
}

export function continueAs(s: GameState, id: string) {
  const d = s.chars[id];
  if (!d || !d.alive) return;
  const old = s.chars[s.currentId];
  if (old) old.isPlayer = false;
  d.isPlayer = true;
  d.usedActions = [];
  s.currentId = id;
  s.generation += 1;
  s.over = false;
  s.overText = undefined;
  s.pending = [];
  L(s, d.age, "milestone", `Generation ${s.generation}. The story continues through ${d.firstName} ${d.lastName}, age ${d.age}. The world is exactly as you left it — only the hands are new.`);
}

/** Eligible successors: living descendants, oldest first, adults preferred. */
export function eligibleSuccessors(s: GameState): Char[] {
  const p = s.chars[s.currentId];
  const direct = p.childrenIds.map((id) => s.chars[id]).filter((c) => c && c.alive);
  const grand = direct.flatMap((c) => c.childrenIds.map((id) => s.chars[id]).filter((g) => g && g.alive));
  return [...direct, ...grand].sort((a, b) => b.age - a.age);
}

export function ageUp(s: GameState): void {
  // Life-cycle state machine: a finished life never ticks again.
  if (s.over) return;
  const p = s.chars[s.currentId];
  if (!p || !p.alive) {
    s.over = true;
    return;
  }
  s.worldYear++;
  p.age++;
  p.usedActions = [];
  advanceSuperNpc(s, p, true);
  const Lf = (k: LogKind, t: string) => L(s, p.age, k, t);
  simulateNpcs(s, p, Lf);
  if (!p.alive) return;
  advanceCharacterSkills(p, s.worldYear, false);
  advanceSportCareer(s, p, false);
  advanceFame(s, p, false);
  milestones(s, p, Lf);
  if (s.pending.length === 0) queueSuperAwakening(s, p);
  fireRandom(s, p);
  settle(s, p, Lf);
  drift(s, p);
  if (p.age >= 120 || chance(deathChance(p))) {
    onPlayerDeath(s, p, Lf);
  }
}
