import type { Char, EventCtx, GameState, LifeEvent } from "./types";
import { country, LANGS } from "./world";
import {
  CARS, EMPLOYERS, JOBS, MAJOR_LIST,
  eligibleJobs, hasFluency, suggestedMajor, traitMod,
} from "./content";
import { clamp, createChild, pick } from "./characters";
import { nominalSalary } from "./economy";
import { random } from "./rng";

export function makeCtx(s: GameState, p: Char): EventCtx {
  const rnd = random;
  return {
    s,
    p,
    rnd,
    chance: (c) => rnd() < c,
    pick: (arr) => arr[Math.floor(rnd() * arr.length)],
    range: (a, b) => a + Math.floor(rnd() * (b - a + 1)),
    log: (kind, text) => {
      s.log.push({ id: s.seq++, year: s.worldYear, age: p.age, text, kind });
      s.log = s.log.slice(-500);
    },
    toast: (text) => {
      s.toast = { id: s.seq++, text };
    },
    other: (id) => (id ? s.chars[id] : undefined),
  };
}

export function runEvent(s: GameState, p: Char, ev: LifeEvent, choice?: string) {
  const e = makeCtx(s, p);
  ev.run(e, choice);
  // Event penalties must never leave a wallet below zero.
  p.money = Math.max(0, Math.round(p.money));
  if (ev.once && !p.flags.includes(ev.id)) p.flags.push(ev.id);
  p.eventCooldowns[ev.id] = s.worldYear + (ev.cool ?? 5);
}

const MJ = (id: string) => MAJOR_LIST.find((m) => m.id === id)?.name ?? id;
const st = (e: EventCtx, k: "health" | "happiness" | "smarts" | "looks", d: number) => {
  e.p[k] = clamp(e.p[k] + d);
};
const bestFriend = (e: EventCtx) => (e.p.friends.length ? e.other(e.p.friends[0].id) : undefined);
const sib = (e: EventCtx) =>
  Object.values(e.s.chars).find(
    (c) =>
      c.id !== e.p.id &&
      c.alive &&
      (e.p.motherId != null && c.motherId === e.p.motherId || e.p.fatherId != null && c.fatherId === e.p.fatherId)
  );
const grandparent = (e: EventCtx) => {
  const m = e.other(e.p.motherId);
  const f = e.other(e.p.fatherId);
  return e.other(m?.motherId ?? m?.fatherId) ?? e.other(f?.motherId ?? f?.fatherId);
};
const grandkid = (e: EventCtx) => {
  for (const kid of e.p.childrenIds) {
    const g = e.other(kid)?.childrenIds[0];
    if (g) return e.other(g);
  }
  return undefined;
};

function landJob(e: EventCtx, jobId: string) {
  const def = JOBS[jobId];
  if (!def) return;
  const employer = pick(EMPLOYERS);
  e.p.job = { jobId, seniority: 0, salary: nominalSalary(e.p, def, 0, e.s.worldYear), years: 0, employer };
  e.log("career", `${employer} hired you as ${def.title}. ${def.desc}`);
  if (!e.p.flags.includes("first-job")) {
    e.p.flags.push("first-job");
    e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: `First job: ${def.title}` });
    e.log("milestone", "First real paycheck in your life. It feels like a small, loud superpower.");
  }
}

