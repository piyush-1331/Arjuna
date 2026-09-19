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

/**
 * Interface for District Administrator Account
 */
export interface DistrictAdminAccount {
  id: string;
  name: string;
  district: string;
  email: string;
  password: string;
  role: "administrator";
  division: string;
  headquarters: string;
  phone: string;
  isSystemAdmin?: boolean;
}

/**
 * System / State Administrator Account (Full State-Wide Access across all 36 districts)
 */
export const SYSTEM_ADMIN_ACCOUNT: DistrictAdminAccount = {
  id: "admin-state",
  name: "Maharashtra State Health Administrator",
  district: "All Districts (Maharashtra)",
  email: "admin@arjuna.gov.in",
  password: "Admin@Arjuna2026",
  role: "administrator",
  division: "State HQ (Mumbai)",
  headquarters: "Mantralaya, Mumbai",
  phone: "+91 22 2202 5555",
  isSystemAdmin: true,
};

export function getDistrictAdminSlug(districtName: string): string {
  return districtName
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Predefined District Administrator accounts for all 36 Maharashtra Districts + State Admin
 */
export const DISTRICT_ADMIN_ACCOUNTS: DistrictAdminAccount[] = [
  SYSTEM_ADMIN_ACCOUNT,
  ...MAHARASHTRA_DISTRICTS_REGISTRY.map((d, idx) => {
    const slug = getDistrictAdminSlug(d.name);
    return {
      id: `admin-${slug}`,
      name: `${d.headquarters} District Health Administrator`,
      district: d.name,
      email: `admin.${slug}@arjuna.gov.in`,
      password: "Admin@Arjuna2026",
      role: "administrator" as const,
      division: d.division,
      headquarters: d.headquarters,
      phone: `+91 94220 ${String(10000 + idx * 111).slice(0, 5)}`,
      isSystemAdmin: false,
    };
  }),
];

/**
 * Checks if a user is a System / Super Administrator with state-wide privileges
 */
export function isSystemAdmin(user?: { email?: string | null; district?: string | null; role?: string | null } | null): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase();
  const district = (user.district || "").toLowerCase();
  const role = (user.role || "").toLowerCase();
  return (
    email === "admin@arjuna.gov.in" ||
    email === "state.admin@arjuna.gov.in" ||
    email.startsWith("state.") ||
    district.includes("all district") ||
    district === "all" ||
    district === "state" ||
    district === "" ||
    role === "super_admin"
  );
}

/**
 * Public Health Facilities & Hospital GIS Registry for Maharashtra
 */
export interface MaharashtraFacilityInfo {
  id: number;
  name: string;
  facilityType: "district_hospital" | "sub_district_hospital" | "chc" | "phc" | "sub_centre" | "specialist";
  district: string;
  village: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  capabilities: string[];
  totalBeds: number;
  availableBeds: number;
  icuAvailable: boolean;
  oxygenAvailable: boolean;
  is24x7: boolean;
}

/**
 * Comprehensive health facilities covering all 36 Maharashtra administrative districts
 */
