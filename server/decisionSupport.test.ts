import { describe, expect, it } from "vitest";
import { assessRisk, triageFromRules } from "./decisionSupport";

describe("decision support safety rules", () => {
  it("escalates obvious emergency symptoms immediately", () => {
    const result = triageFromRules({ symptoms: "severe breathing difficulty and chest pain", spo2: 88 });
    expect(result.level).toBe("emergency");
    expect(result.safetyNet).toContain("IMMEDIATE MEDICAL HELP");
  });

  it("returns explainable factors for elevated risk", () => {
    const result = assessRisk({ age: 70, bpSystolic: 168, glucose: 245, conditions: "hypertension", missedFollowUps: 1 });
    expect(result.score).toBeGreaterThan(50);
    expect(["high", "critical"]).toContain(result.category);
    expect(result.factors).toEqual(expect.arrayContaining(["Blood pressure above threshold", "Elevated glucose", "Relevant existing condition", "Missed follow-up"]));
    expect(result.nextStep).toContain("clinician");
  });

  it("does not overstate routine symptom inputs as a diagnosis", () => {
    const result = triageFromRules({ symptoms: "mild cough" });
    expect(result.level).toBe("routine");
    expect(result.safetyNet).toContain("contact a clinician");
  });
});
