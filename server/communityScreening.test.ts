import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  calculateBMI,
  evaluateCommunityScreening,
  validateScreeningVitals,
} from "./decisionSupport";
import { getPatientById, getAlerts } from "./db";

function createMockAshaContext(userId = 2): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `asha-worker-${userId}`,
      name: "Rekha ASHA Worker",
      email: "rekha.asha@arjuna.gov.in",
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

describe("ASHA/CHO Community Health Screening Engine", () => {
  describe("Physiological Range Validation & Impossible Value Prevention", () => {
    it("accepts valid physiological values", () => {
      const errors = validateScreeningVitals({
        bpSystolic: 120,
        bpDiastolic: 80,
        pulse: 72,
        spo2: 98,
        temperature: 98.6,
        glucose: 110,
        weight: 65,
        height: 168,
      });
      expect(errors).toHaveLength(0);
    });

    it("rejects impossible systolic blood pressure", () => {
      const errors = validateScreeningVitals({ bpSystolic: 350, bpDiastolic: 80 });
      expect(errors.some((e) => e.includes("Systolic blood pressure"))).toBe(true);
    });

    it("rejects systolic BP less than or equal to diastolic BP", () => {
      const errors = validateScreeningVitals({ bpSystolic: 70, bpDiastolic: 80 });
      expect(errors.some((e) => e.includes("must be greater than"))).toBe(true);
    });

    it("rejects SpO2 greater than 100% or under 50%", () => {
      const errorsAbove = validateScreeningVitals({ spo2: 105 });
      const errorsBelow = validateScreeningVitals({ spo2: 40 });
      expect(errorsAbove.some((e) => e.includes("Oxygen saturation"))).toBe(true);
      expect(errorsBelow.some((e) => e.includes("Oxygen saturation"))).toBe(true);
    });

    it("rejects impossible pulse and glucose values", () => {
      const errors = validateScreeningVitals({ pulse: 300, glucose: 1000 });
      expect(errors.some((e) => e.includes("Pulse rate"))).toBe(true);
      expect(errors.some((e) => e.includes("Blood glucose"))).toBe(true);
    });

    it("calculates BMI correctly with classification", () => {
      const normalBmi = calculateBMI(65, 170); // ~22.5
      expect(normalBmi?.bmi).toBe(22.5);
      expect(normalBmi?.category).toBe("Normal");

      const obeseBmi = calculateBMI(95, 160); // ~37.1
      expect(obeseBmi?.bmi).toBe(37.1);
      expect(obeseBmi?.category).toBe("Obese");
    });
  });

  describe("4-Tier Triage Stratification (NORMAL, ATTENTION, HIGH RISK, EMERGENCY)", () => {
    it("evaluates a healthy patient as NORMAL", () => {
      const result = evaluateCommunityScreening({
        bpSystolic: 116,
        bpDiastolic: 76,
        pulse: 70,
        spo2: 99,
        temperature: 98.4,
        glucose: 95,
        weight: 60,
        height: 165,
        symptoms: "",
      });

      expect(result.status).toBe("NORMAL");
      expect(result.triageLevel).toBe("self_care");
      expect(result.score).toBeLessThan(25);
      expect(result.recommendedAction).toContain("healthy physiological limits");
    });

    it("evaluates borderline pre-hypertension and mild symptoms as ATTENTION", () => {
      const result = evaluateCommunityScreening({
        bpSystolic: 132,
        bpDiastolic: 84,
        pulse: 78,
        spo2: 97,
        glucose: 155,
        weight: 78,
        height: 165,
        symptoms: "Mild fatigue after farm work",
      });

      expect(result.status).toBe("ATTENTION");
      expect(result.triageLevel).toBe("routine");
      expect(result.score).toBeGreaterThanOrEqual(25);
      expect(result.score).toBeLessThan(50);
      expect(result.recommendedAction).toContain("lifestyle, dietary, and physical activity");
    });

    it("evaluates Stage 2 Hypertension and hyperglycemia as HIGH RISK", () => {
      const result = evaluateCommunityScreening({
        bpSystolic: 152,
        bpDiastolic: 94,
        pulse: 84,
        spo2: 95,
        glucose: 230,
        symptoms: "Leg swelling, occasional dizziness",
      });

      expect(result.status).toBe("HIGH RISK");
      expect(result.triageLevel).toBe("urgent");
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.recommendedAction).toContain("PHC/Sub-Centre with Medical Officer/CHO");
    });

    it("evaluates hypertensive crisis, critical hypoxia, or emergency red flags as EMERGENCY", () => {
      const result = evaluateCommunityScreening({
        bpSystolic: 192,
        bpDiastolic: 122,
        pulse: 110,
        spo2: 88,
        glucose: 210,
        symptoms: "Severe chest pain radiating to left arm, difficulty breathing",
      });

      expect(result.status).toBe("EMERGENCY");
      expect(result.triageLevel).toBe("emergency");
      expect(result.score).toBeGreaterThanOrEqual(75);
      expect(result.recommendedAction).toContain("108 Emergency Ambulance");
    });

    it("stratifies maternal pre-eclampsia risk in pregnancy as EMERGENCY", () => {
      const result = evaluateCommunityScreening({
        bpSystolic: 162,
        bpDiastolic: 112,
        pregnancyStatus: "trimester_3",
        gender: "female",
        symptoms: "Severe headache, blurred vision, sudden facial swelling",
      });

      expect(result.status).toBe("EMERGENCY");
      expect(result.factors.some((f) => f.includes("pre-eclampsia"))).toBe(true);
      expect(result.recommendedAction).toContain("EMERGENCY");
    });
  });

  describe("End-to-End tRPC Screening Workflow & Database Persistence", () => {
    it("creates a screening, saves it to database, and retrieves longitudinal history", async () => {
      const caller = appRouter.createCaller(createMockAshaContext());

      const payload = {
        patientId: 1,
        bpSystolic: 148,
        bpDiastolic: 94,
        pulse: 82,
        spo2: 96,
        temperature: 98.6,
        glucose: 168,
        weight: 64,
        height: 162,
        symptoms: "Occasional morning dizziness, mild ankle swelling",
        structuredSymptoms: ["Occasional morning dizziness", "Leg / Ankle Swelling"],
        existingConditions: "Hypertension",
        pregnancyStatus: "not_pregnant",
        notes: "Field screening visit at home in Sundarpur.",
      };

      const response = await caller.screenings.create(payload);

      expect(response.id).toBeGreaterThan(0);
      expect(response.screeningResult.status).toBe("HIGH RISK");
      expect(response.screeningResult.factors.length).toBeGreaterThan(0);

      // Verify updated patient risk
      const patient = await getPatientById(1);
      expect(patient).toBeDefined();
      expect(patient?.riskCategory).toBe("high");

      // Verify longitudinal history query
      const history = await caller.screenings.listForPatient({ patientId: 1 });
      expect(history.length).toBeGreaterThan(0);
      const latest = history[0];
      expect(latest?.bpSystolic).toBe(148);
      expect(latest?.bpDiastolic).toBe(94);
      expect(latest?.pulse).toBe(82);
    });

    it("triggers an automated alert when EMERGENCY screening is submitted", async () => {
      const caller = appRouter.createCaller(createMockAshaContext(2));

      const emergencyPayload = {
        patientId: 1,
        bpSystolic: 195,
        bpDiastolic: 125,
        pulse: 118,
        spo2: 87,
        glucose: 310,
        symptoms: "Severe chest pain, sudden breathlessness",
        structuredSymptoms: ["Chest Pain / Pressure", "Severe Breathlessness"],
        notes: "Emergency 108 summoned.",
      };

      const res = await caller.screenings.create(emergencyPayload);
      expect(res.screeningResult.status).toBe("EMERGENCY");

      // Verify alert was created
      const alerts = await getAlerts(2);
      expect(alerts.some((a) => a.kind === "high_risk" && a.title.includes("EMERGENCY"))).toBe(true);
    });

    it("rejects screening creation when impossible values are passed", async () => {
      const caller = appRouter.createCaller(createMockAshaContext());

      await expect(
        caller.screenings.create({
          patientId: 1,
          bpSystolic: 80,
          bpDiastolic: 120, // impossible: systolic < diastolic
        })
      ).rejects.toThrow();
    });
  });
});
