/**
 * Arjuna - Official Maharashtra Administrative Geographic Registry
 * Contains all 36 districts of Maharashtra across 6 administrative divisions
 * along with their major cities, municipal corporations, and taluka headquarters.
 */

export interface MaharashtraDistrictInfo {
  name: string;
  division: "Konkan" | "Pune" | "Nashik" | "Chhatrapati Sambhajinagar" | "Amravati" | "Nagpur";
  headquarters: string;
  majorCities: string[];
}

export const MAHARASHTRA_DISTRICTS: string[] = [
  "Ahilyanagar (Ahmednagar)",
  "Akola",
  "Amravati",
  "Beed",
  "Bhandara",
  "Buldhana",
  "Chandrapur",
  "Chhatrapati Sambhajinagar (Aurangabad)",
  "Dharashiv (Osmanabad)",
  "Dhule",
  "Gadchiroli",
  "Gondia",
  "Hingoli",
  "Jalgaon",
  "Jalna",
  "Kolhapur",
  "Latur",
  "Mumbai City",
  "Mumbai Suburban",
  "Nagpur",
  "Nanded",
  "Nandurbar",
  "Nashik",
  "Palghar",
  "Parbhani",
  "Pune",
  "Raigad",
  "Ratnagiri",
  "Sangli",
  "Satara",
  "Sindhudurg",
  "Solapur",
  "Thane",
  "Wardha",
  "Washim",
  "Yavatmal",
];

