import type { Char, GameState, SuperAlignment, SuperFamilyBackground, SuperLifeOptions, SuperPowerState, SuperProfile } from "./types";
import { clamp, pick, random, ri } from "./rng";

export type PowerCategory = "Physical" | "Elemental" | "Psychic" | "Energy" | "Spatial & Mobility" | "Biological & Transformative" | "Specialized";
export type PowerTier = "E" | "D" | "C" | "B" | "A" | "S";
export interface PowerDef {
  id: string;
  name: string;
  category: PowerCategory;
  description: string;
  capabilities: string[];
  limitations: string[];
  potential: number;
  skillId: string;
  energyCost: number;
  progression: string;
  eventTags: string[];
  aiTags: string[];
}

const power = (id: string, name: string, category: PowerCategory, description: string, potential: number, skillId: string, energyCost: number, capabilities: string[], limitations: string[], tags: string[]): PowerDef => ({
  id, name, category, description, potential, skillId, energyCost, capabilities, limitations,
  progression: `Practice ${skillId} and train this ability; gains diminish above mastery 70 and control 80.`,
  eventTags: tags, aiTags: tags,
});

/** Central catalogue: add powers here without changing the simulation loop. */
export const SUPER_POWERS: PowerDef[] = [
  power("super-strength", "Super Strength", "Physical", "Lift, push, and strike with extraordinary force.", 63, "strength", 28, ["heavy lifting", "impact"], ["strain", "collateral damage"], ["physical", "rescue"]),
  power("super-speed", "Super Speed", "Physical", "Move and react at remarkable speed.", 78, "athletics", 35, ["rapid movement", "fast reactions"], ["high energy use", "poor turning at speed"], ["mobility", "rescue"]),
  power("enhanced-durability", "Enhanced Durability", "Physical", "Resist impacts and environmental strain.", 52, "endurance", 14, ["impact resistance", "protection"], ["does not prevent exhaustion"], ["defense", "physical"]),
  power("regeneration", "Regeneration", "Physical", "Recover from injuries faster than ordinary people.", 70, "biology", 22, ["accelerated recovery"], ["takes time", "uses energy"], ["recovery", "defense"]),
  power("enhanced-senses", "Enhanced Senses", "Physical", "Notice details beyond ordinary human range.", 42, "perception", 12, ["tracking", "early warning"], ["overstimulation", "not omniscient"], ["perception", "investigation"]),
  power("pyrokinesis", "Pyrokinesis", "Elemental", "Create and shape heat and flame.", 77, "focus", 32, ["heat shaping", "controlled flame"], ["combustibles", "heat exhaustion"], ["elemental", "rescue", "conflict"]),
  power("cryokinesis", "Cryokinesis", "Elemental", "Draw heat away and shape ice.", 72, "focus", 30, ["cooling", "ice shaping"], ["warm environments", "dehydration"], ["elemental", "rescue", "conflict"]),
  power("electrokinesis", "Electrokinesis", "Elemental", "Sense and redirect electrical charge.", 79, "engineering", 34, ["charge control", "electrical sensing"], ["grounding", "electronics risk"], ["elemental", "technology", "conflict"]),
  power("hydrokinesis", "Hydrokinesis", "Elemental", "Move nearby water with concentration.", 66, "focus", 26, ["water shaping", "flow control"], ["needs available water", "mass limits"], ["elemental", "rescue"]),
  power("aerokinesis", "Aerokinesis", "Elemental", "Influence air currents and pressure.", 70, "focus", 28, ["wind shaping", "air movement"], ["weather scale limits", "precision"], ["elemental", "mobility"]),
  power("geokinesis", "Geokinesis", "Elemental", "Shift earth and stone at close range.", 71, "craftsmanship", 31, ["stone shaping", "ground barriers"], ["needs connected ground", "slow at scale"], ["elemental", "rescue", "defense"]),
  power("telepathy", "Telepathy", "Psychic", "Sense or transmit surface thoughts with consent and focus.", 76, "empathy", 22, ["thought contact", "mental communication"], ["mental fatigue", "privacy boundaries"], ["psychic", "social", "investigation"]),
  power("telekinesis", "Telekinesis", "Psychic", "Move objects without physical contact.", 83, "focus", 32, ["remote movement", "fine manipulation"], ["mass and distance limits", "concentration"], ["psychic", "rescue", "conflict"]),
  power("precognition", "Precognition", "Psychic", "Experience brief, uncertain impressions of possible futures.", 81, "intuition", 18, ["risk impressions", "short warning"], ["ambiguous", "not certain prediction"], ["psychic", "investigation"]),
  power("empathy-manipulation", "Empathy Manipulation", "Psychic", "Sense and subtly influence emotional intensity.", 69, "empathy", 21, ["emotion sensing", "calming"], ["requires proximity", "can backfire"], ["psychic", "social"]),
  power("illusion-projection", "Illusion Projection", "Psychic", "Create temporary sensory illusions.", 74, "creativity", 25, ["visual and audio illusions", "distraction"], ["does not alter matter", "concentration"], ["psychic", "stealth"]),
  power("energy-projection", "Energy Projection", "Energy", "Project controlled bursts of energy.", 85, "focus", 38, ["ranged bursts", "illumination"], ["energy drain", "limited precision"], ["energy", "conflict"]),
  power("energy-absorption", "Energy Absorption", "Energy", "Absorb certain external energy and convert a portion of it.", 80, "endurance", 25, ["energy buffering", "resistance"], ["wrong energy types", "capacity limit"], ["energy", "defense"]),
  power("force-fields", "Force Fields", "Energy", "Form temporary protective barriers.", 82, "focus", 30, ["personal barrier", "small group cover"], ["breaks under sustained load", "energy drain"], ["energy", "defense", "rescue"]),
  power("light-manipulation", "Light Manipulation", "Energy", "Bend or brighten visible light in a limited area.", 65, "creativity", 20, ["glare", "camouflage support"], ["visible spectrum only", "focus"], ["energy", "stealth"]),
  power("teleportation", "Teleportation", "Spatial & Mobility", "Move yourself across a short, familiar distance.", 88, "focus", 42, ["short-range relocation", "rapid escape"], ["line-of-sight or familiarity", "disorientation"], ["mobility", "escape"]),
  power("flight", "Flight", "Spatial & Mobility", "Lift and steer your own body through the air.", 80, "athletics", 34, ["aerial movement", "rapid access"], ["stamina", "weather and altitude"], ["mobility", "rescue"]),
  power("intangibility", "Intangibility", "Spatial & Mobility", "Briefly pass through solid matter.", 84, "focus", 38, ["phase through barriers", "avoid impacts"], ["breath and timing", "cannot carry much"], ["mobility", "escape", "defense"]),
  power("portal-creation", "Portal Creation", "Spatial & Mobility", "Create a temporary passage between two visible nearby points.", 91, "focus", 46, ["short-lived portals", "group transport"], ["high concentration", "distance cap"], ["mobility", "rescue"]),
  power("shapeshifting", "Shapeshifting", "Biological & Transformative", "Alter your appearance within biological limits.", 82, "biology", 30, ["appearance change", "voice mimicry"], ["does not copy memories", "sustained effort"], ["transform", "stealth"]),
  power("elasticity", "Elasticity", "Biological & Transformative", "Stretch and flex your body beyond ordinary limits.", 62, "athletics", 20, ["reach", "impact absorption"], ["temperature sensitivity", "strain"], ["transform", "rescue"]),
  power("size-manipulation", "Size Manipulation", "Biological & Transformative", "Change body size within a limited safe range.", 86, "biology", 34, ["scale change", "access"], ["energy cost", "mass conservation strain"], ["transform", "mobility"]),
  power("camouflage", "Camouflage", "Biological & Transformative", "Blend into nearby visual environments.", 58, "perception", 16, ["visual concealment", "ambush avoidance"], ["movement breaks effect", "not invisible to other senses"], ["stealth", "escape"]),
  power("technopathy", "Technopathy", "Specialized", "Intuitively sense and interact with nearby electronic systems.", 80, "engineering", 24, ["device sensing", "limited interface"], ["range", "complex systems need time"], ["technology", "investigation"]),
  power("gravity-manipulation", "Gravity Manipulation", "Specialized", "Alter local gravitational pull within a small area.", 94, "physics", 45, ["weight shifts", "localized lift"], ["severe fatigue", "small area"], ["specialized", "rescue", "conflict"]),
  power("magnetism", "Magnetism", "Specialized", "Influence magnetic materials and fields.", 84, "physics", 34, ["metal movement", "magnetic sensing"], ["non-ferrous limits", "electronics risk"], ["specialized", "technology"]),
  power("power-negation", "Power Negation", "Specialized", "Temporarily disrupt a nearby active ability.", 92, "focus", 42, ["interrupt active powers", "defensive counter"], ["short range", "does not remove powers"], ["specialized", "counter"]),
  power("probability-manipulation", "Probability Manipulation", "Specialized", "Nudge a narrow outcome toward a plausible possibility.", 97, "intuition", 50, ["small probability shifts", "timing"], ["uncertain", "backlash and fatigue"], ["specialized", "luck"]),
];

