/**
 * Village-Level Healthcare Accessibility Score Engine
 *
 * PROTOTYPE ANALYTICAL METRIC NOTICE:
 * This metric is an analytical simulation tool designed to support resource planning,
 * outreach prioritization, and bottleneck identification in rural healthcare catchments.
 * It is NOT an official government score or index.
 */

import {
  calculateGeodesicDistanceKm,
  CONFIG_VILLAGES,
  VillageMetadata,
  SMART_FACILITIES_REGISTRY,
} from "./smartReferralEngine";
import { getFacilities, getInventory, getReferrals, getVisits } from "./db";

export const PROTOTYPE_METRIC_DISCLAIMER =
  "Prototype Analytical Metric — Not an official government index/score. Used for internal resource planning and priority screening.";

export interface AccessibilityFactorWeightConfig {
  facilityDistanceWeight: number; // default: 20
  doctorAvailabilityWeight: number; // default: 15
  medicineAvailabilityWeight: number; // default: 15
  transportAvailabilityWeight: number; // default: 15
  screeningCoverageWeight: number; // default: 15
  referralCompletionWeight: number; // default: 10
  waitingTimeWeight: number; // default: 10
}

export const DEFAULT_ACCESSIBILITY_WEIGHTS: AccessibilityFactorWeightConfig = {
  facilityDistanceWeight: 20,
  doctorAvailabilityWeight: 15,
  medicineAvailabilityWeight: 15,
  transportAvailabilityWeight: 15,
  screeningCoverageWeight: 15,
  referralCompletionWeight: 10,
  waitingTimeWeight: 10,
};

export type AccessibilityRiskCategory =
  | "Optimal Accessibility (Low Vulnerability)"
  | "Moderate Accessibility (Moderate Vulnerability)"
  | "Sub-optimal Accessibility (High Vulnerability)"
  | "Critical Deficiency (Critical Vulnerability)";

export interface FactorScoreBreakdown {
  id: keyof AccessibilityFactorWeightConfig;
  name: string;
  weightPercent: number;
  rawScore: number; // 0 - 100
  weightedContribution: number;
  status: "optimal" | "acceptable" | "limiting" | "critical";
  metricSummary: string;
  isLimitingFactor: boolean;
  limitationDescription?: string;
  actionRecommendation: string;
}

export interface VillageAccessibilityScoreResult {
  villageId: string;
  villageName: string;
  district: string;
  block: string;
  population: number;
  overallScore: number; // 0 - 100
  riskCategory: AccessibilityRiskCategory;
  riskCategoryShort: "low" | "moderate" | "high" | "critical";
  mainLimitingFactors: string[];
  limitingFactorsCount: number;
  factors: FactorScoreBreakdown[];
  nearestFacility: {
    id: number;
    name: string;
    type: string;
    distanceKm: number;
    estimatedTransitMins: number;
  };
  screeningStats: {
    population: number;
    screenedCount: number;
    coveragePercent: number;
    highRiskCount: number;
  };
  transportStats: {
    ambulanceDispatchReady: boolean;
    roadConnectivity: "all-weather" | "semi-paved" | "unpaved";
    estimatedAmbulanceEtaMins: number;
  };
  referralStats: {
    totalReferrals: number;
    completedReferrals: number;
    completionRatePercent: number;
  };
  telemetry: {
    isPrototypeMetric: boolean;
    disclaimer: string;
    evaluatedAt: string;
    formulaVersion: string;
  };
}

export interface VillageAccessibilitySummary {
  district: string;
  totalVillages: number;
  averageScore: number;
  categoryCounts: {
    optimal: number;
    moderate: number;
    suboptimal: number;
    critical: number;
  };
  topDeficientVillages: {
    villageName: string;
    score: number;
    primaryLimitation: string;
  }[];
  commonLimitingFactors: {
    factorName: string;
    affectedVillagesCount: number;
  }[];
  appliedWeights: AccessibilityFactorWeightConfig;
  disclaimer: string;
  isPrototype: boolean;
}

/**
 * Categorizes overall score into vulnerability risk tiers
 */
export function determineRiskCategory(score: number): {
  full: AccessibilityRiskCategory;
  short: "low" | "moderate" | "high" | "critical";
} {
  if (score >= 80) {
    return { full: "Optimal Accessibility (Low Vulnerability)", short: "low" };
  }
  if (score >= 65) {
    return { full: "Moderate Accessibility (Moderate Vulnerability)", short: "moderate" };
  }
  if (score >= 50) {
    return { full: "Sub-optimal Accessibility (High Vulnerability)", short: "high" };
  }
  return { full: "Critical Deficiency (Critical Vulnerability)", short: "critical" };
}

