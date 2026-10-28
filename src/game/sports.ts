import type { Char, GameState, SportCareer } from "./types";
import { country, fmtMoney } from "./world";
import { nominal } from "./economy";
import { clamp, pick, random } from "./rng";
import { developSkill } from "./skills";

export interface SportDef {
  id: string;
  name: string;
  focusSkill: string;
  supportSkill: string;
  schoolAge: [number, number];
  amateurAge: number;
  proAge: [number, number];
  proSkill: number;
  proSalary: number;
  bonus: number;
  injuryRisk: number;
  seasonTarget: number;
  individual: boolean;
}

export const SPORTS: SportDef[] = [
  { id: "football", name: "Football", focusSkill: "football", supportSkill: "fitness", schoolAge: [8, 18], amateurAge: 16, proAge: [18, 38], proSkill: 62, proSalary: 42000, bonus: 12000, injuryRisk: 0.09, seasonTarget: 68, individual: false },
  { id: "basketball", name: "Basketball", focusSkill: "basketball", supportSkill: "fitness", schoolAge: [8, 18], amateurAge: 16, proAge: [18, 38], proSkill: 64, proSalary: 48000, bonus: 15000, injuryRisk: 0.1, seasonTarget: 70, individual: false },
  { id: "athletics", name: "Athletics", focusSkill: "athletics", supportSkill: "fitness", schoolAge: [8, 18], amateurAge: 16, proAge: [18, 36], proSkill: 60, proSalary: 28000, bonus: 9000, injuryRisk: 0.06, seasonTarget: 66, individual: true },
  { id: "tennis", name: "Tennis", focusSkill: "tennis", supportSkill: "fitness", schoolAge: [8, 18], amateurAge: 16, proAge: [18, 38], proSkill: 66, proSalary: 36000, bonus: 22000, injuryRisk: 0.08, seasonTarget: 72, individual: true },
  { id: "swimming", name: "Swimming", focusSkill: "swimming", supportSkill: "fitness", schoolAge: [8, 18], amateurAge: 16, proAge: [18, 35], proSkill: 62, proSalary: 32000, bonus: 10000, injuryRisk: 0.05, seasonTarget: 67, individual: true },
  { id: "boxing", name: "Boxing", focusSkill: "boxing", supportSkill: "fitness", schoolAge: [12, 18], amateurAge: 16, proAge: [18, 40], proSkill: 68, proSalary: 52000, bonus: 28000, injuryRisk: 0.17, seasonTarget: 76, individual: true },
];

export const SPORT_BY_ID = Object.fromEntries(SPORTS.map((sport) => [sport.id, sport])) as Record<string, SportDef>;

export type SportAction = "school-team" | "amateur" | "tryout" | "train" | "compete" | "recover" | "retire";

function calculatePerformance(c: Char, sport: SportDef): number {
  const focus = c.skills[sport.focusSkill] ?? 0;
  const support = c.skills[sport.supportSkill] ?? 0;
  const agePenalty = c.age > 30 ? Math.max(0, c.age - 30) * (sport.individual ? 0.45 : 0.3) : 0;
  const injuryPenalty = c.sportsCareer?.injuryUntil && c.sportsCareer.injuryUntil >= c.birthYear + c.age ? 20 : 0;
  return focus * 0.5 + support * 0.2 + c.health * 0.1 + Math.min(15, (c.sportsCareer?.experience ?? 0) * 0.18) + random() * 50 - 25 - agePenalty - injuryPenalty;
}

function actionKey(): string { return "sport-action"; }

export function sportActionLock(s: GameState, sportId: string, action: SportAction): string | null {
  const c = s.chars[s.currentId];
  const sport = SPORT_BY_ID[sportId];
  if (!c || !sport || !c.alive || s.over) return "This sports action is unavailable.";
  if (c.usedActions.includes(actionKey())) return "You have already used a sports action this year.";
  const career = c.sportsCareer;
  if (["train", "compete", "recover", "retire"].includes(action) && career && career.sportId !== sport.id) return `Your active pathway is ${SPORT_BY_ID[career.sportId]?.name ?? "another sport"}.`;
  if (action === "school-team") {
    if (career && career.level !== "retired") return "You are already on a sports pathway.";
    if (c.age < sport.schoolAge[0] || c.age > sport.schoolAge[1]) return `School teams are for ages ${sport.schoolAge[0]}–${sport.schoolAge[1]}.`;
    if ((c.skills[sport.focusSkill] ?? 0) < 8) return `Practice ${sport.name} to level 8 first.`;
  }
  if (action === "amateur") {
    if (career && career.level !== "retired") return "You are already on a sports pathway.";
    if (c.age < sport.amateurAge || c.age > sport.proAge[1]) return `Amateur participation starts at age ${sport.amateurAge}.`;
    if ((c.skills[sport.focusSkill] ?? 0) < 18) return `Practice ${sport.name} to level 18 first.`;
  }
  if (action === "tryout") {
    if (career?.level === "professional") return "You already hold a professional contract.";
    if (career && career.level !== "amateur" && career.level !== "school" && career.level !== "retired") return "A different sport is already active.";
    if (c.age < sport.proAge[0] || c.age > sport.proAge[1]) return `Professional ${sport.name} opportunities are usually ages ${sport.proAge[0]}–${sport.proAge[1]}.`;
    if ((c.skills[sport.focusSkill] ?? 0) < sport.proSkill) return `Reach ${sport.proSkill} ${sport.name} proficiency to qualify.`;
    if (career?.sportId !== sport.id && career && career.level !== "retired") return "Retire from your current sport before switching.";
  }
  if (action === "train") {
    if (!career || career.level === "retired") return "Join a team or amateur club first.";
    if (career.injuryUntil && career.injuryUntil >= s.worldYear) return "Recover from your injury before training.";
  }
  if (action === "compete") {
    if (!career || career.level === "retired") return "Join a team or amateur club first.";
    if (career.injuryUntil && career.injuryUntil >= s.worldYear) return "Recover from your injury before competing.";
  }
  if (action === "recover" && (!career?.injuryUntil || career.injuryUntil < s.worldYear)) return "There is no active injury to recover from.";
  if (action === "retire" && (!career || career.level === "retired")) return "No active sports career to retire from.";
  return null;
}