export const POWER_BY_ID = Object.fromEntries(SUPER_POWERS.map((entry) => [entry.id, entry])) as Record<string, PowerDef>;
export function powerTier(def: PowerDef): PowerTier {
  return def.potential >= 90 ? "S" : def.potential >= 80 ? "A" : def.potential >= 68 ? "B" : def.potential >= 52 ? "C" : def.potential >= 35 ? "D" : "E";
}

export interface SuperOrganization {
  id: string;
  name: string;
  type: "hero-agency" | "team" | "villain-group" | "training" | "research" | "neutral";
  alignment: SuperAlignment | "any";
  minAge: number;
  minMastery: number;
  description: string;
  goal: string;
}
export const SUPER_ORGANIZATIONS: SuperOrganization[] = [
  { id: "civic-shield", name: "Civic Shield Agency", type: "hero-agency", alignment: "hero", minAge: 18, minMastery: 20, description: "A public-service rescue and response agency.", goal: "community safety" },
  { id: "skyline-team", name: "Skyline Team", type: "team", alignment: "hero", minAge: 16, minMastery: 28, description: "A small, independent city-response team.", goal: "rapid response" },
  { id: "night-market", name: "Night Market", type: "villain-group", alignment: "villain", minAge: 18, minMastery: 18, description: "A clandestine network trading favors and illicit technology.", goal: "influence" },
  { id: "black-comet", name: "Black Comet Circle", type: "villain-group", alignment: "villain", minAge: 18, minMastery: 35, description: "An ambitious syndicate of powered operators.", goal: "power" },
  { id: "meridian-institute", name: "Meridian Institute", type: "training", alignment: "any", minAge: 10, minMastery: 0, description: "A supervised training and safety institution.", goal: "control" },
  { id: "atlas-lab", name: "Atlas Research Cooperative", type: "research", alignment: "any", minAge: 18, minMastery: 0, description: "Researchers and powered volunteers study safe applications.", goal: "knowledge" },
  { id: "open-hand", name: "Open Hand Network", type: "neutral", alignment: "neutral", minAge: 18, minMastery: 0, description: "An independent mutual-aid and mediation network.", goal: "support" },
];

