/**
 * Arjuna - Synthetic Maharashtra Rural Public Health Dataset Generator
 * 
 * ALL DATA IN THIS FILE IS 100% SYNTHETIC AND DESIGNED FOR DEMONSTRATION ONLY.
 * NO REAL PATIENT, CLINICIAN, OR RESIDENTIAL DATA IS USED.
 * 
 * DEMO DATA — Synthetic record for demonstration only.
 */

import { SMART_FACILITIES_REGISTRY } from "./smartReferralEngine";

export const DEMO_DATA_LABEL = "DEMO DATA — Synthetic record for demonstration only";
export const DEMO_DATA_DISCLAIMER =
  "All records in this environment are synthetic and created only for demonstration. They do not represent real patients, healthcare workers, facilities, or medical advice.";

export interface SyntheticPatient {
  id: number;
  userId: number | null;
  householdId: number | null;
  name: string;
  age: number;
  gender: "male" | "female" | "other" | "undisclosed";
  contact: string;
  village: string;
  district: string;
  emergencyContact: string;
  bloodGroup: string;
  allergies: string;
  conditions: string;
  riskScore: number;
  riskCategory: "low" | "moderate" | "high" | "critical";
  missedFollowUps?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  glucose?: number;
  spo2?: number;
  createdAt: Date;
  updatedAt: Date;
  isDemoData: boolean;
  recordLabel: string;
}

export interface SyntheticHousehold {
  id: number;
  headName: string;
  village: string;
  district: string;
  contact: string;
  assignedWorkerId: number;
  createdAt: Date;
}

export interface SyntheticMedicineConsumptionMonth {
  facilityId: number;
  facilityName: string;
  district: string;
  month: string; // e.g. "2026-03", "2026-04", etc.
  medicineName: string;
  category: string;
  openingStock: number;
  receivedStock: number;
  dispensedStock: number;
  wastageStock: number;
  closingStock: number;
  stockoutDays: number;
  averageDailyConsumption: number;
}

export const MARATHI_FIRST_NAMES_MALE = [
  "Ramesh", "Suresh", "Santosh", "Ganesh", "Dnyaneshwar", "Tukaram", "Pandurang", "Balasaheb",
  "Namdeo", "Vitthal", "Ashok", "Anil", "Sunil", "Pravin", "Sachin", "Nilesh",
  "Vikas", "Yogesh", "Sandeep", "Manoj", "Kailas", "Bhausaheb", "Gorakh", "Sudam",
  "Eknath", "Dilip", "Rajendra", "Pradeep", "Mahesh", "Chandrakant", "Shivaji", "Bhagwan",
];

export const MARATHI_FIRST_NAMES_FEMALE = [
  "Sunita", "Savita", "Mangala", "Vaishali", "Archana", "Rekha", "Meera", "Sarubai",
  "Parvatibai", "Shakuntala", "Suman", "Lata", "Usha", "Kavita", "Anjali", "Rupali",
  "Pooja", "Shobha", "Kusum", "Chhaya", "Vandana", "Anita", "Sangita", "Jyoti",
  "Manjusha", "Surekha", "Kamal", "Sindhu", "Nanda", "Vidya", "Aparna", "Deepali",
];

export const MARATHI_SURNAMES = [
  "Patel", "Patil", "Deshmukh", "More", "Shinde", "Jadhav", "Pawar", "Gaikwad",
  "Kadam", "Bhosale", "Chavan", "Thorat", "Gholap", "Jagtap", "Salunkhe", "Kale",
  "Raut", "Sonawane", "Kulkarni", "Ahire", "Gawande", "Thakur", "Rathod", "Solanki",
  "Gharat", "Wagh", "Borse", "Mahajan", "Khairnar", "Dhangar", "Chaudhari", "Nikam",
];

