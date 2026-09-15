import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  getDistrictCommandCenterData,
  AI_OPERATIONAL_INSIGHT_DISCLAIMER,
} from "./districtCommandCenterService";

function createMockPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("Final District Health Command Center (Executive Intelligence)", () => {
  describe("All 8 Core KPI Cards", () => {
    it("should compute all 8 real-time KPI metrics from backend database", async () => {
      const data = await getDistrictCommandCenterData();

      expect(data).toBeDefined();
      expect(data.kpis).toBeDefined();

      // 1. registered patients
      expect(data.kpis.registeredPatients).toBeGreaterThan(0);

      // 2. today's screenings
      expect(data.kpis.todaysScreenings).toBeGreaterThanOrEqual(0);

      // 3. high-risk patients
      expect(data.kpis.highRiskPatients).toBeGreaterThanOrEqual(0);

      // 4. active referrals
      expect(data.kpis.activeReferrals).toBeGreaterThanOrEqual(0);

      // 5. referral completion rate
      expect(data.kpis.referralCompletionRatePercent).toBeGreaterThanOrEqual(0);
      expect(data.kpis.referralCompletionRatePercent).toBeLessThanOrEqual(100);

      // 6. missed follow-ups
      expect(data.kpis.missedFollowUps).toBeGreaterThanOrEqual(0);

      // 7. medicine stock alerts
      expect(data.kpis.medicineStockAlerts).toBeGreaterThanOrEqual(0);

      // 8. active campaigns
      expect(data.kpis.activeCampaigns).toBeGreaterThanOrEqual(0);
    });
  });

  describe("All 5 Analytical Charts Datasets", () => {
    it("should generate datasets for all 5 requested visualizations", async () => {
      const data = await getDistrictCommandCenterData();

      // 1. Screening trend
      expect(data.charts.screeningTrend).toBeDefined();
      expect(data.charts.screeningTrend.length).toBeGreaterThanOrEqual(7);
      data.charts.screeningTrend.forEach((p) => {
        expect(p.period).toBeTruthy();
        expect(p.screenings).toBeGreaterThanOrEqual(0);
        expect(p.targetPace).toBeGreaterThan(0);
      });

      // 2. Risk distribution & conditions
      expect(data.charts.riskDistribution).toBeDefined();
      expect(data.charts.riskDistribution.length).toBe(4);
      expect(data.charts.conditionBreakdown.length).toBeGreaterThanOrEqual(4);

      // 3. Referral performance
      expect(data.charts.referralPerformance).toBeDefined();
      expect(data.charts.referralPerformance.length).toBeGreaterThanOrEqual(3);
      expect(data.charts.referralUrgency.length).toBe(3);

      // 4. Medicine stock
      expect(data.charts.medicineStock).toBeDefined();
      expect(data.charts.medicineStock.length).toBeGreaterThanOrEqual(4);
      data.charts.medicineStock.forEach((m) => {
        expect(m.category).toBeTruthy();
        expect(m.inStock).toBeGreaterThanOrEqual(0);
      });

      // 5. Follow-up completion
      expect(data.charts.followUpCompletion).toBeDefined();
      expect(data.charts.followUpCompletion.length).toBe(3);
      expect(data.charts.villageFollowUpAdherence.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("AI-Generated Operational Insights & Labeling", () => {
    it("should generate insights clearly labeled as AI-GENERATED OPERATIONAL INSIGHT", async () => {
      const data = await getDistrictCommandCenterData();

      expect(data.aiOperationalInsights).toBeDefined();
      expect(data.aiOperationalInsights.length).toBeGreaterThanOrEqual(3);

      data.aiOperationalInsights.forEach((insight) => {
        // Must be explicitly labeled
        expect(insight.badge).toBe("AI-GENERATED OPERATIONAL INSIGHT");
        expect(insight.title).toBeTruthy();
        expect(insight.description).toBeTruthy();
        expect(insight.recommendation).toBeTruthy();

        // Must include safety disclaimer
        expect(insight.disclaimer).toBe(AI_OPERATIONAL_INSIGHT_DISCLAIMER);
        expect(insight.disclaimer.toLowerCase()).toContain("not a medical diagnosis or confirmed epidemiological outbreak");
      });
    });
  });

  describe("tRPC commandCenter Router Procedures", () => {
    it("commandCenter.getExecutiveSummary should reject unauthenticated requests", async () => {
      const publicCaller = appRouter.createCaller(createMockPublicContext());
      await expect(publicCaller.commandCenter.getExecutiveSummary()).rejects.toThrow(/Please login/i);
    });

    it("commandCenter.getExecutiveSummary should return full dashboard state for authorized administrators", async () => {
      const adminCtx: TrpcContext = {
        user: {
          id: 1,
          openId: "admin-user",
          name: "District Health Officer",
          email: "dho@gujarat.gov.in",
          loginMethod: "test",
          role: "administrator",
          facilityId: 4,
          district: "Ahmedabad Rural",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        },
        req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
        res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(adminCtx);
      const res = await caller.commandCenter.getExecutiveSummary();

      expect(res).toBeDefined();
      expect(res.kpis.registeredPatients).toBeGreaterThan(0);
      expect(res.charts.screeningTrend.length).toBe(7);
      expect(res.aiOperationalInsights.length).toBeGreaterThanOrEqual(3);
      expect(res.summaryNotes.healthOfficer).toContain("Nandurbar");
    });
  });
});
