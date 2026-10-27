import type { Char, JobDef, Stage, TraitDef } from "./types";
import { country, fmtMoney } from "./world";

export const TRAITS: Record<string, TraitDef> = {
  brave: { id: "brave", name: "Brave", desc: "Walks toward the weird stuff. Others step back; they step forward.", color: "#ffb054", health: 1 },
  shy: { id: "shy", name: "Shy", desc: "Has a great answer. Rarely gets to say it.", color: "#a78bfa", social: -1 },
  ambitious: { id: "ambitious", name: "Ambitious", desc: "Treats the five-year plan like a personal rival.", color: "#ffd166", career: 1 },
  kind: { id: "kind", name: "Kind", desc: "Remembers people's birthdays. Unnaturally.", color: "#5ce8a9", social: 1 },
  grumpy: { id: "grumpy", name: "Grumpy", desc: "Mornings are the enemy. So are small talk and coffee orders.", color: "#ff6b6b", social: -1 },
  creative: { id: "creative", name: "Creative", desc: "Sees the world in doodles, metaphors, and questionable outfits.", color: "#ff5fa2", charm: 1 },
  lazy: { id: "lazy", name: "Lazy", desc: "Professional couch explorer. The couch wins.", color: "#a395cc", career: -1 },
  disciplined: { id: "disciplined", name: "Disciplined", desc: "Alarm clock: set. Excuses: not found.", color: "#5ce8a9", career: 1, health: 1 },
  funny: { id: "funny", name: "Funny", desc: "Will make the dentist appointment bearable. For everyone.", color: "#ffd166", social: 1, charm: 1 },
  rude: { id: "rude", name: "Rude", desc: "Honest, but the honesty has a bite.", color: "#ff6b6b", social: -1 },
  optimist: { id: "optimist", name: "Optimist", desc: "Sees the silver lining. Sometimes manufactures one.", color: "#5ce8a9", charm: 1 },
  cautious: { id: "cautious", name: "Cautious", desc: "Reads the terms. Also the ingredients.", color: "#a78bfa" },
  honest: { id: "honest", name: "Honest", desc: "The truth, delivered at eye level.", color: "#a78bfa", social: 1 },
  charming: { id: "charming", name: "Charming", desc: "Can talk a dog out of a coat. The dog would confirm this.", color: "#ff5fa2", charm: 1 },
  rebellious: { id: "rebellious", name: "Rebellious", desc: "Rules are more like suggestions with extra steps.", color: "#ff5fa2", social: 1 },
  curious: { id: "curious", name: "Curious", desc: "Opens the forbidden drawer. Always.", color: "#ffd166" },
};

export const TRAIT_LIST = Object.values(TRAITS);

export const SENIORITY = ["", "Senior ", "Lead ", "Principal "];

