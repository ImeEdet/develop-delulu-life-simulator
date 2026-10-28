/**
 * Save slots: autosave, multiple independent lives, rename/delete,
 * versioned schema, migration and import validation.
 */
import type { GameState, SaveEnvelope, SaveMeta, SaveSlot } from "../types";
import { COUNTRIES } from "../world";
import { emptyNameUsage } from "../names";
import { legacyGroupId } from "../names";
import { POWER_BY_ID } from "../super";
import type { StorageDriver } from "./storage";

export const CURRENT_SCHEMA = 3;
const SLOT_PREFIX = "slot:";
export const AUTOSAVE_ID = "autosave";
const LEGACY_KEY = "delulu-life-save-v1";

function isRecord(value: unknown): value is Record<string, number> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function slotKey(id: string): string {
  return SLOT_PREFIX + id;
}

export function metaOf(id: string, name: string, state: GameState, createdAt: number, updatedAt: number): SaveMeta {
  const p = state.chars[state.currentId];
  return {
    id,
    name,
    createdAt,
    updatedAt,
    characterName: p ? `${p.firstName} ${p.lastName}`.trim() : "Unnamed life",
    age: p?.age ?? 0,
    year: state.worldYear,
    generation: state.generation,
    alive: p?.alive ?? true,
    countryId: p?.countryId ?? "us",
  };
}

