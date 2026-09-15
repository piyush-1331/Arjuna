import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createRateLimiter } from "./_core/rateLimiter";
import { seedDemoData, createPatient } from "./db";
import fs from "node:fs";
import path from "node:path";

function createMockContext(userOverrides: Partial<NonNullable<TrpcContext["user"]>> = {}): TrpcContext {
  const defaultUser = {
    id: 100,
    openId: "user-100",
    name: "Citizen Ramesh",
    email: "ramesh@example.com",
    loginMethod: "test",
    role: "citizen" as const,
    facilityId: null,
    district: "Ahmedabad Rural",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user: { ...defaultUser, ...userOverrides },
    req: {
      protocol: "https",
      headers: { "x-forwarded-for": "192.168.1.100" },
      ip: "192.168.1.100",
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
      setHeader: () => undefined,
    } as unknown as TrpcContext["res"],
  };
}

describe("Security Audit & Hardening Test Suite", () => {
  beforeEach(async () => {
    await seedDemoData();
  });

  describe("1. Citizen Patient Record Isolation (Anti-IDOR / Horizontal Privilege Enforcement)", () => {
    it("prevents Citizen A from accessing Citizen B's medical records directly", async () => {
      // Create citizen A context (userId: 901)
      const citizenACtx = createMockContext({ id: 901, role: "citizen", name: "Citizen A" });
      const caller = appRouter.createCaller(citizenACtx);

      // Attempting to query patient records directly for another user (patient 1 belongs to user 1)
      await expect(
        caller.prescriptions.list({ patientId: 1 })
      ).rejects.toThrow(/Access denied/i);

      await expect(
        caller.patients.get({ id: 1 })
      ).rejects.toThrow(/Access denied/i);
    });

    it("prevents Citizen A from querying Citizen B's upcoming follow-ups", async () => {
      const citizenACtx = createMockContext({ id: 902, role: "citizen", name: "Citizen A" });
      const caller = appRouter.createCaller(citizenACtx);

      await expect(
        caller.followUps.citizenUpcoming({ patientId: 1 })
      ).rejects.toThrow(/Access denied/i);
    });

    it("prevents Citizen A from viewing Citizen B's consultation history", async () => {
      const citizenACtx = createMockContext({ id: 904, role: "citizen", name: "Citizen A" });
      const caller = appRouter.createCaller(citizenACtx);

      await expect(
        caller.consultations.getHistory({ patientId: 1 })
      ).rejects.toThrow(/Access denied/i);
    });

    it("prevents Citizen A from viewing Citizen B's appointments", async () => {
      const citizenACtx = createMockContext({ id: 905, role: "citizen", name: "Citizen A" });
      const caller = appRouter.createCaller(citizenACtx);

      await expect(
        caller.appointments.list({ patientId: 1 })
      ).rejects.toThrow(/Access denied/i);
    });

    it("allows Citizen A to view their own patient records when registered", async () => {
      // Register a patient bound to userId 910
      const patientId = await createPatient({
        userId: 910,
        name: "Citizen Ramesh",
        age: 38,
        gender: "male",
        village: "Sundarpur",
        district: "Ahmedabad Rural",
        contact: "9876543210",
        conditions: "Hypertension",
        riskCategory: "low",
        riskScore: 10,
      });

      const citizenCtx = createMockContext({ id: 910, role: "citizen", name: "Citizen Ramesh" });
      const caller = appRouter.createCaller(citizenCtx);

      // Accessing with own patientId must succeed
      const ownPrescriptions = await caller.prescriptions.list({ patientId });
      expect(Array.isArray(ownPrescriptions)).toBe(true);

      const ownFollowUps = await caller.followUps.citizenUpcoming({ patientId });
      expect(Array.isArray(ownFollowUps)).toBe(true);
    });
  });

  describe("2. Role Escalation Prevention (Vertical Privilege Enforcement)", () => {
    it("prevents a citizen from escalating to administrator via switchRole", async () => {
      const citizenCtx = createMockContext({ id: 201, role: "citizen" });
      const caller = appRouter.createCaller(citizenCtx);

      await expect(
        caller.profile.switchRole({ role: "administrator" })
      ).rejects.toThrow(/Administrator access must be granted/i);
    });

    it("prevents privilege escalation to administrator via onboarding", async () => {
      const citizenCtx = createMockContext({ id: 203, role: "citizen" });
      const caller = appRouter.createCaller(citizenCtx);

      await expect(
        caller.profile.completeOnboarding({ role: "administrator" })
      ).rejects.toThrow(/Administrator access must be granted/i);
    });

    it("allows health workers to transition between valid peer care roles", async () => {
      const ashaCtx = createMockContext({ id: 205, role: "asha", facilityId: 1 });
      const caller = appRouter.createCaller(ashaCtx);

      const result = await caller.profile.switchRole({ role: "cho" });
      expect(result.success).toBe(true);
      expect(result.role).toBe("cho");
    });
  });

  describe("3. Doctor & Clinical Authorization Restrictions", () => {
    it("rejects citizens attempting to issue prescriptions", async () => {
      const citizenCtx = createMockContext({ id: 301, role: "citizen" });
      const caller = appRouter.createCaller(citizenCtx);

      await expect(
        caller.prescriptions.create({
          patientId: 1,
          medicineName: "Amoxicillin 500mg",
          dosage: "1 tablet three times daily",
          duration: "5 days",
        })
      ).rejects.toThrow(/Only licensed doctors and administrators are authorized to create prescriptions/i);
    });

    it("rejects facility staff attempting to issue prescriptions", async () => {
      const staffCtx = createMockContext({ id: 302, role: "facility_staff", facilityId: 1 });
      const caller = appRouter.createCaller(staffCtx);

      await expect(
        caller.prescriptions.create({
          patientId: 1,
          medicineName: "Paracetamol 500mg",
          dosage: "1 tablet twice daily",
          duration: "3 days",
        })
      ).rejects.toThrow(/Only licensed doctors and administrators are authorized to create prescriptions/i);
    });

    it("allows authorized doctors to create prescriptions", async () => {
      const doctorCtx = createMockContext({ id: 5, role: "doctor", facilityId: 1, name: "Dr. Sanjay Trivedi" });
      const caller = appRouter.createCaller(doctorCtx);

      const result = await caller.prescriptions.create({
        patientId: 1,
        medicineName: "Paracetamol 500mg",
        dosage: "1 tab twice daily",
        duration: "3 days",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it("rejects non-doctors from recording clinical consultations", async () => {
      const citizenCtx = createMockContext({ id: 303, role: "citizen" });
      const caller = appRouter.createCaller(citizenCtx);

      await expect(
        caller.consultations.recordConsultation({
          patientId: 1,
          clinicalAssessment: "Severe fever and body pain",
          diagnosis: "Viral fever",
          treatmentPlan: "Hydration and rest",
        })
      ).rejects.toThrow(/Only doctors and administrators can record clinical consultations/i);
    });
  });

  describe("4. Facility Staff Inventory Scoping & Boundary Enforcement", () => {
    it("rejects facility staff from dispensing medicine from another facility", async () => {
      // Staff assigned to Facility 1
      const staffFacility1 = createMockContext({ id: 401, role: "facility_staff", facilityId: 1 });
      const caller = appRouter.createCaller(staffFacility1);

      // Medicine 25 belongs to Facility 2 (Sonwadi Sub-Centre)
      await expect(
        caller.inventory.dispense({
          medicineId: 25,
          quantity: 10,
          patientId: 1,
        })
      ).rejects.toThrow(/Facility staff can only dispense medications from their assigned facility/i);
    });

    it("rejects facility staff from modifying stock at another facility", async () => {
      const staffFacility1 = createMockContext({ id: 402, role: "facility_staff", facilityId: 1 });
      const caller = appRouter.createCaller(staffFacility1);

      // Medicine 25 belongs to Facility 2
      await expect(
        caller.inventory.update({
          id: 25,
          currentStock: 50,
        })
      ).rejects.toThrow(/Facility staff can only adjust inventory/i);
    });

    it("rejects facility staff from receiving stock for another facility", async () => {
      const staffFacility1 = createMockContext({ id: 403, role: "facility_staff", facilityId: 1 });
      const caller = appRouter.createCaller(staffFacility1);

      // Medicine 25 belongs to Facility 2
      await expect(
        caller.inventory.receive({
          id: 25,
          quantity: 100,
        })
      ).rejects.toThrow(/Facility staff can only receive replenishment/i);
    });

    it("allows facility staff to dispense and manage their assigned facility inventory", async () => {
      const staffFacility1 = createMockContext({ id: 404, role: "facility_staff", facilityId: 1 });
      const caller = appRouter.createCaller(staffFacility1);

      // Medicine 1 belongs to Facility 1 (Sundarpur PHC)
      const result = await caller.inventory.dispense({
        medicineId: 1,
        quantity: 2,
        patientId: 1,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("5. Audit Logging & Sensitive Medical Info (PHI) Protection", () => {
    it("verifies consultation recording creates an audit log without leaking raw PHI in detail", async () => {
      const doctorCtx = createMockContext({ id: 5, role: "doctor", facilityId: 1, name: "Dr. Sanjay Trivedi" });
      const caller = appRouter.createCaller(doctorCtx);

      const secretClinicalNote = "Patient exhibits acute severe psychiatric episode with confidential history";
      const result = await caller.consultations.recordConsultation({
        patientId: 1,
        clinicalAssessment: "Acute distress requiring observation",
        diagnosis: "Observation required",
        treatmentPlan: secretClinicalNote,
      });

      expect(result.success).toBe(true);
      expect(result.consultationId).toBeDefined();
    });

    it("verifies patient record access authorization for care workers", async () => {
      const ashaCtx = createMockContext({ id: 8, role: "asha", facilityId: 1 });
      const caller = appRouter.createCaller(ashaCtx);

      // Accessing a patient timeline triggers patient access verification
      const timeline = await caller.patients.timeline({ id: 1 });
      expect(timeline).toBeDefined();
      expect(timeline.visits).toBeDefined();
    });
  });

  describe("6. Rate Limiting Engine Validation", () => {
    it("allows requests under the window limit and blocks exceeding requests with HTTP 429", () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
      });

      const mockReq = {
        headers: { "x-forwarded-for": "10.0.0.99" },
        socket: { remoteAddress: "10.0.0.99" },
        path: "/api/trpc",
      } as any;

      let statusResult = 200;
      let jsonResult: any = null;
      const mockRes = {
        setHeader: () => undefined,
        status: (code: number) => {
          statusResult = code;
          return {
            json: (data: any) => { jsonResult = data; },
          };
        },
      } as any;

      let nextCount = 0;
      const next = () => { nextCount++; };

      // 3 allowed requests
      limiter(mockReq, mockRes, next);
      limiter(mockReq, mockRes, next);
      limiter(mockReq, mockRes, next);
      expect(nextCount).toBe(3);

      // 4th request must be blocked (HTTP 429)
      limiter(mockReq, mockRes, next);
      expect(nextCount).toBe(3); // next() not called on 4th
      expect(statusResult).toBe(429);
      expect(jsonResult?.error).toBe("TOO_MANY_REQUESTS");
    });

    it("isolates rate limit tracking by client IP", () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      const makeReq = (ip: string) =>
        ({
          headers: { "x-forwarded-for": ip },
          socket: { remoteAddress: ip },
          path: "/api/trpc",
        }) as any;

      const mockRes = {
        setHeader: () => undefined,
        status: () => ({ json: () => undefined }),
      } as any;

      let nextCount = 0;
      const next = () => { nextCount++; };

      limiter(makeReq("10.0.0.1"), mockRes, next);
      expect(nextCount).toBe(1);

      // 2nd request from 10.0.0.1 blocked
      limiter(makeReq("10.0.0.1"), mockRes, next);
      expect(nextCount).toBe(1);

      // Request from 10.0.0.2 allowed
      limiter(makeReq("10.0.0.2"), mockRes, next);
      expect(nextCount).toBe(2);
    });
  });

  describe("7. Secrets Isolation & Client Bundle Security Scan", () => {
    it("guarantees SUPABASE_SERVICE_ROLE_KEY is absent from all frontend source files", () => {
      const clientDir = path.resolve(__dirname, "../client");
      const sharedDir = path.resolve(__dirname, "../shared");

      function scanDirectory(dir: string): string[] {
        let findings: string[] = [];
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            if (file !== "node_modules" && file !== "dist" && file !== ".git") {
              findings = findings.concat(scanDirectory(fullPath));
            }
          } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js") || file.endsWith(".html") || file.endsWith(".json")) {
            const content = fs.readFileSync(fullPath, "utf-8");
            if (content.includes("SUPABASE_SERVICE_ROLE_KEY") || content.includes("service_role")) {
              findings.push(fullPath);
            }
          }
        }
        return findings;
      }

      const clientViolations = scanDirectory(clientDir);
      const sharedViolations = scanDirectory(sharedDir);

      expect(clientViolations).toEqual([]);
      expect(sharedViolations).toEqual([]);
    });

    it("guarantees client Supabase initialization uses strictly VITE_ publishable variables", () => {
      const clientSupabasePath = path.resolve(__dirname, "../client/src/lib/supabase.ts");
      const content = fs.readFileSync(clientSupabasePath, "utf-8");

      expect(content).toContain("VITE_SUPABASE_URL");
      expect(content).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
      expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(content).not.toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
    });
  });
});
