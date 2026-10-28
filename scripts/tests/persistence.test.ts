import { MemoryDriver } from "../../src/game/persistence/storage";
import {
  deleteSlot, exportEnvelope, importEnvelope, listSlots, loadSlot,
  migrate, validateState, writeSlot,
} from "../../src/game/persistence/saves";
import { freshLife, playYears, assert, assertEqual } from "./util";
import type { GameState } from "../../src/game/types";

export const tests = [
  {
    name: "slots are independent: two lives never overwrite each other",
    fn: async () => {
      const driver = new MemoryDriver();
      const a = freshLife(1);
      const b = freshLife(2);
      await writeSlot(driver, "slot-a", a, "Life A");
      await writeSlot(driver, "slot-b", b, "Life B");
      const metas = await listSlots(driver);
      assertEqual(metas.length, 2, "two slots expected");
      const reloadedA = await loadSlot(driver, "slot-a");
      const reloadedB = await loadSlot(driver, "slot-b");
      assertEqual(reloadedA!.currentId, a.currentId, "slot A corrupted");
      assertEqual(reloadedB!.currentId, b.currentId, "slot B corrupted");
      await deleteSlot(driver, "slot-a");
      assertEqual((await listSlots(driver)).length, 1, "delete failed");
      assertEqual(await loadSlot(driver, "slot-a"), null, "deleted slot still loads");
    },
  },
  {
    name: "autosave round-trips a long, complex life",
    fn: async () => {
      const driver = new MemoryDriver();
      const s = freshLife(12);
      playYears(s, 80);
      await writeSlot(driver, "autosave", s);
      const back = await loadSlot(driver, "autosave");
      assert(back, "slot did reload");
      assertEqual(back!.worldYear, s.worldYear, "year lost");
      assertEqual(back!.chars[back!.currentId].loans.length, s.chars[s.currentId].loans.length, "loans lost");
      assert(!!back!.nameUsage, "name usage lost");
      const beforeCount = Object.keys(s.chars).length;
      assertEqual(Object.keys(back!.chars).length, beforeCount, "characters lost in save");
    },
  },
  {
    name: "export then import produces an identical playable state",
    fn: () => {
      const s = freshLife(34);
      playYears(s, 40);
      const json = exportEnvelope(s);
      const r = importEnvelope(json);
      assert(r.ok && r.state, "import failed");
      assertEqual(r.state!.worldYear, s.worldYear, "year mismatch");
      assertEqual(r.state!.version, 2, "schema not stamped v2");
      // migration intentionally normalizes missing fields, so compare both
      // after running the same normalization pass.
      const normalized = validateState(s).state!;
      assertEqual(JSON.stringify(r.state!.chars), JSON.stringify(normalized.chars), "characters differ after round trip");
    },
  },
  {
    name: "import validation rejects garbage and bare non-save JSON",
    fn: () => {
      assert(!importEnvelope("not json at all").ok, "accepted nonsense");
      assert(!importEnvelope(JSON.stringify({ hello: "world" })).ok, "accepted non-save object");
      const broken = freshLife(5);
      const d = broken as unknown as Record<string, unknown>;
      d.worldYear = "yesterday" as never;
      assert(!validateState({ ...d }).ok, "accepted bad worldYear");
    },
  },
  {
    name: "V1-shaped saves migrate: loans, naming group, citizenOf backfilled",
    fn: () => {
      const v1 = freshLife(6) as GameState;
      // simulate V1 data: no loans, no group, flat debt
      for (const c of Object.values(v1.chars)) {
        (c as unknown as { loans?: unknown[] }).loans = undefined as never;
        c.group = undefined;
        c.citizenOf = undefined;
        c.debts = 5000;
      }
      const { state, errors } = migrate(v1);
      assertEqual(errors.length, 0, "migration errors");
      const p = state.chars[state.currentId];
      assert(p.loans.length === 1 && p.loans[0].balance === 5000, "V1 debt not converted to a loan");
      assert(!!p.group && !!p.citizenOf, "group/citizenship backfill failed");
      assert(p.culturalHeritage?.includes(p.group), "legacy cultural heritage fallback failed");
      assertEqual(state.version, 2, "version bumped");
    },
  },
  {
    name: "corrupted slot JSON is skipped, not fatal to the slot list",
    fn: async () => {
      const driver = new MemoryDriver();
      await writeSlot(driver, "good", freshLife(7), "Good");
      await driver.set("slot:bad", "{this is not json");
      const metas = await listSlots(driver);
      assertEqual(metas.length, 1, "corrupted slot broke the list");
      assert(await loadSlot(driver, "good"), "good slot unreadable");
    },
  },
  {
    name: "dangling references in imported data are pruned safely",
    fn: () => {
      const s = freshLife(8);
      const p = s.chars[s.currentId];
      p.partnerId = "c-does-not-exist";
      const { state } = validateState(s);
      assert(state, "validation rejected a repairable save");
      assertEqual(state!.chars[state!.currentId].partnerId, undefined, "dangling partner not pruned");
    },
  },
];