/** Fill anything missing so older/newer data can never crash the engine. */
export function migrate(raw: unknown): { state: GameState; errors: string[] } {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null) {
    return { state: null as never, errors: ["Save is not an object."] };
  }
  const d = raw as Record<string, unknown>;
  if (typeof d.version !== "number" || ![1, 2, 3].includes(d.version)) {
    return { state: null as never, errors: [`Unsupported save version: ${String(d.version)}.`] };
  }
  if (typeof d.seq !== "number" || typeof d.worldYear !== "number" || typeof d.chars !== "object" || d.chars === null) {
    return { state: null as never, errors: ["Save is missing core fields (seq/worldYear/chars)."] };
  }
  const state = d as unknown as GameState;
  if (!state.chars[state.currentId]) {
    return { state: null as never, errors: ["Current character is missing from the save."] };
  }
  // ---- V1/V2 -> V3 structural migration
  state.version = CURRENT_SCHEMA;
  state.worldType = state.worldType === "superlife" ? "superlife" : "ordinary";
  state.nameUsage = state.nameUsage ?? emptyNameUsage();
  if (state.themePreference !== "auto" && state.themePreference !== "classic" && state.themePreference !== "gold" && state.themePreference !== "super") state.themePreference = "auto";
  if (!Array.isArray(state.log)) state.log = [];
  if (!Array.isArray(state.pending)) state.pending = [];
  for (const c of Object.values(state.chars)) {
    c.loans = c.loans ?? [];
    if (typeof c.debts !== "number") c.debts = 0;
    if (!Array.isArray(c.partnerHistory)) c.partnerHistory = [];
    if (!Array.isArray(c.childrenIds)) c.childrenIds = [];
    if (!Array.isArray(c.friends)) c.friends = [];
    if (!Array.isArray(c.traits)) c.traits = [];
    if (!Array.isArray(c.flags)) c.flags = [];
    if (!Array.isArray(c.milestones)) c.milestones = [];
    if (!Array.isArray(c.usedActions)) c.usedActions = [];
    c.eventCooldowns = c.eventCooldowns ?? {};
    if (!isRecord(c.languages)) c.languages = {};
    if (!isRecord(c.languageExposure)) c.languageExposure = Object.fromEntries(Object.entries(c.languages).map(([id, value]) => [id, Math.round(value * 0.5)]));
    if (!isRecord(c.skills)) c.skills = {};
    if (!isRecord(c.skillLastPractice)) c.skillLastPractice = {};
    if (!isRecord(c.aptitudes)) c.aptitudes = {};
    for (const [id, value] of Object.entries(c.languages)) c.languages[id] = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    for (const [id, value] of Object.entries(c.languageExposure)) c.languageExposure[id] = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    for (const [id, value] of Object.entries(c.skills)) c.skills[id] = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    for (const [id, value] of Object.entries(c.skillLastPractice)) if (typeof value !== "number" || !Number.isFinite(value)) delete c.skillLastPractice[id];
    for (const [id, value] of Object.entries(c.aptitudes)) c.aptitudes[id] = typeof value === "number" && Number.isFinite(value) ? Math.max(0.6, Math.min(1.5, value)) : 1;
    c.culturalHeritage = Array.isArray(c.culturalHeritage) ? c.culturalHeritage.filter((id): id is string => typeof id === "string") : c.group ? [c.group] : [];
    c.ethnicities = Array.isArray(c.ethnicities) ? c.ethnicities.filter((label): label is string => typeof label === "string" && !!label.trim()) : [];
    c.birthCountryId = typeof c.birthCountryId === "string" && COUNTRIES[c.birthCountryId] ? c.birthCountryId : c.countryId;
    c.birthCity = typeof c.birthCity === "string" && c.birthCity ? c.birthCity : c.city;
    c.citizenships = Array.isArray(c.citizenships) ? c.citizenships.filter((id): id is string => typeof id === "string" && !!COUNTRIES[id]) : [];
    if (c.citizenships.length === 0) c.citizenships = [c.citizenOf ?? c.countryId];
    if (state.worldType !== "superlife") {
      // Older saves are ordinary lives; never infer Super Life from a name or a stray field.
      c.superProfile = undefined;
    } else if (c.superProfile) {
      const profile = c.superProfile;
      if (!["born", "acquired", "random"].includes(profile.originChoice)) profile.originChoice = "born";
      if (profile.origin !== "innate" && profile.origin !== "acquired") profile.origin = "innate";
      if (!["super-dynasty", "super-family", "first-generation", "ordinary", "unknown"].includes(profile.familyBackground)) profile.familyBackground = "ordinary";
      if (!["hero", "villain", "neutral"].includes(profile.alignment)) profile.alignment = "neutral";
      if (!["hero", "villain", "neutral"].includes(profile.inclination)) profile.inclination = profile.alignment;
      profile.manifestationAge = typeof profile.manifestationAge === "number" && Number.isFinite(profile.manifestationAge) ? Math.max(0, Math.min(115, profile.manifestationAge)) : 0;
      profile.plannedPowerId = typeof profile.plannedPowerId === "string" && POWER_BY_ID[profile.plannedPowerId] ? profile.plannedPowerId : undefined;
      profile.powers = Array.isArray(profile.powers) ? profile.powers.filter((power) => power && typeof power.powerId === "string" && !!POWER_BY_ID[power.powerId] && (power.origin === "innate" || power.origin === "acquired")).map((power) => ({
        ...power,
        active: !!power.active,
        mastery: typeof power.mastery === "number" && Number.isFinite(power.mastery) ? Math.max(0, Math.min(100, power.mastery)) : 0,
        control: typeof power.control === "number" && Number.isFinite(power.control) ? Math.max(0, Math.min(100, power.control)) : 0,
        experience: typeof power.experience === "number" && Number.isFinite(power.experience) ? Math.max(0, power.experience) : 0,
        energy: typeof power.energy === "number" && Number.isFinite(power.energy) ? Math.max(0, Math.min(100, power.energy)) : 100,
      })) : [];
      profile.alias = typeof profile.alias === "string" && profile.alias.trim() ? profile.alias.slice(0, 32) : undefined;
      profile.aliasHistory = Array.isArray(profile.aliasHistory) ? profile.aliasHistory.filter((alias): alias is string => typeof alias === "string").slice(-20) : [];
      profile.identityPublic = !!profile.identityPublic;
      profile.identityExposed = !!profile.identityExposed;
      profile.publicReputation = typeof profile.publicReputation === "number" && Number.isFinite(profile.publicReputation) ? Math.max(-100, Math.min(100, profile.publicReputation)) : 0;
      if (profile.legalStatus !== "clear" && profile.legalStatus !== "wanted") profile.legalStatus = "clear";
      profile.organizationIds = Array.isArray(profile.organizationIds) ? profile.organizationIds.filter((id): id is string => typeof id === "string") : [];
      profile.organizationHistory = Array.isArray(profile.organizationHistory) ? profile.organizationHistory.filter((id): id is string => typeof id === "string") : [];
      profile.awakeningPending = !!profile.awakeningPending;
    }
    c.fame = typeof c.fame === "number" && Number.isFinite(c.fame) ? Math.max(0, Math.min(100, c.fame)) : 0;
    c.reputation = typeof c.reputation === "number" && Number.isFinite(c.reputation) ? Math.max(0, Math.min(100, c.reputation)) : 50;
    if (c.sportsCareer && typeof c.sportsCareer === "object" && typeof c.sportsCareer.sportId === "string") {
      const sport = c.sportsCareer;
      if (!["school", "amateur", "professional", "retired"].includes(sport.level)) sport.level = "amateur";
      for (const key of ["years", "experience", "salary", "wins", "losses", "competitions"] as const) sport[key] = typeof sport[key] === "number" && Number.isFinite(sport[key]) ? Math.max(0, sport[key]) : 0;
      sport.awards = Array.isArray(sport.awards) ? sport.awards.filter((label): label is string => typeof label === "string") : [];
      sport.achievements = Array.isArray(sport.achievements) ? sport.achievements.filter((label): label is string => typeof label === "string") : [];
      if (typeof sport.lastCompetitionYear !== "number" || !Number.isFinite(sport.lastCompetitionYear)) sport.lastCompetitionYear = undefined;
      if (typeof sport.injuryUntil !== "number" || !Number.isFinite(sport.injuryUntil)) sport.injuryUntil = undefined;
      if (typeof sport.injury !== "string") sport.injury = undefined;
      sport.sponsorshipIncome = typeof sport.sponsorshipIncome === "number" && Number.isFinite(sport.sponsorshipIncome) ? Math.max(0, sport.sponsorshipIncome) : 0;
    } else c.sportsCareer = undefined;
    if (c.fameCareer && typeof c.fameCareer === "object") {
      const fame = c.fameCareer;
      if (!["acting", "modelling", "music"].includes(fame.pathway)) c.fameCareer = undefined;
      else {
        fame.level = typeof fame.level === "number" && Number.isFinite(fame.level) ? Math.max(1, Math.min(5, fame.level)) : 1;
        fame.experience = typeof fame.experience === "number" && Number.isFinite(fame.experience) ? Math.max(0, fame.experience) : 0;
        fame.projects = typeof fame.projects === "number" && Number.isFinite(fame.projects) ? Math.max(0, fame.projects) : 0;
        fame.annualIncome = typeof fame.annualIncome === "number" && Number.isFinite(fame.annualIncome) ? Math.max(0, fame.annualIncome) : 0;
        fame.portfolio = typeof fame.portfolio === "number" && Number.isFinite(fame.portfolio) ? Math.max(0, fame.portfolio) : 0;
        fame.releases = typeof fame.releases === "number" && Number.isFinite(fame.releases) ? Math.max(0, fame.releases) : 0;
        if (typeof fame.lastProjectYear !== "number" || !Number.isFinite(fame.lastProjectYear)) fame.lastProjectYear = undefined;
        if (typeof fame.agency !== "string") fame.agency = undefined;
        fame.awards = Array.isArray(fame.awards) ? fame.awards.filter((label): label is string => typeof label === "string") : [];
      }
    } else c.fameCareer = undefined;
    if (!c.group) {
      const cty = COUNTRIES[c.countryId];
      c.group = cty ? cty.groups[0] : legacyGroupId("anglo");
    }
    if (c.culturalHeritage.length === 0 && c.group) c.culturalHeritage = [c.group];
    c.citizenOf = c.citizenOf ?? c.countryId;
    for (const k of ["health", "happiness", "smarts", "looks"] as const) {
      if (typeof c[k] !== "number" || Number.isNaN(c[k])) c[k] = 60;
      c[k] = Math.max(0, Math.min(100, c[k]));
    }
    if (typeof c.money !== "number" || Number.isNaN(c.money)) c.money = 0;
    // V1 stored a single debt number; represent it as one personal loan.
    if (c.loans.length === 0 && c.debts > 0) {
      c.loans = [{
        id: `ln-legacy-${c.id}`,
        kind: "personal",
        principal: Math.round(c.debts),
        balance: Math.round(c.debts),
        rate: 0.09,
        yearTaken: state.worldYear,
      }];
    }
    c.debts = c.loans.reduce((sum, l) => sum + (l.balance ?? 0), 0);
  }
  // Drop references to characters that no longer exist.
  for (const c of Object.values(state.chars)) {
    if (c.partnerId && !state.chars[c.partnerId]) c.partnerId = undefined;
    if (c.motherId && !state.chars[c.motherId]) c.motherId = undefined;
    if (c.fatherId && !state.chars[c.fatherId]) c.fatherId = undefined;
    c.childrenIds = c.childrenIds.filter((id) => state.chars[id]);
    c.friends = c.friends.filter((f) => state.chars[f.id]);
  }
  return { state, errors };
}

