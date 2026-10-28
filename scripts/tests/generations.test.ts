/**
 * End-to-end family saga test.
 *
 * Plays one family through four player generations (three successions), then
 * persists it through the SAME save-slot layer the running game uses
 * (writeSlot -> loadSlot with validation/migration), reloads it, and verifies
 * the family tree, dead relatives, inherited surnames, finances and
 * relationships all survive. A second save/reload after more play proves the
 * reloaded state is fully playable and re-persistable.
 */
import { setSeed, random } from "../../src/game/rng";
import { newRandomLife } from "../../src/game/characters";
import { ageUp, continueAs, eligibleSuccessors, getEvent } from "../../src/game/simulate";
import { runEvent } from "../../src/game/events";
import { doAction } from "../../src/game/actions";
import { MemoryDriver } from "../../src/game/persistence/storage";
import {
  writeSlot, loadSlot, listSlots, exportEnvelope, importEnvelope, validateState,
} from "../../src/game/persistence/saves";
import { netWorth, totalDebt } from "../../src/game/economy";
import { assert, assertEqual } from "./util";
import type { Char, GameState } from "../../src/game/types";

const TARGET_GENERATION = 4; // founder + 3 successions

function answerPending(s: GameState) {
  while (s.pending.length > 0 && !s.over) {
    const pc = s.pending.shift()!;
    const ev = getEvent(pc.eventId);
    const p = s.chars[s.currentId];
    if (ev) runEvent(s, p, ev, pc.choices[Math.floor(random() * pc.choices.length)]?.id);
  }
}

/** One year of player life, actively dating, marrying and raising children. */
function playerTurn(s: GameState) {
  const p = s.chars[s.currentId];
  if (p.age >= 16 && !p.job && !p.uni) doAction(s, "jobhunt");
  if (p.age >= 18 && !p.partnerId) doAction(s, "date");
  if (p.partnerId && !p.flags.includes("married") && (p.partnerValue ?? 0) >= 65) doAction(s, "propose");
  if (p.partnerId && p.age >= 27 && p.age <= 40 && p.age % 2 === 1) doAction(s, "baby");
  // Guarantee an heir regardless of sexual biology: adoption if still childless.
  if (p.age === 42 && p.childrenIds.length === 0) {
    p.money = Math.max(p.money, 50000);
    doAction(s, "adopt");
  }
}

function buildSaga(): { s: GameState; seed: number; successions: number; playerLine: string[] } {
  for (let seed = 100; seed < 140; seed++) {
    setSeed(seed);
    const s = newRandomLife(0);
    const playerLine = [s.currentId];
    let successions = 0;
    let guard = 0;
    while (s.generation < TARGET_GENERATION && guard++ < 450) {
      if (!s.over) {
        ageUp(s);
        answerPending(s);
        if (!s.over) playerTurn(s);
      } else {
        const heirs = eligibleSuccessors(s);
        if (heirs.length === 0) break;
        const heir = [...heirs].sort((a, b) => b.age - a.age)[0]; // oldest descendant
        continueAs(s, heir.id);
        playerLine.push(heir.id);
        successions++;
      }
    }
    if (s.generation >= TARGET_GENERATION) return { s, seed, successions, playerLine };
  }
  throw new Error("no seed produced a four-generation saga");
}

/** Longest ancestor path through BOTH parental lines (cycle-guarded). */
function ancestorDepth(s: GameState, id: string, seen = new Set<string>()): number {
  const c = s.chars[id];
  if (!c || seen.has(id)) return 0;
  seen.add(id);
  const mum = c.motherId ? ancestorDepth(s, c.motherId, seen) : 0;
  const dad = c.fatherId ? ancestorDepth(s, c.fatherId, seen) : 0;
  return 1 + Math.max(mum, dad);
}

