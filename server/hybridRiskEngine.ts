import {
  evaluateDeterministicClinicalTriage,
  DeterministicTriageResult,
  ClinicalTriageInput,
} from "./clinicalTriageEngine";

export type HybridRiskCategory = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface HybridRiskInput extends ClinicalTriageInput {
  previousRiskScore?: number;
  previousRiskCategory?: string;
  daysSinceLastScreening?: number;
  medicationCompliancePercent?: number;
}

export interface RiskContributingFactor {
  factor: string;
  contribution: number; // score impact in points
  category: "vitals" | "symptoms" | "chronics" | "demographics" | "history" | "safety_rule";
  detail: string;
}

export interface HybridRiskAssessment {
  riskScore: number; // 0–100
  riskCategory: HybridRiskCategory;
  factors: string[]; // plain string factors for backwards compatibility
  contributingFactors: RiskContributingFactor[]; // rich explainable factors
  recommendedNextStep: string;
  deterministicTriage: DeterministicTriageResult;
  modelMetadata: {
    modelType: string;
    version: string;
    isClinicallyValidated: false;
    disclaimer: string;
    deterministicFloorApplied: boolean;
    computedAt: Date;
  };
}

export const HYBRID_RISK_DISCLAIMER =
  "DECISION SUPPORT PROTOTYPE: This AI-assisted hybrid risk score is designed solely for demonstration and clinical prioritization support in community healthcare workflows. It is NOT a clinically validated standalone diagnostic device. An LLM or algorithm is never the sole medical decision-maker; all recommendations must be validated by a qualified clinician.";

/**
 * Normalizes temperature from Celsius or Fahrenheit to Fahrenheit.
 */
function normalizeTempF(temp?: number): number | undefined {
  if (temp === undefined || temp === null || isNaN(temp)) return undefined;
  return temp <= 45 ? (temp * 9) / 5 + 32 : temp;
}

/**
 * Computes BMI from weight (kg) and height (cm).
 */