export const JOBS: Record<string, JobDef> = {
  barista: { id: "barista", title: "Café Barista", minAge: 16, edu: "none", salary: 22000, smartsReq: 10, desc: "Foam art, small talk, free beans." },
  retail: { id: "retail", title: "Retail Associate", minAge: 16, edu: "none", salary: 24000, smartsReq: 10, desc: "Finding the size that doesn't exist." },
  delivery: { id: "delivery", title: "Delivery Driver", minAge: 17, edu: "none", salary: 26000, smartsReq: 15, desc: "A tour of every terrible parking job in town." },
  factory: { id: "factory", title: "Factory Worker", minAge: 16, edu: "none", salary: 28000, smartsReq: 15, desc: "The beeping machine. You beeping back." },
  chef: { id: "chef", title: "Chef", minAge: 16, edu: "secondary", salary: 34000, smartsReq: 40, desc: "Kitchens, chaos, and one perfect soufflé." },
  mechanic: { id: "mechanic", title: "Auto Mechanic", minAge: 17, edu: "secondary", salary: 34000, smartsReq: 45, desc: "Speaks fluent engine. Also 'that thing'." },
  nurse: { id: "nurse", title: "Nurse", minAge: 18, edu: "secondary", salary: 44000, smartsReq: 55, desc: "Hero of the ward, boss of the beeping machines." },
  farmer: { id: "farmer", title: "Small Farmer", minAge: 18, edu: "secondary", salary: 30000, smartsReq: 35, desc: "Weather risk, soil wisdom, one very opinionated goat." },
  office: { id: "office", title: "Office Administrator", minAge: 18, edu: "secondary", salary: 36000, smartsReq: 40, desc: "The glue. The printer's enemy." },
  realestate: { id: "realestate", title: "Real Estate Agent", minAge: 20, edu: "none", salary: 32000, smartsReq: 35, desc: "'Open concept' in 4,000 variations." },
  artist: { id: "artist", title: "Freelance Artist", minAge: 18, edu: "none", salary: 26000, smartsReq: 40, unstable: true, desc: "Glory and ramen. In that order, usually." },
  musician: { id: "musician", title: "Musician", minAge: 18, edu: "none", salary: 28000, smartsReq: 40, unstable: true, desc: "Three encores, two busking gigs, one van." },
  teacher: { id: "teacher", title: "Teacher", minAge: 20, edu: "university", salary: 40000, smartsReq: 50, majors: ["education"], desc: "Chalk dust and quiet victories." },
  designer: { id: "designer", title: "Graphic Designer", minAge: 20, edu: "university", salary: 46000, smartsReq: 50, majors: ["art"], desc: "Moving pixels until the logo 'feels right'." },
  journalist: { id: "journalist", title: "Journalist", minAge: 20, edu: "university", salary: 48000, smartsReq: 55, majors: ["journalism"], desc: "Asks the question everyone was avoiding." },
  dev: { id: "dev", title: "Software Engineer", minAge: 21, edu: "university", salary: 78000, smartsReq: 60, majors: ["cs"], desc: "Bugs are just features that want out." },
  engineer: { id: "engineer", title: "Civil Engineer", minAge: 22, edu: "university", salary: 66000, smartsReq: 58, majors: ["engineering"], desc: "Makes bridges not fall. Mostly." },
  doctor: { id: "doctor", title: "Physician", minAge: 24, edu: "university", salary: 95000, smartsReq: 78, majors: ["medicine"], desc: "The stethoscope legend of the ward." },
  lawyer: { id: "lawyer", title: "Lawyer", minAge: 23, edu: "university", salary: 88000, smartsReq: 70, majors: ["law"], desc: "Finds the loophole before lunch." },
  scientist: { id: "scientist", title: "Research Scientist", minAge: 24, edu: "university", salary: 70000, smartsReq: 72, majors: ["biology"], desc: "Publishes, peeks under microscopes, questions everything." },
  business: { id: "business", title: "Business Owner", minAge: 22, edu: "none", salary: 70000, smartsReq: 55, unstable: true, desc: "The family name on the door. The debt on the books." },
  exec: { id: "exec", title: "Corporate Executive", minAge: 28, edu: "university", salary: 140000, smartsReq: 75, majors: ["business"], desc: "Corner office, cornered by spreadsheets." },
};

export const JOB_LIST = Object.values(JOBS);

export const MAJOR_LIST = [
  { id: "cs", name: "Computer Science" },
  { id: "medicine", name: "Medicine" },
  { id: "law", name: "Law" },
  { id: "business", name: "Business" },
  { id: "engineering", name: "Engineering" },
  { id: "art", name: "Fine Arts" },
  { id: "journalism", name: "Journalism" },
  { id: "education", name: "Education" },
  { id: "biology", name: "Biology" },
];

export const EMPLOYERS = [
  "Nimbus Labs", "ByteHaven", "Cobalt & Co.", "Paper Moon Studio", "Blue Harbor Group",
  "Sunspire Industries", "The Daily Quill", "Harborlight Clinic", "Mango & Pine",
  "Redbird Studios", "Ferro Works", "Cedar Street Partners", "Lumen Tower", "Saltwater Bank",
  "Kite & Anchor", "Golden Gate Logistics", "Velvet Antler Co.", "Northwind Traders",
  "The Copper Kettle", "Starling Media", "Osprey & Sons", "Marigold Holdings",
];

export const CARS = [
  "a trusty old hatchback", "a shiny new sedan", "a loud, proud muscle car", "a practical electric SUV",
  "a beat-up van named 'The Cloud'", "a tiny convertible that fits two (and one dog)", "a very reliable used truck",
];

export const FIRST_WORDS: Record<string, string> = {
  english: "mama", french: "maman", german: "mama", japanese: "mama (ママ)", korean: "eomma",
  portuguese: "mãe", spanish: "mamá", hindi: "mummy", italian: "mamma", yoruba: "mama",
};

export const YOUNG_ACCIDENTS = [
  "a rogue bicycle", "a very confident goose", "a seagull mid-sandwich",
  "tripping over their own optimism", "a shopping-cart incident", "one (1) extremely aggressive lawnmower",
];
export const MID_CAUSES = ["a stubborn illness", "a heart that worked hard", "an accident no one saw coming"];
export const OLD_CAUSES = ["old age, peacefully", "a quiet heart", "dreaming of the sea", "finally getting that long nap"];

export const EPITAPHS: Record<string, string> = {
  health: "They kept moving long after the rest of us gave in.",
  happiness: "People felt calmer in that room. That was never an accident.",
  smarts: "The hard questions were their favorite kind.",
  looks: "Half the doors opened a little faster when they walked in.",
};