function careerFor(s: GameState, sport: SportDef, level: SportCareer["level"], countryId: string): SportCareer {
  return {
    sportId: sport.id,
    level,
    years: 0,
    experience: 0,
    salary: level === "professional" ? nominal(sport.proSalary * country(countryId).wageIndex, s.worldYear) : 0,
    wins: 0,
    losses: 0,
    competitions: 0,
    awards: [],
    achievements: [],
    sponsorshipIncome: 0,
  };
}

function addAchievement(career: SportCareer, label: string) {
  if (!career.achievements.includes(label)) career.achievements.push(label);
}

function compete(s: GameState, c: Char, career: SportCareer, sport: SportDef, log: (text: string, kind?: "good" | "bad" | "career" | "money") => void, awardBonus = true): boolean {
  const score = calculatePerformance(c, sport);
  const won = score >= sport.seasonTarget;
  career.competitions++;
  career.experience += 2 + Math.floor(random() * 5);
  career.lastCompetitionYear = s.worldYear;
  if (won) {
    career.wins++;
    if (!career.achievements.includes("first-win")) {
      addAchievement(career, "first-win");
      log(`You won your first ${sport.name} competition.`, "good");
    } else {
      log(`You placed among the winners in ${sport.name}.`, "good");
    }
    if (career.competitions % 5 === 0) {
      const award = `${s.worldYear} ${sport.name} ${sport.individual ? "medal" : "championship"}`;
      if (!career.awards.includes(award)) career.awards.push(award);
      log(`You earned the ${award}.`, "career");
    }
    c.fame = clamp((c.fame ?? 0) + (career.level === "professional" ? 2.5 : 0.6));
    c.reputation = clamp((c.reputation ?? 50) + 1.5);
    if (career.level === "professional" && awardBonus) {
      const prize = nominal(sport.bonus * country(c.countryId).wageIndex, s.worldYear);
      c.money += prize;
      log(`The result brought a ${fmtMoney(prize, c.countryId)} competition bonus.`, "money");
    }
  } else {
    career.losses++;
    c.reputation = clamp((c.reputation ?? 50) + (score >= sport.seasonTarget - 8 ? 0.2 : -0.5));
    log(`You competed in ${sport.name}; this time the field was stronger. You gained experience.`, "career");
  }
  const chanceOfInjury = sport.injuryRisk * (1.2 - c.health / 250);
  if (random() < chanceOfInjury) {
    career.injury = sport.id === "boxing" ? "A training or bout injury" : "A sports injury";
    career.injuryUntil = s.worldYear + (sport.id === "boxing" ? 2 : 1);
    c.health = clamp(c.health - (sport.id === "boxing" ? 8 : 4));
    log(`${career.injury}; recovery is recommended before the next competition.`, "bad");
  }
  return won;
}

