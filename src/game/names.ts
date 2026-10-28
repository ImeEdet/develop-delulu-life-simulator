/**
 * Delulu Life V2 — naming engine.
 *
 * All generated names flow through this module so gender association,
 * cultural group, surname inheritance and anti-repetition stay consistent.
 */
import type { Char, Gender } from "./types";
import { COUNTRY_GROUPS, LEGACY_CULTURE_MAP, NAME_GROUPS, type NameGroup } from "./name-data";
import { chance, pick, pickWeighted, random, ri } from "./rng";

/** Tracks how often each name has been handed out inside one game world. */
export interface NameUsage {
  first: Record<string, number>;
  last: Record<string, number>;
  /** Recently used full first names — skipped while alternatives exist. */
  recent: string[];
}

export function emptyNameUsage(): NameUsage {
  return { first: {}, last: {}, recent: [] };
}

const RECENT_MEMORY = 36;

export function groupFor(countryId: string, groupId?: string): NameGroup {
  const ids = COUNTRY_GROUPS[countryId] ?? ["anglo"];
  const id = groupId && ids.includes(groupId) ? groupId : ids[0];
  return NAME_GROUPS[id] ?? NAME_GROUPS.anglo;
}

export function groupsForCountry(countryId: string): NameGroup[] {
  return (COUNTRY_GROUPS[countryId] ?? ["anglo"]).map((id) => NAME_GROUPS[id]).filter(Boolean);
}

/** Legacy V1 culture key -> V2 group id. */
export function legacyGroupId(culture: string): string {
  return LEGACY_CULTURE_MAP[culture] ?? "anglo";
}

export function pickGroup(countryId: string): NameGroup {
  const groups = groupsForCountry(countryId);
  return groups[Math.floor(random() * groups.length)];
}

function candidatesFor(group: NameGroup, gender: Gender): string[] {
  const gendered = gender === "male" ? group.male : group.female;
  // A name declared unisex is never treated as gender-locked, even if an
  // older dataset also listed it on a gendered side.
  const strictlyGendered = gendered.filter((n) => !group.unisex.includes(n));
  return [...strictlyGendered, ...group.unisex];
}

function remember(usage: NameUsage | undefined, key: string, bucket: "first" | "last", name: string) {
  if (!usage) return;
  usage[bucket][key] = (usage[bucket][key] ?? 0) + 1;
  if (bucket === "first") {
    usage.recent.push(name);
    if (usage.recent.length > RECENT_MEMORY) usage.recent.shift();
  }
}

/**
 * Pick a culturally appropriate given name.
 * Strongly gender-associated names are never assigned to a mismatched gender;
 * unisex names may appear for anyone. Custom (player-typed) names bypass
 * this function entirely.
 */
export function makeFirstName(
  countryId: string,
  gender: Gender,
  groupId?: string,
  usage?: NameUsage
): string {
  const group = groupFor(countryId, groupId);
  const pool = candidatesFor(group, gender);
  const key = (n: string) => `${group.id}:${n}`;
  const fresh = pool.filter((n) => !usage?.recent.includes(n));
  const working = fresh.length > 0 ? fresh : pool;
  const chosen = pickWeighted(working, (n) => 1 / (1 + (usage?.first[key(n)] ?? 0)));
  remember(usage, key(chosen), "first", chosen);
  return chosen;
}

/** Broad, de-duplicated family-name pool so no single surname dominates. */
export function makeSurname(
  countryId: string,
  gender: Gender | null,
  groupId?: string,
  usage?: NameUsage
): string {
  const group = groupFor(countryId, groupId);
  const pool = gender === "female" && group.surnamesFemale?.length ? group.surnamesFemale : group.surnames;
  const key = (n: string) => `${group.id}:${n}`;
  const chosen = pickWeighted(pool, (n) => 1 / (1 + (usage?.last[key(n)] ?? 0)));
  remember(usage, key(chosen), "last", chosen);
  return chosen;
}

/** Roll a gender once, here, so name and character can never disagree. */
export function rollGender(): Gender {
  return chance(0.5) ? "male" : "female";
}

/** Convention-aware display name (Korea/Japan put the family name first). */
export function fullName(c: Char): string {
  const group = groupFor(c.countryId, c.group);
  if (group.order === "last-first") return `${c.lastName} ${c.firstName}`.trim();
  return `${c.firstName} ${c.lastName}`.trim();
}

/** A full identity in one call — used by NPC factories. */
export function makeIdentity(
  countryId: string,
  gender: Gender,
  opts: { groupId?: string; usage?: NameUsage; surname?: string } = {}
): { firstName: string; lastName: string; group: string } {
  const group = groupFor(countryId, opts.groupId);
  const firstName = makeFirstName(countryId, gender, group.id, opts.usage);
  const lastName = opts.surname ?? makeSurname(countryId, gender, group.id, opts.usage);
  return { firstName, lastName, group: group.id };
}

/** Validate/sanitize a player-typed name; fall back to a generated one. */
export function customOrGenerated(
  typed: string | undefined,
  countryId: string,
  gender: Gender,
  groupId: string | undefined,
  usage?: NameUsage
): string {
  const clean = (typed ?? "").trim().slice(0, 24);
  if (clean) return clean;
  return makeFirstName(countryId, gender, groupId, usage);
}

/** Used by the Custom Life dice buttons. */
export function randomGivenName(countryId: string, gender: Gender, groupId?: string): string {
  return makeFirstName(countryId, gender, groupId);
}

export function randomFamilyName(countryId: string, groupId?: string): string {
  return makeSurname(countryId, null, groupId);
}

/** Small helper for UI age/random controls. */
export function randomInt(a: number, b: number): number {
  return ri(a, b);
}

export function maybe<T>(arr: readonly T[]): T {
  return pick(arr);
}