export function validateState(raw: unknown): { ok: boolean; state?: GameState; errors: string[] } {
  try {
    const { state, errors } = migrate(raw);
    if (errors.length) return { ok: false, errors };
    return { ok: true, state, errors: [] };
  } catch (e) {
    return { ok: false, errors: [`Save could not be parsed: ${(e as Error).message}`] };
  }
}

export async function listSlots(driver: StorageDriver): Promise<SaveMeta[]> {
  const all = await driver.getAll();
  const metas: SaveMeta[] = [];
  for (const [key, raw] of Object.entries(all)) {
    if (!key.startsWith(SLOT_PREFIX)) continue;
    try {
      const slot = JSON.parse(raw) as SaveSlot;
      if (slot?.state) metas.push(metaOf(slot.id, slot.name, slot.state, slot.createdAt, slot.updatedAt));
    } catch {
      /* corrupted slot is skipped, not allowed to break the list */
    }
  }
  return metas.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadSlot(driver: StorageDriver, id: string): Promise<GameState | null> {
  const raw = await driver.get(slotKey(id));
  if (!raw) return null;
  try {
    const slot = JSON.parse(raw) as SaveSlot;
    const { ok, state, errors } = validateState(slot.state);
    if (!ok || !state) {
      console.warn("Delulu Life: slot failed validation", errors);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export async function writeSlot(driver: StorageDriver, id: string, state: GameState, name?: string): Promise<SaveMeta> {
  const existing = await driver.get(slotKey(id));
  const now = Date.now();
  let createdAt = now;
  let currentName = name;
  if (existing) {
    try {
      const old = JSON.parse(existing) as SaveSlot;
      createdAt = old.createdAt;
      currentName = name ?? old.name;
    } catch {
      /* treat as new */
    }
  }
  if (!currentName) {
    const p = state.chars[state.currentId];
    currentName = `${p?.firstName ?? "Life"} — ${state.worldYear}`;
  }
  const clean = validateState(state);
  const safeState = clean.ok ? clean.state! : state;
  safeState.saveSlotId = id;
  const slot: SaveSlot = { ...metaOf(id, currentName, safeState, createdAt, now), state: safeState };
  await driver.set(slotKey(id), JSON.stringify(slot));
  return metaOf(id, currentName, safeState, createdAt, now);
}

export async function renameSlot(driver: StorageDriver, id: string, name: string): Promise<void> {
  const raw = await driver.get(slotKey(id));
  if (!raw) return;
  const slot = JSON.parse(raw) as SaveSlot;
  slot.name = name.slice(0, 60) || slot.name;
  slot.updatedAt = Date.now();
  await driver.set(slotKey(id), JSON.stringify(slot));
}

export async function deleteSlot(driver: StorageDriver, id: string): Promise<void> {
  await driver.remove(slotKey(id));
}

export function exportEnvelope(state: GameState): string {
  const envelope: SaveEnvelope = {
    app: "delulu-life",
    schema: CURRENT_SCHEMA,
    exportedAt: Date.now(),
    state,
  };
  return JSON.stringify(envelope, null, 2);
}

export function importEnvelope(json: string): { ok: boolean; state?: GameState; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { ok: false, errors: [`That file is not valid JSON: ${(e as Error).message}`] };
  }
  const envelope = parsed as Partial<SaveEnvelope>;
  if (envelope && envelope.app === "delulu-life" && envelope.state) {
    return validateState(envelope.state);
  }
  // Allow importing a bare GameState too.
  const maybeState = parsed as { version?: number };
  if (maybeState && typeof maybeState.version === "number") {
    return validateState(parsed);
  }
  return { ok: false, errors: ["Not a Delulu Life save file."] };
}

/** One-time rescue of a V1 localStorage save into the new slot system. */
export async function migrateLegacySave(driver: StorageDriver): Promise<boolean> {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return false;
  const { ok, state } = validateState(JSON.parse(raw));
  if (!ok || !state) return false;
  await writeSlot(driver, "legacy-import", state, "Imported life (V1)");
  localStorage.removeItem(LEGACY_KEY);
  return true;
}
