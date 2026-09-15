import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  getDistrictHealthMapData,
  getDistrictMapFilterOptions,
} from "./districtHealthMapService";

function createMockPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("District-Level Health Intelligence Map Service & Routers", () => {
  describe("Spatial Village Intelligence Aggregation", () => {
    it("should compile all 5 core dimensions for every village node", async () => {
      const result = await getDistrictHealthMapData();

      expect(result).toBeDefined();
      expect(result.villages.length).toBeGreaterThanOrEqual(5);
      expect(result.summary).toBeDefined();
      expect(result.facilities.length).toBeGreaterThan(0);

      for (const node of result.villages) {
        // 1. Accessibility Score
        expect(node.accessibility.score).toBeGreaterThanOrEqual(0);
        expect(node.accessibility.score).toBeLessThanOrEqual(100);
        expect(node.accessibility.riskCategory).toBeTruthy();
        expect(Array.isArray(node.accessibility.mainLimitingFactors)).toBe(true);

        // 2. Risk & Morbidity Distribution
        expect(node.riskDistribution.totalAssessed).toBeGreaterThan(0);
        expect(node.riskDistribution.criticalCount).toBeGreaterThanOrEqual(0);
        expect(node.riskDistribution.highRiskCount).toBeGreaterThanOrEqual(0);
        expect(node.riskDistribution.morbidityBreakdown).toBeDefined();
        expect(node.riskDistribution.morbidityBreakdown.hypertension).toBeGreaterThanOrEqual(0);
        expect(node.riskDistribution.morbidityBreakdown.diabetes).toBeGreaterThanOrEqual(0);

        // 3. Screening Coverage
        expect(node.screening.targetPopulation).toBeGreaterThan(0);
        expect(node.screening.screenedCount).toBeGreaterThanOrEqual(0);
        expect(node.screening.coveragePercent).toBeGreaterThanOrEqual(0);
        expect(node.screening.coveragePercent).toBeLessThanOrEqual(100);

        // 4. Referral Transit Delays
        expect(node.referrals.totalReferrals).toBeGreaterThanOrEqual(0);
        expect(node.referrals.avgDelayHours).toBeGreaterThan(0);
        expect(node.referrals.primaryDestinationFacility).toBeTruthy();

        // 5. Medicine Shortages & Status
        expect(node.medicineStatus.linkedFacilityName).toBeTruthy();
        expect(node.medicineStatus.inStockRatioPercent).toBeGreaterThanOrEqual(0);
        expect(node.medicineStatus.inStockRatioPercent).toBeLessThanOrEqual(100);
        expect(Array.isArray(node.medicineStatus.criticalShortageDrugs)).toBe(true);

        // 6. Follow-up Adherence
        expect(node.followUps.totalAssigned).toBeGreaterThanOrEqual(0);
        expect(node.followUps.completionRatePercent).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Privacy & PHI Protection Guard", () => {
    it("should strictly redact individual patient identifiers from map payloads", async () => {
      const result = await getDistrictHealthMapData({ userRole: "public" });

      expect(result.privacyPolicy.phiProtectionActive).toBe(true);
      expect(result.privacyPolicy.disclaimer).toContain("Personal health identifiers (PHI) are strictly redacted");

      for (const node of result.villages) {
        expect(node.privacyGuard.isAggregateOnly).toBe(true);
        expect(node.privacyGuard.phiExposed).toBe(false);

        // Ensure no individual patient object, names, or phone numbers exist
        expect((node as any).patients).toBeUndefined();
        expect((node as any).patientList).toBeUndefined();
        expect((node as any).patientName).toBeUndefined();
      }
    });
  });

  describe("Multi-Dimensional Filtering Capabilities", () => {
    it("should filter villages by specific villageId", async () => {
      const result = await getDistrictHealthMapData({ villageId: "karanji_budruk" });

      expect(result.villages.length).toBe(1);
      expect(result.villages[0].villageName.toLowerCase()).toContain("karanji");
    });

    it("should filter villages by linked primary facility", async () => {
      const result = await getDistrictHealthMapData({ facilityId: 1 });

      expect(result.villages.length).toBeGreaterThan(0);
      result.villages.forEach((v) => {
        expect(v.medicineStatus.linkedFacilityId).toBe(1);
      });
    });

    it("should support date range filtering", async () => {
      const allTime = await getDistrictHealthMapData({ dateRange: "all" });
      const last7Days = await getDistrictHealthMapData({ dateRange: "7d" });

      expect(allTime.villages.length).toBeGreaterThan(0);
      expect(last7Days.villages.length).toBeGreaterThan(0);
    });
  });

  describe("tRPC District Health Map Procedures", () => {
    it("districtMap.getMapData should return complete spatial dataset", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());
      const data = await caller.districtMap.getMapData();

      expect(data).toBeDefined();
      expect(data.summary.totalVillages).toBeGreaterThanOrEqual(5);
      expect(data.summary.districtScreeningCoveragePercent).toBeGreaterThan(0);
      expect(data.summary.avgAccessibilityScore).toBeGreaterThan(0);
      expect(data.villages.length).toBeGreaterThanOrEqual(5);
      expect(data.facilities.length).toBeGreaterThanOrEqual(3);
    });

    it("districtMap.getVillageDetail should return specific village intelligence profile", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());
      const detail = await caller.districtMap.getVillageDetail({
        villageId: "karanji_budruk",
      });

      expect(detail).toBeDefined();
      expect(detail.village.villageName).toBe("Karanji Budruk");
      expect(detail.village.population).toBeGreaterThan(0);
      expect(detail.village.accessibility.score).toBeGreaterThan(0);
      expect(detail.districtSummary).toBeDefined();
    });

    it("districtMap.getFilterOptions should return filter dropdown menus", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());
      const options = await caller.districtMap.getFilterOptions();

      expect(options).toBeDefined();
      expect(options.diseaseCategories.length).toBeGreaterThanOrEqual(4);
      expect(options.riskCategories.length).toBe(5);
      expect(options.dateRanges.length).toBe(5);
      expect(options.villages.length).toBeGreaterThanOrEqual(5);
      expect(options.facilities.length).toBeGreaterThanOrEqual(3);
    });
  });
});