export const MAHARASHTRA_HOSPITALS_REGISTRY: MaharashtraFacilityInfo[] = [
  // 1. Pune
  {
    id: 101,
    name: "Pune District Hospital (Aundh)",
    facilityType: "district_hospital",
    district: "Pune",
    village: "Pune City",
    address: "Aundh Camp, Pune 411027",
    phone: "+91 20 2728 0100",
    latitude: 18.5590,
    longitude: 73.8077,
    specialties: ["General Medicine", "General Surgery", "Cardiology", "Orthopaedics & Trauma", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Nephrology & Dialysis", "Radiology & Sonography"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Dedicated Labor Room", "Dialysis Centre", "Blood Bank", "CT Scan / Sonography", "Oxygen Plant"],
    totalBeds: 500,
    availableBeds: 86,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },
  {
    id: 102,
    name: "Baramati Sub-District Hospital",
    facilityType: "sub_district_hospital",
    district: "Pune",
    village: "Baramati",
    address: "Bhigwan Road, Baramati, Pune 413102",
    phone: "+91 2112 222100",
    latitude: 18.1517,
    longitude: 74.5772,
    specialties: ["General Medicine", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "General Surgery"],
    capabilities: ["24x7 Emergency Room", "Labor Room", "NICU", "Blood Storage", "Oxygen Support"],
    totalBeds: 150,
    availableBeds: 34,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },
  {
    id: 103,
    name: "Shirur Community Health Centre",
    facilityType: "chc",
    district: "Pune",
    village: "Shirur",
    address: "Pune-Nagar Highway, Shirur, Pune 412210",
    phone: "+91 2138 222045",
    latitude: 18.8256,
    longitude: 74.3776,
    specialties: ["General Medicine", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Labor Room", "Basic Emergency Care", "Minor OT", "Cold Chain Vaccine Hub"],
    totalBeds: 50,
    availableBeds: 16,
    icuAvailable: false,
    oxygenAvailable: true,
    is24x7: true,
  },
  {
    id: 104,
    name: "Alegaon Primary Health Centre",
    facilityType: "phc",
    district: "Pune",
    village: "Alegaon",
    address: "Grampanchayat Road, Alegaon, Shirur Taluka, Pune 412211",
    phone: "+91 2138 274120",
    latitude: 18.8710,
    longitude: 74.4120,
    specialties: ["General Medicine", "Obstetrics & Gynaecology"],
    capabilities: ["24x7 Labor Room", "OPD Care", "NCD Screening", "Cold Chain Vaccine Storage"],
    totalBeds: 20,
    availableBeds: 8,
    icuAvailable: false,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 2. Nandurbar
  {
    id: 201,
    name: "Nandurbar District Civil Hospital",
    facilityType: "district_hospital",
    district: "Nandurbar",
    village: "Nandurbar City",
    address: "Civil Hospital Road, Nandurbar 425412",
    phone: "+91 2564 222240",
    latitude: 21.3700,
    longitude: 74.2400,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Orthopaedics & Trauma", "Emergency Medicine"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "SNCU / Neonatal Care", "Blood Bank", "Oxygen Plant", "Dialysis Unit"],
    totalBeds: 350,
    availableBeds: 52,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },
  {
    id: 202,
    name: "Shahada Sub-District Hospital",
    facilityType: "sub_district_hospital",
    district: "Nandurbar",
    village: "Shahada",
    address: "Dondaicha Road, Shahada, Nandurbar 425409",
    phone: "+91 2565 229100",
    latitude: 21.5432,
    longitude: 74.4721,
    specialties: ["General Medicine", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Labor Room", "Blood Storage", "Oxygen Support"],
    totalBeds: 100,
    availableBeds: 22,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },
  {
    id: 203,
    name: "Karanji Budruk Primary Health Centre",
    facilityType: "phc",
    district: "Nandurbar",
    village: "Karanji Budruk",
    address: "Near High School, Karanji Budruk, Shahada, Nandurbar 425409",
    phone: "+91 2565 241022",
    latitude: 21.5620,
    longitude: 74.4980,
    specialties: ["General Medicine", "Obstetrics & Gynaecology"],
    capabilities: ["24x7 Labor Room", "Basic Emergency Care", "NCD Screening Clinic", "Vaccine Storage"],
    totalBeds: 20,
    availableBeds: 9,
    icuAvailable: false,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 3. Nashik
  {
    id: 301,
    name: "Nashik District Civil Hospital",
    facilityType: "district_hospital",
    district: "Nashik",
    village: "Nashik City",
    address: "Trimbak Road, Nashik 422002",
    phone: "+91 253 257 2400",
    latitude: 19.9975,
    longitude: 73.7898,
    specialties: ["General Medicine", "General Surgery", "Cardiology", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Orthopaedics & Trauma", "Radiology & Sonography"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Trauma Care Centre", "Oxygen Plant", "Dialysis Unit"],
    totalBeds: 600,
    availableBeds: 110,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },
  {
    id: 302,
    name: "Malegaon General Hospital",
    facilityType: "sub_district_hospital",
    district: "Nashik",
    village: "Malegaon",
    address: "Camp Area, Malegaon, Nashik 423203",
    phone: "+91 2554 231400",
    latitude: 20.5539,
    longitude: 74.5298,
    specialties: ["General Medicine", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "General Surgery"],
    capabilities: ["24x7 Emergency Room", "Labor Room", "NICU", "Blood Storage"],
    totalBeds: 200,
    availableBeds: 45,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },
  {
    id: 303,
    name: "Sinnar Community Health Centre",
    facilityType: "chc",
    district: "Nashik",
    village: "Sinnar",
    address: "Nashik-Pune Road, Sinnar, Nashik 422103",
    phone: "+91 2551 220033",
    latitude: 19.8450,
    longitude: 73.9980,
    specialties: ["General Medicine", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Labor Room", "Basic Emergency Care", "Minor OT", "Cold Chain Hub"],
    totalBeds: 50,
    availableBeds: 18,
    icuAvailable: false,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 4. Mumbai City & Mumbai Suburban
  {
    id: 401,
    name: "King Edward Memorial (KEM) Hospital & Medical College",
    facilityType: "specialist",
    district: "Mumbai City",
    village: "Parel",
    address: "Acharya Donde Marg, Parel, Mumbai 400012",
    phone: "+91 22 2410 7000",
    latitude: 18.9986,
    longitude: 72.8432,
    specialties: ["Cardiology", "Neurology", "Nephrology & Dialysis", "General Surgery", "Orthopaedics & Trauma", "Emergency Medicine", "Pulmonology", "Radiology & Sonography"],
    capabilities: ["Tertiary Care Multi-Specialty", "Advanced ICU & CCU", "24x7 Level-1 Trauma", "Organ Transplant", "Blood Bank", "Cardiac Catheterization Lab"],
    totalBeds: 1800,
    availableBeds: 140,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },
  {
    id: 402,
    name: "Dr. R. N. Cooper Municipal General Hospital",
    facilityType: "district_hospital",
    district: "Mumbai Suburban",
    village: "Juhu",
    address: "U 15, Bhaktivedanta Swami Marg, J.V.P.D. Scheme, Juhu, Mumbai 400056",
    phone: "+91 22 2620 7254",
    latitude: 19.1075,
    longitude: 72.8360,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Emergency Medicine"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Trauma OT", "CT Scan"],
    totalBeds: 640,
    availableBeds: 92,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 5. Chhatrapati Sambhajinagar (Aurangabad)
  {
    id: 501,
    name: "Government Medical College & Hospital (GMCH) Chhatrapati Sambhajinagar",
    facilityType: "district_hospital",
    district: "Chhatrapati Sambhajinagar (Aurangabad)",
    village: "Chhatrapati Sambhajinagar City",
    address: "Panchakki Road, Aurangabad 431001",
    phone: "+91 240 240 2412",
    latitude: 19.8762,
    longitude: 75.3433,
    specialties: ["General Medicine", "Cardiology", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Orthopaedics & Trauma", "Radiology & Sonography"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Trauma Care Hub", "Oxygen Plant", "Dialysis Unit"],
    totalBeds: 1100,
    availableBeds: 135,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },
  {
    id: 502,
    name: "Paithan Sub-District Hospital",
    facilityType: "sub_district_hospital",
    district: "Chhatrapati Sambhajinagar (Aurangabad)",
    village: "Paithan",
    address: "Shevgaon Road, Paithan 431107",
    phone: "+91 2431 223020",
    latitude: 19.4820,
    longitude: 75.3850,
    specialties: ["General Medicine", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Labor Room", "Emergency Care", "Blood Storage", "Oxygen Support"],
    totalBeds: 100,
    availableBeds: 28,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 6. Nagpur
  {
    id: 601,
    name: "Government Medical College & Hospital (GMCH) Nagpur",
    facilityType: "district_hospital",
    district: "Nagpur",
    village: "Nagpur City",
    address: "Medical Square, Hanuman Nagar, Nagpur 440003",
    phone: "+91 712 274 4671",
    latitude: 21.1458,
    longitude: 79.0882,
    specialties: ["General Medicine", "Cardiology", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Orthopaedics & Trauma", "Nephrology & Dialysis"],
    capabilities: ["Super-Specialty Tertiary Care", "24x7 Emergency & Trauma", "Advanced ICU", "Regional Blood Bank", "Oxygen Plant"],
    totalBeds: 1400,
    availableBeds: 180,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },
  {
    id: 602,
    name: "Ramtek Sub-District Hospital",
    facilityType: "sub_district_hospital",
    district: "Nagpur",
    village: "Ramtek",
    address: "Mansar Road, Ramtek, Nagpur 441106",
    phone: "+91 7114 255100",
    latitude: 21.3960,
    longitude: 79.3280,
    specialties: ["General Medicine", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Labor Room", "Basic Emergency Care", "Oxygen Support"],
    totalBeds: 100,
    availableBeds: 25,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 7. Thane
  {
    id: 701,
    name: "Thane District Civil Hospital",
    facilityType: "district_hospital",
    district: "Thane",
    village: "Thane City",
    address: "Station Road, Tembhi Naka, Thane West 400601",
    phone: "+91 22 2542 3340",
    latitude: 19.2183,
    longitude: 72.9781,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Orthopaedics & Trauma", "Radiology & Sonography"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Trauma Hub", "Oxygen Support"],
    totalBeds: 500,
    availableBeds: 70,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },
  {
    id: 702,
    name: "Kalyan Sub-District Hospital",
    facilityType: "sub_district_hospital",
    district: "Thane",
    village: "Kalyan",
    address: "Rukminibai Hospital, Kalyan West, Thane 421301",
    phone: "+91 251 220 5410",
    latitude: 19.2437,
    longitude: 73.1355,
    specialties: ["General Medicine", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Labor Room", "NICU", "Oxygen Support"],
    totalBeds: 150,
    availableBeds: 30,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 8. Ahilyanagar (Ahmednagar)
  {
    id: 801,
    name: "Ahilyanagar District Civil Hospital",
    facilityType: "district_hospital",
    district: "Ahilyanagar (Ahmednagar)",
    village: "Ahilyanagar City",
    address: "Civil Hospital Road, Tophkhana, Ahilyanagar 414001",
    phone: "+91 241 234 5600",
    latitude: 19.0952,
    longitude: 74.7496,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Orthopaedics & Trauma"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Plant", "Dialysis Unit"],
    totalBeds: 400,
    availableBeds: 64,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },
  {
    id: 802,
    name: "Shirdi Super-Specialty Hospital & CHC",
    facilityType: "sub_district_hospital",
    district: "Ahilyanagar (Ahmednagar)",
    village: "Shirdi",
    address: "Nagar-Manmad Road, Shirdi 423109",
    phone: "+91 2423 258000",
    latitude: 19.7645,
    longitude: 74.4762,
    specialties: ["General Medicine", "Cardiology", "Orthopaedics & Trauma", "Emergency Medicine"],
    capabilities: ["24x7 Emergency & Trauma", "Cardiac Care Unit", "Advanced ICU", "Blood Bank"],
    totalBeds: 250,
    availableBeds: 48,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 9. Kolhapur
  {
    id: 901,
    name: "Chhatrapati Pramila Raje (CPR) General Hospital",
    facilityType: "district_hospital",
    district: "Kolhapur",
    village: "Kolhapur City",
    address: "Dasara Chowk, Kolhapur 416002",
    phone: "+91 231 264 4560",
    latitude: 16.7050,
    longitude: 74.2433,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Orthopaedics & Trauma", "Cardiology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Trauma Hub", "Oxygen Plant"],
    totalBeds: 650,
    availableBeds: 95,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 10. Solapur
  {
    id: 1001,
    name: "Dr. Vaishampayan Memorial Government Medical College & Hospital",
    facilityType: "district_hospital",
    district: "Solapur",
    village: "Solapur City",
    address: "Civil Lines, Solapur 413003",
    phone: "+91 217 274 9400",
    latitude: 17.6599,
    longitude: 75.9064,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Nephrology & Dialysis"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Plant", "Dialysis Unit"],
    totalBeds: 700,
    availableBeds: 102,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 11. Satara
  {
    id: 1101,
    name: "Satara District Hospital",
    facilityType: "district_hospital",
    district: "Satara",
    village: "Satara City",
    address: "Sadar Bazar, Satara 415001",
    phone: "+91 2162 234100",
    latitude: 17.6805,
    longitude: 73.9997,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 350,
    availableBeds: 58,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 12. Amravati
  {
    id: 1201,
    name: "Amravati District General Hospital",
    facilityType: "district_hospital",
    district: "Amravati",
    village: "Amravati City",
    address: "Irwin Square, Amravati 444601",
    phone: "+91 721 256 2200",
    latitude: 20.9374,
    longitude: 77.7796,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Orthopaedics & Trauma"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Plant", "SNCU"],
    totalBeds: 450,
    availableBeds: 74,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 13. Akola
  {
    id: 1301,
    name: "Government Medical College & Hospital (GMCH) Akola",
    facilityType: "district_hospital",
    district: "Akola",
    village: "Akola City",
    address: "Collector Office Road, Akola 444001",
    phone: "+91 724 243 1960",
    latitude: 20.7002,
    longitude: 77.0082,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 500,
    availableBeds: 80,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 14. Dhule
  {
    id: 1401,
    name: "Shri Bhausaheb Hire Government Medical College & Hospital",
    facilityType: "district_hospital",
    district: "Dhule",
    village: "Dhule City",
    address: "Chakkarbardi, Malegaon Road, Dhule 424001",
    phone: "+91 2562 237200",
    latitude: 20.9042,
    longitude: 74.7749,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Plant"],
    totalBeds: 550,
    availableBeds: 90,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 15. Jalgaon
  {
    id: 1501,
    name: "Government Medical College & General Hospital Jalgaon",
    facilityType: "district_hospital",
    district: "Jalgaon",
    village: "Jalgaon City",
    address: "Civil Hospital Compound, Station Road, Jalgaon 425001",
    phone: "+91 257 222 4150",
    latitude: 21.0077,
    longitude: 75.5626,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 500,
    availableBeds: 75,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 16. Nanded
  {
    id: 1601,
    name: "Dr. Shankarrao Chavan Government Medical College & Hospital",
    facilityType: "district_hospital",
    district: "Nanded",
    village: "Nanded City",
    address: "Vishnupuri, Nanded 431606",
    phone: "+91 2462 229285",
    latitude: 19.1383,
    longitude: 77.3210,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Cardiology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Plant", "Dialysis Unit"],
    totalBeds: 600,
    availableBeds: 88,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 17. Latur
  {
    id: 1701,
    name: "Vilasrao Deshmukh Government Medical College & Hospital",
    facilityType: "district_hospital",
    district: "Latur",
    village: "Latur City",
    address: "Medical College Ground, Latur 413512",
    phone: "+91 2382 250500",
    latitude: 18.4088,
    longitude: 76.5604,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Plant"],
    totalBeds: 600,
    availableBeds: 92,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 18. Chandrapur
  {
    id: 1801,
    name: "Government Medical College & Hospital Chandrapur",
    facilityType: "district_hospital",
    district: "Chandrapur",
    village: "Chandrapur City",
    address: "Ramnagar, Chandrapur 442401",
    phone: "+91 7172 252200",
    latitude: 19.9615,
    longitude: 79.2961,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 450,
    availableBeds: 68,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 19. Gadchiroli
  {
    id: 1901,
    name: "Gadchiroli District Civil Hospital",
    facilityType: "district_hospital",
    district: "Gadchiroli",
    village: "Gadchiroli City",
    address: "Complex Area, Gadchiroli 442605",
    phone: "+91 7138 222120",
    latitude: 20.1849,
    longitude: 80.0035,
    specialties: ["General Medicine", "Obstetrics & Gynaecology", "Paediatrics & Neonatology", "Emergency Medicine"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Storage", "Oxygen Support", "SNCU"],
    totalBeds: 250,
    availableBeds: 40,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 20. Palghar
  {
    id: 2001,
    name: "Palghar District Civil Hospital & Trauma Centre",
    facilityType: "district_hospital",
    district: "Palghar",
    village: "Palghar City",
    address: "Manor Road, Palghar 401404",
    phone: "+91 2525 252100",
    latitude: 19.6967,
    longitude: 72.7655,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 300,
    availableBeds: 55,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 21. Raigad
  {
    id: 2101,
    name: "Alibag District Civil Hospital",
    facilityType: "district_hospital",
    district: "Raigad",
    village: "Alibag",
    address: "Chendhare, Alibag, Raigad 402201",
    phone: "+91 2141 222055",
    latitude: 18.5158,
    longitude: 72.9984,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Labor Room", "Blood Bank", "Oxygen Support"],
    totalBeds: 250,
    availableBeds: 42,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 22. Ratnagiri
  {
    id: 2201,
    name: "Ratnagiri District Civil Hospital",
    facilityType: "district_hospital",
    district: "Ratnagiri",
    village: "Ratnagiri City",
    address: "Jail Road, Ratnagiri 415612",
    phone: "+91 2352 222360",
    latitude: 16.9902,
    longitude: 73.3120,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 300,
    availableBeds: 48,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 23. Sindhudurg
  {
    id: 2301,
    name: "Sindhudurg District Civil Hospital (Oros)",
    facilityType: "district_hospital",
    district: "Sindhudurg",
    village: "Oros",
    address: "Sindhudurgnagari, Oros 416812",
    phone: "+91 2362 228800",
    latitude: 16.1158,
    longitude: 73.7088,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 250,
    availableBeds: 38,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 24. Sangli
  {
    id: 2401,
    name: "Government Medical College & General Hospital Miraj & Sangli",
    facilityType: "district_hospital",
    district: "Sangli",
    village: "Sangli City",
    address: "Pandharpur Road, Miraj, Sangli 416410",
    phone: "+91 233 222 1100",
    latitude: 16.8524,
    longitude: 74.5815,
    specialties: ["General Medicine", "Cardiology", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Plant", "Dialysis Unit"],
    totalBeds: 600,
    availableBeds: 85,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 25. Beed
  {
    id: 2501,
    name: "Beed District Civil Hospital",
    facilityType: "district_hospital",
    district: "Beed",
    village: "Beed City",
    address: "Jalna Road, Beed 431122",
    phone: "+91 2442 222300",
    latitude: 18.9891,
    longitude: 75.7601,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 350,
    availableBeds: 50,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 26. Jalna
  {
    id: 2601,
    name: "Jalna District Civil Hospital",
    facilityType: "district_hospital",
    district: "Jalna",
    village: "Jalna City",
    address: "Railway Station Road, Jalna 431203",
    phone: "+91 2482 230400",
    latitude: 19.8410,
    longitude: 75.8864,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 300,
    availableBeds: 45,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 27. Parbhani
  {
    id: 2701,
    name: "Government Medical College & District Hospital Parbhani",
    facilityType: "district_hospital",
    district: "Parbhani",
    village: "Parbhani City",
    address: "Subhash Road, Parbhani 431401",
    phone: "+91 2452 223500",
    latitude: 19.2686,
    longitude: 76.7708,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 400,
    availableBeds: 60,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 28. Hingoli
  {
    id: 2801,
    name: "Hingoli District Civil Hospital",
    facilityType: "district_hospital",
    district: "Hingoli",
    village: "Hingoli City",
    address: "Akola Bypass, Hingoli 431513",
    phone: "+91 2456 221200",
    latitude: 19.7196,
    longitude: 77.1472,
    specialties: ["General Medicine", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Labor Room", "Blood Storage", "Oxygen Support"],
    totalBeds: 200,
    availableBeds: 35,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 29. Dharashiv (Osmanabad)
  {
    id: 2901,
    name: "Government Medical College & District Hospital Dharashiv",
    facilityType: "district_hospital",
    district: "Dharashiv (Osmanabad)",
    village: "Dharashiv City",
    address: "Solapur Road, Dharashiv 413501",
    phone: "+91 2472 222400",
    latitude: 18.1861,
    longitude: 76.0419,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 400,
    availableBeds: 58,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 30. Buldhana
  {
    id: 3001,
    name: "Buldhana District Civil Hospital",
    facilityType: "district_hospital",
    district: "Buldhana",
    village: "Buldhana City",
    address: "Chikhli Road, Buldhana 443001",
    phone: "+91 7262 242200",
    latitude: 20.5293,
    longitude: 76.1843,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 350,
    availableBeds: 52,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 31. Washim
  {
    id: 3101,
    name: "Washim District Civil Hospital",
    facilityType: "district_hospital",
    district: "Washim",
    village: "Washim City",
    address: "Pusad Road, Washim 444505",
    phone: "+91 7252 232100",
    latitude: 20.1110,
    longitude: 77.1352,
    specialties: ["General Medicine", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Labor Room", "Blood Storage", "Oxygen Support"],
    totalBeds: 200,
    availableBeds: 32,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 32. Yavatmal
  {
    id: 3201,
    name: "Shri Vasantrao Naik Government Medical College & Hospital",
    facilityType: "district_hospital",
    district: "Yavatmal",
    village: "Yavatmal City",
    address: "Civil Lines, Yavatmal 445001",
    phone: "+91 7232 242400",
    latitude: 20.3888,
    longitude: 78.1204,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Plant", "Dialysis Unit"],
    totalBeds: 550,
    availableBeds: 82,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 33. Wardha
  {
    id: 3301,
    name: "Mahatma Gandhi Institute of Medical Sciences (MGIMS) & District Hospital",
    facilityType: "district_hospital",
    district: "Wardha",
    village: "Sevagram",
    address: "Sevagram, Wardha 442102",
    phone: "+91 7152 284341",
    latitude: 20.7453,
    longitude: 78.6022,
    specialties: ["General Medicine", "Cardiology", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Plant"],
    totalBeds: 600,
    availableBeds: 94,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 34. Bhandara
  {
    id: 3401,
    name: "Bhandara District General Hospital",
    facilityType: "district_hospital",
    district: "Bhandara",
    village: "Bhandara City",
    address: "Civil Lines, Bhandara 441904",
    phone: "+91 7184 252300",
    latitude: 21.1714,
    longitude: 79.6543,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Labor Room", "Blood Bank", "Oxygen Support"],
    totalBeds: 250,
    availableBeds: 40,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },

  // 35. Gondia
  {
    id: 3501,
    name: "Government Medical College & Hospital Gondia",
    facilityType: "district_hospital",
    district: "Gondia",
    village: "Gondia City",
    address: "KTS Hospital Campus, Gondia 441601",
    phone: "+91 7182 238000",
    latitude: 21.4554,
    longitude: 80.1961,
    specialties: ["General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Paediatrics & Neonatology"],
    capabilities: ["24x7 Emergency Room", "Intensive Care Unit (ICU)", "Blood Bank", "Oxygen Support"],
    totalBeds: 450,
    availableBeds: 65,
    icuAvailable: true,
    oxygenAvailable: true,
    is24x7: true,
  },
];

