import type { Char, GameState, LogKind } from "./types";
import { COUNTRY_LIST, LANGS, country, fmtMoney } from "./world";
import { ACTIONS, CARS, EMPLOYERS, JOBS, MAJOR_LIST, eligibleJobs, hiringChance, proficiencyLabel, suggestedMajor } from "./content";
import { clamp, pick, chance, random } from "./rng";
import { createChild, makeNpcPerson } from "./characters";
import { nominal, nominalSalary, takeLoan, eraFactor } from "./economy";

function L(s: GameState, p: Char, kind: LogKind, text: string) {
  s.log.push({ id: s.seq++, year: s.worldYear, age: p.age, text, kind });
  s.log = s.log.slice(-500);
}

function toast(s: GameState, text: string) {
  s.toast = { id: s.seq++, text };
}

export function actionLock(s: GameState, id: string): string | null {
  const p = s.chars[s.currentId];
  if (!p.alive || s.over) return "This life has ended.";
  const def = ACTIONS.find((a) => a.id === id);
  if (!def) return null;
  if (def.minAge && p.age < def.minAge) return `Available from age ${def.minAge}.`;
  if (def.maxAge && p.age > def.maxAge) return "Past this chapter.";
  if (def.cost && p.age >= 18) {
    const need = nominal(def.cost, s.worldYear);
    if (p.money < need) return `Needs ${fmtMoney(need, p.countryId)}.`;
  }
  if (def.lock) {
    const r = def.lock(p);
    if (r) return r;
  }
  if (p.usedActions.includes(id)) return "Already done this year.";
  return null;
}

function markUsed(p: Char, id: string) {
  if (!p.usedActions.includes(id)) p.usedActions.push(id);
}

function tryLandJob(s: GameState, p: Char, jobId: string): boolean {
  const def = eligibleJobs(p).find((j) => j.id === jobId);
  if (!def) return false;
  if (random() > hiringChance(p, def)) return false;
  const employer = pick(EMPLOYERS);
  if (p.job) {
    p.flags.push("job-switched");
    L(s, p, "career", `You left ${p.job.employer} for ${employer}. The new badge is heavier.`);
  } else {
    L(s, p, "career", `${employer} hired you as ${def.title}. ${def.desc}`);
    if (!p.flags.includes("first-job")) {
      p.flags.push("first-job");
      p.milestones.push({ year: s.worldYear, age: p.age, text: `First job: ${def.title}` });
      L(s, p, "milestone", "First real paycheck in your life. It feels like a small, loud superpower.");
    }
  }
  p.job = { jobId: def.id, seniority: 0, salary: nominalSalary(p, def, 0, s.worldYear), years: 0, employer };
  p.retired = false;
  return true;
}

