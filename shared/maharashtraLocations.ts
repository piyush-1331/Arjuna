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
 * Centroid GPS Coordinates for all 36 Maharashtra Districts
 */
export const MAHARASHTRA_DISTRICT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Ahilyanagar (Ahmednagar)": { lat: 19.0952, lng: 74.7496 },
  "Akola": { lat: 20.7002, lng: 77.0082 },
  "Amravati": { lat: 20.9374, lng: 77.7796 },
  "Beed": { lat: 18.9891, lng: 75.7601 },
  "Bhandara": { lat: 21.1714, lng: 79.6543 },
  "Buldhana": { lat: 20.5293, lng: 76.1843 },
  "Chandrapur": { lat: 19.9615, lng: 79.2961 },
  "Chhatrapati Sambhajinagar (Aurangabad)": { lat: 19.8762, lng: 75.3433 },
  "Dharashiv (Osmanabad)": { lat: 18.1861, lng: 76.0419 },
  "Dhule": { lat: 20.9042, lng: 74.7749 },
  "Gadchiroli": { lat: 20.1849, lng: 80.0035 },
  "Gondia": { lat: 21.4554, lng: 80.1961 },
  "Hingoli": { lat: 19.7196, lng: 77.1472 },
  "Jalgaon": { lat: 21.0077, lng: 75.5626 },
  "Jalna": { lat: 19.8410, lng: 75.8864 },
  "Kolhapur": { lat: 16.7050, lng: 74.2433 },
  "Latur": { lat: 18.4088, lng: 76.5604 },
  "Mumbai City": { lat: 18.9388, lng: 72.8354 },
  "Mumbai Suburban": { lat: 19.0760, lng: 72.8777 },
  "Nagpur": { lat: 21.1458, lng: 79.0882 },
  "Nanded": { lat: 19.1383, lng: 77.3210 },
  "Nandurbar": { lat: 21.3700, lng: 74.2400 },
  "Nashik": { lat: 19.9975, lng: 73.7898 },
  "Palghar": { lat: 19.6967, lng: 72.7655 },
  "Parbhani": { lat: 19.2686, lng: 76.7708 },
  "Pune": { lat: 18.5204, lng: 73.8567 },
  "Raigad": { lat: 18.5158, lng: 72.9984 },
  "Ratnagiri": { lat: 16.9902, lng: 73.3120 },
  "Sangli": { lat: 16.8524, lng: 74.5815 },
  "Satara": { lat: 17.6805, lng: 73.9997 },
  "Sindhudurg": { lat: 16.1158, lng: 73.7088 },
  "Solapur": { lat: 17.6599, lng: 75.9064 },
  "Thane": { lat: 19.2183, lng: 72.9781 },
  "Wardha": { lat: 20.7453, lng: 78.6022 },
  "Washim": { lat: 20.1110, lng: 77.1352 },
  "Yavatmal": { lat: 20.3888, lng: 78.1204 },
};

/**
 * Returns default GPS coordinates for a Maharashtra district
 */