const ALIGNMENTS: SuperAlignment[] = ["hero", "villain", "neutral"];
const BACKGROUNDS: Exclude<SuperFamilyBackground, "random">[] = ["super-dynasty", "super-family", "first-generation", "ordinary", "unknown"];
export function randomSuperOptions(): SuperLifeOptions {
  return {
    originChoice: pick(["born", "acquired", "random"] as const),
    // Acquired origin never manifests at age zero; start random previews at a safe shared age.
    manifestationAge: ri(1, 30),
    powerId: pick(SUPER_POWERS).id,
    startWithPower: random() < 0.82,
    alignment: pick(ALIGNMENTS),
    familyBackground: pick(BACKGROUNDS),
    alias: "",
    identityPublic: false,
  };
}

export function initialSuperProfile(options: SuperLifeOptions, background: SuperFamilyBackground = options.familyBackground): SuperProfile {
  const origin: SuperProfile["origin"] = options.originChoice === "random"
    ? (random() < 0.55 ? "innate" : "acquired")
    : options.originChoice === "born" ? "innate" : "acquired";
  const familyBackground = background === "random" ? pick(BACKGROUNDS) : background;
  const alignment = options.alignment === "random" ? pick(ALIGNMENTS) : options.alignment;
  const profile: SuperProfile = {
    originChoice: options.originChoice,
    origin,
    familyBackground,
    manifestationAge: clamp(options.manifestationAge, origin === "acquired" ? 1 : 0, 115),
    plannedPowerId: options.startWithPower && options.powerId && POWER_BY_ID[options.powerId] ? options.powerId : undefined,
    powers: [],
    alignment,
    inclination: alignment,
    alias: options.alias?.trim() || undefined,
    aliasHistory: [],
    identityPublic: options.identityPublic,
    identityExposed: options.identityPublic,
    publicReputation: familyBackground === "super-dynasty" ? 18 : 0,
    legalStatus: "clear",
    organizationIds: [],
    organizationHistory: [],
  };
  if (profile.plannedPowerId && profile.origin === "innate" && profile.manifestationAge === 0) {
    profile.powers.push(makePowerState(profile.plannedPowerId, "innate", true, 2, 6));
  }
  return profile;
}

