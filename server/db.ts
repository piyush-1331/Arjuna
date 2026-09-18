import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  alerts,
  appointments,
  auditEvents,
  campaigns,
  consultations,
  facilities,
  followUps,
  healthVisits,
  households,
  medicines,
  medicineTransactions,
  patients,
  prescriptions,
  referrals,
  referralEvents,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import * as supabaseDb from "./supabaseDb";
import { SMART_FACILITIES_REGISTRY } from "./smartReferralEngine";
import {
  generateSyntheticMaharashtraPatients,
  generateSyntheticMaharashtraHouseholds,
  generateSyntheticMaharashtraMedicines,
  generateSyntheticMaharashtraConsumptionHistory,
  SYNTHETIC_DEMO_ACCOUNTS,
  MAHARASHTRA_VILLAGES_LIST,
  DEMO_DATA_LABEL,
  DEMO_DATA_DISCLAIMER,
} from "./syntheticMaharashtraData";

let _db: ReturnType<typeof drizzle> | null = null;

// In-memory fallback dataset for seamless offline / zero-database runtime
let memPatients: any[] = [];
let memHouseholds: any[] = [];
let memVisits: any[] = [];
let memConsultations: any[] = [];
let memReferrals: any[] = [];
let memReferralEvents: any[] = [];
let memFollowUps: any[] = [];
let memMedicines: any[] = [];
let memMedicineTransactions: any[] = [];
let memPrescriptions: any[] = [];
let memAppointments: any[] = [];
let memCampaigns: any[] = [];
let memFacilities: any[] = [];
let memAlerts: any[] = [];
let memAudit: any[] = [];
let memUsers: any[] = [];
let memConsumptionHistory: any[] = [];
let isSeeded = false;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export function initMemoryStore(forceReset = false) {
  if (isSeeded && !forceReset) return;
  isSeeded = true;

  // 1. Facilities
  memFacilities = SMART_FACILITIES_REGISTRY.map((f) => ({
    id: f.id,
    name: f.name,
    facilityType: f.facilityType,
    district: f.district,
    village: f.village,
    address: f.address,
    phone: f.phone,
    latitude: f.latitude,
    longitude: f.longitude,
    capabilities: f.capabilities.join(", "),
    specialties: f.specialties,
    doctorAvailability: f.doctorAvailability,
    emergencyCapability: f.emergencyCapability,
    appointmentAvailability: f.appointmentAvailability,
    distanceFromBaseKm: f.distanceFromBaseKm,
    telemetry: f.telemetry,
    createdAt: new Date(),
  }));

  // 2. Households
  memHouseholds = generateSyntheticMaharashtraHouseholds();

  // 3. 100+ Synthetic Patients (Ramesh Patel = ID 1)
  memPatients = generateSyntheticMaharashtraPatients();

  // 4. Users (Demo Accounts)
  memUsers = SYNTHETIC_DEMO_ACCOUNTS.map((u, idx) => ({
    id: idx + 1,
    openId: u.openId,
    authId: u.openId,
    name: u.name,
    email: u.email,
    loginMethod: "demo",
    role: u.role,
    status: "APPROVED",
    phone: "+91 98221 440" + idx,
    dateOfBirth: "1985-05-15",
    age: 40,
    gender: "male",
    village: u.village || "Karanji Budruk",
    district: u.district || "Ahmedabad Rural",
    facilityId: u.facilityId,
    facilityName: u.facilityName || "Karanji Primary Health Centre",
    designation: u.role === "doctor" ? "Medical Officer" : u.role === "asha" ? "ASHA Facilitator" : u.role === "cho" ? "Community Health Officer" : "Staff",
    employeeId: `EMP-ARJ-${1000 + idx}`,
    registrationNumber: u.role === "doctor" ? "MMC/2012/04589" : null,
    assignedVillage: u.village || "Karanji Budruk",
    emergencyContactName: "Emergency Desk",
    emergencyContactPhone: "+91 98221 00000",
    avatarUrl: null,
    approvalRequestedAt: new Date(Date.now() - 60 * 86400000),
    approvedAt: new Date(Date.now() - 60 * 86400000),
    approvedBy: "admin",
    rejectionReason: null,
    createdAt: new Date(Date.now() - 60 * 86400000),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  }));

  // 5. Visits / Screenings (including Ramesh Patel's prior history)
  memVisits = [
    // Ramesh Patel - Prior Visit 1 (45 days ago)
    {
      id: 1,
      patientId: 1,
      recordedBy: 2, // Sunita More (ASHA)
      facilityId: 1, // Karanji Budruk HWC
      symptoms: "Occasional morning dizziness, mild headache, fatigue",
      structuredSymptoms: JSON.stringify(["Dizziness / Vertigo", "Extreme Fatigue / Lethargy"]),
      notes: "Initial NCD community screening. Elevated blood pressure and fasting glucose detected. Prescribed lifestyle modification and Amlodipine 5mg.",
      diagnosis: "Essential Hypertension Stage 1 & Impaired Fasting Glycemia",
      bpSystolic: 162,
      bpDiastolic: 98,
      pulse: 78,
      spo2: 97,
      temperature: "98.4",
      glucose: 210,
      weight: "68.5",
      height: "168.0",
      bmi: "24.3",
      triageLevel: "urgent",
      riskScore: 74,
      riskCategory: "high",
      recommendedAction: "Prescribed Amlodipine 5mg 1-0-0. Advised 14-day home BP monitoring and dietary sodium restriction.",
      aiSummary: "Risk 74/100 (high). Stage 1 hypertension with impaired fasting glucose. Home monitoring initiated.",
      createdAt: new Date(Date.now() - 45 * 86400000),
    },
    // Ramesh Patel - Prior Visit 2 (20 days ago)
    {
      id: 2,
      patientId: 1,
      recordedBy: 2, // Sunita More (ASHA)
      facilityId: 1, // Karanji Budruk HWC
      symptoms: "Persistent morning dizziness, missed evening dose",
      structuredSymptoms: JSON.stringify(["Dizziness / Vertigo"]),
      notes: "Home follow-up visit. Patient reported skipping evening medication due to farming hours. BP remains elevated at 168/102 mmHg.",
      diagnosis: "Essential Hypertension - Suboptimally controlled on monotherapy",
      bpSystolic: 168,
      bpDiastolic: 102,
      pulse: 80,
      spo2: 96,
      temperature: "98.6",
      glucose: 228,
      weight: "68.0",
      height: "168.0",
      bmi: "24.1",
      triageLevel: "urgent",
      riskScore: 79,
      riskCategory: "high",
      recommendedAction: "Reinforce medication adherence. Scheduled follow-up with Medical Officer at Nimbayat PHC.",
      aiSummary: "Risk 79/100 (high). Suboptimally controlled BP (168/102) with medication non-adherence signal.",
      createdAt: new Date(Date.now() - 20 * 86400000),
    },
    // Other Maharashtra patient visits
    {
      id: 3,
      patientId: 4, // Mangala Deshmukh (Sonwadi)
      recordedBy: 2,
      facilityId: 2,
      symptoms: "Shortness of breath upon exertion, bilateral knee pain, glucose spike",
      structuredSymptoms: JSON.stringify(["Severe Breathlessness", "Leg / Ankle Swelling"]),
      notes: "Home visit conducted. Severe hypertension and borderline hypoxia identified.",
      diagnosis: "Type 2 Diabetes with Uncontrolled Glycemia & Hypertension Stage 2",
      bpSystolic: 172,
      bpDiastolic: 104,
      pulse: 88,
      spo2: 94,
      temperature: "98.6",
      glucose: 242,
      weight: "71.0",
      height: "155.0",
      bmi: "29.5",
      triageLevel: "emergency",
      riskScore: 92,
      riskCategory: "critical",
      recommendedAction: "Urgent specialist cardiology referral to Shirasgaon District Hospital.",
      aiSummary: "Risk 92/100 (critical). Stage 2 Hypertension with hypoxia and hyperglycemia. Urgent referral escalated.",
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
    {
      id: 4,
      patientId: 6, // Vaishali Shinde (Nimbayat)
      recordedBy: 2,
      facilityId: 3,
      symptoms: "Routine ANC 30 weeks checkup, mild fatigue",
      structuredSymptoms: JSON.stringify(["Extreme Fatigue / Lethargy"]),
      notes: "3rd trimester ANC examination. Fetal heart sound normal (142 bpm). Hb 9.4 g/dL.",
      diagnosis: "Single Intrauterine Pregnancy 30 Wks with Mild Nutritional Anemia",
      bpSystolic: 118,
      bpDiastolic: 74,
      pulse: 76,
      spo2: 99,
      temperature: "98.2",
      glucose: 98,
      weight: "55.0",
      height: "156.0",
      bmi: "22.6",
      pregnancyStatus: "pregnant",
      triageLevel: "routine",
      riskScore: 65,
      riskCategory: "high",
      recommendedAction: "High-risk maternal protocol: IFA daily supplementation and 14-day growth scan.",
      aiSummary: "Risk 65/100 (high maternal priority). Nutritional anemia monitoring.",
      createdAt: new Date(Date.now() - 12 * 86400000),
    },
  ];

  // 6. Consultations
  memConsultations = [
    {
      id: 1,
      patientId: 1,
      doctorId: 3, // Dr. Amit Deshmukh
      facilityId: 3, // Nimbayat PHC
      appointmentId: 1,
      clinicalAssessment: "Essential Hypertension Stage 1 with suboptimally controlled morning systolic pressure and mild non-adherence history.",
      diagnosis: "Essential Hypertension Stage 1 with Impaired Fasting Glycemia",
      notes: "Patient counseled on low sodium diet (<5g salt/day), hydration, and strict morning medication timing. Prescribed Amlodipine 5mg + Metformin 500mg.",
      treatmentPlan: "Amlodipine 5mg 1-0-0 morning, Metformin 500mg 1-0-1 after food. Scheduled bi-weekly ASHA home BP tracking.",
      recommendedTests: "Serum Creatinine, Fasting Blood Sugar (FBS), Spot Urine Albumin-Creatinine Ratio (UACR), Lipid Profile",
      followUpPlan: "Home BP check by ASHA Sunita More in 14 days. PHC review in 30 days.",
      followUpDueAt: new Date(Date.now() + 14 * 86400000),
      aiSummaryUsed: "Patient Ramesh Patel (58M) presents with elevated BP (162/98) and fasting glucose. Prior ASHA screening notes reviewed.",
      bpSystolic: 160,
      bpDiastolic: 96,
      pulse: 78,
      spo2: 97,
      temperature: "98.4",
      glucose: 215,
      weight: "68.0",
      height: "168.0",
      bmi: "24.1",
      createdAt: new Date(Date.now() - 40 * 86400000),
    },
  ];

  // 7. Referrals (including active flow for Ramesh Patel)
  memReferrals = [
    {
      id: 1,
      patientId: 1, // Ramesh Patel
      createdBy: 2, // Sunita More (ASHA)
      targetFacilityId: 3, // Nimbayat PHC (Dr. Amit Deshmukh)
      specialty: "Internal Medicine / Cardiovascular Care",
      urgency: "urgent",
      reason: "Hypertension Stage 2 (174/108 mmHg) with elevated glucose (236 mg/dL) and 2 missed follow-up reviews. Needs Medical Officer evaluation & antihypertensive regimen titration.",
      status: "PENDING",
      recommendationScore: 95,
      scoreBreakdown: JSON.stringify({ specialtyMatch: 30, distance: 23, doctorAvailability: 15, emergencyCapability: 14, capabilitiesMatch: 9, appointmentAvailability: 4 }),
      distanceKm: "6.8",
      transportVehicle: null,
      transportDriverContact: null,
      acceptedAt: null,
      outcome: null,
      createdAt: new Date(Date.now() - 2 * 3600000),
      updatedAt: new Date(Date.now() - 2 * 3600000),
    },
    {
      id: 2,
      patientId: 4, // Mangala Deshmukh
      createdBy: 2,
      targetFacilityId: 17, // Shirasgaon District Hospital
      specialty: "Cardiology",
      urgency: "emergency",
      reason: "Hypertensive urgency (172/104 mmHg) with SpO2 94% and diabetes. Needs comprehensive emergency cardiac bed and IV stabilization.",
      status: "TRANSPORT_ASSIGNED",
      recommendationScore: 94,
      scoreBreakdown: JSON.stringify({ specialtyMatch: 30, distance: 18, doctorAvailability: 15, emergencyCapability: 15, capabilitiesMatch: 11, appointmentAvailability: 5 }),
      distanceKm: "21.0",
      transportVehicle: "108 Emergency Ambulance #MH-39-A-1204",
      transportDriverContact: "+91 98221 55660 (Driver Ganesh)",
      acceptedAt: new Date(Date.now() - 2.5 * 86400000),
      transportAssignedAt: new Date(Date.now() - 1.5 * 86400000),
      outcome: "Dispatched to Shirasgaon District Hospital Emergency Trauma Unit.",
      createdAt: new Date(Date.now() - 3 * 86400000),
      updatedAt: new Date(Date.now() - 1.5 * 86400000),
    },
    {
      id: 3,
      patientId: 6, // Vaishali Shinde
      createdBy: 2,
      targetFacilityId: 3, // Nimbayat PHC
      specialty: "Obstetrics & Gynecology",
      urgency: "routine",
      reason: "3rd Trimester growth scan & Iron Sucrose infusion planning for maternal anemia (Hb 9.4).",
      status: "ACCEPTED",
      recommendationScore: 89,
      scoreBreakdown: JSON.stringify({ specialtyMatch: 30, distance: 22, doctorAvailability: 14, emergencyCapability: 11, capabilitiesMatch: 8, appointmentAvailability: 4 }),
      distanceKm: "0.4",
      acceptedAt: new Date(Date.now() - 1 * 86400000),
      outcome: null,
      createdAt: new Date(Date.now() - 2 * 86400000),
      updatedAt: new Date(Date.now() - 1 * 86400000),
    },
  ];

  // 8. Referral Events
  memReferralEvents = [
    // Referral 1 events (Ramesh Patel)
    {
      id: 1,
      referralId: 1,
      status: "PENDING",
      actorId: 2,
      actorRole: "asha",
      actorName: "Sunita More (ASHA)",
      notes: "Identified high-risk vitals: BP 174/108 mmHg, Glucose 236 mg/dL, 2 missed appointments. Referral initiated to Nimbayat PHC.",
      createdAt: new Date(Date.now() - 2 * 3600000),
    },
    // Referral 2 events
    {
      id: 2,
      referralId: 2,
      status: "PENDING",
      actorId: 2,
      actorRole: "asha",
      actorName: "Sunita More (ASHA)",
      notes: "Critical hypertension detected. Escalated for emergency transfer.",
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
    {
      id: 3,
      referralId: 2,
      status: "ACCEPTED",
      actorId: 5,
      actorRole: "facility_staff",
      actorName: "Shirasgaon DH Triage Desk",
      notes: "Emergency CCU bed confirmed and prepared.",
      createdAt: new Date(Date.now() - 2.5 * 86400000),
    },
    {
      id: 4,
      referralId: 2,
      status: "TRANSPORT_ASSIGNED",
      actorId: 4,
      actorRole: "cho",
      actorName: "Kavita Shinde (CHO)",
      notes: "108 Emergency Ambulance assigned. Vehicle #MH-39-A-1204.",
      transportVehicle: "108 Emergency Ambulance #MH-39-A-1204",
      transportDriverContact: "+91 98221 55660 (Driver Ganesh)",
      createdAt: new Date(Date.now() - 1.5 * 86400000),
    },
    // Referral 3 events
    {
      id: 5,
      referralId: 3,
      status: "PENDING",
      actorId: 2,
      actorRole: "asha",
      actorName: "Sunita More (ASHA)",
      notes: "Antenatal high-risk nutrition referral created.",
      createdAt: new Date(Date.now() - 2 * 86400000),
    },
    {
      id: 6,
      referralId: 3,
      status: "ACCEPTED",
      actorId: 3,
      actorRole: "doctor",
      actorName: "Dr. Amit Deshmukh",
      notes: "ANC specialty OPD slot scheduled for Thursday morning.",
      createdAt: new Date(Date.now() - 1 * 86400000),
    },
  ];

  // 9. Follow-Ups (Including Ramesh Patel's 2 MISSED Follow-ups)
  memFollowUps = [
    // Ramesh Patel - Missed Follow-up #1 (30 days ago) -> OVERDUE
    {
      id: 1,
      patientId: 1,
      assignedTo: 2, // Sunita More
      referralId: null,
      title: "Monthly Blood Pressure & Medication Check (Missed)",
      reason: "Blood pressure review and medication adherence audit",
      dueAt: new Date(Date.now() - 30 * 86400000),
      status: "OVERDUE",
      notes: "Scheduled 30-day post-screening BP review. Patient was away in fields and missed home visit.",
      completedAt: null,
      completedBy: null,
      completionNotes: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date(Date.now() - 40 * 86400000),
    },
    // Ramesh Patel - Missed Follow-up #2 (15 days ago) -> OVERDUE
    {
      id: 2,
      patientId: 1,
      assignedTo: 2, // Sunita More
      referralId: null,
      title: "Glycemic & Dietary Counseling Follow-up (Missed)",
      reason: "Fasting glucose test and low-sodium compliance check",
      dueAt: new Date(Date.now() - 15 * 86400000),
      status: "OVERDUE",
      notes: "Second missed adherence check. Patient skipped medication doses.",
      completedAt: null,
      completedBy: null,
      completionNotes: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date(Date.now() - 25 * 86400000),
    },
    // Mangala Deshmukh Follow-up
    {
      id: 3,
      patientId: 4,
      assignedTo: 2,
      referralId: 2,
      title: "Post-Emergency Stabilization Vitals Check",
      reason: "Vitals and SpO2 check post hospital visit",
      dueAt: new Date(Date.now() + 2 * 86400000),
      status: "DUE_SOON",
      notes: "Verify blood pressure stabilization and oxygen saturation.",
      completedAt: null,
      completedBy: null,
      completionNotes: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date(Date.now() - 2 * 86400000),
    },
    // Vaishali Shinde Follow-up
    {
      id: 4,
      patientId: 6,
      assignedTo: 2,
      referralId: 3,
      title: "IFA Tablets Compliance & Nutrition Intake",
      reason: "Iron supplementation verification and fetal movement check",
      dueAt: new Date(Date.now() + 6 * 86400000),
      status: "OPEN",
      notes: "Ensure daily IFA consumption with citrus fruit.",
      completedAt: null,
      completedBy: null,
      completionNotes: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date(Date.now() - 2 * 86400000),
    },
  ];

  // 10. Medicines across 17 Facilities
  memMedicines = generateSyntheticMaharashtraMedicines();

  // 11. Medicine Transactions
  memMedicineTransactions = [
    {
      id: 1,
      medicineId: 1,
      medicineName: "Amlodipine 5mg",
      facilityId: 1,
      transactionType: "STOCK_RECEIVED",
      quantity: 160,
      previousStock: 0,
      newStock: 160,
      actorId: 5,
      actorRole: "facility_staff",
      actorName: "Mahesh Jadhav (Pharmacy)",
      batchNumber: "AML-MH-2026-101",
      notes: "District Medical Store Nandurbar monthly quota replenishment via Challan #DMS-NDB-4410",
      createdAt: new Date(Date.now() - 15 * 86400000),
    },
    {
      id: 2,
      medicineId: 4,
      medicineName: "Metformin 500mg",
      facilityId: 3,
      transactionType: "STOCK_RECEIVED",
      quantity: 220,
      previousStock: 0,
      newStock: 220,
      actorId: 5,
      actorRole: "facility_staff",
      actorName: "Mahesh Jadhav",
      batchNumber: "MET-MH-2026-304",
      notes: "Quarterly NCD essential drug allocation received",
      createdAt: new Date(Date.now() - 12 * 86400000),
    },
    {
      id: 3,
      medicineId: 1,
      medicineName: "Amlodipine 5mg",
      facilityId: 1,
      transactionType: "DISPENSED",
      quantity: -30,
      previousStock: 160,
      newStock: 130,
      actorId: 2,
      actorRole: "asha",
      actorName: "Sunita More",
      patientId: 1,
      batchNumber: "AML-MH-2026-101",
      notes: "Dispensed 1-month supply for Ramesh Patel (Hypertension)",
      createdAt: new Date(Date.now() - 45 * 86400000),
    },
  ];

  // 12. Prescriptions (including Ramesh Patel's active prescriptions)
  memPrescriptions = [
    {
      id: 1,
      patientId: 1, // Ramesh Patel
      doctorId: 3, // Dr. Amit Deshmukh
      facilityId: 3, // Nimbayat PHC
      prescriptionGroupId: "RX-MH-NDB-1001",
      medicineName: "Amlodipine 5mg",
      dosage: "5mg",
      frequency: "1-0-0 (Morning with water)",
      duration: "30 days",
      route: "Oral",
      instructions: "Take regularly every morning after breakfast. Avoid excess pickles and salty papad.",
      status: "active",
      startDate: new Date(Date.now() - 45 * 86400000),
      endDate: new Date(Date.now() + 15 * 86400000),
      createdAt: new Date(Date.now() - 45 * 86400000),
    },
    {
      id: 2,
      patientId: 1, // Ramesh Patel
      doctorId: 3,
      facilityId: 3,
      prescriptionGroupId: "RX-MH-NDB-1001",
      medicineName: "Metformin 500mg",
      dosage: "500mg",
      frequency: "1-0-1 (After meals)",
      duration: "30 days",
      route: "Oral",
      instructions: "Take after lunch and dinner. Report any gastrointestinal discomfort.",
      status: "active",
      startDate: new Date(Date.now() - 45 * 86400000),
      endDate: new Date(Date.now() + 15 * 86400000),
      createdAt: new Date(Date.now() - 45 * 86400000),
    },
  ];

  // 13. Appointments
  memAppointments = [
    {
      id: 1,
      patientId: 1,
      doctorId: 3,
      facilityId: 3,
      scheduledAt: new Date(Date.now() + 2 * 86400000),
      type: "ncd_followup",
      status: "scheduled",
      notes: "Hypertension Stage 2 & Glycemic titration consult.",
      createdAt: new Date(),
    },
  ];

  // 14. Health Campaigns across Maharashtra
  memCampaigns = [
    {
      id: 1,
      name: "Mukhyamantri NCD Screening Drive 2026",
      category: "ncd_screening",
      district: "Nandurbar",
      village: "Karanji Budruk",
      startDate: new Date(Date.now() - 10 * 86400000),
      endDate: new Date(Date.now() + 20 * 86400000),
      targetBeneficiaries: 500,
      screenedCount: 342,
      highRiskDetected: 48,
      status: "active",
      description: "Universal hypertension, diabetes, and oral health screening for adults 30+ in Shahada block.",
      createdAt: new Date(),
    },
    {
      id: 2,
      name: "Pradhan Mantri Matritva Vandana Drive",
      category: "maternal_health",
      district: "Dhule",
      village: "Bhavadi",
      startDate: new Date(Date.now() - 5 * 86400000),
      endDate: new Date(Date.now() + 25 * 86400000),
      targetBeneficiaries: 180,
      screenedCount: 124,
      highRiskDetected: 18,
      status: "active",
      description: "Comprehensive ANC registration, high-risk pregnancy screening, and IFA distribution in Sindkheda taluka.",
      createdAt: new Date(),
    },
    {
      id: 3,
      name: "Intensified Mission Indradhanush (IMI 6.0)",
      category: "immunization",
      district: "Pune",
      village: "Rajewadi",
      startDate: new Date(Date.now() + 5 * 86400000),
      endDate: new Date(Date.now() + 35 * 86400000),
      targetBeneficiaries: 400,
      screenedCount: 0,
      highRiskDetected: 0,
      status: "planned",
      description: "Catch-up immunization drive for 0-2 year children and pregnant women missing vaccine doses in Purandar block.",
      createdAt: new Date(),
    },
    {
      id: 4,
      name: "Anemia Mukt Maharashtra Outreach",
      category: "anemia_eradication",
      district: "Satara",
      village: "Mhaswad",
      startDate: new Date(Date.now() - 30 * 86400000),
      endDate: new Date(Date.now() - 2 * 86400000),
      targetBeneficiaries: 600,
      screenedCount: 615,
      highRiskDetected: 72,
      status: "completed",
      description: "Digital hemoglobinometry screening and therapeutic iron intervention for adolescent girls and mothers.",
      createdAt: new Date(),
    },
  ];

  // 15. Alerts
  memAlerts = [
    {
      id: 1,
      userId: 3, // Dr. Amit Deshmukh
      patientId: 1,
      referralId: 1,
      kind: "high_risk",
      title: "High-Risk Patient Triage: Ramesh Patel",
      message: "Ramesh Patel (Karanji Budruk) recorded BP 174/108 mmHg, Glucose 236 mg/dL with 2 missed follow-ups. Referral review pending at Nimbayat PHC.",
      readAt: null,
      createdAt: new Date(Date.now() - 2 * 3600000),
    },
    {
      id: 2,
      userId: 2, // Sunita More
      patientId: 1,
      referralId: null,
      kind: "overdue_follow_up",
      title: "Follow-up Overdue: Ramesh Patel",
      message: "Ramesh Patel has 2 overdue adherence check appointments.",
      readAt: null,
      createdAt: new Date(Date.now() - 15 * 86400000),
    },
    {
      id: 3,
      userId: 5, // Mahesh Jadhav
      patientId: null,
      referralId: null,
      kind: "low_stock",
      title: "Pharmacy Buffer Alert: Salbutamol Inhalers",
      message: "Salbutamol Inhaler stock (4 units) is below minimum threshold (15) at Karanji Budruk HWC.",
      readAt: null,
      createdAt: new Date(Date.now() - 1 * 86400000),
    },
  ];

  // 16. Historical Medicine Consumption
  memConsumptionHistory = generateSyntheticMaharashtraConsumptionHistory();
}

/**
 * Completely resets demonstration environment back to pristine synthetic state
 */
export async function resetDemoEnvironment() {
  initMemoryStore(true);
  return {
    success: true,
    timestamp: new Date().toISOString(),
    message: "Demonstration environment successfully reset to pristine rural Maharashtra synthetic dataset.",
    patientCount: memPatients.length,
    facilityCount: SMART_FACILITIES_REGISTRY.length,
    patients: memPatients.length,
    facilities: SMART_FACILITIES_REGISTRY.length,
    heroPatient: {
      id: 1,
      name: "Ramesh Patel",
      age: 58,
      village: "Karanji Budruk",
      district: "Nandurbar",
      bp: "174/108 mmHg",
      glucose: "236 mg/dL",
      spo2: "96%",
      missedFollowUps: 2,
      riskScore: 82,
      riskCategory: "high",
    },
    stats: {
      totalPatients: memPatients.length,
      totalVillages: MAHARASHTRA_VILLAGES_LIST.length,
      totalFacilities: SMART_FACILITIES_REGISTRY.length,
      totalMedicines: memMedicines.length,
    },
  };
}

export function getHistoricalMedicineConsumption(facilityId?: number, district?: string) {
  let list = [...memConsumptionHistory];
  if (facilityId) list = list.filter((h) => h.facilityId === facilityId);
  if (district) list = list.filter((h) => h.district.toLowerCase() === district.toLowerCase());
  return list;
}

// Initialize memory store on startup
initMemoryStore();

export async function upsertUser(user: Record<string, any>): Promise<any> {
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      await supabaseDb.upsertUser(user);
    } catch (sbErr) {
      console.warn("[Database] Supabase upsertUser warning:", sbErr);
    }
  }
  
  // In-memory update or insert
  const existingIdx = memUsers.findIndex(u => u.openId === user.openId);
  const existing = existingIdx >= 0 ? memUsers[existingIdx] : null;
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const isAdminEmail = adminEmail && ((user.email?.toLowerCase() === adminEmail) || (existing?.email?.toLowerCase() === adminEmail));
  
  let targetRole = user.role ?? existing?.role;
  if (isAdminEmail || targetRole === "admin") {
    targetRole = "administrator";
  } else if (!targetRole) {
    targetRole = existing ? existing.role : "citizen";
  }

  let targetStatus = user.status ?? existing?.status;
  if (isAdminEmail || targetRole === "citizen") {
    targetStatus = targetStatus || "APPROVED";
  } else if (!targetStatus) {
    targetStatus = existing ? existing.status : "PENDING";
  }

  const now = new Date();
  let targetUserId = existing ? existing.id : memUsers.length + 1;
  const resolvedName = user.name !== undefined && user.name !== null ? user.name : (existing ? existing.name : null);

  const cleanUserRecord = {
    id: targetUserId,
    openId: user.openId,
    authId: user.authId || user.openId,
    name: resolvedName,
    email: user.email !== undefined ? user.email : (existing?.email ?? null),
    loginMethod: user.loginMethod !== undefined ? user.loginMethod : (existing?.loginMethod ?? "supabase"),
    role: targetRole,
    status: targetStatus,
    phone: user.phone !== undefined ? user.phone : (existing?.phone ?? null),
    dateOfBirth: user.dateOfBirth !== undefined ? user.dateOfBirth : (existing?.dateOfBirth ?? null),
    age: user.age !== undefined ? user.age : (existing?.age ?? null),
    gender: user.gender !== undefined ? user.gender : (existing?.gender ?? null),
    village: user.village !== undefined ? user.village : (existing?.village ?? null),
    district: user.district !== undefined ? user.district : (existing?.district ?? null),
    facilityId: user.facilityId !== undefined ? user.facilityId : (existing?.facilityId ?? null),
    facilityName: user.facilityName !== undefined ? user.facilityName : (existing?.facilityName ?? null),
    designation: user.designation !== undefined ? user.designation : (existing?.designation ?? null),
    employeeId: user.employeeId !== undefined ? user.employeeId : (existing?.employeeId ?? null),
    registrationNumber: user.registrationNumber !== undefined ? user.registrationNumber : (existing?.registrationNumber ?? null),
    assignedVillage: user.assignedVillage !== undefined ? user.assignedVillage : (existing?.assignedVillage ?? null),
    emergencyContactName: user.emergencyContactName !== undefined ? user.emergencyContactName : (existing?.emergencyContactName ?? null),
    emergencyContactPhone: user.emergencyContactPhone !== undefined ? user.emergencyContactPhone : (existing?.emergencyContactPhone ?? null),
    bloodGroup: user.bloodGroup !== undefined ? user.bloodGroup : (existing?.bloodGroup ?? null),
    allergies: user.allergies !== undefined ? user.allergies : (existing?.allergies ?? null),
    conditions: user.conditions !== undefined ? user.conditions : (existing?.conditions ?? null),
    address: user.address !== undefined ? user.address : (existing?.address ?? null),
    pincode: user.pincode !== undefined ? user.pincode : (existing?.pincode ?? null),
    abhaId: user.abhaId !== undefined ? user.abhaId : (existing?.abhaId ?? null),
    avatarUrl: user.avatarUrl !== undefined ? user.avatarUrl : (existing?.avatarUrl ?? null),
    approvalRequestedAt: user.approvalRequestedAt !== undefined ? user.approvalRequestedAt : (existing?.approvalRequestedAt ?? (targetStatus === "PENDING" ? now : null)),
    approvedAt: user.approvedAt !== undefined ? user.approvedAt : (existing?.approvedAt ?? (targetStatus === "APPROVED" ? now : null)),
    approvedBy: user.approvedBy !== undefined ? user.approvedBy : (existing?.approvedBy ?? null),
    rejectionReason: user.rejectionReason !== undefined ? user.rejectionReason : (existing?.rejectionReason ?? null),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSignedIn: user.lastSignedIn ?? now,
  };

  if (existingIdx >= 0) {
    memUsers[existingIdx] = cleanUserRecord;
  } else {
    memUsers.push(cleanUserRecord);
  }

  // Auto-sync or create patient record for citizen users
  if (targetRole === "citizen" && resolvedName) {
    const existingPatientIdx = memPatients.findIndex(p => p.userId === targetUserId || p.name.toLowerCase() === resolvedName.toLowerCase());
    if (existingPatientIdx >= 0) {
      memPatients[existingPatientIdx].name = resolvedName;
      memPatients[existingPatientIdx].userId = targetUserId;
      if (cleanUserRecord.phone) memPatients[existingPatientIdx].contact = cleanUserRecord.phone;
      if (cleanUserRecord.village) memPatients[existingPatientIdx].village = cleanUserRecord.village;
      if (cleanUserRecord.district) memPatients[existingPatientIdx].district = cleanUserRecord.district;
      if (cleanUserRecord.age != null) memPatients[existingPatientIdx].age = Number(cleanUserRecord.age);
      if (cleanUserRecord.gender) memPatients[existingPatientIdx].gender = cleanUserRecord.gender;
      if (cleanUserRecord.emergencyContactPhone || cleanUserRecord.emergencyContactName) {
        memPatients[existingPatientIdx].emergencyContact = cleanUserRecord.emergencyContactPhone || cleanUserRecord.emergencyContactName;
      }
      if (cleanUserRecord.bloodGroup) memPatients[existingPatientIdx].bloodGroup = cleanUserRecord.bloodGroup;
      if (cleanUserRecord.allergies) memPatients[existingPatientIdx].allergies = cleanUserRecord.allergies;
      if (cleanUserRecord.conditions) memPatients[existingPatientIdx].conditions = cleanUserRecord.conditions;
      memPatients[existingPatientIdx].updatedAt = now;
    } else {
      memPatients.unshift({
        id: memPatients.length + 1,
        userId: targetUserId,
        householdId: 1,
        name: resolvedName,
        age: Number(cleanUserRecord.age) || 38,
        gender: (cleanUserRecord.gender as any) || "female",
        contact: cleanUserRecord.phone || "+91 98221 44011",
        village: cleanUserRecord.village || "Sundarpur",
        district: cleanUserRecord.district || "Ahmedabad Rural",
        emergencyContact: cleanUserRecord.emergencyContactPhone || cleanUserRecord.emergencyContactName || cleanUserRecord.phone || "+91 98221 00000",
        bloodGroup: cleanUserRecord.bloodGroup || "B+",
        allergies: cleanUserRecord.allergies || "None known",
        conditions: cleanUserRecord.conditions || "Hypertension Stage 1",
        riskScore: 68,
        riskCategory: "moderate",
        riskFactors: JSON.stringify(["Elevated BP (158/96)", "Irregular medication timing"]),
        abhaId: cleanUserRecord.abhaId || `91-8201-${String(targetUserId).padStart(4, "0")}`,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const db = await getDb();
  if (db) {
    const values: InsertUser = { openId: cleanUserRecord.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod", "district", "phone", "dateOfBirth", "gender", "village", "facilityName", "designation", "employeeId", "registrationNumber", "assignedVillage", "emergencyContactName", "emergencyContactPhone", "bloodGroup", "allergies", "conditions", "address", "pincode", "abhaId", "avatarUrl", "approvedBy", "rejectionReason"] as const;
    for (const field of textFields) {
      if ((cleanUserRecord as any)[field] !== undefined) {
        (values as any)[field] = (cleanUserRecord as any)[field] ?? null;
        updateSet[field] = (cleanUserRecord as any)[field] ?? null;
      }
    }
    if (cleanUserRecord.age !== undefined) {
      values.age = cleanUserRecord.age != null ? Number(cleanUserRecord.age) : null;
      updateSet.age = cleanUserRecord.age != null ? Number(cleanUserRecord.age) : null;
    }
    if (cleanUserRecord.lastSignedIn !== undefined) { values.lastSignedIn = cleanUserRecord.lastSignedIn; updateSet.lastSignedIn = cleanUserRecord.lastSignedIn; }
    values.role = targetRole as any; updateSet.role = targetRole as any;
    values.status = targetStatus as any; updateSet.status = targetStatus as any;
    if (cleanUserRecord.facilityId !== undefined) { values.facilityId = cleanUserRecord.facilityId ?? null; updateSet.facilityId = cleanUserRecord.facilityId ?? null; }
    values.lastSignedIn ??= now;
    updateSet.lastSignedIn ??= now;
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  }

  return cleanUserRecord;
}

export async function updateUserRole(userId: number, role: "citizen" | "asha" | "cho" | "asha_cho" | "doctor" | "facility_staff" | "administrator" | "admin") {
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      await supabaseDb.updateUserRole(userId, role);
    } catch (err) {
      console.warn("[Database] Supabase updateUserRole warning:", err);
    }
  }
  const user = memUsers.find(u => u.id === userId);
  if (user) {
    user.role = role;
    user.updatedAt = new Date();
  }
  const db = await getDb();
  if (db) {
    await db.update(users).set({ role: role as any, updatedAt: new Date() }).where(eq(users.id, userId));
  }
}

export async function getUserByOpenId(openId: string, preloadedMeta?: any) {
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      const user = await supabaseDb.getUserByOpenId(openId, preloadedMeta);
      if (user) return user;
    } catch (err) {
      console.warn("[Database] Supabase getUserByOpenId warning:", err);
    }
  }
  const demoUser = memUsers.find(u => u.openId === openId || u.authId === openId);
  if (demoUser) return demoUser;

  const db = await getDb();
  if (db) {
    try {
      const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      if (result[0]) return result[0];
    } catch { /* fallback */ }
  }
  return undefined;
}

export async function getUserById(id: number) {
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      const user = await supabaseDb.getUserById(id);
      if (user) return user;
    } catch (err) {
      console.warn("[Database] Supabase getUserById warning:", err);
    }
  }
  const memUser = memUsers.find(u => u.id === id);
  if (memUser) return memUser;
  const db = await getDb();
  if (db) {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (result[0]) return result[0];
    } catch { /* fallback */ }
  }
  return undefined;
}