export const MAHARASHTRA_VILLAGES_LIST = [
  { name: "Karanji Budruk", district: "Nandurbar", block: "Shahada", facilityId: 1 },
  { name: "Sonwadi", district: "Nandurbar", block: "Shahada", facilityId: 2 },
  { name: "Nimbayat", district: "Nandurbar", block: "Nandurbar", facilityId: 3 },
  { name: "Dhanora", district: "Nandurbar", block: "Taloda", facilityId: 4 },
  { name: "Waghoda", district: "Dhule", block: "Shirpur", facilityId: 5 },
  { name: "Pimpri Khurd", district: "Dhule", block: "Sakri", facilityId: 6 },
  { name: "Bhavadi", district: "Dhule", block: "Sindkheda", facilityId: 7 },
  { name: "Kharpudi", district: "Nashik", block: "Dindori", facilityId: 8 },
  { name: "Alegaon", district: "Pune", block: "Shirur", facilityId: 12 },
  { name: "Borgaon", district: "Satara", block: "Karad", facilityId: 10 },
  { name: "Chincholi", district: "Ahmednagar", block: "Sangamner", facilityId: 9 },
  { name: "Mhaswad", district: "Satara", block: "Man", facilityId: 10 },
  { name: "Kumbhari", district: "Solapur", block: "Solapur South", facilityId: 11 },
  { name: "Rajewadi", district: "Pune", block: "Purandar", facilityId: 12 },
  { name: "Ashti Khurd", district: "Beed", block: "Ashti", facilityId: 13 },
  { name: "Palsi", district: "Beed", block: "Ashti", facilityId: 13 },
  { name: "Kinhai", district: "Satara", block: "Koregaon", facilityId: 10 },
  { name: "Waki", district: "Pune", block: "Khed", facilityId: 12 },
  { name: "Mohgaon", district: "Latur", block: "Renapur", facilityId: 14 },
  { name: "Sawargaon", district: "Osmanabad", block: "Tuljapur", facilityId: 15 },
  { name: "Karanjkhed", district: "Amravati", block: "Morshi", facilityId: 16 },
  { name: "Devgaon", district: "Amravati", block: "Achalpur", facilityId: 16 },
  { name: "Shirasgaon", district: "Nandurbar", block: "Nandurbar", facilityId: 17 },
  { name: "Tandulwadi", district: "Jalgaon", block: "Raver", facilityId: 7 },
];

export const CLINICAL_CONDITIONS_PRESETS = [
  { conditions: "Hypertension Stage 2", allergies: "Sulfa drugs", bloodGroup: "B+", riskCategory: "high" as const, baseScore: 80 },
  { conditions: "Type 2 Diabetes, Mild Neuropathy", allergies: "Penicillin", bloodGroup: "O+", riskCategory: "high" as const, baseScore: 76 },
  { conditions: "Antenatal 28 Weeks, Mild Nutritional Anemia (Hb 9.4)", allergies: "None", bloodGroup: "AB+", riskCategory: "high" as const, baseScore: 68 },
  { conditions: "Chronic Bronchitis (COPD Moderate)", allergies: "None", bloodGroup: "B+", riskCategory: "moderate" as const, baseScore: 54 },
  { conditions: "Essential Hypertension Stage 1", allergies: "None", bloodGroup: "A+", riskCategory: "moderate" as const, baseScore: 46 },
  { conditions: "Type 2 Diabetes Mellitus (Controlled)", allergies: "None", bloodGroup: "O+", riskCategory: "moderate" as const, baseScore: 42 },
  { conditions: "Osteoarthritis Knees, Mild Hypertension", allergies: "Aspirin", bloodGroup: "A-", riskCategory: "moderate" as const, baseScore: 50 },
  { conditions: "Severe Hypertension Stage 2, Uncontrolled Diabetes", allergies: "Penicillin", bloodGroup: "A+", riskCategory: "critical" as const, baseScore: 92 },
  { conditions: "Hypertensive Urgency, SpO2 91%", allergies: "None", bloodGroup: "O-", riskCategory: "critical" as const, baseScore: 96 },
  { conditions: "Antenatal 32 Weeks with Gestational Hypertension (BP 154/98)", allergies: "None", bloodGroup: "B+", riskCategory: "critical" as const, baseScore: 90 },
  { conditions: "Seasonal Allergy, Healthy Baseline", allergies: "Dust", bloodGroup: "O+", riskCategory: "low" as const, baseScore: 18 },
  { conditions: "Routine Health Check, No Chronic Conditions", allergies: "None", bloodGroup: "B+", riskCategory: "low" as const, baseScore: 12 },
  { conditions: "Mild Acid Peptic Disease", allergies: "None", bloodGroup: "A+", riskCategory: "low" as const, baseScore: 22 },
  { conditions: "Hypothyroidism (Controlled on Eltroxin)", allergies: "None", bloodGroup: "O+", riskCategory: "low" as const, baseScore: 26 },
  { conditions: "Chronic Kidney Disease Stage 3, Hypertension", allergies: "None", bloodGroup: "AB-", riskCategory: "critical" as const, baseScore: 94 },
];