export function makePowerState(powerId: string, origin: SuperPowerState["origin"], active: boolean, mastery = 0, control = 0): SuperPowerState {
  return { powerId, origin, active, mastery: clamp(mastery, 0, 100), control: clamp(control, 0, 100), experience: 0, energy: 100 };
}

export function registerNpcSuper(s: GameState, c: Char, options: { chance?: number; alignment?: SuperAlignment } = {}): boolean {
  if (c.superProfile || s.worldType !== "superlife" || random() >= (options.chance ?? 0.07)) return false;
  const def = pick(SUPER_POWERS);
  const profile = initialSuperProfile({
    originChoice: "born", manifestationAge: 0, powerId: def.id, startWithPower: true,
    alignment: options.alignment ?? pick(ALIGNMENTS), familyBackground: "ordinary", identityPublic: false,
  }, "ordinary");
  profile.powers = [makePowerState(def.id, "innate", true, clamp(c.age * 1.2, 1, 70), clamp(c.age * 0.8, 1, 60))];
  profile.manifestationAge = 0;
  if (c.age < 18) profile.alias = undefined;
  else if (random() < 0.3) profile.alias = `${pick(["Silver", "Quiet", "Bright", "North", "Echo", "Wild"])} ${pick(["Current", "Warden", "Comet", "Signal", "Vesper", "Vector"])}`;
  profile.publicReputation = ri(0, 35);
  c.superProfile = profile;
  return true;
}

export function seedSuperFamily(s: GameState, player: Char, background: SuperFamilyBackground, playerProfile?: SuperProfile): void {
  const p = playerProfile ?? initialSuperProfile({
    originChoice: "born", manifestationAge: 0, powerId: "super-strength", startWithPower: true,
    alignment: "neutral", familyBackground: background, identityPublic: false,
  }, background);
  player.superProfile = p;
  const parents = [s.chars[player.motherId ?? ""], s.chars[player.fatherId ?? ""]].filter((c): c is Char => !!c);
  const siblings = Object.values(s.chars).filter((c) => c.id !== player.id && ((player.motherId && c.motherId === player.motherId) || (player.fatherId && c.fatherId === player.fatherId)));
  const grandparents = parents.flatMap((par) => [s.chars[par.motherId ?? ""], s.chars[par.fatherId ?? ""]]).filter((c): c is Char => !!c);
  const poweredParents = background === "super-dynasty" ? 0.78 : background === "super-family" ? 0.45 : background === "unknown" ? 0.18 : 0;
  const poweredSiblings = background === "super-dynasty" ? 0.45 : background === "super-family" ? 0.22 : background === "unknown" ? 0.08 : 0;
  for (const parent of parents) registerNpcSuper(s, parent, { chance: poweredParents, alignment: "neutral" });
  for (const sibling of siblings) registerNpcSuper(s, sibling, { chance: poweredSiblings, alignment: pick(ALIGNMENTS) });
  const poweredGrandparents = background === "super-dynasty" ? 0.68 : background === "unknown" ? 0.18 : 0;
  for (const grandparent of grandparents) registerNpcSuper(s, grandparent, { chance: poweredGrandparents, alignment: "neutral" });
  if (background === "first-generation" || background === "ordinary") {
    player.superProfile.familyBackground = background;
    player.superProfile.publicReputation = 0;
  }
  if (background === "unknown") player.superProfile.publicReputation = -5;
}

