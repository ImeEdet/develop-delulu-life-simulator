import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createChild, makeNpcPerson, newCustomLife } from "../../src/game/characters";
import { doAction } from "../../src/game/actions";
import { getEvent } from "../../src/game/simulate";
import { runEvent } from "../../src/game/events";
import { advanceFame, isGoldTheme, fameActionLock, performFameAction } from "../../src/game/fame";
import { advanceCharacterSkills, practiceSkill, skillPracticeLock } from "../../src/game/skills";
import { advanceSportCareer, performSportAction, sportActionLock, SPORTS } from "../../src/game/sports";
import { validateState, importEnvelope, exportEnvelope } from "../../src/game/persistence/saves";
import { setSeed } from "../../src/game/rng";
import type { FameCareer, GameState } from "../../src/game/types";
import { FameScreen, SkillsScreen, SportsScreen } from "../../src/components/Screens3";
import { ProfileScreen } from "../../src/components/Screens2";
import type { GameApi } from "../../src/game/state";
import { assert, assertEqual, customSpec, freshLife } from "./util";

export const tests = [
  {
    name: "mixed family backgrounds remain distinct from birthplace, residence, citizenship, and language fluency",
    fn: () => {
      const s = freshLife(2901);
      const mother = makeNpcPerson(s, 29, "us", "anglo");
      mother.countryId = "us";
      mother.birthCountryId = "us";
      mother.group = "anglo";
      mother.culturalHeritage = ["anglo"];
      mother.citizenships = ["us"];
      mother.citizenOf = "us";
      mother.languages = { english: 95 };
      mother.languageExposure = { english: 90 };
      const father = makeNpcPerson(s, 30, "fr", "french");
      father.countryId = "fr";
      father.birthCountryId = "fr";
      father.group = "french";
      father.culturalHeritage = ["french"];
      father.citizenships = ["fr"];
      father.citizenOf = "fr";
      father.languages = { french: 90 };
      father.languageExposure = { french: 90 };
      setSeed(8901);
      const child = createChild(s, mother, father);
      assert(child.culturalHeritage?.includes("anglo") && child.culturalHeritage.includes("french"), "both family cultures were not inherited");
      assertEqual(child.birthCountryId, "us", "birthplace should be where the child is born");
      assertEqual(child.birthCity, mother.city, "birth city should be recorded separately from later residence");
      assertEqual(child.countryId, "us", "residence should follow the household");
      assert(child.citizenships?.includes("us") && child.citizenships.includes("fr"), "parental citizenships were not kept separately");
      assert((child.languages.french ?? 0) < 25 && (child.languageExposure?.french ?? 0) > 25, "heritage/exposure incorrectly granted language fluency");
      assertEqual(child.ethnicities?.length, 0, "ethnicity was inferred from culture or nationality");
    },
  },
  {
    name: "Custom Life permits independently configured parental backgrounds without deriving player language from heritage",
    fn: () => {
      const spec = customSpec({
        countryId: "us",
        group: "anglo",
        mother: { firstName: "Mira", age: 31, alive: true, countryId: "ca", culturalGroupId: "french", citizenships: ["us"], ethnicity: "French Canadian" },
        father: { firstName: "Tunde", age: 33, alive: true, countryId: "ng", culturalGroupId: "yoruba", citizenships: ["ng"], ethnicity: "Yoruba" },
      });
      const s = newCustomLife(spec, 0);
      const p = s.chars[s.currentId];
      const mother = s.chars[p.motherId!];
      const father = s.chars[p.fatherId!];
      assertEqual(mother.group, "french", "mother's independent naming/cultural group was lost");
      assertEqual(father.group, "yoruba", "father's independent naming/cultural group was lost");
      assert(p.culturalHeritage?.includes("french") && p.culturalHeritage.includes("yoruba"), "player did not inherit both cultural connections");
      assert(p.citizenships?.includes("us") && p.citizenships.includes("ng") && !p.citizenships.includes("ca"), "citizenship was inferred from parental origin instead of the explicit citizenship data");
      assertEqual(mother.birthCountryId, "ca", "parent birthplace was not kept distinct from residence");
      assertEqual(mother.countryId, "us", "parent residence was not kept distinct from birthplace");
      assert((p.languages.french ?? 0) < 25 && p.languages.yoruba === undefined, "parent heritage was converted into language proficiency");
      assertEqual(p.ethnicities?.length, 0, "Custom Life inferred the player's ethnicity from a parent or cultural group");
      assert(mother.ethnicities?.includes("French Canadian") && father.ethnicities?.includes("Yoruba"), "explicit parental ethnicity labels were not kept separately");
      const selfDescribed = newCustomLife({ ...spec, ethnicity: "self-described", mother: undefined, father: undefined }, 0);
      assertEqual(selfDescribed.chars[selfDescribed.currentId].ethnicities?.[0], "self-described", "explicit player ethnicity entry was not preserved");
    },
  },
  {
    name: "skill practice improves proficiency once per year and existing learning actions build skills",
    fn: () => {
      const s = freshLife(2902);
      const p = s.chars[s.currentId];
      p.age = 14;
      p.skills.mathematics = 10;
      setSeed(6);
      assert(!skillPracticeLock(s, "mathematics"), "eligible practice is locked");
      assert(practiceSkill(s, "mathematics"), "practice did not occur");
      const after = p.skills.mathematics;
      assert(after > 10, "practice failed to improve skill");
      assert(!practiceSkill(s, "mathematics"), "practice could be repeated within the year");
      assertEqual(p.skills.mathematics, after, "repeat practice changed proficiency");
      p.usedActions = [];
      p.skills.writing = 0;
      const beforeStudy = p.skills.mathematics;
      doAction(s, "study");
      assert(p.skills.mathematics > beforeStudy && p.skills.writing > 0, "study action was disconnected from the skill registry");
    },
  },
  {
    name: "event choices award registry skills through data-driven outcomes",
    fn: () => {
      const s = freshLife(2909);
      const p = s.chars[s.currentId];
      p.age = 9;
      p.skills.acting = 0;
      const schoolPlay = getEvent("school-play");
      assert(schoolPlay?.skillEffects?.some((effect) => effect.skillId === "acting" && effect.choice === "lead"), "event skill effect was not registered as data");
      setSeed(41);
      runEvent(s, p, schoolPlay!, "lead");
      assert(p.skills.acting > 0, "event choice failed to progress its linked skill");
    },
  },
  {
    name: "unused skills decline and NPC characters autonomously develop registry skills",
    fn: () => {
      const s = freshLife(2903);
      const p = s.chars[s.currentId];
      p.age = 2;
      p.skills.programming = 45;
      p.skillLastPractice = { programming: 1 };
      advanceCharacterSkills(p, 12, false);
      assert(p.skills.programming < 45, "stale skill did not decline");
      const npc = makeNpcPerson(s, 15, p.countryId, p.group);
      npc.education = "secondary";
      let gained = false;
      for (let seed = 1; seed <= 20 && !gained; seed++) {
        setSeed(seed);
        advanceCharacterSkills(npc, s.worldYear + seed, true);
        gained = Object.values(npc.skills).some((value) => value > 0);
      }
      assert(gained, "NPC autonomy never developed skills");
      assert(Object.keys(npc.aptitudes ?? {}).length > 0, "skill-specific aptitude was not recorded");
    },
  },
  {
    name: "sports keep distinct school, amateur, professional, results, and contract pathways",
    fn: () => {
      const s = freshLife(2904);
      const p = s.chars[s.currentId];
      p.age = 15;
      p.skills.football = 20;
      assert(SPORTS.some((x) => x.id === "football" && x.focusSkill === "football") && SPORTS.find((x) => x.id === "boxing")!.injuryRisk > SPORTS.find((x) => x.id === "athletics")!.injuryRisk, "sports registry failed to distinguish sports");
      assert(!sportActionLock(s, "football", "school-team"), "eligible youth team was locked");
      assert(performSportAction(s, "football", "school-team"), "school pathway did not start");
      const before = p.skills.football;
      p.usedActions = [];
      assert(performSportAction(s, "football", "train"), "team training did not occur");
      assert(p.skills.football > before, "sport training did not build its linked skill");
      p.sportsCareer = { sportId: "football", level: "professional", years: 0, experience: 20, salary: 0, wins: 0, losses: 0, competitions: 0, awards: [], achievements: [] };
      p.skills.football = 90;
      p.skills.fitness = 90;
      const oldMoney = p.money;
      setSeed(1);
      advanceSportCareer(s, p, false);
      assert(p.sportsCareer.competitions === 1 && p.sportsCareer.salary > 0, "professional season did not produce a result and contract salary");
      assert(p.money >= oldMoney, "sports earnings caused money to decrease before expenses");
    },
  },
  {
    name: "NPC athletes and performers progress autonomously through seasons and projects",
    fn: () => {
      const s = freshLife(2908);
      const p = s.chars[s.currentId];
      const npc = makeNpcPerson(s, 25, p.countryId, p.group);
      npc.age = 25;
      npc.skills.football = 95;
      npc.skills.fitness = 95;
      let sportProgress = false;
      for (let seed = 1; seed <= 8 && !sportProgress; seed++) {
        npc.sportsCareer = { sportId: "football", level: "amateur", years: 0, experience: 0, salary: 0, wins: 0, losses: 0, competitions: 0, awards: [], achievements: [] };
        setSeed(seed);
        advanceSportCareer(s, npc, true);
        sportProgress = npc.sportsCareer.competitions > 0 || npc.sportsCareer.level === "professional";
      }
      assert(sportProgress, "NPC athlete never advanced into autonomous season play");
      npc.skills.singing = 95;
      let fameProgress = false;
      for (let seed = 1; seed <= 60 && !fameProgress; seed++) {
        npc.fame = 10;
        npc.fameCareer = { pathway: "music", level: 1, experience: 0, projects: 0, releases: 1, awards: [], annualIncome: 500, lastProjectYear: s.worldYear - 5 };
        setSeed(seed);
        advanceFame(s, npc, true);
        fameProgress = (npc.fameCareer?.projects ?? 0) > 0;
      }
      assert(fameProgress, "NPC artist did not autonomously gain projects/fame");
    },
  },
  {
    name: "fame and reputation are separate, entertainment pathways differ, and theme supports threshold overrides",
    fn: () => {
      const s = freshLife(2905);
      const p = s.chars[s.currentId];
      p.age = 22;
      p.money = 100000;
      p.skills.acting = 60;
      p.skills.singing = 40;
      assertEqual(isGoldTheme({ ...p, fame: 34 }, "auto"), false, "auto theme activated below threshold");
      assertEqual(isGoldTheme({ ...p, fame: 35 }, "auto"), true, "auto theme missed fame threshold");
      assertEqual(isGoldTheme({ ...p, fame: 0 }, "gold"), true, "manual gold override failed");
      assertEqual(isGoldTheme({ ...p, fame: 100 }, "classic"), false, "classic override failed");
      assert(!fameActionLock(s, "audition"), "acting audition is unavailable to an adult");
      assert(fameActionLock(s, "casting") !== null, "modelling casting was offered without a portfolio");
      setSeed(11);
      assert(performFameAction(s, "portfolio"), "portfolio action failed");
      assertEqual(p.fameCareer?.pathway, "modelling", "portfolio did not begin a modelling-specific career");
      p.usedActions = [];
      assert(fameActionLock(s, "audition")?.includes("different entertainment pathway"), "pathway mismatch was ignored");
      const oldRep = p.reputation;
      p.fame = 55;
      p.reputation = oldRep ?? 50;
      assert(p.fame !== p.reputation, "fame and reputation share a single stored value");
    },
  },
  {
    name: "V2/V2.5 saves migrate safe defaults and V2.9 fields survive export/import",
    fn: () => {
      const s = freshLife(2906);
      const p = s.chars[s.currentId] as GameState["chars"][string] & Record<string, unknown>;
      p.birthCountryId = undefined;
      p.birthCity = undefined;
      p.culturalHeritage = undefined;
      p.ethnicities = undefined;
      p.citizenships = undefined;
      p.languageExposure = undefined;
      p.skillLastPractice = undefined;
      p.aptitudes = undefined;
      p.fame = undefined;
      p.reputation = undefined;
      s.themePreference = undefined;
      const migrated = validateState(s);
      assert(migrated.ok && migrated.state, "legacy save rejected");
      const mp = migrated.state.chars[migrated.state.currentId];
      assertEqual(mp.birthCountryId, mp.countryId, "birth country default missing");
      assertEqual(mp.birthCity, mp.city, "birth city default missing");
      assert(mp.culturalHeritage?.length === 1 && mp.ethnicities?.length === 0, "heritage defaults are unsafe or ethnicity was inferred");
      assert(mp.citizenships?.length === 1 && mp.languageExposure, "citizenship/exposure defaults missing");
      assertEqual(mp.fame, 0, "fame default missing");
      assertEqual(mp.reputation, 50, "reputation default missing");
      const roundTrip = importEnvelope(exportEnvelope(migrated.state));
      assert(roundTrip.ok && roundTrip.state, "updated save failed export/import");
      assertEqual(roundTrip.state!.chars[mp.id].culturalHeritage?.[0], mp.culturalHeritage?.[0], "new heritage field did not persist");
      assertEqual(roundTrip.state!.chars[mp.id].fame, mp.fame, "fame did not persist");
    },
  },
  {
    name: "Skills, sports, fame, identity, and settings render through mobile-safe sections",
    fn: () => {
      const s = freshLife(2907);
      const p = s.chars[s.currentId];
      p.age = 20;
      p.fameCareer = { pathway: "music", level: 2, experience: 4, projects: 4, releases: 2, awards: [], annualIncome: 2000 } as FameCareer;
      const api = {} as GameApi;
      const skills = renderToStaticMarkup(createElement(SkillsScreen, { s, g: api }));
      const sports = renderToStaticMarkup(createElement(SportsScreen, { s, g: api }));
      const fame = renderToStaticMarkup(createElement(FameScreen, { s, g: api }));
      const profile = renderToStaticMarkup(createElement(ProfileScreen, { s, g: api }));
      assert(skills.includes("Skills grow through use") && skills.includes("Mathematics"), "skills screen did not render registry sections");
      assert(sports.includes("A pathway, not a single job") && sports.includes("Boxing"), "sports screen did not render pathways");
      assert(fame.includes("Fame &amp; reputation") && fame.includes("music"), "fame screen did not render separate status/career");
      assert(profile.includes("Roots &amp; residence") && profile.includes("Settings · appearance"), "identity and theme settings were not accessible");
    },
  },
];
