import type { Char, FameCareer, FamePathway, GameState, ThemePreference } from "./types";
import { clamp, random } from "./rng";
import { country, fmtMoney } from "./world";
import { nominal } from "./economy";
import { developSkill } from "./skills";

export type FameAction = "audition" | "portfolio" | "casting" | "record" | "perform" | "tour" | "brand";
const ACTION_KEY = "fame-action";
const AGENCIES = ["Northstar Artists", "Citrine Talent", "Daybreak Management", "Open Door Agency"];

export function isGoldTheme(c: Char, preference: ThemePreference = "auto"): boolean {
  if (preference === "gold") return true;
  if (preference === "classic") return false;
  return (c.fame ?? 0) >= 35;
}

function newCareer(pathway: FamePathway): FameCareer {
  return { pathway, level: 1, experience: 0, projects: 0, awards: [], annualIncome: 0, portfolio: pathway === "modelling" ? 1 : 0, releases: 0 };
}

export function fameActionLock(s: GameState, action: FameAction): string | null {
  const c = s.chars[s.currentId];
  if (!c || !c.alive || s.over) return "This action is unavailable.";
  if (c.usedActions.includes(ACTION_KEY)) return "You have already taken a fame-career action this year.";
  const career = c.fameCareer;
  if (action === "audition") {
    if (c.age < 16) return "Acting auditions start at age 16.";
    if (career && career.pathway !== "acting") return "You are pursuing a different entertainment pathway.";
  }
  if (action === "portfolio") {
    if (c.age < 14) return "Modelling portfolios are available from age 14.";
    if (career && career.pathway !== "modelling") return "You are pursuing a different entertainment pathway.";
    if (c.money < nominal(500, s.worldYear)) return `A portfolio costs ${fmtMoney(nominal(500, s.worldYear), c.countryId)}.`;
  }
  if (action === "casting") {
    if (career?.pathway !== "modelling" || (career.portfolio ?? 0) < 1) return "Build a portfolio before entering castings.";
  }
  if (action === "record") {
    if (c.age < 13) return "Recording releases are available from age 13.";
    if (career && career.pathway !== "music") return "You are pursuing a different entertainment pathway.";
    if ((c.skills.singing ?? 0) + (c.skills.instruments ?? 0) < 15) return "Build singing or instrument skills to 15 first.";
  }
  if (action === "perform") {
    if (career?.pathway !== "music") return "Start a music pathway first.";
  }
  if (action === "tour") {
    if (career?.pathway !== "music" || career.level < 2 || (career.releases ?? 0) < 1) return "Build a music career and release a track before touring.";
    if (c.money < nominal(1800 * country(c.countryId).wageIndex, s.worldYear)) return "You need more savings to cover tour costs.";
  }
  if (action === "brand" && (c.fame ?? 0) < 25) return "Brands usually approach people with more public recognition.";
  return null;
}

function addLog(s: GameState, c: Char, text: string, kind: "career" | "good" | "bad" | "money" = "career") {
  s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind, text });
  s.log = s.log.slice(-500);
}

function successCareer(c: Char, pathway: FamePathway): FameCareer {
  if (!c.fameCareer) c.fameCareer = newCareer(pathway);
  c.fameCareer.experience += 1;
  c.fameCareer.projects += 1;
  c.fameCareer.lastProjectYear = c.birthYear + c.age;
  c.fameCareer.level = Math.min(5, 1 + Math.floor(c.fameCareer.experience / 3));
  c.fameCareer.annualIncome = Math.round((c.fameCareer.annualIncome ?? 0) * 0.65);
  return c.fameCareer;
}

