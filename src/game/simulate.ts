import type { Char, GameState, LifeEvent, LogKind } from "./types";
import { country, fmtMoney } from "./world";
import {
  EPITAPHS, FIRST_WORDS, JOBS, MAJOR_LIST, YOUNG_ACCIDENTS, MID_CAUSES, OLD_CAUSES,
  allowanceFor, eligibleJobs, jobSalary, livingCost, traitMod,
} from "./content";
import { chance, clamp, createChild, makeFriend, makeNpcPerson, pick, relLabel, ri } from "./characters";
import { EVENTS, makeCtx, runEvent } from "./events";

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
  else base = 0.15;
  base += ((100 - c.health) / 100) * 0.004;
  if (a >= 15 && a <= 45) base += 0.0015;
  if (c.health <= 5) base += 0.3;
  return Math.min(0.95, base);
}

function deathCause(c: Char): string {
  if (c.age < 45) return pick(YOUNG_ACCIDENTS);
  if (c.age < 65) return pick(MID_CAUSES);
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
  // inheritance
  const estate = c.money + (c.house ? c.house.value * 0.8 : 0) - c.debts;
  if (estate > 2000) {
    const children = c.childrenIds.map((id) => s.chars[id]).filter((k) => k && k.alive);
    let heirs: Char[] = children;
    if (heirs.length === 0 && par?.alive) heirs = [par];
    if (heirs.length === 0) {
      const sibIds = (c.motherId ? Object.values(s.chars).filter((x) => x.motherId === c.motherId && x.id !== c.id) : []);
      heirs = sibIds.filter((x) => x.alive).slice(0, 3);
    }
    if (heirs.length > 0) {
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
  }
  const rel = relLabel(p, c, s.chars).toLowerCase();
  notes.push({
    prio: 3,
    text: `${rel === "a friend" ? "Your friend" : rel === "your mother" ? "Your mother" : rel === "your father" ? "Your father" : rel === "your sister" ? "Your sister" : rel === "your brother" ? "Your brother" : rel === "a relative" ? "A relative" : rel.charAt(0).toUpperCase() + rel.slice(1)} ${c.firstName} passed away at ${c.age}, ${c.causeOfDeath}.`,
    kind: "bad",
  });
}

function simulateNpcs(s: GameState, p: Char, Lf: (k: LogKind, t: string) => void) {
  const notes: { prio: number; text: string; kind: LogKind }[] = [];
  for (const c of Object.values(s.chars)) {
    if (c.id === p.id || !c.alive) continue;
    c.age++;
    // health & mood drift
    if (c.age > 55) c.health = clamp(c.health - (0.4 + (c.age - 55) * 0.06));
    c.happiness = clamp(c.happiness + (c.happiness < 55 ? 0.8 : -0.4));
    // career
    const jobNow = c.job;
    if (jobNow) {
      jobNow.years++;
      const def = JOBS[jobNow.jobId];
      if (def?.unstable && chance(0.04)) {
        c.job = null;
      } else if (chance(0.07) && jobNow.seniority < 3) {
        jobNow.seniority++;
        jobNow.salary = jobSalary(def ?? JOBS.office, c, jobNow.seniority);
      }
      c.money += Math.round((c.job?.salary ?? 0) * 0.3);
    } else if (!c.retired && c.age >= 18 && !c.uni && chance(0.28)) {
      const jobs = eligibleJobs(c);
      if (jobs.length) {
        const def = pick(jobs);
        c.job = { jobId: def.id, seniority: 0, salary: jobSalary(def, c, 0), years: 0, employer: "a local company" };
        if (closeToPlayer(p, c)) {
          notes.push({ prio: 1, text: `${relLabel(p, c, s.chars)} ${c.firstName} started working as ${def.title}.`, kind: "world" });
        }
      }
    }
    // university
    if (c.uni) {
      c.uni.year++;
      if (c.uni.year > 4) {
        c.education = "university";
        const major = c.uni.major;
        c.uni = null;
        if (closeToPlayer(p, c)) {
          notes.push({
            prio: 2,
            text: `${relLabel(p, c, s.chars)} ${c.firstName} graduated with a degree in ${MAJOR_LIST.find((m) => m.id === major)?.name ?? major}.`,
            kind: "world",
          });
        }
      }
    } else if (!c.job && c.age === 18 && c.smarts > 58 && chance(0.4)) {
      c.uni = { year: 1, major: pick(["business", "cs", "law", "biology", "education"]), gpa: ri(50, 85) };
      if (closeToPlayer(p, c)) {
        notes.push({ prio: 2, text: `${relLabel(p, c, s.chars)} ${c.firstName} off to university.`, kind: "world" });
      }
    }
    // romance & family for NPCs
    if (c.partnerId) {
      const par = s.chars[c.partnerId];
      if (par && par.alive) {
        const drift = ri(-3, 3) + (p.id === c.id ? 0 : 0);
        c.partnerValue = clamp((c.partnerValue ?? 60) + drift);
        par.partnerValue = clamp((par.partnerValue ?? 60) + drift);
        if (c.age >= 21 && c.age <= 44 && c.childrenIds.length < 4 && chance(0.1)) {
          const mother = c.gender === "female" ? c : par;
          const father = c.gender === "female" ? par : c;
          const child = createChild(s, mother, father);
          if (closeToPlayer(p, c) || closeToPlayer(p, par)) {
            notes.push({
              prio: 3,
              text: `${relLabel(p, c, s.chars)} ${c.firstName}${par.gender === "female" && c.gender === "male" ? " and " + par.firstName : ""} welcomed a baby: ${child.firstName}.`,
              kind: "family",
            });
          }
        }
      }
    } else if (c.age >= 20 && c.age <= 42 && chance(0.05)) {
      const par = makeNpcPerson(s, c.age + ri(-4, 4), c.countryId);
      par.partnerId = c.id;
      c.partnerId = par.id;
      c.partnerSince = s.worldYear;
      c.partnerValue = 70;
      par.partnerValue = 70;
      if (c.age > 27) {
        c.flags.push("married");
        par.flags.push("married");
      }
      if (closeToPlayer(p, c)) {
        notes.push({
          prio: 2,
          text: c.age > 27
            ? `${relLabel(p, c, s.chars)} ${c.firstName} got married to ${par.firstName}. The cake was enormous.`
            : `${relLabel(p, c, s.chars)} ${c.firstName} is seeing someone new: ${par.firstName}.`,
          kind: "world",
        });
      }
    }
    // retirement
    if (c.age >= 62 && c.job) {
      c.pension = Math.round(c.job.salary * 0.45);
      c.job = null;
      c.retired = true;
    }
    // death
    if (chance(deathChance(c))) handleNpcDeath(s, p, c, notes);
  }
  // friends decay
  for (const f of p.friends) {
    f.value = clamp(f.value - 2, -100, 100);
  }
  p.friends = p.friends.filter((f) => s.chars[f.id]?.alive);
  // emit top notes
  notes.sort((a, b) => b.prio - a.prio);
  notes.slice(0, 3).forEach((n) => Lf(n.kind, n.text));
}

function milestones(s: GameState, p: Char, Lf: (k: LogKind, t: string) => void) {
  const has = (f: string) => p.flags.includes(f);
  const add = (f: string) => {
    if (!has(f)) p.flags.push(f);
  };
  if (p.age === 2 && !has("fw2")) {
    add("fw2");
    const w = FIRST_WORDS[country(p.countryId).languages[0]] ?? "mama";
    Lf("good", `You said your first word: "${w}". The look on your parent's face was, by all accounts, a religious experience.`);
  }
  if (p.age === 6 && !has("fschool")) {
    add("fschool");
    p.education = "primary";
    const f = makeFriend(s, p);
    p.friends.push({ id: f.id, value: 70 });
    Lf("neutral", `Primary school, day one. The building is a cathedral of noise.`);
    Lf("family", `At the playground you met ${f.firstName}. Within a week, you were inseparable. Within a month, so were your parents' schedules.`);
    p.milestones.push({ year: s.worldYear, age: p.age, text: "First best friend" });
  }
  if (p.age === 12 && !has("fsecondary")) {
    add("fsecondary");
    Lf("neutral", "Secondary school. The lockers are bigger than you. The hallways have opinions.");
  }
  if (p.age === 14 && !has("fcrush")) {
    add("fcrush");
    const ev = getEvent("crush");
    if (ev) pushPending(s, ev, p);
  }
  if (p.age === 17 && !has("fexam")) {
    add("fexam");
    const score = Math.round(clamp(p.smarts * 0.85 + ri(0, 20) + traitMod(p, "career") * 4, 15, 99));
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
  if ((p.age >= 18 && p.age <= 22) && !has("f18") && !has("f18-retry") && !p.uni && !p.job) {
    const ev = getEvent("crossroads");
    if (ev) pushPending(s, ev, p);
  }
  if (p.age >= 19 && p.age <= 21 && has("f18-retry") && !has("f18") && !p.uni && !p.job) {
    const ev = getEvent("crossroads");
    if (ev && !s.pending.some((q) => q.eventId === "crossroads")) pushPending(s, ev, p);
  }
  if (p.age === 22 && has("f18-retry") && !has("f18") && !p.uni && !p.job) {
    // time's up: into work
    const jobs = eligibleJobs(p).sort((a, b) => b.salary - a.salary);
    if (jobs.length && chance(0.8)) {
      const def = jobs[0];
      p.job = { jobId: def.id, seniority: 0, salary: jobSalary(def, p, 0), years: 0, employer: "your first employer" };
      p.flags.push("f18");
      p.milestones.push({ year: s.worldYear, age: p.age, text: `First job: ${def.title}` });
      Lf("career", "The crossroads made its decision for you: work. It is not a bad decision. It is the decision.");
    } else {
      Lf("bad", "You were 22 with no plan. The year has a way of fixing that, gently or otherwise.");
    }
  }
  // university progress
  if (p.uni) {
    p.uni.year++;
    if (p.uni.year > 4) {
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
      Lf("neutral", `University, year ${p.uni.year} of 4. The library has your face now.`);
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
      if (p.age >= 18 && p.age <= 50 && (par.age >= 18 && par.age <= 48) && p.childrenIds.length < 5 && chance(has("married") ? 0.16 : 0.1)) {
        const ev = getEvent("pregnancy");
        if (ev && !s.pending.some((q) => q.eventId === "pregnancy")) pushPending(s, ev, p);
      }
    }
  }
  // retirement offer
  if (p.age >= 62 && p.job && !has("fretire") && !has("fretire-later")) {
    const ev = getEvent("retire-offer");
    if (ev) pushPending(s, ev, p);
  }
  if (p.age >= 70 && p.age <= 74 && p.job && has("fretire-later") && !has("fretire")) {
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
  if (p.age === 70) {
    Lf("neutral", "You stopped counting the days. The days, politely, kept counting you.");
  }
  if (p.age === 80) {
    Lf("neutral", "Eighty. The house knows your footsteps better than you do.");
  }
}

function fireRandom(s: GameState, p: Char, Lf: (k: LogKind, t: string) => void) {
  void Lf;
  const pool = EVENTS.filter(
    (ev) =>
      !ev.scripted &&
      p.age >= ev.minAge &&
      p.age <= ev.maxAge &&
      (!ev.once || !p.flags.includes(ev.id)) &&
      (p.eventCooldowns[ev.id] ?? 0) <= s.worldYear &&
      (!ev.when || ev.when(makeCtx(s, p)))
  );
  if (pool.length === 0) return;
  const fireOne = () => {
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
    if (ev_choices(chosen)) {
      pushPending(s, chosen, p);
      if (chosen.once) p.flags.push(chosen.id);
      p.eventCooldowns[chosen.id] = s.worldYear + (chosen.cool ?? 5);
    } else {
      runEvent(s, p, chosen);
    }
  };
  fireOne();
  if (pool.length > 1 && chance(0.25)) {
    const lastEvId = s.pending.length ? s.pending[s.pending.length - 1].eventId : "";
    const rest = pool.filter((ev) => ev.id !== lastEvId && !p.flags.includes(ev.id));
    if (rest.length) {
      const chosen = pick(rest);
      if (ev_choices(chosen)) {
        pushPending(s, chosen, p);
        if (chosen.once) p.flags.push(chosen.id);
        p.eventCooldowns[chosen.id] = s.worldYear + (chosen.cool ?? 5);
      } else {
        runEvent(s, p, chosen);
      }
    }
  }
}

function ev_choices(ev: LifeEvent): boolean {
  return !!ev.choices;
}

function settle(s: GameState, p: Char, Lf: (k: LogKind, t: string) => void) {
  const isStudent = !!p.uni;
  if (p.age < 18 && !p.job && !isStudent) {
    p.money = Math.max(0, p.money) + allowanceFor(p);
    if (p.age === 5) Lf("money", "The allowance era begins. Small money, enormous power.");
    return;
  }
  const income = p.retired ? p.pension : p.job ? p.job.salary : 0;
  const cost = livingCost(p);
  p.money += income - cost;
  if (isStudent) {
    const t = country(p.countryId).uniCost;
    if (p.money >= t) p.money -= t;
    else {
      p.debts += t - p.money;
      p.money = 0;
      Lf("bad", "The tuition slipped into student debt. The debt does not care about your dreams, but it does compound.");
    }
  }
  if (p.debts > 0 && p.money > 0) {
    const pay = Math.min(p.debts, p.money * 0.3, 15000);
    p.money -= pay;
    p.debts -= pay;
    if (p.debts <= 0) {
      p.debts = 0;
      Lf("good", "The debt is cleared. It feels like putting down a backpack you wore for years.");
    }
  }
  if (income > 0 && !p.flags.includes("first-pay")) {
    p.flags.push("first-pay");
    Lf("money", `The first real income of your adult life: ${fmtMoney(income, p.countryId)} a year. It smells like independence.`);
  }
  if (income === 0 && !p.retired && !isStudent && p.age >= 18) {
    p.happiness = clamp(p.happiness - 2);
  }
  if (p.money >= 100000 && !p.flags.includes("sixfig")) {
    p.flags.push("sixfig");
    Lf("milestone", "You crossed $100K in the bank. You told no one. The account knows.");
    p.milestones.push({ year: s.worldYear, age: p.age, text: "First $100K" });
  }
  if (p.money < -20000) {
    const mother = s.chars[p.motherId ?? ""];
    const father = s.chars[p.fatherId ?? ""];
    if ((mother?.alive && mother.age >= 18) || (father?.alive && father.age >= 18)) {
      p.money += 12000;
      Lf("money", "The accounts went underwater. Your family sent emergency money and a longer phone call. You fixed it. Mostly.");
    } else {
      p.debts = 0;
      p.money = 1500;
      if (p.car) {
        p.car = undefined;
        Lf("bad", "The money collapsed. The car went to a lot. You started over at $1,500 and one strong coffee.");
      } else {
        Lf("bad", "The money collapsed. A fresh start: debts wiped, wallet thinned, spine intact.");
      }
      p.happiness = clamp(p.happiness - 6);
    }
  }
}

function drift(s: GameState, p: Char) {
  void s;
  if (p.age > 55) p.health = clamp(p.health - (0.4 + (p.age - 55) * 0.07));
  else if (p.age > 35) p.health = clamp(p.health - 0.1);
  if (p.health < 30) p.happiness = clamp(p.happiness - 1);
  let target = 55 + traitMod(p, "social") * 3;
  if (p.traits.includes("optimist")) target += 8;
  if (p.happiness < target) p.happiness = clamp(p.happiness + 0.8);
  else if (p.happiness > target) p.happiness = clamp(p.happiness - 0.5);
  // languages
  const native = country(p.countryId).languages[0];
  if (p.age < 18) {
    p.languages[native] = clamp((p.languages[native] ?? 0) + 6, 0, 95);
    for (const l of country(p.countryId).languages.slice(1)) p.languages[l] = clamp((p.languages[l] ?? 0) + 4, 0, 95);
  } else if (p.flags.includes("immigrant")) {
    p.languages[native] = clamp((p.languages[native] ?? 0) + 2, 0, 95);
  }
  if (p.age < 18) p.smarts = clamp(p.smarts + 1);
  if (p.age >= 5 && p.age <= 25) p.looks = clamp(p.looks + 0.4);
  else if (p.age > 30) p.looks = clamp(p.looks - 0.1);
  if (p.age > 60) p.looks = clamp(p.looks - 0.15);
}

function onPlayerDeath(s: GameState, p: Char, Lf: (k: LogKind, t: string) => void) {
  p.alive = false;
  p.deathYear = s.worldYear;
  p.causeOfDeath = deathCause(p);
  const c = country(p.countryId);
  Lf("milestone", `${p.firstName} died at ${p.age}, ${p.causeOfDeath}.`);
  const jobTitle = p.job ? JOBS[p.job.jobId]?.title : null;
  const kids = p.childrenIds.filter((id) => s.chars[id]).length;
  const net = p.money - p.debts + (p.house?.value ?? 0);
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

export function ageUp(s: GameState): void {
  if (s.over) return;
  const p = s.chars[s.currentId];
  if (!p || !p.alive) {
    s.over = true;
    return;
  }
  s.worldYear++;
  p.age++;
  p.usedActions = [];
  const Lf = (k: LogKind, t: string) => L(s, p.age, k, t);
  simulateNpcs(s, p, Lf);
  if (!p.alive) return;
  milestones(s, p, Lf);
  fireRandom(s, p, Lf);
  settle(s, p, Lf);
  drift(s, p);
  if (p.age >= 120 || chance(deathChance(p))) {
    onPlayerDeath(s, p, Lf);
  }
}
