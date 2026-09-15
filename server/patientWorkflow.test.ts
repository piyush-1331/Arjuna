import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  createHousehold,
  createPatient,
  getHouseholdById,
  getHouseholds,
  getPatientById,
  getPatientProfile,
  updatePatient,
} from "./db";

function createMockContext(role: "asha_cho" | "doctor" | "facility_staff" | "administrator" | "citizen", userId = 10): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      name: "ASHA Worker Rekha",
      email: "rekha.asha@arjuna.gov.in",
      loginMethod: "test",
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

describe("Patient and Household Registration Workflow", () => {
  it("allows ASHA/CHO to create a household with assigned worker and district", async () => {
    const caller = appRouter.createCaller(createMockContext("asha_cho", 10));
    const result = await caller.households.create({
      headName: "Dineshbhai Patel",
      village: "Sundarpur",
      district: "Ahmedabad Rural",
      contact: "+91 98221 55660",
    });

    expect(result.id).toBeGreaterThan(0);
    const household = await getHouseholdById(result.id);
    expect(household).toBeDefined();
    expect(household?.headName).toBe("Dineshbhai Patel");
    expect(household?.village).toBe("Sundarpur");
  });

  it("registers a patient with complete clinical and demographic fields", async () => {
    const caller = appRouter.createCaller(createMockContext("asha_cho", 10));
    const household = await caller.households.create({
      headName: "Rameshbhai Solanki",
      village: "Navagam",
      district: "Ahmedabad Rural",
      contact: "+91 98765 43210",
    });

    const patientRes = await caller.patients.create({
      name: "Geetaben Solanki",
      age: 48,
      gender: "female",
      contact: "+91 98765 43211",
      village: "Navagam",
      district: "Ahmedabad Rural",
      emergencyContact: "+91 98765 43210",
      bloodGroup: "B+",
      allergies: "Penicillin, Sulfa drugs",
      conditions: "Hypertension, Stage 2",
      householdId: household.id,
    });

    expect(patientRes.id).toBeGreaterThan(0);
    const patient = await getPatientById(patientRes.id);
    expect(patient?.name).toBe("Geetaben Solanki");
    expect(patient?.bloodGroup).toBe("B+");
    expect(patient?.allergies).toContain("Penicillin");
    expect(patient?.householdId).toBe(household.id);
  });

  it("prevents duplicate patient registration with clear error", async () => {
    const caller = appRouter.createCaller(createMockContext("asha_cho", 10));
    const uniqueSuffix = Date.now();
    const patientData = {
      name: `Unique Beneficiary ${uniqueSuffix}`,
      age: 52,
      gender: "male" as const,
      village: "Sundarpur",
      district: "Ahmedabad Rural",
      contact: `+91 99999 ${uniqueSuffix % 10000}`,
      bloodGroup: "O+",
    };

    const first = await caller.patients.create(patientData);
    expect(first.id).toBeGreaterThan(0);

    // Attempting to register same patient name in same village with same contact/age should fail
    await expect(caller.patients.create(patientData)).rejects.toThrow(/already exists/i);
  });

  it("allows ASHA/CHO and Doctor to edit patient details", async () => {
    const caller = appRouter.createCaller(createMockContext("asha_cho", 10));
    const patientRes = await caller.patients.create({
      name: `Savita Edit Test ${Date.now()}`,
      age: 60,
      gender: "female",
      village: "Sundarpur",
      district: "Ahmedabad Rural",
      bloodGroup: "A+",
    });

    const updateRes = await caller.patients.update({
      id: patientRes.id,
      age: 61,
      allergies: "Ibuprofen",
      conditions: "Type 2 Diabetes, Hypertension",
      emergencyContact: "+91 91234 56789",
    });

    expect(updateRes.success).toBe(true);
    const updated = await getPatientById(patientRes.id);
    expect(updated?.age).toBe(61);
    expect(updated?.allergies).toBe("Ibuprofen");
    expect(updated?.conditions).toContain("Type 2 Diabetes");
    expect(updated?.emergencyContact).toBe("+91 91234 56789");
  });

  it("retrieves complete patient profile with visits, vitals, referrals, prescriptions, and household", async () => {
    const caller = appRouter.createCaller(createMockContext("asha_cho", 10));
    const profile = await caller.patients.getProfile({ id: 1 });

    expect(profile).toBeDefined();
    expect(profile.patient).toBeDefined();
    expect(profile.patient.name).toBeDefined();
    expect(Array.isArray(profile.visits)).toBe(true);
    expect(Array.isArray(profile.referrals)).toBe(true);
    expect(Array.isArray(profile.prescriptions)).toBe(true);
    expect(Array.isArray(profile.followUps)).toBe(true);
  });

  it("associates household members correctly when listing households", async () => {
    const caller = appRouter.createCaller(createMockContext("asha_cho", 10));
    const householdsList = await caller.households.list();

    expect(Array.isArray(householdsList)).toBe(true);
    expect(householdsList.length).toBeGreaterThan(0);
    // Each household object includes populated members
    for (const h of householdsList) {
      expect(Array.isArray(h.members)).toBe(true);
    }
  });
});