export function doAction(s: GameState, id: string, opt?: string): void {
  const p = s.chars[s.currentId];
  if (!p.alive || s.over) return;
  if (id !== "apply" && actionLock(s, id)) return;
  const moneyBefore = p.money;

  switch (id) {
    case "exercise":
      p.health = clamp(p.health + 4);
      p.happiness = clamp(p.happiness + 2);
      L(s, p, "neutral", "You worked out. Your muscles filed a complaint, but a happy one.");
      toast(s, "You'll feel it tomorrow. Or today.");
      break;
    case "study":
      if (p.age < 18) {
        p.smarts = clamp(p.smarts + 2);
        L(s, p, "neutral", p.uni ? "You studied until the numbers had faces. The faces were helpful." : "You studied. Your brain quietly updated itself to a newer version.");
      } else {
        p.smarts = clamp(p.smarts + 1);
        p.happiness = clamp(p.happiness - 1);
        L(s, p, "neutral", "You studied. The book was heavy; so was the year.");
      }
      break;
    case "meditate":
      p.happiness = clamp(p.happiness + 5);
      p.health = clamp(p.health + 1);
      L(s, p, "neutral", "You meditated. The breathing went in; the noise went out.");
      break;
    case "socialize": {
      p.happiness = clamp(p.happiness + 4);
      for (const f of p.friends) f.value = clamp(f.value + 6, -100, 100);
      const f = p.friends.length ? s.chars[p.friends[0].id] : undefined;
      L(s, p, "neutral", `You saw friends. ${f ? f.firstName + " said something unforgivable and it was perfect." : "The table was full."}`);
      break;
    }
    case "party":
      p.money -= nominal(150, s.worldYear);
      p.happiness = clamp(p.happiness + 7);
      p.health = clamp(p.health - 2);
      if (chance(0.2)) {
        p.happiness = clamp(p.happiness - 3);
        L(s, p, "event", "You threw a party. The photo in the wrong group chat is now a national document.");
      } else {
        L(s, p, "good", "You threw a party. Speakers up, dignity negotiable, everyone left slower than they came.");
      }
      break;
    case "invest": {
      p.money -= nominal(10000, s.worldYear);
      const r = random();
      if (r < 0.55) {
        p.money += nominal(12000, s.worldYear);
        L(s, p, "money", "Your investment grew 12%. It worked the year you weren't watching, like all good employees.");
        toast(s, "+20%. The money worked.");
      } else if (r < 0.8) {
        p.money += nominal(12500, s.worldYear);
        L(s, p, "money", "Your investment surprised everyone, including its lawyers: +25%.");
        toast(s, "+25%. Unreasonably good.");
      } else {
        p.money -= nominal(3000, s.worldYear);
        L(s, p, "money", "Your investment shrank 30%. The charts are just a picture, the picture is just a memory.");
        toast(s, "-30%. Charts are just pictures.");
      }
      break;
    }
    case "lottery": {
      p.money -= nominal(20, s.worldYear);
      const r = random();
      if (r < 0.002) {
        const win = nominal(100000, s.worldYear);
        p.money += win;
        p.milestones.push({ year: s.worldYear, age: p.age, text: "The lottery" });
        L(s, p, "milestone", "The lottery numbers matched. All of them. Check the ticket again. Do it.");
        toast(s, "THE NUMBERS MATCHED.");
      } else if (r < 0.06) {
        p.money += nominal(40, s.worldYear);
        L(s, p, "good", "The lottery paid out $40. Small, loud, personal.");
      } else {
        L(s, p, "neutral", "The lottery numbers came in. They were not your numbers. They were everyone else's numbers.");
      }
      break;
    }
    case "car": {
      const price = nominal(28000, s.worldYear);
      p.money -= price;
      const name = pick(CARS);
      p.car = { name, value: price };
      L(s, p, "good", `You bought ${name}. The first drive home was a small ceremony.`);
      p.milestones.push({ year: s.worldYear, age: p.age, text: "Bought a car" });
      break;
    }
    case "house": {
      const price = nominal(Math.round(160000 * country(p.countryId).costIndex), s.worldYear);
      const down = Math.round(price * 0.3);
      p.money -= down;
      takeLoan(p, "mortgage", price - down, s.worldYear);
      p.house = { value: price, city: p.city };
      L(s, p, "milestone", `You bought a house in ${p.city}. The keys were warm from the lock. The mortgage has your name and a long memory.`);
      p.milestones.push({ year: s.worldYear, age: p.age, text: `Bought a house in ${p.city}` });
      break;
    }
    case "relocate": {
      const destCity = opt && country(p.countryId).cities.includes(opt) ? opt : pick(country(p.countryId).cities.filter((x) => x !== p.city));
      const fee = nominal(2500, s.worldYear);
      p.money -= fee;
      p.city = destCity;
      L(s, p, "family", `You moved to ${destCity}. Same country, new postcode, new bakery to become a regular at.`);
      p.milestones.push({ year: s.worldYear, age: p.age, text: `Moved to ${destCity}` });
      break;
    }
    case "vacation": {
      p.money -= nominal(3000, s.worldYear);
      p.happiness = clamp(p.happiness + 9);
      L(s, p, "good", "You took a vacation. You came back quieter, and somehow louder inside.");
      break;
    }
    case "gift": {
      p.money -= nominal(200, s.worldYear);
      const kidId = p.childrenIds[0];
      const kid = s.chars[kidId];
      if (kid) {
        kid.happiness = clamp(kid.happiness + 8);
        L(s, p, "family", `You bought ${kid.firstName} a ${pick(["robot", "board game", "very good book", "tiny guitar", "plush animal with opinions"])}. ${kid.firstName} said you're the best. Twice.`);
      }
      break;
    }
    case "date": {
      // The candidate only enters the world if the date works.
      const cand = makeNpcPerson(s, p.age + Math.floor(random() * 9) - 4, p.countryId, p.group);
      const c = 0.35 + p.looks / 250 + p.happiness / 400 + (p.traits.includes("charming") ? 0.1 : 0);
      if (random() < c) {
        p.partnerId = cand.id;
        cand.partnerId = p.id;
        p.partnerSince = s.worldYear;
        p.partnerValue = 55 + Math.round(p.looks / 5);
        cand.partnerValue = p.partnerValue;
        L(s, p, "family", `You and ${cand.firstName} have been going out since that one night. The playlists are already shared.`);
        toast(s, `You and ${cand.firstName} are going out.`);
      } else {
        delete s.chars[cand.id]; // rejected strangers don't accumulate in the world
        p.happiness = clamp(p.happiness - 2);
        L(s, p, "neutral", "They liked you — as a friend? a person? unclear. No harm done. The playlist stays yours.");
        toast(s, "Not this one. The next one is closer.");
      }
      break;
    }
    case "quality": {
      const par = s.chars[p.partnerId ?? ""];
      if (!par) break;
      p.partnerValue = clamp((p.partnerValue ?? 50) + 8);
      par.partnerValue = clamp((par.partnerValue ?? 50) + 8);
      p.happiness = clamp(p.happiness + 4);
      L(s, p, "family", `You and ${par.firstName} did nothing, together, for a whole evening. It was the most efficient thing you did all year.`);
      break;
    }
    case "propose": {
      const par = s.chars[p.partnerId ?? ""];
      if (!par) break;
      const c = 0.45 + (p.partnerValue ?? 65) / 120 + (p.traits.includes("charming") ? 0.05 : 0);
      if (random() < c) {
        p.flags.push("married");
        par.flags.push("married");
        p.happiness = clamp(p.happiness + 10);
        p.milestones.push({ year: s.worldYear, age: p.age, text: `Married ${par.firstName}` });
        L(s, p, "milestone", `You proposed. ${par.firstName} said yes before you finished the sentence. The ring is slightly too big and exactly right.`);
      } else {
        p.partnerValue = clamp((p.partnerValue ?? 65) - 5);
        L(s, p, "bad", `You proposed. ${par.firstName} said "not yet". The word of the decade.`);
      }
      break;
    }
    case "divorce": {
      const par = s.chars[p.partnerId ?? ""];
      if (!par) break;
      p.partnerHistory.push(par.id);
      par.partnerHistory.push(p.id);
      par.partnerId = undefined;
      p.partnerId = undefined;
      p.partnerValue = 0;
      par.partnerValue = 0;
      p.flags.push("divorced");
      par.flags.push("divorced");
      p.happiness = clamp(p.happiness - 8);
      L(s, p, "family", `You and ${par.firstName} got a divorce. The lawyer kept a straight face; you couldn't. The kids get both of you, always.`);
      break;
    }
    case "baby": {
      const par = s.chars[p.partnerId ?? ""];
      if (!par) break;
      const mother = p.gender === "female" ? p : par.gender === "female" ? par : undefined;
      if (!mother) {
        L(s, p, "neutral", "You two make plans and scrapbooks instead; the adoption office keeps the door open.");
        break;
      }
      const father = mother === p ? par : p;
      if (random() < 0.4) {
        const child = createChild(s, mother, father);
        p.milestones.push({ year: s.worldYear, age: p.age, text: `Welcomed ${child.firstName}` });
        p.happiness = clamp(p.happiness + 8);
        L(s, p, "family", `${child.firstName} arrived. The house has never been quieter or louder at the same time.`);
      } else {
        L(s, p, "neutral", "You tried. The future remains a possibility, which is what they all are.");
      }
      break;
    }
    case "adopt": {
      if (random() < 0.6) {
        p.money -= nominal(8000, s.worldYear);
        const origin = pick(COUNTRY_LIST.filter((c) => c.id !== p.countryId));
        const par = s.chars[p.partnerId ?? ""];
        const mother = p.gender === "female" ? p : par ?? p;
        const father = p.gender === "female" ? par ?? p : p;
        const child = createChild(s, mother, father, origin.id);
        p.milestones.push({ year: s.worldYear, age: p.age, text: `Adopted ${child.firstName}` });
        L(s, p, "family", `You adopted ${child.firstName} from ${origin.name}. The paperwork took months; the love took about five minutes.`);
      } else {
        L(s, p, "neutral", "The adoption office: 'Next available family profile: three months.' You'll try again soon.");
      }
      break;
    }
    case "jobhunt": {
      const jobs = eligibleJobs(p).sort((a, b) => b.salary - a.salary).slice(0, 3);
      let landed = false;
      for (const j of jobs) {
        if (tryLandJob(s, p, j.id)) {
          landed = true;
          break;
        }
      }
      if (!landed) {
        L(s, p, "bad", "No luck this year. The cover letters are better than the odds, for now.");
        toast(s, "The market says: next year.");
      }
      break;
    }
    case "apply": {
      if (opt && tryLandJob(s, p, opt)) {
        toast(s, "Hired. The badge feels heavy.");
      } else {
        L(s, p, "neutral", "The interview went well; the offer went somewhere else. You kept your posture anyway.");
        toast(s, "Not this one. The next one is closer.");
      }
      break;
    }
    case "promote": {
      const j = p.job;
      if (!j) break;
      const c = 0.35 + p.smarts / 400 + (p.traits.includes("ambitious") ? 0.05 : 0);
      if (j.seniority < 3 && random() < c) {
        j.seniority++;
        const def = JOBS[j.jobId];
        if (def) j.salary = nominalSalary(p, def, j.seniority, s.worldYear);
        L(s, p, "good", "You got the promotion. The new title is longer; the coffee is better; the blame is heavier.");
      } else if (j.seniority >= 3) {
        L(s, p, "neutral", "You're at the top of this ladder. The view is better; the meetings are longer.");
      } else {
        L(s, p, "neutral", "The promotion went to someone with a better elevator pitch. You are working on yours.");
      }
      break;
    }
    case "resign":
      p.job = null;
      p.happiness = clamp(p.happiness + 3);
      L(s, p, "neutral", "You quit. The first week felt illegal.");
      break;
    case "uni-enroll": {
      if (p.uni || p.education === "university" || (p.examScore ?? 0) < 55 || p.job) break;
      const major = p.plannedMajor ?? suggestedMajor(p);
      p.uni = { year: 1, major, gpa: 50 };
      p.milestones.push({ year: s.worldYear, age: p.age, text: "Back to university" });
      L(s, p, "good", `You enrolled in ${MAJOR_LIST.find((m) => m.id === p.uni!.major)?.name}. The classroom is new again — in the best way.`);
      break;
    }
    case "drop-uni": {
      if (!p.uni) break;
      const major = p.uni.major;
      p.uni = null;
      L(s, p, "bad", `You dropped out of ${MAJOR_LIST.find((m) => m.id === major)?.name ?? major}. The door stays open; so does the risk.`);
      break;
    }
    case "retire": {
      const j = p.job;
      if (!j) break;
      p.pension = Math.round(j.salary * 0.45);
      p.job = null;
      p.retired = true;
      p.flags.push("fretire");
      p.milestones.push({ year: s.worldYear, age: p.age, text: "Retired" });
      L(s, p, "milestone", "You retired. The alarm clock is now a stranger.");
      break;
    }
    case "learn": {
      const lang = opt ?? LANGS[Object.keys(LANGS)[0]].id;
      const name = LANGS[lang]?.name ?? lang;
      const before = p.languages[lang] ?? 0;
      const gain = 10 + (p.smarts > 70 ? 4 : 0) + (p.age < 18 ? 4 : 0);
      const after = clamp(before + gain, 0, 98);
      p.languages[lang] = after;
      const convFlag = `lang-conv-${lang}`;
      const fluentFlag = `lang-fluent-${lang}`;
      if (before < 50 && after >= 50 && !p.flags.includes(convFlag)) {
        p.flags.push(convFlag);
        p.milestones.push({ year: s.worldYear, age: p.age, text: `Conversant in ${name}` });
        L(s, p, "milestone", `You're ${proficiencyLabel(50)} in ${name} now. Small talk, in another key, unlocked.`);
      } else if (before < 80 && after >= 80 && !p.flags.includes(fluentFlag)) {
        p.flags.push(fluentFlag);
        p.milestones.push({ year: s.worldYear, age: p.age, text: `Fluent in ${name}` });
        L(s, p, "milestone", `You're ${proficiencyLabel(80)} in ${name}. Dreams now arrive with subtitles occasionally.`);
      } else {
        L(s, p, "neutral", `You studied ${name}. The verb conjugations are still a personal enemy. (${proficiencyLabel(after)})`);
      }
      if (p.flags.includes("immigrant") && lang === country(p.countryId).languages[0] && after >= 50) {
        p.flags = p.flags.filter((f) => f !== "immigrant");
      }
      break;
    }
    case "emigrate": {
      const dest = opt ? country(opt) : undefined;
      if (!dest || dest.id === p.countryId) break;
      p.money -= nominal(12000, s.worldYear);
      const move = [p, s.chars[p.partnerId ?? ""], ...p.childrenIds.map((i) => s.chars[i])].filter((x): x is Char => !!x && x.alive);
      for (const m of move) {
        m.countryId = dest.id;
        m.city = pick(dest.cities);
        if (!m.flags.includes("immigrant")) m.flags.push("immigrant");
        m.arrivedYear = s.worldYear;
      }
      p.flags.push(`emig-${s.worldYear}`);
      p.happiness = clamp(p.happiness - 8);
      p.milestones.push({ year: s.worldYear, age: p.age, text: `Moved to ${dest.name}` });
      L(s, p, "family", `You moved to ${p.city}, ${dest.name}. The food is different. The light is different. The rules are different.`);
      if ((p.languages[dest.languages[0]] ?? 0) < 50) {
        L(s, p, "bad", `Nobody at home speaks ${LANGS[dest.languages[0]].name}. Expect a rough first winter — and a fast first education.`);
      }
      toast(s, `Welcome to ${dest.name}.`);
      break;
    }
    default:
      break;
  }
  // Whole-dollar wallets that can never go negative, even if an action cost
  // was set without a matching actionLock entry.
  if (p.money !== moneyBefore) p.money = Math.max(0, Math.round(p.money));
  markUsed(p, id === "apply" ? "jobhunt" : id);
}

// Re-exported for UI components that want the era-adjusted house down payment.
export function houseDownPayment(p: Char): number {
  const year = p.birthYear + p.age;
  return Math.round(nominal(160000 * country(p.countryId).costIndex, year) * 0.3);
}

export { eraFactor };
