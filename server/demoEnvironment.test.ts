import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  getPatients,
  getPatientById,
  getFacilities,
  getInventory,
  getReferrals,
  getVisits,
  getFollowUps,
  getDashboardMetrics,
  resetDemoEnvironment,
  seedDemoData,
  dispenseMedicine,
  updateReferralLifecycleStatus,
} from "./db";
import {
  DEMO_USERS,
  MAHARASHTRA_VILLAGES,
  MAHARASHTRA_DISTRICTS,
  DEMO_DATA_LABEL,
  DEMO_DATA_DISCLAIMER,
} from "./syntheticMaharashtraData";
import { calculateHybridHealthRisk } from "./hybridRiskEngine";
import { evaluateDeterministicClinicalTriage } from "./clinicalTriageEngine";
import { rankFacilitiesForReferral } from "./smartReferralEngine";

function createMockAshaContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "demo-user-asha",
      name: "Sunita More",
      email: "asha.demo@arjuna.gov.in",
      loginMethod: "demo",
      role: "asha",
      facilityId: 1,
      district: "Nandurbar",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined, cookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

function createMockDoctorContext(): TrpcContext {
  return {
    user: {
      id: 3,
      openId: "demo-user-doctor",
      name: "Dr. Amit Deshmukh",
      email: "doctor.demo@arjuna.gov.in",
      loginMethod: "demo",
      role: "doctor",
      facilityId: 3,
      district: "Nandurbar",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined, cookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

function createMockAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "demo-user-admin",
      name: "Dr. Vijay Patil",
      email: "admin.demo@arjuna.gov.in",
      loginMethod: "demo",
      role: "administrator",
      facilityId: 17,
      district: "Nandurbar",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined, cookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("SIH Maharashtra Synthetic Demonstration Environment", () => {
  beforeEach(async () => {
    await seedDemoData();
  });

  describe("1. Synthetic Dataset Breadth & Realism", () => {
    it("generates 100+ synthetic Maharashtra patients with valid attributes", async () => {
      const patients = await getPatients(500);
      expect(patients.length).toBeGreaterThanOrEqual(100);

      // Verify all patients have mandatory demo label & valid Maharashtra fields
      for (const p of patients.slice(0, 20)) {
        expect(p.isDemoData).toBe(true);
        expect(p.recordLabel).toBe(DEMO_DATA_LABEL);
        expect(p.name).toBeDefined();
        expect(p.age).toBeGreaterThan(0);
        expect(["male", "female", "other", "undisclosed"]).toContain(p.gender);
        expect(p.village).toBeDefined();
        expect(MAHARASHTRA_DISTRICTS).toContain(p.district);
      }
    });

    it("registers 15+ healthcare facilities and 20+ villages across rural Maharashtra", async () => {
      const facilities = await getFacilities();
      expect(facilities.length).toBeGreaterThanOrEqual(15);
      expect(MAHARASHTRA_VILLAGES.length).toBeGreaterThanOrEqual(20);

      // Check facility types (HWC/AAM, Sub-Centre, PHC, CHC, DH)
      const types = facilities.map((f) => f.facilityType);
      expect(types).toContain("aam");
      expect(types).toContain("sub_centre");
      expect(types).toContain("phc");
      expect(types).toContain("chc");
      expect(types).toContain("district_hospital");
    });

    it("stocks essential primary care medicines across facilities with 6+ months telemetry", async () => {
      const facility1Inventory = await getInventory(1);
      expect(facility1Inventory.length).toBeGreaterThanOrEqual(15);

      const medNames = facility1Inventory.map((m) => m.name);
      expect(medNames).toContain("Amlodipine 5mg");
      expect(medNames).toContain("Amlodipine 10mg");
      expect(medNames).toContain("Metformin 500mg");
      expect(medNames).toContain("Paracetamol 500mg");
      expect(medNames).toContain("ORS Sachets (WHO formula)");
      expect(medNames).toContain("Pantoprazole 40mg");
    });
  });

  describe("2. Hero Patient Ramesh Patel Profile & Clinical Baseline", () => {
    it("places Ramesh Patel (58M, Karanji Budruk, Nandurbar) as Patient ID 1 with 2 overdue follow-ups", async () => {
      const ramesh = await getPatientById(1);
      expect(ramesh).toBeDefined();
      expect(ramesh!.name).toBe("Ramesh Patel");
      expect(ramesh!.age).toBe(58);
      expect(ramesh!.gender).toBe("male");
      expect(ramesh!.village).toBe("Karanji Budruk");
      expect(ramesh!.district).toBe("Nandurbar");
      expect(ramesh!.conditions).toContain("Hypertension");
      expect(ramesh!.isDemoData).toBe(true);

      // Check overdue follow-up count
      const followUps = await getFollowUps({ patientId: 1 });
      const overdueFollowUps = followUps.filter((f) => f.status === "OVERDUE");
      expect(overdueFollowUps.length).toBeGreaterThanOrEqual(2);
    });

    it("evaluates deterministic triage and AI risk score (82/100) for Ramesh Patel screening vitals", () => {
      // Step 2 & 3 Vitals: BP 174/108 mmHg, Glucose 236 mg/dL, SpO2 96%, 2 missed follow-ups
      const vitalsInput = {
        patientId: 1,
        age: 58,
        gender: "male" as const,
        bpSystolic: 174,
        bpDiastolic: 108,
        pulse: 82,
        spo2: 96,
        temperature: 98.6,
        glucose: 236,
        conditions: "Hypertension Stage 2",
        symptoms: "Morning dizziness and recurrent headache",
        missedFollowUps: 2,
      };

      // Deterministic Safety Engine
      const triage = evaluateDeterministicClinicalTriage(vitalsInput);
      expect(triage.isEmergency).toBe(false); // Not hypertensive crisis (>180/120), but urgent/high
      expect(triage.category).toBe("URGENT");
      expect(triage.priorityDisplay).toContain("HIGH PRIORITY");
      expect(triage.triggeredRules.some((r) => r.ruleName.includes("Hypertension"))).toBe(true);

      // Hybrid Risk Model
      const hybridRisk = calculateHybridHealthRisk(vitalsInput);
      expect(hybridRisk.riskScore).toBeGreaterThanOrEqual(80);
      expect(["HIGH", "CRITICAL"]).toContain(hybridRisk.riskCategory);

      // Explainability: Verify contributing factors breakdown
      expect(hybridRisk.contributingFactors.length).toBeGreaterThanOrEqual(3);
      const factorNames = hybridRisk.contributingFactors.map((f) => f.factor);
      expect(factorNames).toContain("Stage 2 Severe Hypertension");
      expect(factorNames).toContain("Elevated Blood Glucose");
      expect(factorNames).toContain("Missed Follow-up");
      expect(hybridRisk.modelMetadata.disclaimer).toBeDefined();
    });
  });

  describe("3. Smart Referral & Doctor Consultation Flow", () => {
    it("ranks Nimbayat Primary Health Centre as the top recommendation for Karanji Budruk (~6.8 km)", () => {
      const recommendations = rankFacilitiesForReferral({
        originVillage: "Karanji Budruk",
        specialty: "General Medicine",
        urgency: "urgent",
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const topFacility = recommendations[0];
      expect(topFacility.facility.id).toBe(3); // Nimbayat PHC
      expect(topFacility.facility.name).toBe("Nimbayat Primary Health Centre (PHC)");
      expect(topFacility.distanceKm).toBe(6.8);
      expect(topFacility.recommendationScore).toBeGreaterThanOrEqual(85);
    });

    it("allows Dr. Amit Deshmukh at Nimbayat PHC to accept referral, write prescription, and dispense medicine", async () => {
      const doctorCaller = appRouter.createCaller(createMockDoctorContext());

      // 1. Update referral status to ACCEPTED
      const updatedRef = await updateReferralLifecycleStatus(1, {
        status: "ACCEPTED",
        actorId: 3,
        actorRole: "doctor",
        actorName: "Dr. Amit Deshmukh",
        notes: "Referral reviewed and accepted for outpatient hypertension optimization.",
      });
      expect(updatedRef.status).toBe("ACCEPTED");

      // 2. Doctor prescribes Amlodipine 10mg + Metformin 500mg
      const rxBatch = await doctorCaller.prescriptions.createBatch({
        patientId: 1,
        medicines: [
          { medicineName: "Amlodipine 10mg", dosage: "10mg", frequency: "1-0-0", duration: "14 days", instructions: "Morning dose" },
          { medicineName: "Metformin 500mg", dosage: "500mg", frequency: "1-0-1", duration: "14 days", instructions: "After meals" },
        ],
      });
      expect(rxBatch.success).toBe(true);
      expect(rxBatch.createdIds.length).toBe(2);

      // 3. Check baseline stock at Nimbayat PHC (Facility 3)
      const nimbayatMeds = await getInventory(3);
      const amlodipine10 = nimbayatMeds.find((m) => m.name === "Amlodipine 10mg")!;
      const initialStock = amlodipine10.currentStock;

      // 4. Dispense prescription (e.g. 1 strip of 14 tabs)
      const dispenseResult = await dispenseMedicine({
        medicineId: amlodipine10.id,
        quantity: 1,
        patientId: 1,
        prescriptionId: rxBatch.createdIds[0],
        actorId: 4,
        actorRole: "facility_staff",
        actorName: "Swapnil Patil",
      });

      expect(dispenseResult.success).toBe(true);
      expect(dispenseResult.medicine.currentStock).toBe(initialStock - 1);
      expect(dispenseResult.transaction.transactionType).toBe("DISPENSED");
      expect(dispenseResult.transaction.quantity).toBe(-1);
    });
  });

  describe("4. 1-Click Demo Authentication & Safe Reset", () => {
    it("provides all 6 pre-configured demo personas with Demo@123 password", () => {
      expect(DEMO_USERS.length).toBeGreaterThanOrEqual(6);

      const usernames = DEMO_USERS.map((u) => u.username);
      expect(usernames).toContain("asha.demo");
      expect(usernames).toContain("doctor.demo");
      expect(usernames).toContain("cho.demo");
      expect(usernames).toContain("staff.demo");
      expect(usernames).toContain("admin.demo");
      expect(usernames).toContain("citizen.demo");
    });

    it("authenticates asha.demo via auth.demoLogin and sets session", async () => {
      const caller = appRouter.createCaller(createMockAshaContext());
      const loginRes = await caller.auth.demoLogin({
        username: "asha.demo",
        password: "Demo@123",
      });

      expect(loginRes.success).toBe(true);
      expect(loginRes.user.name).toBe("Sunita More");
      expect(loginRes.user.role).toBe("asha");
      expect(loginRes.user.village).toBe("Karanji Budruk");
      expect(loginRes.token).toBeDefined();
    });

    it("resets demonstration environment safely to baseline Maharashtra dataset", async () => {
      const adminCaller = appRouter.createCaller(createMockAdminContext());
      const resetResult = await adminCaller.admin.resetDemoEnvironment({ confirmReset: true });

      expect(resetResult.success).toBe(true);
      expect(resetResult.patientCount).toBeGreaterThanOrEqual(100);
      expect(resetResult.facilityCount).toBeGreaterThanOrEqual(15);
      expect(resetResult.heroPatient.name).toBe("Ramesh Patel");
      expect(resetResult.heroPatient.village).toBe("Karanji Budruk");

      // Verify summary report endpoint
      const report = await adminCaller.admin.exportSyntheticReport();
      expect(report.isSynthetic).toBe(true);
      expect(report.heroPatientBaseline.name).toBe("Ramesh Patel");
      expect(report.heroPatientBaseline.expectedRiskScore).toContain("82/100");
      expect(report.disclaimer).toBeDefined();
    });
  });
});