export async function listUsers(filter?: { role?: string; status?: string; district?: string; facilityId?: number; search?: string }) {
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      const usersList = await supabaseDb.listUsers(filter);
      if (usersList && usersList.length > 0) return usersList;
    } catch (err) {
      console.warn("[Database] Supabase listUsers warning:", err);
    }
  }
  let result = [...memUsers];
  if (filter?.role && filter.role !== "all") {
    result = result.filter(u => u.role === filter.role || (filter.role === "admin" && (u.role === "admin" || u.role === "administrator")));
  }
  if (filter?.status && filter.status !== "all") {
    result = result.filter(u => u.status === filter.status?.toUpperCase());
  }
  if (filter?.district && filter.district !== "all") {
    result = result.filter(u => u.district === filter.district);
  }
  if (filter?.facilityId) {
    result = result.filter(u => u.facilityId === filter.facilityId);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    result = result.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.employeeId?.toLowerCase().includes(q) ||
      u.registrationNumber?.toLowerCase().includes(q)
    );
  }
  return result;
}

export async function approveStaffUser(adminIdentifier: string, userId: number) {
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      await supabaseDb.approveStaffUser(adminIdentifier, userId);
    } catch (err) {
      console.warn("[Database] Supabase approveStaffUser warning:", err);
    }
  }
  const user = memUsers.find(u => u.id === userId);
  if (user) {
    user.status = "APPROVED";
    user.approvedAt = new Date();
    user.approvedBy = adminIdentifier;
    user.rejectionReason = null;
    user.updatedAt = new Date();
  }
}

