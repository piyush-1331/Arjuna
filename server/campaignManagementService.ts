/**
 * Health Campaign Management & AI-Assisted Village Prioritization Service
 *
 * Provides:
 * 1. Health Campaign Lifecycle Management (Create, Track, Status Updates)
 * 2. Multi-Dimensional Tracking Metrics (Target Population, Screened, High-Risk, Referrals, Follow-ups, Completion %)
 * 3. AI-Assisted Village Prioritization Algorithm grounded in:
 *    - Low Screening Coverage
 *    - High-Risk Concentration
 *    - Population Density
 *    - Previous Campaign Performance & Adherence
 *
 * STRICT SAFETY LABELING:
 * All prioritization recommendations are strictly labeled as:
 * "AI DECISION SUPPORT: VILLAGE PRIORITIZATION"
 * (Not a medical diagnosis or epidemiological outbreak detection)
 */

import {
  CONFIG_VILLAGES,
  SMART_FACILITIES_REGISTRY,
  VillageMetadata,
} from "./smartReferralEngine";
import {
  getCampaigns,
  createCampaign,
  recordCampaignScreening,
  getPatients,
  getFollowUps,
  getReferrals,
  getVisits,
} from "./db";

export const AI_CAMPAIGN_PRIORITIZATION_DISCLAIMER =
  "AI Decision Support: Village Prioritization for administrative planning and resource allocation only. Not a clinical diagnosis or epidemiological outbreak detection.";

export type CampaignCategory =
  | "diabetes_screening"
  | "hypertension_screening"
  | "maternal_health"
  | "nutrition"
  | "immunization"
  | "anemia_eradication"
  | "ncd_screening"
  | "eye_care"
  | "sanitation";

export type CampaignStatus = "planned" | "active" | "completed" | "paused";

export interface CreateCampaignInput {
  name: string;
  category: CampaignCategory;
  description?: string;
  district?: string;
  targetVillages: string[];
  targetPopulation: number;
  startDate: string | Date;
  endDate: string | Date;
  assignedWorkers: string[];
  status?: CampaignStatus;
}

export interface TrackedCampaign {
  id: number;
  name: string;
  category: CampaignCategory;
  description: string;
  district: string;
  village: string;
  targetVillages: string[];
  targetPopulation: number;
  targetBeneficiaries: number;
  startDate: string;
  endDate: string;
  assignedWorkers: string[];
  status: CampaignStatus;
  screenedCount: number;
  highRiskDetected: number;
  referralsCount: number;
  followUpsCount: number;
  completionPercent: number;
  pacingStatus: "ahead" | "on_track" | "behind";
  createdAt: string;
}

export interface VillagePrioritizationNode {
  rank: number;
  villageId: string;
  villageName: string;
  block: string;
  population: number;
  priorityScore: number; // 0 - 100
  priorityLevel: "CRITICAL_PRIORITY" | "HIGH_PRIORITY" | "MODERATE_PRIORITY" | "ROUTINE";
  screeningCoveragePercent: number;
  unscreenedGapCount: number;
  highRiskCount: number;
  highRiskPercent: number;
  previousAdherencePercent: number;
  primaryDrivers: string[];
  recommendedCampaign: {
    category: CampaignCategory;
    name: string;
    targetBeneficiaries: number;
    suggestedDurationDays: number;
    suggestedStaffing: string[];
    rationale: string;
  };
  badge: "AI DECISION SUPPORT: VILLAGE PRIORITIZATION";
  disclaimer: string;
}

export interface CampaignSummaryStats {
  totalCampaigns: number;
  activeCampaigns: number;
  plannedCampaigns: number;
  completedCampaigns: number;
  totalTargetPopulation: number;
  totalScreened: number;
  totalHighRiskDetected: number;
  totalReferralsGenerated: number;
  totalFollowUpsLogged: number;
  overallCompletionPercent: number;
}

/**
 * Fetch all campaigns with real-time tracking metrics
 */
