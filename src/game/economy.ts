/**
 * Delulu Life V2 — economy.
 *
 * Internal scale: every JobDef salary and every "modern" price is expressed
 * in circa-2023 US dollars. Transactions in historical years are scaled by
 * eraFactor() so a 1955 salary AND a 1955 rent both feel 1955, while real
 * purchasing power stays internally consistent across currencies/eras.
 */
import type { Char, GameState, JobDef, Loan } from "./types";
import { country } from "./world";
import { jobSalary } from "./content";
import { clamp, ri } from "./rng";
import { eraFactor, nominal } from "./era";

export { eraFactor, nominal, hasTech, TECH_ERA } from "./era";

export const LOAN_RATES = { student: 0.045, mortgage: 0.055, personal: 0.09 } as const;

export function totalDebt(c: Char): number {
  return c.loans.reduce((sum, l) => sum + l.balance, 0);
}

export function syncDebts(c: Char): void {
  c.debts = Math.round(totalDebt(c));
}

export function takeLoan(c: Char, kind: Loan["kind"], principal: number, year: number): Loan {
  const loan: Loan = {
    id: `ln${c.id}-${year}-${Math.round(principal)}-${c.loans.length}`,
    kind,
    principal: Math.round(principal),
    balance: Math.round(principal),
    rate: LOAN_RATES[kind],
    yearTaken: year,
  };
  c.loans.push(loan);
  syncDebts(c);
  return loan;
}

/** Compound every outstanding loan once per year. */
export function accrueLoans(c: Char): void {
  if (c.loans.length === 0) return;
  for (const l of c.loans) l.balance = Math.round(l.balance * (1 + l.rate));
  syncDebts(c);
}

/** Put up to `budget` toward loans, priciest first. Returns amount actually paid. */
export function repayLoans(c: Char, budget: number): number {
  if (budget <= 0 || c.loans.length === 0) return 0;
  let remaining = budget;
  const active = c.loans.filter((l) => l.balance > 0).sort((a, b) => b.rate - a.rate);
  for (const l of active) {
    if (remaining <= 0) break;
    const pay = Math.min(l.balance, remaining);
    l.balance -= pay;
    remaining -= pay;
  }
  c.loans = c.loans.filter((l) => l.balance > 0);
  syncDebts(c);
  return budget - remaining;
}

/** Modern-USD allowance by household tier (0..4), then age-scaled. */
const ALLOWANCE_BASE = [80, 180, 350, 700, 1500];

export function allowanceFor(c: Char, year: number): number {
  const tier = clamp(c.wealthTier ?? 1, 0, 4);
  const ageMult = c.age < 5 ? 0.35 : c.age < 10 ? 0.55 : c.age < 15 ? 1 : 1.6;
  return Math.round(ALLOWANCE_BASE[tier] * ageMult * eraFactor(year));
}

/**
 * Personal annual living cost (modern USD before era scaling).
 * Children cost their parents nothing personally; household costs are
 * charged to the adults via chargeHousehold().
 */
export function livingCostModern(c: Char): number {
  const cty = country(c.countryId);
  if (c.age < 18 && !c.job && !c.uni) return 0;
  let base = 12500;
  if (c.uni) base *= 0.65; // student housing
  else if (c.retired) base *= 0.75;
  else if (c.age < 18 && c.job) base *= 0.18; // room and board at home
  const dependents = Math.min(c.childrenIds.length, 5);
  let cost = base * cty.costIndex * (1 + dependents * 0.22);
  if (c.car) cost += 1200;
  if (c.house) cost *= 0.82; // mortgage/maintenance cheaper than rent long-term
  return Math.round(cost);
}

export function livingCost(c: Char, year: number): number {
  return nominal(livingCostModern(c), year);
}

/** Annual cost of raising one dependent child, charged to the household. */
export function childCostModern(c: Char): number {
  return Math.round(3200 * country(c.countryId).costIndex * (1 + (c.wealthTier ?? 1) * 0.12));
}

/**
 * Charge the household that supports a dependent player/NPC.
 * Returns the nominal amount paid (0 when nobody supports them).
 */
