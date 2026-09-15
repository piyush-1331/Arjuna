import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type Role = "citizen" | "asha_cho" | "doctor" | "facility_staff" | "administrator";

function context(role: Role): TrpcContext {
  return {
    user: { id: 7, openId: `test-${role}`, name: "Test User", email: "test@example.com", loginMethod: "test", role, facilityId: null, district: "Ahmedabad Rural", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("healthcare tRPC procedures", () => {
  it("keeps citizen referral worklists read-oriented", async () => {
    const caller = appRouter.createCaller(context("citizen"));
    await expect(caller.referrals.list()).resolves.toEqual([]);
    await expect(caller.followUps.list()).resolves.toEqual([]);
  });

  it("rejects citizen patient creation", async () => {
    const caller = appRouter.createCaller(context("citizen"));
    await expect(caller.patients.create({ name: "New Patient", age: 29, gender: "undisclosed", district: "Ahmedabad Rural" })).rejects.toThrow("Only ASHA/CHO workers and administrators can create patient records");
  });

  it("rejects offline replay for citizens", async () => {
    const caller = appRouter.createCaller(context("citizen"));
    await expect(caller.offline.sync({ events: [{ type: "create_patient", payload: { name: "Offline Patient", age: 31 } }] })).rejects.toThrow("Only care-team roles can sync offline actions");
  });
});