function calculateBmi(weightKg?: number, heightCm?: number, existingBmi?: number): number | undefined {
  if (existingBmi && existingBmi > 0) return existingBmi;
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return undefined;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Transparent prototype multivariate ML risk model for community health scoring.
 * Evaluates physiological feature vectors, non-linear thresholds, interaction terms,
 * and historical risk momentum.
 */
function evaluatePrototypeMLRiskModel(input: HybridRiskInput): {
  mlRawScore: number;
  factors: RiskContributingFactor[];
} {
  const factors: RiskContributingFactor[] = [];
  let score = 0;

  const systolic = input.bpSystolic;
  const diastolic = input.bpDiastolic;
  const pulse = input.pulse;
  const spo2 = input.spo2;
  const glucose = input.glucose;
  const tempF = normalizeTempF(input.temperature);
  const bmi = calculateBmi(input.weight, input.height, input.bmi);
  const age = input.age ?? 0;
  const missedFollowUps = input.missedFollowUps ?? 0;
  const previousScore = input.previousRiskScore;

  const rawSymptoms = `${input.symptoms ?? ""} ${(input.structuredSymptoms ?? []).join(" ")}`.toLowerCase();
  const rawConditions = `${input.conditions ?? ""} ${input.existingConditions ?? ""}`.toLowerCase();

  // 1. Blood Pressure Risk Component
  if (systolic !== undefined || diastolic !== undefined) {
    const sys = systolic ?? 120;
    const dia = diastolic ?? 80;

    if (sys >= 180 || dia >= 120) {
      score += 35;
      factors.push({
        factor: "Critically Elevated Blood Pressure",
        contribution: 35,
        category: "vitals",
        detail: `Hypertensive crisis level: ${sys}/${dia} mmHg`,
      });
    } else if (sys >= 160 || dia >= 100) {
      score += 26;
      factors.push({
        factor: "Stage 2 Severe Hypertension",
        contribution: 26,
        category: "vitals",
        detail: `Blood pressure ${sys}/${dia} mmHg`,
      });
    } else if (sys >= 140 || dia >= 90) {
      score += 18;
      factors.push({
        factor: "Elevated Blood Pressure",
        contribution: 18,
        category: "vitals",
        detail: `Stage 1/2 Hypertension: ${sys}/${dia} mmHg`,
      });
    } else if (sys >= 130 || dia >= 85) {
      score += 8;
      factors.push({
        factor: "Borderline Pre-Hypertension",
        contribution: 8,
        category: "vitals",
        detail: `Pre-hypertensive range: ${sys}/${dia} mmHg`,
      });
    }
  }

  // 2. Oxygenation Risk Component (SpO2)
  if (spo2 !== undefined && spo2 > 0) {
    if (spo2 < 90) {
      score += 35;
      factors.push({
        factor: "Critical Hypoxia",
        contribution: 35,
        category: "vitals",
        detail: `Blood oxygen saturation SpO2 ${spo2}% (< 90%)`,
      });
    } else if (spo2 <= 93) {
      score += 22;
      factors.push({
        factor: "Moderate Hypoxia",
        contribution: 22,
        category: "vitals",
        detail: `Low oxygen saturation SpO2 ${spo2}%`,
      });
    } else if (spo2 <= 95) {
      score += 8;
      factors.push({
        factor: "Borderline Oxygen Saturation",
        contribution: 8,
        category: "vitals",
        detail: `SpO2 ${spo2}%`,
      });
    }
  }

  // 3. Glycemic Risk Component
  if (glucose !== undefined && glucose > 0) {
    if (glucose >= 400 || glucose < 50) {
      score += 32;
      factors.push({
        factor: glucose < 50 ? "Severe Hypoglycemia" : "Severe Hyperglycemia",
        contribution: 32,
        category: "vitals",
        detail: `Blood glucose ${glucose} mg/dL`,
      });
    } else if (glucose >= 250) {
      score += 22;
      factors.push({
        factor: "Marked Hyperglycemia",
        contribution: 22,
        category: "vitals",
        detail: `High blood glucose ${glucose} mg/dL`,
      });
    } else if (glucose >= 180) {
      score += 15;
      factors.push({
        factor: "Elevated Blood Glucose",
        contribution: 15,
        category: "vitals",
        detail: `Blood glucose ${glucose} mg/dL`,
      });
    } else if (glucose >= 140) {
      score += 8;
      factors.push({
        factor: "Impaired Glucose Tolerance",
        contribution: 8,
        category: "vitals",
        detail: `Pre-diabetes range: ${glucose} mg/dL`,
      });
    }
  }

  // 4. Heart Rate (Pulse) Component
  if (pulse !== undefined && pulse > 0) {
    if (pulse >= 140 || pulse < 40) {
      score += 25;
      factors.push({
        factor: "Critical Pulse Anomaly",
        contribution: 25,
        category: "vitals",
        detail: `Extreme resting heart rate: ${pulse} bpm`,
      });
    } else if (pulse >= 110 || pulse < 50) {
      score += 12;
      factors.push({
        factor: pulse >= 110 ? "Tachycardia" : "Bradycardia",
        contribution: 12,
        category: "vitals",
        detail: `Resting heart rate ${pulse} bpm`,
      });
    }
  }

  // 5. Body Temperature Component
  if (tempF !== undefined) {
    if (tempF >= 104.0 || tempF < 95.0) {
      score += 28;
      factors.push({
        factor: tempF >= 104 ? "Hyperpyrexia" : "Hypothermia",
        contribution: 28,
        category: "vitals",
        detail: `Extreme body temperature: ${tempF.toFixed(1)}°F`,
      });
    } else if (tempF >= 101.5) {
      score += 14;
      factors.push({
        factor: "High Fever",
        contribution: 14,
        category: "vitals",
        detail: `Elevated body temperature: ${tempF.toFixed(1)}°F`,
      });
    } else if (tempF >= 99.5) {
      score += 6;
      factors.push({
        factor: "Low-Grade Fever",
        contribution: 6,
        category: "vitals",
        detail: `Mild temperature elevation: ${tempF.toFixed(1)}°F`,
      });
    }
  }

  // 6. Anthropometry & BMI Component
  if (bmi !== undefined && bmi > 0) {
    if (bmi >= 35.0 || bmi < 16.0) {
      score += 14;
      factors.push({
        factor: bmi >= 35 ? "Severe Obesity" : "Severe Malnutrition",
        contribution: 14,
        category: "vitals",
        detail: `BMI ${bmi} kg/m²`,
      });
    } else if (bmi >= 30.0 || bmi < 18.5) {
      score += 8;
      factors.push({
        factor: bmi >= 30 ? "Obesity" : "Underweight",
        contribution: 8,
        category: "vitals",
        detail: `BMI ${bmi} kg/m²`,
      });
    }
  }

  // 7. Chronic Conditions & Disease Burden
  if (/hypertension|high bp/i.test(rawConditions)) {
    score += 12;
    factors.push({
      factor: "Previous Hypertension",
      contribution: 12,
      category: "chronics",
      detail: "Documented history of cardiovascular/hypertensive disease",
    });
  }

  if (/diabetes|diabetic/i.test(rawConditions)) {
    score += 12;
    factors.push({
      factor: "Previous Diabetes",
      contribution: 12,
      category: "chronics",
      detail: "Documented history of diabetes mellitus",
    });
  }

  if (/kidney|nephropathy|heart disease|cad|stroke|copd|asthma|tuberculosis|tb/i.test(rawConditions)) {
    score += 14;
    factors.push({
      factor: "Major Chronic Co-morbidity",
      contribution: 14,
      category: "chronics",
      detail: "Presence of cardiorespiratory, renal, or chronic respiratory disease",
    });
  }

  // 8. Symptoms Burden
  if (/chest pain|chest pressure/i.test(rawSymptoms)) {
    score += 30;
    factors.push({
      factor: "Chest Pain Reported",
      contribution: 30,
      category: "symptoms",
      detail: "Acute chest discomfort / pressure",
    });
  }

  if (/breath|dyspnea|shortness/i.test(rawSymptoms)) {
    score += 25;
    factors.push({
      factor: "Shortness of Breath",
      contribution: 25,
      category: "symptoms",
      detail: "Respiratory distress or breathlessness",
    });
  }

  if (/dizziness|vertigo|faint|syncope|headache/i.test(rawSymptoms) && !factors.some((f) => f.factor.includes("Chest Pain"))) {
    score += 10;
    factors.push({
      factor: "Neurological / Vaso-vagal Symptoms",
      contribution: 10,
      category: "symptoms",
      detail: "Dizziness, headache, or presyncope reported",
    });
  }

  // 9. Demographic & Vulnerability Factors (Age & Pregnancy)
  if (age >= 75) {
    score += 12;
    factors.push({
      factor: "Advanced Geriatric Age",
      contribution: 12,
      category: "demographics",
      detail: `Age ${age} years (≥ 75)`,
    });
  } else if (age >= 65) {
    score += 8;
    factors.push({
      factor: "Senior Citizen Vulnerability",
      contribution: 8,
      category: "demographics",
      detail: `Age ${age} years (≥ 65)`,
    });
  }

  // 10. Care Continuity & Adherence (Missed Follow-ups)
  if (missedFollowUps > 0) {
    const penalty = Math.min(20, missedFollowUps * 10);
    score += penalty;
    factors.push({
      factor: "Missed Follow-up",
      contribution: penalty,
      category: "history",
      detail: `${missedFollowUps} overdue or missed clinical check-up(s)`,
    });
  }

  // 11. Historical Risk Momentum
  if (previousScore !== undefined && previousScore >= 60) {
    const momentum = Math.round(previousScore * 0.15);
    score += momentum;
    factors.push({
      factor: "Elevated Baseline Risk Momentum",
      contribution: momentum,
      category: "history",
      detail: `Previous recorded risk score was ${previousScore}/100`,
    });
  }

  // 12. Interaction Terms (Multivariate Synergy)
  // Synergy: Age >= 65 + (Hypertension or Diabetes)
  if (age >= 65 && (/hypertension/i.test(rawConditions) || (systolic ?? 0) >= 140)) {
    score += 6;
    factors.push({
      factor: "Elderly Cardiovascular Risk Multiplier",
      contribution: 6,
      category: "chronics",
      detail: "Compounded vulnerability of senior age with elevated blood pressure",
    });
  }

  // Synergy: Diabetes + Missed Follow-up
  if ((/diabetes/i.test(rawConditions) || (glucose ?? 0) >= 200) && missedFollowUps > 0) {
    score += 6;
    factors.push({
      factor: "Unmonitored Glycemic Risk Multiplier",
      contribution: 6,
      category: "history",
      detail: "Compounded vulnerability of diabetes with missed clinical monitoring",
    });
  }

  return {
    mlRawScore: score,
    factors,
  };
}

/**
 * Main Hybrid AI-Assisted Health Risk Scoring Function.
 * Blends Deterministic Emergency Safety Rules with the Multivariate ML Risk Model.
 */
export function calculateHybridHealthRisk(input: HybridRiskInput): HybridRiskAssessment {
  // Step 1: Execute Deterministic Emergency Rules FIRST
  const deterministicTriage = evaluateDeterministicClinicalTriage(input);

  // Step 2: Execute Multivariate Prototype ML Risk Model
  const mlResult = evaluatePrototypeMLRiskModel(input);

  // Step 3: Combine scores and enforce deterministic safety floors
  let baseFloor = 0;
  if (deterministicTriage.category === "CRITICAL") {
    baseFloor = 85;
  } else if (deterministicTriage.category === "URGENT") {
    baseFloor = 60;
  } else if (deterministicTriage.category === "ROUTINE") {
    baseFloor = 30;
  }

  let finalScore = mlResult.mlRawScore;
  let deterministicFloorApplied = false;

  if (baseFloor > 0) {
    if (finalScore < baseFloor) {
      finalScore = baseFloor + Math.round(mlResult.mlRawScore * 0.25);
      deterministicFloorApplied = true;
    }
  }

  // Bound final score between 0 and 100
  finalScore = Math.min(100, Math.max(0, Math.round(finalScore)));

  // If completely normal with no triggers
  if (mlResult.factors.length === 0 && !deterministicTriage.isEmergency && deterministicTriage.category === "LOW PRIORITY") {
    finalScore = Math.min(finalScore, 18);
  }

  // Step 4: Map to 4 standard Risk Categories: LOW, MODERATE, HIGH, CRITICAL
  let riskCategory: HybridRiskCategory = "LOW";
  if (finalScore >= 80 || deterministicTriage.category === "CRITICAL") {
    riskCategory = "CRITICAL";
  } else if (finalScore >= 60 || deterministicTriage.category === "URGENT") {
    riskCategory = "HIGH";
  } else if (finalScore >= 30 || deterministicTriage.category === "ROUTINE") {
    riskCategory = "MODERATE";
  } else {
    riskCategory = "LOW";
  }

  // Step 5: Recommended Next Step Determination
  let recommendedNextStep = "";
  if (riskCategory === "CRITICAL") {
    recommendedNextStep = "Immediate emergency medical evaluation: Summon 108 Emergency Ambulance or transfer immediately to nearest Community Health Centre / District Hospital.";
  } else if (riskCategory === "HIGH") {
    recommendedNextStep = "Prompt clinical evaluation at Primary Health Centre (PHC) or Sub-Centre with Medical Officer/CHO within 24–48 hours.";
  } else if (riskCategory === "MODERATE") {
    recommendedNextStep = "Targeted lifestyle, dietary, and medication compliance counseling. Schedule ASHA surveillance review within 14–30 days.";
  } else {
    recommendedNextStep = "Maintain regular healthy lifestyle, balanced hydration, and participate in periodic community health screening drives.";
  }

  // Step 6: Consolidate explainable contributing factors
  // Sort factors by contribution descending
  const sortedFactors = [...mlResult.factors].sort((a, b) => b.contribution - a.contribution);

  // If deterministic floor was applied and not already captured in factors, inject safety factor
  if (deterministicFloorApplied) {
    sortedFactors.unshift({
      factor: `Safety Floor: ${deterministicTriage.priorityDisplay}`,
      contribution: 30,
      category: "safety_rule",
      detail: deterministicTriage.reasons.join("; "),
    });
  }

  // Backwards-compatible plain string factor array
  const stringFactors = sortedFactors.length > 0
    ? Array.from(new Set(sortedFactors.map((f) => f.factor)))
    : ["All recorded parameters within normal healthy range"];

  return {
    riskScore: finalScore,
    riskCategory,
    factors: stringFactors,
    contributingFactors: sortedFactors,
    recommendedNextStep,
    deterministicTriage,
    modelMetadata: {
      modelType: "Hybrid (Deterministic Clinical Safety Rules + Multivariate Prototype ML Risk Regressor)",
      version: "1.0.0-prototype",
      isClinicallyValidated: false,
      disclaimer: HYBRID_RISK_DISCLAIMER,
      deterministicFloorApplied,
      computedAt: new Date(),
    },
  };
}
