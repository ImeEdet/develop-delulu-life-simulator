/* Headless engine smoke test: play many full lives, check invariants. */
import { newRandomLife } from "../src/game/characters";
import { ageUp, continueAs, getEvent } from "../src/game/simulate";
import { runEvent } from "../src/game/events";
import { doAction } from "../src/game/actions";
import type { GameState } from "../src/game/types";

function playYears(s: GameState, years: number) {
  for (let y = 0; y < years && !s.over; y++) {
    ageUp(s);
    while (s.pending.length > 0 && !s.over) {
      const pc = s.pending.shift()!;
      const ev = getEvent(pc.eventId);
      const p = s.chars[s.currentId];
      if (ev) runEvent(s, p, ev, pc.choices[Math.floor(Math.random() * pc.choices.length)]?.id);
    }
    const p = s.chars[s.currentId];
    if (!p.alive) break;
    if (p.age >= 16 && !p.job && !p.uni && Math.random() < 0.6) doAction(s, "jobhunt");
    if (p.age >= 18 && !p.partnerId && Math.random() < 0.4) doAction(s, "date");
    if (p.partnerId && !p.flags.includes("married") && (p.partnerValue ?? 0) >= 65) doAction(s, "propose");
    if (p.partnerId && p.age === 32) doAction(s, "baby");
    if (p.partnerId && p.age === 36) doAction(s, "baby");
    if (p.age === 35 && !p.house) doAction(s, "house");
    if (p.age === 45 && !p.car) doAction(s, "car");
    if (p.job && p.age % 4 === 0) doAction(s, "promote");
    if (p.age === 25) doAction(s, "exercise");
  }
}

let problems = 0;
const bad = (m: string) => {
  problems++;
  console.log("PROBLEM:", m);
};

for (let trial = 0; trial < 60; trial++) {
  let s = newRandomLife(0);
  playYears(s, 115);
  const p = s.chars[s.currentId];

  // invariants
  for (const c of Object.values(s.chars)) {
    if (c.partnerId && !s.chars[c.partnerId]) bad(`trial ${trial}: broken partner ref ${c.id}`);
    for (const k of c.childrenIds) if (!s.chars[k]) bad(`trial ${trial}: broken child ref in ${c.id}`);
    if (c.motherId && !s.chars[c.motherId]) bad(`trial ${trial}: broken mother ref`);
    if (c.fatherId && !s.chars[c.fatherId]) bad(`trial ${trial}: broken father ref`);
    if (!c.alive && c.deathYear === undefined) bad(`trial ${trial}: dead without deathYear`);
    for (const k of ["health", "happiness", "smarts", "looks"] as const) {
      if (c[k] < 0 || c[k] > 100) bad(`trial ${trial}: stat out of range ${c.firstName} ${k}=${c[k]}`);
    }
  }
  if (!s.over) bad(`trial ${trial}: player alive after 115 years of play (age ${p.age})`);
  if (s.log.length > 500) bad(`trial ${trial}: log not capped (${s.log.length})`);
  if (s.pending.length > 0 && !s.over) bad(`trial ${trial}: pending not cleared`);

  // continue with a child if possible
  const kids = p.childrenIds.map((id) => s.chars[id]).filter((k) => k && k.alive);
  if (kids.length > 0) {
    continueAs(s, kids[Math.floor(Math.random() * kids.length)].id);
    if (s.over) bad(`trial ${trial}: continueAs failed to clear over`);
    playYears(s, 115 - s.chars[s.currentId].age);
    if (!s.over) bad(`trial ${trial}: gen2 alive after 115 (age ${s.chars[s.currentId].age})`);
  }

  const cur = s.chars[s.currentId];
  if (trial % 10 === 0) {
    console.log(
      `trial ${trial}: gen${s.generation} ${cur.firstName} age ${cur.age} · chars=${Object.keys(s.chars).length} log=${s.log.length} money=${Math.round(cur.money)} kids=${cur.childrenIds.length}`
    );
  }
}

console.log(problems === 0 ? "SMOKE TEST PASSED ✔" : `SMOKE TEST FAILED with ${problems} problems`);
