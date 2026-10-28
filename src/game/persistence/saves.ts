/**
 * Save slots: autosave, multiple independent lives, rename/delete,
 * versioned schema, migration and import validation.
 */
import type { GameState, SaveEnvelope, SaveMeta, SaveSlot } from "../types";
import { COUNTRIES } from "../world";
import { emptyNameUsage } from "../names";
import { legacyGroupId } from "../names";
import type { StorageDriver } from "./storage";

export const CURRENT_SCHEMA = 2;
const SLOT_PREFIX = "slot:";
export const AUTOSAVE_ID = "autosave";
const LEGACY_KEY = "delulu-life-save-v1";

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
  if (typeof d.version !== "number" || (d.version !== 1 && d.version !== 2)) {
    return { state: null as never, errors: [`Unsupported save version: ${String(d.version)}.`] };
  }
  if (typeof d.seq !== "number" || typeof d.worldYear !== "number" || typeof d.chars !== "object" || d.chars === null) {
    return { state: null as never, errors: ["Save is missing core fields (seq/worldYear/chars)."] };
  }
  const state = d as unknown as GameState;
  if (!state.chars[state.currentId]) {
    return { state: null as never, errors: ["Current character is missing from the save."] };
  }
  // ---- V1 -> V2 structural migration
  state.version = CURRENT_SCHEMA;
  state.nameUsage = state.nameUsage ?? emptyNameUsage();
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
    c.languages = c.languages ?? {};
    c.skills = c.skills ?? {};
    if (!c.group) {
      const cty = COUNTRIES[c.countryId];
      c.group = cty ? cty.groups[0] : legacyGroupId("anglo");
    }
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
