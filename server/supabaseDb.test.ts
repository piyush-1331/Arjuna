import { describe, expect, it } from "vitest";
import { mapSupabasePatient, toSupabaseInsertPayload } from "./supabaseDb";

describe("Supabase healthcare data bridge", () => {
  it("maps typed workflow payloads to Supabase columns", () => {
    const payload = toSupabaseInsertPayload({ patientId: 42, dueAt: new Date("2026-09-07T10:00:00.000Z"), riskCategory: "high" });
    expect(payload).toEqual({ patient_id: 42, due_at: "2026-09-07T10:00:00.000Z", risk_category: "high" });
  });

  it("maps Supabase patient rows back to the application contract", () => {
    const patient = mapSupabasePatient({ id: "42", user_id: null, household_id: "8", name: "Asha Devi", age: 68, risk_score: 91, risk_category: "critical", created_at: "2026-09-07T10:00:00.000Z", updated_at: "2026-09-07T10:00:00.000Z" });
    expect(patient).toMatchObject({ id: 42, householdId: 8, riskScore: 91, riskCategory: "critical", name: "Asha Devi" });
    expect(patient?.createdAt).toBeInstanceOf(Date);
  });
});
