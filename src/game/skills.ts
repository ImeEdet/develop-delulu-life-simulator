import type { Char, GameState } from "./types";
import { clamp, pick, random } from "./rng";

export type SkillCategory = "academic" | "creative" | "physical" | "professional" | "practical";
export interface SkillDef {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  minAge: number;
  baseGain: number;
  stat: "smarts" | "health" | "looks" | "happiness";
}

export const SKILLS: SkillDef[] = [
  { id: "mathematics", name: "Mathematics", category: "academic", description: "Patterns, numbers, and useful estimates.", minAge: 5, baseGain: 3.8, stat: "smarts" },
  { id: "science", name: "Science", category: "academic", description: "Observation, experiments, and evidence.", minAge: 5, baseGain: 3.6, stat: "smarts" },
  { id: "writing", name: "Writing", category: "academic", description: "Clear ideas on the page.", minAge: 5, baseGain: 3.8, stat: "smarts" },
  { id: "research", name: "Research", category: "academic", description: "Finding and evaluating reliable information.", minAge: 12, baseGain: 3.2, stat: "smarts" },
  { id: "singing", name: "Singing", category: "creative", description: "Pitch, breath, and musical expression.", minAge: 5, baseGain: 3.7, stat: "happiness" },
  { id: "acting", name: "Acting", category: "creative", description: "Performance, presence, and character work.", minAge: 8, baseGain: 3.3, stat: "looks" },
  { id: "dancing", name: "Dancing", category: "creative", description: "Rhythm, coordination, and movement.", minAge: 5, baseGain: 3.5, stat: "health" },
  { id: "instruments", name: "Musical Instruments", category: "creative", description: "Technique and musical fluency on an instrument.", minAge: 6, baseGain: 3.5, stat: "happiness" },
  { id: "painting", name: "Painting", category: "creative", description: "Visual composition and technique.", minAge: 6, baseGain: 3.4, stat: "looks" },
  { id: "photography", name: "Photography", category: "creative", description: "Framing, light, and visual storytelling.", minAge: 10, baseGain: 3.2, stat: "looks" },
  { id: "fitness", name: "Fitness", category: "physical", description: "Strength, conditioning, and recovery habits.", minAge: 5, baseGain: 3.4, stat: "health" },
  { id: "swimming", name: "Swimming", category: "physical", description: "Water confidence, form, and endurance.", minAge: 5, baseGain: 3.4, stat: "health" },
  { id: "football", name: "Football", category: "physical", description: "Ball control, tactics, and team play.", minAge: 6, baseGain: 3.2, stat: "health" },
  { id: "basketball", name: "Basketball", category: "physical", description: "Ball handling, court vision, and shooting.", minAge: 6, baseGain: 3.2, stat: "health" },
  { id: "athletics", name: "Athletics", category: "physical", description: "Speed, endurance, and event technique.", minAge: 6, baseGain: 3.3, stat: "health" },
  { id: "tennis", name: "Tennis", category: "physical", description: "Footwork, timing, and tactical rallies.", minAge: 6, baseGain: 3.2, stat: "health" },
  { id: "boxing", name: "Boxing", category: "physical", description: "Footwork, conditioning, and safe technique.", minAge: 12, baseGain: 3.0, stat: "health" },
  { id: "martial-arts", name: "Martial Arts", category: "physical", description: "Balance, discipline, and controlled technique.", minAge: 6, baseGain: 3.2, stat: "health" },
  { id: "communication", name: "Communication", category: "professional", description: "Listening and explaining ideas clearly.", minAge: 8, baseGain: 3.2, stat: "happiness" },
  { id: "leadership", name: "Leadership", category: "professional", description: "Helping a group coordinate and make decisions.", minAge: 12, baseGain: 2.8, stat: "happiness" },
  { id: "negotiation", name: "Negotiation", category: "professional", description: "Finding workable agreements.", minAge: 16, baseGain: 2.8, stat: "smarts" },
  { id: "business-management", name: "Business Management", category: "professional", description: "Planning, operations, and responsible decisions.", minAge: 16, baseGain: 2.7, stat: "smarts" },
  { id: "public-speaking", name: "Public Speaking", category: "professional", description: "Speaking to a room with clarity and confidence.", minAge: 12, baseGain: 2.8, stat: "happiness" },
  { id: "cooking", name: "Cooking", category: "practical", description: "Planning meals and building kitchen technique.", minAge: 8, baseGain: 3.5, stat: "happiness" },
  { id: "gardening", name: "Gardening", category: "practical", description: "Growing and caring for plants.", minAge: 8, baseGain: 3.2, stat: "happiness" },
  { id: "handcrafting", name: "Handcrafting", category: "practical", description: "Making and repairing useful things.", minAge: 8, baseGain: 3.1, stat: "smarts" },
  { id: "programming", name: "Programming", category: "practical", description: "Building instructions and tools with code.", minAge: 10, baseGain: 3.0, stat: "smarts" },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((skill) => [skill.id, skill])) as Record<string, SkillDef>;
export const SKILL_CATEGORIES: { id: SkillCategory; label: string }[] = [
  { id: "academic", label: "Academic" },
  { id: "creative", label: "Creative" },
  { id: "physical", label: "Physical" },
  { id: "professional", label: "Professional" },
  { id: "practical", label: "Practical" },
];

function aptFor(c: Char, skill: SkillDef): number {
  c.aptitudes ??= {};
  if (typeof c.aptitudes[skill.id] !== "number") c.aptitudes[skill.id] = 0.88 + random() * 0.26;
  return c.aptitudes[skill.id];
}