export async function rejectStaffUser(adminIdentifier: string, userId: number, reason: string) {
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      await supabaseDb.rejectStaffUser(adminIdentifier, userId, reason);
    } catch (err) {
      console.warn("[Database] Supabase rejectStaffUser warning:", err);
    }
  }
  const user = memUsers.find(u => u.id === userId);
  if (user) {
    user.status = "REJECTED";
    user.rejectionReason = reason;
    user.approvedBy = adminIdentifier;
    user.updatedAt = new Date();
  }
}

export async function suspendStaffUser(adminIdentifier: string, userId: number) {
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      await supabaseDb.suspendStaffUser(adminIdentifier, userId);
    } catch (err) {
      console.warn("[Database] Supabase suspendStaffUser warning:", err);
    }
  }
  const user = memUsers.find(u => u.id === userId);
  if (user) {
    user.status = "SUSPENDED";
    user.updatedAt = new Date();
  }
}

export async function reactivateStaffUser(adminIdentifier: string, userId: number) {
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      await supabaseDb.reactivateStaffUser(adminIdentifier, userId);
    } catch (err) {
      console.warn("[Database] Supabase reactivateStaffUser warning:", err);
    }
  }
  const user = memUsers.find(u => u.id === userId);
  if (user) {
    user.status = "APPROVED";
    user.updatedAt = new Date();
  }
}

