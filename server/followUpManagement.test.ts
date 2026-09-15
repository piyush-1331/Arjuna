import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  createFollowUp,
  getFollowUpById,
  getFollowUps,
  completeFollowUp,
  cancelFollowUp,
  detectOverdueFollowUps,
  markOverdueFollowUps,
  getHealthWorkers,
  getAlerts,
  seedDemoData,
} from "./db";

function createMockDoctorContext(userId = 5, facilityId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `doctor-user-${userId}`,
      name: "Dr. Rajesh Sharma",
      email: "dr.rajesh@arjuna.gov.in",
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

function createMockCitizenContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `citizen-user-${userId}`,
      name: "Meena Patel",
      email: "meena.patel@example.com",
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

describe("Follow-up Management System", () => {
  beforeEach(async () => {
    await seedDemoData();
  });

  describe("1. Doctor Follow-up Scheduling", () => {
    it("successfully schedules a follow-up directive with all 6 required fields", async () => {
      const doctorCaller = appRouter.createCaller(createMockDoctorContext(5));
      const dueAt = new Date(Date.now() + 5 * 86400000); // 5 days ahead

      const result = await doctorCaller.followUps.schedule({
        patientId: 1,
        assignedTo: 2, // Sunita Devi (ASHA)
        dueAt,
        reason: "Post-Hospitalization Antihypertensive Evaluation",
        referralId: 1,
        notes: "Check BP morning and evening. Verify adherence to Telmisartan 40mg.",
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");

      // Verify the persisted follow-up record
      const record = await getFollowUpById(result.id);
      expect(record).toBeDefined();
      expect(record!.patientId).toBe(1);
      expect(record!.assignedTo).toBe(2);
      expect(record!.reason).toBe("Post-Hospitalization Antihypertensive Evaluation");
      expect(record!.referralId).toBe(1);
      expect(record!.notes).toContain("Telmisartan 40mg");
      expect(record!.status).toBe("OPEN");

      // Verify enriched details
      expect(record!.patientName).toBe("Ramesh Patel");
      expect(record!.workerName).toBe("Sunita More");
      expect(record!.workerRole).toBe("ASHA Worker");
      expect(record!.workerContact).toBeDefined();
    });

    it("provides available health workers directory for assignment", async () => {
      const doctorCaller = appRouter.createCaller(createMockDoctorContext(5));
      const workers = await doctorCaller.followUps.getWorkers();

      expect(Array.isArray(workers)).toBe(true);
      expect(workers.length).toBeGreaterThanOrEqual(4);
      expect(workers.some((w) => w.name === "Sunita More" && w.role === "asha")).toBe(true);
      expect(workers.some((w) => w.name === "Rahul Jadhav" && w.role === "cho")).toBe(true);
    });

    it("supports backward-compatible followUps.create alias", async () => {
      const doctorCaller = appRouter.createCaller(createMockDoctorContext(5));
      const dueAt = new Date(Date.now() + 7 * 86400000);

      const result = await doctorCaller.followUps.create({
        patientId: 2,
        assignedTo: 4, // Rajesh Solanki
        title: "Check blood sugar levels",
        dueAt,
        notes: "Fasting glucose check before breakfast",
      });

      expect(result).toHaveProperty("id");
      const record = await getFollowUpById(result.id);
      expect(record!.patientId).toBe(2);
      expect(record!.reason).toBe("Check blood sugar levels");
    });
  });

  describe("2. Lifecycle Statuses & Automatic Status Computation", () => {
    it("computes status OPEN for future dates beyond 48 hours", async () => {
      const futureDate = new Date(Date.now() + 5 * 86400000);
      const id = await createFollowUp({
        patientId: 1,
        assignedTo: 2,
        reason: "Routine quarterly screening",
        dueAt: futureDate,
      });

      const record = await getFollowUpById(id);
      expect(record!.status).toBe("OPEN");
    });

    it("computes status DUE_SOON when due within 48 hours", async () => {
      const dueSoonDate = new Date(Date.now() + 24 * 3600000); // 24 hours ahead
      const id = await createFollowUp({
        patientId: 1,
        assignedTo: 2,
        reason: "Urgent post-op BP verification",
        dueAt: dueSoonDate,
      });

      const record = await getFollowUpById(id);
      expect(record!.status).toBe("DUE_SOON");
    });

    it("computes status OVERDUE when due date is in the past", async () => {
      const pastDate = new Date(Date.now() - 2 * 86400000); // 2 days in the past
      const id = await createFollowUp({
        patientId: 1,
        assignedTo: 2,
        reason: "Missed clinical encounter check",
        dueAt: pastDate,
      });

      const record = await getFollowUpById(id);
      expect(record!.status).toBe("OVERDUE");
    });
  });

  describe("3. Automatic Overdue & Due-Soon Detection Engine", () => {
    it("detects and transitions overdue follow-ups, dispatching worker alerts", async () => {
      // Create an open follow-up with past due date
      const pastDate = new Date(Date.now() - 3 * 86400000);
      const id = await createFollowUp({
        patientId: 1,
        assignedTo: 2,
        reason: "Overdue home vitals screening",
        dueAt: pastDate,
      });

      // Run detection engine via tRPC procedure
      const doctorCaller = appRouter.createCaller(createMockDoctorContext(5));
      const scanResult = await doctorCaller.followUps.detectOverdue();

      expect(scanResult).toHaveProperty("overdueCount");
      expect(scanResult).toHaveProperty("dueSoonCount");
      expect(scanResult.overdueCount).toBeGreaterThanOrEqual(1);

      // Verify the record is now marked OVERDUE
      const record = await getFollowUpById(id);
      expect(record!.status).toBe("OVERDUE");

      // Verify alert was generated for the assigned health worker (User #2)
      const alerts = await getAlerts(2);
      expect(alerts.some((a) => a.kind === "follow_up" && a.message.includes("OVERDUE"))).toBe(true);
    });

    it("detects and marks due-soon follow-ups within 48-hour window", async () => {
      const dueSoonDate = new Date(Date.now() + 20 * 3600000); // 20 hours ahead
      const id = await createFollowUp({
        patientId: 2,
        assignedTo: 3,
        reason: "Gestational diabetes blood glucose monitoring",
        dueAt: dueSoonDate,
      });

      const doctorCaller = appRouter.createCaller(createMockDoctorContext(5));
      await doctorCaller.followUps.detectOverdue();

      const record = await getFollowUpById(id);
      expect(record!.status).toBe("DUE_SOON");
    });
  });

  describe("4. ASHA / CHO Field Task View & Outcome Recording", () => {
    it("allows health workers to view assigned follow-up worklist", async () => {
      const ashaCaller = appRouter.createCaller(createMockAshaContext(2));

      // Worker 2: Sunita Devi
      const tasks = await ashaCaller.followUps.list({ assignedTo: 2 });
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every((t) => t.assignedTo === 2)).toBe(true);
    });

    it("allows ASHA to complete home visit with vitals evaluation and outcome notes", async () => {
      // 1. Create a follow-up assigned to Sunita Devi (User #2)
      const dueAt = new Date(Date.now() + 2 * 86400000);
      const followUpId = await createFollowUp({
        patientId: 1,
        assignedTo: 2,
        reason: "Post-discharge hypertensive follow-up",
        dueAt,
        notes: "Record BP and check dietary salt compliance",
      });

      // 2. ASHA records home visit outcome
      const ashaCaller = appRouter.createCaller(createMockAshaContext(2));
      const completeRes = await ashaCaller.followUps.complete({
        id: followUpId,
        completionNotes: "Home visit completed. BP is stabilized. Patient taking Telmisartan regularly.",
        vitals: {
          bpSystolic: 122,
          bpDiastolic: 78,
          glucose: 108,
          spo2: 99,
          temperature: "98.6",
        },
      });

      expect(completeRes).toEqual({ success: true });

      // 3. Verify record transition to COMPLETED with vitals
      const record = await getFollowUpById(followUpId);
      expect(record!.status).toBe("COMPLETED");
      expect(record!.completedBy).toBe(2);
      expect(record!.completedByName).toBe("Sunita More");
      expect(record!.completionNotes).toContain("BP is stabilized");
      expect(record!.vitals).toBeDefined();
      expect(record!.vitals.bpSystolic).toBe(122);
      expect(record!.vitals.bpDiastolic).toBe(78);
      expect(record!.completedAt).toBeDefined();

      // 4. Verify notification alert sent to Doctor (User #1 / #5)
      const doctorAlerts = await getAlerts(1);
      expect(doctorAlerts.some((a) => a.kind === "follow_up" && a.message.includes("completed"))).toBe(true);
    });
  });

  describe("5. Citizen Upcoming Follow-ups & Care Reminders", () => {
    it("provides citizen with upcoming follow-ups, countdowns, and worker contacts", async () => {
      const citizenCaller = appRouter.createCaller(createMockCitizenContext(1));

      const upcoming = await citizenCaller.followUps.citizenUpcoming({ patientId: 1 });
      expect(Array.isArray(upcoming)).toBe(true);
      expect(upcoming.length).toBeGreaterThan(0);

      // Verify enriched citizen fields
      const item = upcoming[0];
      expect(item).toHaveProperty("relativeText");
      expect(typeof item.relativeText).toBe("string");
      expect(item).toHaveProperty("isUpcoming");
      expect(item).toHaveProperty("workerName");
      expect(item).toHaveProperty("workerRole");
      expect(item).toHaveProperty("workerContact");
      expect(item).toHaveProperty("reason");
    });

    it("restricts citizen list to their own patient records", async () => {
      const citizenCaller = appRouter.createCaller(createMockCitizenContext(1));
      const list = await citizenCaller.followUps.list();

      // All returned follow-ups should belong to patient 1 (Meena Patel)
      expect(list.every((f) => f.patientId === 1)).toBe(true);
    });
  });

  describe("6. Doctor Completion Review & Cancellation", () => {
    it("allows doctor to filter completed follow-ups and review worker outcome notes & vitals", async () => {
      const doctorCaller = appRouter.createCaller(createMockDoctorContext(5));

      const completedList = await doctorCaller.followUps.list({ status: "COMPLETED" });
      expect(Array.isArray(completedList)).toBe(true);
      expect(completedList.length).toBeGreaterThan(0);

      const completedDirective = completedList.find((f) => f.completedNotes || f.completionNotes);
      expect(completedDirective).toBeDefined();
      expect(completedDirective!.status).toBe("COMPLETED");
    });

    it("allows doctor to cancel a follow-up directive with reason, updating status to CANCELLED", async () => {
      // 1. Create a follow-up
      const followUpId = await createFollowUp({
        patientId: 3,
        assignedTo: 2,
        reason: "Follow-up for acute bronchitis",
        dueAt: new Date(Date.now() + 3 * 86400000),
      });

      // 2. Doctor cancels follow-up
      const doctorCaller = appRouter.createCaller(createMockDoctorContext(5));
      const cancelRes = await doctorCaller.followUps.cancel({
        id: followUpId,
        cancellationReason: "Patient admitted to Civil Hospital; home visit cancelled",
      });

      expect(cancelRes).toEqual({ success: true });

      // 3. Verify record transition to CANCELLED
      const record = await getFollowUpById(followUpId);
      expect(record!.status).toBe("CANCELLED");
      expect(record!.cancellationReason).toBe("Patient admitted to Civil Hospital; home visit cancelled");
      expect(record!.cancelledAt).toBeDefined();

      // 4. Verify alert created for assigned worker
      const workerAlerts = await getAlerts(2);
      expect(workerAlerts.some((a) => a.kind === "follow_up" && a.message.includes("cancelled"))).toBe(true);
    });
  });

  describe("7. Role & Permission Security Enforcement", () => {
    it("prevents citizens from scheduling follow-up directives", async () => {
      const citizenCaller = appRouter.createCaller(createMockCitizenContext(1));

      await expect(
        citizenCaller.followUps.schedule({
          patientId: 1,
          assignedTo: 2,
          dueAt: new Date(Date.now() + 5 * 86400000),
          reason: "Self-scheduled visit",
        })
      ).rejects.toThrow("Only care-team roles can schedule follow-ups");
    });

    it("prevents citizens and non-doctor care workers from cancelling directives", async () => {
      const citizenCaller = appRouter.createCaller(createMockCitizenContext(1));
      await expect(
        citizenCaller.followUps.cancel({
          id: 1,
          cancellationReason: "I do not want this follow up",
        })
      ).rejects.toThrow();

      const ashaCaller = appRouter.createCaller(createMockAshaContext(2));
      await expect(
        ashaCaller.followUps.cancel({
          id: 1,
          cancellationReason: "ASHA worker cannot cancel clinical directive",
        })
      ).rejects.toThrow("Only doctors or administrators can cancel follow-ups");
    });
  });
});
