import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  getCampaignsWithStats,
  getVillagePrioritization,
  createHealthCampaign,
  updateCampaignStatus,
  AI_CAMPAIGN_PRIORITIZATION_DISCLAIMER,
} from "./campaignManagementService";

function createMockAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      name: "Chief District Health Officer",
      email: "cdho@ahmedabad.gov.in",
      role: "administrator",
      loginMethod: "local",
      district: "Ahmedabad Rural",
      facilityId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("Health Campaign Management & AI-Assisted Village Prioritization", () => {
  describe("Campaign Creation & Administrative Field Validation", () => {
    it("should allow administrators to create campaigns across all standard categories", async () => {
      const categories = [
        {
          name: "Mukhyamantri Diabetes Screening Drive",
          category: "diabetes_screening" as const,
          description: "Universal diabetes screening with fasting glucose and HbA1c tests.",
          targetVillages: ["Sundarpur", "Rampura"],
          targetPopulation: 450,
        },
        {
          name: "Universal Hypertension & CVD Detection",
          category: "hypertension_screening" as const,
          description: "Digital BP screening and cardiovascular risk stratification.",
          targetVillages: ["Sanand"],
          targetPopulation: 300,
        },
        {
          name: "Pradhan Mantri Matritva ANC Outreach",
          category: "maternal_health" as const,
          description: "High-risk pregnancy identification and ultrasound referral.",
          targetVillages: ["Rampura", "Bavla"],
          targetPopulation: 180,
        },
        {
          name: "POSHAN Abhiyaan & Anemia Eradication",
          category: "nutrition" as const,
          description: "MUAC measurement and digital hemoglobinometry for mothers & children.",
          targetVillages: ["Bavla"],
          targetPopulation: 500,
        },
        {
          name: "Mission Indradhanush Immunization Awareness",
          category: "immunization" as const,
          description: "Zero-dose catchup immunization drive for 0-2 year infants.",
          targetVillages: ["Vasna", "Dholka"],
          targetPopulation: 250,
        },
      ];

      for (const cat of categories) {
        const res = await createHealthCampaign({
          name: cat.name,
          category: cat.category,
          description: cat.description,
          district: "Ahmedabad Rural",
          targetVillages: cat.targetVillages,
          targetPopulation: cat.targetPopulation,
          startDate: new Date(),
          endDate: new Date(Date.now() + 21 * 86400000),
          assignedWorkers: ["ASHA Lead", "CHO Staff", "Medical Officer"],
          status: "active",
        });

        expect(res).toBeDefined();
        expect(res.id).toBeGreaterThan(0);
        expect(res.message).toContain(cat.name);
      }
    });
  });

  describe("Multi-Dimensional Campaign Tracking", () => {
    it("should track target population, screened, high-risk, referrals, follow-ups, and completion %", async () => {
      const { campaigns, summary } = await getCampaignsWithStats("Ahmedabad Rural");

      expect(campaigns.length).toBeGreaterThanOrEqual(4);
      expect(summary.totalCampaigns).toBeGreaterThanOrEqual(4);
      expect(summary.totalTargetPopulation).toBeGreaterThan(0);

      campaigns.forEach((c) => {
        // 1. target population
        expect(c.targetPopulation).toBeGreaterThan(0);

        // 2. screened
        expect(c.screenedCount).toBeGreaterThanOrEqual(0);

        // 3. high-risk identified
        expect(c.highRiskDetected).toBeGreaterThanOrEqual(0);

        // 4. referrals generated
        expect(c.referralsCount).toBeGreaterThanOrEqual(0);

        // 5. follow-ups logged
        expect(c.followUpsCount).toBeGreaterThanOrEqual(0);

        // 6. completion %
        expect(c.completionPercent).toBeGreaterThanOrEqual(0);
        expect(c.completionPercent).toBeLessThanOrEqual(100);

        // Pacing status
        expect(["ahead", "on_track", "behind"]).toContain(c.pacingStatus);

        // Status
        expect(["planned", "active", "completed", "paused"]).toContain(c.status);
      });
    });
  });

  describe("AI-Assisted Village Prioritization & Decision Support", () => {
    it("should compute prioritization using coverage, high-risk concentration, population, and previous performance", async () => {
      const res = await getVillagePrioritization("Ahmedabad Rural");

      expect(res).toBeDefined();
      expect(res.badge).toBe("AI DECISION SUPPORT: VILLAGE PRIORITIZATION");
      expect(res.disclaimer).toBe(AI_CAMPAIGN_PRIORITIZATION_DISCLAIMER);
      expect(res.disclaimer.toLowerCase()).toContain("decision support");
      expect(res.disclaimer.toLowerCase()).toContain("not a clinical diagnosis or epidemiological outbreak");

      expect(res.prioritizedVillages.length).toBeGreaterThan(0);

      // Verify descending rank order
      for (let i = 0; i < res.prioritizedVillages.length - 1; i++) {
        expect(res.prioritizedVillages[i].priorityScore).toBeGreaterThanOrEqual(
          res.prioritizedVillages[i + 1].priorityScore
        );
        expect(res.prioritizedVillages[i].rank).toBe(i + 1);
      }

      res.prioritizedVillages.forEach((node) => {
        expect(node.villageName).toBeTruthy();
        expect(node.priorityScore).toBeGreaterThanOrEqual(0);
        expect(node.priorityScore).toBeLessThanOrEqual(100);
        expect(node.screeningCoveragePercent).toBeGreaterThanOrEqual(0);
        expect(node.highRiskCount).toBeGreaterThanOrEqual(0);
        expect(node.population).toBeGreaterThan(0);
        expect(node.previousAdherencePercent).toBeGreaterThanOrEqual(0);
        expect(node.primaryDrivers.length).toBeGreaterThan(0);

        // Recommended Campaign
        expect(node.recommendedCampaign.name).toBeTruthy();
        expect(node.recommendedCampaign.category).toBeTruthy();
        expect(node.recommendedCampaign.targetBeneficiaries).toBeGreaterThan(0);
        expect(node.recommendedCampaign.suggestedStaffing.length).toBeGreaterThan(0);

        // Safety disclaimer
        expect(node.badge).toBe("AI DECISION SUPPORT: VILLAGE PRIORITIZATION");
        expect(node.disclaimer).toBe(AI_CAMPAIGN_PRIORITIZATION_DISCLAIMER);
      });
    });
  });

  describe("Campaign Status Updates", () => {
    it("should allow administrators to update campaign status (planned, active, paused, completed)", async () => {
      const { campaigns } = await getCampaignsWithStats("Ahmedabad Rural");
      const targetId = campaigns[0].id;

      const pauseRes = await updateCampaignStatus(targetId, "paused");
      expect(pauseRes.success).toBe(true);

      const activeRes = await updateCampaignStatus(targetId, "active");
      expect(activeRes.success).toBe(true);
    });
  });

  describe("tRPC campaigns Router Procedures", () => {
    it("campaigns.getExecutiveSummary and campaigns.getPrioritization should return valid data", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());

      const summaryRes = await caller.campaigns.getExecutiveSummary();
      expect(summaryRes.campaigns.length).toBeGreaterThan(0);
      expect(summaryRes.summary.totalCampaigns).toBeGreaterThan(0);

      const prioRes = await caller.campaigns.getPrioritization();
      expect(prioRes.badge).toBe("AI DECISION SUPPORT: VILLAGE PRIORITIZATION");
      expect(prioRes.prioritizedVillages.length).toBeGreaterThan(0);

      const createRes = await caller.campaigns.create({
        name: "Test Diabetes Screening Drive",
        category: "diabetes_screening",
        description: "Test description",
        targetVillages: ["Sundarpur"],
        targetPopulation: 200,
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 86400000),
        assignedWorkers: ["ASHA Lead"],
        status: "active",
      });
      expect(createRes.id).toBeGreaterThan(0);
    });
  });
});
