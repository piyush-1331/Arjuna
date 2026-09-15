import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  determineMedicineAvailability,
  batchCheckMedicineAvailability,
  searchFacilitiesForMedicine,
  getCitizenMedicineView,
  matchesMedicine,
} from "./medicineAvailabilityService";
import {
  getInventory,
  getMedicineById,
  updateMedicineStock,
  getMedicineTransactions,
} from "./db";

function createMockDoctorContext(userId = 1, facilityId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `doctor-avail-${userId}`,
      name: "Dr. Rajesh Sharma, MD",
      email: "dr.rajesh@sundarpur-phc.gov.in",
      loginMethod: "test",
      role: "doctor",
      facilityId,
      district: "Nandurbar",
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
      openId: `citizen-avail-${userId}`,
      name: "Meena Patel",
      email: "meena.patel@example.com",
      loginMethod: "test",
      role: "citizen",
      facilityId: null,
      district: "Nandurbar",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

function createMockStaffContext(userId = 4, facilityId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `staff-avail-${userId}`,
      name: "Ramesh Sharma",
      email: "pharmacy@sundarpur-phc.gov.in",
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

describe("Medicine Availability Service - Core Logic", () => {
  it("determines AVAILABLE when stock > reorder level", async () => {
    const result = await determineMedicineAvailability({
      facilityId: 1,
      medicineName: "Paracetamol 500mg",
    });

    expect(result.status).toBe("AVAILABLE");
    expect(result.isAvailable).toBe(true);
    expect(result.facilityName).toContain("Karanji Budruk");
    expect(result.citizenView.availability).toBe("Available");
    expect(result.citizenView.facilityName).toContain("Karanji Budruk");
  });

  it("determines LOW STOCK when 0 < stock <= reorder level", async () => {
    // Salbutamol Inhaler has low stock at facility 1
    const result = await determineMedicineAvailability({
      facilityId: 1,
      medicineName: "Salbutamol Inhaler",
    });

    expect(result.status).toBe("LOW STOCK");
    expect(result.isAvailable).toBe(true);
    expect(result.citizenView.availability).toBe("Low Stock");
  });

  it("determines UNAVAILABLE when stock <= 0 or medicine is not found in facility", async () => {
    // Non-existent medicine
    const unknownResult = await determineMedicineAvailability({
      facilityId: 1,
      medicineName: "NonExistentMedicineXYZ999",
    });
    expect(unknownResult.status).toBe("UNAVAILABLE");
    expect(unknownResult.isAvailable).toBe(false);
    expect(unknownResult.citizenView.availability).toBe("Unavailable");
  });

  it("performs batch medicine availability checks for multi-drug prescriptions", async () => {
    const items = [
      { medicineName: "Paracetamol 500mg", dosage: "500mg" },
      { medicineName: "Salbutamol Inhaler", dosage: "100mcg" },
      { medicineName: "NonExistentDrugXYZ", dosage: "10mg" },
    ];

    const batchResults = await batchCheckMedicineAvailability(1, items);
    expect(batchResults).toHaveLength(3);

    const paracetamol = batchResults.find((r) => r.medicineName.includes("Paracetamol"));
    const salbutamol = batchResults.find((r) => r.medicineName.includes("Salbutamol"));
    const nonExistent = batchResults.find((r) => r.medicineName.includes("NonExistentDrug"));

    expect(paracetamol?.status).toBe("AVAILABLE");
    expect(salbutamol?.status).toBe("LOW STOCK");
    expect(nonExistent?.status).toBe("UNAVAILABLE");
  });

  it("matches medicines with variations in dosage suffix and naming", () => {
    expect(matchesMedicine("Paracetamol 500mg", "Paracetamol")).toBe(true);
    expect(matchesMedicine("Amlodipine 5mg", "Amlodipine Besylate 5mg")).toBe(true);
    expect(matchesMedicine("Metformin 500mg", "Metformin Hydrochloride")).toBe(true);
    expect(matchesMedicine("Cetirizine 10mg", "Paracetamol 500mg")).toBe(false);
  });
});

describe("Multi-Facility Search & Distance Discovery", () => {
  it("allows authorized users to search facilities where prescribed medicine is available", async () => {
    const results = await searchFacilitiesForMedicine({
      medicineName: "Paracetamol",
      originVillage: "Karanji Budruk",
      userRole: "doctor",
    });

    expect(results.length).toBeGreaterThan(0);

    // Closest facility should be first (Karanji Budruk HWC)
    expect(results[0].facilityName).toContain("Karanji Budruk");
    expect(results[0].distanceKm).toBeLessThanOrEqual(1);
    expect(results[0].availabilityStatus).toBe("AVAILABLE");

    // Doctor role receives operational details
    expect(results[0].currentStock).toBeDefined();
    expect(results[0].reorderLevel).toBeDefined();
  });

  it("discovers alternative facilities when medicine is queried across facilities", async () => {
    const results = await searchFacilitiesForMedicine({
      medicineName: "Amlodipine",
      originVillage: "Karanji Budruk",
      userRole: "doctor",
    });

    expect(results.length).toBeGreaterThan(0);

    const availableFacility = results.find((f) => f.availabilityStatus === "AVAILABLE");
    expect(availableFacility).toBeDefined();
    expect(availableFacility?.facilityName).toBeDefined();
  });
});

describe("Citizen Privacy & Security Protection", () => {
  it("generates privacy-guarded citizen view formatted with Medicine, Availability, and Facility", async () => {
    const citizenView = await getCitizenMedicineView({
      facilityId: 1,
      medicineName: "Paracetamol",
      originVillage: "Sundarpur",
    });

    // Required schema:
    // Medicine: Paracetamol
    // Availability: Available
    // Facility: Sundarpur PHC (or Demo PHC)
    expect(citizenView.medicineName).toBe("Paracetamol");
    expect(citizenView.availability).toBe("Available");
    expect(citizenView.facilityName).toContain("Karanji Budruk");

    // Must NOT leak private inventory internals
    expect((citizenView as any).currentStock).toBeUndefined();
    expect((citizenView as any).reorderLevel).toBeUndefined();
    expect((citizenView as any).batchNumber).toBeUndefined();
    expect((citizenView as any).supplier).toBeUndefined();
    expect((citizenView as any).expiryDate).toBeUndefined();
  });

  it("sanitizes multi-facility search results for citizen role", async () => {
    const citizenResults = await searchFacilitiesForMedicine({
      medicineName: "Amlodipine",
      originVillage: "Sundarpur",
      userRole: "citizen",
    });

    expect(citizenResults.length).toBeGreaterThan(0);

    for (const fac of citizenResults) {
      // Allowed public fields
      expect(fac.facilityName).toBeDefined();
      expect(fac.facilityType).toBeDefined();
      expect(fac.availabilityStatus).toBeDefined();
      expect(fac.village).toBeDefined();
      expect(fac.distanceKm).toBeDefined();

      // Prohibited private fields
      expect(fac.currentStock).toBeUndefined();
      expect(fac.reorderLevel).toBeUndefined();
      expect(fac.batchNumber).toBeUndefined();
    }
  });
});

describe("Prescription Creation Invariant: Zero Automatic Stock Deduction", () => {
  it("does NOT deduct inventory stock when doctor creates or checks a prescription", async () => {
    const doctorCtx = createMockDoctorContext(1, 1);
    const caller = appRouter.createCaller(doctorCtx);

    // 1. Get baseline stock of Paracetamol 500mg (id 6)
    const initialMed = await getMedicineById(6);
    const initialStock = initialMed?.currentStock || 0;
    const initialTxCount = (await getMedicineTransactions({ medicineId: 6 })).length;

    // 2. Doctor queries availability
    const availCheck = await caller.medicineAvailability.check({
      facilityId: 1,
      medicineName: "Paracetamol 500mg",
    });
    expect(availCheck[0].status).toBe("AVAILABLE");

    // 3. Doctor creates a digital prescription
    const newRx = await caller.prescriptions.create({
      patientId: 1,
      medicineName: "Paracetamol 500mg",
      dosage: "500mg",
      frequency: "1-0-1",
      duration: "5 days",
      instructions: "After meals with water",
      route: "Oral",
    });
    expect(newRx.id).toBeDefined();

    // 4. Verify inventory stock has NOT been deducted
    const afterMed = await getMedicineById(6);
    expect(afterMed?.currentStock).toBe(initialStock);

    // 5. Verify no inventory transaction was logged on prescribing
    const afterTxCount = (await getMedicineTransactions({ medicineId: 6 })).length;
    expect(afterTxCount).toBe(initialTxCount);
  });
});

describe("Dynamic Database-driven Availability Updates", () => {
  it("reflects live stock updates dynamically without hardcoded values", async () => {
    const salb = (await getInventory(1)).find(m => m.name.includes("Salbutamol"))!;
    const check1 = await determineMedicineAvailability({
      facilityId: 1,
      medicineName: "Salbutamol Inhaler",
    });
    expect(check1.status).toBe("LOW STOCK");

    // 2. Simulate stock increase to 45 (> reorder level 15)
    await updateMedicineStock(salb.id, 45);
    const check2 = await determineMedicineAvailability({
      facilityId: 1,
      medicineName: "Salbutamol Inhaler",
    });
    expect(check2.status).toBe("AVAILABLE");

    // 3. Simulate stock drop to 0
    await updateMedicineStock(salb.id, 0);
    const check3 = await determineMedicineAvailability({
      facilityId: 1,
      medicineName: "Salbutamol Inhaler",
    });
    expect(check3.status).toBe("UNAVAILABLE");

    // 4. Restore stock to 4
    await updateMedicineStock(salb.id, 4);
    const check4 = await determineMedicineAvailability({
      facilityId: 1,
      medicineName: "Salbutamol Inhaler",
    });
    expect(check4.status).toBe("LOW STOCK");
  });
});

describe("tRPC Endpoints: medicineAvailability router", () => {
  it("allows doctor to query facility medicine search with operational metrics", async () => {
    const doctorCtx = createMockDoctorContext(1, 1);
    const caller = appRouter.createCaller(doctorCtx);

    const results = await caller.medicineAvailability.searchFacilities({
      medicineName: "Paracetamol",
      originVillage: "Karanji Budruk",
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].facilityName).toContain("Karanji Budruk");
    expect(results[0].currentStock).toBeDefined();
  });

  it("allows citizen to query facility medicine search with sanitized output", async () => {
    const citizenCtx = createMockCitizenContext(99);
    const caller = appRouter.createCaller(citizenCtx);

    const results = await caller.medicineAvailability.searchFacilities({
      medicineName: "Paracetamol",
      originVillage: "Karanji Budruk",
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].facilityName).toContain("Karanji Budruk");
    expect(results[0].currentStock).toBeUndefined();
    expect(results[0].reorderLevel).toBeUndefined();
  });

  it("returns citizen view endpoint data", async () => {
    const citizenCtx = createMockCitizenContext(99);
    const caller = appRouter.createCaller(citizenCtx);

    const view = await caller.medicineAvailability.getCitizenView({
      facilityId: 1,
      medicineName: "Paracetamol",
      originVillage: "Karanji Budruk",
    });

    expect(view.medicineName).toBe("Paracetamol");
    expect(view.availability).toBe("Available");
    expect(view.facilityName).toContain("Karanji Budruk");
  });

  it("returns prescription availability breakdown for active prescriptions", async () => {
    const doctorCtx = createMockDoctorContext(1, 1);
    const caller = appRouter.createCaller(doctorCtx);

    const rxGroupAvail = await caller.medicineAvailability.getPrescriptionAvailability({
      prescriptionGroupId: "RX-MH-NDB-1001",
      facilityId: 1,
    });

    expect(rxGroupAvail.facilityName).toContain("Karanji Budruk");
    expect(rxGroupAvail.items.length).toBeGreaterThan(0);
    for (const item of rxGroupAvail.items) {
      expect(["AVAILABLE", "LOW STOCK", "UNAVAILABLE"]).toContain(item.availabilityStatus);
    }
  });
});
