export type Gender = "male" | "female";
export type EducationLevel = "none" | "primary" | "secondary" | "university";
export type Stage = "child" | "teen" | "adult" | "senior";

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
  languages: string[]; // first = native
  currency: { symbol: string; rate: number };
  wageIndex: number;
  costIndex: number;
  uniCost: number; // USD per year
  eduQuality: number;
  safety: number;
  culture: string;
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
  salary: number; // USD base
  smartsReq: number;
  unstable?: boolean;
  majors?: string[];
  desc: string;
}

export interface Job {
  jobId: string;
  seniority: number; // 0..3
  salary: number;
  years: number;
  employer: string;
}

export interface UniInfo {
  year: number; // 1..4
  major: string;
  gpa: number; // 0..100
}

export interface Char {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthYear: number;
  age: number;
  alive: boolean;
  deathYear?: number;
  causeOfDeath?: string;
  countryId: string;
  city: string;
  isPlayer: boolean;
  generation: number;
  health: number;
  happiness: number;
  smarts: number;
  looks: number;
  traits: string[];
  money: number;
  debts: number;
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
  job: Job | null;
  retired: boolean;
  languages: Record<string, number>;
  skills: Record<string, number>;
  flags: string[];
  milestones: { year: number; age: number; text: string }[];
  usedActions: string[];
  eventCooldowns: Record<string, number>;
  wealthTier?: number; // 0 poor · 1 comfortable · 2 well-off · 3 wealthy
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
  once?: boolean;
  cool?: number; // years cooldown after firing
  when?: (e: EventCtx) => boolean;
  text: (e: EventCtx) => string;
  choices?: (e: EventCtx) => ChoiceDef[];
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
}

export interface CustomSpec {
  firstName: string;
  gender: Gender;
  countryId: string;
  traits: string[];
  wealthTier: number;
  parentStatus: "together" | "apart";
  mother?: ParentSpec;
  father?: ParentSpec;
  siblings: SiblingSpec[];
}
