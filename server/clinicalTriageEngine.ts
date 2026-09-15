import { invokeLLM } from "./_core/llm";

export type DeterministicTriageCategory = "CRITICAL" | "URGENT" | "ROUTINE" | "LOW PRIORITY";
export type LegacyTriageLevel = "emergency" | "urgent" | "routine" | "self_care";

export interface ClinicalTriageInput {
  patientId?: number;
  age?: number;
  gender?: "female" | "male" | "other" | "undisclosed";
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  spo2?: number;
  temperature?: number; // deg F or deg C
  glucose?: number;
  weight?: number; // kg
  height?: number; // cm
  bmi?: number;
  symptoms?: string;
  structuredSymptoms?: string[];
  conditions?: string;
  existingConditions?: string;
  pregnancyStatus?: string;
  notes?: string;
  missedFollowUps?: number;
}

export interface TriageRuleEvaluation {
  ruleId: string;
  ruleName: string;
  category: DeterministicTriageCategory;
  priorityDisplay: string;
  triggered: boolean;
  reason: string;
  recommendedAction: string;
  severityScore: number;
}

export interface DeterministicTriageResult {
  category: DeterministicTriageCategory;
  priorityDisplay: string;
  triageLevel: LegacyTriageLevel;
  score: number;
  isEmergency: boolean;
  reasons: string[];
  recommendedAction: string;
  safetyDisclaimer: string;
  triggeredRules: TriageRuleEvaluation[];
  evaluatedAt: Date;
}

export interface TriageEngineConfig {
  vitalThresholds: {
    criticalBpSystolicHigh: number;
    criticalBpDiastolicHigh: number;
    urgentBpSystolicHigh: number;
    urgentBpDiastolicHigh: number;
    routineBpSystolicHigh: number;
    routineBpDiastolicHigh: number;
    criticalSpo2Low: number;
    urgentSpo2Low: number;
    routineSpo2Low: number;
    criticalGlucoseLow: number;
    criticalGlucoseHigh: number;
    urgentGlucoseHigh: number;
    routineGlucoseHigh: number;
    criticalPulseLow: number;
    criticalPulseHigh: number;
    urgentPulseLow: number;
    urgentPulseHigh: number;
    criticalTempHighF: number;
    criticalTempLowF: number;
    urgentTempHighF: number;
    routineTempHighF: number;
    urgentBmiHigh: number;
    urgentBmiLow: number;
  };
  redFlagKeywords: {
    severeBreathing: string[];
    severeChestPain: string[];
    lossOfConsciousness: string[];
    severeBleeding: string[];
    strokeSymptoms: string[];
    obstetricEmergency: string[];
  };
}

export const DEFAULT_TRIAGE_CONFIG: TriageEngineConfig = {
  vitalThresholds: {
    criticalBpSystolicHigh: 180,
    criticalBpDiastolicHigh: 120,
    urgentBpSystolicHigh: 140,
    urgentBpDiastolicHigh: 90,
    routineBpSystolicHigh: 120,
    routineBpDiastolicHigh: 80,
    criticalSpo2Low: 90,
    urgentSpo2Low: 94,
    routineSpo2Low: 96,
    criticalGlucoseLow: 50,
    criticalGlucoseHigh: 400,
    urgentGlucoseHigh: 200,
    routineGlucoseHigh: 140,
    criticalPulseLow: 40,
    criticalPulseHigh: 140,
    urgentPulseLow: 50,
    urgentPulseHigh: 100,
    criticalTempHighF: 104.0,
    criticalTempLowF: 95.0,
    urgentTempHighF: 101.5,
    routineTempHighF: 99.5,
    urgentBmiHigh: 35.0,
    urgentBmiLow: 16.0,
  },
  redFlagKeywords: {
    severeBreathing: [
      "severe breathing",
      "difficulty breathing",
      "severe dyspnea",
      "shortness of breath",
      "breathlessness",
      "gasping",
      "stridor",
      "respiratory distress",
      "unable to speak",
      "cyanosis",
      "blue lips",
    ],
    severeChestPain: [
      "chest pain",
      "crushing chest",
      "chest pressure",
      "chest tightness",
      "radiating to left arm",
      "radiating to jaw",
      "cardiac arrest",
      "heart attack",
      "angina",
    ],
    lossOfConsciousness: [
      "loss of consciousness",
      "unconscious",
      "unresponsive",
      "fainting",
      "syncope",
      "collapsed",
      "coma",
      "blackout",
      "passed out",
    ],
    severeBleeding: [
      "severe bleeding",
      "massive bleeding",
      "hemorrhage",
      "heavy bleeding",
      "coughing blood",
      "hemoptysis",
      "vomiting blood",
      "hematemesis",
      "rectal bleeding",
      "uncontrolled bleeding",
      "postpartum hemorrhage",
    ],
    strokeSymptoms: [
      "stroke",
      "face droop",
      "facial drooping",
      "facial asymmetry",
      "arm weakness",
      "sudden paralysis",
      "slurred speech",
      "speech slurred",
      "inability to speak",
      "sudden numbness",
      "hemiparesis",
      "sudden vision loss",
    ],
    obstetricEmergency: [
      "vaginal bleeding in pregnancy",
      "heavy vaginal bleeding",
      "reduced fetal movement",
      "absent fetal movement",
      "severe pre-eclampsia",
      "eclampsia",
      "severe abdominal pain in pregnancy",
      "convulsion in pregnancy",
    ],
  },
};

