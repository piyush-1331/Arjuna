import { describe, expect, it } from "vitest";
import { getPostLoginRoute, normalizeDashboardRole, shouldCompleteOnboarding } from "./authFlow";

describe("authentication flow routing", () => {
  it("holds the root redirect while a selected onboarding role is pending", () => {
    expect(getPostLoginRoute("citizen", "doctor")).toBeNull();
    expect(shouldCompleteOnboarding("citizen", "doctor")).toBe(true);
  });

  it("routes to the persisted role after onboarding completes", () => {
    expect(getPostLoginRoute("doctor", "doctor")).toBe("/dashboard/doctor");
    expect(shouldCompleteOnboarding("doctor", "doctor")).toBe(false);
  });

  it("maps the legacy admin role to the administrator dashboard", () => {
    expect(normalizeDashboardRole("admin")).toBe("administrator");
    expect(getPostLoginRoute("admin")).toBe("/dashboard/administrator");
  });
});