/** Invariants that must hold before AND after every reload. */
function checkInvariants(s: GameState, label: string) {
  const chars = Object.values(s.chars);
  for (const c of chars) {
    // --- family tree: every reference resolves and is symmetric
    if (c.motherId) {
      const m = s.chars[c.motherId];
      assert(!!m, `${label}: dangling mother ref for ${c.firstName}`);
      assert(m.childrenIds.includes(c.id), `${label}: mother does not list child ${c.firstName}`);
      // --- inherited surname: a child takes the mother's family name
      assertEqual(c.lastName, m.lastName, `${label}: surname not inherited from mother (${c.firstName})`);
    }
    if (c.fatherId) {
      const f = s.chars[c.fatherId];
      assert(!!f, `${label}: dangling father ref for ${c.firstName}`);
      assert(f.childrenIds.includes(c.id), `${label}: father does not list child ${c.firstName}`);
    }
    for (const kidId of c.childrenIds) {
      const kid = s.chars[kidId];
      assert(!!kid, `${label}: dangling child ref`);
      // Birth years never change: a parent must be at least 12 years older at
      // the child's birth. (Aging can't be compared directly — a child who
      // outlives a parent will legitimately grow older than the parent's
      // frozen age at death.)
      assert(
        c.birthYear <= kid.birthYear - 12,
        `${label}: impossible birth years for parent ${c.firstName} (${c.birthYear}) and child ${kid.firstName} (${kid.birthYear})`
      );
    }
    // --- deceased relatives are fully recorded and never walking around
    if (!c.alive) {
      assert(typeof c.deathYear === "number" && !!c.causeOfDeath, `${label}: dead char ${c.firstName} missing death record`);
      assert(c.age <= 120, `${label}: ${c.firstName} died past the lifespan cap`);
    }
    // --- relationships: living partner links are reciprocal and to living chars
    if (c.partnerId) {
      const par = s.chars[c.partnerId];
      assert(!!par, `${label}: dangling partner ref`);
      if (c.alive) {
        assert(par.alive, `${label}: living ${c.firstName} partnered to deceased ${par.firstName}`);
        assertEqual(par.partnerId, c.id, `${label}: partner link not reciprocal`);
      }
      for (const exId of c.partnerHistory) assert(!!s.chars[exId], `${label}: dangling ex ref`);
    }
    // --- finances: non-negative whole dollars, debts always equal loan sum
    assert(c.money >= 0 && Number.isInteger(c.money), `${label}: ${c.firstName} has illegal cash ${c.money}`);
    assert(Number.isInteger(c.debts), `${label}: fractional debt on ${c.firstName}`);
    assertEqual(c.debts, totalDebt(c), `${label}: debts/loans desync on ${c.firstName}`);
    for (const l of c.loans) assert(Number.isInteger(l.balance), `${label}: fractional loan balance`);
    const expectNet = c.money - totalDebt(c) + (c.house?.value ?? 0) + (c.car?.value ?? 0);
    assertEqual(netWorth(c), expectNet, `${label}: net worth mismatch on ${c.firstName}`);
  }
}

function financeSnapshot(s: GameState) {
  const out: Record<string, unknown> = {};
  for (const [id, c] of Object.entries(s.chars)) {
    out[id] = {
      money: c.money, debts: c.debts, pension: c.pension ?? 0,
      loans: c.loans.map((l) => ({ ...l })),
      house: c.house ? { ...c.house } : null,
      car: c.car ? { ...c.car } : null,
    };
  }
  return out;
}

function relationshipSnapshot(s: GameState) {
  const out: Record<string, unknown> = {};
  for (const [id, c] of Object.entries(s.chars)) {
    out[id] = {
      partnerId: c.partnerId ?? null,
      partnerSince: c.partnerSince ?? null,
      partnerValue: c.partnerValue ?? 0,
      partnerHistory: [...c.partnerHistory],
      motherId: c.motherId ?? null,
      fatherId: c.fatherId ?? null,
      childrenIds: [...c.childrenIds],
      married: c.flags.includes("married"),
      divorced: c.flags.includes("divorced"),
    };
  }
  return out;
}