/**
 * Calculates raw sub-scores and contributions for each factor
 */
export async function calculateVillageScore(
  village: VillageMetadata,
  weights: AccessibilityFactorWeightConfig = DEFAULT_ACCESSIBILITY_WEIGHTS
): Promise<VillageAccessibilityScoreResult> {
  const allFacilities = await getFacilities();
  const allInventory = await getInventory();
  const allReferrals = await getReferrals();

  // Normalize weights so they sum to 100%
  const totalWeight =
    (weights.facilityDistanceWeight || 0) +
    (weights.doctorAvailabilityWeight || 0) +
    (weights.medicineAvailabilityWeight || 0) +
    (weights.transportAvailabilityWeight || 0) +
    (weights.screeningCoverageWeight || 0) +
    (weights.referralCompletionWeight || 0) +
    (weights.waitingTimeWeight || 0);

  const safeTotal = totalWeight > 0 ? totalWeight : 100;

  const normWeights: AccessibilityFactorWeightConfig = {
    facilityDistanceWeight: ((weights.facilityDistanceWeight || 0) / safeTotal) * 100,
    doctorAvailabilityWeight: ((weights.doctorAvailabilityWeight || 0) / safeTotal) * 100,
    medicineAvailabilityWeight: ((weights.medicineAvailabilityWeight || 0) / safeTotal) * 100,
    transportAvailabilityWeight: ((weights.transportAvailabilityWeight || 0) / safeTotal) * 100,
    screeningCoverageWeight: ((weights.screeningCoverageWeight || 0) / safeTotal) * 100,
    referralCompletionWeight: ((weights.referralCompletionWeight || 0) / safeTotal) * 100,
    waitingTimeWeight: ((weights.waitingTimeWeight || 0) / safeTotal) * 100,
  };

  // 1. Distance to Healthcare Facilities
  // Calculate distance from village coordinates to all registered facilities
  const facilitiesWithDist = allFacilities.map((fac) => {
    const d =
      fac.latitude && fac.longitude
        ? calculateGeodesicDistanceKm(village.latitude, village.longitude, fac.latitude, fac.longitude)
        : 20.0;
    return { ...fac, distanceKm: d };
  });

  facilitiesWithDist.sort((a, b) => a.distanceKm - b.distanceKm);
  const nearest = facilitiesWithDist[0] || {
    id: 1,
    name: "Primary Health Centre",
    facilityType: "phc",
    distanceKm: 5.0,
  };

  // Distance sub-score: 100 if < 1km, scaled down to 0 at 30km
  let distanceScore = 100;
  if (nearest.distanceKm <= 1.0) {
    distanceScore = 98;
  } else if (nearest.distanceKm <= 5.0) {
    distanceScore = 90 - (nearest.distanceKm - 1.0) * 5; // 90 to 70
  } else if (nearest.distanceKm <= 15.0) {
    distanceScore = 70 - (nearest.distanceKm - 5.0) * 3.5; // 70 to 35
  } else {
    distanceScore = Math.max(10, 35 - (nearest.distanceKm - 15.0) * 1.5);
  }
  distanceScore = Math.round(Math.max(5, Math.min(100, distanceScore)));

  // 2. Doctor Availability
  // Check active doctor count and on-duty shifts at catchment facility
  const catchmentMeta = SMART_FACILITIES_REGISTRY.find(
    (f) => f.id === nearest.id || f.name.toLowerCase() === nearest.name.toLowerCase()
  );
  const doctors = catchmentMeta?.doctorAvailability || [];
  const availableDocs = doctors.filter((d) => d.status === "Available" || d.status === "On-Duty");
  let doctorScore = 60; // baseline
  if (doctors.length === 0) {
    doctorScore = 35;
  } else {
    const ratio = availableDocs.length / doctors.length;
    doctorScore = Math.round(ratio * 55 + Math.min(45, doctors.length * 15));
  }
  doctorScore = Math.round(Math.max(10, Math.min(100, doctorScore)));

  // 3. Medicine Availability
  // Check essential medicines in stock at catchment facility
  const catchmentInventory = allInventory.filter((m) => m.facilityId === nearest.id);
  let medicineScore = 75;
  if (catchmentInventory.length > 0) {
    const inStock = catchmentInventory.filter((m) => Number(m.currentStock) > 0);
    const inStockRatio = inStock.length / catchmentInventory.length;
    medicineScore = Math.round(inStockRatio * 90 + 10);
  }
  medicineScore = Math.round(Math.max(15, Math.min(100, medicineScore)));

  // 4. Transport Availability
  // Evaluates 108 ambulance response time, road connectivity, and emergency transport reach
  let transportScore = 70;
  let roadConnectivity: "all-weather" | "semi-paved" | "unpaved" = "all-weather";
  let estimatedAmbulanceEtaMins = 18;

  if (nearest.distanceKm <= 3.0) {
    transportScore = 92;
    roadConnectivity = "all-weather";
    estimatedAmbulanceEtaMins = 12;
  } else if (nearest.distanceKm <= 10.0) {
    transportScore = 76;
    roadConnectivity = "semi-paved";
    estimatedAmbulanceEtaMins = 22;
  } else if (nearest.distanceKm <= 20.0) {
    transportScore = 55;
    roadConnectivity = "semi-paved";
    estimatedAmbulanceEtaMins = 38;
  } else {
    transportScore = 32;
    roadConnectivity = "unpaved";
    estimatedAmbulanceEtaMins = 55;
  }

  // 5. Screening Coverage
  // Ratio of screened population vs target population
  const coverageRatio = village.population > 0 ? village.screenedCount / village.population : 0.5;
  const coveragePercent = Math.round(coverageRatio * 100);
  let screeningScore = 100;
  if (coverageRatio >= 0.85) {
    screeningScore = 95;
  } else if (coverageRatio >= 0.7) {
    screeningScore = 80;
  } else if (coverageRatio >= 0.5) {
    screeningScore = 60;
  } else if (coverageRatio >= 0.3) {
    screeningScore = 40;
  } else {
    screeningScore = 25;
  }

  // 6. Referral Completion
  // Percentage of referrals from this catchment/district that were completed or arrived
  const villageReferrals = allReferrals.filter(
    (r) =>
      r.targetFacilityId === nearest.id ||
      r.reason.toLowerCase().includes(village.name.toLowerCase()) ||
      r.specialty.toLowerCase().includes("routine")
  );
  let referralCompletionRate = 80;
  if (villageReferrals.length > 0) {
    const completed = villageReferrals.filter(
      (r) => r.status === "COMPLETED" || r.status === "CONSULTED" || r.status === "ARRIVED"
    );
    referralCompletionRate = Math.round((completed.length / villageReferrals.length) * 100);
  }
  let referralScore = Math.max(30, Math.min(100, referralCompletionRate));

  // 7. Waiting Time
  // Queue wait times at catchment facility
  const waitMins = catchmentMeta?.appointmentAvailability?.estimatedWaitMins || 25;
  let waitingScore = 85;
  if (waitMins <= 15) {
    waitingScore = 95;
  } else if (waitMins <= 30) {
    waitingScore = 80;
  } else if (waitMins <= 45) {
    waitingScore = 62;
  } else if (waitMins <= 60) {
    waitingScore = 45;
  } else {
    waitingScore = 25;
  }

  // Assemble factors with weights and limitation analysis
  const rawFactors: Omit<FactorScoreBreakdown, "weightedContribution">[] = [
    {
      id: "facilityDistanceWeight",
      name: "Facility Distance & Transit",
      weightPercent: Math.round(normWeights.facilityDistanceWeight),
      rawScore: distanceScore,
      status: distanceScore >= 80 ? "optimal" : distanceScore >= 60 ? "acceptable" : distanceScore >= 40 ? "limiting" : "critical",
      metricSummary: `${nearest.distanceKm.toFixed(1)} km to ${nearest.name}`,
      isLimitingFactor: distanceScore < 60,
      limitationDescription: distanceScore < 60 ? "high facility distance" : undefined,
      actionRecommendation:
        distanceScore < 60
          ? "Establish weekly mobile health outreach post and intermediate stabilization unit."
          : "Maintain regular referral feeder route connectivity.",
    },
    {
      id: "doctorAvailabilityWeight",
      name: "Doctor Availability",
      weightPercent: Math.round(normWeights.doctorAvailabilityWeight),
      rawScore: doctorScore,
      status: doctorScore >= 80 ? "optimal" : doctorScore >= 60 ? "acceptable" : doctorScore >= 40 ? "limiting" : "critical",
      metricSummary: `${availableDocs.length} of ${doctors.length || 1} doctor shifts active`,
      isLimitingFactor: doctorScore < 60,
      limitationDescription: doctorScore < 60 ? "low doctor availability" : undefined,
      actionRecommendation:
        doctorScore < 60
          ? "Schedule rotational medical officer teleconsultation support and CHC doctor visits."
          : "Preserve current duty roster coverage.",
    },
    {
      id: "medicineAvailabilityWeight",
      name: "Essential Medicine Stock",
      weightPercent: Math.round(normWeights.medicineAvailabilityWeight),
      rawScore: medicineScore,
      status: medicineScore >= 80 ? "optimal" : medicineScore >= 60 ? "acceptable" : medicineScore >= 40 ? "limiting" : "critical",
      metricSummary: `${catchmentInventory.filter((m) => Number(m.currentStock) > 0).length} of ${catchmentInventory.length || 8} drug lines in stock`,
      isLimitingFactor: medicineScore < 60,
      limitationDescription: medicineScore < 60 ? "low medicine availability" : undefined,
      actionRecommendation:
        medicineScore < 60
          ? "Initiate inter-facility stock rebalancing from district hospital buffer."
          : "Sustain routine ASHA medicine refill kit distribution.",
    },
    {
      id: "transportAvailabilityWeight",
      name: "Transport & Ambulance Readiness",
      weightPercent: Math.round(normWeights.transportAvailabilityWeight),
      rawScore: transportScore,
      status: transportScore >= 80 ? "optimal" : transportScore >= 60 ? "acceptable" : transportScore >= 40 ? "limiting" : "critical",
      metricSummary: `~${estimatedAmbulanceEtaMins} min ambulance ETA (${roadConnectivity} road)`,
      isLimitingFactor: transportScore < 60,
      limitationDescription: transportScore < 60 ? "low transport availability" : undefined,
      actionRecommendation:
        transportScore < 60
          ? "Designate emergency volunteer transport vehicle and pre-route 108 ambulance corridor."
          : "Maintain active emergency hotline link.",
    },
    {
      id: "screeningCoverageWeight",
      name: "Screening Coverage",
      weightPercent: Math.round(normWeights.screeningCoverageWeight),
      rawScore: screeningScore,
      status: screeningScore >= 80 ? "optimal" : screeningScore >= 60 ? "acceptable" : screeningScore >= 40 ? "limiting" : "critical",
      metricSummary: `${coveragePercent}% target population screened (${village.screenedCount}/${village.population})`,
      isLimitingFactor: screeningScore < 60,
      limitationDescription: screeningScore < 60 ? "low screening coverage" : undefined,
      actionRecommendation:
        screeningScore < 60
          ? "Deploy intensive weekend ASHA / CHO NCD screening drive targeting unscreened households."
          : "Keep periodic annual follow-up screening alive.",
    },
    {
      id: "referralCompletionWeight",
      name: "Referral Completion",
      weightPercent: Math.round(normWeights.referralCompletionWeight),
      rawScore: referralScore,
      status: referralScore >= 80 ? "optimal" : referralScore >= 60 ? "acceptable" : referralScore >= 40 ? "limiting" : "critical",
      metricSummary: `${referralCompletionRate}% cases completed consultation`,
      isLimitingFactor: referralScore < 60,
      limitationDescription: referralScore < 60 ? "low referral completion" : undefined,
      actionRecommendation:
        referralScore < 60
          ? "Assign ASHA follow-up home visits to trace and assist pending referral patients."
          : "Maintain automated SMS & ASHA tracking loop.",
    },
    {
      id: "waitingTimeWeight",
      name: "Facility Waiting Time",
      weightPercent: Math.round(normWeights.waitingTimeWeight),
      rawScore: waitingScore,
      status: waitingScore >= 80 ? "optimal" : waitingScore >= 60 ? "acceptable" : waitingScore >= 40 ? "limiting" : "critical",
      metricSummary: `~${waitMins} min estimated OPD wait`,
      isLimitingFactor: waitingScore < 60,
      limitationDescription: waitingScore < 60 ? "high waiting time" : undefined,
      actionRecommendation:
        waitingScore < 60
          ? "Implement digital token pre-booking and staggered appointment slots via CHO desk."
          : "Sustain rapid triage queue flow.",
    },
  ];

  // Calculate composite weighted overall score
  let totalWeightedScore = 0;
  const factors: FactorScoreBreakdown[] = rawFactors.map((f) => {
    const weightFraction = (normWeights[f.id] || 0) / 100;
    const weightedContribution = Number((f.rawScore * weightFraction).toFixed(2));
    totalWeightedScore += weightedContribution;
    return {
      ...f,
      weightedContribution,
    };
  });

  const overallScore = Math.max(0, Math.min(100, Math.round(totalWeightedScore)));
  const { full: riskCategory, short: riskCategoryShort } = determineRiskCategory(overallScore);

  // Identify main limiting factors (sorted by lowest rawScore first)
  const limitingFactors = factors
    .filter((f) => f.isLimitingFactor || f.rawScore < 65)
    .sort((a, b) => a.rawScore - b.rawScore);

  const mainLimitingFactors =
    limitingFactors.length > 0
      ? limitingFactors.slice(0, 3).map((f) => f.limitationDescription || `low ${f.name.toLowerCase()}`)
      : ["No critical limitations detected (Good baseline access)"];

  return {
    villageId: village.id,
    villageName: village.name,
    district: village.district,
    block: village.block,
    population: village.population,
    overallScore,
    riskCategory,
    riskCategoryShort,
    mainLimitingFactors,
    limitingFactorsCount: limitingFactors.length,
    factors,
    nearestFacility: {
      id: nearest.id,
      name: nearest.name,
      type: nearest.facilityType,
      distanceKm: nearest.distanceKm,
      estimatedTransitMins: Math.max(5, Math.round((nearest.distanceKm / 35) * 60 + 3)),
    },
    screeningStats: {
      population: village.population,
      screenedCount: village.screenedCount,
      coveragePercent,
      highRiskCount: village.highRiskCount,
    },
    transportStats: {
      ambulanceDispatchReady: transportScore >= 50,
      roadConnectivity,
      estimatedAmbulanceEtaMins,
    },
    referralStats: {
      totalReferrals: villageReferrals.length,
      completedReferrals: villageReferrals.filter((r) => r.status === "COMPLETED" || r.status === "CONSULTED").length,
      completionRatePercent: referralCompletionRate,
    },
    telemetry: {
      isPrototypeMetric: true,
      disclaimer: PROTOTYPE_METRIC_DISCLAIMER,
      evaluatedAt: new Date().toISOString(),
      formulaVersion: "v1.0-weighted-linear-7factor",
    },
  };
}