/**
 * Generate 105+ synthetic Maharashtra patients with realistic attributes,
 * with Ramesh Patel placed prominently as HERO Patient ID 1.
 */
export function generateSyntheticMaharashtraPatients(): SyntheticPatient[] {
  const patientsList: SyntheticPatient[] = [];

  // 1. HERO PATIENT: Ramesh Patel
  const heroPatient: SyntheticPatient = {
    id: 1,
    userId: 1,
    householdId: 1,
    name: "Ramesh Patel",
    age: 58,
    gender: "male",
    contact: "+91 98221 14400",
    village: "Karanji Budruk",
    district: "Nandurbar",
    emergencyContact: "+91 98221 14401 (Suresh Patel - Son)",
    bloodGroup: "B+",
    allergies: "Sulfa drugs",
    conditions: "Hypertension, Elevated Fasting Blood Glucose",
    riskScore: 82,
    riskCategory: "high",
    missedFollowUps: 2,
    bpSystolic: 174,
    bpDiastolic: 108,
    glucose: 236,
    spo2: 96,
    createdAt: new Date(Date.now() - 90 * 86400000),
    updatedAt: new Date(),
    isDemoData: true,
    recordLabel: DEMO_DATA_LABEL,
  };
  patientsList.push(heroPatient);

  // 2. Add 104+ realistic synthetic patients across 24 villages & 15 districts
  let currentId = 2;
  for (let vIdx = 0; vIdx < MAHARASHTRA_VILLAGES_LIST.length; vIdx++) {
    const villageObj = MAHARASHTRA_VILLAGES_LIST[vIdx];
    // Create 4-6 patients per village
    const countInVillage = vIdx % 2 === 0 ? 5 : 4;

    for (let pIdx = 0; pIdx < countInVillage; pIdx++) {
      const isFemale = (currentId + pIdx) % 2 === 0;
      const firstNameList = isFemale ? MARATHI_FIRST_NAMES_FEMALE : MARATHI_FIRST_NAMES_MALE;
      const fName = firstNameList[(currentId * 7 + pIdx * 3) % firstNameList.length];
      const sName = MARATHI_SURNAMES[(currentId * 11 + vIdx * 5) % MARATHI_SURNAMES.length];
      const fullName = `${fName} ${sName}`;

      const age = 19 + ((currentId * 17 + pIdx * 11) % 65);
      const preset = CLINICAL_CONDITIONS_PRESETS[(currentId + vIdx) % CLINICAL_CONDITIONS_PRESETS.length];
      
      const phoneSuffix = 1000 + (currentId * 37) % 8999;
      const contactPhone = `+91 9822${phoneSuffix}`;

      let missed = 0;
      if (preset.riskCategory === "high") missed = (currentId % 3);
      if (preset.riskCategory === "critical") missed = 1 + (currentId % 2);

      let sys = 120 + ((currentId * 3) % 40);
      let dia = 78 + ((currentId * 2) % 25);
      let glu = 95 + ((currentId * 5) % 120);
      let oxy = 95 + (currentId % 5);

      if (preset.riskCategory === "critical") {
        sys = 170 + (currentId % 20);
        dia = 105 + (currentId % 15);
        glu = 220 + (currentId % 100);
        oxy = 91 + (currentId % 4);
      } else if (preset.riskCategory === "high") {
        sys = 155 + (currentId % 22);
        dia = 96 + (currentId % 12);
        glu = 170 + (currentId % 70);
        oxy = 95 + (currentId % 3);
      } else if (preset.riskCategory === "low") {
        sys = 114 + (currentId % 14);
        dia = 74 + (currentId % 8);
        glu = 88 + (currentId % 24);
        oxy = 98 + (currentId % 2);
      }

      patientsList.push({
        id: currentId,
        userId: currentId <= 6 ? currentId : null,
        householdId: Math.ceil(currentId / 3),
        name: fullName,
        age,
        gender: isFemale ? "female" : "male",
        contact: contactPhone,
        village: villageObj.name,
        district: villageObj.district,
        emergencyContact: `${contactPhone.slice(0, -1)}9 (${isFemale ? "Husband" : "Son"})`,
        bloodGroup: preset.bloodGroup,
        allergies: preset.allergies,
        conditions: preset.conditions,
        riskScore: Math.min(99, Math.max(10, preset.baseScore + ((currentId % 7) - 3))),
        riskCategory: preset.riskCategory,
        missedFollowUps: missed,
        bpSystolic: sys,
        bpDiastolic: dia,
        glucose: glu,
        spo2: oxy,
        createdAt: new Date(Date.now() - (15 + (currentId % 120)) * 86400000),
        updatedAt: new Date(Date.now() - (currentId % 5) * 86400000),
        isDemoData: true,
        recordLabel: DEMO_DATA_LABEL,
      });

      currentId++;
    }
  }

  return patientsList;
}

