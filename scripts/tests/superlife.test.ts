import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createChild, makeNpcPerson, newCustomLife, newSuperLife } from "../../src/game/characters";
import { ageUp } from "../../src/game/simulate";
import { validateState, migrate } from "../../src/game/persistence/saves";
import { POWER_BY_ID, advanceSuperNpc, initialSuperProfile, makePowerState, performSuperAction, queueSuperAwakening, resolveSuperAwakening, superActionLock } from "../../src/game/super";
import { setSeed } from "../../src/game/rng";
import { SuperScreen } from "../../src/components/Screens4";
import { Game } from "../../src/components/Game";
import type { GameState, SuperLifeSpec } from "../../src/game/types";
import type { GameApi } from "../../src/game/state";
import { assert, assertEqual, customSpec, freshLife } from "./util";

function superLifeSpec(overrides: Partial<SuperLifeSpec["superLife"]> = {}): SuperLifeSpec {
  return {
    ...customSpec({ birthYear: 2000 }),
    superLife: {
      originChoice: "born",
      manifestationAge: 0,
      powerId: "super-strength",
      startWithPower: true,
      alignment: "hero",
      familyBackground: "ordinary",
      alias: "Daybreak",
      identityPublic: false,
      ...overrides,
    },
  };
}

export const tests = [
  {
    name: "Super Life creation is explicitly gated and initializes a powered world",
    fn: () => {
      setSeed(8301);
      const s = newSuperLife(superLifeSpec(), 0);
      const p = s.chars[s.currentId];
      assertEqual(s.worldType, "superlife", "world not tagged Super Life");
      assertEqual(p.superProfile?.alignment, "hero", "alignment not initialized");
      assertEqual(p.superProfile?.powers[0]?.powerId, "super-strength", "configured starting power missing");
      assertEqual(p.superProfile?.alias, "Daybreak", "alias missing");
      assert(s.chars[p.motherId!].superProfile === undefined, "ordinary family member became powered without matching background");
      assert(performSuperAction(s, { type: "identity", isPublic: true }), "identity exposure action failed");
      assert(performSuperAction(s, { type: "identity", isPublic: false }), "privacy setting action failed");
      assert(p.superProfile!.identityExposed && !p.superProfile!.identityPublic, "identity exposure was incorrectly reversible");
      const ordinary = freshLife(8302);
      assertEqual(ordinary.worldType ?? "ordinary", "ordinary", "ordinary world was modified");
      assert(Object.values(ordinary.chars).every((c) => !c.superProfile), "ordinary random life gained Super Life data");
    },
  },
  {
    name: "delayed innate and acquired powers ask for a player choice before activation",
    fn: () => {
      setSeed(8307);
      const s = newSuperLife(superLifeSpec({ originChoice: "acquired", manifestationAge: 1, startWithPower: true }), 0);
      const p = s.chars[s.currentId];
      assertEqual(p.superProfile!.powers.length, 0, "acquired power activated before its manifestation event");
      ageUp(s);
      assert(s.pending.some((event) => event.eventId === "super-awakening"), "manifestation did not enter the player choice queue");
      assert(p.superProfile!.awakeningPending, "awakening lock was not set");
      resolveSuperAwakening(s, p, "seek-help");
      assert(p.superProfile!.powers.some((ability) => ability.active), "chosen power did not activate");
      assert(p.superProfile!.powers[0].control >= 18, "trusted-help choice did not grant its control benefit");
      setSeed(8308);
      const innate = newSuperLife(superLifeSpec({ originChoice: "born", manifestationAge: 1, startWithPower: true }), 0);
      ageUp(innate);
      assert(innate.pending.some((event) => event.eventId === "super-awakening"), "innate manifestation skipped its player choice");
      assert(!innate.chars[innate.currentId].superProfile!.powers.some((ability) => ability.active), "innate ability auto-activated before the choice");
    },
  },
  {
    name: "an unpowered Super Life successor can later receive a choice-driven awakening",
    fn: () => {
      const s = freshLife(8310);
      s.worldType = "superlife";
      const heir = s.chars[s.currentId];
      heir.isPlayer = true;
      heir.age = 20;
      setSeed(8311);
      for (let attempt = 0; attempt < 1000 && !heir.superProfile; attempt++) advanceSuperNpc(s, heir, true);
      assert(heir.superProfile, "unpowered heir never received a potential Super Life profile");
      assert(!heir.superProfile!.powers.some((power) => power.active), "heir's newly acquired ability activated without a choice");
      queueSuperAwakening(s, heir);
      assert(s.pending.some((event) => event.eventId === "super-awakening"), "heir did not receive the awakening choice");
    },
  },
  {
    name: "Super Life actions respect annual locks, train powers, and apply conflict consequences",
    fn: () => {
      setSeed(8303);
      const s = newSuperLife(superLifeSpec(), 0);
      const p = s.chars[s.currentId];
      p.age = 20;
      const ability = p.superProfile!.powers[0];
      assertEqual(superActionLock(s, { type: "train", powerId: ability.powerId }), null, "training unexpectedly locked");
      assert(performSuperAction(s, { type: "train", powerId: ability.powerId }), "training action failed");
      assert(!!superActionLock(s, { type: "train", powerId: ability.powerId }), "training could be repeated in same year");
      ageUp(s);
      assertEqual(superActionLock(s, { type: "activity", path: "hero" }), null, "hero activity unexpectedly locked");
      const fameBefore = p.fame;
      const activityEnergyBefore = ability.energy;
      assert(performSuperAction(s, { type: "activity", path: "hero" }), "hero activity did not resolve");
      assert(p.fame > fameBefore, "public super activity did not integrate with the existing fame system");
      assert(ability.energy < activityEnergyBefore, "public super activity did not spend power energy");
      assert(!!superActionLock(s, { type: "activity", path: "neutral" }), "multiple super activities were allowed in one year");
      ageUp(s);
      const rival = makeNpcPerson(s, 20, p.countryId, p.group);
      rival.superProfile = initialSuperProfile({ originChoice: "born", manifestationAge: 0, powerId: "telekinesis", startWithPower: true, alignment: "neutral", familyBackground: "ordinary", identityPublic: false });
      rival.superProfile.powers = [makePowerState("telekinesis", "innate", true, 30, 40)];
      const energyBefore = ability.energy;
      assert(performSuperAction(s, { type: "conflict", targetId: rival.id }), "conflict did not resolve");
      assert(ability.energy < energyBefore, "conflict had no energy consequence");
      assert(!!superActionLock(s, { type: "conflict", targetId: rival.id }), "multiple conflicts were allowed in one year");
      ability.mastery = 30;
      ability.energy = 50;
      const controlBefore = ability.control;
      assert(performSuperAction(s, { type: "join", organizationId: "civic-shield" }), "eligible hero could not join an agency");
      advanceSuperNpc(s, p, true);
      assert(ability.energy >= 77, "membership did not provide its yearly recovery benefit");
      assert(ability.control > controlBefore, "membership did not provide control mentorship");
    },
  },
  {
    name: "ordinary children and saves never acquire Super Life powers; V1/V2 saves default safely",
    fn: () => {
      const ordinary = freshLife(8304);
      const mother = makeNpcPerson(ordinary, 30, "us", "anglo");
      const father = makeNpcPerson(ordinary, 32, "us", "anglo");
      mother.superProfile = initialSuperProfile({ originChoice: "born", manifestationAge: 0, powerId: "flight", startWithPower: true, alignment: "hero", familyBackground: "super-family", identityPublic: false });
      mother.superProfile.powers = [makePowerState("flight", "innate", true)];
      const child = createChild(ordinary, mother, father);
      assertEqual(child.superProfile, undefined, "ordinary child inherited a Super Life profile");
      const old = JSON.parse(JSON.stringify(ordinary)) as GameState;
      old.version = 2;
      old.worldType = undefined;
      old.chars[old.currentId].superProfile = mother.superProfile;
      const result = migrate(old);
      assertEqual(result.errors.length, 0, "legacy migration failed");
      assertEqual(result.state.worldType, "ordinary", "legacy world did not default to ordinary");
      assertEqual(result.state.chars[result.state.currentId].superProfile, undefined, "stray profile survived ordinary migration");
      assertEqual(result.state.version, 3, "schema did not migrate to v3");
    },
  },
  {
    name: "Super Life save migration clamps data and round-trips profile state",
    fn: () => {
      setSeed(8305);
      const s = newSuperLife(superLifeSpec({ originChoice: "acquired", manifestationAge: 18, startWithPower: true }), 0);
      const p = s.chars[s.currentId];
      p.superProfile!.publicReputation = 999;
      p.superProfile!.powers.push({ powerId: "telekinesis", origin: "acquired", active: true, mastery: 170, control: -5, experience: 3, energy: 150 });
      const normalized = validateState(s);
      assert(normalized.ok && normalized.state, "Super Life save rejected");
      const back = normalized.state!.chars[normalized.state!.currentId].superProfile!;
      assertEqual(back.publicReputation, 100, "reputation was not clamped");
      const power = back.powers.find((entry) => entry.powerId === "telekinesis")!;
      assertEqual(power.mastery, 100, "mastery was not clamped");
      assertEqual(power.control, 0, "control was not clamped");
      assertEqual(power.energy, 100, "energy was not clamped");
      assertEqual(POWER_BY_ID[power.powerId].name, "Telekinesis", "power catalogue entry missing after migration");
      assertEqual(back.alias, "Daybreak", "identity alias lost in migration");
    },
  },
  {
    name: "powered-family inheritance is lineage-limited and screen exposes playable Super Life controls",
    fn: () => {
      setSeed(8306);
      const s = newSuperLife(superLifeSpec({ familyBackground: "super-family" }), 0);
      const p = s.chars[s.currentId];
      const mother = s.chars[p.motherId!];
      const father = s.chars[p.fatherId!];
      mother.superProfile = initialSuperProfile({ originChoice: "born", manifestationAge: 0, powerId: "flight", startWithPower: true, alignment: "hero", familyBackground: "super-family", identityPublic: false });
      mother.superProfile.powers = [makePowerState("flight", "innate", true, 24, 35)];
      let inherited = false;
      for (let index = 0; index < 40 && !inherited; index++) {
        const child = createChild(s, mother, father);
        inherited = !!child.superProfile;
      }
      assert(inherited, "powered child inheritance did not occur across repeated births");
      const noop = () => undefined;
      const g = { state: s, superAction: noop } as unknown as GameApi;
      const markup = renderToStaticMarkup(createElement(SuperScreen, { s, g }));
      assert(markup.includes("Super Life dashboard"), "Super Life dashboard did not render");
      assert(markup.includes("Powers &amp; development"), "power development section missing");
      assert(markup.includes("Organizations"), "organizations section missing");
      assert(markup.includes("Choose how to use your abilities"), "super actions missing");
      const gameMarkup = renderToStaticMarkup(createElement(Game, { g, onMenu: noop }));
      assert(gameMarkup.includes(">Super</button>"), "Super Life did not receive its conditional gameplay tab");
      const ordinary = freshLife(8309);
      const ordinaryApi = { state: ordinary } as unknown as GameApi;
      const ordinaryMarkup = renderToStaticMarkup(createElement(Game, { g: ordinaryApi, onMenu: noop }));
      assert(!ordinaryMarkup.includes(">Super</button>"), "ordinary game received the Super Life gameplay tab");
    },
  },
];