function traitFactor(c: Char, skill: SkillDef): number {
  let factor = 1;
  if (c.traits.includes("disciplined")) factor += 0.12;
  if (c.traits.includes("lazy")) factor -= 0.1;
  if (c.traits.includes("curious") && ["academic", "practical"].includes(skill.category)) factor += 0.1;
  if (c.traits.includes("creative") && skill.category === "creative") factor += 0.1;
  if (c.traits.includes("ambitious") && skill.category === "professional") factor += 0.08;
  return Math.max(0.65, factor);
}

function gain(c: Char, skillId: string, effort = 1, year?: number): number {
  const skill = SKILL_BY_ID[skillId];
  if (!skill) return 0;
  c.skills ??= {};
  const current = clamp(c.skills[skillId] ?? 0);
  if (current >= 100) return 0;
  const ageFactor = c.age < 16 ? 1.15 : c.age > 55 ? 0.75 : 1;
  const studyFactor = skill.category === "academic" && (c.education === "university" || c.uni) ? 1.18 : 1;
  const statValue = c[skill.stat];
  const statFactor = 0.85 + clamp(statValue) / 400;
  const delta = Math.max(0.15, skill.baseGain * effort * (1 - current / 120) * ageFactor * studyFactor * traitFactor(c, skill) * aptFor(c, skill) * statFactor);
  c.skills[skillId] = Math.min(100, Math.round((current + delta) * 10) / 10);
  c.skillLastPractice ??= {};
  c.skillLastPractice[skillId] = year ?? c.birthYear + c.age;
  return c.skills[skillId] - current;
}

export function developSkill(c: Char, skillId: string, effort = 1, year?: number): number {
  return gain(c, skillId, effort, year);
}

export function skillPracticeLock(s: GameState, skillId: string): string | null {
  const p = s.chars[s.currentId];
  const skill = SKILL_BY_ID[skillId];
  if (!p || !skill || !p.alive || s.over) return "Practice is unavailable.";
  if (p.age < skill.minAge) return `Available from age ${skill.minAge}.`;
  if (p.usedActions.includes("skills-practice")) return "You have already practiced a skill this year.";
  if ((p.skills[skillId] ?? 0) >= 100) return "This skill is already at its current limit.";
  return null;
}

export function practiceSkill(s: GameState, skillId: string): boolean {
  if (skillPracticeLock(s, skillId)) return false;
  const p = s.chars[s.currentId];
  if (!p) return false;
  const delta = gain(p, skillId, 1.2, s.worldYear);
  if (delta <= 0) return false;
  p.usedActions.push("skills-practice");
  const def = SKILL_BY_ID[skillId];
  s.log.push({ id: s.seq++, year: s.worldYear, age: p.age, kind: "good", text: `You practiced ${def.name}. Your proficiency improved by ${delta.toFixed(1)} points.` });
  s.log = s.log.slice(-500);
  s.toast = { id: s.seq++, text: `${def.name} +${delta.toFixed(1)}` };
  return true;
}

function usefulSkills(c: Char): string[] {
  const candidates = new Set<string>();
  if (c.age >= 5 && c.age < 19) ["mathematics", "science", "writing", "communication"].forEach((id) => candidates.add(id));
  if (c.age >= 6 && c.age < 19) ["fitness", "football", "basketball", "swimming", "athletics"].forEach((id) => candidates.add(id));
  if (c.job) {
    const byJob: Record<string, string[]> = {
      chef: ["cooking"], musician: ["singing", "instruments"], artist: ["painting"], designer: ["photography", "communication"],
      writer: ["writing"], journalist: ["writing", "research", "communication"], teacher: ["communication", "public-speaking"],
      dev: ["programming"], engineer: ["mathematics", "research"], scientist: ["science", "research"], lawyer: ["negotiation", "public-speaking"],
      business: ["business-management", "negotiation"], founder: ["business-management", "leadership"], exec: ["leadership", "negotiation"],
      nurse: ["science", "communication"], farmer: ["gardening"], carpenter: ["handcrafting"], electrician: ["handcrafting"],
      plumber: ["handcrafting"], mechanic: ["handcrafting"], coach: ["leadership", "communication"],
    };
    (byJob[c.job.jobId] ?? ["communication"]).forEach((id) => candidates.add(id));
  }
  if (c.sportsCareer && c.sportsCareer.level !== "retired") {
    ["fitness", "football", "basketball", "athletics", "tennis", "swimming", "boxing"].forEach((id) => candidates.add(id));
  }
  if (c.fameCareer?.pathway === "acting") ["acting", "communication", "public-speaking"].forEach((id) => candidates.add(id));
  if (c.fameCareer?.pathway === "modelling") ["photography", "communication"].forEach((id) => candidates.add(id));
  if (c.fameCareer?.pathway === "music") ["singing", "instruments", "public-speaking"].forEach((id) => candidates.add(id));
  return [...candidates].filter((id) => c.age >= (SKILL_BY_ID[id]?.minAge ?? 0));
}

export function advanceCharacterSkills(c: Char, year: number, isNpc = false): void {
  c.skills ??= {};
  c.skillLastPractice ??= {};
  for (const [id, value] of Object.entries(c.skills)) {
    const last = c.skillLastPractice[id] ?? year - 20;
    if (year - last > 8 && value > 0) c.skills[id] = Math.max(0, Math.round((value - 0.65) * 10) / 10);
  }
  const candidates = usefulSkills(c);
  if (!candidates.length || (isNpc && random() > 0.75) || (!isNpc && random() > 0.62)) return;
  const choice = pick(candidates);
  gain(c, choice, isNpc ? 0.55 : 0.35, year);
}

export function skillName(id: string): string {
  return SKILL_BY_ID[id]?.name ?? id;
}