export const CLINICAL_SAFETY_DISCLAIMER =
  "DECISION SUPPORT ONLY: This deterministic clinical triage engine provides urgency stratification and escalation recommendations. It does NOT provide a definitive diagnosis or dangerous treatment instructions. All critical and urgent recommendations require immediate evaluation by a qualified medical professional.";

function normalizeTemperatureToF(temp?: number): number | undefined {
  if (temp === undefined || temp === null || isNaN(temp)) return undefined;
  // If temperature is <= 45, treat as Celsius and convert to Fahrenheit
  if (temp <= 45) {
    return (temp * 9) / 5 + 32;
  }
  return temp;
}

function calculateDynamicBmi(weightKg?: number, heightCm?: number): number | undefined {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return undefined;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Executes all deterministic clinical safety rules BEFORE any LLM or GenAI.
 */
export function evaluateDeterministicClinicalTriage(
  input: ClinicalTriageInput,
  customConfig: Partial<TriageEngineConfig> = {}
): DeterministicTriageResult {
  const config: TriageEngineConfig = {
    vitalThresholds: { ...DEFAULT_TRIAGE_CONFIG.vitalThresholds, ...customConfig.vitalThresholds },
    redFlagKeywords: { ...DEFAULT_TRIAGE_CONFIG.redFlagKeywords, ...customConfig.redFlagKeywords },
  };

  const triggeredRules: TriageRuleEvaluation[] = [];

  const rawSymptoms = `${input.symptoms ?? ""} ${(input.structuredSymptoms ?? []).join(" ")}`.toLowerCase();
  const rawConditions = `${input.conditions ?? ""} ${input.existingConditions ?? ""}`.toLowerCase();
  const isPregnant =
    (input.pregnancyStatus &&
      input.pregnancyStatus !== "not_pregnant" &&
      input.pregnancyStatus !== "none" &&
      input.pregnancyStatus !== "") ||
    /pregnant|trimester|postpartum/i.test(rawConditions);

  const tempF = normalizeTemperatureToF(input.temperature);
  const bmi = input.bmi ?? calculateDynamicBmi(input.weight, input.height);

  // Helper to test keyword matches
  const hasKeyword = (keywords: string[]) => keywords.some((kw) => rawSymptoms.includes(kw));

  // ==========================================
  // 1. RED FLAG SYMPTOM RULES (CRITICAL)
  // ==========================================

  // Severe Breathing Difficulty
  if (hasKeyword(config.redFlagKeywords.severeBreathing)) {
    triggeredRules.push({
      ruleId: "RF_SEVERE_BREATHING",
      ruleName: "Severe Breathing Difficulty / Acute Respiratory Distress",
      category: "CRITICAL",
      priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
      triggered: true,
      reason: "Severe breathing difficulty / acute respiratory distress reported",
      recommendedAction: "Immediate professional medical evaluation: Call 108 Emergency Ambulance. Ensure unobstructed airway and position upright.",
      severityScore: 90,
    });
  }

  // Severe Chest Pain
  if (hasKeyword(config.redFlagKeywords.severeChestPain)) {
    triggeredRules.push({
      ruleId: "RF_SEVERE_CHEST_PAIN",
      ruleName: "Severe Chest Pain / Acute Coronary Syndrome Red Flag",
      category: "CRITICAL",
      priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
      triggered: true,
      reason: "Severe chest pain / acute cardiac red flag reported",
      recommendedAction: "Immediate professional medical evaluation: Call 108 Emergency Ambulance for immediate transfer to nearest cardiac-capable hospital.",
      severityScore: 90,
    });
  }

  // Loss of Consciousness
  if (hasKeyword(config.redFlagKeywords.lossOfConsciousness)) {
    triggeredRules.push({
      ruleId: "RF_LOSS_OF_CONSCIOUSNESS",
      ruleName: "Loss of Consciousness / Acute Syncope",
      category: "CRITICAL",
      priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
      triggered: true,
      reason: "Loss of consciousness / acute neurological collapse reported",
      recommendedAction: "Immediate professional medical evaluation: Check breathing and pulse, maintain recovery position, and dispatch 108 Emergency Ambulance.",
      severityScore: 95,
    });
  }

  // Severe Bleeding
  if (hasKeyword(config.redFlagKeywords.severeBleeding)) {
    triggeredRules.push({
      ruleId: "RF_SEVERE_BLEEDING",
      ruleName: "Severe Active Hemorrhage / Bleeding Red Flag",
      category: "CRITICAL",
      priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
      triggered: true,
      reason: "Severe active bleeding / acute hemorrhage reported",
      recommendedAction: "Immediate professional medical evaluation: Apply direct pressure with clean dressing. Arrange immediate emergency transport.",
      severityScore: 90,
    });
  }

  // Stroke Symptoms (FAST criteria)
  if (hasKeyword(config.redFlagKeywords.strokeSymptoms)) {
    triggeredRules.push({
      ruleId: "RF_STROKE_FAST",
      ruleName: "Acute Stroke Symptoms (FAST Protocol)",
      category: "CRITICAL",
      priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
      triggered: true,
      reason: "Acute stroke-like neurological symptoms (facial droop, weakness, slurred speech) reported",
      recommendedAction: "Immediate professional medical evaluation: Urgent golden-hour stroke emergency referral via 108 Ambulance.",
      severityScore: 95,
    });
  }

  // Obstetric Emergency Red Flags in Pregnancy
  if (isPregnant && hasKeyword(config.redFlagKeywords.obstetricEmergency)) {
    triggeredRules.push({
      ruleId: "RF_OBSTETRIC_EMERGENCY",
      ruleName: "Maternal Obstetric Emergency Red Flag",
      category: "CRITICAL",
      priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
      triggered: true,
      reason: "High-risk obstetric emergency symptom reported during pregnancy",
      recommendedAction: "Immediate professional medical evaluation: Immediate emergency transfer to Comprehensive Emergency Obstetric Care (CEmONC) facility.",
      severityScore: 95,
    });
  }

  // ==========================================
  // 2. CRITICALLY ABNORMAL VITAL SIGNS (CRITICAL)
  // ==========================================

  // Hypertensive Crisis (Systolic >= 180 or Diastolic >= 120)
  if (
    (input.bpSystolic !== undefined && input.bpSystolic >= config.vitalThresholds.criticalBpSystolicHigh) ||
    (input.bpDiastolic !== undefined && input.bpDiastolic >= config.vitalThresholds.criticalBpDiastolicHigh)
  ) {
    triggeredRules.push({
      ruleId: "VITAL_HYPERTENSIVE_CRISIS",
      ruleName: "Hypertensive Crisis (Systolic ≥ 180 or Diastolic ≥ 120 mmHg)",
      category: "CRITICAL",
      priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
      triggered: true,
      reason: `Critically elevated blood pressure (Hypertensive Crisis: ${input.bpSystolic ?? "--"}/${input.bpDiastolic ?? "--"} mmHg)`,
      recommendedAction: "Immediate professional medical evaluation: Call 108 Emergency Ambulance or transfer to emergency department.",
      severityScore: 85,
    });
  }

  // Critical Hypoxia (SpO2 < 90%)
  if (input.spo2 !== undefined && input.spo2 > 0 && input.spo2 < config.vitalThresholds.criticalSpo2Low) {
    triggeredRules.push({
      ruleId: "VITAL_CRITICAL_HYPOXIA",
      ruleName: "Critical Hypoxia (SpO2 < 90%)",
      category: "CRITICAL",
      priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
      triggered: true,
      reason: `Critically low oxygen saturation (Critical Hypoxia: SpO2 ${input.spo2}%)`,
      recommendedAction: "Immediate professional medical evaluation: High-flow oxygen support and immediate emergency transport.",
      severityScore: 90,
    });
  }

  // Severe Hypoglycemia (Glucose < 50 mg/dL)
  if (input.glucose !== undefined && input.glucose > 0 && input.glucose < config.vitalThresholds.criticalGlucoseLow) {
    triggeredRules.push({
      ruleId: "VITAL_SEVERE_HYPOGLYCEMIA",
      ruleName: "Severe Hypoglycemia (Glucose < 50 mg/dL)",
      category: "CRITICAL",
      priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
      triggered: true,
      reason: `Critically low blood glucose (Severe Hypoglycemia: ${input.glucose} mg/dL)`,
      recommendedAction: "Immediate professional medical evaluation: Administer fast-acting oral glucose if conscious; if unconscious, seek emergency IV glucose.",
      severityScore: 88,
    });
  }

  // Extreme Hyperglycemia (Glucose >= 400 mg/dL)
  if (input.glucose !== undefined && input.glucose >= config.vitalThresholds.criticalGlucoseHigh) {
    triggeredRules.push({
      ruleId: "VITAL_EXTREME_HYPERGLYCEMIA",
      ruleName: "Extreme Hyperglycemic Spike (Glucose ≥ 400 mg/dL)",
      category: "CRITICAL",
      priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
      triggered: true,
      reason: `Critically elevated blood glucose (Extreme Hyperglycemia: ${input.glucose} mg/dL)`,
      recommendedAction: "Immediate professional medical evaluation: Urgent hospital assessment for diabetic ketoacidosis / hyperosmolar state.",
      severityScore: 85,
    });
  }

  // Critical Pulse Anomaly (Pulse >= 140 or < 40 bpm)
  if (
    input.pulse !== undefined &&
    (input.pulse >= config.vitalThresholds.criticalPulseHigh || (input.pulse > 0 && input.pulse < config.vitalThresholds.criticalPulseLow))
  ) {
    triggeredRules.push({
      ruleId: "VITAL_CRITICAL_PULSE",
      ruleName: "Critical Pulse Anomaly (Severe Tachycardia / Severe Bradycardia)",
      category: "CRITICAL",
      priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
      triggered: true,
      reason: `Critically abnormal heart rate (${input.pulse} bpm - severe ${input.pulse >= 140 ? "tachycardia" : "bradycardia"})`,
      recommendedAction: "Immediate professional medical evaluation: Electrocardiogram (ECG) and urgent cardiac monitoring.",
      severityScore: 85,
    });
  }

  // Hyperpyrexia (Temp >= 104°F) or Severe Hypothermia (Temp < 95°F)
  if (tempF !== undefined && (tempF >= config.vitalThresholds.criticalTempHighF || tempF < config.vitalThresholds.criticalTempLowF)) {
    triggeredRules.push({
      ruleId: "VITAL_CRITICAL_TEMPERATURE",
      ruleName: "Critical Temperature Extremes (Hyperpyrexia ≥ 104°F or Hypothermia < 95°F)",
      category: "CRITICAL",
      priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
      triggered: true,
      reason: `Critically abnormal body temperature (${tempF.toFixed(1)}°F - ${tempF >= 104 ? "Hyperpyrexia" : "Severe Hypothermia"})`,
      recommendedAction: "Immediate professional medical evaluation: Active thermal stabilization and emergency medical care.",
      severityScore: 85,
    });
  }

  // Maternal Pre-eclampsia (High BP + Pregnancy with symptoms)
  if (isPregnant && input.bpSystolic !== undefined && input.bpDiastolic !== undefined) {
    if (input.bpSystolic >= 160 || input.bpDiastolic >= 110 || (input.bpSystolic >= 140 && /headache|vision|blur|swelling/i.test(rawSymptoms))) {
      triggeredRules.push({
        ruleId: "MATERNAL_PREECLAMPSIA",
        ruleName: "Maternal Pre-eclampsia Risk Alert",
        category: "CRITICAL",
        priorityDisplay: "EMERGENCY / IMMEDIATE MEDICAL ATTENTION",
        triggered: true,
        reason: `Maternal pre-eclampsia risk: High BP (${input.bpSystolic}/${input.bpDiastolic} mmHg) with warning signs in pregnancy`,
        recommendedAction: "Immediate professional medical evaluation: Emergency obstetric evaluation at First Referral Unit (FRU) / CHC.",
        severityScore: 92,
      });
    }
  }

  // ==========================================
  // 3. URGENT CLINICAL RULES (URGENT)
  // ==========================================

  // Stage 2 Hypertension (Systolic 140-179 or Diastolic 90-119)
  if (
    ((input.bpSystolic !== undefined && input.bpSystolic >= config.vitalThresholds.urgentBpSystolicHigh && input.bpSystolic < config.vitalThresholds.criticalBpSystolicHigh) ||
      (input.bpDiastolic !== undefined && input.bpDiastolic >= config.vitalThresholds.urgentBpDiastolicHigh && input.bpDiastolic < config.vitalThresholds.criticalBpDiastolicHigh)) &&
    !triggeredRules.some((r) => r.ruleId === "VITAL_HYPERTENSIVE_CRISIS")
  ) {
    triggeredRules.push({
      ruleId: "VITAL_STAGE2_HYPERTENSION",
      ruleName: "Stage 2 Hypertension (BP ≥ 140/90 mmHg)",
      category: "URGENT",
      priorityDisplay: "HIGH PRIORITY / URGENT MEDICAL EVALUATION",
      triggered: true,
      reason: `BP significantly elevated (Stage 2 Hypertension: ${input.bpSystolic ?? "--"}/${input.bpDiastolic ?? "--"} mmHg)`,
      recommendedAction: "Prompt clinical consultation within 24–48 hours at PHC/Sub-Centre with Medical Officer/CHO.",
      severityScore: 60,
    });
  }

  // Moderate Hypoxia (SpO2 90-93%)
  if (
    input.spo2 !== undefined &&
    input.spo2 >= config.vitalThresholds.criticalSpo2Low &&
    input.spo2 < config.vitalThresholds.urgentSpo2Low &&
    !triggeredRules.some((r) => r.ruleId === "VITAL_CRITICAL_HYPOXIA")
  ) {
    triggeredRules.push({
      ruleId: "VITAL_MODERATE_HYPOXIA",
      ruleName: "Moderate Hypoxia (SpO2 90–93%)",
      category: "URGENT",
      priorityDisplay: "HIGH PRIORITY / URGENT MEDICAL EVALUATION",
      triggered: true,
      reason: `Subnormal oxygen saturation (SpO2 ${input.spo2}%)`,
      recommendedAction: "Urgent medical evaluation and oxygenation assessment by clinical team.",
      severityScore: 65,
    });
  }

  // Significant Hyperglycemia (Glucose 200-399 mg/dL)
  if (
    input.glucose !== undefined &&
    input.glucose >= config.vitalThresholds.urgentGlucoseHigh &&
    input.glucose < config.vitalThresholds.criticalGlucoseHigh &&
    !triggeredRules.some((r) => r.ruleId === "VITAL_EXTREME_HYPERGLYCEMIA")
  ) {
    triggeredRules.push({
      ruleId: "VITAL_MARKED_HYPERGLYCEMIA",
      ruleName: "Significant Hyperglycemia (Glucose 200–399 mg/dL)",
      category: "URGENT",
      priorityDisplay: "HIGH PRIORITY / URGENT MEDICAL EVALUATION",
      triggered: true,
      reason: `Significantly elevated blood glucose (${input.glucose} mg/dL)`,
      recommendedAction: "Prompt medical review for glycemic control adjustment within 24–48 hours.",
      severityScore: 58,
    });
  }

  // High Fever (Temp 101.5 - 103.9°F)
  if (
    tempF !== undefined &&
    tempF >= config.vitalThresholds.urgentTempHighF &&
    tempF < config.vitalThresholds.criticalTempHighF &&
    !triggeredRules.some((r) => r.ruleId === "VITAL_CRITICAL_TEMPERATURE")
  ) {
    triggeredRules.push({
      ruleId: "VITAL_HIGH_FEVER",
      ruleName: "High Fever (101.5–103.9°F)",
      category: "URGENT",
      priorityDisplay: "HIGH PRIORITY / URGENT MEDICAL EVALUATION",
      triggered: true,
      reason: `High body temperature (${tempF.toFixed(1)}°F)`,
      recommendedAction: "Clinical evaluation for underlying infectious etiology and antipyretic guidance.",
      severityScore: 55,
    });
  }

  // Moderate Pulse Anomaly (Tachycardia 100-139 bpm or Bradycardia 40-49 bpm)
  if (
    input.pulse !== undefined &&
    ((input.pulse >= config.vitalThresholds.urgentPulseHigh && input.pulse < config.vitalThresholds.criticalPulseHigh) ||
      (input.pulse >= config.vitalThresholds.criticalPulseLow && input.pulse < config.vitalThresholds.urgentPulseLow)) &&
    !triggeredRules.some((r) => r.ruleId === "VITAL_CRITICAL_PULSE")
  ) {
    triggeredRules.push({
      ruleId: "VITAL_MODERATE_PULSE",
      ruleName: "Abnormal Pulse (Tachycardia / Bradycardia)",
      category: "URGENT",
      priorityDisplay: "HIGH PRIORITY / URGENT MEDICAL EVALUATION",
      triggered: true,
      reason: `Abnormal resting heart rate (${input.pulse} bpm)`,
      recommendedAction: "Cardiovascular review and pulse rhythm verification by Medical Officer.",
      severityScore: 52,
    });
  }

  // Severe Malnutrition / Morbid Obesity
  if (bmi !== undefined && (bmi >= config.vitalThresholds.urgentBmiHigh || bmi < config.vitalThresholds.urgentBmiLow)) {
    triggeredRules.push({
      ruleId: "VITAL_EXTREME_BMI",
      ruleName: "Extreme Body Mass Index Alert",
      category: "URGENT",
      priorityDisplay: "HIGH PRIORITY / URGENT MEDICAL EVALUATION",
      triggered: true,
      reason: `BMI at extreme physiological limits (${bmi >= 35 ? "Severe Obesity" : "Severe Malnutrition"}: BMI ${bmi})`,
      recommendedAction: "Targeted clinical nutrition support and metabolic evaluation.",
      severityScore: 50,
    });
  }

  // Gestational Hypertension without emergency features
  if (
    isPregnant &&
    input.bpSystolic !== undefined &&
    input.bpDiastolic !== undefined &&
    (input.bpSystolic >= 140 || input.bpDiastolic >= 90) &&
    !triggeredRules.some((r) => r.ruleId === "MATERNAL_PREECLAMPSIA")
  ) {
    triggeredRules.push({
      ruleId: "MATERNAL_GESTATIONAL_HTN",
      ruleName: "Gestational Hypertension in Pregnancy",
      category: "URGENT",
      priorityDisplay: "HIGH PRIORITY / URGENT MEDICAL EVALUATION",
      triggered: true,
      reason: `Elevated blood pressure during pregnancy (Gestational Hypertension: ${input.bpSystolic}/${input.bpDiastolic} mmHg)`,
      recommendedAction: "High-risk antenatal care consultation within 24 hours.",
      severityScore: 65,
    });
  }

  // ==========================================
  // 4. ROUTINE CLINICAL RULES (ROUTINE)
  // ==========================================

  // Borderline Pre-Hypertension (Systolic 120-139 or Diastolic 80-89)
  if (
    ((input.bpSystolic !== undefined && input.bpSystolic >= config.vitalThresholds.routineBpSystolicHigh && input.bpSystolic < config.vitalThresholds.urgentBpSystolicHigh) ||
      (input.bpDiastolic !== undefined && input.bpDiastolic >= config.vitalThresholds.routineBpDiastolicHigh && input.bpDiastolic < config.vitalThresholds.urgentBpDiastolicHigh)) &&
    !triggeredRules.some((r) => r.category === "CRITICAL" || r.category === "URGENT")
  ) {
    triggeredRules.push({
      ruleId: "ROUTINE_PREHYPERTENSION",
      ruleName: "Pre-Hypertension (BP 120–139 / 80–89 mmHg)",
      category: "ROUTINE",
      priorityDisplay: "ROUTINE PRIORITY / SCHEDULED CLINICAL REVIEW",
      triggered: true,
      reason: `Borderline elevated blood pressure (${input.bpSystolic ?? "--"}/${input.bpDiastolic ?? "--"} mmHg)`,
      recommendedAction: "Dietary salt reduction, lifestyle counseling, and scheduled re-screening in 14–30 days.",
      severityScore: 30,
    });
  }

  // Impaired Glucose Tolerance / Pre-Diabetes (140-199 mg/dL)
  if (
    input.glucose !== undefined &&
    input.glucose >= config.vitalThresholds.routineGlucoseHigh &&
    input.glucose < config.vitalThresholds.urgentGlucoseHigh &&
    !triggeredRules.some((r) => r.category === "CRITICAL" || r.category === "URGENT")
  ) {
    triggeredRules.push({
      ruleId: "ROUTINE_PREDIABETES",
      ruleName: "Impaired Glucose Tolerance (140–199 mg/dL)",
      category: "ROUTINE",
      priorityDisplay: "ROUTINE PRIORITY / SCHEDULED CLINICAL REVIEW",
      triggered: true,
      reason: `Borderline elevated blood glucose (${input.glucose} mg/dL)`,
      recommendedAction: "Dietary counseling, exercise prescription, and fasting blood glucose test.",
      severityScore: 30,
    });
  }

  // Mild Non-Emergency Symptoms Reported
  if (rawSymptoms.trim().length > 0 && !triggeredRules.some((r) => r.category === "CRITICAL" || r.category === "URGENT")) {
    triggeredRules.push({
      ruleId: "ROUTINE_SYMPTOMS",
      ruleName: "Reported Community Symptoms",
      category: "ROUTINE",
      priorityDisplay: "ROUTINE PRIORITY / SCHEDULED CLINICAL REVIEW",
      triggered: true,
      reason: "Non-critical symptoms reported by beneficiary",
      recommendedAction: "Routine clinical assessment at next Sub-Centre/PHC clinic session.",
      severityScore: 25,
    });
  }

  // Chronic Disease Management Profile
  if (
    /diabetes|hypertension|heart|kidney|asthma|copd|tb|tuberculosis/i.test(rawConditions) &&
    !triggeredRules.some((r) => r.category === "CRITICAL" || r.category === "URGENT")
  ) {
    triggeredRules.push({
      ruleId: "ROUTINE_CHRONIC_CARE",
      ruleName: "Known Chronic Disease Management",
      category: "ROUTINE",
      priorityDisplay: "ROUTINE PRIORITY / SCHEDULED CLINICAL REVIEW",
      triggered: true,
      reason: "Beneficiary has established chronic health condition requiring periodic surveillance",
      recommendedAction: "Verify medication adherence and check quarterly NCD monitoring indicators.",
      severityScore: 30,
    });
  }

  // Missed Follow-up
  if ((input.missedFollowUps ?? 0) > 0) {
    triggeredRules.push({
      ruleId: "ROUTINE_MISSED_FOLLOWUP",
      ruleName: "Overdue Scheduled Follow-Up",
      category: "ROUTINE",
      priorityDisplay: "ROUTINE PRIORITY / SCHEDULED CLINICAL REVIEW",
      triggered: true,
      reason: "Beneficiary has missed a scheduled clinical follow-up",
      recommendedAction: "ASHA home visit to re-engage beneficiary and reschedule consultation.",
      severityScore: 28,
    });
  }

  // Senior Citizen Age Vulnerability (Age >= 65)
  if ((input.age ?? 0) >= 65 && !triggeredRules.some((r) => r.category === "CRITICAL" || r.category === "URGENT")) {
    triggeredRules.push({
      ruleId: "ROUTINE_GERIATRIC_CARE",
      ruleName: "Geriatric Age Vulnerability (Age ≥ 65)",
      category: "ROUTINE",
      priorityDisplay: "ROUTINE PRIORITY / SCHEDULED CLINICAL REVIEW",
      triggered: true,
      reason: "Senior citizen demographic risk profile",
      recommendedAction: "Periodic geriatric health check and fall-prevention counseling.",
      severityScore: 25,
    });
  }

  // ==========================================
  // 5. DETERMINE FINAL CATEGORY & ESCALATION
  // ==========================================

  const hasCritical = triggeredRules.some((r) => r.category === "CRITICAL");
  const hasUrgent = triggeredRules.some((r) => r.category === "URGENT");
  const hasRoutine = triggeredRules.some((r) => r.category === "ROUTINE");

  let finalCategory: DeterministicTriageCategory = "LOW PRIORITY";
  let priorityDisplay = "LOW PRIORITY / COMMUNITY WELLNESS & SELF-CARE";
  let legacyTriageLevel: LegacyTriageLevel = "self_care";
  let recommendedAction =
    "All parameters within healthy physiological limits. Continue periodic annual/biannual community screening and healthy lifestyle habits.";
  let maxScore = 0;

  if (hasCritical) {
    finalCategory = "CRITICAL";
    priorityDisplay = "EMERGENCY / IMMEDIATE MEDICAL ATTENTION";
    legacyTriageLevel = "emergency";
    maxScore = Math.max(80, ...triggeredRules.filter((r) => r.category === "CRITICAL").map((r) => r.severityScore));

    const criticalActions = triggeredRules
      .filter((r) => r.category === "CRITICAL")
      .map((r) => r.recommendedAction);
    recommendedAction = `EMERGENCY / IMMEDIATE MEDICAL ATTENTION: ${criticalActions[0] || "Immediate professional medical evaluation: Call 108 Emergency Ambulance immediately."}`;
  } else if (hasUrgent) {
    finalCategory = "URGENT";
    priorityDisplay = "HIGH PRIORITY / URGENT MEDICAL EVALUATION";
    legacyTriageLevel = "urgent";
    maxScore = Math.max(50, ...triggeredRules.filter((r) => r.category === "URGENT").map((r) => r.severityScore));

    const urgentActions = triggeredRules
      .filter((r) => r.category === "URGENT")
      .map((r) => r.recommendedAction);
    recommendedAction = `HIGH PRIORITY: ${urgentActions[0] || "Prompt clinical review within 24–48 hours at PHC/Sub-Centre with Medical Officer/CHO."}`;
  } else if (hasRoutine) {
    finalCategory = "ROUTINE";
    priorityDisplay = "ROUTINE PRIORITY / SCHEDULED CLINICAL REVIEW";
    legacyTriageLevel = "routine";
    maxScore = Math.max(25, ...triggeredRules.filter((r) => r.category === "ROUTINE").map((r) => r.severityScore));

    const routineActions = triggeredRules
      .filter((r) => r.category === "ROUTINE")
      .map((r) => r.recommendedAction);
    recommendedAction = routineActions[0] || "Routine lifestyle counseling and scheduled follow-up screening in 14–30 days.";
  } else {
    finalCategory = "LOW PRIORITY";
    priorityDisplay = "LOW PRIORITY / COMMUNITY WELLNESS & SELF-CARE";
    legacyTriageLevel = "self_care";
    maxScore = 10;
  }

  const reasons =
    triggeredRules.length > 0
      ? Array.from(new Set(triggeredRules.map((r) => r.reason)))
      : ["All recorded vital signs and health parameters are within normal physiological limits"];

  return {
    category: finalCategory,
    priorityDisplay,
    triageLevel: legacyTriageLevel,
    score: Math.min(100, Math.max(0, maxScore)),
    isEmergency: hasCritical,
    reasons,
    recommendedAction,
    safetyDisclaimer: CLINICAL_SAFETY_DISCLAIMER,
    triggeredRules,
    evaluatedAt: new Date(),
  };
}

/**
 * Executes AI triage summary while strictly enforcing that deterministic emergency safety rules override any lower-risk LLM output.
 */
export async function executeDeterministicSafetyGuardedTriage(
  input: ClinicalTriageInput,
  customConfig?: Partial<TriageEngineConfig>
): Promise<{
  deterministicTriage: DeterministicTriageResult;
  aiSummary: string;
  aiUrgency: LegacyTriageLevel;
  safetyNet: string;
  isAiOverriddenByRule: boolean;
}> {
  // 1. Mandatory Step: Deterministic Clinical Rules Execute FIRST
  const deterministic = evaluateDeterministicClinicalTriage(input, customConfig);

  // 2. Query AI/LLM for conversational explanation
  let aiRawSummary = "";
  let aiUrgency: LegacyTriageLevel = deterministic.triageLevel;
  let safetyNet = deterministic.recommendedAction;
  let isAiOverridden = false;

  try {
    const prompt: { role: "user"; content: string } = {
      role: "user",
      content: JSON.stringify({
        input,
        deterministicTriage: {
          category: deterministic.category,
          priorityDisplay: deterministic.priorityDisplay,
          reasons: deterministic.reasons,
          recommendedAction: deterministic.recommendedAction,
        },
      }),
    };

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a healthcare communication assistant for Indian community health workers. Explain why the case was categorized without providing medical diagnoses or dangerous treatment instructions. Adhere strictly to the provided deterministic priority category.",
        },
        prompt,
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "deterministic_triage_explanation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              urgency: { type: "string", enum: ["emergency", "urgent", "routine", "self_care"] },
              safetyNet: { type: "string" },
            },
            required: ["summary", "urgency", "safetyNet"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    const rawContent = typeof content === "string" ? content : "{}";
    const parsed = JSON.parse(rawContent) as {
      summary?: string;
      urgency?: LegacyTriageLevel;
      safetyNet?: string;
    };

    aiRawSummary = parsed.summary || "";
    aiUrgency = parsed.urgency || deterministic.triageLevel;
    safetyNet = parsed.safetyNet || deterministic.recommendedAction;

    // 3. Safety Override Check: If AI attempts to downgrade Critical/Urgent to lower risk, override it!
    const severityRank: Record<LegacyTriageLevel, number> = {
      emergency: 4,
      urgent: 3,
      routine: 2,
      self_care: 1,
    };

    if (severityRank[aiUrgency] < severityRank[deterministic.triageLevel]) {
      isAiOverridden = true;
      aiUrgency = deterministic.triageLevel;
      aiRawSummary = `[SAFETY OVERRIDE] Deterministic clinical rule identified ${deterministic.priorityDisplay}. ${aiRawSummary}`;
    }
  } catch {
    aiRawSummary = `${deterministic.priorityDisplay}: ${deterministic.reasons.join(". ")}. ${deterministic.recommendedAction}`;
  }

  const finalAiSummary =
    aiRawSummary ||
    `${deterministic.priorityDisplay}: ${deterministic.reasons.join(". ")}. ${deterministic.recommendedAction}`;

  return {
    deterministicTriage: deterministic,
    aiSummary: finalAiSummary,
    aiUrgency,
    safetyNet: safetyNet || deterministic.recommendedAction,
    isAiOverriddenByRule: isAiOverridden,
  };
}
