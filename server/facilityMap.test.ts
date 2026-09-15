import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  calculateGeodesicDistanceKm,
  CONFIG_VILLAGES,
  SYNTHETIC_TELEMETRY_DISCLAIMER,
} from "./smartReferralEngine";

function createMockPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

function createMockAshaContext(userId = 8): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `asha-user-${userId}`,
      name: "Geeta Ben (ASHA Facilitator)",
      email: "asha.geeta@arjuna.gov.in",
      loginMethod: "test",
      role: "asha",
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

describe("Healthcare Facility GIS Map & Geospatial Routing", () => {
  describe("Geospatial Calculations & Village Registry", () => {
    it("should calculate accurate geodesic distance with rural road tortuosity factor", () => {
      // Sundarpur (23.012, 72.3508) to Rampura (23.0445, 72.3885)
      const dist = calculateGeodesicDistanceKm(
        23.012,
        72.3508,
        23.0445,
        72.3885
      );
      expect(dist).toBeGreaterThan(4.0);
      expect(dist).toBeLessThan(10.0);

      // Distance to self should be 0
      const distZero = calculateGeodesicDistanceKm(23.012, 72.3508, 23.012, 72.3508);
      expect(distZero).toBe(0);
    });

    it("should provide configured villages with demo coordinates and demographic catchment data", () => {
      expect(CONFIG_VILLAGES.length).toBeGreaterThanOrEqual(5);

      const karanji = CONFIG_VILLAGES.find((v) => v.name === "Karanji Budruk");
      expect(karanji).toBeDefined();
      expect(karanji?.latitude).toBeCloseTo(21.5432, 2);
      expect(karanji?.longitude).toBeCloseTo(74.4521, 2);
      expect(karanji?.population).toBeGreaterThan(1000);
      expect(karanji?.screenedCount).toBeGreaterThan(0);
      expect(karanji?.highRiskCount).toBeGreaterThanOrEqual(0);

      // All villages must have valid coordinates
      CONFIG_VILLAGES.forEach((village) => {
        expect(village.latitude).toBeGreaterThan(16);
        expect(village.latitude).toBeLessThan(23);
        expect(village.longitude).toBeGreaterThan(72);
        expect(village.longitude).toBeLessThan(81);
      });
    });

    it("should include synthetic telemetry disclaimer constant for clinical safety", () => {
      expect(SYNTHETIC_TELEMETRY_DISCLAIMER).toBeDefined();
      expect(SYNTHETIC_TELEMETRY_DISCLAIMER.toLowerCase()).toContain("simulated");
    });
  });

  describe("facilities.getMapData Procedure", () => {
    it("should return enriched facilities, villages, and center coordinates for public users", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());
      const mapData = await caller.facilities.getMapData();

      expect(mapData).toBeDefined();
      expect(mapData.center).toBeDefined();
      expect(mapData.telemetryDisclaimer).toBe(SYNTHETIC_TELEMETRY_DISCLAIMER);
      expect(mapData.isDemoData).toBe(true);

      // Verify villages
      expect(mapData.villages.length).toBeGreaterThanOrEqual(5);
      const karanji = mapData.villages.find((v) => v.name === "Karanji Budruk");
      expect(karanji).toBeDefined();

      // Verify facilities structure
      expect(mapData.facilities.length).toBeGreaterThanOrEqual(4);
      mapData.facilities.forEach((facility) => {
        expect(facility.id).toBeGreaterThan(0);
        expect(facility.name).toBeTruthy();
        expect(facility.facilityType).toBeTruthy();
        expect(facility.latitude).toBeDefined();
        expect(facility.longitude).toBeDefined();
        expect(facility.capabilities).toBeDefined();
        expect(Array.isArray(facility.specialties)).toBe(true);
        expect(facility.inStockMedicines).toBeDefined();
        expect(facility.totalInventoryCount).toBeGreaterThanOrEqual(0);
      });

      // Verify presence of different facility tiers: aam, phc, chc, district_hospital
      const types = mapData.facilities.map((f) => f.facilityType);
      expect(types).toContain("phc");
      expect(types).toContain("chc");
      expect(types).toContain("district_hospital");
    });

    it("should allow ASHA / CHO staff to see real inventory stock counts in getMapData", async () => {
      const caller = appRouter.createCaller(createMockAshaContext());
      const mapData = await caller.facilities.getMapData();

      expect(mapData.facilities.length).toBeGreaterThan(0);
      const facilityWithStock = mapData.facilities.find((f) => f.inStockMedicines.length > 0);
      expect(facilityWithStock).toBeDefined();
      if (facilityWithStock && facilityWithStock.inStockMedicines.length > 0) {
        expect(typeof facilityWithStock.inStockMedicines[0].currentStock).toBe("number");
      }
    });
  });

  describe("facilities.findNearest Geospatial Routing & Appropriateness Engine", () => {
    it("should compute distance, transit time, and suitability score from given coordinates", async () => {
      const caller = appRouter.createCaller(createMockAshaContext());

      // Karanji Budruk village coordinates
      const result = await caller.facilities.findNearest({
        latitude: 21.5432,
        longitude: 74.4521,
      });

      expect(result.origin.latitude).toBe(21.5432);
      expect(result.origin.longitude).toBe(74.4521);
      expect(result.telemetryDisclaimer).toBe(SYNTHETIC_TELEMETRY_DISCLAIMER);
      expect(result.isDemoData).toBe(true);
      expect(result.totalFound).toBeGreaterThan(0);
      expect(result.results.length).toBe(result.totalFound);

      // Check first facility (nearest / most suitable)
      const topFacility = result.results[0];
      expect(topFacility.distanceKm).toBeGreaterThanOrEqual(0);
      expect(topFacility.estimatedTravelMins).toBeGreaterThan(0);
      expect(topFacility.appropriatenessScore).toBeGreaterThanOrEqual(0);
      expect(topFacility.appropriatenessScore).toBeLessThanOrEqual(100);
      expect(topFacility.emergencyCapability).toBeDefined();
      expect(topFacility.emergencyCapability.totalBeds).toBeGreaterThanOrEqual(0);
      expect(topFacility.emergencyCapability.availableBeds).toBeGreaterThanOrEqual(0);
    });

    it("should resolve origin coordinates automatically when originVillage name is passed", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());

      const result = await caller.facilities.findNearest({
        originVillage: "Sonwadi",
      });

      expect(result.origin.name).toBe("Sonwadi");
      expect(result.origin.latitude).toBeCloseTo(21.5120, 2);
      expect(result.origin.longitude).toBeCloseTo(74.4102, 2);
      expect(result.totalFound).toBeGreaterThan(0);
    });

    it("should filter nearest facilities by facilityType", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());

      // Filter only chc
      const chcResult = await caller.facilities.findNearest({
        latitude: 21.5432,
        longitude: 74.4521,
        facilityType: "chc",
      });

      expect(chcResult.totalFound).toBeGreaterThan(0);
      chcResult.results.forEach((f) => {
        expect(f.facilityType).toBe("chc");
      });

      // Filter only district_hospital
      const dhResult = await caller.facilities.findNearest({
        latitude: 23.012,
        longitude: 72.3508,
        facilityType: "district_hospital",
      });

      expect(dhResult.totalFound).toBeGreaterThan(0);
      dhResult.results.forEach((f) => {
        expect(f.facilityType).toBe("district_hospital");
      });
    });

    it("should filter nearest facilities by required specialty with suitability score boost", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());

      const result = await caller.facilities.findNearest({
        latitude: 23.012,
        longitude: 72.3508,
        specialty: "Cardiology",
      });

      expect(result.totalFound).toBeGreaterThan(0);
      const topMatch = result.topMatch;
      expect(topMatch).toBeDefined();
      expect(topMatch?.specialtyMatch).toBe(true);
    });

    it("should filter facilities when 24x7 emergency capability is required", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());

      const result = await caller.facilities.findNearest({
        latitude: 23.012,
        longitude: 72.3508,
        emergencyRequired: true,
      });

      expect(result.totalFound).toBeGreaterThan(0);
      result.results.forEach((f) => {
        expect(f.emergencyCapability.is24x7).toBe(true);
      });
    });

    it("should evaluate medicine stock availability and set status appropriately", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());

      const result = await caller.facilities.findNearest({
        latitude: 23.012,
        longitude: 72.3508,
        requiredMedicine: "Paracetamol",
      });

      expect(result.totalFound).toBeGreaterThan(0);
      const facilityWithMed = result.results.find((f) => f.medicineStockStatus === "AVAILABLE" || f.medicineStockStatus === "LOW STOCK");
      expect(facilityWithMed).toBeDefined();
      if (facilityWithMed) {
        expect(facilityWithMed.matchedMedicineName?.toLowerCase()).toContain("paracetamol");
      }
    });

    it("should rank facilities with proximity and clinical appropriateness", async () => {
      const caller = appRouter.createCaller(createMockPublicContext());

      const result = await caller.facilities.findNearest({
        latitude: 23.012,
        longitude: 72.3508,
      });

      expect(result.results.length).toBeGreaterThan(1);
      // Top facility should have highest or tied-highest appropriateness score
      expect(result.results[0].appropriatenessScore).toBeGreaterThanOrEqual(
        result.results[result.results.length - 1].appropriatenessScore
      );
    });
  });
});
