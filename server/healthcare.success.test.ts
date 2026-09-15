import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  createPatient: vi.fn().mockResolvedValue(101),
  createHousehold: vi.fn().mockResolvedValue(201),
  createVisit: vi.fn().mockResolvedValue(301),
  createReferral: vi.fn().mockResolvedValue(401),
  createFollowUp: vi.fn().mockResolvedValue(501),
  createAlert: vi.fn().mockResolvedValue(601),
  createAuditEvent: vi.fn().mockResolvedValue(undefined),
  getPatientById: vi.fn().mockResolvedValue({ id: 101, name: "Test Patient", age: 42, conditions: "hypertension" }),
  getPatientTimeline: vi.fn().mockResolvedValue({ visits: [], referrals: [], followUps: [] }),
  getPatients: vi.fn().mockResolvedValue([]),
  getPatientsForUser: vi.fn().mockResolvedValue([]),
  getHouseholds: vi.fn().mockResolvedValue([]),
  getAlerts: vi.fn().mockResolvedValue([]),
  getDashboardMetrics: vi.fn().mockResolvedValue({ patients: 0, highRisk: 0, referrals: 0, openFollowUps: 0, overdueFollowUps: 0, lowStock: 0, facilities: 0 }),
  getFacilities: vi.fn().mockResolvedValue([]),
  getInventory: vi.fn().mockResolvedValue([]),
  markOverdueFollowUps: vi.fn().mockResolvedValue(0),
  seedDemoData: vi.fn().mockResolvedValue(undefined),
  completeFollowUp: vi.fn().mockResolvedValue(undefined),
  updateMedicine: vi.fn().mockResolvedValue(undefined),
  updateReferral: vi.fn().mockResolvedValue(undefined),
  updateReferralLifecycleStatus: vi.fn().mockResolvedValue({ id: 401, status: "COMPLETED", outcome: "Reviewed by specialist" }),
  addReferralEvent: vi.fn().mockResolvedValue(undefined),
  getReferralById: vi.fn().mockResolvedValue({ id: 401, patientId: 101, status: "PENDING", recommendationScore: 94 }),
  getReferralTimeline: vi.fn().mockResolvedValue({ referral: { id: 401 }, events: [] }),
}));

vi.mock("./db", () => dbMocks);
const { appRouter } = await import("./routers");

function context(role: "asha_cho" | "doctor" | "facility_staff" | "administrator"): TrpcContext {
  return { user: { id: 9, openId: "success-test", name: "Care User", email: "care@example.com", loginMethod: "test", role, facilityId: null, district: "Ahmedabad Rural", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"], res: { clearCookie: () => undefined } as unknown as TrpcContext["res"] };
}

describe("healthcare workflow success paths", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a household record", async () => {
    const result = await appRouter.createCaller(context("asha_cho")).households.create({ headName: "Household Head", village: "Sundarpur", district: "Ahmedabad Rural" });
    expect(result).toEqual({ id: 201 });
    expect(dbMocks.createHousehold).toHaveBeenCalledWith(expect.objectContaining({ headName: "Household Head", assignedWorkerId: 9 }));
  });

  it("creates a patient and records an audit event", async () => {
    const result = await appRouter.createCaller(context("asha_cho")).patients.create({ name: "Test Patient", age: 42, gender: "undisclosed", district: "Ahmedabad Rural" });
    expect(result).toEqual({ id: 101 });
    expect(dbMocks.createPatient).toHaveBeenCalled();
    expect(dbMocks.createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "patient.created" }));
  });

  it("records a visit with deterministic triage and audit behavior", async () => {
    const result = await appRouter.createCaller(context("doctor")).visits.create({ patientId: 101, symptoms: "chest pain", spo2: 88 });
    expect(result.triage.level).toBe("emergency");
    expect(dbMocks.createVisit).toHaveBeenCalledWith(expect.objectContaining({ patientId: 101, triageLevel: "emergency" }));
    expect(dbMocks.createAlert).toHaveBeenCalledWith(expect.objectContaining({ kind: "high_risk" }));
  });

  it("creates and updates a referral with a safety alert", async () => {
    const caller = appRouter.createCaller(context("doctor"));
    await expect(caller.referrals.create({ patientId: 101, urgency: "urgent", reason: "Needs specialist review" })).resolves.toEqual({ id: 401 });
    const updateRes = await caller.referrals.updateStatus({ id: 401, status: "completed", outcome: "Reviewed by specialist" });
    expect(updateRes.success).toBe(true);
    expect(dbMocks.createAlert).toHaveBeenCalledWith(expect.objectContaining({ kind: "referral" }));
    expect(dbMocks.updateReferralLifecycleStatus).toHaveBeenCalledWith(401, expect.objectContaining({ outcome: "Reviewed by specialist" }));
  });

  it("creates and completes a follow-up", async () => {
    const caller = appRouter.createCaller(context("asha_cho"));
    await expect(caller.followUps.create({ patientId: 101, assignedTo: 9, title: "Check blood pressure", dueAt: new Date() })).resolves.toEqual({ id: 501 });
    await expect(caller.followUps.complete({ id: 501 })).resolves.toEqual({ success: true });
    expect(dbMocks.createFollowUp).toHaveBeenCalledWith(expect.objectContaining({ title: "Check blood pressure" }));
    expect(dbMocks.completeFollowUp).toHaveBeenCalledWith(501);
  });

  it("checks overdue follow-ups before returning alerts", async () => {
    await appRouter.createCaller(context("asha_cho")).alerts.list();
    expect(dbMocks.markOverdueFollowUps).toHaveBeenCalled();
  });

  it("replays a queued follow-up creation through offline sync", async () => {
    const result = await appRouter.createCaller(context("asha_cho")).offline.sync({ events: [{ type: "create_followup", payload: { patientId: 101, title: "Check blood pressure", dueAt: new Date().toISOString() } }] });
    expect(result.accepted).toBe(1);
    expect(dbMocks.createFollowUp).toHaveBeenCalledWith(expect.objectContaining({ patientId: 101, title: "Check blood pressure" }));
    expect(dbMocks.createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "offline.sync" }));
  });
});