export const EVENTS: LifeEvent[] = [
  // ================= SCRIPTED =================
  {
    id: "crush", title: "Something Fluttery", weight: 0, scripted: true, minAge: 13, maxAge: 17, once: true,
    text: (e) => {
      const f = bestFriend(e);
      const n = f?.firstName ?? e.pick(["a very specific person", "someone in the next seat", "your secret"]);
      return `Something flutters in your chest when ${n} walks into the classroom. It might be love. It might be a bug.`;
    },
    choices: () => [
      { id: "confess", label: "Confess before the bell", hint: "Big. Possibly very big." },
      { id: "letter", label: "Write a secret letter", hint: "Never to be sent. Probably." },
      { id: "pretend", label: "Pretend nothing is happening" },
    ],
    run: (e, choice) => {
      const f = bestFriend(e);
      const n = f?.firstName ?? "them";
      if (choice === "confess") {
        if (e.chance(0.35 + traitMod(e.p, "charm") * 0.1)) {
          st(e, "happiness", 6);
          e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: "The first yes" });
          e.log("good", `You confessed. ${n} laughed, then said yes to "whatever this is". You both walked home like it was normal. It was not normal.`);
        } else {
          st(e, "happiness", -4);
          e.log("neutral", `You confessed. The silence lasted four seconds, which is a long time. ${n} is fine. You are also fine. Mostly.`);
        }
      } else if (choice === "letter") {
        st(e, "happiness", 2);
        e.log("neutral", "The letter stays in your desk for three years. You find it while cleaning. You still don't remember what was in it. It was beautiful.");
      } else {
        st(e, "happiness", -2);
        e.log("neutral", "You became an expert at pretending. It pays off later in life, in ways you never expected.");
      }
    },
  },
  {
    id: "crossroads", title: "The Crossroads", weight: 0, scripted: true, minAge: 18, maxAge: 22,
    text: (e) => {
      const retry = e.p.flags.includes("f18-retry");
      const major = MJ(e.p.plannedMajor ?? suggestedMajor(e.p));
      return retry
        ? `Still ${e.p.age}. The crossroads is patient. (${e.p.examScore ?? 40} exam score, ${e.p.money < 8000 ? "pockets lighter than a church mouse" : "enough saved for a big swing"})`
        : `You're ${e.p.age}. The map is open: university in ${major} (exam score ${e.p.examScore ?? 40}/100), jobs, the whole wild world.`;
    },
    choices: (e) => {
      const major = e.p.plannedMajor ?? suggestedMajor(e.p);
      const out = [{ id: `uni:${major}`, label: `Go to university — ${MJ(major)}`, hint: "Four years. One enormous bet." }];
      out.push({ id: "work", label: "Start working now", hint: "Money first, dreams at night." });
      if (e.p.money >= 8000) out.push({ id: "travel", label: "Travel for a year", hint: "$8K and one backpack." });
      out.push({ id: "parttime", label: "Part-time, figure it out", hint: "Safe. Slow. A little gray." });
      return out;
    },
    run: (e, choice) => {
      if (choice && choice.startsWith("uni:")) {
        const major = choice.slice(4);
        const score = e.p.examScore ?? 40;
        if (score >= 55) {
          e.p.uni = { year: 1, major, gpa: 50 };
          e.p.flags.push("f18");
          e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: "Started university" });
          e.log("good", `You enrolled in ${MJ(major)} in ${e.p.city}. Lectures cost money and quietly change lives.`);
        } else {
          e.p.flags.push("f18-retry");
          st(e, "happiness", -4);
          e.log("bad", `The university reply was polite, then final: rejected. Exam score ${score}/100, they needed more. You can try again next year — or start working.`);
        }
      } else if (choice === "work") {
        const jobs = eligibleJobs(e.p).sort((a, b) => b.salary - a.salary).slice(0, 3);
        if (jobs.length && e.chance(0.65)) {
          e.p.flags.push("f18");
          landJob(e, jobs[0].id);
        } else {
          e.p.flags.push("f18-retry");
          e.log("bad", "You knocked on twelve doors; eleven were locked. The twelfth wanted a reference. Next year.");
        }
      } else if (choice === "travel") {
        e.p.money -= 8000;
        st(e, "happiness", 9);
        e.p.flags.push("f18-retry");
        e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: "A year on the road" });
        e.log("good", "You spent a year chasing trains and cheap hostels. The world got bigger; your wallet got smaller; somehow both were worth it.");
      } else {
        e.p.money += 3500;
        e.p.flags.push("f18-retry");
        e.log("neutral", "You took a part-time job and started doing your thinking outdoors, on the break.");
      }
    },
  },
  {
    id: "uni-offer", title: "Offers on the Table", weight: 0, scripted: true, minAge: 22, maxAge: 30,
    text: () => "Graduation season. Three offers on the table, one nervous heart.",
    choices: (e) => {
      const jobs = eligibleJobs(e.p)
        .filter((j) => j.edu === "university")
        .sort((a, b) => b.salary - a.salary)
        .slice(0, 3);
      return [
        ...jobs.map((j) => ({ id: `job:${j.id}`, label: `${j.title}`, hint: `${j.desc}` })),
        { id: "later", label: "Take your time", hint: "The market waits. (Barely.)" },
      ];
    },
    run: (e, choice) => {
      if (choice && choice.startsWith("job:")) landJob(e, choice.slice(4));
      else e.log("neutral", "You took a season to decide. The offers aged like milk, but you kept your peace.");
    },
  },
  {
    id: "retire-offer", title: "The Pension Letter", weight: 0, scripted: true, minAge: 60, maxAge: 99,
    text: (e) => `The pension letter arrived. It reads like a victory lap. Your ${e.p.job ? JOBS[e.p.job.jobId]?.title : "career"} has been a good friend.`,
    choices: () => [
      { id: "retire", label: "Retire now", hint: "The alarm clock becomes a stranger." },
      { id: "half", label: "Work half-time", hint: "Half the stress, half the pride." },
      { id: "keep", label: "Keep the job", hint: "You are not done. You are never done." },
    ],
    run: (e, choice) => {
      const j = e.p.job;
      if (choice === "retire" && j) {
        e.p.pension = Math.round(j.salary * 0.45);
        e.p.job = null;
        e.p.retired = true;
        e.p.flags.push("fretire");
        e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: "Retired" });
        e.log("milestone", `You retired at ${e.p.age}. The alarm clock is now a stranger. You are a stranger to rushing.`);
      } else if (choice === "half" && j) {
        e.p.pension = Math.round(j.salary * 0.2);
        j.salary = Math.round(j.salary * 0.5);
        e.p.flags.push("fretire", "half-retire");
        e.log("good", "You switched to half-time. The meetings got shorter. The tea got better.");
      } else {
        e.p.flags.push("fretire-later");
        e.log("neutral", "You kept the job. The job, somehow, kept you.");
      }
    },
  },
  {
    id: "pregnancy", title: "Two Lines", weight: 0, scripted: true, minAge: 17, maxAge: 52,
    text: (e) => {
      const par = e.other(e.p.partnerId);
      return `It's two lines. ${par?.firstName ?? "Your partner"} is doing a slow dance in the kitchen to absolutely nothing.`;
    },
    choices: (e) => {
      const out = [{ id: "raise", label: "We're doing this!", hint: "Tiny chaos engine, incoming." }];
      if (!e.p.flags.includes("married")) out.push({ id: "marryfirst", label: "Get married first", hint: "Rings, then diapers." });
      out.push({ id: "talk", label: "We need to talk first", hint: "Four hours of talking. Minimum." });
      return out;
    },
    run: (e, choice) => {
      const par = e.other(e.p.partnerId);
      if (!par) return;
      const mother = e.p.gender === "female" ? e.p : par.gender === "female" ? par : undefined;
      if (!mother) {
        e.log("neutral", "You two make plans and scrapbooks instead; the adoption office keeps the door open.");
        return;
      }
      const father = mother === e.p ? par : e.p;
      if (choice === "raise") {
        const child = createChild(e.s, mother, father);
        e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: `Welcomed ${child.firstName}` });
        st(e, "happiness", 8);
        e.log("family", `${child.firstName} arrived at ${e.s.worldYear}. The house has never been quieter or louder at the same time.`);
        e.log("milestone", `You became a parent. There is no manual. There is ${child.firstName}.`);
      } else if (choice === "marryfirst") {
        e.p.flags.push("married");
        par.flags.push("married");
        st(e, "happiness", 8);
        e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: `Married ${par.firstName}` });
        e.log("family", `You and ${par.firstName} got married on a Tuesday. The baby is scheduled for spring. Everybody is calling you "lucky".`);
      } else {
        if (e.chance(0.5)) {
          e.p.partnerValue = clamp((e.p.partnerValue ?? 50) + 6);
          par.partnerValue = clamp((par.partnerValue ?? 50) + 6);
          st(e, "happiness", 3);
          e.log("family", `You talked for four hours, cried once, then ${par.firstName} danced in the kitchen again. It's going to be okay.`);
        } else {
          e.p.partnerValue = clamp((e.p.partnerValue ?? 50) - 10);
          par.partnerValue = clamp((par.partnerValue ?? 50) - 10);
          st(e, "happiness", -3);
          e.log("bad", "The talk was long and the words were honest. Honest is not always comfortable.");
        }
      }
    },
  },
  {
    id: "breakup", title: "The Shape of Silence", weight: 0, scripted: true, minAge: 16, maxAge: 95, cool: 10,
    text: (e) => {
      const par = e.other(e.p.partnerId);
      return `The silence in your home has a shape now. ${par?.firstName ?? "Your partner"} keeps leaving the dishes in the sink, on principle.`;
    },
    choices: () => [
      { id: "stay", label: "Work on it", hint: "Therapy? A new sofa? Both." },
      { id: "split", label: "Go your separate ways", hint: "Grown-up. Hard. Honest." },
    ],
    run: (e, choice) => {
      const par = e.other(e.p.partnerId);
      if (!par) return;
      if (choice === "stay") {
        e.p.partnerValue = clamp((e.p.partnerValue ?? 30) + 15);
        par.partnerValue = clamp((par.partnerValue ?? 30) + 15);
        st(e, "happiness", -2);
        e.log("family", `You chose ${par.firstName}. Twice, in the same week, in front of the sink. That counts as something.`);
      } else {
        e.p.partnerHistory.push(par.id);
        par.partnerHistory.push(e.p.id);
        par.partnerId = undefined;
        e.p.partnerId = undefined;
        e.p.partnerValue = 0;
        par.partnerValue = 0;
        st(e, "happiness", -8);
        if (e.p.flags.includes("married")) {
          e.p.flags.push("divorced");
          par.flags.push("divorced");
          e.log("family", `You and ${par.firstName} split up. The playlists are un-shared. The kids are fine. You are learning.`);
        } else {
          e.log("family", `You and ${par.firstName} went your separate ways. It was kind, which is the hard kind.`);
        }
      }
    },
  },

  // ================= BABY & TODDLER =================
  {
    id: "baby-mobiles", title: "The Ceiling Concert", weight: 2, minAge: 0, maxAge: 1, once: true,
    text: () => "The ceiling mobile is the greatest show ever staged. You tell it so, at considerable volume, at 3 a.m.",
    choices: () => [
      { id: "sing", label: "Sing along, loudly" },
      { id: "grab", label: "Grab it. Become its manager." },
    ],
    run: (e, choice) => {
      if (choice === "sing") {
        st(e, "happiness", 3);
        e.log("good", "Your debut single was mostly vowels. The critics (your parents) wept.");
      } else {
        st(e, "smarts", 1);
        e.log("neutral", "You caught the mobile mid-spin. Hand-eye coordination: operational.");
      }
    },
  },
  {
    id: "baby-solid", title: "The First Spoon", weight: 2, minAge: 0, maxAge: 1, once: true,
    text: () => "A spoon arrives carrying something that is definitely not milk. The spoon has questions. So do you.",
    choices: () => [
      { id: "open", label: "Open the hangar" },
      { id: "reject", label: "Politely redecorate the wall" },
    ],
    run: (e, choice) => {
      if (choice === "open") {
        st(e, "health", 3);
        e.log("good", "The first spoonful landed mostly inside you. Growth, in every sense.");
      } else {
        st(e, "happiness", 1);
        e.log("neutral", "The wall got more porridge than you did. The wall has no opinion. Your mother does.");
      }
    },
  },
  {
    id: "toddler-crawl", title: "The Great Escape", weight: 2, minAge: 1, maxAge: 2, once: true,
    text: () => "The rug is a continent and the far sofa is its undiscovered coast. Nobody has ever wanted anything this much.",
    choices: () => [
      { id: "go", label: "Crawl for the coast" },
      { id: "sit", label: "Rule the rug instead" },
    ],
    run: (e, choice) => {
      if (choice === "go") {
        st(e, "health", 3);
        st(e, "happiness", 2);
        e.log("good", "You crossed the entire living room. A grown-up cheered like you had summited something.");
      } else {
        st(e, "smarts", 1);
        e.log("neutral", "You stayed put and studied the adults. Rulers choose their moment.");
      }
    },
  },
  {
    id: "toddler-no", title: "The Favorite Word", weight: 2, minAge: 2, maxAge: 3, once: true,
    text: () => "You have discovered a word of enormous power. It is two letters long and it ends every conversation.",
    choices: () => [
      { id: "no", label: "Use it on everything" },
      { id: "yes", label: "Try the other one instead" },
    ],
    run: (e, choice) => {
      if (choice === "no") {
        st(e, "happiness", 2);
        e.log("neutral", "\"No.\" Shoes? No. Bath? No. Broccoli? Historically correct. The word served you well.");
      } else {
        st(e, "smarts", 2);
        e.log("good", "You experimented with \"yes\" and found doors. Also hugs. Mostly doors.");
      }
    },
  },
  {
    id: "preschool-art", title: "The Masterpiece", weight: 2, minAge: 3, maxAge: 5, cool: 6,
    text: () => "Crayons have been issued. The refrigerator door is about to host a gallery opening.",
    choices: () => [
      { id: "family", label: "Draw the family" },
      { id: "abstract", label: "Pure feeling, no notes" },
    ],
    run: (e, choice) => {
      if (choice === "family") {
        st(e, "happiness", 3);
        e.log("good", "Your family portrait gave everyone enormous hands and enormous smiles. It went on the fridge immediately.");
      } else {
        st(e, "smarts", 1);
        st(e, "happiness", 2);
        e.log("neutral", "The picture was eleven colors having an argument. You called it \"Wednesday.\" Critics were stunned.");
      }
    },
  },

  // ================= CHILDHOOD =================
  {
    id: "lost-tooth", title: "The Loose Tooth", weight: 2, minAge: 4, maxAge: 9, once: true,
    text: () => "You lost your first tooth. It landed on the kitchen tile with a tiny, heroic clack.",
    choices: () => [
      { id: "pillow", label: "Under the pillow", hint: "Trust the fairy. She keeps hours." },
      { id: "jar", label: "Add it to the jar of treasures" },
      { id: "eat", label: "Eat it (it was already in your mouth)" },
    ],
    run: (e, choice) => {
      if (choice === "pillow") {
        e.p.money += 20;
        st(e, "happiness", 4);
        e.log("good", "The tooth fairy paid in coins and left a smell like mint. Professional.");
      } else if (choice === "jar") {
        st(e, "happiness", 3);
        e.log("neutral", "The jar now holds one tooth and the family's respect. It is very heavy.");
      } else {
        st(e, "health", -1);
        e.log("neutral", "Your mother made a face. You will think of that face for years. So will she.");
      }
    },
  },
  {
    id: "playground-kid", title: "The Playground Dispute", weight: 2, minAge: 3, maxAge: 11, cool: 7,
    text: () => "A kid on the playground is refusing to share the good swing. This is a crisis.",
    choices: () => [
      { id: "trade", label: "Offer a trade", hint: "Diplomacy. At the slide." },
      { id: "grab", label: "Get the swing back" },
      { id: "leave", label: "Walk away, dignified" },
    ],
    run: (e, choice) => {
      if (choice === "trade") {
        st(e, "happiness", 4);
        e.log("good", "You traded a candy bar for the swing and a friendship. Economists would be proud.");
      } else if (choice === "grab") {
        st(e, "happiness", -2);
        st(e, "health", -1);
        e.log("neutral", "You got the swing. The kid got a grudge. The grudge has a name and a hat.");
      } else {
        st(e, "happiness", 1);
        e.log("neutral", "You left. The slide was excellent. Some battles are best unwon.");
      }
    },
  },
  {
    id: "talent-show", title: "The Talent Show", weight: 2, minAge: 5, maxAge: 11, once: true,
    text: () => "The school talent show is this week. The sign-up sheet is staring at you.",
    choices: () => [
      { id: "perform", label: "Perform", hint: "Whatever that is. Now." },
      { id: "hide", label: "Hide in the audience" },
    ],
    run: (e, choice) => {
      if (choice === "perform") {
        if (e.chance(0.5 + e.p.looks / 300)) {
          st(e, "happiness", 8);
          e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: "Talent show star" });
          e.log("good", "You performed. The applause was real, the applause was loud, and somebody's parent actually cried.");
        } else {
          st(e, "happiness", 3);
          e.log("neutral", "You performed. It was, by the strictest standards, a moment. The moment mattered.");
        }
      } else {
        e.log("neutral", "You watched from the back row, clapping hardest at the kid with the drums. You are a good friend.");
      }
    },
  },
  {
    id: "stray-pet", title: "The Stray", weight: 2, minAge: 4, maxAge: 12, once: true,
    text: () => "A stray animal of great dignity followed you home and is now sitting outside your door, holding the door in its gaze.",
    choices: () => [
      { id: "adopt", label: "Adopt it", hint: "You cannot live alone now." },
      { id: "no", label: "No. (Feed it, though.)" },
    ],
    run: (e, choice) => {
      const pet = e.pick(["kitten", "puppy", "feral but adorable cat"]);
      if (choice === "adopt") {
        e.p.flags.push("pet");
        st(e, "happiness", 6);
        e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: "Got a pet" });
        e.log("family", `You adopted a ${pet}. The household rules changed overnight. The ${pet} is the new boss.`);
      } else {
        st(e, "happiness", 1);
        e.log("neutral", `You couldn't adopt it, so you left out food and opinions. The ${pet} took the food and ignored the opinions.`);
      }
    },
  },
  {
    id: "lunch-theft", title: "The Missing Lunch", weight: 2, minAge: 4, maxAge: 12, cool: 8,
    when: (e) => !!sib(e),
    text: (e) => `Your lunch is gone. ${sib(e)!.firstName}'s cheeks are suspiciously full.`,
    choices: () => [
      { id: "tell", label: "Tell a grown-up" },
      { id: "fight", label: "Settle it" },
      { id: "share", label: "Let it go. Share tomorrow." },
    ],
    run: (e, choice) => {
      const s = sib(e)!;
      if (choice === "tell") {
        e.log("neutral", `The grown-up heard both sides, which was neither side's fault, and ruled: "Don't do it again." ${s.firstName} learned nothing.`);
      } else if (choice === "fight") {
        st(e, "health", -1);
        e.log("neutral", `The negotiation turned physical. You won a sandwich and a scab. ${s.firstName} got the story.`);
      } else {
        st(e, "happiness", 3);
        e.log("good", `You shared tomorrow's lunch. ${s.firstName} looked at you like you'd invented kindness.`);
      }
    },
  },
  {
    id: "birthday-gift", title: "The Birthday Gift", weight: 2, minAge: 5, maxAge: 12, cool: 9,
    text: () => "It's your birthday. The present pile is modest, mysterious, and possibly a booby trap.",
    choices: () => [
      { id: "toy", label: "The flashy toy" },
      { id: "book", label: "The thick book" },
      { id: "cake", label: "Just the cake. Immediately." },
    ],
    run: (e, choice) => {
      if (choice === "toy") {
        st(e, "happiness", 4);
        e.log("good", "The toy has four modes and a siren. The neighbors now know your name, in a way.");
      } else if (choice === "book") {
        st(e, "smarts", 2);
        e.log("good", "The book took you somewhere else every night for a month. You came back smarter.");
      } else {
        st(e, "happiness", 3);
        st(e, "health", -1);
        e.log("neutral", "You ate the cake before the gifts. Strategy: flawless. Stomach: less so.");
      }
    },
  },
  {
    id: "puddle-rain", title: "Puddle Weather", weight: 2, minAge: 2, maxAge: 10, cool: 6,
    text: () => "It rained the kind of rain that turns the street into a lake. The puddles are enormous and personal.",
    choices: () => [
      { id: "jump", label: "Jump. Every. Single. One." },
      { id: "inside", label: "Stay inside, safe and dry" },
    ],
    run: (e, choice) => {
      if (choice === "jump") {
        st(e, "health", -1);
        st(e, "happiness", 5);
        e.log("good", "You jumped every puddle. You got wet. It was the best afternoon of the year and the year is still going.");
      } else {
        st(e, "happiness", 1);
        e.log("neutral", "You watched the puddles from the window and planned future jumps for a braver you.");
      }
    },
  },
  {
    id: "school-play", title: "The School Play", weight: 2, minAge: 7, maxAge: 11, cool: 7,
    text: () => "The school play needs a lead. The cast list is on the wall. Your name is not on it, yet.",
    choices: () => [
      { id: "lead", label: "Try out for the lead" },
      { id: "chorus", label: "Join the chorus (the safe one)" },
    ],
    run: (e, choice) => {
      if (choice === "lead") {
        if (e.chance(0.4 + e.p.smarts / 250 + e.p.looks / 400)) {
          st(e, "happiness", 6);
          e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: "Star of the school play" });
          e.log("good", "You got the lead. The curtain call felt like a small, personal ceremony.");
        } else {
          st(e, "happiness", -2);
          e.log("neutral", "You got the role of the very convincing tree. The tree was a hit. The tree is you.");
        }
      } else {
        st(e, "happiness", 2);
        e.log("neutral", "The chorus was safe, warm, and occasionally off-key. You were rarely off-key.");
      }
    },
  },
  {
    id: "grandma-tale", title: "The Long Story", weight: 2, minAge: 3, maxAge: 10, cool: 8,
    when: (e) => !!grandparent(e) && grandparent(e)!.alive,
    text: (e) => `${grandparent(e)!.firstName} is about to tell the story of the wedding. Nobody has ever survived it in one sitting.`,
    choices: () => [
      { id: "listen", label: "Listen until the very end" },
      { id: "daydream", label: "Listen, then daydream" },
    ],
    run: (e, choice) => {
      const g = grandparent(e)!;
      if (choice === "listen") {
        st(e, "happiness", 3);
        st(e, "smarts", 1);
        e.log("good", `You stayed until the last page of ${g.firstName}'s story. You now know more about that year than the year itself.`);
      } else {
        st(e, "happiness", 1);
        e.log("neutral", `You listened. Then you daydreamed. ${g.firstName} pretended not to notice, which means you did the right thing anyway.`);
      }
    },
  },
  {
    id: "beetle", title: "The Beetle", weight: 1, minAge: 2, maxAge: 9, cool: 6,
    text: () => "A beetle is crossing the yard at full confidence. To you, it is the size of a car.",
    choices: () => [
      { id: "watch", label: "Watch the entire journey" },
      { id: "flee", label: "Retreat to the house" },
    ],
    run: (e, choice) => {
      if (choice === "watch") {
        st(e, "happiness", 2);
        e.log("neutral", "You watched the beetle reach the fence. It did not wave. It was very focused.");
      } else {
        st(e, "happiness", -1);
        e.log("neutral", "You retreated. The beetle won nothing and lost nothing. You lost composure.");
      }
    },
  },

  // ================= TEEN =================
  {
    id: "partjob", title: "The First Shift", weight: 2, minAge: 15, maxAge: 17,
    when: (e) => !e.p.job && !e.p.uni,
    text: () => "The café next to school is hiring at your age. The pay is pocket change. The espresso machine is a god.",
    choices: () => [
      { id: "accept", label: "Take the job" },
      { id: "nope", label: "You have homework (you don't)" },
    ],
    run: (e, choice) => {
      if (choice === "accept") {
        e.p.flags.push("f18");
        landJob(e, "barista");
        st(e, "happiness", 3);
        e.log("good", "You got the café job. You are now an adult, technically, between 4 and 7 p.m.");
      } else {
        e.log("neutral", "You stayed pure and homework-shaped. The barista hire is now the coolest person in school.");
      }
    },
  },
  {
    id: "exam-crunch", title: "The Big Exam", weight: 2, minAge: 16, maxAge: 16, once: true,
    text: () => "The secondary exam is in two weeks. The syllabus is a brick. Your brain is a bicycle.",
    choices: () => [
      { id: "grind", label: "Grind. Sleep is a rumor.", hint: "+smarts, -sanity" },
      { id: "chill", label: "Balance it. Maybe." },
      { id: "sick", label: "Fake sick on exam day", hint: "Bold. Detectable." },
    ],
    run: (e, choice) => {
      if (choice === "grind") {
        st(e, "smarts", 4);
        st(e, "happiness", -4);
        e.log("good", "You studied until the numbers had faces. The faces were helpful. The exam went better than the week before it.");
      } else if (choice === "chill") {
        st(e, "smarts", 1);
        e.log("neutral", "You studied enough to pass and lived enough to remember the season. A reasonable trade.");
      } else {
        if (e.chance(0.5)) {
          st(e, "happiness", 3);
          e.log("neutral", "You faked sick and the sick note held up. You now have a technique and a small secret.");
        } else {
          st(e, "happiness", -4);
          e.p.examScore = Math.max(30, (e.p.examScore ?? 50) - 8);
          e.log("bad", "You faked sick. The school called home. Your parents called you. The truth was called 'embarrassing'.");
        }
      }
    },
  },
  {
    id: "garage-band", title: "The Garage Band", weight: 2, minAge: 14, maxAge: 18, once: true,
    text: () => "You and two friends form a band in a garage. The name is terrible. The ambition is not.",
    choices: () => [
      { id: "guitar", label: "Guitar (the lead, obviously)" },
      { id: "drums", label: "Drums (the chaos)" },
      { id: "leave", label: "Watch from the curb" },
    ],
    run: (e, choice) => {
      if (choice === "guitar") {
        e.p.flags.push("band");
        e.p.skills.music = clamp((e.p.skills.music ?? 0) + 20);
        st(e, "happiness", 5);
        e.log("good", "You took the guitar. The first song took forty minutes. The second took five. Progress!");
      } else if (choice === "drums") {
        e.p.flags.push("band");
        e.p.skills.music = clamp((e.p.skills.music ?? 0) + 15);
        st(e, "happiness", 4);
        st(e, "health", -1);
        e.log("good", "You took the drums. Your ears filed a complaint; the neighbors filed a stronger one.");
      } else {
        e.log("neutral", "You watched from the curb and provided the important commentary. Band managers start somewhere.");
      }
    },
  },
  {
    id: "band-gig", title: "The First Gig", weight: 2, minAge: 15, maxAge: 19, once: true,
    when: (e) => e.p.flags.includes("band"),
    text: () => "The band is playing its first real gig. Twelve people. One of them is your aunt.",
    choices: () => [
      { id: "believe", label: "Believe in it" },
      { id: "nervous", label: "Freeze on song two" },
    ],
    run: (e, choice) => {
      if (choice === "believe") {
        st(e, "happiness", 7);
        e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: "First gig" });
        e.log("good", "You played like the venue was full of ten thousand. Your aunt gave a standing ovation, alone, near the exit.");
      } else {
        st(e, "happiness", -2);
        e.log("neutral", "You froze on song two. The drummer filled the silence so well, nobody knew. Except you.");
      }
    },
  },
  {
    id: "viral-fail", title: "The Video", weight: 2, minAge: 13, maxAge: 17, cool: 8, minYear: 2007,
    text: () => "Someone filmed you mid-disaster and everyone is suddenly very interested in your phone.",
    choices: () => [
      { id: "own", label: "Post it yourself" },
      { id: "bury", label: "Bury it forever" },
    ],
    run: (e, choice) => {
      const clip = e.pick(["tripping into a trash can", "winning a paper-airplane contest", "dancing badly and on purpose", "arguing with a shopping cart"]);
      if (choice === "own") {
        if (e.chance(0.45)) {
          st(e, "happiness", 8);
          e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: "The clip that made you" });
          e.log("good", `You posted the clip of yourself ${clip}. It spread. Your name now has a little halo of laughing emojis.`);
        } else {
          st(e, "happiness", 2);
          e.log("neutral", `You posted it. It did exactly one lap of your friend group and retired with honors (${clip}).`);
        }
      } else {
        st(e, "happiness", -2);
        e.log("neutral", "You buried the video. It did not stay buried. You have a nickname now and it does not fit.");
      }
    },
  },
  {
    id: "bully", title: "The Corner", weight: 2, minAge: 12, maxAge: 16, once: true,
    text: () => "The same kid keeps 'accidentally' bumping your bag in the hallway. It has a pattern. It has a name.",
    choices: () => [
      { id: "stand", label: "Stand up, properly" },
      { id: "teacher", label: "Tell a teacher" },
      { id: "ignore", label: "Starve it. Ignore everything." },
    ],
    run: (e, choice) => {
      if (choice === "stand") {
        if (e.chance(0.4 + traitMod(e.p, "health") * 0.1 + (e.p.traits.includes("brave") ? 0.25 : 0))) {
          st(e, "happiness", 6);
          e.log("good", "You stood up, calm and loud. The hallway went quiet. The bumping stopped that week, and it was not a coincidence.");
        } else {
          st(e, "health", -3);
          st(e, "happiness", -3);
          e.log("bad", "You stood up. It turned into a scuffle, and the hallway remembers scuffles longer than speeches.");
        }
      } else if (choice === "teacher") {
        st(e, "happiness", 2);
        e.log("good", "The teacher handled it like a small, serious case. The bumping became 'rare'. Rare is a win.");
      } else {
        st(e, "happiness", -3);
        e.log("neutral", "You ignored it. Some of it worked. You still take the long way to class, which is not nothing.");
      }
    },
  },
  {
    id: "pen-pal", title: "The Pen Pal", weight: 1, minAge: 12, maxAge: 16, once: true,
    text: () => "A letter arrived with no return address, just your name in careful handwriting: 'To the quiet one by the window.'",
    choices: () => [
      { id: "reply", label: "Write back" },
      { id: "ignore", label: "File it under 'strange'" },
    ],
    run: (e, choice) => {
      if (choice === "reply") {
        st(e, "happiness", 4);
        e.log("good", "You wrote back. The reply came from your own cousin, hiding in the guest room on holiday. The mystery deepened into a friendship.");
      } else {
        e.log("neutral", "You filed it under 'strange'. Your cousin, visiting the next spring, mentioned the letter. You said nothing. You are good at this.");
      }
    },
  },
  {
    id: "neon-hair", title: "The Neon Hair", weight: 2, minAge: 14, maxAge: 17, once: true,
    text: () => "You have found the exact neon shade. It is electric. It is a decision. The shop owner is watching you choose.",
    choices: () => [
      { id: "doit", label: "Do it. Today. Now." },
      { id: "wait", label: "Wait until summer" },
      { id: "convince", label: "Convince your parents first" },
    ],
    run: (e, choice) => {
      if (choice === "doit") {
        st(e, "happiness", 6);
        st(e, "looks", 2);
        e.log("good", "You dyed it. Your mother made a sound. The kid at the bus stop pointed, then pretended they hadn't. You were electric for one glorious semester.");
      } else if (choice === "wait") {
        st(e, "happiness", -1);
        e.log("neutral", "You waited for summer. Summer came. You dyed it anyway. Same result, longer anxiety.");
      } else {
        if (e.chance(0.5)) {
          st(e, "happiness", 5);
          e.log("good", "You convinced them. Your parent's 'no' was a speed bump, not a wall. The color held.");
        } else {
          st(e, "happiness", -2);
          e.log("neutral", "They said no. You did it. Both things are now true, simultaneously, forever.");
        }
      }
    },
  },
  {
    id: "sneak-party", title: "The Party Across Town", weight: 2, minAge: 16, maxAge: 17, once: true,
    text: () => "The party is across town, off-limits after 11, and exactly the kind of place where legends are either made or at least started.",
    choices: () => [
      { id: "go", label: "Sneak out" },
      { id: "stay", label: "Stay in. Survive." },
    ],
    run: (e, choice) => {
      if (choice === "go") {
        if (e.chance(0.5)) {
          st(e, "happiness", 7);
          st(e, "health", -2);
          e.log("good", "You made it in, made it out, made the bus home. The playlist still lives in your head and it is fine.");
        } else {
          st(e, "happiness", -5);
          e.log("bad", "You made it in. You did not make it out cleanly. The car at 2 a.m. had a parent in it, and a face in it.");
        }
      } else {
        st(e, "happiness", 2);
        e.log("neutral", "You stayed in and survived, which the next day's stories confirmed was the winning play. Everyone was tired.");
      }
    },
  },
  {
    id: "sports-team", title: "Tryouts", weight: 2, minAge: 12, maxAge: 16, once: true,
    text: () => "Tryouts are open. The coach talks about heart. The gym smells like rubber and ambition.",
    choices: () => [
      { id: "join", label: "Sign up" },
      { id: "skip", label: "Not your kind of fast" },
    ],
    run: (e, choice) => {
      if (choice === "join") {
        st(e, "health", 4);
        e.p.skills.sports = clamp((e.p.skills.sports ?? 0) + 25);
        e.log("good", "You signed up. You ran the drills. You got slower than the others, then not, then you. It is in your legs now.");
      } else {
        e.log("neutral", "You skipped tryouts. Your knees are personally grateful and will mention this when they creak.");
      }
    },
  },
  {
    id: "pocket-haul", title: "The Haul", weight: 1, minAge: 10, maxAge: 17, cool: 7,
    text: () => "You've saved up your allowance. The shop window has a new item with your name on it in a vague way.",
    choices: () => [
      { id: "buy", label: "Buy the thing ($100)" },
      { id: "save", label: "Keep saving, get the bigger thing" },
    ],
    run: (e, choice) => {
      if (choice === "buy") {
        if (e.p.money >= 100) {
          e.p.money -= 100;
          st(e, "happiness", 4);
          e.log("good", "You bought the thing. It fits in your hand and your heart is slightly bigger than before.");
        } else {
          e.log("neutral", "You reached for the thing and the thing was $12 short of your pocket. Closest thing to heartbreak.");
        }
      } else {
        st(e, "happiness", 1);
        e.log("neutral", "You kept saving. The bigger thing is still in the window, patient. So are you.");
      }
    },
  },

  // ================= ADULT =================
  {
    id: "job-poach", title: "The Rival Offer", weight: 2, minAge: 22, maxAge: 62,
    when: (e) => !!e.p.job,
    text: (e) => `A rival company slid an offer under your door: same job, ${Math.round(((e.p.job ? e.p.job.salary * 1.22 : 0) / (e.p.job?.salary || 1) - 1) * 100)}% more. They know your salary, somehow.`,
    choices: () => [
      { id: "take", label: "Take the bigger number" },
      { id: "stay", label: "Stay loyal" },
    ],
    run: (e, choice) => {
      const j = e.p.job;
      if (!j) {
        e.log("neutral", "The offer went cold before you decided. Offers do that.");
        return;
      }
      if (choice === "take") {
        j.salary = Math.round((j.salary * 1.22) / 100) * 100;
        j.employer = e.pick(EMPLOYERS);
        st(e, "happiness", 4);
        e.log("good", `You jumped to ${j.employer}. The number is bigger; the coffee is different; nobody told you how to feel about the new mug.`);
      } else {
        st(e, "happiness", 2);
        e.log("neutral", `You stayed. Loyalty is not a salary bump, but your ${JOBS[j.jobId]?.title ?? "boss"} nodded at you like a co-conspirator.`);
      }
    },
  },
  {
    id: "layoff", title: "The Memo", weight: 2, minAge: 20, maxAge: 64,
    when: (e) => !!e.p.job && !!JOBS[e.p.job!.jobId]?.unstable,
    text: () => "An all-hands meeting. The word 'restructuring' appears. The room collectively holds its breath.",
    choices: () => [
      { id: "fight", label: "Pitch your value on the spot" },
      { id: "fold", label: "Pack the desk, keep your dignity" },
    ],
    run: (e, choice) => {
      if (!e.p.job) {
        e.log("neutral", "The all-hands happened, and somehow you weren't on the list. Lucky, or invisible.");
        return;
      }
      if (choice === "fight") {
        if (e.chance(0.4 + traitMod(e.p, "career") * 0.1)) {
          st(e, "happiness", 3);
          e.log("good", "You stood up and pitched your value. The memo moved on to other, unluckier desks. You kept the job — and the legend.");
        } else {
          e.p.job = null;
          st(e, "happiness", -8);
          e.log("bad", "You pitched. It was good. It was not enough. The box was smaller than the job.");
        }
      } else {
        e.p.job = null;
        st(e, "happiness", -8);
        e.log("bad", "You packed the desk in forty minutes. The plant came with you, which counts as something.");
      }
    },
  },
  {
    id: "rent-hike", title: "The Rent Notice", weight: 2, minAge: 20, maxAge: 70,
    when: (e) => !e.p.house && !!e.p.job,
    text: () => "A notice on the door: rent is going up 25%. The math in your head is loud and unhelpful.",
    choices: () => [
      { id: "negotiate", label: "Negotiate, calmly and in writing" },
      { id: "move", label: "Start looking to move" },
      { id: "pay", label: "Pay it. Sigh. Repeat next year." },
    ],
    run: (e, choice) => {
      if (choice === "negotiate") {
        if (e.chance(0.5)) {
          st(e, "happiness", 3);
          e.log("good", "You negotiated. The landlord blinked first. You kept the place and gained a small, permanent skill: firmness.");
        } else {
          e.p.money -= 500;
          e.log("neutral", "The negotiation was civil and lost. You paid a little more to find out exactly how much you could.");
        }
      } else if (choice === "move") {
        e.p.money -= 2000;
        st(e, "happiness", -3);
        e.log("neutral", "You moved. Three boxes of 'stuff' became one box of 'things'. The new place has better light.");
      } else {
        e.p.money -= 1000;
        e.log("neutral", "You paid it. The rent is now a character in your life with recurring billing.");
      }
    },
  },
  {
    id: "dreamcoin", title: "DREAMCOIN", weight: 2, minAge: 25, maxAge: 60, minYear: 2013,
    when: (e) => e.p.money >= 20000,
    text: () => "Everyone at your favorite spot is talking about DREAMCOIN. It has a rocket logo. The rocket logo is doing numbers.",
    choices: () => [
      { id: "buy", label: "Put $10K in", hint: "The rocket is real. Allegedly." },
      { id: "out", label: "Stay out. You know why." },
    ],
    run: (e, choice) => {
      if (choice === "buy") {
        const r = e.rnd();
        if (r < 0.5) {
          e.p.money += 12000;
          st(e, "happiness", 6);
          e.log("good", "You bought DREAMCOIN. The rocket, it turns out, was real. +$12K. You feel like a genius and an adult simultaneously.");
        } else if (r < 0.8) {
          e.p.money += 2500;
          e.log("neutral", "DREAMCOIN did a modest, suspiciously small thing. You sold it at +$2.5K to protect your peace.");
        } else {
          e.p.money -= 10000;
          st(e, "happiness", -5);
          e.log("bad", "The rocket had fuel made of other people's money. -$10K. The group chat is now very quiet about rockets.");
        }
      } else {
        e.log("neutral", "You stayed out. Watching the rocket from the sidewalk is a fine way to survive rockets.");
      }
    },
  },
  {
    id: "health-scare", title: "The Doctor's Office", weight: 2, minAge: 34, maxAge: 68,
    when: (e) => e.p.health < 75,
    text: () => "The doctor uses the word 'manageable' twice. The waiting room plant is judging you gently.",
    choices: () => [
      { id: "gym", label: "Do the thing. Gym. Water. All of it.", hint: "Costs a little, saves a lot" },
      { id: "later", label: "It's manageable, right?" },
    ],
    run: (e, choice) => {
      if (choice === "gym") {
        st(e, "health", 9);
        e.p.money -= 800;
        e.log("good", "You did the thing. The gym, the water, the early alarm. The next check-up is a two-minute, boring, wonderful conversation.");
      } else {
        st(e, "health", -6);
        e.log("neutral", "It is manageable. Manageable is a door left open. The doctor will say the same word again. Probably.");
      }
    },
  },
  {
    id: "friends-wedding", title: "The Wedding", weight: 2, minAge: 22, maxAge: 65,
    when: (e) => e.p.friends.length > 0,
    text: (e) => `${bestFriend(e)?.firstName ?? "A friend"} is getting married. The playlist is already legendary. The venue is expensive.`,
    choices: () => [
      { id: "attend", label: "Go. Full ceremony. ($400)", hint: "Dance, cry, repeat" },
      { id: "card", label: "Send a heartfelt card" },
    ],
    run: (e, choice) => {
      const f = bestFriend(e);
      if (choice === "attend") {
        e.p.money -= 400;
        st(e, "happiness", 5);
        e.log("good", `You danced at ${f?.firstName ?? "your friend"}'s wedding until the floor was a science experiment. The card money could never.`);
      } else {
        st(e, "happiness", 1);
        e.log("neutral", `Your card was four paragraphs, one of which was a poem. ${f?.firstName ?? "They"} read it twice. It counted.`);
      }
    },
  },
  {
    id: "midlife-fridge", title: "The Fridge Stare", weight: 2, minAge: 40, maxAge: 56, once: true,
    text: () => "You stare into the fridge at 1 a.m. The fridge stares back. Something in the stare asks: 'Is this the part?'",
    choices: () => [
      { id: "bike", label: "Buy the loud bike ($3K)", hint: "The part is now a hill" },
      { id: "podcast", label: "Start the podcast", hint: "There is a show about your life. It is your life." },
      { id: "nothing", label: "Close the fridge. Sleep." },
    ],
    run: (e, choice) => {
      if (choice === "bike") {
        e.p.money -= 3000;
        st(e, "happiness", 7);
        st(e, "health", -1);
        e.log("good", "You bought the bike. It is louder than the manual allows and exactly the right volume for the soul.");
      } else if (choice === "podcast") {
        st(e, "happiness", 4);
        e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: e.s.worldYear >= 2005 ? "Started a podcast" : "Started a little radio show" });
        e.log("good", "You started the podcast. Episode one is you and a friend talking about the fridge. It has 12 listeners. All twelve agree.");
      } else {
        st(e, "happiness", 1);
        e.log("neutral", "You closed the fridge. The question remains, which is how it was always going to be.");
      }
    },
  },
  {
    id: "side-hustle", title: "The Side Hustle", weight: 2, minAge: 25, maxAge: 58,
    text: () => "A weekend side hustle is on the table: real numbers, real weekends, real early alarms.",
    choices: () => [
      { id: "doit", label: "Do it" },
      { id: "skip", label: "Protect the weekends" },
    ],
    run: (e, choice) => {
      if (choice === "doit") {
        const gain = e.range(2000, 6000);
        e.p.money += gain;
        st(e, "happiness", -3);
        e.log("money", `The side hustle paid out. A weekend is worth what a weekend is worth. The money says yes.`);
      } else {
        st(e, "happiness", 2);
        e.log("neutral", "You protected the weekends. The savings account felt a little less loud about it.");
      }
    },
  },
  {
    id: "tax-audit", title: "The Letter in Red", weight: 2, minAge: 30, maxAge: 65,
    when: (e) => e.p.money > 50000,
    text: () => "A letter with official-looking paper. The word 'review' appears four times. Four is a lot for 'review'.",
    choices: () => [
      { id: "pay", label: "Pay up, keep the peace" },
      { id: "fight", label: "Dispute it, politely" },
    ],
    run: (e, choice) => {
      if (choice === "pay") {
        const cut = Math.round(e.p.money * 0.08);
        e.p.money -= cut;
        e.log("neutral", "You paid the review. The letter thanked you. Paper has feelings, apparently.");
      } else {
        if (e.chance(0.5)) {
          st(e, "happiness", 3);
          e.log("good", "You disputed it. The paperwork went back. You won. The victory is a folder now, kept for morale.");
        } else {
          const cut = Math.round(e.p.money * 0.12);
          e.p.money -= cut;
          st(e, "happiness", -2);
          e.log("bad", "You disputed it. The dispute lost, with interest and a note. The note was almost friendly.");
        }
      }
    },
  },
  {
    id: "phone-lake", title: "The Lake Incident", weight: 1, minAge: 18, maxAge: 65, cool: 10, minYear: 2010,
    text: () => "You were by the lake. The phone was in your pocket. Now the phone is in the lake. This is a sequence of facts.",
    choices: () => [
      { id: "fish", label: "Fish it out, immediately" },
      { id: "replace", label: "Replace it ($800)" },
    ],
    run: (e, choice) => {
      if (choice === "fish") {
        if (e.chance(0.35)) {
          st(e, "happiness", 4);
          e.log("good", "You fished it out. It booted. The lake has been told about this and is not sorry.");
        } else {
          e.p.money -= 800;
          st(e, "happiness", -2);
          e.log("neutral", "You fished it out. It did not boot. You now own a very waterproof paperweight.");
        }
      } else {
        e.p.money -= 800;
        e.log("neutral", "You replaced it. The new phone has no memories of the lake, which is somehow the saddest part.");
      }
    },
  },
  {
    id: "neighbor", title: "The New Neighbor", weight: 1, minAge: 20, maxAge: 60, once: true,
    text: () => "A new neighbor moved in with three boxes, one ladder, and a dog that has strong opinions.",
    choices: () => [
      { id: "wave", label: "Wave. Learn the name." },
      { id: "hedge", label: "Respect the hedge. Fully." },
    ],
    run: (e, choice) => {
      if (choice === "wave") {
        st(e, "happiness", 3);
        e.log("good", "You waved. The neighbor waved back with both hands, like it was a sport. There is a friend in this street now.");
      } else {
        st(e, "happiness", -2);
        e.log("neutral", "You respected the hedge. The dog did not. The dog has opinions and shares them, daily, at volume.");
      }
    },
  },
  {
    id: "partner-argument", title: "The Dish", weight: 2, minAge: 20, maxAge: 70,
    when: (e) => !!e.p.partnerId,
    text: (e) => `A small argument about a big dish. ${e.other(e.p.partnerId)?.firstName ?? "Your partner"} is using the 'you always' card, and it is winning.`,
    choices: () => [
      { id: "apologize", label: "Apologize first" },
      { id: "win", label: "Win the point, lose nothing else (supposedly)" },
      { id: "silent", label: "The silent treatment, briefly" },
    ],
    run: (e, choice) => {
      const par = e.other(e.p.partnerId);
      if (!par) return;
      if (choice === "apologize") {
        e.p.partnerValue = clamp((e.p.partnerValue ?? 50) + 6);
        par.partnerValue = clamp((par.partnerValue ?? 50) + 6);
        st(e, "happiness", 2);
        e.log("good", "You apologized first. The dish went in the dishwasher. The respect went up a visible amount.");
      } else if (choice === "win") {
        e.p.partnerValue = clamp((e.p.partnerValue ?? 50) - 8);
        par.partnerValue = clamp((par.partnerValue ?? 50) - 8);
        e.log("neutral", "You won the point. The dish remains in the sink, in a room with a new, careful temperature.");
      } else {
        e.p.partnerValue = clamp((e.p.partnerValue ?? 50) - 4);
        par.partnerValue = clamp((par.partnerValue ?? 50) - 4);
        st(e, "happiness", -2);
        e.log("neutral", "You did the silent treatment. It lasted one evening. The silence was eventually broken by the fridge.");
      }
    },
  },
  {
    id: "burnout", title: "The Inbox Fire", weight: 2, minAge: 25, maxAge: 60,
    when: (e) => !!e.p.job,
    text: () => "Your inbox is on fire and the smoke has your name on it. The weekend is a concept under threat.",
    choices: () => [
      { id: "rest", label: "Take the week off", hint: "The work will survive. You must too." },
      { id: "push", label: "Push through, collect the bonus" },
    ],
    run: (e, choice) => {
      if (choice === "rest") {
        st(e, "happiness", 6);
        st(e, "health", 4);
        e.p.money -= 1500;
        e.log("good", "You took the week off. The work survived. You, more importantly, did. The bonus line item is smaller; the sleep is bigger.");
      } else {
        st(e, "health", -6);
        e.p.money += 2000;
        e.log("neutral", "You pushed through. The bonus landed. So did the quiet, persistent hum in your back that the bonus does not fix.");
      }
    },
  },
  {
    id: "celeb-mistake", title: "The Famous Face", weight: 1, minAge: 18, maxAge: 60,
    when: (e) => e.p.looks > 70,
    text: () => "A famous person has been 'quite sure' that you owe them a favor from 2011. This is how it starts.",
    choices: () => [
      { id: "confirm", label: "Let them believe it" },
      { id: "correct", label: "Correct them, kindly" },
    ],
    run: (e, choice) => {
      if (choice === "confirm") {
        st(e, "happiness", 3);
        e.log("good", "You let them believe it. You are now a legend in one very specific, very famous circle. The favor remains unpaid. Forever.");
      } else {
        st(e, "happiness", 1);
        e.log("neutral", "You corrected them kindly. They said 'ah, I remember now' and meant nothing by it. You are you, and that is enough.");
      }
    },
  },
  {
    id: "gym-rival", title: "The Gym Rival", weight: 1, minAge: 20, maxAge: 55, cool: 9,
    text: () => "A gym regular has been 'accidentally' beating your times on the machine. There is a scoreboard. It has a face.",
    choices: () => [
      { id: "beat", label: "Beat the time, publicly" },
      { id: "friend", label: "Acknowledge the rivalry, start the friendship" },
    ],
    run: (e, choice) => {
      if (choice === "beat") {
        st(e, "health", 4);
        e.log("good", "You beat the time. The scoreboard shows your name now. The gym has a new local hero and it is, modestly, you.");
      } else {
        st(e, "health", 2);
        st(e, "happiness", 3);
        e.log("good", "You acknowledged the rivalry. It became a friendship with a shared machine and one very good protein shake order.");
      }
    },
  },
  {
    id: "expat-shock", title: "The New Country", weight: 3, minAge: 18, maxAge: 85, cool: 12,
    when: (e) => e.p.flags.includes("immigrant") && !hasFluency(e.p, e.p.countryId),
    text: (e) => `You landed in ${country(e.p.countryId).name}. The light is different. The signs are in ${LANGS[country(e.p.countryId).languages[0]].name}. The food is wonderful and unreadable.`,
    choices: () => [
      { id: "local", label: "Make a local friend", hint: "One person, one language, one start" },
      { id: "expat", label: "Find other homesick people" },
      { id: "push", label: "Push through, alone, quietly" },
    ],
    run: (e, choice) => {
      const lang = country(e.p.countryId).languages[0];
      if (choice === "local") {
        e.p.languages[lang] = clamp((e.p.languages[lang] ?? 0) + 14);
        st(e, "happiness", 5);
        e.log("good", "You made a local friend. The accent is a bridge. The language is a door, and it is starting to open.");
      } else if (choice === "expat") {
        st(e, "happiness", 6);
        e.log("good", "You found the others — the ones who also miss home and also order the same coffee. Home is a group chat now, and that is okay.");
      } else {
        st(e, "smarts", 2);
        st(e, "happiness", -4);
        e.log("neutral", "You pushed through, alone. The language is a wall you are walking into on purpose. It is working. Slowly.");
      }
    },
  },
  {
    id: "baby-night", title: "The 3 a.m. Round", weight: 2, minAge: 18, maxAge: 55,
    when: (e) => e.p.childrenIds.some((id) => (e.other(id)?.age ?? 99) < 3),
    text: () => "It is 3 a.m. The baby is awake. The baby is a small, furious, luminous philosopher.",
    choices: () => [
      { id: "coffee", label: "Two coffees and a lullaby" },
      { id: "shift", label: "Trade off with your partner" },
    ],
    run: (e, choice) => {
      const kid = e.p.childrenIds.map((id) => e.other(id)).find((k) => k && k.age < 3);
      if (choice === "coffee") {
        st(e, "health", -3);
        st(e, "happiness", 1);
        e.log("family", `You survived the 3 a.m. round on two coffees and a lullaby. ${kid?.firstName ?? "The baby"} is now asleep. You are now a legend with dark circles.`);
      } else {
        st(e, "health", -1);
        e.log("family", "You traded off the night. The handoff was clean, professional, and slightly heroic.");
      }
    },
  },
  {
    id: "school-run", title: "The Big News", weight: 2, minAge: 18, maxAge: 65,
    when: (e) => e.p.childrenIds.some((id) => { const k = e.other(id); return k && k.age >= 5 && k.age < 15; }),
    text: () => "A child comes home with news of a magnitude that is, to them, planetary.",
    choices: () => [
      { id: "listen", label: "Give it your whole face" },
      { id: "phone", label: "Listen while checking your phone" },
    ],
    run: (e, choice) => {
      const kids = e.p.childrenIds.map((id) => e.other(id)).filter((k): k is Char => !!k && k.age >= 5 && k.age < 15);
      const kid = kids[0];
      if (choice === "listen") {
        st(e, "happiness", 3);
        e.log("family", `You gave ${kid?.firstName ?? "your child"} the whole face. The news was a beetle. The face was the point. It worked.`);
      } else {
        st(e, "happiness", -1);
        e.log("neutral", "You listened with one eye on the phone. The beetle news was interrupted by a notification. The beetle wins. It always wins.");
      }
    },
  },
  {
    id: "old-car-death", title: "The Car's Last Word", weight: 1, minAge: 18, maxAge: 70,
    when: (e) => !!e.p.car,
    text: () => "The car made a sound it has never made before. It is a new sound. It is the last sound, probably.",
    choices: () => [
      { id: "fix", label: "Pay for the repair ($3K)" },
      { id: "replace", label: "Trade it in for a new one" },
    ],
    run: (e, choice) => {
      if (choice === "fix") {
        e.p.money -= 3000;
        e.log("neutral", "You paid the repair. The car lives on, with a sound now in its voice that the mechanic calls 'character'.");
      } else {
        e.p.money -= 25000;
        e.p.car = { name: pick(CARS), value: 25000 };
        st(e, "happiness", 3);
        e.log("money", `You traded it in. The old car is somebody's first car now. You drive ${e.p.car.name}. It is new and it knows nothing yet.`);
      }
    },
  },
  {
    id: "lottery-whiff", title: "The Almost-Win", weight: 1, minAge: 18, maxAge: 70, cool: 8,
    text: () => "You bought a lottery ticket on a whim. The draw is tonight. The number is in your pocket and in your head.",
    choices: () => [
      { id: "buy", label: "Watch the draw" },
      { id: "forget", label: "Forget about it" },
    ],
    run: (e, choice) => {
      if (choice === "buy") {
        if (e.chance(0.004)) {
          e.p.money += 100000;
          e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: "The lottery" });
          e.log("milestone", "The numbers matched. All of them. You are, for the moment, the most interesting person in the building.");
        } else if (e.chance(0.1)) {
          e.p.money += 40;
          e.log("good", "You won $40. Not a fortune. A small, loud, personal victory.");
        } else {
          e.log("neutral", "The draw came and went. You lost by one number, which is the kind of loss that files a complaint.");
        }
      } else {
        e.log("neutral", "You forgot about the ticket. It is in a coat pocket now, a small, unresolved question.");
      }
    },
  },

  // ================= SENIOR =================
  {
    id: "grandkid-glory", title: "The Small Hands", weight: 2, minAge: 55, maxAge: 95,
    when: (e) => !!grandkid(e),
    text: () => "A small hand reaches up to you from the floor of the living room. It is a grandchild's hand. It means 'higher'.",
    choices: () => [
      { id: "up", label: "Higher. Much higher." },
      { id: "story", label: "Swap the lift for a story" },
    ],
    run: (e, choice) => {
      const g = grandkid(e)!;
      if (choice === "up") {
        st(e, "happiness", 6);
        e.log("family", `You lifted ${g.firstName} to the window. The view is the same. The view is better.`);
      } else {
        st(e, "happiness", 4);
        st(e, "smarts", 1);
        e.log("family", `You told ${g.firstName} the story of the year everything changed. They understood none of it and loved every second.`);
      }
    },
  },
  {
    id: "new-doctor", title: "The New Doctor", weight: 2, minAge: 68, maxAge: 99,
    when: (e) => e.p.health < 80,
    text: () => "The new doctor is thorough in a way the old one never was. The clipboard is a small, serious orchestra.",
    choices: () => [
      { id: "see", label: "See the new doctor ($2K)", hint: "Thorough is a kind of kind" },
      { id: "old", label: "Old ways, old trust" },
    ],
    run: (e, choice) => {
      if (choice === "see") {
        e.p.money -= 2000;
        st(e, "health", 10);
        e.log("good", "You saw the new doctor. The plan is a list, and the list is a kind of map. You are following it. It is working.");
      } else {
        if (e.chance(0.5)) {
          st(e, "health", 4);
          e.log("neutral", "You kept the old ways. They are old and they are yours, and they are holding, for now.");
        } else {
          st(e, "health", -6);
          e.log("neutral", "The old ways held for a while. The new doctor's name is in a card in your pocket now.");
        }
      }
    },
  },
  {
    id: "memoir", title: "The Book of You", weight: 2, minAge: 65, maxAge: 95, once: true,
    text: () => "You have been thinking about writing it down. The years, the names, the one bad haircut. The book of you.",
    choices: () => [
      { id: "write", label: "Write the memoir" },
      { id: "skip", label: "Who wants to read that? (You do.)" },
    ],
    run: (e, choice) => {
      if (choice === "write") {
        st(e, "happiness", 6);
        st(e, "smarts", 1);
        e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: "Wrote the memoir" });
        e.log("milestone", "You wrote the memoir. The first draft is you. The second draft is truer. The family is reading it in parts, with comments.");
      } else {
        st(e, "happiness", 2);
        e.log("neutral", "You decided the book would be a series of Sunday dinners instead. The chapters are meals. The footnotes are arguments about the recipe.");
      }
    },
  },
  {
    id: "bucket-trip", title: "The One Trip", weight: 2, minAge: 60, maxAge: 85,
    when: (e) => e.p.money > 20000,
    text: () => "There is a trip in the bucket. There is money in the account. The bucket is getting older than the money is.",
    choices: () => [
      { id: "go", label: "Take the trip ($15K)", hint: "The bucket can wait. You can't." },
      { id: "chair", label: "The armchair works too" },
    ],
    run: (e, choice) => {
      if (choice === "go") {
        e.p.money -= 15000;
        st(e, "happiness", 12);
        e.p.milestones.push({ year: e.s.worldYear, age: e.p.age, text: "The trip of a lifetime" });
        e.log("milestone", "You took the trip. The light on the water, the names of the places, the one meal you still dream about. The bucket is lighter. You are heavier, in the good way.");
      } else {
        st(e, "happiness", 2);
        e.log("neutral", "You stayed in the armchair. The armchair is a fine place to be. The trip is still in the bucket, patient as a tide.");
      }
    },
  },
  {
    id: "family-story", title: "The Wedding, Again", weight: 1, minAge: 70, maxAge: 99,
    when: (e) => e.p.childrenIds.length > 0,
    text: () => "You are telling the story of the wedding. You have not skipped a detail in twenty years. Nobody has asked you to stop.",
    choices: () => [
      { id: "tell", label: "Tell the whole thing" },
      { id: "tease", label: "Tease the ending, then tell it" },
    ],
    run: (e, choice) => {
      if (choice === "tell") {
        st(e, "happiness", 4);
        e.log("family", "You told the wedding story. The cake section is the longest. It has always been the cake.");
      } else {
        st(e, "happiness", 5);
        e.log("family", "You teased the ending. The room leaned in. The ending was the cake. It is always the cake.");
      }
    },
  },
  {
    id: "pension-letter", title: "The Form in Triplicate", weight: 1, minAge: 60, maxAge: 90, cool: 12,
    text: () => "A pension form arrives in triplicate. The pen is not provided. The pen must be a specific pen.",
    choices: () => [
      { id: "fill", label: "Fill it out, all three" },
      { id: "later", label: "Put it in the 'later' drawer" },
    ],
    run: (e, choice) => {
      if (choice === "fill") {
        st(e, "happiness", 2);
        e.log("neutral", "You filled out the form, all three copies, in the correct pen. The pension office, for once, is on time.");
      } else {
        st(e, "happiness", -1);
        e.log("neutral", "The form is in the 'later' drawer now. The drawer is a country. You are a citizen of it.");
      }
    },
  },
  {
    id: "quiet-evening", title: "The Quiet Evening", weight: 1, minAge: 75, maxAge: 99, cool: 6,
    text: () => "The house is quiet. The light is going gold. The day did what it was supposed to do.",
    choices: () => [
      { id: "sit", label: "Sit in it, fully" },
      { id: "walk", label: "One last slow walk" },
    ],
    run: (e, choice) => {
      const par = e.other(e.p.partnerId);
      if (choice === "sit") {
        st(e, "happiness", 3);
        e.log("neutral", `You sat in the quiet${par ? ` with ${par.firstName}'s hand in yours` : ""}. The quiet was full. The full was enough.`);
      } else {
        st(e, "health", 2);
        st(e, "happiness", 2);
        e.log("neutral", "You took the slow walk. The street knew your pace. The pace knew the street. It is a small, true thing.");
      }
    },
  },
];