/**
 * Generate 35+ synthetic households across Maharashtra villages
 */
export function generateSyntheticMaharashtraHouseholds(): SyntheticHousehold[] {
  const households: SyntheticHousehold[] = [];
  let hId = 1;
  for (let i = 0; i < MAHARASHTRA_VILLAGES_LIST.length; i++) {
    const v = MAHARASHTRA_VILLAGES_LIST[i];
    const head1 = `${MARATHI_FIRST_NAMES_MALE[(i * 3) % MARATHI_FIRST_NAMES_MALE.length]} ${MARATHI_SURNAMES[(i * 5) % MARATHI_SURNAMES.length]}`;
    households.push({
      id: hId++,
      headName: head1,
      village: v.name,
      district: v.district,
      contact: `+91 9822${2000 + hId}`,
      assignedWorkerId: 2,
      createdAt: new Date(Date.now() - (30 + i * 2) * 86400000),
    });

    if (i % 2 === 0) {
      const head2 = `${MARATHI_FIRST_NAMES_MALE[(i * 7 + 1) % MARATHI_FIRST_NAMES_MALE.length]} ${MARATHI_SURNAMES[(i * 3 + 2) % MARATHI_SURNAMES.length]}`;
      households.push({
        id: hId++,
        headName: head2,
        village: v.name,
        district: v.district,
        contact: `+91 9822${2000 + hId}`,
        assignedWorkerId: 2,
        createdAt: new Date(Date.now() - (25 + i * 2) * 86400000),
      });
    }
  }
  return households;
}

/**
 * Generate synthetic medicines across all 17 facilities
 */