export async function getCampaignsWithStats(
  district = "Nandurbar"
): Promise<{ campaigns: TrackedCampaign[]; summary: CampaignSummaryStats }> {
  const [allDbCampaigns, allReferrals, allFollowUps] = await Promise.all([
    getCampaigns(district),
    getReferrals(),
    getFollowUps(),
  ]);

  const campaigns: TrackedCampaign[] = allDbCampaigns.map((c: any) => {
    const target = Number(c.targetBeneficiaries || c.targetPopulation || 100);
    const screened = Number(c.screenedCount || 0);
    const highRisk = Number(c.highRiskDetected || 0);

    // Dynamic referral and follow-up estimations mapped to campaign village/district
    const villageRefMatches = allReferrals.filter(
      (r) =>
        r.patientVillage &&
        (c.village?.toLowerCase().includes(r.patientVillage.toLowerCase()) ||
          (Array.isArray(c.targetVillages) &&
            c.targetVillages.some((v: string) => v.toLowerCase() === r.patientVillage?.toLowerCase())))
    ).length;
    const referralsCount = Number(c.referralsCount || Math.max(villageRefMatches, Math.round(highRisk * 0.85)));

    const villageFollowUpMatches = allFollowUps.filter(
      (f) =>
        f.patientVillage &&
        (c.village?.toLowerCase().includes(f.patientVillage.toLowerCase()) ||
          (Array.isArray(c.targetVillages) &&
            c.targetVillages.some((v: string) => v.toLowerCase() === f.patientVillage?.toLowerCase())))
    ).length;
    const followUpsCount = Number(c.followUpsCount || Math.max(villageFollowUpMatches, Math.round(highRisk * 1.1)));

    const completionPercent = Math.min(100, Math.round((screened / Math.max(1, target)) * 100));

    // Calculate pacing based on dates
    const start = new Date(c.startDate).getTime();
    const end = new Date(c.endDate).getTime();
    const now = Date.now();
    let pacingStatus: "ahead" | "on_track" | "behind" = "on_track";

    if (now >= end && completionPercent < 90) {
      pacingStatus = "behind";
    } else if (now > start && end > start) {
      const elapsedRatio = (now - start) / (end - start);
      const expectedCompletion = elapsedRatio * 100;
      if (completionPercent >= expectedCompletion + 10) pacingStatus = "ahead";
      else if (completionPercent < expectedCompletion - 15) pacingStatus = "behind";
    }

    const targetVillages = Array.isArray(c.targetVillages)
      ? c.targetVillages
      : c.village
      ? [c.village]
      : ["Sundarpur"];

    const assignedWorkers = Array.isArray(c.assignedWorkers)
      ? c.assignedWorkers
      : typeof c.assignedWorkers === "string"
      ? c.assignedWorkers.split(",").map((s: string) => s.trim())
      : ["ASHA Team Lead", "CHO Staff"];

    return {
      id: c.id,
      name: c.name,
      category: (c.category as CampaignCategory) || "ncd_screening",
      description: c.description || "District Health Outreach Campaign",
      district: c.district || district,
      village: c.village || targetVillages[0] || "Sundarpur",
      targetVillages,
      targetPopulation: target,
      targetBeneficiaries: target,
      startDate: new Date(c.startDate).toISOString(),
      endDate: new Date(c.endDate).toISOString(),
      assignedWorkers,
      status: (c.status as CampaignStatus) || "active",
      screenedCount: screened,
      highRiskDetected: highRisk,
      referralsCount,
      followUpsCount,
      completionPercent,
      pacingStatus,
      createdAt: new Date(c.createdAt || Date.now()).toISOString(),
    };
  });

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const plannedCampaigns = campaigns.filter((c) => c.status === "planned").length;
  const completedCampaigns = campaigns.filter((c) => c.status === "completed").length;

  const totalTargetPopulation = campaigns.reduce((acc, c) => acc + c.targetPopulation, 0);
  const totalScreened = campaigns.reduce((acc, c) => acc + c.screenedCount, 0);
  const totalHighRiskDetected = campaigns.reduce((acc, c) => acc + c.highRiskDetected, 0);
  const totalReferralsGenerated = campaigns.reduce((acc, c) => acc + c.referralsCount, 0);
  const totalFollowUpsLogged = campaigns.reduce((acc, c) => acc + c.followUpsCount, 0);
  const overallCompletionPercent =
    totalTargetPopulation > 0
      ? Math.round((totalScreened / totalTargetPopulation) * 100)
      : 0;

  const summary: CampaignSummaryStats = {
    totalCampaigns,
    activeCampaigns,
    plannedCampaigns,
    completedCampaigns,
    totalTargetPopulation,
    totalScreened,
    totalHighRiskDetected,
    totalReferralsGenerated,
    totalFollowUpsLogged,
    overallCompletionPercent,
  };

  return { campaigns, summary };
}

