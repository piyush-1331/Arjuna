import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  rankFacilitiesForReferral,
  SYNTHETIC_TELEMETRY_DISCLAIMER,
  SMART_FACILITIES_REGISTRY,
  REFERRAL_STATUSES,
} from "./smartReferralEngine";
import {
  getReferralTimeline,
  getReferralById,
  updateReferralLifecycleStatus,
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

function createMockStaffContext(userId = 12, facilityId = 4): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `staff-user-${userId}`,
      name: "Ramesh Sharma (Desk In-charge)",
      email: "staff@hospital.gov.in",
      loginMethod: "test",
      role: "facility_staff",
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

function createMockAshaContext(userId = 8): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `asha-user-${userId}`,
      name: "Savita Ben (ASHA)",
      email: "savita.asha@arjuna.gov.in",
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

function createMockCitizenContext(userId = 99): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `citizen-user-${userId}`,
      name: "Meena Patel",
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

describe("Smart Referral Engine - Multi-Factor Ranking & Scoring", () => {
  it("computes recommendation score accurately matching the prompt example (District Hospital, 18km -> ~94)", () => {
    const results = rankFacilitiesForReferral({
      originVillage: "Sundarpur",
      specialty: "Cardiology",
      urgency: "emergency",
    });

    expect(results.length).toBeGreaterThan(0);
    const districtHospital = results.find((r) => r.facility.name.includes("District Hospital"));
    expect(districtHospital).toBeDefined();

    if (districtHospital) {
      expect(districtHospital.facility.name).toContain("District Hospital");
      expect(districtHospital.emergencyCapable).toBe(true);
      expect(districtHospital.doctorAvailable).toBe(true);
      expect(districtHospital.recommendationScore).toBeGreaterThanOrEqual(90);
      expect(districtHospital.scoreBreakdown.specialtyMatch).toBe(30);
      expect(districtHospital.scoreBreakdown.emergencyCapability).toBe(15);
      expect(districtHospital.scoreBreakdown.doctorAvailability).toBe(15);
    }
  });

  it("prioritizes emergency capabilities and 24/7 ICU for emergency acuity cases", () => {
    const emergencyResults = rankFacilitiesForReferral({
      originVillage: "Sundarpur",
      urgency: "emergency",
    });

    // Top recommended facility should have emergency capabilities and highest ranking score
    const topPick = emergencyResults[0];
    expect(topPick.recommendationScore).toBeGreaterThanOrEqual(90);
    expect(topPick.emergencyCapable).toBe(true);
  });

  it("handles distance calculations and ranks facilities in descending order of score", () => {
    const routineResults = rankFacilitiesForReferral({
      originVillage: "Sundarpur",
      specialty: "General Medicine",
      urgency: "routine",
    });

    expect(routineResults.length).toBe(SMART_FACILITIES_REGISTRY.length);
    // Should be sorted in descending order of recommendationScore
    for (let i = 0; i < routineResults.length - 1; i++) {
      expect(routineResults[i].recommendationScore).toBeGreaterThanOrEqual(routineResults[i + 1].recommendationScore);
    }
  });

  it("includes synthetic demo telemetry disclaimer across all outputs", () => {
    expect(SYNTHETIC_TELEMETRY_DISCLAIMER).toContain("Simulated/Synthetic Demo Availability");
    expect(SYNTHETIC_TELEMETRY_DISCLAIMER).toContain("not live tele-telemetry");
  });

  it("supports all 8 referral lifecycle statuses", () => {
    const expectedStatuses = [
      "PENDING",
      "ACCEPTED",
      "TRANSPORT_ASSIGNED",
      "DEPARTED",
      "ARRIVED",
      "CONSULTED",
      "COMPLETED",
      "CANCELLED",
    ];
    expect(REFERRAL_STATUSES).toEqual(expectedStatuses);
  });
});

describe("Smart Referral Engine - tRPC Endpoints & Workflows", () => {
  it("allows doctors to request facility recommendations via referrals.recommend", async () => {
    const doctorCaller = appRouter.createCaller(createMockDoctorContext());
    const res = await doctorCaller.referrals.recommend({
      patientId: 1,
      specialty: "Cardiology",
      urgency: "emergency",
      originVillage: "Sundarpur",
    });

    expect(res.originVillage).toBe("Sundarpur");
    expect(res.telemetryDisclaimer).toBe(SYNTHETIC_TELEMETRY_DISCLAIMER);
    expect(res.recommendations.length).toBeGreaterThan(0);
    expect(res.topRecommendation).toBeDefined();
    expect(res.topRecommendation?.facility.emergencyCapability.is24x7).toBe(true);
    expect(res.topRecommendation?.recommendationScore).toBeGreaterThanOrEqual(90);
  });

  it("allows healthcare workers to confirm a referral with score and transport details", async () => {
    const doctorCaller = appRouter.createCaller(createMockDoctorContext());
    const createdReferral = await doctorCaller.referrals.confirm({
      patientId: 1,
      targetFacilityId: 4,
      specialty: "Cardiology",
      urgency: "emergency",
      reason: "Acute chest pain with radiating pain to left arm. ECG shows ST elevation.",
      recommendationScore: 94,
      distanceKm: 18,
      transportRequired: true,
      transportType: "108 Emergency Ambulance (GJ-01-AB-1088)",
    });

    expect(createdReferral).toBeDefined();
    expect(createdReferral.id).toBeGreaterThan(0);
    expect(createdReferral.status).toBe("TRANSPORT_ASSIGNED");
    expect(createdReferral.recommendationScore).toBe(94);
    expect(createdReferral.distanceKm).toBe("18");
    expect(createdReferral.transportVehicle).toContain("108 Emergency Ambulance");
  });

  it("records timestamped referral event timeline across all 8 status transitions", async () => {
    const doctorCaller = appRouter.createCaller(createMockDoctorContext());
    const staffCaller = appRouter.createCaller(createMockStaffContext());

    // 1. Create referral
    const createdReferral = await doctorCaller.referrals.confirm({
      patientId: 1,
      targetFacilityId: 4,
      specialty: "Orthopedics",
      urgency: "urgent",
      reason: "Complex compound fracture requiring surgical reduction",
      recommendationScore: 88,
      distanceKm: 18,
      transportRequired: false,
    });

    const referralId = createdReferral.id;

    // 2. ACCEPTED
    await staffCaller.referrals.updateStatus({
      id: referralId,
      status: "ACCEPTED",
      notes: "District Hospital Trauma Bay 2 prepped and orthopedic surgeon alerted",
    });

    // 3. TRANSPORT_ASSIGNED
    await staffCaller.referrals.updateStatus({
      id: referralId,
      status: "TRANSPORT_ASSIGNED",
      transportVehicle: "108 ALS Ambulance (GJ-01-AB-9922)",
      transportDriverContact: "+91 98221 00108",
      notes: "Ambulance dispatched from Sundarpur Sub-Centre",
    });

    // 4. DEPARTED
    await staffCaller.referrals.updateStatus({
      id: referralId,
      status: "DEPARTED",
      notes: "Patient on-board with paramedic; en route via State Highway 17",
    });

    // 5. ARRIVED
    await staffCaller.referrals.updateStatus({
      id: referralId,
      status: "ARRIVED",
      notes: "Ambulance arrived at District Hospital emergency gate",
    });

    // 6. CONSULTED
    await staffCaller.referrals.updateStatus({
      id: referralId,
      status: "CONSULTED",
      notes: "Orthopedic consultation and fluoroscopy complete; plaster cast applied",
    });

    // 7. COMPLETED
    await staffCaller.referrals.updateStatus({
      id: referralId,
      status: "COMPLETED",
      outcome: "Patient stabilized, cast immobilized, scheduled for 2-week follow-up",
      notes: "Discharged back to Sundarpur with rehabilitation plan",
    });

    // 8. Verify complete timeline
    const timelineRes = await doctorCaller.referrals.getTimeline({ id: referralId });
    expect(timelineRes.referral.status).toBe("COMPLETED");
    expect(timelineRes.referral.completedAt).toBeDefined();
    expect(timelineRes.events.length).toBe(7); // PENDING + 6 updates
    expect(timelineRes.events.map((e) => e.status)).toEqual([
      "PENDING",
      "ACCEPTED",
      "TRANSPORT_ASSIGNED",
      "DEPARTED",
      "ARRIVED",
      "CONSULTED",
      "COMPLETED",
    ]);

    // Timestamps check
    for (const event of timelineRes.events) {
      expect(event.createdAt).toBeDefined();
      expect(event.actorRole).toBeDefined();
    }
  });

  it("prevents citizens from mutating referral lifecycle statuses (Authorization Enforcement)", async () => {
    const citizenCaller = appRouter.createCaller(createMockCitizenContext());

    await expect(
      citizenCaller.referrals.updateStatus({
        id: 1,
        status: "ARRIVED",
        notes: "I have arrived at the hospital",
      })
    ).rejects.toThrow(/Only authorized healthcare workers/i);
  });

  it("allows citizens to view their own referral details and timelines via citizenList", async () => {
    const citizenCaller = appRouter.createCaller(createMockCitizenContext());
    const citizenReferrals = await citizenCaller.referrals.citizenList();

    expect(Array.isArray(citizenReferrals)).toBe(true);
    expect(citizenReferrals.length).toBeGreaterThan(0);
    const firstRef = citizenReferrals[0];
    expect(firstRef.events).toBeDefined();
    expect(firstRef.targetFacilityName).toBeDefined();
  });
});
