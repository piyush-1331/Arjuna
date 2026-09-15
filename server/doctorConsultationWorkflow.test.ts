import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  getConsultationById,
  getConsultationsForPatient,
  getPatientById,
  getPatientProfile,
  getPatientTimeline,
  getPrescriptions,
  getFollowUpById,
  seedDemoData,
} from "./db";

function createMockDoctorContext(userId = 5, facilityId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `doctor-user-${userId}`,
      name: "Dr. Sanjay Trivedi",
      email: "dr.sanjay@arjuna.gov.in",
      loginMethod: "test",
      role: "doctor",
      facilityId,
      district: "Ahmedabad Rural",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

function createMockCitizenContext(userId = 99): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `citizen-user-${userId}`,
      name: "Citizen User",
      email: "citizen@example.com",
      loginMethod: "test",
      role: "citizen",
      facilityId: null,
      district: "Ahmedabad Rural",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("Doctor Consultation Workflow", () => {
  it("fetches comprehensive 11-dimensional patient EHR context for doctor review", async () => {
    await seedDemoData();
    const caller = appRouter.createCaller(createMockDoctorContext(5));

    // Patient #1: Ramesh Patel
    const context = await caller.consultations.getPatientContext({ patientId: 1 });

    expect(context).toBeDefined();

    // 1. Patient demographics
    expect(context.patient.name).toBe("Ramesh Patel");
    expect(context.patient.age).toBe(58);
    expect(context.patient.gender).toBe("male");
    expect(context.patient.bloodGroup).toBe("B+");
    expect(context.patient.village).toBe("Karanji Budruk");

    // 2. Allergies
    expect(context.patient.allergies).toBe("Sulfa drugs");

    // 3. Existing conditions
    expect(context.patient.conditions).toContain("Hypertension");

    // 4. Previous visits
    expect(Array.isArray(context.visits)).toBe(true);
    expect(context.visits.length).toBeGreaterThan(0);

    // 5. Vitals
    expect(context.latestVitals).toBeDefined();
    expect(context.latestVitals?.bpSystolic).toBeDefined();
    expect(context.latestVitals?.bpDiastolic).toBeDefined();

    // 6. Symptoms (from visit record)
    expect(context.visits[0]?.symptoms).toBeDefined();

    // 7. Risk score & category
    expect(context.hybridRisk).toBeDefined();
    expect(context.hybridRisk.riskScore).toBeGreaterThanOrEqual(0);
    expect(context.hybridRisk.riskCategory).toBeDefined();

    // 8. Triage priority
    expect(context.deterministicTriage).toBeDefined();
    expect(context.deterministicTriage.category).toBeDefined();
    expect(context.deterministicTriage.priorityDisplay).toBeDefined();

    // 9. Referrals
    expect(Array.isArray(context.referrals)).toBe(true);

    // 10. Previous prescriptions
    expect(Array.isArray(context.prescriptions)).toBe(true);
    expect(context.prescriptions.length).toBeGreaterThan(0);

    // 11. Follow-ups
    expect(Array.isArray(context.followUps)).toBe(true);

    // Safety notice
    expect(context.safetyDisclaimer).toBeDefined();
    expect(context.safetyNotice).toMatch(/doctor/i);
  });

  it("generates structured AI clinical summary clearly labeled 'AI-GENERATED SUMMARY' with safety disclaimers", async () => {
    const caller = appRouter.createCaller(createMockDoctorContext(5));

    const summaryRes = await caller.consultations.generateSummary({ patientId: 1 });

    expect(summaryRes).toBeDefined();
    expect(summaryRes.header).toBe("AI-GENERATED SUMMARY");
    expect(summaryRes.summary).toBeDefined();
    expect(summaryRes.summary.length).toBeGreaterThan(20);

    // Structured brief details
    expect(summaryRes.structuredBrief).toBeDefined();
    expect(summaryRes.structuredBrief.demographics).toContain("Ramesh Patel");
    expect(summaryRes.structuredBrief.chronicConditions).toContain("Hypertension");
    expect(summaryRes.structuredBrief.allergies).toContain("Sulfa drugs");

    // Safety and clinical governance notices
    expect(summaryRes.safetyNotice).toContain("AI must never autonomously diagnose or prescribe");
    expect(summaryRes.disclaimer).toMatch(/Decision Support Only/i);
    expect(summaryRes.disclaimer).toMatch(/doctor has full discretion to edit/i);
  });

  it("records full doctor clinical consultation with assessment, diagnosis, treatment plan, test orders, prescriptions, and follow-ups", async () => {
    const caller = appRouter.createCaller(createMockDoctorContext(5, 1));
    const patientId = 1;

    const encounterPayload = {
      patientId,
      clinicalAssessment: "Essential Hypertension Stage 1 with suboptimally controlled morning systolic pressure",
      diagnosis: "Essential Hypertension Stage 1, Type 2 Diabetes Mellitus",
      notes: "Doctor clinical notes: Patient counseled on low sodium diet, daily hydration, and strict morning dosing schedule.",
      treatmentPlan: "Telmisartan 40mg 1-0-0 once daily in morning. DASH diet counseling, sodium <5g/day. Scheduled bi-weekly ASHA BP monitoring.",
      recommendedTests: "Serum Creatinine, Spot Urine Albumin-to-Creatinine Ratio (UACR), Fasting Blood Glucose, ECG",
      followUpPlan: "Home BP check by ASHA worker in 14 days. Routine PHC review in 30 days.",
      followUpDueAt: new Date(Date.now() + 14 * 86400000),
      aiSummaryUsed: "AI summary referenced during examination",
      bpSystolic: 154,
      bpDiastolic: 94,
      pulse: 78,
      spo2: 97,
      glucose: 158,
      temperature: 98.4,
      weight: 64.0,
      height: 158.0,
      prescriptions: [
        {
          medicineName: "Telmisartan 40mg",
          dosage: "40mg",
          frequency: "1-0-0",
          duration: "30 days",
          instructions: "Take daily with water after breakfast.",
        },
        {
          medicineName: "Amlodipine 5mg",
          dosage: "5mg",
          frequency: "0-0-1",
          duration: "14 days",
          instructions: "Take at night before sleep.",
        },
      ],
      followUp: {
        title: "Post-Consultation Blood Pressure & Glycemic Review",
        dueAt: new Date(Date.now() + 14 * 86400000),
        notes: "Check morning systolic BP and ensure Telmisartan compliance.",
      },
    };

    const result = await caller.consultations.recordConsultation(encounterPayload);

    expect(result.success).toBe(true);
    expect(result.consultationId).toBeGreaterThan(0);
    expect(result.visitId).toBeGreaterThan(0);
    expect(result.createdPrescriptionIds.length).toBe(2);
    expect(result.createdFollowUpId).toBeDefined();

    // Verify consultation in DB
    const savedConsultation = await getConsultationById(result.consultationId);
    expect(savedConsultation).toBeDefined();
    expect(savedConsultation?.patientId).toBe(1);
    expect(savedConsultation?.doctorId).toBe(5);
    expect(savedConsultation?.diagnosis).toBe("Essential Hypertension Stage 1, Type 2 Diabetes Mellitus");
    expect(savedConsultation?.clinicalAssessment).toBe(encounterPayload.clinicalAssessment);
    expect(savedConsultation?.treatmentPlan).toBe(encounterPayload.treatmentPlan);
    expect(savedConsultation?.recommendedTests).toBe(encounterPayload.recommendedTests);
    expect(savedConsultation?.bpSystolic).toBe(154);

    // Verify digital prescriptions stored
    const prescriptions = await getPrescriptions(1);
    const telmisartan = prescriptions.find(p => p.medicineName === "Telmisartan 40mg");
    expect(telmisartan).toBeDefined();
    expect(telmisartan?.dosage).toBe("40mg");

    // Verify follow-up directive stored
    if (result.createdFollowUpId) {
      const followUp = await getFollowUpById(result.createdFollowUpId);
      expect(followUp).toBeDefined();
      expect(followUp?.title).toBe("Post-Consultation Blood Pressure & Glycemic Review");
    }

    // Verify consultation history for patient
    const history = await caller.consultations.getHistory({ patientId: 1 });
    expect(history.length).toBeGreaterThan(0);
    expect(history.some(h => h.id === result.consultationId)).toBe(true);
  });

  it("enforces safety: rejects non-doctor roles from finalizing clinical consultation", async () => {
    const caller = appRouter.createCaller(createMockCitizenContext(99));

    await expect(
      caller.consultations.recordConsultation({
        patientId: 1,
        clinicalAssessment: "Assessment",
        diagnosis: "Diagnosis",
        treatmentPlan: "Plan",
      })
    ).rejects.toThrow(/Only doctors and administrators/i);
  });
});