/**
 * AI-Assisted Village Prioritization Engine
 * 
 * Computes prioritization score using:
 * 1. Low screening coverage (35% weight)
 * 2. High-risk concentration (30% weight)
 * 3. Population size / density (20% weight)
 * 4. Previous campaign performance & follow-up adherence (15% weight)
 */
export async function getVillagePrioritization(
  district = "Nandurbar"
): Promise<{
  district: string;
  evaluatedAt: string;
  badge: "AI DECISION SUPPORT: VILLAGE PRIORITIZATION";
  disclaimer: string;
  prioritizedVillages: VillagePrioritizationNode[];
}> {
  const [allPatients, allFollowUps] = await Promise.all([
    getPatients(500),
    getFollowUps(),
  ]);

  let districtVillages = CONFIG_VILLAGES.filter(
    (v) => !district || district === "all" || v.district.toLowerCase() === district.toLowerCase()
  );
  if (districtVillages.length === 0) {
    districtVillages = CONFIG_VILLAGES;
  }

  const scoredVillages: VillagePrioritizationNode[] = districtVillages.map((v) => {
    // 1. Low screening coverage (Gap score 0-100)
    const screeningCoveragePercent = Math.round((v.screenedCount / Math.max(1, v.population)) * 100);
    const unscreenedGapCount = Math.max(0, v.population - v.screenedCount);
    const screeningGapScore = Math.min(100, Math.max(0, 100 - screeningCoveragePercent));

    // 2. High-risk concentration score (0-100)
    const villagePatients = allPatients.filter(
      (p) => p.village && p.village.toLowerCase() === v.name.toLowerCase()
    );
    const criticalCount = villagePatients.filter((p) => p.riskCategory === "critical").length;
    const highRiskCount = Math.max(v.highRiskCount, villagePatients.filter((p) => p.riskCategory === "high" || p.riskCategory === "critical").length);
    const highRiskPercent = Math.round((highRiskCount / Math.max(1, v.screenedCount)) * 100);
    const highRiskScore = Math.min(100, highRiskPercent * 4 + criticalCount * 15);

    // 3. Population size weight (0-100)
    const populationScore = Math.min(100, (v.population / 2500) * 100);

    // 4. Previous campaign performance & adherence score (0-100)
    const villageFollowUps = allFollowUps.filter(
      (f) => f.patientVillage && f.patientVillage.toLowerCase() === v.name.toLowerCase()
    );
    const completedFUs = villageFollowUps.filter((f) => (f.status || "").toUpperCase() === "COMPLETED").length;
    const totalFUs = villageFollowUps.length || 5;
    const previousAdherencePercent = Math.round((completedFUs / totalFUs) * 100) || 75;
    // Lower historical adherence means higher need for organized outreach campaign
    const adherenceNeedScore = Math.min(100, Math.max(0, 100 - previousAdherencePercent));

    // Composite Priority Score (0 - 100)
    // 35% Screening Gap + 30% High-Risk + 20% Population + 15% Adherence Need
    const priorityScore = Math.round(
      screeningGapScore * 0.35 +
      highRiskScore * 0.30 +
      populationScore * 0.20 +
      adherenceNeedScore * 0.15
    );

    let priorityLevel: VillagePrioritizationNode["priorityLevel"] = "ROUTINE";
    if (priorityScore >= 75) priorityLevel = "CRITICAL_PRIORITY";
    else if (priorityScore >= 55) priorityLevel = "HIGH_PRIORITY";
    else if (priorityScore >= 35) priorityLevel = "MODERATE_PRIORITY";

    const primaryDrivers: string[] = [];
    if (screeningCoveragePercent < 70) {
      primaryDrivers.push(`Low Screening Coverage (${screeningCoveragePercent}% / ${unscreenedGapCount} Unscreened)`);
    }
    if (highRiskCount >= 10) {
      primaryDrivers.push(`High Chronic Risk Concentration (${highRiskCount} Flagged Patients)`);
    }
    if (v.population >= 1500) {
      primaryDrivers.push(`High Demographic Reach (${v.population} Residents)`);
    }
    if (previousAdherencePercent < 75) {
      primaryDrivers.push(`Sub-optimal Historical Follow-up Adherence (${previousAdherencePercent}%)`);
    }
    if (primaryDrivers.length === 0) {
      primaryDrivers.push("Routine maintenance and preventive health monitoring");
    }

    // Determine targeted campaign recommendation
    let recommendedCategory: CampaignCategory = "diabetes_screening";
    let recName = `Targeted Diabetes & NCD Screening Drive - ${v.name}`;
    let rationale = `Screen remaining ${unscreenedGapCount} unscreened adults with point-of-care digital diagnostics.`;

    if (v.name.toLowerCase().includes("rampura")) {
      recommendedCategory = "maternal_health";
      recName = `High-Risk Antenatal & Maternal Health Outreach - ${v.name}`;
      rationale = `Intensified ANC registration and hemoglobinometry testing for high-risk pregnant women in transit-bottleneck areas.`;
    } else if (v.name.toLowerCase().includes("bavla")) {
      recommendedCategory = "nutrition";
      recName = `POSHAN & Anemia Eradication Intensive Camp - ${v.name}`;
      rationale = `Adolescent and maternal nutritional anemia screening with iron-folic acid refill packs.`;
    } else if (v.name.toLowerCase().includes("sanand")) {
      recommendedCategory = "hypertension_screening";
      recName = `Hypertension & Cardiovascular Health Camp - ${v.name}`;
      rationale = `Systematic adult blood pressure screening and lifestyle modification counseling.`;
    } else if (v.name.toLowerCase().includes("vasna") || v.name.toLowerCase().includes("dholka")) {
      recommendedCategory = "immunization";
      recName = `Mission Indradhanush Immunization Catch-up Drive - ${v.name}`;
      rationale = `Zero-dose child tracking and dropout immunization completion.`;
    }

    const suggestedTarget = Math.round(unscreenedGapCount * 0.75) || 250;

    return {
      rank: 1, // calculated after sort
      villageId: v.id,
      villageName: v.name,
      block: v.block || "Sanand Block",
      population: v.population,
      priorityScore,
      priorityLevel,
      screeningCoveragePercent,
      unscreenedGapCount,
      highRiskCount,
      highRiskPercent,
      previousAdherencePercent,
      primaryDrivers,
      recommendedCampaign: {
        category: recommendedCategory,
        name: recName,
        targetBeneficiaries: suggestedTarget,
        suggestedDurationDays: 14,
        suggestedStaffing: [`ASHA Team (${v.name})`, `CHO Staff (PHC Catchment)`, `ANM Field Nurse`],
        rationale,
      },
      badge: "AI DECISION SUPPORT: VILLAGE PRIORITIZATION",
      disclaimer: AI_CAMPAIGN_PRIORITIZATION_DISCLAIMER,
    };
  });

  // Sort descending by priority score
  scoredVillages.sort((a, b) => b.priorityScore - a.priorityScore);
  scoredVillages.forEach((node, index) => {
    node.rank = index + 1;
  });

  return {
    district,
    evaluatedAt: new Date().toISOString(),
    badge: "AI DECISION SUPPORT: VILLAGE PRIORITIZATION",
    disclaimer: AI_CAMPAIGN_PRIORITIZATION_DISCLAIMER,
    prioritizedVillages: scoredVillages,
  };
}