export function inheritSuperPower(s: GameState, child: Char, mother: Char, father: Char): void {
  if (s.worldType !== "superlife") return;
  const sources = [mother, father].flatMap((parent) => (parent.superProfile?.powers ?? []).filter((p) => p.active && p.origin === "innate").map((powerState) => ({ parent, powerState })));
  if (!sources.length || random() > Math.min(0.42, 0.2 + sources.length * 0.1)) return;
  const inherited = pick(sources);
  const def = POWER_BY_ID[inherited.powerState.powerId];
  if (!def) return;
  const profile = initialSuperProfile({
    originChoice: "born", manifestationAge: ri(0, 18), powerId: def.id, startWithPower: true,
    alignment: pick(ALIGNMENTS), familyBackground: "super-family", identityPublic: false,
  }, "super-family");
  profile.powers = [makePowerState(def.id, "innate", child.age >= profile.manifestationAge, 0, 0)];
  profile.plannedPowerId = def.id;
  profile.origin = "innate";
  child.superProfile = profile;
}

export function queueSuperAwakening(s: GameState, c: Char): void {
  const profile = c.superProfile;
  if (s.worldType !== "superlife" || !c.isPlayer || !profile || profile.awakeningPending || profile.powers.some((p) => p.active) || c.age < profile.manifestationAge) return;
  profile.awakeningPending = true;
  const abilityName = profile.plannedPowerId ? POWER_BY_ID[profile.plannedPowerId]?.name ?? "new ability" : "new ability";
  s.pending.push({
    eventId: "super-awakening",
    title: profile.origin === "innate" ? "A Power Stirs" : "The Incident",
    text: profile.origin === "innate"
      ? `Something in you finally surfaces. Your family, friends, or the outside world may be the first to notice. What do you do with your ${abilityName}?`
      : `An unexpected exposure, accident, or experiment has changed something in you. A ${abilityName} is within reach—but how you respond matters.`,
    choices: [
      { id: "embrace", label: "Explore it carefully", hint: "Gain the ability with a steady start." },
      { id: "seek-help", label: "Ask a trusted person for help", hint: "Better early control; keep the moment private." },
      { id: "suppress", label: "Step away for now", hint: "Delay the decision; the power does not activate yet." },
    ],
  });
}

export function resolveSuperAwakening(s: GameState, c: Char, choice: string): void {
  const profile = c.superProfile;
  if (!profile || !profile.awakeningPending) return;
  profile.awakeningPending = false;
  if (choice === "suppress") {
    profile.manifestationAge = Math.min(115, c.age + 2);
    c.flags = c.flags.filter((flag) => flag !== "super-awakening-pending");
    s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind: "neutral", text: "You put the strange feeling aside for now. The question can return when you are ready." });
    return;
  }
  const powerId = profile.plannedPowerId && POWER_BY_ID[profile.plannedPowerId] ? profile.plannedPowerId : pick(SUPER_POWERS).id;
  const mastery = choice === "seek-help" ? 4 : 1;
  const control = choice === "seek-help" ? 18 : 6;
  profile.powers = [makePowerState(powerId, profile.origin, true, mastery, control)];
  profile.plannedPowerId = powerId;
  if (profile.origin === "acquired") profile.powers[0].acquiredYear = s.worldYear;
  s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind: "event", text: `${POWER_BY_ID[powerId].name} became real. Its limits are still yours to learn.` });
  s.toast = { id: s.seq++, text: `${POWER_BY_ID[powerId].name} manifested.` };
}

export type SuperAction =
  | { type: "train"; powerId: string }
  | { type: "alignment"; alignment: SuperAlignment }
  | { type: "alias"; alias: string }
  | { type: "retire-alias" }
  | { type: "identity"; isPublic: boolean }
  | { type: "activity"; path: SuperAlignment }
  | { type: "join"; organizationId: string }
  | { type: "leave"; organizationId: string }
  | { type: "conflict"; targetId: string };

