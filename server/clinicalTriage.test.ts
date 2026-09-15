import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  evaluateDeterministicClinicalTriage,
  executeDeterministicSafetyGuardedTriage,
  DEFAULT_TRIAGE_CONFIG,
  CLINICAL_SAFETY_DISCLAIMER,
} from "./clinicalTriageEngine";
import { getPatientById, getAlerts } from "./db";

function createMockAshaContext(userId = 2): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `asha-triage-tester-${userId}`,
      name: "Suman ASHA Worker",
      email: "suman.asha@arjuna.gov.in",
      loginMethod: "manus",
      role: "asha_cho",
      facilityId: 1,
      district: "Ahmedabad Rural",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("Deterministic Clinical Triage Engine", () => {
  describe("1. Red-Flag Symptom Safety Rules (CRITICAL / EMERGENCY)", () => {
    it("Rule: Severe breathing difficulty triggers CRITICAL emergency triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        symptoms: "Patient having severe breathing difficulty and shortness of breath while resting",
      });

      expect(result.category).toBe("CRITICAL");
      expect(result.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");
      expect(result.triageLevel).toBe("emergency");
      expect(result.isEmergency).toBe(true);
      expect(result.reasons.some((r) => r.toLowerCase().includes("breathing difficulty"))).toBe(true);
      expect(result.recommendedAction).toContain("108 Emergency Ambulance");
    });

    it("Rule: Severe chest pain triggers CRITICAL emergency triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        symptoms: "Crushing chest pain radiating to left arm with cold sweats",
      });

      expect(result.category).toBe("CRITICAL");
      expect(result.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");
      expect(result.reasons.some((r) => r.toLowerCase().includes("chest pain"))).toBe(true);
      expect(result.recommendedAction).toContain("108 Emergency Ambulance");
    });

    it("Rule: Loss of consciousness / syncope triggers CRITICAL emergency triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        symptoms: "Sudden loss of consciousness, fainted in field and briefly unresponsive",
      });

      expect(result.category).toBe("CRITICAL");
      expect(result.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");
      expect(result.reasons.some((r) => r.toLowerCase().includes("loss of consciousness"))).toBe(true);
    });

    it("Rule: Severe active bleeding / hemorrhage triggers CRITICAL emergency triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        symptoms: "Severe bleeding from deep wound with uncontrolled blood loss",
      });

      expect(result.category).toBe("CRITICAL");
      expect(result.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");
      expect(result.reasons.some((r) => r.toLowerCase().includes("bleeding"))).toBe(true);
    });

    it("Rule: Stroke symptoms (FAST criteria) trigger CRITICAL emergency triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        symptoms: "Sudden face droop, arm weakness on right side, and slurred speech",
      });

      expect(result.category).toBe("CRITICAL");
      expect(result.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");
      expect(result.reasons.some((r) => r.toLowerCase().includes("stroke"))).toBe(true);
      expect(result.recommendedAction).toContain("108 Ambulance");
    });

    it("Rule: Obstetric emergency in pregnancy triggers CRITICAL emergency triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        pregnancyStatus: "trimester_3",
        gender: "female",
        symptoms: "Vaginal bleeding in pregnancy and reduced fetal movement",
      });

      expect(result.category).toBe("CRITICAL");
      expect(result.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");
      expect(result.reasons.some((r) => r.toLowerCase().includes("obstetric emergency"))).toBe(true);
    });
  });

  describe("2. Critically Abnormal Vital Signs Rules (CRITICAL / EMERGENCY)", () => {
    it("Rule: Hypertensive crisis (BP >= 180/120 mmHg) triggers CRITICAL triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        bpSystolic: 190,
        bpDiastolic: 124,
      });

      expect(result.category).toBe("CRITICAL");
      expect(result.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");
      expect(result.reasons.some((r) => r.includes("Hypertensive Crisis"))).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it("Rule: Critical hypoxia (SpO2 < 90%) triggers CRITICAL triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        spo2: 86,
      });

      expect(result.category).toBe("CRITICAL");
      expect(result.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");
      expect(result.reasons.some((r) => r.includes("Critical Hypoxia"))).toBe(true);
    });

    it("Rule: Severe hypoglycemia (Glucose < 50 mg/dL) triggers CRITICAL triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        glucose: 42,
      });

      expect(result.category).toBe("CRITICAL");
      expect(result.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");
      expect(result.reasons.some((r) => r.includes("Severe Hypoglycemia"))).toBe(true);
    });

    it("Rule: Extreme hyperglycemia (Glucose >= 400 mg/dL) triggers CRITICAL triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        glucose: 440,
      });

      expect(result.category).toBe("CRITICAL");
      expect(result.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");
      expect(result.reasons.some((r) => r.includes("Extreme Hyperglycemia"))).toBe(true);
    });

    it("Rule: Critical pulse anomaly (Pulse >= 140 or < 40 bpm) triggers CRITICAL triage", () => {
      const tachyResult = evaluateDeterministicClinicalTriage({ pulse: 152 });
      const bradyResult = evaluateDeterministicClinicalTriage({ pulse: 36 });

      expect(tachyResult.category).toBe("CRITICAL");
      expect(bradyResult.category).toBe("CRITICAL");
      expect(tachyResult.reasons.some((r) => r.includes("tachycardia"))).toBe(true);
      expect(bradyResult.reasons.some((r) => r.includes("bradycardia"))).toBe(true);
    });

    it("Rule: Hyperpyrexia (Temp >= 104°F / 40°C) triggers CRITICAL triage", () => {
      const resultF = evaluateDeterministicClinicalTriage({ temperature: 104.8 });
      const resultC = evaluateDeterministicClinicalTriage({ temperature: 40.5 }); // in Celsius

      expect(resultF.category).toBe("CRITICAL");
      expect(resultC.category).toBe("CRITICAL");
      expect(resultF.reasons.some((r) => r.includes("Hyperpyrexia"))).toBe(true);
    });

    it("Rule: Maternal Pre-eclampsia (High BP + Pregnancy with warning signs) triggers CRITICAL triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        pregnancyStatus: "trimester_3",
        gender: "female",
        bpSystolic: 165,
        bpDiastolic: 112,
        symptoms: "Severe headache and sudden facial swelling",
      });

      expect(result.category).toBe("CRITICAL");
      expect(result.reasons.some((r) => r.includes("pre-eclampsia"))).toBe(true);
    });
  });

  describe("3. Urgent Clinical Rules (URGENT / HIGH PRIORITY)", () => {
    it("Rule: Stage 2 Hypertension (140-179 / 90-119 mmHg) triggers URGENT triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        bpSystolic: 154,
        bpDiastolic: 96,
      });

      expect(result.category).toBe("URGENT");
      expect(result.priorityDisplay).toBe("HIGH PRIORITY / URGENT MEDICAL EVALUATION");
      expect(result.triageLevel).toBe("urgent");
      expect(result.reasons.some((r) => r.includes("Stage 2 Hypertension"))).toBe(true);
      expect(result.recommendedAction).toContain("HIGH PRIORITY");
    });

    it("Rule: Moderate hypoxia (SpO2 90-93%) triggers URGENT triage", () => {
      const result = evaluateDeterministicClinicalTriage({ spo2: 92 });

      expect(result.category).toBe("URGENT");
      expect(result.priorityDisplay).toBe("HIGH PRIORITY / URGENT MEDICAL EVALUATION");
      expect(result.reasons.some((r) => r.includes("Subnormal oxygen saturation"))).toBe(true);
    });

    it("Rule: Marked hyperglycemia (Glucose 200-399 mg/dL) triggers URGENT triage", () => {
      const result = evaluateDeterministicClinicalTriage({ glucose: 240 });

      expect(result.category).toBe("URGENT");
      expect(result.reasons.some((r) => r.includes("Significantly elevated blood glucose"))).toBe(true);
    });

    it("Rule: High fever (Temp 101.5-103.9°F) triggers URGENT triage", () => {
      const result = evaluateDeterministicClinicalTriage({ temperature: 102.4 });

      expect(result.category).toBe("URGENT");
      expect(result.reasons.some((r) => r.includes("High body temperature"))).toBe(true);
    });

    it("Rule: Severe malnutrition (BMI < 16) or morbid obesity (BMI >= 35) triggers URGENT triage", () => {
      const obeseResult = evaluateDeterministicClinicalTriage({ weight: 110, height: 160 }); // BMI ~43
      const malnourishedResult = evaluateDeterministicClinicalTriage({ weight: 35, height: 165 }); // BMI ~12.8

      expect(obeseResult.category).toBe("URGENT");
      expect(malnourishedResult.category).toBe("URGENT");
    });

    it("Rule: Gestational hypertension in pregnancy triggers URGENT triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        pregnancyStatus: "trimester_2",
        gender: "female",
        bpSystolic: 144,
        bpDiastolic: 92,
      });

      expect(result.category).toBe("URGENT");
      expect(result.reasons.some((r) => r.includes("Gestational Hypertension"))).toBe(true);
    });
  });

  describe("4. Routine & Low Priority Categories (ROUTINE / LOW PRIORITY)", () => {
    it("Rule: Pre-hypertension and borderline parameters trigger ROUTINE triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        bpSystolic: 128,
        bpDiastolic: 84,
      });

      expect(result.category).toBe("ROUTINE");
      expect(result.priorityDisplay).toBe("ROUTINE PRIORITY / SCHEDULED CLINICAL REVIEW");
      expect(result.triageLevel).toBe("routine");
      expect(result.reasons.some((r) => r.includes("Borderline elevated blood pressure"))).toBe(true);
    });

    it("Rule: Impaired glucose tolerance (140-199 mg/dL) triggers ROUTINE triage", () => {
      const result = evaluateDeterministicClinicalTriage({ glucose: 165 });

      expect(result.category).toBe("ROUTINE");
      expect(result.reasons.some((r) => r.includes("Borderline elevated blood glucose"))).toBe(true);
    });

    it("Rule: Non-critical symptoms and chronic conditions trigger ROUTINE triage", () => {
      const result = evaluateDeterministicClinicalTriage({
        symptoms: "Mild knee joint stiffness in morning",
        existingConditions: "Type 2 Diabetes",
      });

      expect(result.category).toBe("ROUTINE");
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it("Rule: Completely healthy vitals and no acute symptoms trigger LOW PRIORITY", () => {
      const result = evaluateDeterministicClinicalTriage({
        bpSystolic: 116,
        bpDiastolic: 76,
        pulse: 72,
        spo2: 99,
        temperature: 98.4,
        glucose: 92,
        weight: 60,
        height: 165,
      });

      expect(result.category).toBe("LOW PRIORITY");
      expect(result.priorityDisplay).toBe("LOW PRIORITY / COMMUNITY WELLNESS & SELF-CARE");
      expect(result.triageLevel).toBe("self_care");
      expect(result.isEmergency).toBe(false);
      expect(result.reasons[0]).toContain("normal physiological limits");
    });
  });

  describe("5. Safety Constraints & Configurable Rules", () => {
    it("Includes safety disclaimer and does NOT provide dangerous self-treatment or definitive diagnoses", () => {
      const result = evaluateDeterministicClinicalTriage({
        symptoms: "Chest pain and sweating",
      });

      expect(result.safetyDisclaimer).toContain("DECISION SUPPORT ONLY");
      expect(result.safetyDisclaimer).toBe(CLINICAL_SAFETY_DISCLAIMER);
      // Ensures recommended action is safe medical escalation, not unverified medications
      expect(result.recommendedAction).toContain("Immediate professional medical evaluation");
      expect(result.recommendedAction).not.toContain("take nitroglycerin 500mg immediately without prescription");
    });

    it("Allows custom backend configuration of thresholds and red flag keywords", () => {
      const customConfig = {
        vitalThresholds: {
          ...DEFAULT_TRIAGE_CONFIG.vitalThresholds,
          criticalBpSystolicHigh: 170, // Custom stricter threshold
        },
      };

      const result = evaluateDeterministicClinicalTriage(
        { bpSystolic: 175, bpDiastolic: 95 },
        customConfig
      );

      expect(result.category).toBe("CRITICAL");
      expect(result.reasons.some((r) => r.includes("Hypertensive Crisis"))).toBe(true);
    });
  });

  describe("6. Emergency Safety Rules Override Lower-Risk AI Output", () => {
    it("Guarantees that deterministic CRITICAL rule overrides any lower AI urgency", async () => {
      const input = {
        symptoms: "Severe breathing difficulty, gasping for air",
        spo2: 87,
      };

      const guardedResult = await executeDeterministicSafetyGuardedTriage(input);

      expect(guardedResult.deterministicTriage.category).toBe("CRITICAL");
      expect(guardedResult.deterministicTriage.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");
      expect(guardedResult.aiUrgency).toBe("emergency");
      expect(guardedResult.safetyNet).toContain("Emergency");
    });
  });

  describe("7. End-to-End tRPC Triage Router & Health Visit Persistence", () => {
    it("Evaluates deterministic triage via tRPC and saves complete triage result in health visit", async () => {
      const caller = appRouter.createCaller(createMockAshaContext());

      // Query deterministic triage evaluation
      const triageRes = await caller.triage.evaluateDeterministic({
        bpSystolic: 184,
        bpDiastolic: 122,
        symptoms: "Chest pain and severe shortness of breath",
      });

      expect(triageRes.category).toBe("CRITICAL");
      expect(triageRes.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");
      expect(triageRes.reasons.length).toBeGreaterThanOrEqual(2);

      // Create a screening visit and verify stored triage result
      const visitRes = await caller.screenings.create({
        patientId: 1,
        bpSystolic: 184,
        bpDiastolic: 122,
        pulse: 104,
        spo2: 89,
        temperature: 98.6,
        glucose: 210,
        symptoms: "Chest pain and severe shortness of breath",
        notes: "Emergency field visit by ASHA.",
      });

      expect(visitRes.id).toBeGreaterThan(0);
      expect(visitRes.deterministicTriage.category).toBe("CRITICAL");
      expect(visitRes.deterministicTriage.priorityDisplay).toBe("EMERGENCY / IMMEDIATE MEDICAL ATTENTION");

      // Verify alert was generated
      const alerts = await getAlerts(2);
      expect(alerts.some((a) => a.title.includes("EMERGENCY / IMMEDIATE MEDICAL ATTENTION"))).toBe(true);
    });

    it("Returns default triage config for backend inspection", async () => {
      const caller = appRouter.createCaller(createMockAshaContext());
      const config = await caller.triage.getConfig();

      expect(config.vitalThresholds.criticalBpSystolicHigh).toBe(180);
      expect(config.vitalThresholds.criticalSpo2Low).toBe(90);
      expect(config.redFlagKeywords.severeChestPain).toContain("chest pain");
    });
  });
});
