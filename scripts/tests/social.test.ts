import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FamilyScreen } from "../../src/components/Screens";
import { NpcProfile } from "../../src/components/NpcProfile";
import type { GameApi } from "../../src/game/state";
import { fullName, makeNpcPerson } from "../../src/game/characters";
import { interactWithNpc, npcInteractionLock, npcInteractionOptions, npcRelationshipScore } from "../../src/game/social";
import { validateState } from "../../src/game/persistence/saves";
import { setSeed } from "../../src/game/rng";
import { assert, assertEqual, freshLife } from "./util";

function adultFixture(seed = 9201) {
  const s = freshLife(seed);
  const p = s.chars[s.currentId];
  p.age = 28;
  p.alive = true;
  p.money = 10000;
  p.partnerId = undefined;
  p.partnerHistory = [];
  const friend = makeNpcPerson(s, 27, p.countryId, p.group);
  friend.isPlayer = false;
  p.friends.push({ id: friend.id, value: 25 });
  friend.friends.push({ id: p.id, value: 25 });
  return { s, p, friend };
}

export const tests = [
  {
    name: "NPC references use a single character ID and social bonds update in both directions",
    fn: () => {
      const { s, p, friend } = adultFixture();
      interactWithNpc(s, friend.id, "talk");
      assertEqual(npcRelationshipScore(s, friend.id), 30, "player bond did not increase");
      assertEqual(friend.friends.find((f) => f.id === p.id)?.value, 30, "NPC's reciprocal bond did not increase");
      assert(p.usedActions.includes(`npc:${friend.id}:talk`), "the targeted interaction was not recorded against the NPC ID");
    },
  },
  {
    name: "social actions persist through the existing V2 save migration without adding character records",
    fn: () => {
      const { s, p, friend } = adultFixture();
      const beforeCount = Object.keys(s.chars).length;
      interactWithNpc(s, friend.id, "spend-time");
      const roundTrip = validateState(JSON.parse(JSON.stringify(s)));
      assert(roundTrip.ok && roundTrip.state, "existing save migration rejected the updated state");
      assertEqual(Object.keys(roundTrip.state.chars).length, beforeCount, "interaction duplicated NPC state");
      assertEqual(roundTrip.state.chars[p.id].friends.find((f) => f.id === friend.id)?.value, 34, "player relationship score did not persist");
      assert(roundTrip.state.chars[p.id].usedActions.includes(`npc:${friend.id}:spend-time`), "yearly interaction lock did not persist");
    },
  },
  {
    name: "gift and money actions debit exactly once and cannot overspend",
    fn: () => {
      const { s, p, friend } = adultFixture();
      const initial = p.money;
      const gift = npcInteractionOptions(s, friend.id).find((x) => x.id === "gift");
      assert(gift?.cost, "gift cost missing");
      p.money = gift.cost - 1;
      assert(!!npcInteractionLock(s, friend.id, "gift"), "unaffordable gift was not locked");
      interactWithNpc(s, friend.id, "gift");
      assertEqual(p.money, gift.cost - 1, "unaffordable gift changed player finances");
      p.money = initial;
      const recipientBefore = friend.money;
      interactWithNpc(s, friend.id, "money");
      const amount = npcInteractionOptions(s, friend.id).find((x) => x.id === "money")?.cost;
      assert(amount, "money transfer amount missing");
      assertEqual(p.money, initial - amount, "money was not debited by the fixed amount");
      assertEqual(friend.money, recipientBefore + amount, "recipient did not receive the transfer");
      interactWithNpc(s, friend.id, "money");
      assertEqual(p.money, initial - amount, "same-year repeat transfer was exploited");
    },
  },
  {
    name: "deceased NPC profiles offer no social actions and social commands are no-ops",
    fn: () => {
      const { s, p, friend } = adultFixture();
      friend.alive = false;
      friend.deathYear = s.worldYear;
      friend.causeOfDeath = "illness";
      const money = p.money;
      const before = JSON.stringify(p.friends);
      assertEqual(npcInteractionOptions(s, friend.id).length, 0, "deceased NPC still has actions");
      interactWithNpc(s, friend.id, "gift");
      assertEqual(p.money, money, "deceased NPC accepted a gift");
      assertEqual(JSON.stringify(p.friends), before, "deceased NPC relationship changed");
    },
  },
  {
    name: "romance cannot target relatives or minors and breakup blocks rematching with an ex",
    fn: () => {
      const { s, p, friend } = adultFixture();
      friend.age = 17;
      assert(!npcInteractionOptions(s, friend.id).some((x) => x.id === "date"), "underage NPC was offered a date");
      friend.age = 28;
      friend.motherId = p.id;
      assert(!npcInteractionOptions(s, friend.id).some((x) => x.id === "date"), "relative NPC was offered a date");
      friend.motherId = undefined;
      p.partnerId = friend.id;
      friend.partnerId = p.id;
      p.partnerValue = friend.partnerValue = 70;
      assert(npcInteractionOptions(s, friend.id).some((x) => x.id === "breakup"), "current partner cannot be broken up with");
      interactWithNpc(s, friend.id, "breakup");
      assertEqual(p.partnerId, undefined, "player remained partnered after breakup");
      assertEqual(friend.partnerId, undefined, "NPC remained partnered after breakup");
      assert(p.partnerHistory.includes(friend.id) && friend.partnerHistory.includes(p.id), "former partner history was not retained");
      assert(!npcInteractionOptions(s, friend.id).some((x) => x.id === "date"), "ex could be asked on a date again");
    },
  },
  {
    name: "date success links the selected NPC as the mutual partner without creating a duplicate character",
    fn: () => {
      const { s, p, friend } = adultFixture();
      p.friends.find((f) => f.id === friend.id)!.value = 100;
      friend.friends.find((f) => f.id === p.id)!.value = 100;
      p.looks = friend.looks = 100;
      p.traits.push("charming");
      setSeed(7);
      const count = Object.keys(s.chars).length;
      interactWithNpc(s, friend.id, "date");
      assertEqual(Object.keys(s.chars).length, count, "date created a duplicate NPC instead of using the selected ID");
      assertEqual(p.partnerId, friend.id, "the selected NPC did not become the player's partner");
      assertEqual(friend.partnerId, p.id, "the partnership was not mutual");
    },
  },
  {
    name: "introductions, compliments, and arguments update bonds and moods contextually",
    fn: () => {
      const { s, p, friend } = adultFixture();
      p.friends = p.friends.filter((link) => link.id !== friend.id);
      friend.friends = friend.friends.filter((link) => link.id !== p.id);
      assert(npcInteractionOptions(s, friend.id).some((x) => x.id === "introduce"), "unknown NPC did not allow an introduction");
      interactWithNpc(s, friend.id, "introduce");
      assertEqual(npcRelationshipScore(s, friend.id), 12, "introduction did not establish a bond");
      const beforeCompliment = p.happiness;
      interactWithNpc(s, friend.id, "compliment");
      assertEqual(p.happiness, beforeCompliment + 2, "compliment did not affect player happiness");
      const beforeArgument = npcRelationshipScore(s, friend.id)!;
      const moodBefore = friend.happiness;
      interactWithNpc(s, friend.id, "argue");
      assertEqual(npcRelationshipScore(s, friend.id), beforeArgument - 12, "argument did not damage relationship");
      assertEqual(friend.happiness, moodBefore - 3, "argument did not affect NPC mood");
    },
  },
  {
    name: "Family entries and NPC details expose accessible, ID-based profile controls",
    fn: () => {
      const { s, friend } = adultFixture();
      const parentId = s.chars[s.currentId].motherId ?? s.chars[s.currentId].fatherId;
      assert(parentId, "fixture has no parent NPC");
      const familyMarkup = renderToStaticMarkup(createElement(FamilyScreen, { s, onSelectNpc: () => {} }));
      const parent = s.chars[parentId];
      assert(familyMarkup.includes(`View ${parent.firstName} ${parent.lastName}, mother, profile`) || familyMarkup.includes(`View ${parent.firstName} ${parent.lastName}, father, profile`), "family card was not an accessible button for its NPC ID");
      const profileMarkup = renderToStaticMarkup(createElement(NpcProfile, { s, g: {} as GameApi, targetId: friend.id, onClose: () => {} }));
      assert(profileMarkup.includes('role="dialog"') && /id="npc-profile-title"[^>]*>/.test(profileMarkup) && profileMarkup.includes(fullName(friend)), "selected ID did not render the requested character profile");
      friend.alive = false;
      const deadMarkup = renderToStaticMarkup(createElement(NpcProfile, { s, g: {} as GameApi, targetId: friend.id, onClose: () => {} }));
      assert(deadMarkup.includes("This profile is read-only.") && !deadMarkup.includes("Interactions</h3>"), "deceased profile was not read-only");
    },
  },
];