export function superActionLock(s: GameState, action: SuperAction): string | null {
  if (s.worldType !== "superlife") return "This action is only available in Super Life.";
  const c = s.chars[s.currentId];
  const profile = c?.superProfile;
  if (!c || !profile || !c.alive || s.over) return "Super Life is not available right now.";
  if (action.type === "train") {
    const ability = profile.powers.find((entry) => entry.powerId === action.powerId && entry.active);
    if (!ability) return "You have not manifested this power.";
    const def = POWER_BY_ID[ability.powerId];
    if (!def) return "This saved power is no longer in the catalogue.";
    if (c.age < 6) return "You are too young to train safely.";
    if (ability.lastTrainedYear === s.worldYear) return "This power was trained this year.";
    if (ability.energy < def.energyCost) return "You need time to recover your energy.";
  }
  if (action.type === "activity" && c.age < 13) return "You need to be a teenager before taking on public super activities.";
  if (action.type === "activity" && c.usedActions.includes("super-activity")) return "You already used a super activity this year.";
  if (action.type === "activity") {
    const ability = [...profile.powers.filter((entry) => entry.active)].sort((a, b) => (b.mastery + b.control) - (a.mastery + a.control))[0];
    if (!ability) return "You need a manifested power before taking on super activities.";
    const cost = Math.ceil((POWER_BY_ID[ability.powerId]?.energyCost ?? 20) * 0.5);
    if (ability.energy < cost) return "Recover energy before taking on another super activity.";
  }
  if (action.type === "conflict" && c.age < 13) return "You are too young to choose a super conflict.";
  if (action.type === "conflict" && c.usedActions.includes("super-conflict")) return "You already entered a super conflict this year.";
  if (action.type === "conflict") {
    const ability = [...profile.powers.filter((entry) => entry.active)].sort((a, b) => (b.mastery + b.control) - (a.mastery + a.control))[0];
    if (!ability) return "You need a manifested power before entering a super conflict.";
    if (ability.energy < 18) return "Recover energy before entering a super conflict.";
  }
  if (action.type === "join") {
    const org = SUPER_ORGANIZATIONS.find((entry) => entry.id === action.organizationId);
    if (!org) return "That organization is not available.";
    if (profile.organizationIds.includes(org.id)) return "You already belong to this organization.";
    if (c.age < org.minAge) return `Members must be at least ${org.minAge}.`;
    if (org.alignment !== "any" && org.alignment !== profile.alignment) return `This organization currently recruits ${org.alignment}s.`;
    const mastery = Math.max(0, ...profile.powers.filter((entry) => entry.active).map((entry) => entry.mastery));
    if (mastery < org.minMastery) return `Build power mastery to ${org.minMastery} first.`;
  }
  if (action.type === "leave" && !profile.organizationIds.includes(action.organizationId)) return "You are not a member.";
  if (action.type === "conflict") {
    const opponent = s.chars[action.targetId];
    if (!opponent || opponent.id === c.id || !opponent.alive) return "Choose another living opponent.";
    if (opponent.age < 13) return "That opponent is too young for a super conflict.";
    if (!opponent.superProfile?.powers.some((entry) => entry.active)) return "That person is not a powered opponent.";
  }
  return null;
}

export interface ConflictResult {
  outcome: "success" | "failure" | "escape";
  margin: number;
  text: string;
}
export function resolveSuperConflict(actor: Char, opponent: Char): ConflictResult {
  const strongest = (c: Char) => [...(c.superProfile?.powers.filter((entry) => entry.active) ?? [])]
    .sort((a, b) => (b.mastery + b.control) - (a.mastery + a.control))[0];
  const score = (c: Char) => {
    const ability = strongest(c);
    const def = ability ? POWER_BY_ID[ability.powerId] : undefined;
    const potential = def?.potential ?? 30;
    const relevantSkill = def ? (c.skills[def.skillId] ?? 0) : 0;
    return (ability?.mastery ?? 0) * 0.32 + (ability?.control ?? 0) * 0.23 + (ability?.experience ?? 0) * 0.1 + c.health * 0.12 + relevantSkill * 0.13 + potential * 0.1 + random() * 24 - (ability ? (100 - ability.energy) * 0.12 : 0);
  };
  const margin = score(actor) - score(opponent);
  const outcome: ConflictResult["outcome"] = margin >= 8 ? "success" : margin <= -12 ? "escape" : "failure";
  const actorPower = strongest(actor);
  const opponentPower = strongest(opponent);
  if (actorPower) actorPower.energy = clamp(actorPower.energy - 18, 0, 100);
  if (outcome === "success") {
    opponent.health = clamp(opponent.health - ri(5, 12), 1, 100);
    if (opponentPower) opponentPower.energy = clamp(opponentPower.energy - 14, 0, 100);
  } else {
    actor.health = clamp(actor.health - ri(outcome === "escape" ? 2 : 4, outcome === "escape" ? 6 : 11), 1, 100);
  }
  if (actor.superProfile) actor.superProfile.publicReputation = clamp(actor.superProfile.publicReputation + (outcome === "success" ? 4 : outcome === "failure" ? -2 : 0), -100, 100);
  if (opponent.superProfile && outcome === "success") opponent.superProfile.publicReputation = clamp(opponent.superProfile.publicReputation - 2, -100, 100);
  const text = outcome === "success"
    ? `You outmaneuvered ${opponent.firstName}. Both sides paid an energy cost, and your opponent was left shaken.`
    : outcome === "escape"
      ? `You escaped ${opponent.firstName} after the encounter turned against you. You took a hit, but got clear.`
      : `The encounter with ${opponent.firstName} ended without a clean win. You were hurt, and your power spent energy.`;
  return { outcome, margin, text };
}

