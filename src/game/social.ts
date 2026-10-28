import type { Char, GameState, LogKind } from "./types";
import { country } from "./world";
import { nominal } from "./economy";
import { clamp, random } from "./rng";

export type NpcInteraction = "introduce" | "talk" | "spend-time" | "compliment" | "gift" | "argue" | "money" | "date" | "breakup";

export interface NpcInteractionOption {
  id: NpcInteraction;
  label: string;
  detail: string;
  cost?: number;
  disabledReason?: string;
}

const COSTS = { gift: 100, money: 250 } as const;
const ACTIONS: Omit<NpcInteractionOption, "disabledReason">[] = [
  { id: "introduce", label: "Introduce Yourself", detail: "Make a first connection." },
  { id: "talk", label: "Talk", detail: "A conversation builds familiarity." },
  { id: "spend-time", label: "Spend Time", detail: "Share an activity and lift both moods." },
  { id: "compliment", label: "Compliment", detail: "A kind word can bring you closer." },
  { id: "gift", label: "Give Gift", detail: "A small, thoughtful present.", cost: COSTS.gift },
  { id: "argue", label: "Argue", detail: "A disagreement can strain the connection." },
  { id: "money", label: "Give Money", detail: "Give a modest one-time amount.", cost: COSTS.money },
  { id: "date", label: "Go on Date", detail: "Ask an eligible adult you know on a date." },
  { id: "breakup", label: "Break Up", detail: "End this relationship. This cannot be undone." },
];

function ancestors(s: GameState, c: Char): Set<string> {
  const found = new Set<string>();
  const visit = (id: string | undefined, depth: number) => {
    if (!id || depth > 4 || found.has(id)) return;
    const parent = s.chars[id];
    if (!parent) return;
    found.add(id);
    visit(parent.motherId, depth + 1);
    visit(parent.fatherId, depth + 1);
  };
  visit(c.motherId, 1);
  visit(c.fatherId, 1);
  return found;
}

function related(s: GameState, a: Char, b: Char): boolean {
  if (a.id === b.motherId || a.id === b.fatherId || b.id === a.motherId || b.id === a.fatherId) return true;
  if (a.childrenIds.includes(b.id) || b.childrenIds.includes(a.id)) return true;
  const aAncestors = ancestors(s, a);
  const bAncestors = ancestors(s, b);
  return aAncestors.has(b.id) || bAncestors.has(a.id) || [...aAncestors].some((id) => bAncestors.has(id));
}

function isKnown(s: GameState, p: Char, target: Char): boolean {
  return p.partnerId === target.id || p.partnerHistory.includes(target.id) || target.partnerHistory.includes(p.id) ||
    p.friends.some((f) => f.id === target.id) || related(s, p, target);
}

function friendScore(c: Char, id: string): number | undefined {
  return c.friends.find((f) => f.id === id)?.value;
}

export function npcRelationshipScore(s: GameState, targetId: string): number | undefined {
  const p = s.chars[s.currentId];
  const target = s.chars[targetId];
  if (!p || !target) return undefined;
  if (p.partnerId === target.id && target.partnerId === p.id) return p.partnerValue ?? target.partnerValue;
  return friendScore(p, target.id);
}

function interactionKey(targetId: string, action: NpcInteraction): string {
  return `npc:${targetId}:${action}`;
}

function contextAllows(s: GameState, target: Char, action: NpcInteraction): boolean {
  const p = s.chars[s.currentId];
  if (!p || !p.alive || s.over || !target.alive || target.id === p.id || target.isPlayer) return false;
  if (action === "introduce") return !isKnown(s, p, target) && p.age >= 3 && target.age >= 3;
  if (action === "talk" || action === "compliment") return p.age >= 3 && target.age >= 3;
  if (action === "spend-time") return p.age >= 3 && target.age >= 3;
  if (action === "argue") return p.age >= 8 && target.age >= 8;
  if (action === "gift") return true;
  if (action === "money") return p.age >= 18;
  if (action === "date") {
    const score = friendScore(p, target.id) ?? 0;
    return p.age >= 18 && target.age >= 18 && Math.abs(p.age - target.age) <= 12 &&
      !p.partnerId && !target.partnerId && !related(s, p, target) &&
      !p.partnerHistory.includes(target.id) && !target.partnerHistory.includes(p.id) && score >= 15;
  }
  return action === "breakup" && p.partnerId === target.id && target.partnerId === p.id;
}

export function npcInteractionOptions(s: GameState, targetId: string): NpcInteractionOption[] {
  const target = s.chars[targetId];
  const p = s.chars[s.currentId];
  if (!target || !p || !p.alive || s.over || !target.alive || target.id === p.id || target.isPlayer) return [];

  return ACTIONS.filter((action) => contextAllows(s, target, action.id)).map((action) => {
    const cost = action.cost ? nominal(action.cost, s.worldYear) : 0;
    let disabledReason: string | undefined;
    if (p.usedActions.includes(interactionKey(target.id, action.id))) disabledReason = "Already done this year.";
    else if (cost > 0 && p.money < cost) disabledReason = `Needs ${cost.toLocaleString()} in your currency.`;
    return { ...action, ...(cost ? { cost } : {}), ...(disabledReason ? { disabledReason } : {}) };
  });
}

export function npcInteractionLock(s: GameState, targetId: string, action: NpcInteraction): string | null {
  const target = s.chars[targetId];
  const p = s.chars[s.currentId];
  if (!target || !p || !contextAllows(s, target, action)) return "This interaction is not available.";
  if (p.usedActions.includes(interactionKey(target.id, action))) return "Already done this year.";
  const price = action === "gift" ? nominal(COSTS.gift, s.worldYear) : action === "money" ? nominal(COSTS.money, s.worldYear) : 0;
  if (price > 0 && p.money < price) return "You cannot afford this right now.";
  return null;
}