export function performFameAction(s: GameState, action: FameAction): boolean {
  if (fameActionLock(s, action)) return false;
  const c = s.chars[s.currentId];
  if (!c) return false;
  c.usedActions.push(ACTION_KEY);
  const cityRate = country(c.countryId).wageIndex;
  let message = "";
  switch (action) {
    case "audition": {
      const score = (c.skills.acting ?? 0) * 0.55 + (c.skills.communication ?? 0) * 0.2 + c.looks * 0.18 + (c.reputation ?? 50) * 0.07;
      const chance = clamp(score / 135, 0.12, 0.76);
      if (random() < chance) {
        const career = successCareer(c, "acting");
        career.agency ??= career.level >= 2 ? AGENCIES[Math.floor(random() * AGENCIES.length)] : undefined;
        const pay = nominal((2500 + career.level * 1700) * cityRate, s.worldYear);
        c.money += pay;
        career.annualIncome = Math.max(career.annualIncome ?? 0, Math.round(pay * 0.6));
        c.reputation = clamp((c.reputation ?? 50) + 2);
        c.fame = clamp((c.fame ?? 0) + 4 + career.level);
        if (career.projects >= 5 && !career.awards.includes("Screen Performance Award")) career.awards.push("Screen Performance Award");
        message = `An audition landed you an acting role, paying ${fmtMoney(pay, c.countryId)}.`;
      } else {
        developSkill(c, "acting", 0.35, s.worldYear);
        c.reputation = clamp((c.reputation ?? 50) - 0.4);
        message = "The audition did not lead to a role. You gained experience and kept your name in circulation.";
      }
      break;
    }
    case "portfolio": {
      const price = nominal(500, s.worldYear);
      c.money -= price;
      if (!c.fameCareer) c.fameCareer = newCareer("modelling");
      c.fameCareer.portfolio = (c.fameCareer.portfolio ?? 0) + 1;
      c.fameCareer.agency ??= (c.skills.photography ?? 0) >= 25 && c.looks >= 65 ? AGENCIES[Math.floor(random() * AGENCIES.length)] : undefined;
      developSkill(c, "photography", 0.25, s.worldYear);
      message = `You invested ${fmtMoney(price, c.countryId)} in a modelling portfolio. It is ready for castings.`;
      break;
    }
    case "casting": {
      const score = c.looks * 0.55 + (c.skills.photography ?? 0) * 0.3 + (c.skills.communication ?? 0) * 0.15;
      const chance = clamp(score / 130, 0.12, 0.78);
      if (random() < chance) {
        const career = successCareer(c, "modelling");
        const pay = nominal((1800 + career.level * 1500) * cityRate, s.worldYear);
        c.money += pay;
        career.annualIncome = Math.max(career.annualIncome ?? 0, Math.round(pay * 0.5));
        c.reputation = clamp((c.reputation ?? 50) + 1.5);
        c.fame = clamp((c.fame ?? 0) + 3 + career.level);
        message = `A casting booked a ${career.level >= 3 ? "fashion campaign" : "catalogue campaign"}, paying ${fmtMoney(pay, c.countryId)}.`;
      } else {
        developSkill(c, "photography", 0.3, s.worldYear);
        message = "The casting passed this time. You refined your portfolio and kept looking.";
      }
      break;
    }
    case "record": {
      const score = ((c.skills.singing ?? 0) * 0.55 + (c.skills.instruments ?? 0) * 0.45) * 0.75 + (c.reputation ?? 50) * 0.25;
      const chance = clamp(score / 145, 0.1, 0.7);
      if (random() < chance) {
        const career = successCareer(c, "music");
        career.releases = (career.releases ?? 0) + 1;
        const royalties = nominal((1000 + career.releases * 800) * cityRate, s.worldYear);
        c.money += royalties;
        career.annualIncome = Math.max(career.annualIncome ?? 0, Math.round(royalties * 0.7));
        c.fame = clamp((c.fame ?? 0) + 3 + Math.min(5, career.level));
        c.reputation = clamp((c.reputation ?? 50) + 1.5);
        if (career.releases >= 5 && !career.awards.includes("Independent Music Award")) career.awards.push("Independent Music Award");
        message = `You recorded and released a track. It earned ${fmtMoney(royalties, c.countryId)} in early royalties.`;
      } else {
        developSkill(c, "singing", 0.3, s.worldYear);
        message = "The recording session produced a demo, not a release. You learned from the session.";
      }
      break;
    }
    case "perform": {
      const career = c.fameCareer!;
      const performance = (c.skills.singing ?? 0) * 0.65 + (c.skills.instruments ?? 0) * 0.35 + (c.reputation ?? 50) * 0.1;
      if (random() * 100 < performance) {
        const pay = nominal((800 + career.level * 900) * cityRate, s.worldYear);
        c.money += pay;
        career.annualIncome = Math.max(career.annualIncome ?? 0, Math.round(pay * 0.45));
        career.experience++;
        career.level = Math.min(5, 1 + Math.floor(career.experience / 3));
        career.lastProjectYear = s.worldYear;
        c.fame = clamp((c.fame ?? 0) + 1.5);
        c.reputation = clamp((c.reputation ?? 50) + 0.8);
        message = `The performance went well and paid ${fmtMoney(pay, c.countryId)}.`;
      } else {
        c.happiness = clamp(c.happiness - 1);
        message = "The performance was a quiet one. You kept the room, if not the headlines.";
      }
      break;
    }
    case "tour": {
      const career = c.fameCareer!;
      const expense = nominal(1800 * cityRate, s.worldYear);
      if (c.money < expense) return false;
      c.money -= expense;
      const gross = nominal((4000 + career.level * 3500 + c.fame! * 100) * cityRate, s.worldYear);
      const chance = clamp(((c.skills.singing ?? 0) + (c.skills.instruments ?? 0)) / 240 + (c.fame ?? 0) / 250 + (c.reputation ?? 50) / 500, 0.12, 0.82);
      if (random() < chance) {
        const profit = Math.round(gross * (0.35 + random() * 0.65) - expense);
        c.money += profit;
        career.annualIncome = Math.max(career.annualIncome ?? 0, Math.round(Math.max(0, profit) * 0.5));
        career.experience += 1;
        career.level = Math.min(5, 1 + Math.floor(career.experience / 3));
        career.lastProjectYear = s.worldYear;
        c.fame = clamp((c.fame ?? 0) + 4);
        message = `Your tour connected with audiences and returned ${fmtMoney(profit, c.countryId)} after expenses.`;
      } else {
        c.money -= expense;
        c.fame = clamp((c.fame ?? 0) - 1);
        c.reputation = clamp((c.reputation ?? 50) - 1);
        message = `The tour drew modest crowds and lost ${fmtMoney(expense, c.countryId)} after travel expenses.`;
      }
      break;
    }
    case "brand": {
      const campaign = nominal(1500 + (c.fame ?? 0) * 180, s.worldYear);
      c.money += campaign;
      c.fame = clamp((c.fame ?? 0) + 1);
      c.reputation = clamp((c.reputation ?? 50) + (random() < 0.75 ? 1 : -2));
      if (c.fameCareer) c.fameCareer.annualIncome = Math.max(c.fameCareer.annualIncome ?? 0, Math.round(campaign * 0.5));
      message = `A brand partnership paid ${fmtMoney(campaign, c.countryId)}. Public response affected your reputation.`;
      break;
    }
  }
  addLog(s, c, message, /did not|passed|quiet|demo|lost|modest crowds/i.test(message) ? "bad" : "career");
  s.toast = { id: s.seq++, text: message.split(".")[0] };
  return true;
}

