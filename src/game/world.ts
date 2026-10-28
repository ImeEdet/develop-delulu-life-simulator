import type { CountryDef, LanguageDef, NameOrder } from "./types";

export const LANGS: Record<string, LanguageDef> = {
  english: { id: "english", name: "English" },
  french: { id: "french", name: "French" },
  german: { id: "german", name: "German" },
  japanese: { id: "japanese", name: "Japanese" },
  korean: { id: "korean", name: "Korean" },
  portuguese: { id: "portuguese", name: "Portuguese" },
  spanish: { id: "spanish", name: "Spanish" },
  hindi: { id: "hindi", name: "Hindi" },
  italian: { id: "italian", name: "Italian" },
  yoruba: { id: "yoruba", name: "Yoruba" },
  hausa: { id: "hausa", name: "Hausa" },
  igbo: { id: "igbo", name: "Igbo" },
  tamil: { id: "tamil", name: "Tamil" },
  bengali: { id: "bengali", name: "Bengali" },
  punjabi: { id: "punjabi", name: "Punjabi" },
};

export const LANG_LIST = Object.values(LANGS);

interface CountrySeed extends Omit<CountryDef, "groups" | "nameOrder" | "schoolStart" | "secondaryStart" | "examAge" | "uniYears" | "retireAge"> {
  groups: string[];
  nameOrder: NameOrder;
  schoolStart: number;
  secondaryStart: number;
  examAge: number;
  uniYears: number;
  retireAge: number;
}

const DEF: Omit<CountrySeed, "id" | "name" | "code" | "colors" | "languages" | "currency" | "culture" | "cities" | "blurb"> = {
  wageIndex: 1, costIndex: 1, uniCost: 8000, eduQuality: 1, safety: 0.8,
  groups: ["anglo"], nameOrder: "first-last",
  schoolStart: 6, secondaryStart: 12, examAge: 18, uniYears: 4, retireAge: 65,
};