export function generateSyntheticMaharashtraMedicines() {
  const medicineCatalogue = [
    { name: "Amlodipine 5mg", category: "Hypertension", unit: "strips", defaultStock: 160, reorder: 40 },
    { name: "Amlodipine 10mg", category: "Hypertension", unit: "strips", defaultStock: 120, reorder: 35 },
    { name: "Telmisartan 40mg", category: "Hypertension", unit: "strips", defaultStock: 140, reorder: 35 },
    { name: "Losartan 50mg", category: "Hypertension", unit: "strips", defaultStock: 100, reorder: 30 },
    { name: "Metformin 500mg", category: "Diabetes", unit: "strips", defaultStock: 220, reorder: 60 },
    { name: "Glimepiride 1mg", category: "Diabetes", unit: "strips", defaultStock: 110, reorder: 30 },
    { name: "Paracetamol 500mg", category: "Analgesic", unit: "strips", defaultStock: 450, reorder: 100 },
    { name: "Ibuprofen 400mg", category: "Analgesic", unit: "strips", defaultStock: 180, reorder: 40 },
    { name: "Cetirizine 10mg", category: "Antihistamine", unit: "strips", defaultStock: 130, reorder: 30 },
    { name: "ORS Sachets (WHO formula)", category: "Essential", unit: "packs", defaultStock: 280, reorder: 80 },
    { name: "Atorvastatin 10mg", category: "Cardiovascular", unit: "strips", defaultStock: 140, reorder: 40 },
    { name: "Aspirin 75mg", category: "Cardiovascular", unit: "strips", defaultStock: 160, reorder: 45 },
    { name: "Pantoprazole 40mg", category: "Gastrointestinal", unit: "strips", defaultStock: 200, reorder: 50 },
    { name: "Iron & Folic Acid (IFA) Tablets", category: "Maternal Health", unit: "bottles", defaultStock: 150, reorder: 40 },
    { name: "Salbutamol Inhaler 100mcg", category: "Respiratory", unit: "inhalers", defaultStock: 35, reorder: 15 },
    { name: "Amoxicillin 500mg", category: "Antibiotics", unit: "strips", defaultStock: 120, reorder: 35 },
    { name: "Azithromycin 500mg", category: "Antibiotics", unit: "strips", defaultStock: 80, reorder: 25 },
    { name: "Insulin Glargine 100IU", category: "Diabetes", unit: "vials", defaultStock: 40, reorder: 15 },
  ];

  const medicinesList: any[] = [];
  let medId = 1;

  for (const facility of SMART_FACILITIES_REGISTRY) {
    for (let i = 0; i < medicineCatalogue.length; i++) {
      const template = medicineCatalogue[i];
      // Small variation per facility
      const stockMultiplier = facility.facilityType === "district_hospital" ? 2.5 : facility.facilityType === "chc" ? 1.5 : 1.0;
      let stock = Math.round(template.defaultStock * stockMultiplier + ((medId * 7) % 25) - 10);
      
      // Intentional stock levels at facility 1 for testing alerts & forecasting
      if (facility.id === 1) {
        if (template.name.includes("Salbutamol")) {
          stock = 4; // Below reorder level (15) -> LOW STOCK
        } else if (template.name.includes("Amlodipine 5mg")) {
          stock = 18; // Demand forecasting test baseline
        } else if (template.name.includes("Paracetamol 500mg")) {
          stock = 340; // Demand forecasting test baseline
        }
      }

      const batchYear = 2026;
      const batchCode = `${template.name.slice(0, 3).toUpperCase()}-MH-${batchYear}-${100 + (medId % 900)}`;
      const expiry = new Date(Date.now() + (180 + (i * 45)) * 86400000);

      medicinesList.push({
        id: medId++,
        facilityId: facility.id,
        name: template.name,
        category: template.category,
        currentStock: Math.max(0, stock),
        reorderLevel: Math.round(template.reorder * (stockMultiplier > 1 ? 1.5 : 1)),
        unit: template.unit,
        batchNumber: batchCode,
        expiryDate: expiry,
        updatedAt: new Date(),
        isDemoData: true,
      });
    }
  }

  return medicinesList;
}

/**
 * Generate 6+ months of historical medicine consumption for major facilities
 */
export function generateSyntheticMaharashtraConsumptionHistory(): SyntheticMedicineConsumptionMonth[] {
  const history: SyntheticMedicineConsumptionMonth[] = [];
  const monthLabels = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
  const keyMedicines = [
    { name: "Amlodipine 5mg", category: "Hypertension", baseDispense: 140 },
    { name: "Metformin 500mg", category: "Diabetes", baseDispense: 180 },
    { name: "Paracetamol 500mg", category: "Analgesic", baseDispense: 320 },
    { name: "ORS Sachets (WHO formula)", category: "Essential", baseDispense: 210 },
    { name: "Iron & Folic Acid (IFA) Tablets", category: "Maternal Health", baseDispense: 110 },
    { name: "Atorvastatin 10mg", category: "Cardiovascular", baseDispense: 95 },
  ];

  for (const facility of SMART_FACILITIES_REGISTRY.slice(0, 8)) {
    for (const month of monthLabels) {
      for (const med of keyMedicines) {
        const variance = ((facility.id * 13 + month.charCodeAt(6) * 7) % 35) - 15;
        const dispensed = Math.max(20, med.baseDispense + variance);
        const received = month === "2026-04" || month === "2026-07" ? dispensed * 3 : 0;
        const opening = dispensed * 2 + 50;
        const wastage = Math.floor(dispensed * 0.02);
        const closing = Math.max(10, opening + received - dispensed - wastage);

        history.push({
          facilityId: facility.id,
          facilityName: facility.name,
          district: facility.district,
          month,
          medicineName: med.name,
          category: med.category,
          openingStock: opening,
          receivedStock: received,
          dispensedStock: dispensed,
          wastageStock: wastage,
          closingStock: closing,
          stockoutDays: 0,
          averageDailyConsumption: Math.round((dispensed / 30) * 10) / 10,
        });
      }
    }
  }

  return history;
}

