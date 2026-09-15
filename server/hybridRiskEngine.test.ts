import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  calculateHybridHealthRisk,
  HYBRID_RISK_DISCLAIMER,
} from "./hybridRiskEngine";

function createMockContext(
  userId = 1,
  role: NonNullable<TrpcContext["user"]>["role"] = "doctor"
): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-test-${userId}`,
      name: "Dr. Ananya Sharma",
      email: "ananya.sharma@arjuna.gov.in",
      loginMethod: "manus",
      role,
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

describe("AI-Assisted Hybrid Health Risk Scoring System", () => {
  describe("1. Multi-Dimensional Input Integration & Feature Extraction", () => {
    it("evaluates a complete multi-feature profile with all inputs", () => {
      const result = calculateHybridHealthRisk({
        age: 70,
        bpSystolic: 168,
        bpDiastolic: 98,
        pulse: 88,
        spo2: 95,
        temperature: 98.6,
        glucose: 245,
        bmi: 28.5,
        symptoms: "Mild morning dizziness and fatigue",
        conditions: "Hypertension, Type 2 Diabetes",
        previousRiskScore: 68,
        missedFollowUps: 1,
      });

      expect(result.riskScore).toBeGreaterThanOrEqual(60);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(["HIGH", "CRITICAL"]).toContain(result.riskCategory);
      expect(result.contributingFactors.length).toBeGreaterThan(3);

      // Verify contributing factors details
      const factorNames = result.contributingFactors.map((f) => f.factor);
      expect(factorNames.some((f) => f.includes("Blood Pressure") || f.includes("Hypertension"))).toBe(true);
      expect(factorNames.some((f) => f.includes("Glucose") || f.includes("Hyperglycemia"))).toBe(true);
      expect(factorNames.some((f) => f.includes("Missed Follow-up"))).toBe(true);
    });

    it("evaluates a healthy profile as LOW risk", () => {
      const result = calculateHybridHealthRisk({
        age: 28,
        bpSystolic: 118,
        bpDiastolic: 76,
        pulse: 72,
        spo2: 99,
        temperature: 98.4,
        glucose: 90,
        bmi: 22.0,
        symptoms: "",
        conditions: "None",
        missedFollowUps: 0,
      });

      expect(result.riskScore).toBeLessThan(30);
      expect(result.riskCategory).toBe("LOW");
      expect(result.recommendedNextStep).toContain("Maintain regular healthy lifestyle");
    });

    it("evaluates moderate risk profile accurately", () => {
      const result = calculateHybridHealthRisk({
        age: 45,
        bpSystolic: 134,
        bpDiastolic: 86,
        pulse: 78,
        spo2: 97,
        glucose: 152,
        bmi: 26.2,
        conditions: "Pre-hypertension",
        missedFollowUps: 0,
      });

      expect(result.riskScore).toBeGreaterThanOrEqual(30);
      expect(result.riskScore).toBeLessThan(60);
      expect(result.riskCategory).toBe("MODERATE");
      expect(result.recommendedNextStep).toContain("lifestyle, dietary");
    });
  });

  describe("2. Explainability & Contributing Factors", () => {
    it("returns structured explainability breakdown with relative score contributions", () => {
      const result = calculateHybridHealthRisk({
        age: 68,
        bpSystolic: 162,
        bpDiastolic: 96,
        glucose: 220,
        conditions: "Hypertension",
        missedFollowUps: 2,
      });

      expect(result.contributingFactors).toBeInstanceOf(Array);
      expect(result.contributingFactors.length).toBeGreaterThan(0);

      // Verify each factor has factor name, contribution points, category, and explanation detail
      for (const factor of result.contributingFactors) {
        expect(factor.factor).toBeDefined();
        expect(factor.contribution).toBeGreaterThan(0);
        expect(factor.category).toBeDefined();
        expect(factor.detail).toBeDefined();
      }

      // Verify factors are sorted by highest contribution first
      for (let i = 0; i < result.contributingFactors.length - 1; i++) {
        expect(result.contributingFactors[i]!.contribution).toBeGreaterThanOrEqual(
          result.contributingFactors[i + 1]!.contribution
        );
      }
    });

    it("includes specific recommended next steps for every risk tier", () => {
      const criticalResult = calculateHybridHealthRisk({ bpSystolic: 195, bpDiastolic: 125, symptoms: "Severe chest pain" });
      expect(criticalResult.riskCategory).toBe("CRITICAL");
      expect(criticalResult.recommendedNextStep).toContain("108 Emergency Ambulance");

      const highResult = calculateHybridHealthRisk({ bpSystolic: 158, bpDiastolic: 98, glucose: 240 });
      expect(highResult.riskCategory).toBe("HIGH");
      expect(highResult.recommendedNextStep).toContain("Primary Health Centre (PHC)");

      const modResult = calculateHybridHealthRisk({ bpSystolic: 132, glucose: 150 });
      expect(modResult.riskCategory).toBe("MODERATE");
      expect(modResult.recommendedNextStep).toContain("ASHA surveillance review");
    });
  });

  describe("3. Hybrid Architecture (Deterministic Safety Floor + ML Risk Model)", () => {
    it("enforces deterministic safety floor when emergency rules trigger", () => {
      // Patient with few general chronic flags but acute critical hypoxia (SpO2 86%)
      const result = calculateHybridHealthRisk({
        age: 32,
        spo2: 86,
        symptoms: "Sudden difficulty breathing",
      });

      expect(result.deterministicTriage.category).toBe("CRITICAL");
      expect(result.riskCategory).toBe("CRITICAL");
      expect(result.riskScore).toBeGreaterThanOrEqual(80);
      expect(result.modelMetadata.deterministicFloorApplied).toBe(true);
    });

    it("demonstrates ML multivariate synergy (e.g. elderly + hypertension multiplier)", () => {
      const youngWithHtn = calculateHybridHealthRisk({ age: 30, bpSystolic: 150, bpDiastolic: 92 });
      const elderlyWithHtn = calculateHybridHealthRisk({ age: 75, bpSystolic: 150, bpDiastolic: 92 });

      expect(elderlyWithHtn.riskScore).toBeGreaterThan(youngWithHtn.riskScore);
      expect(elderlyWithHtn.contributingFactors.some((f) => f.factor.includes("Elderly") || f.factor.includes("Geriatric"))).toBe(true);
    });

    it("demonstrates adherence penalty for missed clinical follow-ups", () => {
      const basePatient = { age: 55, bpSystolic: 145, bpDiastolic: 92, glucose: 190 };
      const withoutMissed = calculateHybridHealthRisk({ ...basePatient, missedFollowUps: 0 });
      const withMissed = calculateHybridHealthRisk({ ...basePatient, missedFollowUps: 2 });

      expect(withMissed.riskScore).toBeGreaterThan(withoutMissed.riskScore);
      expect(withMissed.contributingFactors.some((f) => f.factor.includes("Missed Follow-up"))).toBe(true);
    });
  });

  describe("4. Clinical Decision Support Transparency & Non-Validation Disclaimer", () => {
    it("clearly marks the prototype model and includes explicit safety disclaimer", () => {
      const result = calculateHybridHealthRisk({ age: 60, bpSystolic: 150 });

      expect(result.modelMetadata.modelType).toContain("Hybrid");
      expect(result.modelMetadata.isClinicallyValidated).toBe(false);
      expect(result.modelMetadata.disclaimer).toBe(HYBRID_RISK_DISCLAIMER);
      expect(result.modelMetadata.disclaimer).toContain("DECISION SUPPORT PROTOTYPE");
      expect(result.modelMetadata.disclaimer).toContain("NOT a clinically validated standalone diagnostic device");
    });
  });

  describe("5. End-to-End tRPC Risk Router & Multi-Dashboard Integration", () => {
    it("calculates hybrid risk via tRPC risk.calculateHybrid endpoint", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "doctor"));

      const response = await caller.risk.calculateHybrid({
        age: 65,
        bpSystolic: 160,
        bpDiastolic: 98,
        glucose: 230,
        symptoms: "Occasional dizziness",
        conditions: "Hypertension",
        missedFollowUps: 1,
      });

      expect(response.riskScore).toBeGreaterThanOrEqual(60);
      expect(["HIGH", "CRITICAL"]).toContain(response.riskCategory);
      expect(response.contributingFactors.length).toBeGreaterThan(0);
      expect(response.modelMetadata.isClinicallyValidated).toBe(false);
    });

    it("retrieves patient risk profile with historical vitals via risk.getPatientRiskProfile", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "doctor"));

      // Patient #1 in mock store has Hypertension and Diabetic Nephropathy
      const profile = await caller.risk.getPatientRiskProfile({ patientId: 1 });

      expect(profile.patient).toBeDefined();
      expect(profile.patient.id).toBe(1);
      expect(profile.assessment).toBeDefined();
      expect(profile.assessment.riskScore).toBeGreaterThan(0);
      expect(["HIGH", "CRITICAL", "MODERATE"]).toContain(profile.assessment.riskCategory);
      expect(profile.assessment.contributingFactors.length).toBeGreaterThan(0);
    });
  });
});