export interface ActionDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  group: string;
  minAge?: number;
  maxAge?: number;
  cost?: number;
  opt?: { kind: "lang" | "country"; label: string };
  lock?: (p: Char) => string | null;
}

export const ACTIONS: ActionDef[] = [
  { id: "exercise", name: "Work Out", desc: "Sweat a little, feel a lot better.", icon: "pulse", group: "Everyday", lock: (p) => (p.age < 3 ? "You are a baby. You have mastered leg kicks." : null) },
  { id: "study", name: "Study", desc: "Feed the brain. It is always hungry.", icon: "book", group: "Everyday", lock: (p) => (p.age < 3 ? "Books are for later. For now: blocks." : null) },
  { id: "meditate", name: "Meditate", desc: "Breathe in the chaos, breathe it out.", icon: "leaf", group: "Everyday", minAge: 8 },
  { id: "socialize", name: "See Friends", desc: "Coffee, gossip, and one shared playlist.", icon: "users", group: "Everyday", minAge: 10, lock: (p) => (p.friends.length === 0 ? "No one to hang out with yet." : null) },
  { id: "party", name: "Throw a Party", desc: "Speakers up. Dignity negotiable.", icon: "spark", group: "Everyday", minAge: 16, cost: 150 },

  { id: "invest", name: "Invest $10K", desc: "Put money to work. It sometimes works back.", icon: "wallet", group: "Money", minAge: 20, cost: 10000, lock: (p) => (p.money < 10000 ? "You need $10K to spare." : null) },
  { id: "lottery", name: "Lottery Ticket", desc: "A realistic plan to be unrealistic.", icon: "dice", group: "Money", minAge: 18, cost: 20 },
  { id: "car", name: "Buy a Car", desc: "Freedom, four wheels, one exhaust note.", icon: "car", group: "Money", minAge: 18, cost: 28000, lock: (p) => (p.car ? "You already own a car." : p.money < 28000 ? "You need $28K." : null) },
  {
    id: "house",
    name: "Buy a House",
    desc: "30% down, 100% of the stress (worth it?).",
    icon: "home",
    group: "Money",
    minAge: 21,
    lock: (p) =>
      p.house
        ? "You already own a home."
        : p.money < Math.round(160000 * country(p.countryId).costIndex * 0.3)
          ? `Need ~30% down (≈ ${fmtMoney(160000 * country(p.countryId).costIndex * 0.3, p.countryId)}).`
          : null,
  },
  { id: "vacation", name: "Take a Vacation", desc: "You. A plane. A stranger's beach.", icon: "plane", group: "Money", cost: 3000, minAge: 8, lock: (p) => (p.money < 3000 ? "You need $3K." : p.age < 18 && !p.job ? "Parents have to agree. They didn't." : null) },
  { id: "gift", name: "Gift for a Child", desc: "One more toy. One more reason to love you.", icon: "gift", group: "Money", cost: 200, lock: (p) => (p.childrenIds.length === 0 ? "No children to spoil yet." : null) },

  { id: "date", name: "Go on a Date", desc: "New person, new playlist, new hope.", icon: "heart", group: "Relationships", minAge: 16, lock: (p) => (p.partnerId ? "You're already seeing someone." : null) },
  { id: "quality", name: "Quality Time", desc: "Put the phone down. Look at them.", icon: "ring", group: "Relationships", lock: (p) => (!p.partnerId ? "No partner to spend time with." : null) },
  { id: "propose", name: "Propose", desc: "Knee down, heart up.", icon: "ring", group: "Relationships", minAge: 18, lock: (p) => (!p.partnerId ? "You need a partner first." : p.flags.includes("married") ? "Already married." : (p.partnerValue ?? 50) < 65 ? "You two aren't there yet (65+ closeness)." : null) },
  { id: "divorce", name: "Get a Divorce", desc: "It's not you. It's... both of you.", icon: "x", group: "Relationships", minAge: 18, lock: (p) => (!p.flags.includes("married") ? "Not currently married." : null) },
  { id: "baby", name: "Try for a Baby", desc: "A tiny chaos engine, delivered by courier.", icon: "baby", group: "Relationships", minAge: 18, maxAge: 50, lock: (p) => (!p.partnerId ? "You need a partner." : null) },
  { id: "adopt", name: "Adopt", desc: "Open the door. A whole world comes in.", icon: "gift", group: "Relationships", minAge: 21, cost: 8000, lock: (p) => (p.money < 8000 ? "You need $8K." : null) },

  { id: "jobhunt", name: "Job Hunt", desc: "Cover letter, deep breath, knock.", icon: "briefcase", group: "Bigger Moves", minAge: 16, lock: (p) => (p.job ? "You're already employed." : p.retired ? "Retired. The couch is your boss." : p.uni ? "University has you on pause." : null) },
  { id: "promote", name: "Ask for a Promotion", desc: "Make your case. Bring coffee.", icon: "target", group: "Bigger Moves", lock: (p) => (!p.job ? "No job to get promoted in." : (p.job?.years ?? 0) < 2 ? "Work here at least 2 years first." : null) },
  { id: "resign", name: "Quit Your Job", desc: "Two weeks' notice, zero regrets (briefly).", icon: "x", group: "Bigger Moves", lock: (p) => (!p.job ? "You have no job to quit." : null) },
  {
    id: "uni-enroll",
    name: "Back to University",
    desc: "It's never too late for a second first year.",
    icon: "book",
    group: "Bigger Moves",
    minAge: 18,
    lock: (p) =>
      p.uni
        ? "You're already at university."
        : p.education === "university"
          ? "You already hold a degree."
          : (p.examScore ?? 0) < 55
            ? "You need a 55+ exam score."
            : p.job
              ? "Quit your job first."
              : null,
  },
  { id: "retire", name: "Retire Now", desc: "The pension letter reads like a victory lap.", icon: "sun", group: "Bigger Moves", minAge: 55, lock: (p) => (!p.job ? "Nothing to retire from." : p.age < 55 ? "At least wait until 55." : null) },
  { id: "learn", name: "Learn a Language", desc: "Tongue twisters, wrong verbs, right vibes.", icon: "globe", group: "Bigger Moves", minAge: 5, opt: { kind: "lang", label: "Pick a language" } },
  { id: "emigrate", name: "Move Abroad", desc: "New country, new currency, same you (probably).", icon: "plane", group: "Bigger Moves", minAge: 18, cost: 12000, opt: { kind: "country", label: "Pick a destination" }, lock: (p) => (p.money < 18000 ? "You need $18K (fees + a buffer)." : null) },
];