/**
 * Predefined demo accounts for SIH evaluation
 */
export const SYNTHETIC_DEMO_ACCOUNTS = [
  {
    openId: "asha-demo",
    email: "asha.demo@arjuna.gov.in",
    username: "asha.demo",
    password: "Demo@123",
    name: "Sunita More",
    role: "asha" as const,
    facilityId: 1,
    facilityName: "Karanji Budruk Health and Wellness Centre",
    village: "Karanji Budruk",
    district: "Nandurbar",
    phone: "+91 98221 14411",
    designation: "ASHA Community Health Worker",
    avatarInitials: "SM",
    badgeColor: "bg-emerald-600 text-white",
  },
  {
    openId: "doctor-demo",
    email: "doctor.demo@arjuna.gov.in",
    username: "doctor.demo",
    password: "Demo@123",
    name: "Dr. Amit Deshmukh",
    role: "doctor" as const,
    facilityId: 3,
    facilityName: "Nimbayat Primary Health Centre",
    village: "Nimbayat",
    district: "Nandurbar",
    phone: "+91 98221 14422",
    designation: "Medical Officer (MBBS, DNB)",
    avatarInitials: "AD",
    badgeColor: "bg-blue-600 text-white",
  },
  {
    openId: "cho-demo",
    email: "cho.demo@arjuna.gov.in",
    username: "cho.demo",
    password: "Demo@123",
    name: "Kavita Shinde",
    role: "cho" as const,
    facilityId: 1,
    facilityName: "Karanji Budruk Health and Wellness Centre",
    village: "Karanji Budruk",
    district: "Nandurbar",
    phone: "+91 98221 14433",
    designation: "Community Health Officer (CHO)",
    avatarInitials: "KS",
    badgeColor: "bg-teal-600 text-white",
  },
  {
    openId: "staff-demo",
    email: "staff.demo@arjuna.gov.in",
    username: "staff.demo",
    password: "Demo@123",
    name: "Mahesh Jadhav",
    role: "facility_staff" as const,
    facilityId: 3,
    facilityName: "Nimbayat Primary Health Centre",
    village: "Nimbayat",
    district: "Nandurbar",
    phone: "+91 98221 14444",
    designation: "Chief Pharmacist & Triage Desk Coordinator",
    avatarInitials: "MJ",
    badgeColor: "bg-amber-600 text-white",
  },
  {
    openId: "admin-demo",
    email: "admin.demo@arjuna.gov.in",
    username: "admin.demo",
    password: "Demo@123",
    name: "Main Demonstration Administrator",
    role: "administrator" as const,
    facilityId: 17,
    facilityName: "Shirasgaon District Hospital Command Hub",
    village: "Shirasgaon",
    district: "Nandurbar",
    phone: "+91 98221 14455",
    designation: "District Health Informatics & Operations Lead",
    avatarInitials: "AD",
    badgeColor: "bg-purple-600 text-white",
  },
  {
    openId: "citizen-demo",
    email: "citizen.demo@arjuna.gov.in",
    username: "citizen.demo",
    password: "Demo@123",
    name: "Ramesh Patel",
    role: "citizen" as const,
    facilityId: 1,
    facilityName: "Karanji Budruk Health and Wellness Centre",
    village: "Karanji Budruk",
    district: "Nandurbar",
    phone: "+91 98221 14400",
    designation: "Citizen / NCD Patient (Hero Profile)",
    avatarInitials: "RP",
    badgeColor: "bg-indigo-600 text-white",
    isHeroPersona: true,
  },
];

export const DEMO_USERS = SYNTHETIC_DEMO_ACCOUNTS;
export const MAHARASHTRA_VILLAGES = MAHARASHTRA_VILLAGES_LIST;
export const MAHARASHTRA_DISTRICTS = [
  "Nandurbar", "Dhule", "Nashik", "Jalgaon", "Ahmednagar",
  "Pune", "Satara", "Solapur", "Beed", "Latur",
  "Osmanabad", "Gadchiroli", "Chandrapur", "Yavatmal", "Amravati"
];
export const SYNTHETIC_DATA_DISCLAIMER = DEMO_DATA_DISCLAIMER;
