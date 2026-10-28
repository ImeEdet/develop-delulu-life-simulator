/**
 * Delulu Life V2 — cultural name datasets.
 *
 * Organisation:
 *   country -> one or more cultural/linguistic groups
 *   group   -> masculine, feminine and genuinely unisex given names,
 *              a large surname pool, and naming-convention metadata.
 *
 * Surname pools are deliberately broad so no single family name can
 * dominate a country the way Bakare/Nwosu did in V1.
 */

export type NameOrder = "first-last" | "last-first";

export interface NameGroup {
  id: string;
  name: string;
  male: string[];
  female: string[];
  unisex: string[];
  surnames: string[];
  /** Some traditions use different inherited family names by gender (e.g. Singh/Kaur). */
  surnamesFemale?: string[];
  order: NameOrder;
}

const FL: NameOrder = "first-last";
const LF: NameOrder = "last-first";

export const NAME_GROUPS: Record<string, NameGroup> = {
  // ---------------------------------------------------------------- NIGERIA
  yoruba: {
    id: "yoruba", name: "Yoruba", order: FL,
    male: ["Wale", "Tunde", "Ayo", "Ade", "Kunle", "Femi", "Dele", "Bode", "Segun", "Kayode", "Olumide", "Gbenga", "Lanre", "Folarin", "Remi", "Yinka", "Kola", "Adewale", "Tosin", "Damilola", "Oladele", "Babatunde", "Oluwaseun", "Ayodeji", "Olawale", "Femi"],
    female: ["Funke", "Yetunde", "Bisi", "Tokunbo", "Wunmi", "Sade", "Folake", "Ronke", "Titilayo", "Ayomide", "Ebun", "Kemi", "Lola", "Morenike", "Titi", "Yewande", "Bunmi", "Oluwaseun", "Folami", "Adesewa", "Ibukun", "Morayo", "Temilade", "Eniola", "Inioluwa"],
    unisex: ["Damilola", "Tosin", "Ayo", "Remi", "Yinka", "Oluwaseun", "Ayomide", "Itunu", "Temidayo", "Ireoluwa"],
    surnames: ["Adeyemi", "Balogun", "Ojo", "Lawal", "Olawale", "Adeleke", "Adegoke", "Adebayo", "Fashina", "Sowande", "Kuti", "Alabi", "Adesanya", "Durojaiye", "Fagbenle", "Oladipo", "Ogunleye", "Akinwale", "Fabiyi", "Salami", "Adewale", "Oyelaran", "Banjoko", "Osundina", "Adeniji", "Fashanu", "Ogundimu", "Akinfenwa", "Odetola", "Adenuga", "Bakare", "Olumide", "Adeleke", "Soyinka", "Ogunyemi"],
  },
  igbo: {
    id: "igbo", name: "Igbo", order: FL,
    male: ["Chidi", "Emeka", "Obi", "Nnamdi", "Chukwu", "Kelechi", "Obinna", "Chinedu", "Ike", "Chima", "Chidera", "Somto", "Nonso", "Onyeka", "Ebuka", "Ifeanyi", "Chukwuemeka", "Tochukwu", "Olisa", "Uche", "Kenechukwu", "Munachiso", "Arinze", "Odinaka", "Chibuzo"],
    female: ["Amara", "Chioma", "Adaeze", "Ngozi", "Ijeoma", "Oluchi", "Chiamaka", "Ginika", "Ifeoma", "Nkechi", "Ada", "Chidinma", "Uchechi", "Olaedo", "Amarachi", "Ezinne", "Chinenye", "Ifunanya", "Mma", "Kasi", "Chidimma", "Onyinye", "Adaora", "Kamsiyonna", "Oluebube"],
    unisex: ["Uche", "Kelechi", "Chima", "Chidera", "Somto", "Obi", "Onyeka", "Chisom", "Kamso", "Olisa"],
    surnames: ["Okonkwo", "Okafor", "Eze", "Chukwu", "Nwosu", "Obi", "Nwankwo", "Igwe", "Oparah", "Okeke", "Umeh", "Ekeh", "Anozie", "Nwachukwu", "Madu", "Kalu", "Ofoedu", "Okorie", "Akachukwu", "Njoku", "Ibe", "Ezeudu", "Onyejekwe", "Okonkwo", "Anosike", "Ezealor", "Odinukwe", "Nwadinobi", "Okafo", "Ugwu", "Onyema", "Ezeokoli", "Chikwendu", "Ibeabuchi", "Mba"],
  },
  hausa: {
    id: "hausa", name: "Hausa/Fulani", order: FL,
    male: ["Ibrahim", "Sani", "Musa", "Bello", "Danjuma", "Shehu", "Aminu", "Garba", "Usman", "Adamu", "Dauda", "Haruna", "Rabiu", "Saleh", "Tukur", "Jibril", "Kabiru", "Nasir", "Faruk", "Hamza", "Abdullahi", "Mohammed", "Ismaila", "Bashir", "Yusuf", "Umar", "Aliyu", "Mansur", "Sulaiman", "Nura"],
    female: ["Aisha", "Zainab", "Amina", "Halima", "Fatima", "Maryam", "Hauwa", "Hadiza", "Khadija", "Safiya", "Rakiya", "Bilkisu", "Zulai", "Maimuna", "Salamatu", "Asmau", "Ladi", "Nana", "Rabi", "Inna", "Hauwa", "Zainabu", "Maimuna", "Jamila", "Laraba", "Dije", "Yagana", "Binta", "Gimbiya", "Amina"],
    unisex: ["Iliya", "Sani", "Bako", "Malam", "Binta"],
    surnames: ["Abdullahi", "Bello", "Musa", "Ibrahim", "Sani", "Usman", "Garba", "Mohammed", "Adamu", "Danjuma", "Shehu", "Aminu", "Bala", "Dauda", "Haruna", "Ismaila", "Jibril", "Maiyaki", "Nababa", "Rabiu", "Saleh", "Tukur", "Yaro", "Zaki", "Kano", "Gwadabe", "Maitama", "Rimi", "Bakori", "Dambo", "Funtua", "Gusau", "Katsina", "Lemu", "Turaki"],
  },
  edo: {
    id: "edo", name: "Edo (Benin)", order: FL,
    male: ["Osagie", "Eghosa", "Osaro", "Efosa", "Idehen", "Osa", "Uyi", "Osazee", "Irele", "Oziegbe", "Ehizogie", "Osawonyi", "Osakpolor", "Ebose", "Nosakhare", "Osahon", "Ehis", "Aigbe", "Osarenkhoe", "Esosa"],
    female: ["Adesuwa", "Esohe", "Itohan", "Osarenoma", "Uyiosa", "Osas", "Imade", "Omoregbe", "Uwa", "Ebun", "Iyobosa", "Osemwingie", "Aize", "Ebi", "Omozuwa", "Ruth", "Osasere", "Lydia", "Bukunmi", "Eki"],
    unisex: ["Osas", "Uyi", "Esosa", "Ehi", "Osazee", "Iso"],
    surnames: ["Okunbo", "Iyamu", "Eweka", "Obaseki", "Ogbemudia", "Emokpae", "Idahosa", "Uwaifo", "Osula", "Edebiri", "Asemota", "Igbinidu", "Oshiomhole", "Ero", "Umobuarie", "Akenzua", "Olomu", "Omo-Osagie", "Esemi", "Ogbeide", "Eweka", "Obasohan", "Akpata", "Eboigbe", "Iyawe", "Osagiede", "Uhunamure", "Eweka", "Aigbekaen", "Ogunbor"],
  },
  ibibio: {
    id: "ibibio", name: "Ibibio/Efik", order: FL,
    male: ["Effiong", "Etim", "Ekpo", "Inyang", "Essien", "Udo", "Umoren", "Asuquo", "Okon", "Udeme", "Ukpong", "Eyo", "Ita", "Abasi", "Aniefiok", "Ekpenyong", "Kufre", "Edet", "Archibong", "Nseobot", "Mbakara", "Odiong", "Ubong", "Ndara", "Efiom"],
    female: ["Mfon", "Idongesit", "Enobong", "Ndifreke", "Uyai", "Imoh", "Aniekan", "Nkese", "Arit", "Affiong", "Ima", "Utip", "Koko", "Arit", "Ekaette", "Ndito", "Iniabasi", "Otobong", "Selifiat", "Mmekudo", "Kanaan", "Imaobong", "Nsentip", "Unyime", "Eme"],
    unisex: ["Idorenyin", "Mfon", "Aniekan", "Imoh", "Abasi", "Ubong", "Eno", "Ini"],
    surnames: ["Akpan", "Effiong", "Bassey", "Etim", "Udoh", "Ekpo", "Ekanem", "Inyang", "Essien", "Nkanta", "Udo", "Umoren", "Asuquo", "Archibong", "Cobham", "Duke", "Henshaw", "Nkereuwem", "Okon", "Udeme", "Ukpong", "Umo", "Eyo", "Ita", "Mfon", "Edet", "Nsemoh", "Okpong", "Etuk", "Akpabio", "Udoette", "Ekanem", "Ndah", "Orok", "Ukpanah"],
  },
  "nigerian-english": {
    id: "nigerian-english", name: "English-Nigerian", order: FL,
    male: ["Emmanuel", "Samuel", "David", "Daniel", "Joseph", "Joshua", "Victor", "Moses", "Peter", "Paul", "Michael", "Gabriel", "Benjamin", "Isaac", "Stephen", "Timothy", "Caleb", "Daniel", "Elijah", "Jeremiah"],
    female: ["Mercy", "Joy", "Grace", "Faith", "Patience", "Comfort", "Deborah", "Esther", "Rebecca", "Rachel", "Sarah", "Naomi", "Elizabeth", "Mary", "Priscilla", "Dora", "Stella", "Gloria", "Janet", "Lovina"],
    unisex: ["Blessing", "Favour", "Success", "Peace", "Marvelous", "Goodness", "Confidence", "Prosperity", "Sunshine", "Treasure"],
    surnames: ["Adeyemi", "Okonkwo", "Bello", "Eze", "Balogun", "Nwosu", "Bakare", "Abdullahi", "Okafor", "Lawal", "Effiong", "Obaseki", "Udoh", "Chukwu", "Adeleke", "Akpan", "Musa", "Igwe", "Salami", "Okeke", "Ojo", "Njoku", "Garba", "Edebiri", "Okon", "Ibrahim", "Nwachukwu", "Fabiyi", "Kalu", "Umoren"],
  },

  // ------------------------------------------------------------------ INDIA
  "hindi-north": {
    id: "hindi-north", name: "Hindi-speaking (North India)", order: FL,
    male: ["Arjun", "Rohan", "Vikram", "Kabir", "Aarav", "Dev", "Ishaan", "Manav", "Anirudh", "Kunal", "Ravi", "Harsh", "Nikhil", "Siddharth", "Aditya", "Devansh", "Pranav", "Varun", "Aakash", "Rajat", "Karan", "Rahul", "Vivaan", "Shaurya", "Reyansh"],
    female: ["Ananya", "Priya", "Diya", "Meera", "Isha", "Tara", "Kavya", "Sana", "Nisha", "Pooja", "Ritika", "Alina", "Zoya", "Ishita", "Divya", "Aaliya", "Kirti", "Rhea", "Neha", "Simran", "Anika", "Myra", "Pari", "Roshni", "Kiara"],
    unisex: ["Arya", "Jyoti", "Anchal", "Savera"],
    surnames: ["Sharma", "Verma", "Gupta", "Kapoor", "Malhotra", "Mehra", "Chopra", "Khanna", "Bhatt", "Yadav", "Mishra", "Dubey", "Tiwari", "Chauhan", "Rathore", "Agarwal", "Bansal", "Goel", "Mittal", "Srivastava", "Sinha", "Jha", "Bhatia", "Ahuja", "Saxena", "Trivedi", "Pandey", "Shukla", "Joshi", "Kashyap"],
  },
  "tamil-south": {
    id: "tamil-south", name: "Tamil/Malayalam (South India)", order: FL,
    male: ["Karthik", "Suresh", "Ramesh", "Vijay", "Ganesh", "Balaji", "Mani", "Saravanan", "Vignesh", "Arun", "Prakash", "Rajesh", "Senthil", "Kumar", "Dinesh", "Anand", "Murugan", "Selvam", "Hari", "Vasanth", "Gowtham", "Kishore", "Madhavan", "Naveen", "Prabhu"],
    female: ["Priya", "Lakshmi", "Kavya", "Divya", "Meena", "Sangeetha", "Anjali", "Kirthana", "Malar", "Revathi", "Sujatha", "Geetha", "Radha", "Padma", "Chitra", "Deepa", "Valli", "Bhavani", "Nandhini", "Aishwarya", "Dharshini", "Eshwari", "Gomathi", "Hema", "Indira"],
    unisex: ["Arya", "Keerthi", "Chandran", "Mani"],
    surnames: ["Iyer", "Nair", "Pillai", "Reddy", "Naidu", "Menon", "Iyengar", "Chettiar", "Gounder", "Mudaliar", "Thevar", "Nadar", "Achari", "Bhat", "Kamath", "Rao", "Pai", "Shenoy", "Pillai", "Krishnan", "Subramanian", "Vaidyanathan", "Rangaswamy", "Swaminathan", "Ramachandran", "Nambiar", "Panicker", "Warrier", "Ezhuthachan", "Moopanar"],
  },
  bengali: {
    id: "bengali", name: "Bengali", order: FL,
    male: ["Anik", "Sourav", "Debashish", "Suman", "Prosenjit", "Tamal", "Indrajit", "Kaushik", "Niloy", "Rahul", "Arnab", "Avik", "Barun", "Bikash", "Chayan", "Dipak", "Sukanta", "Partha", "Writam", "Tamojit", "Ritam", "Saptarshi", "Anjan", "Bodhi", "Debojyoti"],
    female: ["Riya", "Sneha", "Mitali", "Sharmila", "Koyel", "Nandini", "Oindrila", "Piyali", "Rimi", "Sohini", "Taniya", "Urmila", "Barnali", "Dola", "Jhumpa", "Kabita", "Madhumita", "Rimjhim", "Ananya", "Ishita", "Doyel", "Gargi", "Jhilam", "Kheyali", "Mou"],
    unisex: ["Rishi", "Shree", "Tonni", "Dipan"],
    surnames: ["Bose", "Chatterjee", "Banerjee", "Mukherjee", "Ghosh", "Das", "Sengupta", "Bhattacharya", "Roy", "Chowdhury", "Ganguly", "Haldar", "Majumdar", "Mitra", "Pal", "Dey", "Sarkar", "Sen", "Gupta", "Sinha", "Bhowmick", "Chakraborty", "Kar", "Lahiri", "Mallick", "Nag", "Poddar", "Ray", "Saha", "Tagore"],
  },
  punjabi: {
    id: "punjabi", name: "Punjabi/Sikh", order: FL,
    male: ["Navdeep", "Rupinder", "Balwinder", "Daljeet", "Jagdeep", "Karanvir", "Sukhbir", "Tarandeep", "Bikramjit", "Gurdas", "Hardeep", "Jaspal", "Kuldeep", "Lakhwinder", "Pavitar", "Gurjit", "Manjot", "Paramjit", "Sukhjinder", "Vikramjit"],
    female: ["Navneet", "Harleen", "Jasleen", "Ramneet", "Sukhmani", "Taranjit", "Baljit", "Guneet", "Harsimran", "Keerat", "Manleen", "Prabhjot", "Gurleen", "Manveer", "Simran", "Kirandeep", "Amrit", "Dilpreet", "Harjot", "Noor"],
    unisex: ["Gurpreet", "Harpreet", "Manpreet", "Jaspreet", "Simranjeet", "Amrit", "Kirandeep", "Hargun", "Navjot", "Prabhleen"],
    surnames: ["Gill", "Brar", "Sandhu", "Dhillon", "Grewal", "Bhullar", "Mann", "Cheema", "Bains", "Toor", "Panesar", "Deol", "Aulakh", "Bajwa", "Chahal", "Johal", "Khaira", "Randhawa", "Sidhu", "Virk", "Boparai", "Dhindsa", "Gahir", "Hayer", "Johl", "Kahlon", "Lally", "Mahal", "Nagra", "Pannu"],
    surnamesFemale: ["Kaur", "Gill", "Brar", "Sandhu", "Dhillon", "Grewal", "Bhullar", "Mann", "Cheema", "Bains", "Toor", "Panesar", "Deol", "Aulakh", "Bajwa", "Chahal", "Johal", "Randhawa", "Sidhu", "Virk"],
  },

  // --------------------------------------------------------------- ANGLO-WORLD
  anglo: {
    id: "anglo", name: "Anglo/English", order: FL,
    male: ["Oliver", "James", "Noah", "Liam", "Henry", "George", "Arthur", "Freddie", "Oscar", "Alfie", "Harry", "Charlie", "Leo", "Jasper", "Milo", "Theo", "Felix", "Winston", "Declan", "Rupert", "Elias", "Silas", "August", "Hugo", "Rowan", "Ezra", "Nathaniel", "Owen", "Julian", "Edmund"],
    female: ["Amelia", "Olivia", "Ivy", "Ruby", "Hazel", "Freya", "Poppy", "Maisie", "Daisy", "Eloise", "Matilda", "Florence", "Clara", "Nora", "Rosie", "Wren", "June", "Alice", "Violet", "Margot", "Beatrice", "Cora", "Clementine", "Esther", "Imogen", "Juniper", "Lila", "Maeve", "Pearl", "Stella"],
    unisex: ["Riley", "Quinn", "Avery", "Harper", "Rowan", "Sage", "River", "Finley", "Morgan", "Cameron", "Casey", "Jamie", "Jordan", "Taylor", "Reese", "Kendall", "Peyton", "Skyler", "Drew", "Hayden"],
    surnames: ["Smith", "Hughes", "Carter", "Bennett", "Walsh", "Mercer", "Ellery", "Whitfield", "Nash", "Pemberton", "Ashford", "Crane", "Doyle", "Hartley", "Quinn", "Brooks", "Foster", "Griffin", "Hayes", "Larson", "Mason", "Parker", "Russell", "Sutton", "Vaughan", "Wells", "Frost", "Gallagher", "Holloway", "Kingsley", "Lockhart", "Monroe", "Prescott", "Ridley", "Thorne"],
  },
  multicultural: {
    id: "multicultural", name: "Multicultural / Modern", order: FL,
    male: ["Malik", "Jamal", "Andre", "Zion", "Cairo", "Omari", "Kai", "Darius", "Tyrese", "Nile", "Rashid", "Kofi", "Selim", "Amari", "Elian", "Jabari", "Khamani", "Marcel", "Omar", "Remy"],
    female: ["Aaliyah", "Imani", "Zuri", "Talia", "Nia", "Sanaa", "Amara", "Kiana", "Maya", "Raven", "Selah", "Tiana", "Zola", "Eden", "Gia", "Jada", "Kali", "Laila", "Nyla", "Rihanna"],
    unisex: ["Sage", "Rio", "Phoenix", "Justice", "Legacy", "Reign", "Royal", "True", "Onyx", "Sky"],
    surnames: ["Smith", "Carter", "Bennett", "Brooks", "Mason", "Parker", "Russell", "Wells", "Hughes", "Foster", "Griffin", "Hayes", "Sutton", "Monroe", "Quinn", "Wallace", "Coleman", "Franklin", "Hamilton", "Ingram", "Jefferson", "Kendrick", "Langston", "Mercer", "Nash", "Owens", "Patterson", "Rivers", "Sterling", "Vaughan"],
  },

  // ------------------------------------------------------------------- EUROPE
  french: {
    id: "french", name: "French/Francophone", order: FL,
    male: ["Louis", "Jules", "Gabriel", "Arthur", "Nathan", "Hugo", "Lucas", "Adrien", "Mathis", "Romain", "Étienne", "Célestin", "Basile", "Théophile", "Maxime", "Sacha", "Bastien", "Émile", "Raphaël", "Augustin", "Côme", "Damien", "Eloi", "Félix", "Gaspard", "Henri", "Léo", "Mathieu", "Olivier", "Pascal"],
    female: ["Camille", "Louise", "Chloé", "Léonie", "Manon", "Zoé", "Inès", "Margaux", "Élise", "Jeanne", "Clémence", "Adèle", "Océane", "Alice", "Romane", "Prune", "Violette", "Estelle", "Apolline", "Bérénice", "Capucine", "Delphine", "Églantine", "Faustine", "Garance", "Hortense", "Isaure", "Joséphine", "Lila", "Madeleine"],
    unisex: ["Camille", "Sacha", "Maxime", "Aliénor", "Dominique", "Claude", "Céleste", "Noa"],
    surnames: ["Martin", "Dubois", "Bernard", "Moreau", "Laurent", "Petit", "Fournier", "Girard", "Lefèvre", "Renard", "Beaulieu", "Delacroix", "Vasseur", "Charpentier", "Fontaine", "Gauthier", "Henry", "Marchand", "Perrin", "Rousseau", "Blanchard", "Caron", "Deschamps", "Fabre", "Guérin", "Humbert", "Joubert", "Lacroix", "Mercier", "Noël", "Picard", "Roche", "Simon", "Toussaint", "Vidal"],
  },
  german: {
    id: "german", name: "German-speaking", order: FL,
    male: ["Ludwig", "Felix", "Jonas", "Emil", "Oskar", "Henri", "Konrad", "Magnus", "Bruno", "Tobias", "Max", "Friedrich", "Heinrich", "Otto", "Elias", "Moritz", "Werner", "Gustav", "Anselm", "Balthasar", "Clemens", "Dieter", "Eberhard", "Florian", "Gunther", "Hanno", "Jurgen", "Kaspar", "Lorenz", "Matthias"],
    female: ["Emma", "Clara", "Frieda", "Greta", "Lina", "Hanna", "Ursula", "Roswitha", "Leni", "Anneliese", "Mathilde", "Ingrid", "Elsa", "Hedwig", "Vera", "Johanna", "Luise", "Käthe", "Anika", "Bettina", "Christa", "Dorothea", "Edith", "Frauke", "Gisela", "Helga", "Ilse", "Jutta", "Karin", "Liesel"],
    unisex: ["Luca", "Sasha", "Eike", "Romy", "Bente", "Marlis", "Nico", "Robin"],
    surnames: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Becker", "Hoffmann", "Wagner", "Klein", "Braun", "Vogel", "Winterstein", "Roth", "Brandt", "Baumann", "Bergmann", "Dittrich", "Eckert", "Frank", "Graf", "Hartmann", "Jäger", "Keller", "Lange", "Moser", "Neumann", "Pohl", "Reiter", "Schuler", "Thiele", "Ulrich", "Vogt", "Walther", "Ziegler", "Krause"],
  },
  italian: {
    id: "italian", name: "Italian", order: FL,
    male: ["Luca", "Matteo", "Alessandro", "Giacomo", "Pietro", "Marco", "Enzo", "Giovanni", "Salvatore", "Vittorio", "Cesare", "Fabrizio", "Riccardo", "Stefano", "Lorenzo", "Augusto", "Nino", "Aldo", "Bruno", "Carlo", "Dario", "Edoardo", "Fausto", "Gianni", "Lamberto", "Massimo", "Nicolò", "Orlando", "Paolo", "Raffaele"],
    female: ["Giulia", "Beatrice", "Sofia", "Aurora", "Benedetta", "Francesca", "Isabella", "Chiara", "Elena", "Lucia", "Ada", "Assunta", "Rosa", "Greta", "Viola", "Antonella", "Michela", "Nina", "Bianca", "Camilla", "Donatella", "Elettra", "Fiorella", "Ginevra", "Livia", "Margherita", "Natalia", "Ottavia", "Priscilla", "Serena"],
    unisex: ["Andrea", "Lorenzo", "Celeste", "Fiore", "Lore", "Nico", "Sasha"],
    surnames: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colangelo", "Greco", "Marino", "Rizzo", "Lombardi", "Moretti", "Barbieri", "Villa", "Caruso", "De Luca", "Ferraro", "Gallo", "Iannuzzi", "Leone", "Marchetti", "Neri", "Pellegrini", "Ricci", "Santoro", "Testa", "Valente", "Zito", "Amato", "Basile", "Bellini", "Caputo", "Donnarumma", "Esposito", "Ferraro"],
  },

  // ------------------------------------------------------------------- EAST ASIA
  japanese: {
    id: "japanese", name: "Japanese", order: LF,
    male: ["Haruto", "Sota", "Ren", "Kaito", "Yuto", "Riku", "Hiro", "Takeshi", "Kenji", "Minato", "Akira", "Daichi", "Ryo", "Genki", "Shun", "Koki", "Daiki", "Sosuke", "Hayato", "Itsuki", "Jiro", "Kazuki", "Naoki", "Osamu", "Raiden", "Shota", "Taiki", "Tatsuya", "Yori", "Haruki"],
    female: ["Hina", "Yui", "Aoi", "Sana", "Mei", "Miu", "Hana", "Chiyo", "Nao", "Riko", "Sumire", "Emi", "Koyuki", "Tsubaki", "Rina", "Yuzu", "Akari", "Fumiko", "Hibiki", "Izumi", "Kaori", "Momoka", "Nanami", "Risa", "Sakura", "Tomomi", "Utano", "Yoshino", "Asuka", "Eriko"],
    unisex: ["Sora", "Hikaru", "Haru", "Aoi", "Yuki", "Rei", "Rin", "Kaoru", "Akari", "Tsukasa", "Shion", "Mitsuki", "Nagi", "Itsuki", "Hiyori"],
    surnames: ["Sato", "Suzuki", "Tanaka", "Takahashi", "Watanabe", "Ito", "Nakamura", "Kobayashi", "Kato", "Yamamoto", "Mori", "Fujii", "Hayashi", "Ishikawa", "Abe", "Endo", "Goto", "Hasegawa", "Ichikawa", "Iwata", "Kimura", "Maeda", "Nakajima", "Ogawa", "Sakai", "Shimizu", "Takeda", "Ueda", "Yamada", "Yokoyama", "Nishimura", "Morita", "Ono", "Fukuda", "Harada"],
  },
  korean: {
    id: "korean", name: "Korean", order: LF,
    male: ["Minjun", "Doyun", "Seojun", "Jiho", "Junseo", "Hyeon", "Baek", "Donghui", "Sangmin", "Kitae", "Hangyeol", "Daeho", "Minjae", "Eunwoo", "Gunwoo", "Haneul", "Jihan", "Kangmin", "Ryujin", "Sihyuk", "Taejun", "Woojin", "Yejun", "Jinwoo", "Hojun"],
    female: ["Haeun", "Yuna", "Seoyeon", "Suah", "Narae", "Gaein", "Yeonju", "Hyerim", "Daewon", "Mira", "Sohyun", "Jian", "Yeeun", "Soyeon", "Hayun", "Jiyun", "Seoyun", "Yerin", "Chae-won", "Minseo", "Naeun", "Ryuha", "Seungah", "Yeseo", "Haerin"],
    unisex: ["Jun", "Hyun", "Tae", "Woo", "Seo", "Jiwoo", "Jimin", "Haru", "Sora", "Yoon", "Nara", "Siwoo", "Dohyun", "Jae", "Min", "Seong", "Yul", "Haon", "Iseo", "Roa"],
    surnames: ["Gwak", "Bong", "Cha", "Ham", "Heo", "Hong", "Hwang", "Im", "Jang", "Jeon", "Jo", "Ju", "Kang", "Kim", "Kwon", "Lim", "Moon", "Nam", "Oh", "Seo", "Shin", "Shim", "Song", "Yang", "Yeom", "Yoo", "Yoon", "Yu", "Choi", "Jung", "Han", "Bae", "Cheon", "Dong", "Eom"],
  },

  // ------------------------------------------------------------- LATIN AMERICA
  brazilian: {
    id: "brazilian", name: "Brazilian/Portuguese", order: FL,
    male: ["João", "Lucas", "Mateus", "Rafael", "Gabriel", "Pedro", "Thiago", "Enzo", "Caio", "Bruno", "Vinícius", "Arthur", "Felipe", "Diego", "Matheus", "Gustavo", "André", "Igor", "Bernardo", "Cauã", "Davi", "Eduardo", "Fernando", "Heitor", "Igor", "Joaquim", "Leandro", "Murilo", "Otávio", "Paulo"],
    female: ["Maria", "Ana", "Luiza", "Helena", "Beatriz", "Clara", "Laura", "Manuela", "Sophia", "Júlia", "Isabela", "Bianca", "Alice", "Camila", "Larissa", "Vitória", "Letícia", "Marina", "Aparecida", "Bárbara", "Carolina", "Daniela", "Eduarda", "Flávia", "Gabriela", "Heloísa", "Iara", "Janaína", "Larissa", "Mariana"],
    unisex: ["Iara", "Darcy", "Nara", "Ariel", "Domingos", "Natal", "Raimi", "Sol"],
    surnames: ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Ferreira", "Almeida", "Rodrigues", "Nunes", "Ribeiro", "Cardoso", "Moreira", "Teixeira", "Barbosa", "Correia", "Duarte", "Freitas", "Gomes", "Henriques", "Iglesias", "Lacerda", "Machado", "Nogueira", "Pereira", "Queiroz", "Rezende", "Sampaio", "Tavares", "Vasconcelos", "Xavier", "Zanetti", "Azevedo", "Bittencourt", "Castelo"],
  },
  hispanic: {
    id: "hispanic", name: "Hispanic/Spanish", order: FL,
    male: ["Mateo", "Santiago", "Diego", "Emiliano", "Joaquín", "Sebastián", "Adrián", "Ignacio", "Rafael", "Tomás", "Andrés", "Esteban", "Fermín", "Óscar", "Martín", "Raúl", "Bruno", "Ciro", "Alejandro", "Benjamín", "Cristóbal", "Damián", "Emilio", "Facundo", "Guillermo", "Héctor", "Iván", "Javier", "Leonel", "Maximiliano"],
    female: ["Valentina", "Camila", "Sofía", "Ximena", "Isabella", "Regina", "Lucía", "Paloma", "Esperanza", "Carmen", "Alba", "Noelia", "Marisol", "Fátima", "Renata", "Consuelo", "Belén", "Xóchitl", "Adriana", "Beatriz", "Catalina", "Daniela", "Elena", "Fernanda", "Gabriela", "Jimena", "Lourdes", "Marcela", "Natalia", "Pilar"],
    unisex: ["Ariel", "Sasha", "Guadalupe", "Sol", "Cruz", "Reyes", "Azul", "Dulce", "Lourdes", "Nicol"],
    surnames: ["García", "Hernández", "Martínez", "López", "González", "Ramírez", "Torres", "Castillo", "Vega", "Fuentes", "Salazar", "Delgado", "Quintero", "Zamora", "Aguilar", "Bautista", "Cabrera", "Domínguez", "Escobar", "Fernández", "Gallardo", "Herrera", "Ibarra", "Jiménez", "Lara", "Medina", "Navarro", "Ortega", "Paredes", "Quiroz", "Reyes", "Serrano", "Tapia", "Valencia", "Yáñez"],
  },
};

/** Country -> cultural groups available at character creation / NPC generation. */
export const COUNTRY_GROUPS: Record<string, string[]> = {
  us: ["anglo", "hispanic", "multicultural"],
  uk: ["anglo", "multicultural"],
  ca: ["anglo", "french"],
  fr: ["french"],
  de: ["german"],
  jp: ["japanese"],
  kr: ["korean"],
  br: ["brazilian"],
  in: ["hindi-north", "tamil-south", "bengali", "punjabi"],
  ng: ["yoruba", "igbo", "hausa", "edo", "ibibio", "nigerian-english"],
  mx: ["hispanic"],
  it: ["italian"],
};

/** V1 used a single coarse "culture" key per country; map it onto V2 groups. */
export const LEGACY_CULTURE_MAP: Record<string, string> = {
  anglo: "anglo",
  french: "french",
  german: "german",
  japanese: "japanese",
  korean: "korean",
  brazilian: "brazilian",
  indian: "hindi-north",
  westafrican: "yoruba",
  hispanic: "hispanic",
  italian: "italian",
};
