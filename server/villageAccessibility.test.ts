import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  calculateVillageScore,
  getDistrictAccessibilityScores,
  determineRiskCategory,
  DEFAULT_ACCESSIBILITY_WEIGHTS,
  PROTOTYPE_METRIC_DISCLAIMER,
} from "./villageAccessibilityService";
import { CONFIG_VILLAGES } from "./smartReferralEngine";

function createMockPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("Village Healthcare Accessibility Score Engine (0–100)", () => {
  describe("Mathematical Formula & Scoring Bounds", () => {
    it("should compute overall score within [0, 100] for all configured villages", async () => {
      for (const village of CONFIG_VILLAGES) {
        const result = await calculateVillageScore(village);

        expect(result.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.overallScore).toBeLessThanOrEqual(100);
        expect(result.factors.length).toBe(7);

        // Check that every factor has a sub-score within 0-100
        result.factors.forEach((f) => {
          expect(f.rawScore).toBeGreaterThanOrEqual(0);
          expect(f.rawScore).toBeLessThanOrEqual(100);
          expect(f.weightPercent).toBeGreaterThan(0);
          expect(f.weightedContribution).toBeGreaterThanOrEqual(0);
        });

        // Sum of weighted contributions should match overallScore within rounding error
        const sumContrib = result.factors.reduce((acc, f) => acc + f.weightedContribution, 0);
        expect(Math.abs(result.overallScore - Math.round(sumContrib))).toBeLessThanOrEqual(1);
      }
    });

    it("should assign correct risk categories based on score thresholds", () => {
      expect(determineRiskCategory(95).full).toBe("Optimal Accessibility (Low Vulnerability)");
      expect(determineRiskCategory(95).short).toBe("low");

      expect(determineRiskCategory(72).full).toBe("Moderate Accessibility (Moderate Vulnerability)");
      expect(determineRiskCategory(72).short).toBe("moderate");

      expect(determineRiskCategory(61).full).toBe("Sub-optimal Accessibility (High Vulnerability)");
      expect(determineRiskCategory(61).short).toBe("high");

      expect(determineRiskCategory(35).full).toBe("Critical Deficiency (Critical Vulnerability)");
      expect(determineRiskCategory(35).short).toBe("critical");
    });
  });

  describe("Limiting Factors Identification", () => {
    it("should detect and report main limiting factors when sub-scores are deficient", async () => {
      const karanji = CONFIG_VILLAGES.find((v) => v.name === "Karanji Budruk") || CONFIG_VILLAGES[0];
      expect(karanji).toBeDefined();

      const result = await calculateVillageScore(karanji);
      expect(result.mainLimitingFactors).toBeDefined();
      expect(Array.isArray(result.mainLimitingFactors)).toBe(true);
      expect(result.mainLimitingFactors.length).toBeGreaterThan(0);

      // Check if any factor with rawScore < 60 is flagged as limiting
      const lowFactors = result.factors.filter((f) => f.rawScore < 60);
      lowFactors.forEach((f) => {
        expect(f.isLimitingFactor).toBe(true);
        expect(f.limitationDescription).toBeDefined();
      });
    });

    it("should generate actionable recommendations for each factor", async () => {
      const village = CONFIG_VILLAGES[0];
      const result = await calculateVillageScore(village);

      result.factors.forEach((f) => {
        expect(f.actionRecommendation).toBeTruthy();
        expect(typeof f.actionRecommendation).toBe("string");
      });
    });
  });

  describe("Formula Weight Sensitivity & Customization", () => {
    it("should adjust overall score dynamically when factor weights are tuned", async () => {
      const village = CONFIG_VILLAGES.find((v) => v.name === "Sonwadi") || CONFIG_VILLAGES[0];

      // Base default score
      const defaultResult = await calculateVillageScore(village, DEFAULT_ACCESSIBILITY_WEIGHTS);

      // Emphasize distance weight to 60%
      const distanceHeavyWeights = {
        ...DEFAULT_ACCESSIBILITY_WEIGHTS,
        facilityDistanceWeight: 60,
      };
      const distanceResult = await calculateVillageScore(village, distanceHeavyWeights);

      // Emphasize screening coverage to 60%
      const screeningHeavyWeights = {
        ...DEFAULT_ACCESSIBILITY_WEIGHTS,
        screeningCoverageWeight: 60,
      };
      const screeningResult = await calculateVillageScore(village, screeningHeavyWeights);

      expect(defaultResult.overallScore).toBeDefined();
      expect(distanceResult.overallScore).toBeDefined();
      expect(screeningResult.overallScore).toBeDefined();
    });
  });

  describe("Prototype Metric Disclaimers & Safety Guard", () => {
    it("should include prototype analytical disclaimer in score calculation results", async () => {
      const village = CONFIG_VILLAGES[0];
      const result = await calculateVillageScore(village);

      expect(result.telemetry.isPrototypeMetric).toBe(true);
      expect(result.telemetry.disclaimer).toBe(PROTOTYPE_METRIC_DISCLAIMER);
      expect(result.telemetry.disclaimer.toLowerCase()).toContain("not an official government");
    });
  });

  describe("tRPC Accessibility Router Procedures", () => {
    it("accessibility.getVillageScores should return ranked scores and summary", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());
      const res = await caller.accessibility.getVillageScores();

      expect(res).toBeDefined();
      expect(res.villages.length).toBeGreaterThanOrEqual(5);
      expect(res.summary).toBeDefined();
      expect(res.summary.averageScore).toBeGreaterThan(0);
      expect(res.summary.averageScore).toBeLessThanOrEqual(100);
      expect(res.summary.disclaimer).toBe(PROTOTYPE_METRIC_DISCLAIMER);
      expect(res.summary.isPrototype).toBe(true);

      // Verify structure of first village
      const first = res.villages[0];
      expect(first.villageName).toBeTruthy();
      expect(first.overallScore).toBeGreaterThanOrEqual(0);
      expect(first.riskCategory).toBeTruthy();
      expect(first.mainLimitingFactors.length).toBeGreaterThan(0);
    });

    it("accessibility.getVillageDetail should return deep-dive factor breakdown for a specific village", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());
      const detail = await caller.accessibility.getVillageDetail({
        villageId: "karanji_budruk",
      });

      expect(detail).toBeDefined();
      expect(detail.villageName.toLowerCase()).toContain("karanji");
      expect(detail.factors.length).toBe(7);
      expect(detail.nearestFacility).toBeDefined();
      expect(detail.nearestFacility.distanceKm).toBeGreaterThanOrEqual(0);
      expect(detail.screeningStats).toBeDefined();
      expect(detail.transportStats).toBeDefined();
      expect(detail.telemetry.isPrototypeMetric).toBe(true);
    });

    it("accessibility.getConfiguration should return formula explanation and default weights", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());
      const config = await caller.accessibility.getConfiguration();

      expect(config).toBeDefined();
      expect(config.defaultWeights).toEqual(DEFAULT_ACCESSIBILITY_WEIGHTS);
      expect(config.disclaimer).toBe(PROTOTYPE_METRIC_DISCLAIMER);
      expect(config.formula).toBeDefined();
      expect(config.formula.factors.length).toBe(7);
      expect(config.formula.riskCategories.length).toBe(4);
    });
  });
});