export function performSuperAction(s: GameState, action: SuperAction): boolean {
  const lock = superActionLock(s, action);
  if (lock) return false;
  const c = s.chars[s.currentId];
  const profile = c.superProfile!;
  if (action.type === "train") {
    const ability = profile.powers.find((entry) => entry.powerId === action.powerId)!;
    const def = POWER_BY_ID[ability.powerId];
    ability.energy -= def.energyCost;
    ability.lastTrainedYear = s.worldYear;
    ability.experience += 1 + random() * 3;
    const efficiency = ability.mastery >= 70 ? 0.45 : 1;
    ability.mastery = clamp(ability.mastery + (1 + random() * 2.4) * efficiency, 0, 100);
    ability.control = clamp(ability.control + (1 + random() * 3.2) * (ability.control >= 80 ? 0.4 : 1), 0, 100);
    c.skills[def.skillId] = clamp((c.skills[def.skillId] ?? 0) + 0.4, 0, 100);
    s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind: "milestone", text: `You trained ${def.name}. Control ${Math.round(ability.control)}, mastery ${Math.round(ability.mastery)}; recovery will take time.` });
    s.toast = { id: s.seq++, text: `${def.name} training recorded.` };
    return true;
  }
  if (action.type === "alignment") {
    profile.alignment = action.alignment;
    profile.inclination = action.alignment;
    s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind: "choice", text: `You chose a ${action.alignment} direction. Your actions will shape how others see it.` });
    return true;
  }
  if (action.type === "alias") {
    const next = action.alias.trim().slice(0, 32);
    if (profile.alias && profile.alias !== next && !profile.aliasHistory.includes(profile.alias)) profile.aliasHistory.push(profile.alias);
    profile.alias = next || undefined;
    return true;
  }
  if (action.type === "retire-alias") {
    if (profile.alias && !profile.aliasHistory.includes(profile.alias)) profile.aliasHistory.push(profile.alias);
    profile.alias = undefined;
    return true;
  }
  if (action.type === "identity") {
    profile.identityPublic = action.isPublic;
    if (action.isPublic) {
      profile.identityExposed = true;
      s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind: "event", text: `You publicly connected your civilian identity to ${profile.alias || "your super identity"}. That information cannot be made secret again.` });
    } else {
      s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind: "choice", text: profile.identityExposed ? "You stopped making new public disclosures, but your earlier identity reveal remains known." : "You chose to keep your civilian identity private." });
    }
    return true;
  }
  if (action.type === "join") {
    profile.organizationIds.push(action.organizationId);
    profile.organizationHistory.push(action.organizationId);
    const org = SUPER_ORGANIZATIONS.find((entry) => entry.id === action.organizationId);
    s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind: "career", text: `You joined ${org?.name ?? "a super organization"}. Its goals and expectations now shape your training and public role.` });
    return true;
  }
  if (action.type === "leave") {
    profile.organizationIds = profile.organizationIds.filter((id) => id !== action.organizationId);
    const org = SUPER_ORGANIZATIONS.find((entry) => entry.id === action.organizationId);
    s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind: "choice", text: `You left ${org?.name ?? "your organization"}; your membership history remains.` });
    return true;
  }
  if (action.type === "conflict") {
    const opponent = s.chars[action.targetId];
    const result = resolveSuperConflict(c, opponent);
    c.usedActions.push("super-conflict");
    s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind: result.outcome === "success" ? "event" : "bad", text: result.text });
    s.toast = { id: s.seq++, text: result.outcome === "success" ? "Conflict resolved in your favor." : "You escaped or were forced back." };
    return true;
  }
  c.usedActions.push("super-activity");
  const primaryPower = [...profile.powers.filter((entry) => entry.active)].sort((a, b) => (b.mastery + b.control) - (a.mastery + a.control))[0];
  if (primaryPower) primaryPower.energy = clamp(primaryPower.energy - Math.ceil((POWER_BY_ID[primaryPower.powerId]?.energyCost ?? 20) * 0.5), 0, 100);
  const path = action.path;
  if (path === "hero") {
    profile.publicReputation = clamp(profile.publicReputation + ri(2, 7), -100, 100);
    c.reputation = clamp((c.reputation ?? 50) + 1, 0, 100);
    c.fame = clamp((c.fame ?? 0) + ri(1, 3), 0, 100);
    if (profile.legalStatus === "wanted" && random() < 0.2) profile.legalStatus = "clear";
    s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind: "good", text: "You used your abilities in a public rescue. The moment mattered more than the headline." });
  } else if (path === "villain") {
    profile.publicReputation = clamp(profile.publicReputation + ri(-2, 5), -100, 100);
    c.fame = clamp((c.fame ?? 0) + ri(1, 5), 0, 100);
    c.money += Math.round(150 + random() * 450);
    if (random() < 0.3) profile.legalStatus = "wanted";
    s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind: "event", text: "You took a risky step toward a villain life. The payoff arrived with a legal risk attached." });
  } else {
    c.money += Math.round(100 + random() * 300);
    profile.publicReputation = clamp(profile.publicReputation + ri(-1, 2), -100, 100);
    s.log.push({ id: s.seq++, year: s.worldYear, age: c.age, kind: "career", text: "You used a power privately for paid work, without choosing a side." });
  }
  return true;
}