function bond(c: Char, otherId: string, delta: number): number {
  let link = c.friends.find((f) => f.id === otherId);
  if (!link) {
    link = { id: otherId, value: 0 };
    c.friends.push(link);
  }
  link.value = Math.round(clamp(link.value + delta, -100, 100));
  return link.value;
}

function applyBond(p: Char, target: Char, delta: number): number {
  if (p.partnerId === target.id && target.partnerId === p.id) {
    p.partnerValue = Math.round(clamp((p.partnerValue ?? 50) + delta));
    target.partnerValue = p.partnerValue;
    return p.partnerValue;
  }
  const fromPlayer = bond(p, target.id, delta);
  bond(target, p.id, delta);
  return fromPlayer;
}

function record(s: GameState, p: Char, kind: LogKind, text: string) {
  s.log.push({ id: s.seq++, year: s.worldYear, age: p.age, text, kind });
  s.log = s.log.slice(-500);
}

function toast(s: GameState, text: string) {
  s.toast = { id: s.seq++, text };
}

export function interactWithNpc(s: GameState, targetId: string, action: NpcInteraction): void {
  if (npcInteractionLock(s, targetId, action)) return;
  const p = s.chars[s.currentId];
  const target = s.chars[targetId];
  if (!p || !target) return;

  const key = interactionKey(target.id, action);
  p.usedActions.push(key);
  switch (action) {
    case "introduce":
      applyBond(p, target, 12);
      record(s, p, "family", `You introduced yourself to ${target.firstName}. A new connection begins.`);
      toast(s, `You met ${target.firstName}.`);
      break;
    case "talk":
      applyBond(p, target, 5);
      record(s, p, "family", `You had a proper conversation with ${target.firstName}.`);
      toast(s, `You talked with ${target.firstName}.`);
      break;
    case "spend-time":
      applyBond(p, target, 9);
      p.happiness = clamp(p.happiness + 2);
      target.happiness = clamp(target.happiness + 2);
      record(s, p, "good", `You spent time with ${target.firstName}. The two of you feel a little closer.`);
      toast(s, `Good time with ${target.firstName}.`);
      break;
    case "compliment":
      applyBond(p, target, 4);
      p.happiness = clamp(p.happiness + 2);
      target.happiness = clamp(target.happiness + 1);
      record(s, p, "good", `You said something kind to ${target.firstName}. It landed well.`);
      toast(s, `A kind word for ${target.firstName}.`);
      break;
    case "gift": {
      const price = nominal(COSTS.gift, s.worldYear);
      p.money -= price;
      target.happiness = clamp(target.happiness + 4);
      applyBond(p, target, 8);
      record(s, p, "money", `You gave ${target.firstName} a gift worth ${price} ${countryCurrency(s, p)}.`);
      toast(s, `Gift sent to ${target.firstName}.`);
      break;
    }
    case "argue":
      applyBond(p, target, -12);
      p.happiness = clamp(p.happiness - 2);
      target.happiness = clamp(target.happiness - 3);
      record(s, p, "bad", `You argued with ${target.firstName}. The tension lingers between you.`);
      toast(s, `You argued with ${target.firstName}.`);
      break;
    case "money": {
      const amount = nominal(COSTS.money, s.worldYear);
      p.money -= amount;
      target.money += amount;
      applyBond(p, target, 6);
      record(s, p, "money", `You gave ${target.firstName} ${amount} ${countryCurrency(s, p)}.`);
      toast(s, `${target.firstName} received the money.`);
      break;
    }
    case "date": {
      const bondValue = friendScore(p, target.id) ?? 0;
      const chance = Math.min(0.85, 0.35 + bondValue / 250 + p.looks / 500 + target.looks / 1000 + (p.traits.includes("charming") ? 0.08 : 0));
      if (random() < chance) {
        p.partnerId = target.id;
        target.partnerId = p.id;
        p.partnerSince = target.partnerSince = s.worldYear;
        p.partnerValue = target.partnerValue = Math.round(clamp(55 + bondValue / 4));
        record(s, p, "family", `You and ${target.firstName} went on a date. By the end, neither of you wanted the evening to stop.`);
        toast(s, `You and ${target.firstName} are together.`);
      } else {
        applyBond(p, target, -3);
        p.happiness = clamp(p.happiness - 2);
        record(s, p, "neutral", `You asked ${target.firstName} on a date. It was a kind no, and the friendship survives.`);
        toast(s, `Not a match with ${target.firstName} — for now.`);
      }
      break;
    }
    case "breakup":
      p.partnerHistory.push(target.id);
      target.partnerHistory.push(p.id);
      p.partnerId = undefined;
      target.partnerId = undefined;
      p.partnerValue = 0;
      target.partnerValue = 0;
      p.happiness = clamp(p.happiness - 8);
      target.happiness = clamp(target.happiness - 8);
      if (p.flags.includes("married")) {
        p.flags.push("divorced");
        target.flags.push("divorced");
      }
      record(s, p, "family", `You and ${target.firstName} ended your relationship. It hurts, and the next chapter is yours to write.`);
      toast(s, `You and ${target.firstName} broke up.`);
      break;
  }
}

function countryCurrency(s: GameState, c: Char): string {
  const countryId = c.countryId || s.chars[s.currentId]?.countryId || "us";
  // Keep social transactions in the existing nominal-money scale.
  return country(countryId).currency.symbol;
}
