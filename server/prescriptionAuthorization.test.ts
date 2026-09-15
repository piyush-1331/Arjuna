import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  getPrescriptions,
  getPrescriptionById,
  seedDemoData,
} from "./db";
import { CLINICAL_SAFETY_NOTICE, CLINICAL_SUMMARY_DISCLAIMER } from "./decisionSupport";

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

function createMockAshaContext(userId = 8): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `asha-user-${userId}`,
      name: "Asha Devi",
      email: "asha@example.com",
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

function createMockFacilityStaffContext(userId = 12, facilityId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `staff-user-${userId}`,
      name: "Pharmacist Ramesh",
      email: "pharmacy@arjuna.gov.in",
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

describe("Prescription System & Authorization Engine", () => {
  it("allows a doctor to create a single prescription with medicine, dosage, frequency, duration, route, and instructions", async () => {
    await seedDemoData();
    const doctorCaller = appRouter.createCaller(createMockDoctorContext(5, 1));

    const result = await doctorCaller.prescriptions.create({
      patientId: 1,
      medicineName: "Metoprolol Succinate 25mg",
      dosage: "25mg",
      frequency: "1-0-0 (Morning with water)",
      duration: "30 days",
      route: "Oral",
      instructions: "Take with breakfast. Monitor pulse daily.",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();

    const stored = await getPrescriptionById(result.id);
    expect(stored).toBeDefined();
    expect(stored?.medicineName).toBe("Metoprolol Succinate 25mg");
    expect(stored?.dosage).toBe("25mg");
    expect(stored?.frequency).toBe("1-0-0 (Morning with water)");
    expect(stored?.duration).toBe("30 days");
    expect(stored?.route).toBe("Oral");
    expect(stored?.instructions).toBe("Take with breakfast. Monitor pulse daily.");
    expect(stored?.status).toBe("active");
  });

  it("allows a doctor to prescribe multiple medicines simultaneously in a batch", async () => {
    const doctorCaller = appRouter.createCaller(createMockDoctorContext(5, 1));

    const batchResult = await doctorCaller.prescriptions.createBatch({
      patientId: 1,
      medicines: [
        {
          medicineName: "Atorvastatin 10mg",
          dosage: "10mg",
          frequency: "0-0-1 (Night)",
          duration: "30 days",
          route: "Oral",
          instructions: "Take before sleeping.",
        },
        {
          medicineName: "Salbutamol Inhaler 100mcg",
          dosage: "2 puffs",
          frequency: "SOS (As needed for breathlessness)",
          duration: "60 days",
          route: "Inhalation",
          instructions: "Rinse mouth with water after inhalation.",
        },
        {
          medicineName: "Ciprofloxacin Eye Drops 0.3%",
          dosage: "2 drops",
          frequency: "1-1-1 (Thrice daily)",
          duration: "7 days",
          route: "Ophthalmic Drops",
          instructions: "Instill in right eye every 8 hours.",
        },
      ],
    });

    expect(batchResult.success).toBe(true);
    expect(batchResult.createdIds.length).toBe(3);
    expect(batchResult.groupId).toMatch(/^RX-GRP-/);

    const prescriptions = await getPrescriptions(1);
    const atorvastatin = prescriptions.find(p => p.medicineName === "Atorvastatin 10mg");
    const inhaler = prescriptions.find(p => p.medicineName === "Salbutamol Inhaler 100mcg");
    const eyedrops = prescriptions.find(p => p.medicineName === "Ciprofloxacin Eye Drops 0.3%");

    expect(atorvastatin?.route).toBe("Oral");
    expect(inhaler?.route).toBe("Inhalation");
    expect(eyedrops?.route).toBe("Ophthalmic Drops");
    expect(atorvastatin?.prescriptionGroupId).toBe(batchResult.groupId);
    expect(inhaler?.prescriptionGroupId).toBe(batchResult.groupId);
    expect(eyedrops?.prescriptionGroupId).toBe(batchResult.groupId);
  });

  it("strictly FORBIDS citizens from creating individual or batch prescriptions", async () => {
    const citizenCaller = appRouter.createCaller(createMockCitizenContext(99));

    // Test single creation attempt
    await expect(
      citizenCaller.prescriptions.create({
        patientId: 1,
        medicineName: "Self-Prescribed Antibiotic",
        dosage: "500mg",
        frequency: "1-1-1",
        duration: "5 days",
        route: "Oral",
      })
    ).rejects.toThrow(/Only licensed doctors and administrators are authorized to create prescriptions/i);

    // Test batch creation attempt
    await expect(
      citizenCaller.prescriptions.createBatch({
        patientId: 1,
        medicines: [
          {
            medicineName: "Unauthorized Drug A",
            dosage: "10mg",
          },
        ],
      })
    ).rejects.toThrow(/Only licensed doctors and administrators are authorized to prescribe multiple medications/i);
  });

  it("strictly FORBIDS ASHA workers and CHOs from creating prescriptions", async () => {
    const ashaCaller = appRouter.createCaller(createMockAshaContext(8));

    // ASHA worker attempting to create prescription
    await expect(
      ashaCaller.prescriptions.create({
        patientId: 1,
        medicineName: "Azithromycin 500mg",
        dosage: "500mg",
        frequency: "1-0-0",
        duration: "3 days",
        route: "Oral",
      })
    ).rejects.toThrow(/Only licensed doctors and administrators are authorized to create prescriptions/i);

    // ASHA worker attempting batch creation
    await expect(
      ashaCaller.prescriptions.createBatch({
        patientId: 1,
        medicines: [
          {
            medicineName: "Paracetamol 500mg",
            dosage: "500mg",
          },
        ],
      })
    ).rejects.toThrow(/Only licensed doctors and administrators are authorized to prescribe multiple medications/i);
  });

  it("allows authorized facility staff to view prescriptions and dispense medications", async () => {
    const doctorCaller = appRouter.createCaller(createMockDoctorContext(5, 1));
    const staffCaller = appRouter.createCaller(createMockFacilityStaffContext(12, 1));

    // Doctor creates prescription
    const newRx = await doctorCaller.prescriptions.create({
      patientId: 1,
      medicineName: "Pantoprazole 40mg",
      dosage: "40mg",
      frequency: "1-0-0 (Morning empty stomach)",
      duration: "14 days",
      route: "Oral",
      instructions: "Take 30 mins before breakfast.",
    });

    // Facility staff lists prescriptions
    const list = await staffCaller.prescriptions.list({ patientId: 1 });
    expect(list.some(p => p.id === newRx.id)).toBe(true);

    // Facility staff dispenses the prescription
    const dispenseResult = await staffCaller.prescriptions.dispense({
      id: newRx.id,
      notes: "Batch BTH-2026 dispensed. Expiry validated.",
    });

    expect(dispenseResult.success).toBe(true);
    expect(dispenseResult.prescription.status).toBe("dispensed");
    expect(dispenseResult.prescription.dispensedAt).toBeDefined();
    expect(dispenseResult.prescription.dispensedBy).toBe(12);
  });

  it("provides citizen with a structured prescription summary and daily timetable", async () => {
    const citizenCaller = appRouter.createCaller(createMockCitizenContext(1));

    const summary = await citizenCaller.prescriptions.getSummary({ patientId: 1 });

    expect(summary).toBeDefined();
    expect(summary.patient.name).toBeDefined();
    expect(summary.activeCount).toBeGreaterThan(0);
    expect(summary.dailyTimetable).toBeDefined();
    expect(Array.isArray(summary.dailyTimetable.morning)).toBe(true);
    expect(Array.isArray(summary.dailyTimetable.night)).toBe(true);
    expect(Array.isArray(summary.history)).toBe(true);
    expect(summary.safetyNotice).toContain("Medications must only be taken as directed");
  });

  it("enforces AI safety: clinical notice explicitly forbids autonomous AI prescribing", async () => {
    expect(CLINICAL_SAFETY_NOTICE).toContain("AI must never autonomously diagnose or prescribe");
    expect(CLINICAL_SUMMARY_DISCLAIMER).toContain("AI does not autonomously diagnose or prescribe");
  });
});
