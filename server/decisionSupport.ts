import { invokeLLM } from "./_core/llm";
export * from "./clinicalTriageEngine";
export * from "./hybridRiskEngine";
import {
  evaluateDeterministicClinicalTriage,
  executeDeterministicSafetyGuardedTriage,
  DeterministicTriageCategory,
  DeterministicTriageResult,
  TriageEngineConfig,
  DEFAULT_TRIAGE_CONFIG,
} from "./clinicalTriageEngine";
import {
  calculateHybridHealthRisk,
  HybridRiskAssessment,
  HybridRiskInput,
  HYBRID_RISK_DISCLAIMER,
} from "./hybridRiskEngine";

export type TriageLevel = "emergency" | "urgent" | "routine" | "self_care";
export type ScreeningStatus = "NORMAL" | "ATTENTION" | "HIGH RISK" | "EMERGENCY";

export type DecisionSupportInput = {
  symptoms?: string;
  structuredSymptoms?: string[];
  age?: number;
  gender?: "female" | "male" | "other" | "undisclosed";
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  spo2?: number;
  temperature?: number;
  glucose?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  conditions?: string;
  existingConditions?: string;
  pregnancyStatus?: string;
  notes?: string;
  missedFollowUps?: number;
};

export type RiskAssessment = {
  score: number;
  category: "low" | "moderate" | "high" | "critical";
  status: ScreeningStatus;
  factors: string[];
  nextStep: string;
  recommendedAction: string;
};

export const emergencyTerms = [
  "chest pain",
  "severe breathing",
  "difficulty breathing",
  "shortness of breath",
  "breathlessness",
  "unconscious",
  "loss of consciousness",
  "fainting",
  "severe bleeding",
  "vaginal bleeding",
  "stroke",
  "face droop",
  "slurred speech",
  "convulsion",
  "seizure",
  "cyanosis",
  "severe abdominal pain",
];

export function calculateBMI(weightKg?: number, heightCm?: number): { bmi: number; category: string } | null {
  if (!weightKg || !heightCm || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  const raw = weightKg / (heightM * heightM);
  const bmi = Math.round(raw * 10) / 10;
  let category = "Normal";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25.0) category = "Normal";
  else if (bmi < 30.0) category = "Overweight";
  else category = "Obese";
  return { bmi, category };
}

export function validateScreeningVitals(input: DecisionSupportInput): string[] {
  const errors: string[] = [];

  if (input.bpSystolic !== undefined) {
    if (input.bpSystolic < 50 || input.bpSystolic > 300) {
      errors.push(`Systolic blood pressure (${input.bpSystolic} mmHg) is outside physiologically possible limits (50–300 mmHg).`);
    }
  }

  if (input.bpDiastolic !== undefined) {
    if (input.bpDiastolic < 30 || input.bpDiastolic > 200) {
      errors.push(`Diastolic blood pressure (${input.bpDiastolic} mmHg) is outside physiologically possible limits (30–200 mmHg).`);
    }
  }

  if (input.bpSystolic !== undefined && input.bpDiastolic !== undefined) {
    if (input.bpSystolic <= input.bpDiastolic) {
      errors.push(`Systolic blood pressure (${input.bpSystolic}) must be greater than diastolic blood pressure (${input.bpDiastolic}).`);
    }
  }

  if (input.pulse !== undefined) {
    if (input.pulse < 30 || input.pulse > 250) {
      errors.push(`Pulse rate (${input.pulse} bpm) is outside physiologically possible limits (30–250 bpm).`);
    }
  }

  if (input.spo2 !== undefined) {
    if (input.spo2 < 50 || input.spo2 > 100) {
      errors.push(`Oxygen saturation SpO2 (${input.spo2}%) must be between 50% and 100%.`);
    }
  }

  if (input.temperature !== undefined) {
    // Check if in Celsius (e.g. 32-44) or Fahrenheit (90-112)
    if ((input.temperature < 90.0 || input.temperature > 110.0) && (input.temperature < 32.0 || input.temperature > 43.5)) {
      errors.push(`Body temperature (${input.temperature}) is outside possible physiological range (90–110°F or 32–43.5°C).`);
    }
  }

  if (input.glucose !== undefined) {
    if (input.glucose < 20 || input.glucose > 700) {
      errors.push(`Blood glucose (${input.glucose} mg/dL) is outside valid testing range (20–700 mg/dL).`);
    }
  }

  if (input.weight !== undefined) {
    if (input.weight < 1 || input.weight > 300) {
      errors.push(`Weight (${input.weight} kg) must be between 1 and 300 kg.`);
    }
  }

  if (input.height !== undefined) {
    if (input.height < 30 || input.height > 250) {
      errors.push(`Height (${input.height} cm) must be between 30 and 250 cm.`);
    }
  }

  return errors;
}

