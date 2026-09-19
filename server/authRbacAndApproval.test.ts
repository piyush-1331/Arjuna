import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  validatePasswordStrength,
  validatePasswordPolicy,
  evaluatePasswordStrength,
  PASSWORDS_MUST_MATCH_ERROR,
} from "../shared/passwordPolicy";
import {
  buildSupabaseSignUpOptions,
  normalizeRegistrationRole,
  validateStaffRegistrationInputs,
  validateSupabaseCredentials,
} from "../shared/supabaseAuthFlow";
import { getPostLoginRoute, normalizeDashboardRole } from "../shared/authFlow";
import * as db from "./db";

// Helper to create mock TrpcContext
function createMockContext(
  role: "citizen" | "asha" | "cho" | "asha_cho" | "doctor" | "facility_staff" | "administrator" | "admin",
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" = "APPROVED",
  email: string = "test@example.com",
  id: number = 42
): TrpcContext {
  return {
    user: {
      id,
      openId: `test-${id}`,
      authId: `auth-uuid-${id}`,
      name: "Test User",
      email,
      loginMethod: "supabase",
      role,
      status,
      phone: "+91 98765 43210",
      dateOfBirth: "1990-01-01",
      age: 35,
      gender: "female",
      village: "Sanand",
      district: "Ahmedabad Rural",
      facilityId: null,
      facilityName: "Sanand Community Health Centre",
      designation: "Medical Officer",
      employeeId: "EMP-1001",
      registrationNumber: "GMC-88321",
      assignedVillage: "Sanand Rural",
      emergencyContactName: "Emergency Desk",
      emergencyContactPhone: "+91 98765 00000",
      avatarUrl: null,
      approvalRequestedAt: new Date("2026-09-01T10:00:00Z"),
      approvedAt: status === "APPROVED" ? new Date("2026-09-01T12:00:00Z") : null,
      approvedBy: status === "APPROVED" ? "admin@arjuna.gov.in" : null,
      rejectionReason: status === "REJECTED" ? "Verification failed" : null,
      createdAt: new Date("2026-09-01T10:00:00Z"),
      updatedAt: new Date("2026-09-01T12:00:00Z"),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("Password Policy & Security Rules", () => {
  it("enforces minimum length of 8 characters", () => {
    const res = validatePasswordStrength("Short1!");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must be at least 8 characters long.");
  });

  it("enforces uppercase, lowercase, number, and special character requirements", () => {
    // Missing uppercase
    expect(validatePasswordStrength("lowercase1!").isValid).toBe(false);
    expect(validatePasswordStrength("lowercase1!").errors).toContain("Password must contain at least one uppercase letter.");

    // Missing lowercase
    expect(validatePasswordStrength("UPPERCASE1!").isValid).toBe(false);
    expect(validatePasswordStrength("UPPERCASE1!").errors).toContain("Password must contain at least one lowercase letter.");

    // Missing number
    expect(validatePasswordStrength("NoNumbers!").isValid).toBe(false);
    expect(validatePasswordStrength("NoNumbers!").errors).toContain("Password must contain at least one number.");

    // Missing special char
    expect(validatePasswordStrength("NoSpecial123").isValid).toBe(false);
    expect(validatePasswordStrength("NoSpecial123").errors).toContain("Password must contain at least one special character (@$!%*?&#^_-).");
  });

  it("rejects trivial or common compromised passwords", () => {
    const res = validatePasswordStrength("Password123!");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password is too common or easily guessed. Choose a stronger password.");
  });

  it("accepts strong valid passwords", () => {
    const res = validatePasswordStrength("Arjuna#Health2026");
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("evaluates password strength accurately", () => {
    expect(evaluatePasswordStrength("").strength).toBe("weak");
    expect(evaluatePasswordStrength("Arjuna#Health2026").score).toBeGreaterThanOrEqual(4);
  });
});

describe("Registration Input Validation & Role Normalization", () => {
  it("validates basic credentials and password matching", () => {
    expect(
      validateSupabaseCredentials({
        mode: "register",
        name: "Ramesh Patel",
        email: "ramesh@example.com",
        password: "ValidPassword123!",
        confirmPassword: "DifferentPassword123!",
      })
    ).toBe(PASSWORDS_MUST_MATCH_ERROR);

    expect(
      validateSupabaseCredentials({
        mode: "register",
        name: "Ramesh Patel",
        email: "invalid-email",
        password: "ValidPassword123!",
        confirmPassword: "ValidPassword123!",
      })
    ).toBe("Enter a valid email address.");
  });

  it("prevents self-registering users from assigning themselves administrator role", () => {
    expect(normalizeRegistrationRole("administrator")).toBe("citizen");
    expect(normalizeRegistrationRole("admin")).toBe("citizen");
    expect(normalizeRegistrationRole("doctor")).toBe("doctor");
    expect(normalizeRegistrationRole("asha")).toBe("asha");
    expect(normalizeRegistrationRole("citizen")).toBe("citizen");
  });

  it("validates mandatory fields for healthcare staff registration", () => {
    const invalidStaffResult = validateStaffRegistrationInputs({
      fullName: "Dr. Anita Sharma",
      email: "anita@gujarat.health.gov.in",
      password: "DoctorPassword123!",
      confirmPassword: "DoctorPassword123!",
      role: "doctor",
      facilityName: "", // missing
      designation: "Medical Officer",
      phone: "+91 9876543210",
    });

    expect(invalidStaffResult.isValid).toBe(false);
    expect(invalidStaffResult.errors).toContain("Facility Name or Primary Health Centre is required for healthcare staff.");

    const validStaffResult = validateStaffRegistrationInputs({
      fullName: "Dr. Anita Sharma",
      email: "anita@gujarat.health.gov.in",
      password: "DoctorPassword123!",
      confirmPassword: "DoctorPassword123!",
      role: "doctor",
      facilityName: "Bavla Community Health Centre",
      designation: "Medical Officer",
      phone: "+91 9876543210",
      registrationNumber: "GMC-99281",
      district: "Ahmedabad Rural",
      assignedVillage: "Bavla",
    });

    expect(validStaffResult.isValid).toBe(true);
    expect(validStaffResult.errors).toHaveLength(0);
  });

  it("builds Supabase sign up options with correct metadata for staff and citizens", () => {
    const citizenOptions = buildSupabaseSignUpOptions("Ramesh Patel", "citizen", {
      phone: "+91 9123456789",
      village: "Sanand",
    });

    expect(citizenOptions.data.full_name).toBe("Ramesh Patel");
    expect(citizenOptions.data.selected_role).toBe("citizen");
    expect(citizenOptions.data.phone).toBe("+91 9123456789");
    expect(citizenOptions.data.village).toBe("Sanand");

    const doctorOptions = buildSupabaseSignUpOptions("Dr. Patel", "doctor", {
      facility_name: "Sanand CHC",
      designation: "Physician",
      registration_number: "GMC-12345",
    });

    expect(doctorOptions.data.selected_role).toBe("doctor");
    expect(doctorOptions.data.facility_name).toBe("Sanand CHC");
    expect(doctorOptions.data.registration_number).toBe("GMC-12345");
  });
});

describe("Account Status & Post-Login Routing", () => {
  it("routes pending staff to /pending-approval", () => {
    expect(getPostLoginRoute("doctor", "PENDING")).toBe("/pending-approval");
    expect(getPostLoginRoute("asha", "PENDING")).toBe("/pending-approval");
    expect(getPostLoginRoute("facility_staff", "PENDING")).toBe("/pending-approval");
  });

  it("routes rejected staff to /registration-rejected", () => {
    expect(getPostLoginRoute("doctor", "REJECTED")).toBe("/registration-rejected");
  });

  it("routes suspended users to /account-suspended", () => {
    expect(getPostLoginRoute("citizen", "SUSPENDED")).toBe("/account-suspended");
    expect(getPostLoginRoute("doctor", "SUSPENDED")).toBe("/account-suspended");
  });

  it("routes approved users to their designated role dashboard", () => {
    expect(getPostLoginRoute("citizen", "APPROVED")).toBe("/dashboard/citizen");
    expect(getPostLoginRoute("doctor", "APPROVED")).toBe("/dashboard/doctor");
    expect(getPostLoginRoute("asha", "APPROVED")).toBe("/dashboard/asha");
    expect(getPostLoginRoute("cho", "APPROVED")).toBe("/dashboard/cho");
    expect(getPostLoginRoute("facility_staff", "APPROVED")).toBe("/dashboard/facility_staff");
    expect(getPostLoginRoute("administrator", "APPROVED")).toBe("/dashboard/administrator");
    expect(getPostLoginRoute("admin", "APPROVED")).toBe("/dashboard/administrator");
  });

  it("normalizes dashboard role slugs correctly", () => {
    expect(normalizeDashboardRole("admin")).toBe("administrator");
    expect(normalizeDashboardRole("administrator")).toBe("administrator");
    expect(normalizeDashboardRole("doctor")).toBe("doctor");
  });
});

describe("Profile Management & Field Immutability Security", () => {
  it("allows user to get their profile details", async () => {
    const ctx = createMockContext("doctor", "APPROVED", "doctor@example.com", 9999);
    const caller = appRouter.createCaller(ctx);

    const profile = await caller.profile.get();
    expect(profile.id).toBe(9999);
    expect(profile.email).toBe("doctor@example.com");
    expect(profile.role).toBe("doctor");
    expect(profile.status).toBe("APPROVED");
    expect(profile.designation).toBe("Medical Officer");
  });

  it("updates permissible profile demographic and contact fields", async () => {
    const ctx = createMockContext("doctor", "APPROVED", "doctor@example.com", 9999);
    const caller = appRouter.createCaller(ctx);

    // Mock db.updateUserProfile
    const updateSpy = vi.spyOn(db, "updateUserProfile").mockResolvedValueOnce({
      ...ctx.user,
      name: "Dr. Anita Patel",
      phone: "+91 99999 88888",
      village: "Bavla Rural",
    } as any);

    const result = await caller.profile.update({
      name: "Dr. Anita Patel",
      phone: "+91 99999 88888",
      village: "Bavla Rural",
    });

    expect(result.success).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith(
      9999,
      expect.objectContaining({
        name: "Dr. Anita Patel",
        phone: "+91 99999 88888",
        village: "Bavla Rural",
      })
    );

    updateSpy.mockRestore();
  });
});

describe("Administrator RBAC, Invariants & Staff Approval Workflow", () => {
  const adminEmail = "admin@arjuna.gov.in";

  beforeEach(() => {
    process.env.ADMIN_EMAIL = adminEmail;
  });

  it("blocks non-admin users from calling administrative procedures", async () => {
    const citizenCtx = createMockContext("citizen", "APPROVED", "citizen@example.com", 1);
    const citizenCaller = appRouter.createCaller(citizenCtx);

    await expect(citizenCaller.admin.listUsers()).rejects.toThrow();
    await expect(citizenCaller.admin.approveUser({ userId: 20 })).rejects.toThrow();
    await expect(citizenCaller.admin.rejectUser({ userId: 20, rejectionReason: "Invalid" })).rejects.toThrow();
    await expect(citizenCaller.admin.suspendUser({ userId: 20 })).rejects.toThrow();
  });

  it("blocks users with fake admin role but mismatched email", async () => {
    // Attempting privilege escalation with fake admin role on arbitrary email
    const fakeAdminCtx = createMockContext("admin", "APPROVED", "impostor@hacker.io", 999);
    const fakeAdminCaller = appRouter.createCaller(fakeAdminCtx);

    await expect(fakeAdminCaller.admin.listUsers()).rejects.toThrow(/Administrator access denied|permission/i);
  });

  it("allows designated administrator to list users", async () => {
    const adminCtx = createMockContext("admin", "APPROVED", adminEmail, 1);
    const adminCaller = appRouter.createCaller(adminCtx);

    const mockUserList = [
      { id: 1, name: "Admin", email: adminEmail, role: "admin", status: "APPROVED" },
      { id: 2, name: "Pending Doctor", email: "doc@example.com", role: "doctor", status: "PENDING" },
    ];

    const listSpy = vi.spyOn(db, "listUsers").mockResolvedValueOnce(mockUserList as any);

    const res = await adminCaller.admin.listUsers();
    expect(res.users).toBeDefined();
    expect(res.users.length).toBe(2);

    listSpy.mockRestore();
  });

  it("allows designated administrator to approve a pending staff user", async () => {
    const adminCtx = createMockContext("admin", "APPROVED", adminEmail, 1);
    const adminCaller = appRouter.createCaller(adminCtx);

    const getUserSpy = vi.spyOn(db, "getUserById").mockResolvedValueOnce({
      id: 25,
      name: "Dr. New Staff",
      email: "newstaff@example.com",
      role: "doctor",
      status: "PENDING",
    } as any);

    const approveSpy = vi.spyOn(db, "approveStaffUser").mockResolvedValueOnce(undefined as any);

    const result = await adminCaller.admin.approveUser({ userId: 25 });
    expect(result.success).toBe(true);
    expect(approveSpy).toHaveBeenCalledWith(adminEmail, 25);

    getUserSpy.mockRestore();
    approveSpy.mockRestore();
  });

  it("allows designated administrator to reject a pending staff user with mandatory reason", async () => {
    const adminCtx = createMockContext("admin", "APPROVED", adminEmail, 1);
    const adminCaller = appRouter.createCaller(adminCtx);

    const getUserSpy = vi.spyOn(db, "getUserById").mockResolvedValueOnce({
      id: 26,
      name: "Dr. Invalid Staff",
      email: "invalid@example.com",
      role: "doctor",
      status: "PENDING",
    } as any);

    const rejectSpy = vi.spyOn(db, "rejectStaffUser").mockResolvedValueOnce(undefined as any);

    const result = await adminCaller.admin.rejectUser({
      userId: 26,
      rejectionReason: "Medical registration number could not be verified",
    });

    expect(result.success).toBe(true);
    expect(rejectSpy).toHaveBeenCalledWith(
      adminEmail,
      26,
      "Medical registration number could not be verified"
    );

    getUserSpy.mockRestore();
    rejectSpy.mockRestore();
  });

  it("prevents suspending the single system administrator account", async () => {
    const adminCtx = createMockContext("admin", "APPROVED", adminEmail, 1);
    const adminCaller = appRouter.createCaller(adminCtx);

    // Mock getUserById returning the admin themselves
    const getUserSpy = vi.spyOn(db, "getUserById").mockResolvedValueOnce({
      id: 1,
      name: "Primary Admin",
      email: adminEmail,
      role: "admin",
      status: "APPROVED",
    } as any);

    await expect(adminCaller.admin.suspendUser({ userId: 1 })).rejects.toThrow("The main administrator account cannot be suspended");

    getUserSpy.mockRestore();
  });

  it("allows suspending a regular staff user and reactivating them", async () => {
    const adminCtx = createMockContext("admin", "APPROVED", adminEmail, 1);
    const adminCaller = appRouter.createCaller(adminCtx);

    // 1. Suspend regular user
    const getUserSpy = vi.spyOn(db, "getUserById").mockResolvedValueOnce({
      id: 50,
      name: "Staff Member",
      email: "staff@example.com",
      role: "facility_staff",
      status: "APPROVED",
    } as any);

    const suspendSpy = vi.spyOn(db, "suspendStaffUser").mockResolvedValueOnce(undefined as any);

    const suspendRes = await adminCaller.admin.suspendUser({ userId: 50 });
    expect(suspendRes.success).toBe(true);
    expect(suspendSpy).toHaveBeenCalledWith(adminEmail, 50);

    getUserSpy.mockRestore();
    suspendSpy.mockRestore();

    // 2. Reactivate regular user
    const getUserReactivateSpy = vi.spyOn(db, "getUserById").mockResolvedValueOnce({
      id: 50,
      name: "Staff Member",
      email: "staff@example.com",
      role: "facility_staff",
      status: "SUSPENDED",
    } as any);

    const reactivateSpy = vi.spyOn(db, "reactivateStaffUser").mockResolvedValueOnce(undefined as any);

    const reactivateRes = await adminCaller.admin.reactivateUser({ userId: 50 });
    expect(reactivateRes.success).toBe(true);
    expect(reactivateSpy).toHaveBeenCalledWith(adminEmail, 50);

    getUserReactivateSpy.mockRestore();
    reactivateSpy.mockRestore();
  });
});