export const MAHARASHTRA_DISTRICTS_REGISTRY: MaharashtraDistrictInfo[] = [
  {
    name: "Ahilyanagar (Ahmednagar)",
    division: "Nashik",
    headquarters: "Ahilyanagar",
    majorCities: ["Ahilyanagar City", "Sangamner", "Shirdi", "Rahata", "Kopargaon", "Shrirampur", "Nevasa", "Rahuri", "Parner", "Shevgaon", "Pathardi", "Jamkhed", "Karjat", "Shrigonda", "Akole"],
  },
  {
    name: "Akola",
    division: "Amravati",
    headquarters: "Akola",
    majorCities: ["Akola City", "Akot", "Balapur", "Murtizapur", "Patur", "Telhara", "Barshitakli"],
  },
  {
    name: "Amravati",
    division: "Amravati",
    headquarters: "Amravati",
    majorCities: ["Amravati City", "Achalpur", "Warud", "Morshi", "Anjangaon Surji", "Chandur Railway", "Chandur Bazar", "Daryapur", "Dhamangaon Railway", "Teosa", "Dharni", "Chikhaldara", "Karanjkhed", "Devgaon"],
  },
  {
    name: "Beed",
    division: "Chhatrapati Sambhajinagar",
    headquarters: "Beed",
    majorCities: ["Beed City", "Ambejogai", "Parli Vaijnath", "Majalgaon", "Georai", "Ashti", "Ashti Khurd", "Palsi", "Patoda", "Kaij", "Dharur", "Wadwani", "Shirur Kasar"],
  },
  {
    name: "Bhandara",
    division: "Nagpur",
    headquarters: "Bhandara",
    majorCities: ["Bhandara City", "Tumsar", "Pauni", "Sakoli", "Mohadi", "Lakhani", "Lakhandur"],
  },
  {
    name: "Buldhana",
    division: "Amravati",
    headquarters: "Buldhana",
    majorCities: ["Buldhana City", "Khamgaon", "Malkapur", "Shegaon", "Chikhli", "Mehkar", "Nandura", "Deulgaon Raja", "Sindkhed Raja", "Lonar", "Jalgaon Jamod", "Motala", "Sangrampur"],
  },
  {
    name: "Chandrapur",
    division: "Nagpur",
    headquarters: "Chandrapur",
    majorCities: ["Chandrapur City", "Ballarpur", "Warora", "Bhadravati", "Rajura", "Mul", "Nagbhid", "Brahmapuri", "Sindewahi", "Chimur", "Korpurna", "Gondpipri", "Pombhurna", "Jiwati", "Sawali"],
  },
  {
    name: "Chhatrapati Sambhajinagar (Aurangabad)",
    division: "Chhatrapati Sambhajinagar",
    headquarters: "Chhatrapati Sambhajinagar",
    majorCities: ["Chhatrapati Sambhajinagar City", "Paithan", "Gangapur", "Vaijapur", "Kannad", "Khuldabad", "Sillod", "Soegaon", "Phulambri"],
  },
  {
    name: "Dharashiv (Osmanabad)",
    division: "Chhatrapati Sambhajinagar",
    headquarters: "Dharashiv",
    majorCities: ["Dharashiv City", "Tuljapur", "Omerga", "Paranda", "Bhoom", "Kalamb", "Lohara", "Washi", "Sawargaon"],
  },
  {
    name: "Dhule",
    division: "Nashik",
    headquarters: "Dhule",
    majorCities: ["Dhule City", "Shirpur", "Sakri", "Sindkheda", "Waghoda", "Pimpri Khurd", "Bhavadi"],
  },
  {
    name: "Gadchiroli",
    division: "Nagpur",
    headquarters: "Gadchiroli",
    majorCities: ["Gadchiroli City", "Aheri", "Armori", "Chamorshi", "Kurkheda", "Desaiganj (Wadsa)", "Dhanora", "Etapalli", "Bhamragad", "Sironcha", "Korchi", "Mulchera"],
  },
  {
    name: "Gondia",
    division: "Nagpur",
    headquarters: "Gondia",
    majorCities: ["Gondia City", "Tirora", "Goregaon", "Amgaon", "Salekasa", "Deori", "Sadak Arjuni", "Arjuni Morgaon"],
  },
  {
    name: "Hingoli",
    division: "Chhatrapati Sambhajinagar",
    headquarters: "Hingoli",
    majorCities: ["Hingoli City", "Basmath", "Kalamnuri", "Sengaon", "Aundha Nagnath"],
  },
  {
    name: "Jalgaon",
    division: "Nashik",
    headquarters: "Jalgaon",
    majorCities: ["Jalgaon City", "Bhusawal", "Amalner", "Chalisgaon", "Pachora", "Jamner", "Raver", "Yawal", "Chopda", "Erandol", "Parola", "Dharangaon", "Muktainagar", "Bhadgaon", "Bodwad", "Tandulwadi"],
  },
  {
    name: "Jalna",
    division: "Chhatrapati Sambhajinagar",
    headquarters: "Jalna",
    majorCities: ["Jalna City", "Ambad", "Partur", "Bhokardan", "Jafrabad", "Ghansawangi", "Badnapur", "Mantha"],
  },
  {
    name: "Kolhapur",
    division: "Pune",
    headquarters: "Kolhapur",
    majorCities: ["Kolhapur City", "Ichalkaranji", "Jaysingpur", "Gadhinglaj", "Kagal", "Hatkanangle", "Shirol", "Radhanagari", "Karveer", "Panhala", "Bhudargad", "Ajara", "Chandgad", "Gaganbawda"],
  },
  {
    name: "Latur",
    division: "Chhatrapati Sambhajinagar",
    headquarters: "Latur",
    majorCities: ["Latur City", "Udgir", "Ahmedpur", "Ausa", "Nilanga", "Renapur", "Mohgaon", "Chakur", "Shirur Anantpal", "Deoni", "Jalkot"],
  },
  {
    name: "Mumbai City",
    division: "Konkan",
    headquarters: "Mumbai",
    majorCities: ["South Mumbai", "Colaba", "Fort", "Marine Lines", "Nariman Point", "Dadar", "Worli", "Byculla", "Parel", "Malabar Hill", "Girgaon", "Tardeo"],
  },
  {
    name: "Mumbai Suburban",
    division: "Konkan",
    headquarters: "Bandra",
    majorCities: ["Andheri", "Bandra", "Borivali", "Kurla", "Ghatkopar", "Mulund", "Kandivali", "Malad", "Santacruz", "Vile Parle", "Chembur", "Powai", "Dahisar", "Goregaon", "Jogeshwari"],
  },
  {
    name: "Nagpur",
    division: "Nagpur",
    headquarters: "Nagpur",
    majorCities: ["Nagpur City", "Kamptee", "Hingna", "Katol", "Narkhed", "Savner", "Kalmeshwar", "Ramtek", "Mouda", "Umred", "Kuhi", "Bhiwapur", "Parseoni"],
  },
  {
    name: "Nanded",
    division: "Chhatrapati Sambhajinagar",
    headquarters: "Nanded",
    majorCities: ["Nanded City", "Degloor", "Kinwat", "Mukhed", "Loha", "Hadgaon", "Bhokar", "Biloli", "Mudkhed", "Himayatnagar", "Kandhar", "Naigaon", "Umri", "Dharmabad", "Mahur", "Ardhapur"],
  },
  {
    name: "Nandurbar",
    division: "Nashik",
    headquarters: "Nandurbar",
    majorCities: ["Nandurbar City", "Shahada", "Taloda", "Navapur", "Akkalkuwa", "Akrani (Dhadgaon)", "Karanji Budruk", "Sonwadi", "Nimbayat", "Dhanora", "Shirasgaon"],
  },
  {
    name: "Nashik",
    division: "Nashik",
    headquarters: "Nashik",
    majorCities: ["Nashik City", "Malegaon", "Sinnar", "Niphad", "Dindori", "Igatpuri", "Trimbakeshwar", "Kalwan", "Satana (Baglan)", "Yeola", "Chandwad", "Deola", "Surgana", "Peth", "Kharpudi"],
  },
  {
    name: "Palghar",
    division: "Konkan",
    headquarters: "Palghar",
    majorCities: ["Palghar City", "Vasai-Virar", "Dahanu", "Boisar", "Jawhar", "Mokhada", "Talasari", "Wada", "Vikramgad"],
  },
  {
    name: "Parbhani",
    division: "Chhatrapati Sambhajinagar",
    headquarters: "Parbhani",
    majorCities: ["Parbhani City", "Gangakhed", "Jintur", "Pathri", "Sailu", "Manwath", "Sonpeth", "Palam", "Purna"],
  },
  {
    name: "Pune",
    division: "Pune",
    headquarters: "Pune",
    majorCities: ["Pune City", "Pimpri-Chinchwad", "Baramati", "Shirur", "Alegaon", "Rajewadi", "Waki", "Haveli", "Daund", "Junnar", "Khed", "Bhor", "Maval (Lonavala/Talegaon)", "Mulshi", "Purandar (Saswad)", "Velhe", "Ambegaon (Manchar)"],
  },
  {
    name: "Raigad",
    division: "Konkan",
    headquarters: "Alibag",
    majorCities: ["Alibag", "Panvel", "Kharghar", "Uran", "Pen", "Karjat", "Khopoli", "Mahad", "Mangaon", "Roha", "Shrivardhan", "Murud", "Poladpur", "Tala", "Mhasla"],
  },
  {
    name: "Ratnagiri",
    division: "Konkan",
    headquarters: "Ratnagiri",
    majorCities: ["Ratnagiri City", "Chiplun", "Khed", "Guhagar", "Dapoli", "Sangameshwar", "Rajapur", "Lanja", "Mandangad"],
  },
  {
    name: "Sangli",
    division: "Pune",
    headquarters: "Sangli",
    majorCities: ["Sangli City", "Miraj", "Kupwad", "Islampur (Walwa)", "Tasgaon", "Vita (Khanapur)", "Ashta", "Jat", "Kavathe Mahankal", "Shirala", "Atpadi", "Kadegaon", "Palus"],
  },
  {
    name: "Satara",
    division: "Pune",
    headquarters: "Satara",
    majorCities: ["Satara City", "Karad", "Borgaon", "Phaltan", "Wai", "Mahabaleshwar", "Patan", "Koregaon", "Kinhai", "Khatav (Vaduj)", "Man (Dahiwadi)", "Mhaswad", "Jaoli (Medha)", "Khandala"],
  },
  {
    name: "Sindhudurg",
    division: "Konkan",
    headquarters: "Oros",
    majorCities: ["Kudal", "Kankavli", "Sawantwadi", "Malvan", "Vengurla", "Devgad", "Vaibhavwadi", "Dodamarg"],
  },
  {
    name: "Solapur",
    division: "Pune",
    headquarters: "Solapur",
    majorCities: ["Solapur City", "Pandharpur", "Barshi", "Kumbhari", "Madha", "Karmala", "Mohol", "Sangola", "Malshiras", "Akkalkot", "South Solapur", "North Solapur"],
  },
  {
    name: "Thane",
    division: "Konkan",
    headquarters: "Thane",
    majorCities: ["Thane City", "Kalyan", "Dombivli", "Navi Mumbai (Thane)", "Mira-Bhayandar", "Bhiwandi", "Ulhasnagar", "Ambernath", "Badlapur", "Murbad", "Shahapur"],
  },
  {
    name: "Wardha",
    division: "Nagpur",
    headquarters: "Wardha",
    majorCities: ["Wardha City", "Hinganghat", "Arvi", "Deoli", "Seloo", "Samudrapur", "Karanja", "Ashti"],
  },
  {
    name: "Washim",
    division: "Amravati",
    headquarters: "Washim",
    majorCities: ["Washim City", "Karanja Lad", "Risod", "Mangrulpir", "Malegaon Jahangir", "Manora"],
  },
  {
    name: "Yavatmal",
    division: "Amravati",
    headquarters: "Yavatmal",
    majorCities: ["Yavatmal City", "Pusad", "Umarkhed", "Digras", "Wani", "Darwha", "Ghatanji", "Pandharkawada (Kelapur)", "Arni", "Ner", "Babhulgaon", "Kalamb", "Mahagaon", "Maregaon", "Ralegaon", "Zari Jamani"],
  },
];

/**
 * Returns list of major cities/talukas for a given district.
 */
export function getCitiesForDistrict(districtName: string): string[] {
  if (!districtName) return [];
  const normalized = districtName.trim().toLowerCase();
  const match = MAHARASHTRA_DISTRICTS_REGISTRY.find(
    (d) =>
      d.name.toLowerCase() === normalized ||
      d.name.toLowerCase().includes(normalized) ||
      normalized.includes(d.name.toLowerCase().split(" ")[0])
  );
  return match ? match.majorCities : [];
}

/**
 * Normalizes user-input district name against the official list.
 */
export function normalizeMaharashtraDistrict(input: string): string {
  if (!input) return "Nandurbar";
  const trimmed = input.trim();
  const exact = MAHARASHTRA_DISTRICTS.find((d) => d.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  const partial = MAHARASHTRA_DISTRICTS.find(
    (d) => d.toLowerCase().includes(trimmed.toLowerCase()) || trimmed.toLowerCase().includes(d.toLowerCase().split(" ")[0])
  );
  return partial || trimmed;
}