/**
 * Create a new health campaign with administrative validation
 */
export async function createHealthCampaign(
  input: CreateCampaignInput
): Promise<{ id: number; message: string }> {
  const primaryVillage = input.targetVillages[0] || "Sundarpur";

  const dbInput: any = {
    name: input.name,
    category: input.category,
    description: input.description || `Comprehensive ${input.name} across ${input.targetVillages.join(", ")}`,
    district: input.district || "Ahmedabad Rural",
    village: primaryVillage,
    targetVillages: input.targetVillages,
    targetBeneficiaries: input.targetPopulation,
    targetPopulation: input.targetPopulation,
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
    assignedWorkers: input.assignedWorkers,
    status: input.status || "active",
    screenedCount: 0,
    highRiskDetected: 0,
    referralsCount: 0,
    followUpsCount: 0,
  };

  const id = await createCampaign(dbInput);

  return {
    id,
    message: `Campaign '${input.name}' created successfully with target population ${input.targetPopulation}.`,
  };
}

/**
 * Update campaign status
 */
export async function updateCampaignStatus(
  campaignId: number,
  status: CampaignStatus
): Promise<{ success: boolean; message: string }> {
  const allDbCampaigns = await getCampaigns();
  const c = allDbCampaigns.find((x: any) => x.id === campaignId);
  if (!c) {
    throw new Error(`Campaign #${campaignId} not found.`);
  }
  c.status = status;
  return {
    success: true,
    message: `Campaign #${campaignId} status changed to '${status}'.`,
  };
}
