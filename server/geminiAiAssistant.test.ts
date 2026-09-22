import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { ENV } from "./_core/env";
import {
  detectEmergencyUrgency,
  getRoleSystemInstruction,
  getQuickPromptsForRole,
  invokeGeminiChat,
} from "./_core/gemini";
import type { TrpcContext } from "./_core/trpc";

function createMockContext(
  role: string = "citizen",
  status: string = "APPROVED",
  email: string = "citizen@example.com",
  id: number = 10,
  district: string = "Pune"
): TrpcContext {
  return {
    user: {
      id,
      openId: `mock-${id}`,
      name: "Mock User",
      email,
      role: role as any,
      status: status as any,
      district,
    } as any,
    req: {} as any,
    res: {} as any,
  };
}

describe("Gemini AI Public Health Assistant Test Suite", () => {
  vi.setConfig({ testTimeout: 15000 });

  it("configures the default Gemini API key in environment", () => {
    expect(ENV.geminiApiKey).toBeDefined();
    expect(ENV.geminiApiKey.length).toBeGreaterThan(10);
    expect(ENV.geminiApiKey.startsWith("AQ.")).toBe(true);
  });

  it("detects emergency red flags across English, Marathi, and Hindi queries", () => {
    // English Emergency
    const engEmergency = detectEmergencyUrgency("Patient is experiencing crushing chest pain and shortness of breath");
    expect(engEmergency.isEmergency).toBe(true);

    // Marathi Emergency
    const mrEmergency = detectEmergencyUrgency("रुग्णाला छातीत तीव्र दुखणे आणि श्वास घेण्यास त्रास होत आहे");
    expect(mrEmergency.isEmergency).toBe(true);

    // Hindi Emergency
    const hiEmergency = detectEmergencyUrgency("रोगी को सीने में तेज दर्द है और भारी रक्तस्राव हो रहा है");
    expect(hiEmergency.isEmergency).toBe(true);

    // Urgent vs Routine
    const urgent = detectEmergencyUrgency("Blood pressure reading is 160/100 with dizziness");
    expect(urgent.isEmergency).toBe(false);
    expect(urgent.isUrgent).toBe(true);

    const routine = detectEmergencyUrgency("What diet is good for keeping blood sugar normal?");
    expect(routine.isEmergency).toBe(false);
    expect(routine.isUrgent).toBe(false);
  });

  it("generates specialized system instructions for each healthcare role", () => {
    const citizenPrompt = getRoleSystemInstruction("citizen", "mr", "Pune");
    expect(citizenPrompt).toContain("Arjuna AI Health Assistant");
    expect(citizenPrompt).toContain("Pune");
    expect(citizenPrompt).toContain("Marathi");

    const doctorPrompt = getRoleSystemInstruction("doctor", "en", "Nandurbar");
    expect(doctorPrompt).toContain("Arjuna Clinical AI Copilot");
    expect(doctorPrompt).toContain("Nandurbar");
    expect(doctorPrompt).toContain("Directorate of Health Services (DHS)");

    const ashaPrompt = getRoleSystemInstruction("asha", "mr", "Gadchiroli");
    expect(ashaPrompt).toContain("ASHA");
    expect(ashaPrompt).toContain("Gadchiroli");

    const adminPrompt = getRoleSystemInstruction("super_admin", "en", "All Districts");
    expect(adminPrompt).toContain("Health Intelligence");
  });

  it("provides tailored quick prompts for all user roles and languages", () => {
    const citizenMrPrompts = getQuickPromptsForRole("citizen", "mr");
    expect(citizenMrPrompts.length).toBeGreaterThanOrEqual(3);
    expect(citizenMrPrompts.some((p) => p.includes("रक्तदाब") || p.includes("मधुमेह"))).toBe(true);

    const doctorPrompts = getQuickPromptsForRole("doctor", "en");
    expect(doctorPrompts.some((p) => p.includes("Telmisartan") || p.includes("Hypertension") || p.includes("HTN"))).toBe(true);

    const ashaPrompts = getQuickPromptsForRole("asha", "mr");
    expect(ashaPrompts.some((p) => p.includes("तिमाहीत") || p.includes("लसीकरण") || p.includes("रक्तदाब"))).toBe(true);

    const adminPrompts = getQuickPromptsForRole("administrator", "en");
    expect(adminPrompts.some((p) => p.includes("outbreak") || p.includes("stockouts") || p.includes("dengue"))).toBe(true);
  });

  it("invokes Gemini AI chat and returns structured clinical response with safety disclaimer", async () => {
    const res = await invokeGeminiChat({
      prompt: "What should I eat to keep my blood pressure normal?",
      role: "citizen",
      language: "en",
      district: "Pune",
    });

    expect(res).toBeDefined();
    expect(res.reply.length).toBeGreaterThan(10);
    expect(res.urgency).toBeDefined();
    expect(res.recommendedAction).toBeDefined();
    expect(res.disclaimer).toContain("Arjuna");
    expect(res.model).toBeDefined();
    expect(res.source).toBeDefined();
  });

  it("routes tRPC aiAssistant.chat for Citizen users in English and Marathi", async () => {
    const ctx = createMockContext("citizen", "APPROVED", "ramesh@example.com", 1, "Pune");
    const caller = appRouter.createCaller(ctx);

    const responseEn = await caller.aiAssistant.chat({
      message: "I feel slightly dizzy after morning walk. My BP is 135/88. Is it fine?",
      role: "citizen",
      language: "en",
      patientContext: {
        name: "Ramesh Shinde",
        age: 58,
        conditions: "Hypertension",
      },
    });

    expect(responseEn).toBeDefined();
    expect(responseEn.reply).toBeDefined();
    expect(responseEn.urgency).toBe("urgent");
    expect(responseEn.recommendedAction).toBeDefined();

    const responseMr = await caller.aiAssistant.chat({
      message: "माझा रक्तदाब १४०/९० आहे, काय काळजी घ्यावी?",
      role: "citizen",
      language: "mr",
    });

    expect(responseMr).toBeDefined();
    expect(responseMr.reply).toBeDefined();
  });

  it("handles medical emergency queries with emergency level and dial 108 recommendation", async () => {
    const ctx = createMockContext("citizen", "APPROVED", "emergency@example.com", 2, "Thane");
    const caller = appRouter.createCaller(ctx);

    const emergencyRes = await caller.aiAssistant.chat({
      message: "Severe crushing chest pain radiating to left arm and breathing difficulty!",
      role: "citizen",
      language: "en",
    });

    expect(emergencyRes.urgency).toBe("emergency");
    expect(emergencyRes.recommendedAction).toContain("108");
  });

  it("executes doctor clinical decision queries via aiAssistant.clinicalAssistant", async () => {
    const docCtx = createMockContext("doctor", "APPROVED", "doctor.deshmukh@arjuna.gov.in", 3, "Pune");
    const docCaller = appRouter.createCaller(docCtx);

    const clinicalRes = await docCaller.aiAssistant.clinicalAssistant({
      query: "Check safety of initiating Telmisartan 40mg with Metformin 500mg BD in Stage 1 HTN with T2DM",
      category: "drug_interactions",
      language: "en",
      patientContext: {
        age: 56,
        gender: "male",
        vitals: "BP 152/94, Glucose 162",
        history: "Hypertension 2 years, newly detected T2DM",
        currentMedications: "Metformin 500mg BD",
      },
    });

    expect(clinicalRes).toBeDefined();
    expect(clinicalRes.reply).toBeDefined();
    expect(clinicalRes.disclaimer).toBeDefined();
  });

  it("retrieves quick prompts via tRPC aiAssistant.getQuickPrompts for all roles", async () => {
    const ctx = createMockContext("doctor", "APPROVED");
    const caller = appRouter.createCaller(ctx);

    const promptsDoc = await caller.aiAssistant.getQuickPrompts({ role: "doctor", language: "en" });
    expect(promptsDoc.prompts.length).toBeGreaterThan(0);

    const promptsAsha = await caller.aiAssistant.getQuickPrompts({ role: "asha", language: "mr" });
    expect(promptsAsha.prompts.length).toBeGreaterThan(0);

    const promptsAdmin = await caller.aiAssistant.getQuickPrompts({ role: "super_admin", language: "en" });
    expect(promptsAdmin.prompts.length).toBeGreaterThan(0);
  });

  it("maintains backward compatibility with legacy ai.chat endpoint", async () => {
    const ctx = createMockContext("citizen", "APPROVED");
    const caller = appRouter.createCaller(ctx);

    const res = await caller.ai.chat({
      message: "Hello from Arjuna AI assistant test",
      language: "en",
    });

    expect(res).toBeDefined();
    expect(res.reply).toBeDefined();
    expect(res.choices).toBeDefined();
    expect(res.choices?.[0]?.message?.content).toBe(res.reply);
  });
});