export function getDistrictCoordinates(districtName: string): { lat: number; lng: number } {
  if (!districtName) return { lat: 21.37, lng: 74.24 }; // default Nandurbar
  const normalized = districtName.trim().toLowerCase();
  for (const [dist, coords] of Object.entries(MAHARASHTRA_DISTRICT_COORDINATES)) {
    if (
      dist.toLowerCase() === normalized ||
      dist.toLowerCase().includes(normalized) ||
      normalized.includes(dist.toLowerCase().split(" ")[0])
    ) {
      return coords;
    }
  }
  return { lat: 21.37, lng: 74.24 };
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

/**
 * Resolves a city/village/town name or input district string to its official Maharashtra district.
 * e.g., "Pune City" -> "Pune", "Shahada" -> "Nandurbar", "Colaba" -> "Mumbai City", "Aundh" -> "Pune"
 */
export function getDistrictForCityOrVillage(locationName?: string | null): string | null {
  if (!locationName) return null;
  const normalized = locationName.trim().toLowerCase();

  // 1. Direct district exact / substring match
  for (const d of MAHARASHTRA_DISTRICTS_REGISTRY) {
    const distLower = d.name.toLowerCase();
    const primaryName = d.name.split(" ")[0].toLowerCase();
    if (
      distLower === normalized ||
      distLower.startsWith(normalized) ||
      normalized.startsWith(distLower) ||
      primaryName === normalized ||
      normalized.includes(primaryName)
    ) {
      return d.name;
    }
  }

  // 2. City / Taluka match
  for (const d of MAHARASHTRA_DISTRICTS_REGISTRY) {
    const match = d.majorCities.find((c) => {
      const cLower = c.toLowerCase();
      const cPrimary = c.split(" ")[0].toLowerCase();
      return (
        cLower === normalized ||
        cLower.includes(normalized) ||
        normalized.includes(cLower) ||
        (cPrimary.length > 3 && normalized.includes(cPrimary))
      );
    });
    if (match) {
      return d.name;
    }
  }

  return null;
}

/**
 * Returns state name for a given district or village (Maharashtra by default for Arjuna Universal Health Stack)
 */
export function getStateForDistrict(districtName?: string | null, villageName?: string | null): string {
  const combined = `${districtName || ""} ${villageName || ""}`.toLowerCase();
  if (combined.includes("gujarat") || combined.includes("ahmedabad") || combined.includes("sanand")) {
    return "Gujarat";
  }
  return "Maharashtra";
}

/**
 * Returns the primary health centre (PHC) / healthcare facility name for a given district and village.
 */
export function getDefaultCentreForLocation(districtName?: string | null, villageName?: string | null): string {
  const resolvedDist = districtName || getDistrictForCityOrVillage(villageName);
  const normalized = (resolvedDist || "").toLowerCase();
  const vNorm = (villageName || "").toLowerCase();

  if (normalized.includes("pune") || vNorm.includes("pune") || vNorm.includes("aundh")) {
    return "Pune District Hospital & Aundh PHC";
  }
  if (normalized.includes("nandurbar") || vNorm.includes("shahada") || vNorm.includes("karanji") || vNorm.includes("sonwadi")) {
    return "Nandurbar Civil Hospital & Shahada PHC";
  }
  if (normalized.includes("nashik") || vNorm.includes("sinnar") || vNorm.includes("malegaon")) {
    return "Nashik District Hospital & Sinnar PHC";
  }
  if (normalized.includes("mumbai") || vNorm.includes("bandra") || vNorm.includes("andheri") || vNorm.includes("colaba")) {
    return "KEM Hospital & Urban Health Centre";
  }
  if (normalized.includes("ahilyanagar") || normalized.includes("ahmednagar") || vNorm.includes("shirdi")) {
    return "Ahilyanagar District Hospital & Shirdi PHC";
  }
  if (normalized.includes("chhatrapati sambhajinagar") || normalized.includes("aurangabad") || vNorm.includes("paithan")) {
    return "Chhatrapati Sambhajinagar Civil Hospital & Paithan PHC";
  }
  if (normalized.includes("nagpur")) {
    return "Nagpur Government Medical College & PHC";
  }
  if (normalized.includes("thane") || vNorm.includes("kalyan")) {
    return "Thane Civil Hospital & Kalyan PHC";
  }
  if (normalized.includes("kolhapur")) {
    return "Kolhapur CPR General Hospital & PHC";
  }
  if (normalized.includes("satara")) {
    return "Satara District Hospital & Karad PHC";
  }
  if (normalized.includes("solapur")) {
    return "Solapur Civil Hospital & Pandharpur PHC";
  }
  if (normalized.includes("amravati")) {
    return "Amravati District Hospital & Achalpur PHC";
  }
  if (normalized.includes("ahmedabad") || vNorm.includes("sundarpur") || vNorm.includes("sanand")) {
    return "Sanand Community Health Centre & PHC";
  }

  if (resolvedDist) {
    const cleanName = resolvedDist.includes("(") ? resolvedDist.split(" ")[0] : resolvedDist;
    return `${cleanName} Primary Health Centre (PHC)`;
  }

  return "Pune District Hospital & Aundh PHC";
}