export function evaluateCommunityScreening(input: DecisionSupportInput): {
  status: ScreeningStatus;
  score: number;
  factors: string[];
  recommendedAction: string;
  triageLevel: TriageLevel;
  safetyNet: string;
  bmiData: { bmi: number; category: string } | null;
} {
  const factors: string[] = [];
  let score = 0;
  let isEmergency = false;
  let isHighRisk = false;

  const systolic = input.bpSystolic ?? 0;
  const diastolic = input.bpDiastolic ?? 0;
  const pulse = input.pulse ?? 0;
  const spo2 = input.spo2 ?? 100;
  const glucose = input.glucose ?? 0;
  const temp = input.temperature ?? 98.4;
  const isCelsius = temp <= 45;
  const tempF = isCelsius ? (temp * 9) / 5 + 32 : temp;
  const symptomsText = `${input.symptoms ?? ""} ${(input.structuredSymptoms ?? []).join(" ")}`.toLowerCase();
  const conditionsText = `${input.conditions ?? ""} ${input.existingConditions ?? ""}`.toLowerCase();
  const isPregnant = (input.pregnancyStatus && input.pregnancyStatus !== "not_pregnant" && input.pregnancyStatus !== "none" && input.pregnancyStatus !== "") || /pregnant|trimester|postpartum/i.test(conditionsText);

  // BMI Calculation
  let bmiData = calculateBMI(input.weight, input.height);
  if (!bmiData && input.bmi) {
    let cat = "Normal";
    if (input.bmi < 18.5) cat = "Underweight";
    else if (input.bmi >= 30) cat = "Obese";
    else if (input.bmi >= 25) cat = "Overweight";
    bmiData = { bmi: input.bmi, category: cat };
  }

  // 1. Critical Emergency Triggers
  if (emergencyTerms.some(term => symptomsText.includes(term))) {
    isEmergency = true;
    score += 45;
    factors.push("Critical emergency symptom identified");
  }

  if (spo2 > 0 && spo2 < 90) {
    isEmergency = true;
    score += 40;
    factors.push(`Critical hypoxia (SpO2 ${spo2}%)`);
  }

  if (systolic >= 180 || diastolic >= 120) {
    isEmergency = true;
    score += 35;
    factors.push(`Hypertensive crisis (BP ${systolic}/${diastolic} mmHg)`);
  }

  if (glucose >= 400 || (glucose > 0 && glucose < 50)) {
    isEmergency = true;
    score += 35;
    factors.push(glucose < 50 ? `Severe hypoglycemia (${glucose} mg/dL)` : `Extreme glycemic spike (${glucose} mg/dL)`);
  }

  if (pulse >= 140 || (pulse > 0 && pulse < 40)) {
    isEmergency = true;
    score += 30;
    factors.push(`Critical pulse anomaly (${pulse} bpm)`);
  }

  if (tempF >= 104.0) {
    isEmergency = true;
    score += 30;
    factors.push(`Hyperpyrexia severe fever (${tempF.toFixed(1)}°F)`);
  }

  // Pregnancy-specific alerts (Pre-eclampsia & Maternal Red Flags)
  if (isPregnant) {
    if (systolic >= 140 || diastolic >= 90) {
      if (systolic >= 160 || diastolic >= 110 || /headache|vision|blur|swelling/i.test(symptomsText)) {
        isEmergency = true;
        score += 40;
        factors.push(`Maternal pre-eclampsia risk: High BP (${systolic}/${diastolic}) with symptoms in pregnancy`);
      } else {
        isHighRisk = true;
        score += 25;
        factors.push(`Gestational hypertension (${systolic}/${diastolic} mmHg)`);
      }
    }
    if (/bleeding|spotting|fetal|reduced movement/i.test(symptomsText)) {
      isEmergency = true;
      score += 40;
      factors.push("Obstetric emergency symptom reported");
    }
  }

  // 2. High Risk Triggers
  if (spo2 >= 90 && spo2 < 94) {
    isHighRisk = true;
    score += 25;
    factors.push(`Low oxygen saturation (SpO2 ${spo2}%)`);
  }

  if ((systolic >= 140 && systolic < 180) || (diastolic >= 90 && diastolic < 120)) {
    isHighRisk = true;
    score += 20;
    factors.push("Blood pressure above threshold");
    factors.push(`Elevated Stage 2 Hypertension (${systolic}/${diastolic} mmHg)`);
  }

  if (glucose >= 200 && glucose < 400) {
    isHighRisk = true;
    score += 20;
    factors.push("Elevated glucose");
    factors.push(`High blood glucose (${glucose} mg/dL)`);
  }

  if (pulse >= 100 && pulse < 140) {
    score += 12;
    factors.push(`Tachycardia / elevated heart rate (${pulse} bpm)`);
  } else if (pulse > 0 && pulse >= 40 && pulse < 50) {
    score += 15;
    factors.push(`Bradycardia / low heart rate (${pulse} bpm)`);
  }

  if (tempF >= 101.5 && tempF < 104.0) {
    score += 15;
    factors.push(`High fever (${tempF.toFixed(1)}°F)`);
  }

  if (bmiData && (bmiData.bmi >= 35 || bmiData.bmi < 16)) {
    score += 12;
    factors.push(bmiData.bmi >= 35 ? `Severe obesity (BMI ${bmiData.bmi})` : `Severe malnutrition (BMI ${bmiData.bmi})`);
  }

  // 3. Attention Triggers
  if ((systolic >= 120 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) {
    score += 10;
    factors.push(`Borderline pre-hypertension (${systolic}/${diastolic} mmHg)`);
  }

  if (glucose >= 140 && glucose < 200) {
    score += 10;
    factors.push(`Pre-diabetes / Impaired glucose tolerance (${glucose} mg/dL)`);
  }

  if (spo2 >= 94 && spo2 < 96) {
    score += 8;
    factors.push(`Borderline oxygen saturation (SpO2 ${spo2}%)`);
  }

  if (tempF >= 99.5 && tempF < 101.5) {
    score += 8;
    factors.push(`Mild low-grade fever (${tempF.toFixed(1)}°F)`);
  }

  if (bmiData && ((bmiData.bmi >= 25 && bmiData.bmi < 35) || (bmiData.bmi >= 16 && bmiData.bmi < 18.5))) {
    score += 6;
    factors.push(`BMI outside ideal range (${bmiData.category}: ${bmiData.bmi})`);
  }

  if (/diabetes|hypertension|heart|kidney|asthma|copd|tb|tuberculosis/i.test(conditionsText)) {
    score += 10;
    factors.push("Relevant existing condition");
    factors.push("Co-existing chronic disease profile");
  }

  if ((input.age ?? 0) >= 65) {
    score += 8;
    factors.push("Senior citizen demographic vulnerability");
  }

  if ((input.missedFollowUps ?? 0) > 0) {
    score += 10;
    factors.push("Missed follow-up");
  }

  if (symptomsText.trim().length > 0 && !isEmergency && !isHighRisk) {
    score += 10;
    factors.push("Reported symptoms present");
  }

  score = Math.min(100, Math.max(0, score));

  // Determine final 4-tier status
  let status: ScreeningStatus = "NORMAL";
  let triageLevel: TriageLevel = "self_care";
  let recommendedAction = "";
  let safetyNet = "";

  if (isEmergency || score >= 80) {
    status = "EMERGENCY";
    triageLevel = "emergency";
    score = Math.max(score, 80);
    recommendedAction = "IMMEDIATE EMERGENCY ESCALATION: Call 108 Emergency Ambulance / arrange urgent transport to nearest CHC/District Hospital immediately. Keep airway clear, administer basic first aid, and do not leave beneficiary unassisted.";
    safetyNet = "CRITICAL MEDICAL EMERGENCY: Seek immediate hospital care and IMMEDIATE MEDICAL HELP. Do not wait.";
  } else if (isHighRisk || score >= 50) {
    status = "HIGH RISK";
    triageLevel = "urgent";
    score = Math.max(score, 50);
    recommendedAction = "Prompt 24-48h clinical consult at PHC/Sub-Centre with Medical Officer/CHO / clinician. Initiate specialist referral, schedule weekly ASHA home surveillance visits, and evaluate medication compliance.";
    safetyNet = "Arrange prompt medical review. Escalate to 108 emergency services if chest pain, shortness of breath, or confusion develops.";
  } else if (score >= 25 || factors.length > 0) {
    status = "ATTENTION";
    triageLevel = "routine";
    score = Math.max(score, 25);
    recommendedAction = "Targeted lifestyle, dietary, and physical activity counseling. Schedule follow-up screening within 14–30 days by ASHA worker. Monitor salt, sugar, and hydration.";
    safetyNet = "Follow recommended health advice and contact a clinician if symptoms worsen or new warning signs appear.";
  } else {
    status = "NORMAL";
    triageLevel = "self_care";
    recommendedAction = "Vitals within healthy physiological limits. Continue routine annual/biannual community screening and maintain balanced nutrition and hydration.";
    safetyNet = "Continue regular wellness habits and participate in village health drives.";
  }

  return {
    status,
    score,
    factors: factors.length ? factors : ["All recorded vitals and parameters within healthy normal limits"],
    recommendedAction,
    triageLevel,
    safetyNet,
    bmiData,
  };
}

export function assessRisk(input: DecisionSupportInput): RiskAssessment {
  const result = evaluateCommunityScreening(input);
  const category = result.status === "EMERGENCY" ? "critical" : result.status === "HIGH RISK" ? "high" : result.status === "ATTENTION" ? "moderate" : "low";
  return {
    score: result.score,
    category,
    status: result.status,
    factors: result.factors,
    nextStep: result.recommendedAction,
    recommendedAction: result.recommendedAction,
  };
}

export function triageFromRules(input: DecisionSupportInput): { level: TriageLevel; safetyNet: string; reasons: string[] } {
  const result = evaluateCommunityScreening(input);
  return {
    level: result.triageLevel,
    safetyNet: result.safetyNet,
    reasons: result.factors,
  };
}

export async function generateTriageSummary(input: DecisionSupportInput, ruleResult: ReturnType<typeof triageFromRules>) {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a community healthcare decision support communication assistant for ASHA/CHO workers in India. Produce a concise plain-language triage summary. This is decision support only, never a clinical diagnosis. Respect the rule-based urgency level and always include safety-net advice." },
        { role: "user", content: JSON.stringify({ input, ruleResult }) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "triage_summary",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              urgency: { type: "string", enum: ["emergency", "urgent", "routine", "self_care"] },
              safetyNet: { type: "string" },
              disclaimer: { type: "string" },
            },
            required: ["summary", "urgency", "safetyNet", "disclaimer"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices?.[0]?.message?.content;
    const raw = typeof content === "string" ? content : "";
    const parsed = JSON.parse(raw) as { summary: string; urgency: TriageLevel; safetyNet: string; disclaimer: string };
    return { ...parsed, urgency: ruleResult.level, safetyNet: parsed.safetyNet || ruleResult.safetyNet, disclaimer: "AI-assisted decision support only — not a diagnosis. Review with a qualified clinician." };
  } catch {
    return { summary: `Triage evaluation indicates ${ruleResult.level.replace("_", " ")} care is recommended based on field screening vitals.`, urgency: ruleResult.level, safetyNet: ruleResult.safetyNet, disclaimer: "AI-assisted decision support only — not a diagnosis. Review with a qualified clinician." };
  }
}

export type DoctorClinicalSummaryResult = {
  header: "AI-GENERATED SUMMARY";
  summary: string;
  structuredBrief: {
    demographics: string;
    chronicConditions: string[];
    allergies: string[];
    vitalsSummary: string;
    riskClassification: string;
    recentVisitsCount: number;
    activePrescriptions: string[];
    pendingReferrals: string[];
    pendingFollowUps: string[];
  };
  keyClinicalAlerts: string[];
  suggestedFocusAreas: string[];
  disclaimer: string;
  safetyNotice: string;
  generatedAt: Date;
};

export const CLINICAL_SAFETY_NOTICE =
  "AI must never autonomously diagnose or prescribe. Clinical decision, final diagnosis, treatment plan, and prescription belong strictly to the attending doctor.";

export const CLINICAL_SUMMARY_DISCLAIMER =
  "AI-GENERATED SUMMARY · Decision Support Only. AI does not autonomously diagnose or prescribe. Attending doctor has full discretion to edit, refine, or override clinical notes and treatment plans.";

export async function generateDoctorClinicalSummary(patientProfile: {
  patient: {
    id: number;
    name: string;
    age: number;
    gender: string;
    village?: string | null;
    district?: string | null;
    allergies?: string | null;
    conditions?: string | null;
    bloodGroup?: string | null;
    emergencyContact?: string | null;
    riskScore?: number;
    riskCategory?: string;
  };
  latestVitals?: {
    bpSystolic?: number | null;
    bpDiastolic?: number | null;
    pulse?: number | null;
    spo2?: number | null;
    temperature?: string | number | null;
    glucose?: number | null;
    weight?: string | number | null;
    height?: string | number | null;
    bmi?: string | number | null;
    triageLevel?: string | null;
    riskScore?: number | null;
  } | null;
  visits?: Array<{
    id: number;
    symptoms?: string | null;
    notes?: string | null;
    diagnosis?: string | null;
    bpSystolic?: number | null;
    bpDiastolic?: number | null;
    glucose?: number | null;
    spo2?: number | null;
    triageLevel?: string | null;
    createdAt: Date | string;
  }>;
  prescriptions?: Array<{
    id: number;
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    status: string;
  }>;
  referrals?: Array<{
    id: number;
    specialty?: string | null;
    urgency: string;
    reason: string;
    status: string;
    outcome?: string | null;
  }>;
  followUps?: Array<{
    id: number;
    title: string;
    dueAt: Date | string;
    status: string;
    notes?: string | null;
  }>;
}): Promise<DoctorClinicalSummaryResult> {
  const { patient, latestVitals, visits = [], prescriptions = [], referrals = [], followUps = [] } = patientProfile;

  const chronicList = (patient.conditions || "None documented")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const allergyList = (patient.allergies || "None documented")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const activePrescriptions = prescriptions
    .filter((p) => p.status === "active")
    .map((p) => `${p.medicineName} (${p.dosage}, ${p.frequency})`);

  const pendingReferrals = referrals
    .filter((r) => r.status === "pending" || r.status === "in_progress" || r.status === "accepted")
    .map((r) => `[${r.urgency.toUpperCase()}] ${r.specialty || "Specialist"}: ${r.reason}`);

  const pendingFollowUps = followUps
    .filter((f) => f.status === "open" || f.status === "overdue")
    .map((f) => `[${f.status.toUpperCase()}] ${f.title} (Due: ${new Date(f.dueAt).toLocaleDateString()})`);

  const vitalsText = latestVitals
    ? `BP: ${latestVitals.bpSystolic ?? "—"}/${latestVitals.bpDiastolic ?? "—"} mmHg | Pulse: ${latestVitals.pulse ?? "—"} bpm | SpO2: ${latestVitals.spo2 ?? "—"}% | Glucose: ${latestVitals.glucose ?? "—"} mg/dL | Temp: ${latestVitals.temperature ?? "—"}°F | BMI: ${latestVitals.bmi ?? "—"}`
    : "No recent vitals on record.";

  const keyAlerts: string[] = [];
  if (patient.allergies && patient.allergies.toLowerCase() !== "none") {
    keyAlerts.push(`Documented Allergies: ${patient.allergies}`);
  }
  if (latestVitals?.bpSystolic && (latestVitals.bpSystolic >= 140 || (latestVitals.bpDiastolic && latestVitals.bpDiastolic >= 90))) {
    keyAlerts.push(`Elevated Blood Pressure: ${latestVitals.bpSystolic}/${latestVitals.bpDiastolic} mmHg`);
  }
  if (latestVitals?.glucose && latestVitals.glucose >= 180) {
    keyAlerts.push(`Hyperglycemia: Blood Glucose ${latestVitals.glucose} mg/dL`);
  }
  if (latestVitals?.spo2 && latestVitals.spo2 < 95) {
    keyAlerts.push(`Borderline Hypoxia: SpO2 ${latestVitals.spo2}%`);
  }
  if (pendingFollowUps.some((f) => f.includes("OVERDUE"))) {
    keyAlerts.push("Overdue field follow-up requires immediate review");
  }

  const focusAreas: string[] = [];
  if (chronicList.some((c) => /hypertension|bp/i.test(c))) focusAreas.push("Antihypertensive medication titration and dietary sodium counseling");
  if (chronicList.some((c) => /diabetes|glucose/i.test(c))) focusAreas.push("Glycemic control review, HbA1c screening, and foot/renal evaluation");
  if (chronicList.some((c) => /asthma|copd|bronchitis/i.test(c))) focusAreas.push("Respiratory compliance, inhaler technique, and seasonal trigger evaluation");
  if (chronicList.some((c) => /pregnancy|antenatal|anc/i.test(c))) focusAreas.push("Antenatal wellness, fetal growth, IFA compliance, and pre-eclampsia monitoring");
  if (focusAreas.length === 0) focusAreas.push("Routine clinical examination, preventive counseling, and age-appropriate screenings");

  const structuredBrief = {
    demographics: `${patient.name}, ${patient.age} yrs (${patient.gender.toUpperCase()}) · Village: ${patient.village || "Unknown"}, District: ${patient.district || "Ahmedabad Rural"}`,
    chronicConditions: chronicList,
    allergies: allergyList,
    vitalsSummary: vitalsText,
    riskClassification: `Risk Score: ${patient.riskScore ?? latestVitals?.riskScore ?? 0}/100 (${(patient.riskCategory || "low").toUpperCase()}) · Triage: ${(latestVitals?.triageLevel || "routine").toUpperCase()}`,
    recentVisitsCount: visits.length,
    activePrescriptions: activePrescriptions.length ? activePrescriptions : ["No active prescriptions on file"],
    pendingReferrals: pendingReferrals.length ? pendingReferrals : ["No pending referrals"],
    pendingFollowUps: pendingFollowUps.length ? pendingFollowUps : ["No pending follow-ups"],
  };

  // Deterministic summary base
  const latestVisitNotes = visits[0]?.notes || visits[0]?.symptoms || "None logged";
  const deterministicSummary =
    `PATIENT BRIEF: ${structuredBrief.demographics}.\n` +
    `CLINICAL BACKGROUND: Chronic conditions (${chronicList.join(", ")}). Allergies (${allergyList.join(", ")}).\n` +
    `LATEST VITALS: ${vitalsText}.\n` +
    `CURRENT REGIMEN & TASKS: Active Medications: ${activePrescriptions.join(", ") || "None"}. Open Follow-ups: ${pendingFollowUps.length}. Prior Encounter Notes: "${latestVisitNotes}".\n` +
    `KEY CLINICAL ALERTS: ${keyAlerts.length ? keyAlerts.join("; ") : "No acute vital flags detected."}`;

  let finalSummary = deterministicSummary;

  try {
    const promptContext = {
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        village: patient.village,
        conditions: patient.conditions,
        allergies: patient.allergies,
        riskScore: patient.riskScore,
        riskCategory: patient.riskCategory,
      },
      latestVitals,
      recentVisits: visits.slice(0, 3).map((v) => ({
        date: v.createdAt,
        diagnosis: v.diagnosis,
        symptoms: v.symptoms,
        notes: v.notes,
        vitals: `${v.bpSystolic || "—"}/${v.bpDiastolic || "—"} mmHg, glucose ${v.glucose || "—"}`,
      })),
      activePrescriptions,
      pendingReferrals,
      pendingFollowUps,
    };

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an AI Clinical Documentation Assistant for Medical Officers in Indian Primary Health Centres (PHC) & Community Health Centres (CHC). " +
            "Your role is STRICTLY to synthesize structured EHR information into a concise, professional clinical briefing for the attending doctor. " +
            "CRITICAL SAFETY RULE: You must NEVER make an autonomous diagnosis or autonomous prescription. " +
            "Highlight abnormal vitals, chronic co-morbidities, drug allergies, active medicines, and pending follow-ups clearly. " +
            "Keep the summary structured, factual, and concise (100–180 words).",
        },
        {
          role: "user",
          content: `Generate a clinical encounter summary for the attending doctor based on this structured EHR profile:\n${JSON.stringify(promptContext, null, 2)}`,
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim().length > 20) {
      finalSummary = content.trim();
    }
  } catch (err) {
    // Graceful fallback to deterministic summary
    finalSummary = deterministicSummary;
  }

  return {
    header: "AI-GENERATED SUMMARY",
    summary: finalSummary,
    structuredBrief,
    keyClinicalAlerts: keyAlerts,
    suggestedFocusAreas: focusAreas,
    disclaimer: CLINICAL_SUMMARY_DISCLAIMER,
    safetyNotice: CLINICAL_SAFETY_NOTICE,
    generatedAt: new Date(),
  };
}

