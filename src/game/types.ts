import type { NameUsage } from "./names";

export type Gender = "male" | "female";
export type EducationLevel = "none" | "primary" | "secondary" | "university";
export type Stage = "child" | "teen" | "adult" | "senior";
export type NameOrder = "first-last" | "last-first";

export type LogKind =
  | "birth"
  | "good"
  | "bad"
  | "neutral"
  | "event"
  | "money"
  | "family"
  | "career"
  | "world"
  | "milestone"
  | "choice";

export interface CountryDef {
  id: string;
  name: string;
  code: string;
  colors: [string, string];
  languages: string[]; // first = primary/official language
  currency: { symbol: string; rate: number };
  wageIndex: number;
  costIndex: number;
  uniCost: number; // modern USD per year
  eduQuality: number;
  safety: number;
  culture: string; // V1 coarse culture key (kept for compatibility)
  /** V2 cultural/naming groups available inside this country. */
  groups: string[];
  nameOrder: NameOrder;
  /** Country-specific education pathway. */
  schoolStart: number;
  secondaryStart: number;
  examAge: number;
  uniYears: number;
  retireAge: number;
  cities: string[];
  blurb: string;
}

export interface LanguageDef {
  id: string;
  name: string;
}

export interface TraitDef {
  id: string;
  name: string;
  desc: string;
  color: string;
  social?: number;
  career?: number;
  health?: number;
  charm?: number;
}

export interface JobDef {
  id: string;
  title: string;
  minAge: number;
  edu: "none" | "secondary" | "university";
  salary: number; // modern (2023-ish) USD base
  smartsReq: number;
  unstable?: boolean;
  publicSector?: boolean;
  trade?: boolean;
  majors?: string[];
  desc: string;
}

export interface Job {
  jobId: string;
  seniority: number; // 0..3
  salary: number; // nominal USD for the current world year
  years: number;
  employer: string;
}

export interface Loan {
  id: string;
  kind: "student" | "mortgage" | "personal";
  principal: number;
  balance: number;
  rate: number; // annual interest, e.g. 0.05
  yearTaken: number;
}

export interface UniInfo {
  year: number; // 1..N
  major: string;
  gpa: number; // 0..100
}

export interface SportCareer {
  sportId: string;
  level: "school" | "amateur" | "professional" | "retired";
  years: number;
  experience: number;
  salary: number;
  wins: number;
  losses: number;
  competitions: number;
  lastCompetitionYear?: number;
  awards: string[];
  achievements: string[];
  injuryUntil?: number;
  injury?: string;
  sponsorshipIncome?: number;
}

export type FamePathway = "acting" | "modelling" | "music";
export interface FameCareer {
  pathway: FamePathway;
  level: number;
  experience: number;
  projects: number;
  lastProjectYear?: number;
  agency?: string;
  portfolio?: number;
  releases?: number;
  annualIncome?: number;
  awards: string[];
}

export type ThemePreference = "auto" | "classic" | "gold";

export interface Char {
  id: string;
  firstName: string;
  lastName: string;
  /** Cultural naming group id (see name-data.ts); not an ethnicity or nationality. */
  group?: string;
  /** Current residence; retained as the legacy country field. */
  countryId: string;
  /** Birthplace remains fixed when a character migrates. */
  birthCountryId?: string;
  birthCity?: string;
  /** Cultural group connections inherited from family; intentionally not inferred as ethnicity. */
  culturalHeritage?: string[];
  /** Explicit ethnicity labels only when supplied; never inferred from a name or language. */
  ethnicities?: string[];
  /** Legacy single citizenship plus the full set of citizenships. */
  citizenships?: string[];
  /** Household/community exposure is tracked separately from language proficiency. */
  languageExposure?: Record<string, number>;
  gender: Gender;
  birthYear: number;
  age: number;
  alive: boolean;
  deathYear?: number;
  causeOfDeath?: string;
  city: string;
  isPlayer: boolean;
  generation: number;
  health: number;
  happiness: number;
  smarts: number;
  looks: number;
  traits: string[];
  /** Personal cash + savings. Household wealth lives with the parents. */
  money: number;
  /** Kept in sync with the sum of loan balances (V1 compatibility field). */
  debts: number;
  loans: Loan[];
  pension: number;
  house?: { value: number; city: string };
  car?: { name: string; value: number };
  motherId?: string;
  fatherId?: string;
  partnerId?: string;
  partnerSince?: number;
  partnerValue?: number;
  partnerHistory: string[];
  childrenIds: string[];
  friends: { id: string; value: number }[];
  education: EducationLevel;
  uni: UniInfo | null;
  examScore?: number;
  /** Major suggested at the crossroads — pinned so text and choices agree. */
  plannedMajor?: string;
  job: Job | null;
  retired: boolean;
  languages: Record<string, number>;
  skills: Record<string, number>;
  skillLastPractice?: Record<string, number>;
  /** Per-skill learning multipliers, rolled only when a character begins that skill. */
  aptitudes?: Record<string, number>;
  sportsCareer?: SportCareer;
  fame?: number;
  reputation?: number;
  fameCareer?: FameCareer;
  flags: string[];
  milestones: { year: number; age: number; text: string }[];
  usedActions: string[];
  eventCooldowns: Record<string, number>;
  /** 0 disadvantaged · 1 working-class · 2 comfortable · 3 wealthy · 4 elite. */
  wealthTier?: number;
  /** Immigration bookkeeping: when this person arrived in their current country. */
  arrivedYear?: number;
  citizenOf?: string; // country id of citizenship
}