export async function updateUserProfile(userId: number, editableFields: Record<string, unknown>) {
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      const updated = await supabaseDb.updateUserProfile(userId, editableFields);
      if (updated) {
        const mem = memUsers.find(u => u.id === userId || u.openId === updated.openId);
        if (mem) {
          Object.assign(mem, updated, { updatedAt: new Date() });
        }
        return updated;
      }
    } catch (err) {
      console.warn("[Database] Supabase updateUserProfile failed, continuing with local store:", err);
    }
  }
  let user = memUsers.find(u => u.id === userId);
  if (!user) {
    user = {
      id: userId,
      openId: `user-${userId}`,
      authId: `user-${userId}`,
      name: "Care Member",
      email: null,
      loginMethod: "local",
      role: "citizen",
      status: "APPROVED",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    memUsers.push(user);
  }
  
  const forbidden = ["role", "status", "approvedBy", "approvedAt", "rejectionReason", "employeeId", "registrationNumber", "facilityId", "openId", "authId", "id"];
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(editableFields)) {
    if (!forbidden.includes(key)) {
      user[key] = value;
      updateData[key] = value;
    }
  }
  user.updatedAt = new Date();
  updateData.updatedAt = new Date();

  // Sync to MySQL users table if connected
  const db = await getDb();
  if (db) {
    try {
      await db.update(users).set(updateData as any).where(eq(users.id, userId));
    } catch (err) {
      console.warn("[Database] MySQL profile update skipped:", err);
    }
  }

  // Also sync to patient record for citizens
  const patientIdx = memPatients.findIndex(p => p.userId === userId || (user.name && p.name.toLowerCase() === user.name.toLowerCase()));
  if (patientIdx >= 0) {
    if (editableFields.name !== undefined) memPatients[patientIdx].name = editableFields.name;
    if (editableFields.age !== undefined) memPatients[patientIdx].age = Number(editableFields.age) || memPatients[patientIdx].age;
    if (editableFields.gender !== undefined) memPatients[patientIdx].gender = editableFields.gender;
    if (editableFields.phone !== undefined) memPatients[patientIdx].contact = editableFields.phone;
    if (editableFields.village !== undefined) memPatients[patientIdx].village = editableFields.village;
    if (editableFields.district !== undefined) memPatients[patientIdx].district = editableFields.district;
    if (editableFields.emergencyContactPhone !== undefined || editableFields.emergencyContactName !== undefined) {
      memPatients[patientIdx].emergencyContact = (editableFields.emergencyContactPhone as string) || (editableFields.emergencyContactName as string);
    }
    if (editableFields.bloodGroup !== undefined) memPatients[patientIdx].bloodGroup = editableFields.bloodGroup;
    if (editableFields.allergies !== undefined) memPatients[patientIdx].allergies = editableFields.allergies;
    if (editableFields.conditions !== undefined) memPatients[patientIdx].conditions = editableFields.conditions;
    if (editableFields.abhaId !== undefined) memPatients[patientIdx].abhaId = editableFields.abhaId;
    if (editableFields.address !== undefined) memPatients[patientIdx].address = editableFields.address;
    if (editableFields.pincode !== undefined) memPatients[patientIdx].pincode = editableFields.pincode;
    memPatients[patientIdx].userId = userId;
    memPatients[patientIdx].updatedAt = new Date();

    if (db) {
      try {
        const patientUpdate: Record<string, unknown> = { updatedAt: new Date() };
        if (editableFields.name !== undefined) patientUpdate.name = editableFields.name;
        if (editableFields.age !== undefined) patientUpdate.age = Number(editableFields.age);
        if (editableFields.gender !== undefined) patientUpdate.gender = editableFields.gender;
        if (editableFields.phone !== undefined) patientUpdate.contact = editableFields.phone;
        if (editableFields.village !== undefined) patientUpdate.village = editableFields.village;
        if (editableFields.district !== undefined) patientUpdate.district = editableFields.district;
        if (editableFields.emergencyContactPhone !== undefined || editableFields.emergencyContactName !== undefined) {
          patientUpdate.emergencyContact = editableFields.emergencyContactPhone || editableFields.emergencyContactName;
        }
        if (editableFields.bloodGroup !== undefined) patientUpdate.bloodGroup = editableFields.bloodGroup;
        if (editableFields.allergies !== undefined) patientUpdate.allergies = editableFields.allergies;
        if (editableFields.conditions !== undefined) patientUpdate.conditions = editableFields.conditions;
        if (editableFields.abhaId !== undefined) patientUpdate.abhaId = editableFields.abhaId;
        await db.update(patients).set(patientUpdate as any).where(eq(patients.userId, userId));
      } catch (pErr) {
        console.warn("[Database] MySQL patient profile sync skipped:", pErr);
      }
    }
  } else if (user.role === "citizen" && user.name) {
    const newPatient = {
      id: memPatients.length + 1,
      userId,
      householdId: 1,
      name: user.name,
      age: Number(user.age) || 30,
      gender: user.gender || "female",
      contact: user.phone || "+91 98221 00000",
      village: user.village || "Sundarpur",
      district: user.district || "Ahmedabad Rural",
      emergencyContact: user.emergencyContactPhone || user.emergencyContactName || user.phone || "+91 98221 00000",
      bloodGroup: user.bloodGroup || "B+",
      allergies: user.allergies || "None",
      conditions: user.conditions || "None",
      riskScore: 0,
      riskCategory: "low",
      abhaId: user.abhaId || `91-8201-${String(userId).padStart(4, "0")}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memPatients.unshift(newPatient);

    if (db) {
      try {
        await db.insert(patients).values(newPatient as any);
      } catch (pErr) {
        console.warn("[Database] MySQL patient record insert skipped:", pErr);
      }
    }
  }

  return user;
}

export async function getPatients(limit = 50) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.getPatients(limit);
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select().from(patients).orderBy(desc(patients.updatedAt)).limit(limit);
      if (rows.length) return rows;
    } catch { /* fallback to memory store */ }
  }
  return [...memPatients].slice(0, limit);
}

export async function getPatientsForUser(userId: number, role: string, limit = 50) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.getPatientsForUser(userId, role, limit);
  const db = await getDb();
  if (db) {
    try {
      if (["asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"].includes(role)) {
        const rows = await db.select().from(patients).orderBy(desc(patients.updatedAt)).limit(limit);
        if (rows.length) return rows;
      } else {
        const rows = await db.select().from(patients).where(eq(patients.userId, userId)).orderBy(desc(patients.updatedAt)).limit(limit);
        if (rows.length) return rows;
      }
    } catch { /* fallback to memory store */ }
  }
  if (["asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"].includes(role)) {
    return [...memPatients].slice(0, limit);
  }
  const userPatients = memPatients.filter(p => p.userId === userId);
  return userPatients;
}

export const HEALTH_WORKERS = [
  { id: 2, name: "Sunita More", role: "asha", roleTitle: "ASHA Worker", village: "Karanji Budruk", contact: "+91 98221 14455" },
  { id: 4, name: "Rahul Jadhav", role: "cho", roleTitle: "Community Health Officer (CHO)", village: "Karanji Budruk", contact: "+91 98221 14456" },
  { id: 3, name: "Dr. Amit Deshmukh", role: "doctor", roleTitle: "Medical Officer (MBBS)", village: "Nimbayat", contact: "+91 98221 14457" },
  { id: 5, name: "Pooja Gaikwad", role: "asha", roleTitle: "ASHA Worker", village: "Sonwadi", contact: "+91 98221 14458" },
  { id: 6, name: "Sachin Kulkarni", role: "cho", roleTitle: "Community Health Officer (CHO)", village: "Waghoda", contact: "+91 98221 14459" },
];

export function getHealthWorkers() {
  return HEALTH_WORKERS;
}

export async function markOverdueFollowUps() {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.markOverdueFollowUps();
  const db = await getDb();
  if (db) {
    try {
      const overdue = await db.select().from(followUps).where(
        and(
          inArray(followUps.status, ["open", "OPEN", "DUE_SOON"]),
          lt(followUps.dueAt, new Date())
        )
      );
      if (overdue.length) {
        await db.update(followUps).set({ status: "OVERDUE" }).where(inArray(followUps.id, overdue.map(item => item.id)));
      }
    } catch { /* fallback */ }
  }

  const now = new Date();
  let count = 0;
  for (const f of memFollowUps) {
    const s = (f.status || "").toUpperCase();
    if (s === "COMPLETED" || s === "CANCELLED") continue;

    const dueDate = new Date(f.dueAt);
    if (dueDate < now) {
      if (s !== "OVERDUE") {
        f.status = "OVERDUE";
        count++;
        const p = memPatients.find(item => item.id === f.patientId);
        const pName = p ? p.name : `Patient #${f.patientId}`;
        const reason = f.reason || f.title || "Follow-up";

        // Alert assigned worker
        createAlert({
          userId: f.assignedTo,
          patientId: f.patientId,
          referralId: f.referralId || null,
          kind: "follow_up",
          title: `Overdue Follow-up: ${pName}`,
          message: `Home follow-up for ${reason} was due on ${dueDate.toLocaleDateString()}. OVERDUE: Immediate visit required.`,
        }).catch(() => {});

        // Alert doctor / care team
        createAlert({
          userId: 1,
          patientId: f.patientId,
          referralId: f.referralId || null,
          kind: "follow_up",
          title: `Overdue Alert: ${pName}`,
          message: `Home follow-up for ${reason} is OVERDUE (due ${dueDate.toLocaleDateString()}).`,
        }).catch(() => {});

        createAuditEvent({
          actorId: null,
          action: "follow_up.marked_overdue",
          entityType: "followUp",
          entityId: f.id,
          detail: `Follow-up #${f.id} for ${pName} (${reason}) automatically flagged as OVERDUE.`,
        }).catch(() => {});
      } else {
        count++;
      }
    } else if (dueDate.getTime() - now.getTime() <= 48 * 3600 * 1000) {
      if (s === "OPEN" || s === "open") {
        f.status = "DUE_SOON";
        const p = memPatients.find(item => item.id === f.patientId);
        const pName = p ? p.name : `Patient #${f.patientId}`;
        const reason = f.reason || f.title || "Follow-up";

        createAlert({
          userId: f.assignedTo,
          patientId: f.patientId,
          referralId: f.referralId || null,
          kind: "follow_up",
          title: `Follow-up Due Soon: ${pName}`,
          message: `Home follow-up for ${reason} is due within 48 hours (${dueDate.toLocaleDateString()}).`,
        }).catch(() => {});

        createAuditEvent({
          actorId: null,
          action: "follow_up.marked_due_soon",
          entityType: "followUp",
          entityId: f.id,
          detail: `Follow-up #${f.id} for ${pName} (${reason}) automatically flagged as DUE_SOON.`,
        }).catch(() => {});
      }
    }
  }
  return count;
}

