import { describe, it, expect, beforeEach } from "vitest";
import * as db from "./db";
import { appRouter } from "./routers";

describe("Profile Persistence and Complete Demographic Storage", () => {
  beforeEach(() => {
    db.initMemoryStore(true);
  });

  it("successfully updates and persists age, emergency contacts, blood group, allergies, address, and conditions", async () => {
    // 1. Create caller for user #1 (Citizen)
    const caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "test-citizen-openId",
        role: "citizen",
        name: "Ramesh Patel",
        email: "ramesh@example.com",
        status: "APPROVED",
      } as any,
      req: {} as any,
      res: { clearCookie: () => {} } as any,
    });

    // 2. Initial state
    const initialUser = await db.getUserById(1);
    expect(initialUser).toBeDefined();

    // 3. Mutate profile with all new fields
    const updateResult = await caller.profile.update({
      name: "Ramesh M. Patel",
      phone: "+91 98221 99999",
      dateOfBirth: "1984-06-15",
      age: 42,
      gender: "male",
      village: "Karanji Budruk",
      district: "Ahmedabad Rural",
      address: "House 45, Near Gram Panchayat",
      pincode: "423101",
      emergencyContactName: "Suresh Patel (Brother)",
      emergencyContactPhone: "+91 98221 88888",
      bloodGroup: "O+",
      allergies: "Penicillin",
      conditions: "Hypertension Stage 1",
      abhaId: "91-8201-1122-3344",
    });

    expect(updateResult.success).toBe(true);
    expect(updateResult.profile.name).toBe("Ramesh M. Patel");
    expect(updateResult.profile.age).toBe(42);
    expect(updateResult.profile.emergencyContactName).toBe("Suresh Patel (Brother)");
    expect(updateResult.profile.emergencyContactPhone).toBe("+91 98221 88888");
    expect(updateResult.profile.bloodGroup).toBe("O+");
    expect(updateResult.profile.allergies).toBe("Penicillin");
    expect(updateResult.profile.conditions).toBe("Hypertension Stage 1");
    expect(updateResult.profile.address).toBe("House 45, Near Gram Panchayat");
    expect(updateResult.profile.pincode).toBe("423101");
    expect(updateResult.profile.abhaId).toBe("91-8201-1122-3344");

    // 4. Verify persisted state in database
    const persisted = await db.getUserById(1);
    expect(persisted?.name).toBe("Ramesh M. Patel");
    expect(persisted?.age).toBe(42);
    expect(persisted?.phone).toBe("+91 98221 99999");
    expect(persisted?.emergencyContactName).toBe("Suresh Patel (Brother)");
    expect(persisted?.emergencyContactPhone).toBe("+91 98221 88888");
    expect(persisted?.bloodGroup).toBe("O+");
    expect(persisted?.allergies).toBe("Penicillin");
    expect(persisted?.conditions).toBe("Hypertension Stage 1");
    expect(persisted?.address).toBe("House 45, Near Gram Panchayat");
    expect(persisted?.pincode).toBe("423101");
    expect(persisted?.abhaId).toBe("91-8201-1122-3344");

    // 5. Verify query via profile.get returns full persisted profile
    const fetched = await caller.profile.get();
    expect(fetched.age).toBe(42);
    expect(fetched.emergencyContactName).toBe("Suresh Patel (Brother)");
    expect(fetched.emergencyContactPhone).toBe("+91 98221 88888");
    expect(fetched.bloodGroup).toBe("O+");

    // 6. Verify associated patient record was automatically synchronized
    const allPatients = await db.getPatients(10);
    const citizenPatient = allPatients.find((p) => p.userId === 1 || p.name === "Ramesh M. Patel");
    expect(citizenPatient).toBeDefined();
    expect(citizenPatient?.age).toBe(42);
    expect(citizenPatient?.contact).toBe("+91 98221 99999");
    expect(citizenPatient?.bloodGroup).toBe("O+");
    expect(citizenPatient?.allergies).toBe("Penicillin");
  });

  it("does not overwrite persisted profile data with nulls when re-authenticating with partial metadata", async () => {
    // 1. Seed user with profile data
    await db.upsertUser({
      openId: "supabase-user-uuid-123",
      name: "Anita Sharma",
      email: "anita@example.com",
      role: "citizen",
      age: 35,
      gender: "female",
      phone: "+91 98221 12345",
      emergencyContactName: "Vijay Sharma",
      emergencyContactPhone: "+91 98221 54321",
      bloodGroup: "B+",
      village: "Sundarpur",
    });

    const userBefore = await db.getUserByOpenId("supabase-user-uuid-123");
    expect(userBefore?.age).toBe(35);
    expect(userBefore?.emergencyContactName).toBe("Vijay Sharma");

    // 2. Simulate subsequent login/auth check where only openId and lastSignedIn are sent
    await db.upsertUser({
      openId: "supabase-user-uuid-123",
      lastSignedIn: new Date(),
    });

    // 3. Verify that existing demographic & emergency fields were PRESERVED and not wiped out
    const userAfter = await db.getUserByOpenId("supabase-user-uuid-123");
    expect(userAfter?.name).toBe("Anita Sharma");
    expect(userAfter?.age).toBe(35);
    expect(userAfter?.gender).toBe("female");
    expect(userAfter?.emergencyContactName).toBe("Vijay Sharma");
    expect(userAfter?.emergencyContactPhone).toBe("+91 98221 54321");
    expect(userAfter?.bloodGroup).toBe("B+");
    expect(userAfter?.village).toBe("Sundarpur");
  });

  it("ensures new citizens only see their own data and profile updates link patient record", async () => {
    // 1. Create a brand new citizen user with id 555
    const newCitizen = await db.upsertUser({
      openId: "new-citizen-uuid-555",
      name: "Pooja Verma",
      email: "pooja@example.com",
      role: "citizen",
      loginMethod: "supabase",
    });

    const citizenCaller = appRouter.createCaller({
      user: newCitizen as any,
      req: {} as any,
      res: { clearCookie: () => {} } as any,
    });

    // 2. Before any records are created, new citizen must see 0 referrals, 0 prescriptions, 0 follow-ups (no mock data from patient 1)
    const initialReferrals = await citizenCaller.referrals.citizenList();
    expect(initialReferrals).toEqual([]);

    const initialPrescriptions = await citizenCaller.prescriptions.list();
    expect(initialPrescriptions).toEqual([]);

    const initialFollowUps = await citizenCaller.followUps.citizenUpcoming();
    expect(initialFollowUps).toEqual([]);

    // 3. User edits and saves their profile
    const updateResult = await citizenCaller.profile.update({
      name: "Pooja K. Verma",
      phone: "+91 98765 43210",
      age: 28,
      gender: "female",
      village: "Sonwadi",
      district: "Ahmedabad Rural",
      bloodGroup: "A+",
      allergies: "Dust, Peanuts",
      conditions: "None",
      abhaId: "91-8201-5555-4444",
      emergencyContactName: "Karan Verma",
      emergencyContactPhone: "+91 98765 00000",
    });

    expect(updateResult.success).toBe(true);
    expect(updateResult.profile.name).toBe("Pooja K. Verma");
    expect(updateResult.profile.bloodGroup).toBe("A+");

    // 4. Verify patient record was automatically created/linked for user 555
    const userPatients = await db.getPatientsForUser(newCitizen!.id, "citizen");
    expect(userPatients.length).toBe(1);
    expect(userPatients[0].name).toBe("Pooja K. Verma");
    expect(userPatients[0].userId).toBe(newCitizen!.id);
    expect(userPatients[0].bloodGroup).toBe("A+");
    expect(userPatients[0].allergies).toBe("Dust, Peanuts");
    expect(userPatients[0].emergencyContact).toBe("+91 98765 00000");
  });
});