export const tests = [
  {
    name: "E2E: a four-generation family survives save -> reload with tree, dead, surnames, money and bonds intact",
    fn: async () => {
      const { s, seed, successions, playerLine } = buildSaga();
      const current = s.chars[s.currentId]; // gen-4 player after the saga
      assert(successions >= 3, `expected 3 successions, got ${successions}`);
      assertEqual(s.generation, TARGET_GENERATION, "generation counter");
      assertEqual(playerLine.length, TARGET_GENERATION, "player line should hold one character per generation");
      // every succession really did move to a descendant of the previous player
      for (let i = 1; i < playerLine.length; i++) {
        const prev = s.chars[playerLine[i - 1]];
        const heir = s.chars[playerLine[i]];
        const isGrandchild = Object.values(s.chars).some(
          (sib) => prev.childrenIds.includes(sib.id) && sib.childrenIds.includes(heir.id)
        );
        assert(
          prev.childrenIds.includes(heir.id) || isGrandchild,
          `succession ${i}: heir ${heir.firstName} is not a child or grandchild of ${prev.firstName}`
        );
      }

      // ---------- pre-save dossier + invariants ----------
      checkInvariants(s, "pre-save");
      const allChars = Object.values(s.chars);
      const gens = new Set(allChars.map((c) => c.generation));
      // With max(parent)+1 depth, every label from 1 to the deepest must exist.
      for (let g = 1; g <= TARGET_GENERATION; g++) assert(gens.has(g), `generation ${g} has no members`);
      const deadBefore = allChars.filter((c) => !c.alive);
      assert(deadBefore.length >= 3, `expected several deceased relatives, got ${deadBefore.length}`);
      const deadRecords = new Map(deadBefore.map((c) => [c.id, { year: c.deathYear, cause: c.causeOfDeath, age: c.age }]));

      // the current player must sit at least four ancestor levels deep
      const depth = ancestorDepth(s, current.id);
      assert(depth >= TARGET_GENERATION, `ancestor depth only ${depth}, wanted ${TARGET_GENERATION}`);
      // walk the deepest line to the gen-1 founder
      let walker: Char = current;
      while (walker.motherId || walker.fatherId) {
        const mum = walker.motherId ? s.chars[walker.motherId] : undefined;
        const dad = walker.fatherId ? s.chars[walker.fatherId] : undefined;
        const next =
          (mum && dad ? (ancestorDepth(s, mum.id) >= ancestorDepth(s, dad.id) ? mum : dad) : (mum ?? dad)) as Char;
        walker = next;
      }
      const founderChar = walker;
      assertEqual(founderChar.generation, 1, "deepest ancestor is not the gen-1 founder");

      const moneyBefore = financeSnapshot(s);
      const relBefore = relationshipSnapshot(s);
      const charCount = Object.keys(s.chars).length;
      const totalCashBefore = allChars.reduce((sum, c) => sum + c.money, 0);
      const normalizedBefore = validateState(s).state!;

      // ---------- SAVE through the real slot layer ----------
      const driver = new MemoryDriver();
      const slotId = "slot-family-saga";
      const meta = await writeSlot(driver, slotId, s, "The Okonkwo-ish Saga");
      const listed = await listSlots(driver);
      assertEqual(listed.length, 1, "slot list");
      assertEqual(listed[0].generation, TARGET_GENERATION, "slot meta generation");
      assertEqual(meta.characterName, `${current.firstName} ${current.lastName}`.trim(), "slot meta name");

      // ---------- RELOAD ----------
      const back = await loadSlot(driver, slotId);
      assert(back, "slot failed to reload");
      assertEqual(back!.currentId, s.currentId, "current character changed across reload");
      assertEqual(back!.worldYear, s.worldYear, "world year changed across reload");
      assertEqual(back!.generation, s.generation, "generation changed across reload");
      assertEqual(Object.keys(back!.chars).length, charCount, "characters lost across reload");

      // ---------- family tree ----------
      checkInvariants(back!, "post-reload");
      for (const c of Object.values(back!.chars)) {
        const rel = relBefore[c.id] as { motherId: string | null; fatherId: string | null; childrenIds: string[] };
        assertEqual(c.motherId ?? null, rel.motherId, "mother link altered across reload");
        assertEqual(c.fatherId ?? null, rel.fatherId, "father link altered across reload");
        assertEqual(JSON.stringify(c.childrenIds), JSON.stringify(rel.childrenIds), "child list altered across reload");
      }

      // ---------- deceased relatives ----------
      const deadAfter = Object.values(back!.chars).filter((c) => !c.alive);
      assertEqual(deadAfter.length, deadBefore.length, "dead relative count changed across reload");
      for (const d of deadAfter) {
        const rec = deadRecords.get(d.id);
        assert(rec, "an unknown dead character appeared after reload");
        assertEqual(d.deathYear, rec!.year, "death year changed across reload");
        assertEqual(d.causeOfDeath, rec!.cause, "cause of death changed across reload");
      }

      // ---------- inherited surnames ----------
      // (children take the mother's family name; the rule itself is checked
      // for every parent-child link in checkInvariants)
      const nameCounts = new Map<string, number>();
      for (const c of Object.values(back!.chars)) nameCounts.set(c.lastName, (nameCounts.get(c.lastName) ?? 0) + 1);
      const widestFamily = Math.max(...nameCounts.values());
      assert(widestFamily >= 3, "no family surname propagated to at least three relatives");
      // along the actual played succession line, each heir keeps the mother's name
      for (let i = 1; i < playerLine.length; i++) {
        const heir = back!.chars[playerLine[i]];
        const mum = back!.chars[heir.motherId ?? ""];
        if (mum) assertEqual(heir.lastName, mum.lastName, `heir ${heir.firstName} lost the inherited family name`);
      }

      // ---------- finances ----------
      const moneyAfter = financeSnapshot(back!);
      assertEqual(JSON.stringify(moneyAfter), JSON.stringify(moneyBefore), "financial records altered across reload");
      const totalCashAfter = Object.values(back!.chars).reduce((sum, c) => sum + c.money, 0);
      assertEqual(totalCashAfter, totalCashBefore, "total family cash changed across reload");

      // ---------- relationships ----------
      assertEqual(JSON.stringify(relationshipSnapshot(back!)), JSON.stringify(relBefore), "relationship records altered across reload");

      // ---------- full structural equality (normalized) ----------
      assertEqual(JSON.stringify(back!.chars), JSON.stringify(normalizedBefore.chars), "full character state differs after reload");

      // ---------- export/import envelope is a second valid persistence path ----------
      const imported = importEnvelope(exportEnvelope(back!));
      assert(imported.ok && imported.state, "envelope import rejected a valid saga");
      assertEqual(imported.state!.generation, TARGET_GENERATION, "envelope lost generation");
      assertEqual(Object.keys(imported.state!.chars).length, charCount, "envelope lost characters");

      // ---------- the reloaded save is fully playable: 12 more years, then save again ----------
      const yearAtReload = back!.worldYear;
      const deadIdsAtReload = new Set(deadAfter.map((d) => d.id));
      for (let i = 0; i < 12 && !back!.over; i++) {
        ageUp(back!);
        answerPending(back!);
        if (!back!.over) playerTurn(back!);
        checkInvariants(back!, `post-reload year ${i + 1}`);
      }
      assert(back!.worldYear > yearAtReload || back!.over, "reloaded life did not advance");
      for (const id of deadIdsAtReload) assert(!back!.chars[id].alive, "a deceased relative resurrected after reload");
      await writeSlot(driver, slotId, back!);
      const reloaded2 = await loadSlot(driver, slotId);
      assert(reloaded2, "second save did not reload");
      assertEqual(reloaded2!.currentId, back!.currentId, "current character changed on second reload");
      checkInvariants(reloaded2!, "second reload");
      const metas = await listSlots(driver);
      assertEqual(metas.length, 1, "re-saving must reuse the same slot, not create a new one");

      // ---------- readable dossier for the test log ----------
      const living = Object.values(back!.chars).filter((c) => c.alive).length;
      console.log(
        `\n      family dossier (seed ${seed}): ${charCount} characters ever lived, ${living} living, ` +
        `${deadAfter.length} deceased · generations ${[...gens].sort().join("→")} · ` +
        `founder ${founderChar.firstName} ${founderChar.lastName} · current ${current.firstName} ${current.lastName}, ` +
        `age ${current.age}, net worth $${netWorth(current).toLocaleString()} · family cash $${totalCashAfter.toLocaleString()}`
      );
    },
  },
];