export interface LogEntry {
  id: number;
  year: number;
  age: number;
  text: string;
  kind: LogKind;
}

export interface ChoiceDef {
  id: string;
  label: string;
  hint?: string;
}

export interface PendingChoice {
  eventId: string;
  title: string;
  text: string;
  choices: ChoiceDef[];
}

export interface Toast {
  id: number;
  text: string;
}

export interface GameState {
  version: number;
  seed?: number;
  startYear: number;
  worldYear: number;
  currentId: string;
  generation: number;
  chars: Record<string, Char>;
  log: LogEntry[];
  pending: PendingChoice[];
  seq: number;
  livesLived: number;
  over: boolean;
  overText?: string;
  toast?: Toast | null;
  themePreference?: ThemePreference;
  nameUsage: NameUsage;
  /** Save slot this life is bound to (set by the persistence layer). */
  saveSlotId?: string;
}

export interface EventCtx {
  s: GameState;
  p: Char;
  rnd: () => number;
  chance: (p: number) => boolean;
  pick: <T>(arr: readonly T[]) => T;
  range: (a: number, b: number) => number;
  log: (kind: LogKind, text: string) => void;
  toast: (text: string) => void;
  other: (id?: string) => Char | undefined;
}

export interface LifeEvent {
  id: string;
  title: string;
  weight: number;
  scripted?: boolean; // only pushed by the simulation, never rolled randomly
  minAge: number;
  maxAge: number;
  /** Era gating: smartphones, social media, crypto, etc. */
  minYear?: number;
  maxYear?: number;
  once?: boolean;
  cool?: number; // years cooldown after firing
  when?: (e: EventCtx) => boolean;
  text: (e: EventCtx) => string;
  choices?: (e: EventCtx) => ChoiceDef[];
  /** Optional data-driven proficiency outcomes for event choices. */
  skillEffects?: { skillId: string; choice?: string; effort?: number }[];
  run: (e: EventCtx, choice?: string) => void;
}

export interface SiblingSpec {
  firstName: string;
  gender: Gender;
  age: number;
}

export interface ParentSpec {
  firstName: string;
  age: number;
  alive: boolean;
  /** Explicit optional self/family description; never inferred from cultural group. */
  ethnicity?: string;
  /** Family origin/birth country; independent of residence and citizenship. */
  countryId?: string;
  /** Citizenship(s) can differ from family origin; not inferred from cultural group. */
  citizenships?: string[];
  culturalGroupId?: string;
}

export interface CustomSpec {
  firstName: string;
  surname: string; // empty string => generated
  gender: Gender;
  countryId: string;
  group?: string;
  /** Optional explicit ethnicity entry; not derived from group or nationality. */
  ethnicity?: string;
  city: string; // empty string => random
  birthYear?: number; // empty/undefined => random within era limits
  traits: string[];
  /** 0 disadvantaged · 1 working-class · 2 comfortable · 3 wealthy · 4 elite. */
  wealthTier: number;
  parentStatus: "together" | "apart";
  mother?: ParentSpec;
  father?: ParentSpec;
  siblings: SiblingSpec[];
  designFamily: boolean;
}

/** Persistence envelope used by export/import. */
export interface SaveEnvelope {
  app: "delulu-life";
  schema: number;
  exportedAt: number;
  state: GameState;
}

export interface SaveMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  characterName: string;
  age: number;
  year: number;
  generation: number;
  alive: boolean;
  countryId: string;
}

export interface SaveSlot extends SaveMeta {
  state: GameState;
}