export async function detectOverdueFollowUps() {
  await markOverdueFollowUps();
  const now = new Date();
  const overdue = memFollowUps.filter(f => {
    const s = (f.status || "").toUpperCase();
    return s === "OVERDUE" || (s !== "COMPLETED" && s !== "CANCELLED" && new Date(f.dueAt) < now);
  }).length;
  const dueSoon = memFollowUps.filter(f => {
    const s = (f.status || "").toUpperCase();
    return s === "DUE_SOON" || ((s === "OPEN" || s === "open") && new Date(f.dueAt) >= now && new Date(f.dueAt).getTime() - now.getTime() <= 48 * 3600 * 1000);
  }).length;
  return { overdue, dueSoon, overdueCount: overdue, dueSoonCount: dueSoon };
}

export async function getHouseholds() {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.getHouseholds();
  const db = await getDb();
  let list = [...memHouseholds];
  if (db) {
    try {
      const rows = await db.select().from(households).orderBy(desc(households.createdAt));
      if (rows.length) list = rows;
    } catch { /* fallback */ }
  }
  const allPatients = await getPatients(200);
  return list.map(h => ({
    ...h,
    members: allPatients.filter(p => p.householdId === h.id),
  }));
}

export async function getHouseholdById(id: number) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.getHouseholdById(id);
  const db = await getDb();
  let h = memHouseholds.find(item => item.id === id);
  if (db) {
    try {
      const result = await db.select().from(households).where(eq(households.id, id)).limit(1);
      if (result[0]) h = result[0];
    } catch { /* fallback */ }
  }
  if (!h) return undefined;
  const allPatients = await getPatients(200);
  return {
    ...h,
    members: allPatients.filter(p => p.householdId === id),
  };
}

export async function createHousehold(input: typeof households.$inferInsert) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.createHousehold(input);
  const db = await getDb();
  if (db) {
    try {
      const result = await db.insert(households).values(input);
      return Number(result[0].insertId);
    } catch { /* fallback */ }
  }
  const id = memHouseholds.length + 1;
  const newHousehold = { id, ...input, createdAt: new Date() };
  memHouseholds.unshift(newHousehold);
  return id;
}

export async function getPatientById(id: number) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.getPatientById(id);
  const db = await getDb();
  if (db) {
    try {
      const patient = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
      if (patient[0]) return patient[0];
    } catch { /* fallback */ }
  }
  return memPatients.find(p => p.id === id);
}

export async function getPatientProfile(patientId: number) {
  const patient = await getPatientById(patientId);
  if (!patient) return null;

  const timeline = await getPatientTimeline(patientId);
  const prescriptionsList = await getPrescriptions(patientId);
  const household = patient.householdId ? await getHouseholdById(patient.householdId) : null;
  const familyMembers = patient.householdId
    ? memPatients.filter(p => p.householdId === patient.householdId && p.id !== patientId)
    : [];

  const latestVisit = timeline.visits[0];
  const latestVitals = latestVisit ? {
    bpSystolic: latestVisit.bpSystolic,
    bpDiastolic: latestVisit.bpDiastolic,
    pulse: (latestVisit as any).pulse ?? null,
    glucose: latestVisit.glucose,
    spo2: latestVisit.spo2,
    weight: latestVisit.weight,
    height: (latestVisit as any).height ?? null,
    bmi: (latestVisit as any).bmi ?? null,
    temperature: latestVisit.temperature,
    pregnancyStatus: (latestVisit as any).pregnancyStatus ?? null,
    existingConditions: (latestVisit as any).existingConditions ?? null,
    triageLevel: latestVisit.triageLevel,
    riskScore: (latestVisit as any).riskScore ?? null,
    riskCategory: (latestVisit as any).riskCategory ?? null,
    recommendedAction: (latestVisit as any).recommendedAction ?? null,
    lastCheckedAt: latestVisit.createdAt,
  } : null;

  return {
    patient,
    household,
    familyMembers,
    visits: timeline.visits,
    consultations: timeline.consultations,
    referrals: timeline.referrals,
    prescriptions: prescriptionsList,
    followUps: timeline.followUps,
    latestVitals,
  };
}

export async function getPatientTimeline(patientId: number) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.getPatientTimeline(patientId);
  const db = await getDb();
  if (db) {
    try {
      const [visits, patientConsultations, patientReferrals, patientFollowUps] = await Promise.all([
        db.select().from(healthVisits).where(eq(healthVisits.patientId, patientId)).orderBy(desc(healthVisits.createdAt)),
        db.select().from(consultations).where(eq(consultations.patientId, patientId)).orderBy(desc(consultations.createdAt)),
        db.select().from(referrals).where(eq(referrals.patientId, patientId)).orderBy(desc(referrals.createdAt)),
        db.select().from(followUps).where(eq(followUps.patientId, patientId)).orderBy(desc(followUps.dueAt)),
      ]);
      return { visits, consultations: patientConsultations, referrals: patientReferrals, followUps: patientFollowUps };
    } catch { /* fallback */ }
  }
  const visits = memVisits.filter(v => v.patientId === patientId);
  const patientConsultations = memConsultations.filter(c => c.patientId === patientId);
  const patientReferrals = memReferrals.filter(r => r.patientId === patientId);
  const patientFollowUps = memFollowUps.filter(f => f.patientId === patientId);
  return { visits, consultations: patientConsultations, referrals: patientReferrals, followUps: patientFollowUps };
}

export async function getFacilities(district?: string) {
  initMemoryStore();
  let list: any[] = [];
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      list = await supabaseDb.getFacilities(district);
    } catch { /* fallback */ }
  }
  if (!list || list.length === 0) {
    const db = await getDb();
    if (db) {
      try {
        const rows = district
          ? await db.select().from(facilities).where(eq(facilities.district, district)).orderBy(facilities.name)
          : await db.select().from(facilities).orderBy(facilities.name);
        if (rows && rows.length) list = rows;
      } catch { /* fallback */ }
    }
  }
  if (!list || list.length === 0) {
    list = district
      ? memFacilities.filter(f => f.district?.toLowerCase() === district.toLowerCase() || (f.district && district.toLowerCase().includes(f.district.toLowerCase())))
      : [...memFacilities];
    // If district filter produced no rows, fallback to all available facilities
    if (list.length === 0) {
      list = [...memFacilities];
    }
  }
  return list.map((r) => {
    const meta = SMART_FACILITIES_REGISTRY.find((m) => m.id === r.id || m.name.toLowerCase() === r.name.toLowerCase());
    return {
      ...r,
      latitude: r.latitude ? Number(r.latitude) : meta?.latitude,
      longitude: r.longitude ? Number(r.longitude) : meta?.longitude,
      specialties: meta?.specialties || (r as any).specialties || [],
      emergencyCapability: meta?.emergencyCapability || (r as any).emergencyCapability,
      doctorAvailability: meta?.doctorAvailability || (r as any).doctorAvailability || [],
      appointmentAvailability: meta?.appointmentAvailability || (r as any).appointmentAvailability,
      telemetry: meta?.telemetry,
    };
  });
}

export function computeMedicineStatus(med: {
  currentStock: number;
  reorderLevel: number;
  expiryDate?: Date | string | null;
}): "IN STOCK" | "LOW STOCK" | "OUT OF STOCK" | "EXPIRING SOON" {
  if (Number(med.currentStock) <= 0) return "OUT OF STOCK";
  if (Number(med.currentStock) <= Number(med.reorderLevel)) return "LOW STOCK";
  if (med.expiryDate) {
    const expTime = new Date(med.expiryDate).getTime();
    const ninetyDays = Date.now() + 90 * 86400000;
    if (expTime <= ninetyDays) return "EXPIRING SOON";
  }
  return "IN STOCK";
}

export function enrichMedicineData(m: any) {
  const status = computeMedicineStatus(m);
  const expDate = m.expiryDate ? new Date(m.expiryDate) : null;
  const daysUntilExpiry = expDate ? Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  return {
    ...m,
    status,
    daysUntilExpiry,
    isLowStock: Number(m.currentStock) <= Number(m.reorderLevel) && Number(m.currentStock) > 0,
    isOutOfStock: Number(m.currentStock) <= 0,
    isExpiringSoon: daysUntilExpiry !== null && daysUntilExpiry <= 90,
    recommendedOrderQuantity: Math.max(0, Number(m.reorderLevel) * 3 - Number(m.currentStock)),
  };
}

export async function getInventory(facilityId?: number) {
  let list: any[] = [];
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      list = await supabaseDb.getInventory(facilityId);
    } catch { /* fallback */ }
  }
  if (!list.length) {
    const db = await getDb();
    if (db) {
      try {
        const rows = facilityId
          ? await db.select().from(medicines).where(eq(medicines.facilityId, facilityId)).orderBy(medicines.name)
          : await db.select().from(medicines).orderBy(medicines.name);
        if (rows.length) list = rows;
      } catch { /* fallback */ }
    }
  }
  if (!list.length) {
    list = facilityId ? memMedicines.filter(m => m.facilityId === facilityId) : [...memMedicines];
  }
  return list.map(enrichMedicineData);
}

export async function getAlerts(userId?: number) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.getAlerts(userId);
  const db = await getDb();
  if (db) {
    try {
      const where = userId ? eq(alerts.userId, userId) : undefined;
      const rows = await db.select().from(alerts).where(where).orderBy(desc(alerts.createdAt)).limit(30);
      if (rows.length) return rows;
    } catch { /* fallback */ }
  }
  return [...memAlerts];
}

export async function getDashboardMetrics(district?: string) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.getDashboardMetrics(district);
  const districtPatients = district ? memPatients.filter(p => p.district === district) : memPatients;
  const facilityRows = district ? memFacilities.filter(f => f.district === district) : memFacilities;
  return {
    patients: districtPatients.length,
    highRisk: districtPatients.filter(p => p.riskCategory === "high" || p.riskCategory === "critical").length,
    referrals: memReferrals.filter(r => r.status !== "completed" && r.status !== "cancelled").length,
    openFollowUps: memFollowUps.filter(f => {
      const s = (f.status || "").toUpperCase();
      return s === "OPEN" || s === "DUE_SOON" || s === "open";
    }).length,
    overdueFollowUps: memFollowUps.filter(f => {
      const s = (f.status || "").toUpperCase();
      return s === "OVERDUE" || s === "overdue" || (s !== "COMPLETED" && s !== "CANCELLED" && new Date(f.dueAt) < new Date());
    }).length,
    lowStock: memMedicines.filter(m => m.currentStock <= m.reorderLevel).length,
    facilities: facilityRows.length,
  };
}

export async function createAlert(input: typeof alerts.$inferInsert) {
  const id = memAlerts.length + 1;
  memAlerts.unshift({ id, ...input, createdAt: new Date() });
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      await supabaseDb.createAlert(input as any);
    } catch (err) {
      console.warn("[Database] Supabase createAlert warning:", err);
    }
  }
  const db = await getDb();
  if (db) {
    try {
      await db.insert(alerts).values(input);
    } catch { /* non-fatal */ }
  }
  return id;
}

export async function createAuditEvent(input: typeof auditEvents.$inferInsert) {
  const id = memAudit.length + 1;
  memAudit.unshift({ id, ...input, createdAt: new Date() });
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      await supabaseDb.createAuditEvent(input as any);
    } catch (err) {
      console.warn("[Database] Supabase createAuditEvent warning:", err);
    }
  }
  const db = await getDb();
  if (db) {
    try {
      await db.insert(auditEvents).values(input);
    } catch { /* non-fatal */ }
  }
}

export function getAuditEvents() {
  return [...memAudit];
}

export async function createPatient(input: typeof patients.$inferInsert) {
  // Duplicate prevention: check if patient with same name and village and (contact or age) already exists
  const normName = input.name.trim().toLowerCase();
  const normVillage = (input.village || "").trim().toLowerCase();
  const existing = memPatients.find(p => {
    const pName = p.name.trim().toLowerCase();
    const pVillage = (p.village || "").trim().toLowerCase();
    if (pName === normName && pVillage === normVillage) {
      if (input.contact && p.contact && input.contact === p.contact) return true;
      if (input.age && p.age && Math.abs(input.age - p.age) <= 1) return true;
    }
    return false;
  });

  if (existing) {
    throw new Error(`A patient record for "${input.name}" in village "${input.village}" already exists (ID: #${existing.id}). Duplicate registration prevented.`);
  }

  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      return await supabaseDb.createPatient(input);
    } catch { /* fallback to memory store */ }
  }

  const id = memPatients.length + 1;
  const newPatient = {
    id,
    ...input,
    riskScore: input.riskScore ?? 0,
    riskCategory: input.riskCategory ?? "low",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memPatients.unshift(newPatient);
  return id;
}

export async function updatePatient(id: number, input: Partial<typeof patients.$inferInsert>) {
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      await supabaseDb.updatePatient(id, input);
    } catch { /* fallback */ }
  }

  const db = await getDb();
  if (db) {
    try {
      await db.update(patients).set({ ...input, updatedAt: new Date() }).where(eq(patients.id, id));
    } catch { /* fallback */ }
  }

  const p = memPatients.find(item => item.id === id);
  if (p) {
    Object.assign(p, input, { updatedAt: new Date() });
  }
  return { success: true };
}