export const COUNTRIES: Record<string, CountryDef> = {
  us: {
    ...DEF,
    id: "us", name: "United States", code: "US", colors: ["#ff5fa2", "#a78bfa"],
    languages: ["english"], currency: { symbol: "$", rate: 1 },
    wageIndex: 1.15, costIndex: 1.1, uniCost: 24000, eduQuality: 1.15, safety: 0.8,
    culture: "anglo", groups: ["anglo", "hispanic", "multicultural"], nameOrder: "first-last",
    cities: ["New York", "Chicago", "Austin", "Portland", "Atlanta", "Miami", "Denver", "Seattle"],
    blurb: "The big, loud, expensive American dream.",
  },
  uk: {
    ...DEF,
    id: "uk", name: "United Kingdom", code: "UK", colors: ["#a78bfa", "#5ce8a9"],
    languages: ["english"], currency: { symbol: "£", rate: 0.79 },
    wageIndex: 0.95, costIndex: 1.0, uniCost: 12000, eduQuality: 1.1, safety: 0.8,
    culture: "anglo", groups: ["anglo", "multicultural"], nameOrder: "first-last",
    schoolStart: 5, secondaryStart: 11, examAge: 18, uniYears: 3, retireAge: 66,
    cities: ["London", "Manchester", "Bristol", "Leeds", "Edinburgh", "Cardiff", "Norwich", "Sheffield"],
    blurb: "Queens, rain, and an unbreakable talent for understatement.",
  },
  ca: {
    ...DEF,
    id: "ca", name: "Canada", code: "CA", colors: ["#ff6b6b", "#f4efff"],
    languages: ["english", "french"], currency: { symbol: "C$", rate: 1.36 },
    wageIndex: 1.0, costIndex: 0.95, uniCost: 15000, eduQuality: 1.05, safety: 0.9,
    culture: "anglo", groups: ["anglo", "french"], nameOrder: "first-last",
    cities: ["Toronto", "Vancouver", "Montréal", "Calgary", "Halifax", "Ottawa", "Winnipeg", "Victoria"],
    blurb: "Polite to a fault, cold to match.",
  },
  fr: {
    ...DEF,
    id: "fr", name: "France", code: "FR", colors: ["#a78bfa", "#ff5fa2"],
    languages: ["french"], currency: { symbol: "€", rate: 0.92 },
    wageIndex: 0.95, costIndex: 1.0, uniCost: 9000, eduQuality: 1.0, safety: 0.75,
    culture: "french", groups: ["french"], nameOrder: "first-last",
    schoolStart: 6, secondaryStart: 11, examAge: 18, uniYears: 3, retireAge: 64,
    cities: ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Nantes", "Nice", "Toulouse"],
    blurb: "Long lunches, long history, and opinions about both.",
  },
  de: {
    ...DEF,
    id: "de", name: "Germany", code: "DE", colors: ["#ffd166", "#ff6b6b"],
    languages: ["german"], currency: { symbol: "€", rate: 0.92 },
    wageIndex: 1.1, costIndex: 1.0, uniCost: 7000, eduQuality: 1.1, safety: 0.85,
    culture: "german", groups: ["german"], nameOrder: "first-last",
    schoolStart: 6, secondaryStart: 10, examAge: 18, uniYears: 4, retireAge: 67,
    cities: ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt", "Leipzig", "Bremen", "Nuremberg"],
    blurb: "Everything runs on time, including your destiny.",
  },
  jp: {
    ...DEF,
    id: "jp", name: "Japan", code: "JP", colors: ["#ff5fa2", "#f4efff"],
    languages: ["japanese"], currency: { symbol: "¥", rate: 155 },
    wageIndex: 1.05, costIndex: 0.95, uniCost: 11000, eduQuality: 1.15, safety: 0.95,
    culture: "japanese", groups: ["japanese"], nameOrder: "last-first",
    cities: ["Tokyo", "Osaka", "Kyoto", "Sapporo", "Fukuoka", "Nagoya", "Hiroshima", "Yokohama"],
    blurb: "Cherry blossoms, vending machines, and impeccable bows.",
  },
  kr: {
    ...DEF,
    id: "kr", name: "South Korea", code: "KR", colors: ["#5ce8a9", "#a78bfa"],
    languages: ["korean"], currency: { symbol: "₩", rate: 1380 },
    wageIndex: 1.15, costIndex: 1.0, uniCost: 10000, eduQuality: 1.2, safety: 0.9,
    culture: "korean", groups: ["korean"], nameOrder: "last-first",
    cities: ["Seoul", "Busan", "Daegu", "Incheon", "Daejeon", "Gwangju", "Suwon", "Ulsan"],
    blurb: "Noodles at 3 a.m., ambition by sunrise.",
  },
  br: {
    ...DEF,
    id: "br", name: "Brazil", code: "BR", colors: ["#5ce8a9", "#ffd166"],
    languages: ["portuguese"], currency: { symbol: "R$", rate: 5.4 },
    wageIndex: 0.6, costIndex: 0.7, uniCost: 5000, eduQuality: 0.9, safety: 0.5,
    culture: "brazilian", groups: ["brazilian"], nameOrder: "first-last",
    schoolStart: 6, secondaryStart: 11, examAge: 17, uniYears: 4, retireAge: 62,
    cities: ["São Paulo", "Rio de Janeiro", "Salvador", "Curitiba", "Belo Horizonte", "Recife", "Porto Alegre", "Florianópolis"],
    blurb: "Samba in the streets, feijoada on Sundays.",
  },
  in: {
    ...DEF,
    id: "in", name: "India", code: "IN", colors: ["#ffb054", "#ff5fa2"],
    languages: ["hindi", "english", "tamil", "bengali", "punjabi"], currency: { symbol: "₹", rate: 84 },
    wageIndex: 0.45, costIndex: 0.55, uniCost: 3000, eduQuality: 1.0, safety: 0.6,
    culture: "indian", groups: ["hindi-north", "tamil-south", "bengali", "punjabi"], nameOrder: "first-last",
    schoolStart: 6, secondaryStart: 11, examAge: 17, uniYears: 4, retireAge: 60,
    cities: ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Jaipur", "Pune"],
    blurb: "A billion people, one very crowded miracle.",
  },
  ng: {
    ...DEF,
    id: "ng", name: "Nigeria", code: "NG", colors: ["#5ce8a9", "#1c1435"],
    languages: ["english", "yoruba", "hausa", "igbo"], currency: { symbol: "₦", rate: 1550 },
    wageIndex: 0.35, costIndex: 0.5, uniCost: 4000, eduQuality: 0.95, safety: 0.45,
    culture: "westafrican", groups: ["yoruba", "igbo", "hausa", "edo", "ibibio", "nigerian-english"], nameOrder: "first-last",
    schoolStart: 6, secondaryStart: 12, examAge: 17, uniYears: 4, retireAge: 60,
    cities: ["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Enugu", "Benin City", "Onitsha"],
    blurb: "The giant of Africa, powered by jollof pride.",
  },
  mx: {
    ...DEF,
    id: "mx", name: "Mexico", code: "MX", colors: ["#5ce8a9", "#ffd166"],
    languages: ["spanish"], currency: { symbol: "MX$", rate: 17 },
    wageIndex: 0.5, costIndex: 0.6, uniCost: 4000, eduQuality: 0.9, safety: 0.55,
    culture: "hispanic", groups: ["hispanic"], nameOrder: "first-last",
    cities: ["Mexico City", "Guadalajara", "Monterrey", "Mérida", "Puebla", "Tijuana", "Cancún", "Oaxaca"],
    blurb: "Marigolds, mezcal, and family dinners that last four hours.",
  },
  it: {
    ...DEF,
    id: "it", name: "Italy", code: "IT", colors: ["#5ce8a9", "#ff6b6b"],
    languages: ["italian"], currency: { symbol: "€", rate: 0.92 },
    wageIndex: 0.9, costIndex: 0.95, uniCost: 6000, eduQuality: 1.0, safety: 0.8,
    culture: "italian", groups: ["italian"], nameOrder: "first-last",
    schoolStart: 6, secondaryStart: 11, examAge: 18, uniYears: 4, retireAge: 67,
    cities: ["Rome", "Milan", "Naples", "Turin", "Bologna", "Florence", "Venice", "Palermo"],
    blurb: "Pasta is a food group. Also the whole personality.",
  },
};

export const COUNTRY_LIST = Object.values(COUNTRIES);

export function country(id: string): CountryDef {
  return COUNTRIES[id] ?? COUNTRIES.us;
}

export function nativeLangs(countryId: string): string[] {
  return country(countryId).languages;
}

export function fmtMoney(usd: number, countryId: string): string {
  const c = country(countryId);
  const v = usd * c.currency.rate;
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  let num: string;
  if (a >= 1e9) num = (a / 1e9).toFixed(1) + "B";
  else if (a >= 1e6) num = (a / 1e6).toFixed(1) + "M";
  else if (a >= 1e4) num = Math.round(a / 1e3) + "K";
  else num = Math.round(a).toString();
  return sign + c.currency.symbol + num;
}