export function chargeHousehold(s: GameState, dependent: Char): number {
  if (dependent.age >= 18 || dependent.job || dependent.uni) return 0;
  const parents = [dependent.motherId, dependent.fatherId]
    .map((id) => (id ? s.chars[id] : undefined))
    .filter((x): x is Char => !!x && x.alive && x.countryId === dependent.countryId);
  if (parents.length === 0) return 0;
  const year = s.worldYear;
  const kids = parents[0].childrenIds.map((id) => s.chars[id]).filter((k) => k && k.alive && k.age < 18).length;
  const adultCost = parents.reduce((sum, par) => sum + livingCostModern(par), 0);
  const household = adultCost + Math.max(1, kids) * childCostModern(dependent);
  const share = Math.round(nominal(household / parents.length, year));
  for (const par of parents) {
    const paid = Math.min(par.money, share);
    par.money -= paid; // never below zero; the rest is absorbed quietly
  }
  return share;
}

/** A plain-English money classification, evaluated in modern-USD terms. */
export function financialStatus(c: Char, year: number): string {
  const modernNet = netWorth(c) / eraFactor(year);
  if (modernNet < 500) return "skint";
  if (modernNet < 8000) return "getting by";
  if (modernNet < 45000) return "comfortable";
  if (modernNet < 180000) return "affluent";
  return "seriously wealthy";
}

export function netWorth(c: Char): number {
  return c.money - totalDebt(c) + (c.house?.value ?? 0) + (c.car?.value ?? 0);
}

/** Wealth tier descriptions used by Custom Life. */
export const TIER_LABELS = [
  "Disadvantaged",
  "Working-class",
  "Comfortable",
  "Wealthy",
  "Elite / old money",
];

export const TIER_BLURBS = [
  "Tight budget, loud kitchen, generous table. Hand-me-downs with stories.",
  "The bills get paid. One holiday a year if everything behaves.",
  "Two cars eventually, a savings account that says encouraging things.",
  "Private schools, lake houses, a family crest nobody asked about.",
  "The family name is on the bank. The bank is, quietly, nervous.",
];

/**
 * Tuition for one university year. Returns how it was covered and books
 * any shortfall as a student loan rather than an unbounded debt spiral.
 */
export function payTuition(s: GameState, c: Char): { paid: number; borrowed: number; family: number } {
  const cty = country(c.countryId);
  const sticker = nominal(cty.uniCost, s.worldYear);
  // Merit support based on the exam result.
  const exam = c.examScore ?? 0;
  const scholarship = exam >= 90 ? 1 : exam >= 80 ? 0.5 : 0;
  let owed = Math.round(sticker * (1 - scholarship));
  let paid = Math.min(c.money, owed);
  c.money -= paid;
  owed -= paid;
  // Family support for younger students from comfortable-or-better homes.
  let family = 0;
  if (owed > 0 && c.age <= 22 && (c.wealthTier ?? 1) >= 2) {
    const parents = [c.motherId, c.fatherId].map((id) => (id ? s.chars[id] : undefined)).filter((x): x is Char => !!x && x.alive);
    const pot = parents.reduce((sum, par) => sum + par.money * 0.25, 0);
    family = Math.min(owed, Math.round(pot));
    for (const par of parents) par.money -= Math.round(family / parents.length);
    owed -= family;
  }
  let borrowed = 0;
  if (owed > 0) {
    takeLoan(c, "student", owed, s.worldYear);
    borrowed = owed;
  }
  return { paid, borrowed, family };
}

/** Era-jittered salary adjustment when the world year moves on. */
export function salaryInflationDrift(year: number, modernSalary: number): number {
  const jitter = 1 + (ri(-2, 2) / 100);
  return Math.round(modernSalary * eraFactor(year) * jitter);
}

/** The nominal, year-correct amount actually paid for this job. */
export function nominalSalary(c: Char, def: JobDef, seniority: number, year: number): number {
  return nominal(jobSalary(def, c, seniority), year);
}
