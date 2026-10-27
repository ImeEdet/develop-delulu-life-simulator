import type { CountryDef, LanguageDef } from "./types";

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
};

export const LANG_LIST = Object.values(LANGS);

export const COUNTRIES: Record<string, CountryDef> = {
  us: {
    id: "us", name: "United States", code: "US", colors: ["#ff5fa2", "#a78bfa"],
    languages: ["english"], currency: { symbol: "$", rate: 1 },
    wageIndex: 1.15, costIndex: 1.1, uniCost: 24000, eduQuality: 1.15, safety: 0.8,
    culture: "anglo",
    cities: ["New York", "Chicago", "Austin", "Portland", "Atlanta", "Miami", "Denver", "Seattle"],
    blurb: "The big, loud, expensive American dream.",
  },
  uk: {
    id: "uk", name: "United Kingdom", code: "UK", colors: ["#a78bfa", "#5ce8a9"],
    languages: ["english"], currency: { symbol: "£", rate: 0.79 },
    wageIndex: 0.95, costIndex: 1.0, uniCost: 12000, eduQuality: 1.1, safety: 0.8,
    culture: "anglo",
    cities: ["London", "Manchester", "Bristol", "Leeds", "Edinburgh", "Cardiff", "Norwich", "Sheffield"],
    blurb: "Queens, rain, and an unbreakable talent for understatement.",
  },
  ca: {
    id: "ca", name: "Canada", code: "CA", colors: ["#ff6b6b", "#f4efff"],
    languages: ["english", "french"], currency: { symbol: "C$", rate: 1.36 },
    wageIndex: 1.0, costIndex: 0.95, uniCost: 15000, eduQuality: 1.05, safety: 0.9,
    culture: "anglo",
    cities: ["Toronto", "Vancouver", "Montréal", "Calgary", "Halifax", "Ottawa", "Winnipeg", "Victoria"],
    blurb: "Polite to a fault, cold to match.",
  },
  fr: {
    id: "fr", name: "France", code: "FR", colors: ["#a78bfa", "#ff5fa2"],
    languages: ["french"], currency: { symbol: "€", rate: 0.92 },
    wageIndex: 0.95, costIndex: 1.0, uniCost: 9000, eduQuality: 1.0, safety: 0.75,
    culture: "french",
    cities: ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Nantes", "Nice", "Toulouse"],
    blurb: "Long lunches, long history, and opinions about both.",
  },
  de: {
    id: "de", name: "Germany", code: "DE", colors: ["#ffd166", "#ff6b6b"],
    languages: ["german"], currency: { symbol: "€", rate: 0.92 },
    wageIndex: 1.1, costIndex: 1.0, uniCost: 7000, eduQuality: 1.1, safety: 0.85,
    culture: "german",
    cities: ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt", "Leipzig", "Bremen", "Nuremberg"],
    blurb: "Everything runs on time, including your destiny.",
  },
  jp: {
    id: "jp", name: "Japan", code: "JP", colors: ["#ff5fa2", "#f4efff"],
    languages: ["japanese"], currency: { symbol: "¥", rate: 155 },
    wageIndex: 1.05, costIndex: 0.95, uniCost: 11000, eduQuality: 1.15, safety: 0.95,
    culture: "japanese",
    cities: ["Tokyo", "Osaka", "Kyoto", "Sapporo", "Fukuoka", "Nagoya", "Hiroshima", "Yokohama"],
    blurb: "Cherry blossoms, vending machines, and impeccable bows.",
  },
  kr: {
    id: "kr", name: "South Korea", code: "KR", colors: ["#5ce8a9", "#a78bfa"],
    languages: ["korean"], currency: { symbol: "₩", rate: 1380 },
    wageIndex: 1.15, costIndex: 1.0, uniCost: 10000, eduQuality: 1.2, safety: 0.9,
    culture: "korean",
    cities: ["Seoul", "Busan", "Daegu", "Incheon", "Daejeon", "Gwangju", "Suwon", "Ulsan"],
    blurb: "Noodles at 3 a.m., ambition by sunrise.",
  },
  br: {
    id: "br", name: "Brazil", code: "BR", colors: ["#5ce8a9", "#ffd166"],
    languages: ["portuguese"], currency: { symbol: "R$", rate: 5.4 },
    wageIndex: 0.6, costIndex: 0.7, uniCost: 5000, eduQuality: 0.9, safety: 0.5,
    culture: "brazilian",
    cities: ["São Paulo", "Rio de Janeiro", "Salvador", "Curitiba", "Belo Horizonte", "Recife", "Porto Alegre", "Florianópolis"],
    blurb: "Samba in the streets, feijoada on Sundays.",
  },
  in: {
    id: "in", name: "India", code: "IN", colors: ["#ffb054", "#ff5fa2"],
    languages: ["hindi", "english"], currency: { symbol: "₹", rate: 84 },
    wageIndex: 0.45, costIndex: 0.55, uniCost: 3000, eduQuality: 1.0, safety: 0.6,
    culture: "indian",
    cities: ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Jaipur", "Pune"],
    blurb: "A billion people, one very crowded miracle.",
  },
  ng: {
    id: "ng", name: "Nigeria", code: "NG", colors: ["#5ce8a9", "#1c1435"],
    languages: ["english", "yoruba"], currency: { symbol: "₦", rate: 1550 },
    wageIndex: 0.35, costIndex: 0.5, uniCost: 4000, eduQuality: 0.95, safety: 0.45,
    culture: "westafrican",
    cities: ["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Enugu", "Benin City", "Onitsha"],
    blurb: "The giant of Africa, powered by jollof pride.",
  },
  mx: {
    id: "mx", name: "Mexico", code: "MX", colors: ["#5ce8a9", "#ffd166"],
    languages: ["spanish"], currency: { symbol: "MX$", rate: 17 },
    wageIndex: 0.5, costIndex: 0.6, uniCost: 4000, eduQuality: 0.9, safety: 0.55,
    culture: "hispanic",
    cities: ["Mexico City", "Guadalajara", "Monterrey", "Mérida", "Puebla", "Tijuana", "Cancún", "Oaxaca"],
    blurb: "Marigolds, mezcal, and family dinners that last four hours.",
  },
  it: {
    id: "it", name: "Italy", code: "IT", colors: ["#5ce8a9", "#ff6b6b"],
    languages: ["italian"], currency: { symbol: "€", rate: 0.92 },
    wageIndex: 0.9, costIndex: 0.95, uniCost: 6000, eduQuality: 1.0, safety: 0.8,
    culture: "italian",
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
  if (a >= 1e6) num = (a / 1e6).toFixed(1) + "M";
  else if (a >= 1e4) num = Math.round(a / 1e3) + "K";
  else num = Math.round(a).toString();
  return sign + c.currency.symbol + num;
}

export interface NamePool {
  m: string[];
  f: string[];
  s: string[];
}

export const NAMES: Record<string, NamePool> = {
  anglo: {
    m: ["Oliver", "James", "Noah", "Liam", "Henry", "George", "Arthur", "Freddie", "Oscar", "Alfie", "Harry", "Charlie", "Leo", "Jasper", "Milo", "Theo", "Felix", "Winston", "Declan", "Rupert"],
    f: ["Amelia", "Olivia", "Ivy", "Ruby", "Hazel", "Freya", "Poppy", "Maisie", "Daisy", "Eloise", "Matilda", "Florence", "Clara", "Nora", "Rosie", "Wren", "June", "Alice", "Violet", "Margot"],
    s: ["Smith", "Hughes", "Carter", "Bennett", "Walsh", "Mercer", "Ellery", "Whitfield", "Nash", "Pemberton", "Ashford", "Crane", "Doyle", "Hartley", "Quinn"],
  },
  french: {
    m: ["Louis", "Jules", "Gabriel", "Arthur", "Nathan", "Hugo", "Lucas", "Adrien", "Mathis", "Romain", "Étienne", "Célestin", "Basile", "Théophile", "Maxime", "Sacha", "Bastien", "Émile"],
    f: ["Camille", "Louise", "Chloé", "Léonie", "Manon", "Zoé", "Inès", "Margaux", "Élise", "Jeanne", "Clémence", "Adèle", "Océane", "Alice", "Romane", "Prune", "Violette", "Estelle"],
    s: ["Martin", "Dubois", "Bernard", "Moreau", "Laurent", "Petit", "Fournier", "Girard", "Lefèvre", "Renard", "Beaulieu", "Delacroix", "Vasseur", "Charpentier"],
  },
  german: {
    m: ["Ludwig", "Felix", "Jonas", "Emil", "Oskar", "Henri", "Konrad", "Magnus", "Bruno", "Tobias", "Max", "Friedrich", "Heinrich", "Otto", "Elias", "Moritz", "Werner", "Gustav"],
    f: ["Emma", "Clara", "Frieda", "Greta", "Lina", "Hanna", "Ursula", "Roswitha", "Leni", "Anneliese", "Mathilde", "Ingrid", "Elsa", "Hedwig", "Vera", "Johanna", "Luise", "Käthe"],
    s: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Becker", "Hoffmann", "Wagner", "Klein", "Braun", "Vogel", "Winterstein", "Roth", "Brandt"],
  },
  japanese: {
    m: ["Haruto", "Sota", "Ren", "Kaito", "Yuto", "Riku", "Hiro", "Takeshi", "Kenji", "Minato", "Akira", "Daichi", "Ryo", "Genki", "Shun", "Koki", "Daiki", "Sōta"],
    f: ["Hina", "Sora", "Yui", "Aoi", "Sana", "Mei", "Miu", "Hana", "Chiyo", "Nao", "Kira", "Riko", "Sumire", "Emi", "Koyuki", "Tsubaki", "Rina", "Yuzu"],
    s: ["Sato", "Suzuki", "Tanaka", "Takahashi", "Watanabe", "Ito", "Nakamura", "Kobayashi", "Kato", "Yamamoto", "Mori", "Fujii", "Hayashi", "Ishikawa"],
  },
  korean: {
    m: ["Jun", "Minjun", "Doyun", "Hyun", "Seojun", "Jiho", "Tae", "Junseo", "Hyeon", "Baek", "Donghui", "Sangmin", "Woo", "Kitae", "Hangyeol", "Daeho", "Jisu", "Seo"],
    f: ["Jiwoo", "Soyeon", "Haeun", "Yuna", "Seoyeon", "Jimin", "Suah", "Haji", "Narae", "Gaein", "Yeonju", "Hyerim", "Daewon", "Mira", "Sohyun", "Jian", "Yeeun", "Haru"],
    s: ["Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon", "Jang", "Lim", "Han", "Seo", "Oh", "Shim", "Kwon", "Hwang"],
  },
  brazilian: {
    m: ["João", "Lucas", "Mateus", "Rafael", "Gabriel", "Pedro", "Thiago", "Enzo", "Caio", "Bruno", "Vinícius", "Arthur", "Felipe", "Diego", "Matheus", "Gustavo", "André", "Igor"],
    f: ["Maria", "Ana", "Luiza", "Helena", "Beatriz", "Clara", "Laura", "Manuela", "Sophia", "Júlia", "Isabela", "Bianca", "Alice", "Camila", "Larissa", "Vitória", "Letícia", "Marina"],
    s: ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Ferreira", "Almeida", "Rodrigues", "Nunes", "Ribeiro", "Cardoso", "Moreira", "Teixeira"],
  },
  indian: {
    m: ["Arjun", "Rohan", "Vikram", "Kabir", "Aarav", "Dev", "Ishaan", "Manav", "Anirudh", "Kunal", "Ravi", "Harsh", "Nikhil", "Siddharth", "Aditya", "Devansh", "Pranav", "Varun"],
    f: ["Ananya", "Priya", "Diya", "Meera", "Isha", "Tara", "Kavya", "Sana", "Nisha", "Pooja", "Ritika", "Alina", "Zoya", "Ishita", "Divya", "Aaliya", "Kirti", "Rhea"],
    s: ["Sharma", "Verma", "Patel", "Iyer", "Nair", "Reddy", "Gupta", "Chawla", "Mehta", "Kapoor", "Bose", "Sinha", "Malhotra", "Bhatia"],
  },
  westafrican: {
    m: ["Chidi", "Emeka", "Obi", "Femi", "Wale", "Tunde", "Ayo", "Chukwu", "Ibrahim", "Sani", "Kofi", "Yaw", "Kwame", "Ade", "Nnamdi", "Uche", "Bello", "Musa"],
    f: ["Amara", "Chioma", "Adaeze", "Funke", "Yetunde", "Abeni", "Zainab", "Aisha", "Ngozi", "Kemi", "Halima", "Amina", "Ijeoma", "Bisi", "Tokunbo", "Wunmi", "Sade", "Oluchi"],
    s: ["Okonkwo", "Adeyemi", "Okafor", "Abdullahi", "Achebe", "Nwosu", "Ojo", "Balogun", "Eze", "Chukwu", "Lawal", "Ibrahim", "Olawale", "Bakare"],
  },
  hispanic: {
    m: ["Mateo", "Santiago", "Diego", "Emiliano", "Joaquín", "Sebastián", "Adrián", "Ignacio", "Rafael", "Tomás", "Andrés", "Esteban", "Fermín", "Óscar", "Martín", "Raúl", "Bruno", "Ciro"],
    f: ["Valentina", "Camila", "Sofía", "Ximena", "Isabella", "Regina", "Lucía", "Paloma", "Esperanza", "Carmen", "Alba", "Noelia", "Marisol", "Fátima", "Renata", "Consuelo", "Belén", "Xóchitl"],
    s: ["García", "Hernández", "Martínez", "López", "González", "Ramírez", "Torres", "Castillo", "Vega", "Fuentes", "Salazar", "Delgado", "Quintero", "Zamora"],
  },
  italian: {
    m: ["Luca", "Matteo", "Alessandro", "Giacomo", "Pietro", "Marco", "Enzo", "Giovanni", "Salvatore", "Vittorio", "Cesare", "Fabrizio", "Riccardo", "Stefano", "Lorenzo", "Augusto", "Nino", "Aldo"],
    f: ["Giulia", "Beatrice", "Sofia", "Aurora", "Benedetta", "Francesca", "Isabella", "Chiara", "Elena", "Lucia", "Ada", "Assunta", "Rosa", "Greta", "Viola", "Antonella", "Michela", "Nina"],
    s: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colangelo", "Greco", "Marino", "Rizzo", "Lombardi", "Moretti", "Barbieri", "Villa"],
  },
};