/**
 * Calculates score summaries for all configured villages
 */
export async function getDistrictAccessibilityScores(
  district?: string,
  weights: AccessibilityFactorWeightConfig = DEFAULT_ACCESSIBILITY_WEIGHTS
): Promise<{
  villages: VillageAccessibilityScoreResult[];
  summary: VillageAccessibilitySummary;
}> {
  const filteredVillages = district
    ? CONFIG_VILLAGES.filter((v) => v.district.toLowerCase() === district.toLowerCase())
    : CONFIG_VILLAGES;

  const scorePromises = filteredVillages.map((v) => calculateVillageScore(v, weights));
  const results = await Promise.all(scorePromises);

  // Sort by score ascending (lowest score / most vulnerable first)
  results.sort((a, b) => a.overallScore - b.overallScore);

  const totalScore = results.reduce((acc, r) => acc + r.overallScore, 0);
  const averageScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;

  const categoryCounts = {
    optimal: results.filter((r) => r.riskCategoryShort === "low").length,
    moderate: results.filter((r) => r.riskCategoryShort === "moderate").length,
    suboptimal: results.filter((r) => r.riskCategoryShort === "high").length,
    critical: results.filter((r) => r.riskCategoryShort === "critical").length,
  };

  const topDeficientVillages = results.slice(0, 3).map((r) => ({
    villageName: r.villageName,
    score: r.overallScore,
    primaryLimitation: r.mainLimitingFactors[0] || "General outreach gap",
  }));

  // Count occurrences of limiting factors across the district
  const factorMap: Record<string, number> = {};
  results.forEach((r) => {
    r.factors.forEach((f) => {
      if (f.isLimitingFactor) {
        factorMap[f.name] = (factorMap[f.name] || 0) + 1;
      }
    });
  });

  const commonLimitingFactors = Object.entries(factorMap)
    .map(([factorName, affectedVillagesCount]) => ({ factorName, affectedVillagesCount }))
    .sort((a, b) => b.affectedVillagesCount - a.affectedVillagesCount);

  return {
    villages: results,
    summary: {
      district: district || "All Catchments (Ahmedabad Rural)",
      totalVillages: results.length,
      averageScore,
      categoryCounts,
      topDeficientVillages,
      commonLimitingFactors,
      appliedWeights: weights,
      disclaimer: PROTOTYPE_METRIC_DISCLAIMER,
      isPrototype: true,
    },
  };
}
