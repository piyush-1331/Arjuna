import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "citizen" | "asha_cho" | "doctor" | "facility_staff" | "administrator"): TrpcContext {
  const now = new Date();
  return {
    user: { id: 11, openId: "onboarding-user", name: "Onboarding User", email: "onboarding@example.com", loginMethod: "manus", role, facilityId: null, district: null, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: {} as unknown as TrpcContext["res"],
  };
}

describe("profile.completeOnboarding", () => {
  it("allows a non-administrator role to be persisted", async () => {
    const caller = appRouter.createCaller(context("citizen"));
    await expect(caller.profile.completeOnboarding({ role: "doctor" })).resolves.toMatchObject({ success: true, role: "doctor" });
  });

  it("prevents a citizen from self-assigning administrator access", async () => {
    const caller = appRouter.createCaller(context("citizen"));
    await expect(caller.profile.completeOnboarding({ role: "administrator" })).rejects.toThrow("Administrator access must be granted");
  });
});