export function traitMod(p: Char, key: "social" | "career" | "health" | "charm"): number {
  let m = 0;
  for (const t of p.traits) {
    const d = TRAITS[t];
    if (d) m += d[key] ?? 0;
  }
  return m;
}

export function stageOf(age: number): Stage {
  if (age < 12) return "child";
  if (age < 18) return "teen";
  if (age < 60) return "adult";
  return "senior";
}

export function suggestedMajor(p: Char): string {
  const r = Math.random;
  if (p.smarts >= 75 && r() < 0.5) return r() < 0.5 ? "cs" : "medicine";
  if (p.smarts >= 60) return ["law", "business", "engineering", "cs"][Math.floor(r() * 4)];
  if (p.looks >= 65 && r() < 0.4) return r() < 0.5 ? "art" : "journalism";
  return ["business", "education", "biology", "journalism"][Math.floor(r() * 4)];
}

export function hasFluency(p: Char, countryId: string): boolean {
  const native = country(countryId).languages[0];
  return (p.languages[native] ?? 0) >= 50;
}

export function isImmigrant(p: Char): boolean {
  const native = country(p.countryId).languages[0];
  return p.flags.includes("immigrant") && (p.languages[native] ?? 0) < 50;
}

export function eligibleJobs(p: Char): JobDef[] {
  return JOB_LIST.filter((j) => {
    if (p.age < j.minAge) return false;
    if (j.edu === "university" && p.education !== "university") return false;
    if (p.smarts < j.smartsReq) return false;
    return true;
  });
}

export function jobSalary(job: JobDef, p: Char, seniority: number): number {
  const c = country(p.countryId);
  const base = job.salary * c.wageIndex * (1 + seniority * 0.22);
  const smart = 1 + (p.smarts - 50) / 400;
  return Math.round((base * smart) / 500) * 500;
}

export function hiringChance(p: Char, job: JobDef): number {
  let c = 0.32 + p.smarts / 320;
  if (job.edu !== "none") c += 0.1;
  if (p.uni && job.majors?.includes(p.uni.major)) c += 0.12;
  else if (p.education === "university") c += 0.04;
  c += traitMod(p, "career") * 0.03;
  c += traitMod(p, "charm") * 0.02;
  if (isImmigrant(p)) c -= 0.16;
  return Math.min(0.92, Math.max(0.08, c));
}

export function livingCost(p: Char): number {
  const c = country(p.countryId);
  const kids = Math.min(p.childrenIds.length, 5);
  let mult = 1 + kids * 0.28;
  let cost = 12500 * c.costIndex * mult;
  if (p.car) cost += 1200;
  if (p.house) cost *= 0.85;
  return Math.round(cost);
}

export function allowanceFor(p: Char): number {
  const tier = p.wealthTier ?? 1;
  return [120, 280, 500, 900][tier] ?? 280;
}