export function performSportAction(s: GameState, sportId: string, action: SportAction): boolean {
  if (sportActionLock(s, sportId, action)) return false;
  const c = s.chars[s.currentId];
  const sport = SPORT_BY_ID[sportId];
  if (!c || !sport) return false;
  const L = (text: string, kind: "good" | "bad" | "career" | "money" = "career") => s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind, text });
  const career = c.sportsCareer;
  switch (action) {
    case "school-team":
      c.sportsCareer = careerFor(s, sport, "school", c.countryId);
      L(`You joined the school ${sport.name} team. Practice and team selections are ahead.`, "good");
      break;
    case "amateur":
      c.sportsCareer = careerFor(s, sport, "amateur", c.countryId);
      L(`You joined an amateur ${sport.name} club. Competition experience now counts toward recruitment.`, "good");
      break;
    case "tryout": {
      const base = c.skills[sport.focusSkill] ?? 0;
      const chance = Math.min(0.78, 0.18 + base / 190 + (c.skills.fitness ?? 0) / 400 + (career?.experience ?? 0) / 500 + (c.reputation ?? 50) / 1000);
      if (random() < chance) {
        const next = careerFor(s, sport, "professional", c.countryId);
        next.experience = career?.experience ?? 0;
        next.achievements = [...(career?.achievements ?? [])];
        c.sportsCareer = next;
        c.fame = clamp((c.fame ?? 0) + 8);
        c.reputation = clamp((c.reputation ?? 50) + 2);
        L(`A ${sport.name} club offered you a professional contract at ${fmtMoney(next.salary, c.countryId)} a year.`, "good");
        if (c.fame! >= 35 && (c.reputation ?? 50) >= 50) next.sponsorshipIncome = nominal(5000 + c.fame! * 250, s.worldYear);
      } else {
        if (!career || career.sportId !== sport.id || career.level === "retired") c.sportsCareer = careerFor(s, sport, "amateur", c.countryId);
        L(`The ${sport.name} tryout did not bring a contract. Coaches suggested more experience and practice.`, "bad");
      }
      break;
    }
    case "train": {
      const active = c.sportsCareer;
      if (!active) return false;
      const result = developSkill(c, sport.focusSkill, 1.1, s.worldYear);
      developSkill(c, "fitness", 0.65, s.worldYear);
      active.experience++;
      c.health = clamp(c.health + 1);
      L(`You trained for ${sport.name}. ${sport.name} skill rose ${result.toFixed(1)} points.`, "good");
      break;
    }
    case "compete":
      if (!career) return false;
      compete(s, c, career, sport, L);
      break;
    case "recover":
      if (!career) return false;
      career.injury = undefined;
      career.injuryUntil = undefined;
      c.health = clamp(c.health + 6);
      L(`You completed a recovery session for ${sport.name}.`, "good");
      break;
    case "retire":
      if (!career) return false;
      career.level = "retired";
      career.salary = 0;
      career.sponsorshipIncome = 0;
      c.retired = false; // sport retirement does not mean retirement from work
      L(`You retired from ${sport.name}; the results and experience stay in your record.`, "career");
      break;
  }
  c.usedActions.push(actionKey());
  s.log = s.log.slice(-500);
  s.toast = { id: s.seq++, text: `${sport.name}: ${action === "tryout" ? "decision recorded" : "updated"}` };
  return true;
}

export function advanceSportCareer(s: GameState, c: Char, npc = false): void {
  let career = c.sportsCareer;
  if (!career || !c.alive) {
    if (npc && c.age >= 9 && c.age <= 18 && random() < 0.045) {
      const possible = SPORTS.filter((sport) => c.age >= sport.schoolAge[0] && c.age <= sport.schoolAge[1]);
      const sport = pick(possible);
      developSkill(c, sport.focusSkill, 0.6, s.worldYear);
      if ((c.skills[sport.focusSkill] ?? 0) >= 8 && !c.sportsCareer) c.sportsCareer = careerFor(s, sport, "school", c.countryId);
    }
    career = c.sportsCareer;
  }
  if (!career) return;
  const sport = SPORT_BY_ID[career.sportId];
  if (!sport || career.level === "retired") return;
  if (career.injuryUntil !== undefined && career.injuryUntil < s.worldYear) {
    career.injury = undefined;
    career.injuryUntil = undefined;
  }
  career.years++;
  if (career.injuryUntil !== undefined && career.injuryUntil >= s.worldYear) return;
  const seasonLog = (text: string, kind: "good" | "bad" | "career" | "money" = "career") => {
    if (!npc) s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind, text });
  };
  if (career.level === "professional") {
    career.salary = nominal(sport.proSalary * country(c.countryId).wageIndex * (1 + Math.min(0.5, career.experience / 200)), s.worldYear);
    if (!npc && career.lastCompetitionYear === s.worldYear) return;
    compete(s, c, career, sport, seasonLog, true);
    if (career.injuryUntil && career.injuryUntil >= s.worldYear) return;
    if ((c.fame ?? 0) >= 35 && (c.reputation ?? 50) >= 50) {
      career.sponsorshipIncome = nominal(5000 + (c.fame ?? 0) * 220, s.worldYear);
    }
    if (c.age > sport.proAge[1]) {
      career.level = "retired";
      career.salary = 0;
      career.sponsorshipIncome = 0;
    }
  } else {
    if (npc && career.level === "school" && c.age >= sport.amateurAge && (c.skills[sport.focusSkill] ?? 0) >= 18 && random() < 0.45) {
      career.level = "amateur";
    }
    if (npc && career.level === "amateur" && c.age >= sport.proAge[0] && c.age <= sport.proAge[1] && (c.skills[sport.focusSkill] ?? 0) >= sport.proSkill && random() < 0.12) {
      career.level = "professional";
      career.salary = nominal(sport.proSalary * country(c.countryId).wageIndex, s.worldYear);
      c.fame = clamp((c.fame ?? 0) + 5);
    }
    if (npc && career.level !== "professional") {
      compete(s, c, career, sport, seasonLog, false);
    }
  }
}