export async function createVisit(input: typeof healthVisits.$inferInsert) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.createVisit(input);
  const id = memVisits.length + 1;
  const newVisit = { id, ...input, createdAt: new Date() };
  memVisits.unshift(newVisit as any);

  const patient = memPatients.find(p => p.id === input.patientId);
  if (patient) {
    if (input.riskScore != null) {
      patient.riskScore = input.riskScore;
    }
    if (input.riskCategory) {
      const cat = input.riskCategory;
      patient.riskCategory = (cat === "emergency" || cat === "critical") ? "critical"
        : (cat === "high_risk" || cat === "high") ? "high"
        : (cat === "attention" || cat === "moderate") ? "moderate"
        : "low";
    }
    patient.updatedAt = new Date();
  }
  return id;
}

export async function getVisits(patientId?: number) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.getVisits(patientId);
  const db = await getDb();
  if (db) {
    try {
      const rows = patientId
        ? await db.select().from(healthVisits).where(eq(healthVisits.patientId, patientId)).orderBy(desc(healthVisits.createdAt))
        : await db.select().from(healthVisits).orderBy(desc(healthVisits.createdAt));
      if (rows.length) return rows;
    } catch { /* fallback */ }
  }
  return patientId ? memVisits.filter(v => v.patientId === patientId) : [...memVisits];
}

export async function addReferralEvent(input: {
  referralId: number;
  status: string;
  actorId?: number;
  actorRole?: string;
  actorName?: string;
  notes?: string;
  transportVehicle?: string;
  transportDriverContact?: string;
}) {
  const id = memReferralEvents.length + 1;
  const event = {
    id,
    ...input,
    createdAt: new Date(),
  };
  memReferralEvents.push(event);
  return id;
}

export async function getReferralTimeline(referralId: number) {
  return memReferralEvents
    .filter((e) => e.referralId === referralId)
    .sort((a, b) => Number(new Date(a.createdAt)) - Number(new Date(b.createdAt)));
}

export async function createReferral(
  input: typeof referrals.$inferInsert & { actorRole?: string; actorName?: string }
) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.createReferral(input);
  const id = memReferrals.length + 1;
  const canonicalStatus = (input.status ? input.status.toUpperCase() : "PENDING");
  const newReferral = {
    id,
    ...input,
    status: canonicalStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memReferrals.unshift(newReferral);

  // Log initial timeline event
  await addReferralEvent({
    referralId: id,
    status: canonicalStatus,
    actorId: input.createdBy,
    actorRole: input.actorRole || "doctor",
    actorName: input.actorName || "Clinical Team",
    notes: input.reason ? `Referral initiated: ${input.reason}` : "Referral initiated",
  });

  return id;
}

export async function getReferralById(id: number) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.getReferralById(id);
  const referral = memReferrals.find((r) => r.id === id);
  if (!referral) return undefined;
  const timeline = await getReferralTimeline(id);
  return { ...referral, timeline };
}

export async function updateReferral(id: number, values: Partial<typeof referrals.$inferInsert>) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.updateReferral(id, values);
  const referral = memReferrals.find((r) => r.id === id);
  if (referral) {
    Object.assign(referral, values, { updatedAt: new Date() });
  }
}

export async function updateReferralLifecycleStatus(
  id: number,
  data: {
    status: string;
    actorId?: number;
    actorRole?: string;
    actorName?: string;
    notes?: string;
    transportVehicle?: string;
    transportDriverContact?: string;
    outcome?: string;
    cancellationReason?: string;
  }
) {
  const referral = memReferrals.find((r) => r.id === id);
  if (!referral) throw new Error(`Referral #${id} not found`);

  const canonicalStatus = data.status.toUpperCase();
  referral.status = canonicalStatus;
  referral.updatedAt = new Date();

  if (data.outcome) referral.outcome = data.outcome;
  if (data.cancellationReason) referral.cancellationReason = data.cancellationReason;
  if (data.transportVehicle) referral.transportVehicle = data.transportVehicle;
  if (data.transportDriverContact) referral.transportDriverContact = data.transportDriverContact;

  // Set transition timestamps
  if (canonicalStatus === "ACCEPTED" && !referral.acceptedAt) referral.acceptedAt = new Date();
  if (canonicalStatus === "TRANSPORT_ASSIGNED") {
    referral.transportAssignedAt = new Date();
  }
  if (canonicalStatus === "DEPARTED") referral.departedAt = new Date();
  if (canonicalStatus === "ARRIVED") referral.arrivedAt = new Date();
  if (canonicalStatus === "CONSULTED") referral.consultedAt = new Date();
  if (canonicalStatus === "COMPLETED") referral.completedAt = new Date();
  if (canonicalStatus === "CANCELLED") referral.cancelledAt = new Date();

  // Log timeline event
  await addReferralEvent({
    referralId: id,
    status: canonicalStatus,
    actorId: data.actorId,
    actorRole: data.actorRole,
    actorName: data.actorName,
    notes: data.notes,
    transportVehicle: data.transportVehicle,
    transportDriverContact: data.transportDriverContact,
  });

  return referral;
}

export async function getReferralsWithTimeline() {
  return memReferrals.map((r) => {
    const timeline = memReferralEvents
      .filter((e) => e.referralId === r.id)
      .sort((a, b) => Number(new Date(a.createdAt)) - Number(new Date(b.createdAt)));
    return { ...r, events: timeline, timeline };
  });
}

export async function getReferrals(patientId?: number) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.getReferrals(patientId);
  const db = await getDb();
  if (db) {
    try {
      const rows = patientId
        ? await db.select().from(referrals).where(eq(referrals.patientId, patientId)).orderBy(desc(referrals.createdAt))
        : await db.select().from(referrals).orderBy(desc(referrals.createdAt));
      if (rows.length) return rows;
    } catch { /* fallback */ }
  }
  return patientId ? memReferrals.filter(r => r.patientId === patientId) : [...memReferrals];
}

export async function createFollowUp(input: {
  patientId: number;
  assignedTo?: number;
  dueAt: Date | string;
  title?: string;
  reason?: string;
  referralId?: number | null;
  notes?: string | null;
  status?: any;
}) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.createFollowUp(input as any);
  const id = memFollowUps.length + 1;
  const title = input.title || input.reason || "Scheduled Follow-up";
  const reason = input.reason || input.title || "Routine Follow-up";
  const assignedTo = input.assignedTo ?? 2;
  const dueAtDate = new Date(input.dueAt);
  const now = new Date();

  let calculatedStatus = input.status;
  if (!calculatedStatus) {
    if (dueAtDate < now) calculatedStatus = "OVERDUE";
    else if (dueAtDate.getTime() - now.getTime() <= 48 * 3600 * 1000) calculatedStatus = "DUE_SOON";
    else calculatedStatus = "OPEN";
  }

  const newFollowUp = {
    id,
    patientId: input.patientId,
    assignedTo,
    referralId: input.referralId || null,
    title,
    reason,
    dueAt: dueAtDate,
    status: calculatedStatus,
    notes: input.notes || null,
    completedAt: null,
    completedBy: null,
    completionNotes: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date(),
  };

  memFollowUps.unshift(newFollowUp);

  const patient = memPatients.find(p => p.id === input.patientId);
  const pName = patient ? patient.name : `Patient #${input.patientId}`;
  const dueFormatted = dueAtDate.toLocaleDateString();

  // Notification for assigned worker
  createAlert({
    userId: assignedTo,
    patientId: input.patientId,
    referralId: input.referralId || null,
    kind: "follow_up",
    title: calculatedStatus === "OVERDUE" ? `Overdue Follow-up: ${pName}` : `New Follow-up Assigned: ${pName}`,
    message: calculatedStatus === "OVERDUE" 
      ? `Home follow-up for ${reason} was due on ${dueFormatted}. OVERDUE: Immediate visit required.`
      : `Doctor assigned follow-up for "${reason}" due on ${dueFormatted}. ${input.notes ? "Notes: " + input.notes : ""}`.trim(),
  }).catch(() => {});

  // Notification for patient
  createAlert({
    userId: patient?.userId || null,
    patientId: input.patientId,
    referralId: input.referralId || null,
    kind: "follow_up",
    title: `Upcoming Follow-up Scheduled`,
    message: `A health worker home follow-up for "${reason}" has been scheduled for ${dueFormatted}.`,
  }).catch(() => {});

  // Audit event for follow_up.scheduled
  createAuditEvent({
    actorId: (input as any).actorId ?? null,
    action: "follow_up.scheduled",
    entityType: "followUp",
    entityId: id,
    detail: `Follow-up #${id} scheduled for ${pName} (${reason}) due on ${dueFormatted}. Assigned to worker #${assignedTo}.`,
  }).catch(() => {});

  return id;
}

export async function getFollowUpById(id: number) {
  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.getFollowUpById(id);
  const f = memFollowUps.find(item => item.id === id);
  if (!f) return undefined;
  const patient = memPatients.find(p => p.id === f.patientId);
  const worker = HEALTH_WORKERS.find(w => w.id === f.assignedTo) || {
    id: f.assignedTo,
    name: `Health Worker #${f.assignedTo}`,
    role: "asha",
    roleTitle: "ASHA Worker",
    village: patient?.village || "Sundarpur",
    contact: "+91 98 2211 4455",
  };
  const completedByWorker = f.completedBy ? HEALTH_WORKERS.find(w => w.id === f.completedBy) : null;
  const ref = f.referralId ? memReferrals.find(r => r.id === f.referralId) : null;
  const targetFacility = ref ? memFacilities.find(fac => fac.id === ref.targetFacilityId) : null;

  return {
    ...f,
    reason: f.reason || f.title,
    title: f.title || f.reason,
    status: (f.status || "OPEN").toUpperCase(),
    patientName: patient?.name || `Patient #${f.patientId}`,
    patientAge: patient?.age,
    patientGender: patient?.gender,
    village: patient?.village || "Sundarpur",
    patientContact: patient?.contact,
    emergencyContact: patient?.emergencyContact,
    workerName: worker.name,
    workerRole: worker.roleTitle || worker.role,
    workerContact: worker.contact,
    completedByName: completedByWorker?.name || (f.completedBy ? `Staff #${f.completedBy}` : null),
    vitals: (f as any).vitals || null,
    referral: ref ? {
      id: ref.id,
      targetFacilityName: targetFacility?.name || "District Hospital",
      specialty: ref.specialty || "General Medicine",
      urgency: ref.urgency,
      reason: ref.reason,
    } : null,
  };
}

export async function completeFollowUp(
  input: number | {
    id: number;
    completedBy?: number;
    completionNotes?: string;
    vitals?: {
      bpSystolic?: number;
      bpDiastolic?: number;
      glucose?: number;
      spo2?: number;
      temperature?: string;
    };
  }
) {
  const followUpId = typeof input === "number" ? input : input.id;
  const completedBy = typeof input === "number" ? 2 : (input.completedBy ?? 2);
  const completionNotes = typeof input === "number" ? "Follow-up completed by health worker." : (input.completionNotes || "Follow-up completed by health worker.");

  if (supabaseDb.isSupabaseDataConfigured()) return supabaseDb.completeFollowUp(followUpId);

  const followUp = memFollowUps.find(f => f.id === followUpId);
  if (followUp) {
    followUp.status = "COMPLETED";
    followUp.completedAt = new Date();
    followUp.completedBy = completedBy;
    followUp.completionNotes = completionNotes;
    if (typeof input === "object" && input.vitals) {
      (followUp as any).vitals = input.vitals;
    }

    const patient = memPatients.find(p => p.id === followUp.patientId);
    const worker = HEALTH_WORKERS.find(w => w.id === completedBy) || { name: `Worker #${completedBy}` };
    const pName = patient ? patient.name : `Patient #${followUp.patientId}`;

    createAlert({
      userId: 1, // Primary PHC Doctor
      patientId: followUp.patientId,
      referralId: followUp.referralId || null,
      kind: "follow_up",
      title: `Follow-up Completed: ${pName}`,
      message: `${worker.name} completed follow-up for "${followUp.reason || followUp.title}". Outcome: ${completionNotes}`,
    }).catch(() => {});

    createAuditEvent({
      actorId: completedBy,
      action: "follow_up.completed",
      entityType: "followUp",
      entityId: followUpId,
      detail: `Follow-up #${followUpId} completed by ${worker.name} for ${pName}. Notes: ${completionNotes}`,
    }).catch(() => {});
  }
  return followUp;
}

