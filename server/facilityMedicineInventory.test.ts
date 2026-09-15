import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  getInventory,
  getMedicineById,
  addMedicine,
  updateMedicineStock,
  receiveMedicineStock,
  dispenseMedicine,
  setMedicineReorderThreshold,
  getMedicineTransactions,
  computeMedicineStatus,
  getAlerts,
  getPrescriptions,
} from "./db";

function createMockStaffContext(userId = 4, facilityId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `staff-inventory-${userId}`,
      name: "Ramesh Sharma (Pharmacy)",
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

function createMockDoctorContext(userId = 1, facilityId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `doctor-user-${userId}`,
      name: "Dr. Rajesh Sharma, MD",
      email: "dr.rajesh@sundarpur-phc.gov.in",
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
      name: "Citizen Meena",
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

describe("Facility Medicine Inventory System - Core Logic & Schema", () => {
  it("stores all required medicine attributes: name, category, batch, quantity, unit, reorder threshold, expiry, facility", async () => {
    const res = await addMedicine({
      facilityId: 1,
      name: "Azithromycin 500mg",
      category: "Antibiotics",
      currentStock: 100,
      reorderLevel: 25,
      unit: "strips",
      batchNumber: "AZI-2027-09",
      expiryDate: new Date(Date.now() + 400 * 86400000),
      actorId: 4,
      actorRole: "facility_staff",
      actorName: "Ramesh Sharma",
      notes: "Initial inventory allocation",
    });

    expect(res.id).toBeGreaterThan(0);
    expect(res.medicine.name).toBe("Azithromycin 500mg");
    expect(res.medicine.category).toBe("Antibiotics");
    expect(res.medicine.currentStock).toBe(100);
    expect(res.medicine.reorderLevel).toBe(25);
    expect(res.medicine.unit).toBe("strips");
    expect(res.medicine.batchNumber).toBe("AZI-2027-09");
    expect(res.medicine.facilityId).toBe(1);
    expect(res.medicine.status).toBe("IN STOCK");
  });

  it("evaluates all 4 medicine inventory statuses correctly: IN STOCK, LOW STOCK, OUT OF STOCK, EXPIRING SOON", () => {
    // 1. OUT OF STOCK: currentStock === 0
    expect(
      computeMedicineStatus({
        currentStock: 0,
        reorderLevel: 20,
        expiryDate: new Date(Date.now() + 200 * 86400000),
      })
    ).toBe("OUT OF STOCK");

    // 2. LOW STOCK: 0 < currentStock <= reorderLevel
    expect(
      computeMedicineStatus({
        currentStock: 15,
        reorderLevel: 20,
        expiryDate: new Date(Date.now() + 200 * 86400000),
      })
    ).toBe("LOW STOCK");

    // 3. EXPIRING SOON: expiryDate within 90 days
    expect(
      computeMedicineStatus({
        currentStock: 150,
        reorderLevel: 30,
        expiryDate: new Date(Date.now() + 30 * 86400000),
      })
    ).toBe("EXPIRING SOON");

    // 4. IN STOCK: stock > reorderLevel and not expiring soon
    expect(
      computeMedicineStatus({
        currentStock: 150,
        reorderLevel: 30,
        expiryDate: new Date(Date.now() + 365 * 86400000),
      })
    ).toBe("IN STOCK");
  });

  it("records received stock shipment, increases quantity, and logs a STOCK_RECEIVED transaction", async () => {
    const medBefore = await addMedicine({
      facilityId: 1,
      name: "Cetirizine 10mg",
      category: "Antihistamine",
      currentStock: 20,
      reorderLevel: 30,
      unit: "strips",
      batchNumber: "CTZ-2026-01",
    });

    const receiveRes = await receiveMedicineStock(medBefore.id, 80, {
      batchNumber: "CTZ-2027-05",
      expiryDate: new Date(Date.now() + 500 * 86400000),
      notes: "Batch replenishment from district warehouse",
      actorId: 4,
      actorRole: "facility_staff",
      actorName: "Ramesh Sharma",
    });

    expect(receiveRes.success).toBe(true);
    expect(receiveRes.medicine.currentStock).toBe(100);
    expect(receiveRes.transaction.transactionType).toBe("STOCK_RECEIVED");
    expect(receiveRes.transaction.quantity).toBe(80);
    expect(receiveRes.transaction.previousStock).toBe(20);
    expect(receiveRes.transaction.newStock).toBe(100);
  });

  it("updates stock count directly, adjusts balance, and logs a STOCK_ADJUSTMENT transaction", async () => {
    const med = await addMedicine({
      facilityId: 1,
      name: "Ibuprofen 400mg",
      category: "Analgesic",
      currentStock: 50,
      reorderLevel: 20,
      unit: "strips",
    });

    const adjustRes = await updateMedicineStock(med.id, 45, {
      reason: "Damaged box discarded during audit",
      actorId: 4,
      actorRole: "facility_staff",
    });

    expect(adjustRes.success).toBe(true);
    expect(adjustRes.medicine.currentStock).toBe(45);
    expect(adjustRes.transaction.transactionType).toBe("STOCK_ADJUSTMENT");
    expect(adjustRes.transaction.quantity).toBe(-5);
    expect(adjustRes.transaction.previousStock).toBe(50);
    expect(adjustRes.transaction.newStock).toBe(45);
  });

  it("sets reorder threshold and recalculates low-stock state", async () => {
    const med = await addMedicine({
      facilityId: 1,
      name: "Pantoprazole 40mg",
      category: "Gastro",
      currentStock: 40,
      reorderLevel: 20,
      unit: "strips",
    });

    expect(med.medicine.status).toBe("IN STOCK");

    const updateThresh = await setMedicineReorderThreshold(med.id, 60, {
      actorId: 4,
      actorRole: "facility_staff",
    });

    expect(updateThresh.success).toBe(true);
    expect(updateThresh.medicine.reorderLevel).toBe(60);
    expect(updateThresh.medicine.status).toBe("LOW STOCK");
  });

  it("dispenses medicine to patient, decreases inventory, and generates automatic low-stock alert when threshold breached", async () => {
    const med = await addMedicine({
      facilityId: 1,
      name: "Ciprofloxacin 500mg",
      category: "Antibiotics",
      currentStock: 15,
      reorderLevel: 10,
      unit: "strips",
    });

    // Dispense 8 strips -> remaining 7 (below reorderLevel 10)
    const dispenseRes = await dispenseMedicine({
      medicineId: med.id,
      quantity: 8,
      patientId: 1,
      notes: "OPD prescription dispense",
      actorId: 4,
      actorRole: "facility_staff",
    });

    expect(dispenseRes.success).toBe(true);
    expect(dispenseRes.medicine.currentStock).toBe(7);
    expect(dispenseRes.medicine.status).toBe("LOW STOCK");
    expect(dispenseRes.transaction.transactionType).toBe("DISPENSED");
    expect(dispenseRes.transaction.quantity).toBe(-8);

    // Verify low stock alert was generated
    const alerts = await getAlerts();
    const lowStockAlert = alerts.find(
      (a) => a.kind === "low_stock" && a.message.includes("Ciprofloxacin 500mg")
    );
    expect(lowStockAlert).toBeDefined();
  });

  it("rejects dispensing when requested quantity exceeds available stock", async () => {
    const med = await addMedicine({
      facilityId: 1,
      name: "Insulin Glargine 100IU",
      category: "Diabetes",
      currentStock: 3,
      reorderLevel: 5,
      unit: "vials",
    });

    await expect(
      dispenseMedicine({
        medicineId: med.id,
        quantity: 10,
        patientId: 1,
      })
    ).rejects.toThrow(/Insufficient inventory/i);
  });
});

describe("Critical Business Rule: Prescription Creation vs. Dispensing Inventory Deduction", () => {
  it("does NOT automatically deduct inventory when a doctor writes a prescription or prescription batch", async () => {
    const doctorCaller = appRouter.createCaller(createMockDoctorContext());

    // 1. Check baseline inventory of Telmisartan 40mg
    const inventoryBefore = await getInventory(1);
    const telmisartanBefore = inventoryBefore.find((m) => m.name.includes("Telmisartan"));
    expect(telmisartanBefore).toBeDefined();
    const initialStock = telmisartanBefore!.currentStock;

    // 2. Doctor creates prescription for Telmisartan 40mg
    const rxResult = await doctorCaller.prescriptions.create({
      patientId: 1,
      medicineName: "Telmisartan 40mg",
      dosage: "40mg",
      frequency: "1-0-0",
      duration: "30 days",
      instructions: "Take after breakfast",
    });

    expect(rxResult.success).toBe(true);
    expect(rxResult.id).toBeGreaterThan(0);

    // 3. Verify stock has NOT changed
    const inventoryAfterRx = await getInventory(1);
    const telmisartanAfterRx = inventoryAfterRx.find((m) => m.name.includes("Telmisartan"));
    expect(telmisartanAfterRx!.currentStock).toBe(initialStock);

    // 4. Doctor creates a batch of prescriptions
    const batchResult = await doctorCaller.prescriptions.createBatch({
      patientId: 1,
      medicines: [
        { medicineName: "Telmisartan 40mg", dosage: "40mg", frequency: "1-0-0", duration: "30 days" },
        { medicineName: "Paracetamol 500mg", dosage: "500mg", frequency: "1-0-1", duration: "5 days" },
      ],
    });

    expect(batchResult.success).toBe(true);

    // 5. Verify stock still has NOT changed after batch creation
    const inventoryAfterBatch = await getInventory(1);
    const telmisartanAfterBatch = inventoryAfterBatch.find((m) => m.name.includes("Telmisartan"));
    expect(telmisartanAfterBatch!.currentStock).toBe(initialStock);
  });

  it("decreases inventory ONLY when authorized facility staff records dispensing", async () => {
    const doctorCaller = appRouter.createCaller(createMockDoctorContext());
    const staffCaller = appRouter.createCaller(createMockStaffContext());

    // 1. Create a designated test medicine in inventory
    const medRes = await addMedicine({
      facilityId: 1,
      name: "Atorvastatin 20mg",
      category: "Cardiovascular",
      currentStock: 60,
      reorderLevel: 20,
      unit: "strips",
    });

    // 2. Doctor writes prescription
    const rx = await doctorCaller.prescriptions.create({
      patientId: 1,
      medicineName: "Atorvastatin 20mg",
      dosage: "20mg",
      frequency: "0-0-1",
      duration: "30 days",
    });

    // Verify stock is still 60
    let med = await getMedicineById(medRes.id);
    expect(med?.currentStock).toBe(60);

    // 3. Facility staff dispenses the prescription
    const dispenseResult = await staffCaller.prescriptions.dispense({
      id: rx.id,
      quantity: 2,
      notes: "Dispensed 2 strips (60 tablets) to patient",
    });

    expect(dispenseResult.success).toBe(true);

    // 4. Verify stock is now 58
    med = await getMedicineById(medRes.id);
    expect(med?.currentStock).toBe(58);

    // 5. Verify transaction history records the dispense event
    const txs = await getMedicineTransactions({ medicineId: medRes.id });
    expect(txs.length).toBeGreaterThanOrEqual(2);
    const dispenseTx = txs.find((t) => t.transactionType === "DISPENSED");
    expect(dispenseTx).toBeDefined();
    expect(dispenseTx?.quantity).toBe(-2);
    expect(dispenseTx?.previousStock).toBe(60);
    expect(dispenseTx?.newStock).toBe(58);
  });
});

describe("Facility Medicine Inventory System - tRPC Endpoints & RBAC", () => {
  it("allows facility staff to query inventory, add medicine, receive stock, and view transaction ledger", async () => {
    const staffCaller = appRouter.createCaller(createMockStaffContext());

    // 1. Add medicine via tRPC
    const addRes = await staffCaller.inventory.add({
      name: "Metoprolol Succinate 25mg",
      category: "Cardiovascular",
      currentStock: 40,
      reorderLevel: 15,
      unit: "strips",
      batchNumber: "MTP-2026-11",
      notes: "Added to PHC cardiovascular formulary",
    });

    expect(addRes.success).toBe(true);
    const medId = addRes.id;

    // 2. Receive stock via tRPC
    const receiveRes = await staffCaller.inventory.receive({
      id: medId,
      quantity: 60,
      notes: "Quarterly CMS supply received",
    });

    expect(receiveRes.success).toBe(true);
    expect(receiveRes.medicine.currentStock).toBe(100);

    // 3. Dispense via tRPC
    const dispenseRes = await staffCaller.inventory.dispense({
      medicineId: medId,
      quantity: 5,
      patientId: 1,
      notes: "Dispensed 5 strips for hypertension maintenance",
    });

    expect(dispenseRes.success).toBe(true);
    expect(dispenseRes.medicine.currentStock).toBe(95);

    // 4. Set reorder threshold via tRPC
    const threshRes = await staffCaller.inventory.setReorderThreshold({
      id: medId,
      reorderLevel: 30,
    });

    expect(threshRes.success).toBe(true);
    expect(threshRes.medicine.reorderLevel).toBe(30);

    // 5. View transaction ledger via tRPC
    const transactions = await staffCaller.inventory.transactions({
      medicineId: medId,
    });

    expect(transactions.length).toBe(3); // INITIAL_STOCK, STOCK_RECEIVED, DISPENSED
    expect(transactions[0].transactionType).toBe("DISPENSED");
    expect(transactions[1].transactionType).toBe("STOCK_RECEIVED");
    expect(transactions[2].transactionType).toBe("INITIAL_STOCK");

    // 6. View inventory analytics via tRPC
    const analytics = await staffCaller.inventory.analytics();
    expect(analytics.totalSKUs).toBeGreaterThan(0);
    expect(analytics.inStockCount).toBeGreaterThanOrEqual(0);
  });

  it("blocks unauthorized citizens from updating or dispensing inventory", async () => {
    const citizenCaller = appRouter.createCaller(createMockCitizenContext());

    await expect(
      citizenCaller.inventory.update({
        id: 1,
        currentStock: 500,
      })
    ).rejects.toThrow();

    await expect(
      citizenCaller.inventory.dispense({
        medicineId: 1,
        quantity: 10,
      })
    ).rejects.toThrow();
  });
});