function createNpcCareer(c: Char): boolean {
  if (c.age < 18 || c.fameCareer) return false;
  const acting = c.skills.acting ?? 0;
  const music = (c.skills.singing ?? 0) + (c.skills.instruments ?? 0);
  const model = c.looks + (c.skills.photography ?? 0);
  if (acting >= 28 && random() < 0.025) c.fameCareer = newCareer("acting");
  else if (music >= 45 && random() < 0.035) c.fameCareer = newCareer("music");
  else if (model >= 90 && random() < 0.025) c.fameCareer = newCareer("modelling");
  return !!c.fameCareer;
}

export function advanceFame(s: GameState, c: Char, npc = false): void {
  if (!c.alive) return;
  createNpcCareer(c);
  const career = c.fameCareer;
  const activeWork = !!career && (career.lastProjectYear ?? -Infinity) >= s.worldYear - 1;
  if (career) {
    career.annualIncome = Math.round((career.annualIncome ?? 0) * (career.pathway === "music" && (career.releases ?? 0) > 0 ? 0.9 : 0.7));
    if (npc && random() < 0.34) {
      const growth = career.pathway === "acting" ? c.skills.acting ?? 0 : career.pathway === "music" ? (c.skills.singing ?? 0) + (c.skills.instruments ?? 0) : c.looks + (c.skills.photography ?? 0);
      if (growth > 30 && random() < 0.25) {
        career.projects++;
        career.experience++;
        career.level = Math.min(5, 1 + Math.floor(career.experience / 3));
        career.lastProjectYear = s.worldYear;
        c.fame = clamp((c.fame ?? 0) + 1.2);
        c.reputation = clamp((c.reputation ?? 50) + 0.5);
        career.annualIncome = Math.max(career.annualIncome ?? 0, nominal((2000 + career.level * 1200) * country(c.countryId).wageIndex, s.worldYear));
      }
    }
  }
  const fame = c.fame ?? 0;
  if (fame > 0) c.fame = clamp(fame - (activeWork ? 0.3 : fame > 20 ? 1.4 : 0.45));
  if (fame >= 60) c.happiness = clamp(c.happiness - 0.5);
  if (fame >= 40 && random() < fame / 5000) {
    c.fame = clamp((c.fame ?? 0) + 2);
    c.reputation = clamp((c.reputation ?? 50) - 7);
    c.happiness = clamp(c.happiness - 3);
    if (!npc) addLog(s, c, "A media scandal drew attention but damaged your public reputation.", "bad");
  }
}