export async function cancelFollowUp(id: number, cancellationReason: string, actorId?: number) {
  const followUp = memFollowUps.find(f => f.id === id);
  if (followUp) {
    followUp.status = "CANCELLED";
    followUp.cancelledAt = new Date();
    followUp.cancellationReason = cancellationReason || "Cancelled by doctor";

    const patient = memPatients.find(p => p.id === followUp.patientId);
    const pName = patient ? patient.name : `Patient #${followUp.patientId}`;

    createAlert({
      userId: followUp.assignedTo,
      patientId: followUp.patientId,
      referralId: followUp.referralId || null,
      kind: "follow_up",
      title: `Follow-up Cancelled: ${pName}`,
      message: `Follow-up for "${followUp.reason || followUp.title}" was cancelled. Reason: ${cancellationReason}`,
    }).catch(() => {});

    createAuditEvent({
      actorId: actorId || null,
      action: "follow_up.cancelled",
      entityType: "followUp",
      entityId: id,
      detail: `Follow-up #${id} for ${pName} cancelled: ${cancellationReason}`,
    }).catch(() => {});
  }
  return followUp;
}

export async function getFollowUps(filter?: {
  patientId?: number;
  assignedTo?: number;
  status?: string;
}) {
  await markOverdueFollowUps();
  let list = [...memFollowUps];

  if (filter?.patientId) {
    list = list.filter(f => f.patientId === filter.patientId);
  }
  if (filter?.assignedTo) {
    list = list.filter(f => f.assignedTo === filter.assignedTo);
  }
  if (filter?.status && filter.status !== "ALL") {
    const target = filter.status.toUpperCase();
    list = list.filter(f => (f.status || "").toUpperCase() === target);
  }

  return list.map(f => {
    const patient = memPatients.find(p => p.id === f.patientId);
    const worker = HEALTH_WORKERS.find(w => w.id === f.assignedTo) || {
      id: f.assignedTo,
      name: `Health Worker #${f.assignedTo}`,
      role: "asha",
      roleTitle: "ASHA Worker",
      village: patient?.village || "Sundarpur",
      contact: "+91 98 2211 4455",
    };
    const completedByWorker = f.completedBy ? HEALTH_WORKERS.find(w => w.id === f.completedBy) : null;
    const ref = f.referralId ? memReferrals.find(r => r.id === f.referralId) : null;
    const targetFacility = ref ? memFacilities.find(fac => fac.id === ref.targetFacilityId) : null;

    return {
      ...f,
      reason: f.reason || f.title,
      title: f.title || f.reason,
      status: (f.status || "OPEN").toUpperCase(),
      patientName: patient?.name || `Patient #${f.patientId}`,
      patientAge: patient?.age,
      patientGender: patient?.gender,
      village: patient?.village || "Sundarpur",
      patientContact: patient?.contact,
      emergencyContact: patient?.emergencyContact,
      workerName: worker.name,
      workerRole: worker.roleTitle || worker.role,
      workerContact: worker.contact,
      completedByName: completedByWorker?.name || (f.completedBy ? `Staff #${f.completedBy}` : null),
      vitals: (f as any).vitals || null,
      referral: ref ? {
        id: ref.id,
        targetFacilityName: targetFacility?.name || "District Hospital",
        specialty: ref.specialty || "General Medicine",
        urgency: ref.urgency,
        reason: ref.reason,
      } : null,
    };
  }).sort((a, b) => Number(new Date(a.dueAt)) - Number(new Date(b.dueAt)));
}

export async function checkAndCreateLowStockAlert(medicine: {
  id: number;
  name: string;
  currentStock: number;
  reorderLevel: number;
  unit?: string;
  facilityId: number;
}) {
  if (Number(medicine.currentStock) <= Number(medicine.reorderLevel)) {
    const isOut = Number(medicine.currentStock) <= 0;
    const existingAlert = memAlerts.find(
      (a) =>
        a.kind === "low_stock" &&
        !a.readAt &&
        a.message.toLowerCase().includes(medicine.name.toLowerCase())
    );
    if (!existingAlert) {
      const alertId = memAlerts.length + 1;
      memAlerts.unshift({
        id: alertId,
        userId: 1,
        patientId: null,
        referralId: null,
        kind: "low_stock",
        title: isOut ? `Critical: ${medicine.name} Out of Stock` : `Low Stock Alert: ${medicine.name}`,
        message: `${medicine.name} is ${isOut ? "OUT OF STOCK (0 remaining)" : `below buffer threshold (${medicine.currentStock} ${medicine.unit || "units"} remaining, reorder level: ${medicine.reorderLevel})`} at Facility #${medicine.facilityId}.`,
        readAt: null,
        createdAt: new Date(),
      });
    }
  }
}

export async function getMedicineById(id: number) {
  const med = memMedicines.find((m) => m.id === id);
  if (!med) return undefined;
  const enriched = enrichMedicineData(med);
  const transactions = await getMedicineTransactions({ medicineId: id });
  return { ...enriched, transactions };
}

export async function addMedicine(input: {
  facilityId: number;
  name: string;
  category?: string;
  currentStock: number;
  reorderLevel?: number;
  unit?: string;
  batchNumber?: string;
  expiryDate?: Date | string;
  actorId?: number;
  actorRole?: string;
  actorName?: string;
  notes?: string;
}) {
  const id = memMedicines.length + 1;
  const newMed = {
    id,
    facilityId: input.facilityId,
    name: input.name,
    category: input.category || "General",
    currentStock: Number(input.currentStock),
    reorderLevel: input.reorderLevel !== undefined ? Number(input.reorderLevel) : 10,
    unit: input.unit || "packs",
    batchNumber: input.batchNumber || `BATCH-${Date.now().toString().slice(-6)}`,
    expiryDate: input.expiryDate ? new Date(input.expiryDate) : new Date(Date.now() + 365 * 86400000),
    updatedAt: new Date(),
  };
  memMedicines.unshift(newMed);

  const txId = memMedicineTransactions.length + 1;
  const tx = {
    id: txId,
    medicineId: id,
    medicineName: newMed.name,
    facilityId: newMed.facilityId,
    transactionType: "INITIAL_STOCK",
    quantity: newMed.currentStock,
    previousStock: 0,
    newStock: newMed.currentStock,
    actorId: input.actorId,
    actorRole: input.actorRole || "facility_staff",
    actorName: input.actorName || "Pharmacy Staff",
    batchNumber: newMed.batchNumber,
    notes: input.notes || "New medicine added to facility formulary",
    createdAt: new Date(),
  };
  memMedicineTransactions.unshift(tx);

  await checkAndCreateLowStockAlert(newMed);

  await createAuditEvent({
    actorId: input.actorId || 1,
    action: "inventory.medicine_added",
    entityType: "medicine",
    entityId: id,
    detail: `Added new medicine "${newMed.name}" (${newMed.category}, ${newMed.currentStock} ${newMed.unit}, Batch: ${newMed.batchNumber}) to Facility #${newMed.facilityId}`,
  });

  return { id, medicine: enrichMedicineData(newMed), transaction: tx };
}

export async function updateMedicine(id: number, currentStock: number) {
  return updateMedicineStock(id, currentStock);
}

export async function updateMedicineStock(
  id: number,
  currentStock: number,
  details?: {
    reason?: string;
    actorId?: number;
    actorRole?: string;
    actorName?: string;
  }
) {
  if (supabaseDb.isSupabaseDataConfigured()) {
    try {
      await supabaseDb.updateMedicine(id, currentStock);
    } catch { /* fallback */ }
  }

  const med = memMedicines.find((m) => m.id === id);
  if (!med) throw new Error(`Medicine #${id} not found`);

  const previousStock = Number(med.currentStock);
  med.currentStock = Number(currentStock);
  med.updatedAt = new Date();

  const diff = Number(currentStock) - previousStock;
  const txId = memMedicineTransactions.length + 1;
  const tx = {
    id: txId,
    medicineId: med.id,
    medicineName: med.name,
    facilityId: med.facilityId,
    transactionType: "STOCK_ADJUSTMENT",
    quantity: diff,
    previousStock,
    newStock: Number(currentStock),
    actorId: details?.actorId,
    actorRole: details?.actorRole || "facility_staff",
    actorName: details?.actorName || "Pharmacy Staff",
    batchNumber: med.batchNumber,
    notes: details?.reason || `Stock count adjusted: ${previousStock} → ${currentStock}`,
    createdAt: new Date(),
  };
  memMedicineTransactions.unshift(tx);

  await checkAndCreateLowStockAlert(med);

  await createAuditEvent({
    actorId: details?.actorId || 1,
    action: "inventory.stock_adjusted",
    entityType: "medicine",
    entityId: med.id,
    detail: `Stock adjusted for ${med.name}: ${previousStock} → ${currentStock} ${med.unit}. Reason: ${details?.reason || "Physical count reconciliation"}`,
  });

  return { success: true, medicine: enrichMedicineData(med), transaction: tx };
}

export async function receiveMedicineStock(
  id: number,
  quantity: number,
  details?: {
    batchNumber?: string;
    expiryDate?: Date | string;
    notes?: string;
    actorId?: number;
    actorRole?: string;
    actorName?: string;
  }
) {
  const med = memMedicines.find((m) => m.id === id);
  if (!med) throw new Error(`Medicine #${id} not found`);

  const qty = Number(quantity);
  if (qty <= 0) {
    throw new Error("Received quantity must be greater than 0");
  }

  const previousStock = Number(med.currentStock);
  const newStock = previousStock + qty;
  med.currentStock = newStock;
  if (details?.batchNumber) med.batchNumber = details.batchNumber;
  if (details?.expiryDate) med.expiryDate = new Date(details.expiryDate);
  med.updatedAt = new Date();

  const txId = memMedicineTransactions.length + 1;
  const tx = {
    id: txId,
    medicineId: med.id,
    medicineName: med.name,
    facilityId: med.facilityId,
    transactionType: "STOCK_RECEIVED",
    quantity: +qty,
    previousStock,
    newStock,
    actorId: details?.actorId,
    actorRole: details?.actorRole || "facility_staff",
    actorName: details?.actorName || "Pharmacy Staff",
    batchNumber: details?.batchNumber || med.batchNumber,
    notes: details?.notes || `Received shipment quota +${qty} ${med.unit}`,
    createdAt: new Date(),
  };
  memMedicineTransactions.unshift(tx);

  await createAuditEvent({
    actorId: details?.actorId || 1,
    action: "inventory.stock_received",
    entityType: "medicine",
    entityId: med.id,
    detail: `Received ${qty} ${med.unit} of ${med.name} (Batch: ${details?.batchNumber || med.batchNumber || "N/A"}). Stock: ${previousStock} → ${newStock}`,
  });

  return { success: true, medicine: enrichMedicineData(med), transaction: tx };
}

export async function dispenseMedicine(input: {
  medicineId: number;
  quantity: number;
  patientId?: number;
  prescriptionId?: number;
  notes?: string;
  actorId?: number;
  actorRole?: string;
  actorName?: string;
}) {
  const med = memMedicines.find((m) => m.id === input.medicineId);
  if (!med) throw new Error(`Medicine #${input.medicineId} not found`);

  const qty = Number(input.quantity);
  if (qty <= 0) {
    throw new Error("Dispense quantity must be greater than 0");
  }

  if (Number(med.currentStock) < qty) {
    throw new Error(
      `Insufficient inventory for "${med.name}". Available stock: ${med.currentStock} ${med.unit}, Requested: ${qty} ${med.unit}`
    );
  }

  const previousStock = Number(med.currentStock);
  const newStock = previousStock - qty;
  med.currentStock = newStock;
  med.updatedAt = new Date();

  // If prescriptionId provided, mark prescription as dispensed
  if (input.prescriptionId) {
    const rx = memPrescriptions.find((p) => p.id === input.prescriptionId);
    if (rx) {
      rx.status = "dispensed";
      rx.dispensedAt = new Date();
      if (input.actorId) rx.dispensedBy = input.actorId;
    }
  }

  const txId = memMedicineTransactions.length + 1;
  const tx = {
    id: txId,
    medicineId: med.id,
    medicineName: med.name,
    facilityId: med.facilityId,
    transactionType: "DISPENSED",
    quantity: -qty,
    previousStock,
    newStock,
    actorId: input.actorId,
    actorRole: input.actorRole || "facility_staff",
    actorName: input.actorName || "Pharmacy Staff",
    patientId: input.patientId,
    prescriptionId: input.prescriptionId,
    batchNumber: med.batchNumber,
    notes: input.notes || `Dispensed ${qty} ${med.unit} to patient`,
    createdAt: new Date(),
  };
  memMedicineTransactions.unshift(tx);

  await checkAndCreateLowStockAlert(med);

  await createAuditEvent({
    actorId: input.actorId || 1,
    action: "inventory.dispensed",
    entityType: "medicine",
    entityId: med.id,
    detail: `Dispensed ${qty} ${med.unit} of ${med.name} (Batch: ${med.batchNumber || "N/A"}). Stock: ${previousStock} → ${newStock}.${input.patientId ? ` Patient #${input.patientId}` : ""}`,
  });

  return { success: true, medicine: enrichMedicineData(med), transaction: tx };
}

