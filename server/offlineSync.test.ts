import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  getPatients,
  getPatientTimeline,
  seedDemoData,
} from "./db";

function createMockAshaContext(userId = 2, facilityId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `asha-user-${userId}`,
      name: "Sunita Devi",
      email: "sunita.asha@arjuna.gov.in",
      loginMethod: "test",
      role: "asha_cho",
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

describe("Offline-First ASHA Field Synchronization Engine", () => {
  beforeEach(() => {
    seedDemoData();
  });

  it("successfully syncs a full offline field chain (Household -> Patient -> Vitals/Screening -> Referral) with ID remapping", async () => {
    const ctx = createMockAshaContext(2, 1);
    const caller = appRouter.createCaller(ctx);

    const tempHhId = `temp_hh_${Date.now()}`;
    const tempPatId = `temp_pat_${Date.now()}`;
    const uniqueSuffix = Math.floor(Math.random() * 10000);

    const mutations = [
      {
        uuid: `mut-hh-${uniqueSuffix}`,
        entity: "household" as const,
        operation: "CREATE" as const,
        clientTempId: tempHhId,
        timestamp: Date.now() - 4000,
        retryCount: 0,
        payload: {
          headName: `Patel Family ${uniqueSuffix}`,
          village: "Sundarpur",
          district: "Ahmedabad Rural",
          contact: `+91 99887 ${uniqueSuffix}`,
        },
      },
      {
        uuid: `mut-pat-${uniqueSuffix}`,
        entity: "patient" as const,
        operation: "CREATE" as const,
        clientTempId: tempPatId,
        timestamp: Date.now() - 3000,
        retryCount: 0,
        payload: {
          name: `Rameshbhai Patel ${uniqueSuffix}`,
          age: 48,
          gender: "male",
          village: "Sundarpur",
          district: "Ahmedabad Rural",
          contact: `+91 99887 ${uniqueSuffix}`,
          householdId: tempHhId, // references upstream temp ID
          conditions: "Hypertension",
        },
      },
      {
        uuid: `mut-scr-${uniqueSuffix}`,
        entity: "screening" as const,
        operation: "CREATE" as const,
        timestamp: Date.now() - 2000,
        retryCount: 0,
        payload: {
          patientId: tempPatId, // references upstream temp ID
          bpSystolic: 155,
          bpDiastolic: 96,
          glucose: 165,
          spo2: 97,
          weight: 70,
          temperature: 98.6,
          symptoms: "Headache, blurred vision",
          notes: "Recorded during offline morning field outreach",
        },
      },
      {
        uuid: `mut-ref-${uniqueSuffix}`,
        entity: "referral" as const,
        operation: "CREATE" as const,
        timestamp: Date.now() - 1000,
        retryCount: 0,
        payload: {
          patientId: tempPatId, // references upstream temp ID
          targetFacilityId: 3,
          specialty: "General Medicine",
          urgency: "urgent",
          reason: "Stage 2 Hypertension with symptoms identified in offline screening",
        },
      },
    ];

    const result = await caller.offline.sync({ mutations });

    expect(result.success).toBe(true);
    expect(result.processedCount).toBe(4);
    expect(result.results).toHaveLength(4);

    // Verify Household mutation result
    const hhResult = result.results.find((r) => r.uuid === `mut-hh-${uniqueSuffix}`);
    expect(hhResult).toBeDefined();
    expect(hhResult?.status).toBe("synced");
    expect(typeof hhResult?.serverEntityId).toBe("number");

    // Verify Patient mutation result
    const patResult = result.results.find((r) => r.uuid === `mut-pat-${uniqueSuffix}`);
    expect(patResult).toBeDefined();
    expect(patResult?.status).toBe("synced");
    expect(typeof patResult?.serverEntityId).toBe("number");

    // Verify Screening mutation result
    const scrResult = result.results.find((r) => r.uuid === `mut-scr-${uniqueSuffix}`);
    expect(scrResult).toBeDefined();
    expect(scrResult?.status).toBe("synced");
    expect(typeof scrResult?.serverEntityId).toBe("number");

    // Verify Referral mutation result
    const refResult = result.results.find((r) => r.uuid === `mut-ref-${uniqueSuffix}`);
    expect(refResult).toBeDefined();
    expect(refResult?.status).toBe("synced");
    expect(typeof refResult?.serverEntityId).toBe("number");

    // Verify server database state
    const allPatients = await getPatients(200);
    const createdPatient = allPatients.find((p) => p.id === patResult?.serverEntityId);
    expect(createdPatient).toBeDefined();
    expect(createdPatient?.name).toBe(`Rameshbhai Patel ${uniqueSuffix}`);
    expect(createdPatient?.householdId).toBe(hhResult?.serverEntityId);

    const timeline = await getPatientTimeline(createdPatient!.id);
    expect(timeline.visits.length).toBeGreaterThanOrEqual(1);
    expect(timeline.visits.some((v) => v.bpSystolic === 155 && v.bpDiastolic === 96)).toBe(true);
    expect(timeline.referrals.length).toBeGreaterThanOrEqual(1);
    expect(timeline.referrals.some((r) => r.specialty === "General Medicine" && r.urgency === "urgent")).toBe(true);
  });

  it("handles duplicate patient conflict gracefully without losing record link", async () => {
    const ctx = createMockAshaContext(2, 1);
    const caller = appRouter.createCaller(ctx);

    const allPatients = await getPatients(20);
    const existingPatient = allPatients[0];
    const tempPatId = `temp_dup_${Date.now()}`;

    const mutations = [
      {
        uuid: `mut-dup-pat-${Date.now()}`,
        entity: "patient" as const,
        operation: "CREATE" as const,
        clientTempId: tempPatId,
        timestamp: Date.now() - 2000,
        retryCount: 0,
        payload: {
          name: existingPatient.name,
          age: existingPatient.age,
          gender: existingPatient.gender,
          village: existingPatient.village,
          district: existingPatient.district,
        },
      },
      {
        uuid: `mut-dup-scr-${Date.now()}`,
        entity: "screening" as const,
        operation: "CREATE" as const,
        timestamp: Date.now() - 1000,
        retryCount: 0,
        payload: {
          patientId: tempPatId,
          bpSystolic: 130,
          bpDiastolic: 85,
          glucose: 110,
          spo2: 99,
          symptoms: "Routine checkup",
        },
      },
    ];

    const result = await caller.offline.sync({ mutations });

    expect(result.success).toBe(true);
    const patResult = result.results[0];
    expect(patResult.status).toBe("conflict");
    expect(patResult.serverEntityId).toBe(existingPatient.id);

    const scrResult = result.results[1];
    expect(scrResult.status).toBe("synced");
    expect(typeof scrResult.serverEntityId).toBe("number");

    // Visit should be attached to the existing patient ID mapped through conflict
    const timeline = await getPatientTimeline(existingPatient.id);
    expect(timeline.visits.some((v) => v.bpSystolic === 130 && v.bpDiastolic === 85)).toBe(true);
  });

  it("isolates errors for invalid mutations while processing valid ones in the batch", async () => {
    const ctx = createMockAshaContext(2, 1);
    const caller = appRouter.createCaller(ctx);

    const validSuffix = Math.floor(Math.random() * 10000);
    const mutations = [
      {
        uuid: "mut-invalid-1",
        entity: "patient" as const,
        operation: "CREATE" as const,
        timestamp: Date.now() - 2000,
        retryCount: 0,
        payload: {
          // Missing required 'name' field
          age: 30,
          village: "Sundarpur",
        },
      },
      {
        uuid: "mut-valid-1",
        entity: "household" as const,
        operation: "CREATE" as const,
        timestamp: Date.now() - 1000,
        retryCount: 0,
        payload: {
          headName: `Valid Family ${validSuffix}`,
          village: "Sundarpur",
          district: "Ahmedabad Rural",
        },
      },
    ];

    const result = await caller.offline.sync({ mutations });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].uuid).toBe("mut-invalid-1");
    expect(result.results[0].status).toBe("failed");
    expect(result.results[0].error).toBeDefined();

    expect(result.results[1].uuid).toBe("mut-valid-1");
    expect(result.results[1].status).toBe("synced");
    expect(typeof result.results[1].serverEntityId).toBe("number");
  });

  it("supports legacy event format replay seamlessly", async () => {
    const ctx = createMockAshaContext(2, 1);
    const caller = appRouter.createCaller(ctx);

    const legacySuffix = Math.floor(Math.random() * 10000);
    const events = [
      {
        type: "HOUSEHOLD_CREATED" as const,
        payload: {
          headName: `Legacy Head ${legacySuffix}`,
          village: "Sundarpur",
          district: "Ahmedabad Rural",
        },
      },
      {
        type: "SCREENING_RECORDED" as const,
        payload: {
          patientId: 1,
          bpSystolic: 124,
          bpDiastolic: 80,
          glucose: 105,
          spo2: 99,
          symptoms: "None",
        },
      },
    ];

    const result = await caller.offline.sync({ events });
    expect(result.success).toBe(true);
    expect(result.processedCount).toBe(2);
    expect(result.results.every((r) => r.status === "synced")).toBe(true);
  });
});