export function advanceSuperNpc(s: GameState, c: Char, isPlayer = false): void {
  if (s.worldType !== "superlife") return;
  if (!c.superProfile) {
    if (isPlayer) {
      if (random() < 0.01) {
        const def = pick(SUPER_POWERS);
        const profile = initialSuperProfile({
          originChoice: "acquired", manifestationAge: c.age, powerId: def.id, startWithPower: true,
          alignment: "random", familyBackground: "ordinary", identityPublic: false,
        }, "ordinary");
        profile.powers = [makePowerState(def.id, "acquired", false)];
        c.superProfile = profile;
      }
    } else {
      registerNpcSuper(s, c, { chance: 0.0025 });
    }
    return;
  }
  const profile = c.superProfile;
  const mentorship = profile.organizationIds.length;
  profile.powers.forEach((ability) => {
    ability.energy = clamp(ability.energy + 24 + mentorship * 3, 0, 100);
    if (ability.active && mentorship > 0) ability.control = clamp(ability.control + mentorship * 0.35, 0, 100);
    if (!isPlayer && !ability.active && c.age >= profile.manifestationAge && profile.origin === "innate") {
      ability.active = true;
      ability.mastery = Math.max(ability.mastery, 1);
    }
  });
  // Player manifestation is always routed through the explicit awakening choice.
  if (isPlayer) return;
  if (!profile.powers.some((entry) => entry.active) && c.age >= profile.manifestationAge && profile.plannedPowerId && random() < 0.5) {
    const powerState = makePowerState(profile.plannedPowerId, profile.origin, true, 2, 8);
    powerState.acquiredYear = profile.origin === "acquired" ? s.worldYear : undefined;
    profile.powers.push(powerState);
  }
  if (c.age >= 18 && profile.organizationIds.length === 0 && random() < 0.015) {
    const eligible = SUPER_ORGANIZATIONS.filter((org) => org.alignment === "any" || org.alignment === profile.alignment);
    const org = eligible.find((entry) => c.age >= entry.minAge && Math.max(0, ...profile.powers.map((a) => a.mastery)) >= entry.minMastery);
    if (org) {
      profile.organizationIds.push(org.id);
      profile.organizationHistory.push(org.id);
    }
  }
}
