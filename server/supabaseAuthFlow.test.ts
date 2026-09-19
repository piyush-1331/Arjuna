import { describe, expect, it } from "vitest";
import { buildSupabaseSignUpOptions, getSupabaseSignUpMessage, normalizeRegistrationRole, validateSupabaseCredentials } from "../shared/supabaseAuthFlow";

describe("Supabase authentication flow", () => {
  it("validates login credentials", () => {
    expect(validateSupabaseCredentials({ mode: "login", email: "bad", password: "short" })).toBe("Enter a valid email address.");
    expect(validateSupabaseCredentials({ mode: "login", email: "person@example.com", password: "short" })).toContain("8 characters");
    expect(validateSupabaseCredentials({ mode: "login", email: "person@example.com", password: "long-enough-password" })).toBeNull();
  });

  it("requires a name for registration and normalizes privileged role selection", () => {
    expect(validateSupabaseCredentials({ mode: "register", email: "person@example.com", password: "long-enough-password" })).toContain("full name");
    expect(normalizeRegistrationRole("administrator")).toBe("citizen");
    expect(buildSupabaseSignUpOptions("  Asha Devi ", "doctor")).toEqual({ data: { full_name: "Asha Devi", selected_role: "doctor", status: "PENDING" } });
  });

  it("distinguishes email confirmation from an immediate session", () => {
    expect(getSupabaseSignUpMessage(false)).toContain("Check your email");
    expect(getSupabaseSignUpMessage(true)).toContain("Opening your workspace");
  });
});