export async function setMedicineReorderThreshold(
  id: number,
  reorderLevel: number,
  actor?: {
    actorId?: number;
    actorRole?: string;
    actorName?: string;
  }
) {
  const med = memMedicines.find((m) => m.id === id);
  if (!med) throw new Error(`Medicine #${id} not found`);

  const prevLevel = med.reorderLevel;
  med.reorderLevel = Number(reorderLevel);
  med.updatedAt = new Date();

  await checkAndCreateLowStockAlert(med);

  await createAuditEvent({
    actorId: actor?.actorId || 1,
    action: "inventory.reorder_level_updated",
    entityType: "medicine",
    entityId: med.id,
    detail: `Reorder threshold for ${med.name} updated from ${prevLevel} to ${reorderLevel} ${med.unit}`,
  });

  return { success: true, medicine: enrichMedicineData(med) };
}

export async function getMedicineTransactions(filters?: {
  facilityId?: number;
  medicineId?: number;
  transactionType?: string;
  limit?: number;
}) {
  let list = [...memMedicineTransactions];
  if (filters?.facilityId) list = list.filter((t) => t.facilityId === filters.facilityId);
  if (filters?.medicineId) list = list.filter((t) => t.medicineId === filters.medicineId);
  if (filters?.transactionType && filters.transactionType !== "ALL") {
    list = list.filter((t) => t.transactionType === filters.transactionType);
  }
  const sorted = list.sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
  return filters?.limit ? sorted.slice(0, filters.limit) : sorted;
}

export async function getPrescriptions(patientId?: number) {
  if (patientId) return memPrescriptions.filter(p => p.patientId === patientId);
  return [...memPrescriptions];
}

export async function getPrescriptionById(id: number) {
  return memPrescriptions.find(p => p.id === id);
}

export async function createPrescription(input: typeof prescriptions.$inferInsert) {
  const id = memPrescriptions.length + 1;
  const newPrescription = {
    id,
    ...input,
    route: input.route ?? "Oral",
    status: input.status ?? "active",
    frequency: input.frequency ?? "1-0-1",
    duration: input.duration ?? "14 days",
    prescriptionGroupId: input.prescriptionGroupId ?? `RX-GRP-${Date.now()}-${id}`,
    startDate: input.startDate ?? new Date(),
    createdAt: new Date(),
  };
  memPrescriptions.unshift(newPrescription);
  return id;
}

export async function createPrescriptionsBatch(
  doctorId: number,
  facilityId: number,
  patientId: number,
  meds: Array<{
    medicineName: string;
    dosage: string;
    frequency?: string;
    duration?: string;
    route?: string;
    instructions?: string;
  }>,
  consultationId?: number
) {
  const groupId = `RX-GRP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const createdIds: number[] = [];

  for (const med of meds) {
    const id = await createPrescription({
      patientId,
      doctorId,
      facilityId,
      consultationId,
      prescriptionGroupId: groupId,
      medicineName: med.medicineName,
      dosage: med.dosage,
      frequency: med.frequency ?? "1-0-1",
      duration: med.duration ?? "14 days",
      route: med.route ?? "Oral",
      instructions: med.instructions,
      status: "active",
      startDate: new Date(),
    });
    createdIds.push(id);
  }

  return { groupId, createdIds };
}

export async function updatePrescription(
  id: number,
  status: "active" | "completed" | "discontinued" | "dispensed",
  dispensedBy?: number
) {
  const p = memPrescriptions.find(x => x.id === id);
  if (p) {
    p.status = status;
    if (status === "dispensed") {
      p.dispensedAt = new Date();
      if (dispensedBy) p.dispensedBy = dispensedBy;
    }
  }
  return { success: true };
}

export async function dispensePrescription(id: number, dispensedBy: number) {
  const p = memPrescriptions.find(x => x.id === id);
  if (!p) throw new Error("Prescription not found");
  p.status = "dispensed";
  p.dispensedAt = new Date();
  p.dispensedBy = dispensedBy;
  return { success: true, prescription: p };
}

export async function getAppointments(patientId?: number, doctorId?: number) {
  let list = [...memAppointments];
  if (patientId) list = list.filter(a => a.patientId === patientId);
  if (doctorId) list = list.filter(a => a.doctorId === doctorId);
  return list.sort((a, b) => Number(new Date(a.scheduledAt)) - Number(new Date(b.scheduledAt)));
}

export async function createAppointment(input: typeof appointments.$inferInsert) {
  const id = memAppointments.length + 1;
  const newAppt = {
    id,
    ...input,
    status: input.status ?? "scheduled",
    type: input.type ?? "general_opd",
    createdAt: new Date(),
  };
  memAppointments.unshift(newAppt);
  return id;
}

export async function updateAppointmentStatus(id: number, status: "scheduled" | "in_consultation" | "completed" | "cancelled") {
  const a = memAppointments.find(x => x.id === id);
  if (a) {
    a.status = status;
  }
  return { success: true };
}

export async function getCampaigns(district?: string) {
  if (district) return memCampaigns.filter(c => c.district === district);
  return [...memCampaigns];
}

export async function createCampaign(input: typeof campaigns.$inferInsert) {
  const id = memCampaigns.length + 1;
  const newCampaign = {
    id,
    ...input,
    screenedCount: input.screenedCount ?? 0,
    highRiskDetected: input.highRiskDetected ?? 0,
    status: input.status ?? "active",
    createdAt: new Date(),
  };
  memCampaigns.unshift(newCampaign);
  return id;
}

export async function recordCampaignScreening(campaignId: number, highRisk: boolean) {
  const c = memCampaigns.find(x => x.id === campaignId);
  if (c) {
    c.screenedCount += 1;
    if (highRisk) c.highRiskDetected += 1;
  }
  return { success: true };
}

export async function getRiskDistribution(district?: string) {
  const filteredPatients = district ? memPatients.filter(p => p.district === district) : memPatients;
  const distribution = {
    low: filteredPatients.filter(p => p.riskCategory === "low").length,
    moderate: filteredPatients.filter(p => p.riskCategory === "moderate").length,
    high: filteredPatients.filter(p => p.riskCategory === "high").length,
    critical: filteredPatients.filter(p => p.riskCategory === "critical").length,
  };
  const conditionsMap: Record<string, number> = {};
  filteredPatients.forEach(p => {
    if (p.conditions) {
      p.conditions.split(",").forEach((c: string) => {
        const trimmed = c.trim();
        if (trimmed) conditionsMap[trimmed] = (conditionsMap[trimmed] || 0) + 1;
      });
    }
  });
  return {
    total: filteredPatients.length,
    distribution,
    conditions: Object.entries(conditionsMap).map(([name, count]) => ({ name, count })),
  };
}

export async function getReferralAnalytics() {
  const total = memReferrals.length;
  const pending = memReferrals.filter(r => r.status === "pending").length;
  const accepted = memReferrals.filter(r => r.status === "accepted" || r.status === "in_progress").length;
  const completed = memReferrals.filter(r => r.status === "completed").length;
  const emergency = memReferrals.filter(r => r.urgency === "emergency").length;
  const urgent = memReferrals.filter(r => r.urgency === "urgent").length;
  const routine = memReferrals.filter(r => r.urgency === "routine").length;

  return {
    total,
    byStatus: { pending, accepted, completed },
    byUrgency: { emergency, urgent, routine },
    avgResolutionDays: 2.1,
    bottlenecks: [
      { route: "Karanji Budruk HWC → Nimbayat PHC", count: 3, avgDelay: "24 hrs", reason: "Transport coordination / Ghat road terrain" },
      { route: "Sonwadi SC → Dhanora RH", count: 2, avgDelay: "14 hrs", reason: "Specialist OPD consultation queue" },
    ],
  };
}

export async function getMedicineAnalytics(facilityId?: number) {
  const inventory = await getInventory(facilityId);
  const totalSKUs = inventory.length;
  const inStock = inventory.filter((m) => m.status === "IN STOCK");
  const lowStock = inventory.filter((m) => m.status === "LOW STOCK");
  const outOfStock = inventory.filter((m) => m.status === "OUT OF STOCK");
  const expiring = inventory.filter((m) => m.status === "EXPIRING SOON" || (m.daysUntilExpiry !== null && m.daysUntilExpiry <= 90));

  const reorderAlerts = inventory
    .filter((m) => m.currentStock <= m.reorderLevel)
    .map((item) => ({
      id: item.id,
      medicineName: item.name,
      category: item.category,
      currentStock: item.currentStock,
      reorderLevel: item.reorderLevel,
      unit: item.unit,
      recommendedOrder: Math.max(item.reorderLevel * 2, item.reorderLevel * 3 - item.currentStock),
      status: item.currentStock === 0 ? "out_of_stock" : "low_stock",
      urgency: item.currentStock === 0 ? "critical" : item.currentStock <= item.reorderLevel / 2 ? "high" : "medium",
    }));

  return {
    totalSKUs,
    inStockCount: inStock.length,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    expiringCount: expiring.length,
    inStockItems: inStock,
    lowStockItems: lowStock,
    outOfStockItems: outOfStock,
    expiringItems: expiring,
    reorderAlerts,
  };
}

export async function getVillageHealthMap() {
  const villages = [
    { name: "Karanji Budruk", district: "Nandurbar", population: 2150, screened: 1420, highRisk: 42, facilities: 1, activeAlerts: 3, status: "moderate" },
    { name: "Sonwadi", district: "Nandurbar", population: 1680, screened: 1120, highRisk: 38, facilities: 1, activeAlerts: 2, status: "high" },
    { name: "Nimbayat", district: "Nandurbar", population: 3800, screened: 2850, highRisk: 64, facilities: 1, activeAlerts: 1, status: "good" },
    { name: "Dhanora", district: "Nandurbar", population: 4200, screened: 3100, highRisk: 78, facilities: 1, activeAlerts: 4, status: "moderate" },
    { name: "Waghoda", district: "Dhule", population: 1950, screened: 1340, highRisk: 31, facilities: 1, activeAlerts: 1, status: "good" },
    { name: "Pimpri Khurd", district: "Dhule", population: 1420, screened: 980, highRisk: 28, facilities: 1, activeAlerts: 2, status: "good" },
    { name: "Bhavadi", district: "Dhule", population: 3400, screened: 2200, highRisk: 55, facilities: 1, activeAlerts: 2, status: "moderate" },
    { name: "Chincholi", district: "Solapur", population: 2200, screened: 1540, highRisk: 49, facilities: 1, activeAlerts: 3, status: "high" },
    { name: "Mhaswad", district: "Solapur", population: 4600, screened: 3400, highRisk: 82, facilities: 1, activeAlerts: 2, status: "moderate" },
  ];
  return villages;
}

export async function getAIInsights() {
  return [
    {
      id: "ai-1",
      category: "Outbreak Warning",
      title: "Clustering of Respiratory Symptoms in Sonwadi Block",
      description: "Anomalous 24% increase in productive cough and wheezing reported over 7 days in Sonwadi block among agricultural workers. Correlated with localized crop-residue seasonal burning.",
      recommendation: "Deploy mobile nebulization unit to Sonwadi Sub-Centre and restock Salbutamol inhalers.",
      severity: "high",
      date: new Date(),
    },
    {
      id: "ai-2",
      category: "Maternal Health Gap",
      title: "Anemia Screening Gap in Karanji Budruk 2nd Trimester Cohort",
      description: "4 registered antenatal mothers in Karanji Budruk have not logged second hemoglobin check in 45 days.",
      recommendation: "Assign priority home visit reminders to ASHA Sunita More for IFA compliance checks.",
      severity: "medium",
      date: new Date(),
    },
    {
      id: "ai-3",
      category: "Supply Chain Prediction",
      title: "Anticipated Stockout: Amlodipine 5mg at Nimbayat PHC",
      description: "Current consumption rate indicates Amlodipine 5mg stock will deplete in 8 days, 14 days ahead of scheduled district replenishment.",
      recommendation: "Auto-generate purchase requisition for 200 strips from Dhanora Rural Hospital buffer store.",
      severity: "critical",
      date: new Date(),
    },
  ];
}

export async function createConsultation(input: typeof consultations.$inferInsert) {
  const db = await getDb();
  if (db) {
    try {
      const result = await db.insert(consultations).values(input);
      return Number(result[0].insertId);
    } catch { /* fallback */ }
  }
  const id = memConsultations.length + 1;
  const newConsultation = { id, ...input, createdAt: new Date() };
  memConsultations.unshift(newConsultation);
  return id;
}

export async function getConsultationsForPatient(patientId: number) {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select().from(consultations).where(eq(consultations.patientId, patientId)).orderBy(desc(consultations.createdAt));
      if (rows.length) return rows;
    } catch { /* fallback */ }
  }
  return memConsultations.filter(c => c.patientId === patientId).sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
}

export async function getConsultationById(id: number) {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select().from(consultations).where(eq(consultations.id, id)).limit(1);
      if (rows[0]) return rows[0];
    } catch { /* fallback */ }
  }
  return memConsultations.find(c => c.id === id);
}

export async function seedDemoData() {
  initMemoryStore();
}

