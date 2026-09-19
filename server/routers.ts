import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, approvedProcedure, careTeamProcedure, doctorProcedure, facilityStaffProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createAlert,
  createAppointment,
  createAuditEvent,
  createCampaign,
  createConsultation,
  createFollowUp,
  createHousehold,
  createPatient,
  createPrescription,
  createPrescriptionsBatch,
  dispensePrescription,
  getPrescriptionById,
  createReferral,
  addReferralEvent,
  getReferralsWithTimeline,
  getReferralTimeline,
  updateReferralLifecycleStatus,
  createVisit,
  getAIInsights,
  getAlerts,
  getAppointments,
  getCampaigns,
  getConsultationById,
  getConsultationsForPatient,
  getDashboardMetrics,
  getFacilities,
  getFollowUpById,
  getFollowUps,
  cancelFollowUp,
  detectOverdueFollowUps,
  getHealthWorkers,
  getHouseholdById,
  getHouseholds,
  getInventory,
  getMedicineAnalytics,
  getPatientById,
  getPatientProfile,
  getPatientTimeline,
  getPatients,
  getPatientsForUser,
  getPrescriptions,
  getReferralAnalytics,
  getReferralById,
  getRiskDistribution,
  getVillageHealthMap,
  markOverdueFollowUps,
  recordCampaignScreening,
  seedDemoData,
  completeFollowUp,
  updateAppointmentStatus,
  updateMedicine,
  addMedicine,
  updateMedicineStock,
  receiveMedicineStock,
  dispenseMedicine,
  setMedicineReorderThreshold,
  getMedicineTransactions,
  getMedicineById,
  updatePatient,
  updatePrescription,
  updateReferral,
  updateUserRole,
  getUserById,
  getUserByOpenId,
  listUsers,
  approveStaffUser,
  rejectStaffUser,
  suspendStaffUser,
  reactivateStaffUser,
  updateUserProfile,
  resetDemoEnvironment,
} from "./db";
import { SYNTHETIC_DEMO_ACCOUNTS } from "./syntheticMaharashtraData";
import {
  rankFacilitiesForReferral,
  SMART_FACILITIES_REGISTRY,
  SYNTHETIC_TELEMETRY_DISCLAIMER,
  REFERRAL_STATUSES,
  CONFIG_VILLAGES,
  calculateGeodesicDistanceKm,
} from "./smartReferralEngine";
import {
  assessRisk,
  calculateBMI,
  evaluateCommunityScreening,
  generateTriageSummary,
  triageFromRules,
  validateScreeningVitals,
  evaluateDeterministicClinicalTriage,
  executeDeterministicSafetyGuardedTriage,
  DEFAULT_TRIAGE_CONFIG,
  calculateHybridHealthRisk,
  HYBRID_RISK_DISCLAIMER,
  generateDoctorClinicalSummary,
  CLINICAL_SAFETY_NOTICE,
  CLINICAL_SUMMARY_DISCLAIMER,
} from "./decisionSupport";
import {
  determineMedicineAvailability,
  batchCheckMedicineAvailability,
  searchFacilitiesForMedicine,
  getCitizenMedicineView,
  calculateAvailabilityStatus,
  toCitizenStatus,
  matchesMedicine,
} from "./medicineAvailabilityService";
import {
  getFacilityDemandForecasts,
  getDetailedMedicineForecast,
  getDistrictDemandForecasts,
  PROTOTYPE_FORECAST_DISCLAIMER,
  ACCURACY_LIMITATION_NOTICE,
} from "./demandForecastingService";
import {
  getDistrictAccessibilityScores,
  calculateVillageScore,
  DEFAULT_ACCESSIBILITY_WEIGHTS,
  PROTOTYPE_METRIC_DISCLAIMER,
  AccessibilityFactorWeightConfig,
} from "./villageAccessibilityService";
import {
  getDistrictHealthMapData,
  getDistrictMapFilterOptions,
} from "./districtHealthMapService";
import { getDistrictCommandCenterData } from "./districtCommandCenterService";
import {
  getCampaignsWithStats,
  getVillagePrioritization,
  createHealthCampaign,
  updateCampaignStatus,
} from "./campaignManagementService";
import {
  dispatchNotification,
  getInAppNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationHistory,
  getNotificationPreferences,
  updateNotificationPreferences,
  getProviderStatusTelemetry,
} from "./notificationService";

const careTeamRoles = ["asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"] as const;
export const canCoordinate = (role: string) => careTeamRoles.includes(role as (typeof careTeamRoles)[number]);
export const hasRole = (role: string, ...allowed: string[]) => {
  if (allowed.includes(role)) return true;
  if ((role === "admin" || role === "administrator") && (allowed.includes("administrator") || allowed.includes("admin"))) return true;
  if ((role === "asha" || role === "cho" || role === "asha_cho") && (allowed.includes("asha_cho") || allowed.includes("asha") || allowed.includes("cho"))) return true;
  return false;
};

async function assertPatientAccess(patientId: number, userId: number, role: string) {
  const patient = await getPatientById(patientId);
  if (!patient) throw new TRPCError({ code: "NOT_FOUND", message: "Patient record not found" });
  if (role === "citizen" && patient.userId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied. Citizen cannot access another patient's medical records.",
    });
  }
  // Audit log patient record read access
  await createAuditEvent({
    actorId: userId,
    action: "patient.viewed",
    entityType: "patient",
    entityId: patientId,
    detail: `Patient #${patientId} medical records accessed by User #${userId} (${role})`,
  });
  return patient;
}

async function recordVisitWorkflow(input: any, actorId: number) {
  const patient = await getPatientById(input.patientId);

  // Validate physiological bounds
  const validationErrors = validateScreeningVitals(input);
  if (validationErrors.length > 0) {
    throw new Error(`Screening validation failed: ${validationErrors.join(" ")}`);
  }

  const combinedConditions = `${input.existingConditions || ""} ${patient?.conditions || ""}`.trim();
  const evaluationInput = {
    ...input,
    age: input.age ?? patient?.age,
    gender: input.gender ?? patient?.gender,
    conditions: combinedConditions,
    existingConditions: combinedConditions,
  };

  const evalResult = evaluateCommunityScreening(evaluationInput);
  const risk = assessRisk(evaluationInput);
  const triage = triageFromRules(evaluationInput);
  const deterministicTriage = evaluateDeterministicClinicalTriage(evaluationInput);

  let calculatedBmi = input.bmi;
  if (!calculatedBmi && input.weight && input.height) {
    const bmiRes = calculateBMI(Number(input.weight), Number(input.height));
    if (bmiRes) calculatedBmi = bmiRes.bmi;
  }

  const categoryEnumMap: Record<string, "normal" | "attention" | "high_risk" | "emergency"> = {
    NORMAL: "normal",
    ATTENTION: "attention",
    "HIGH RISK": "high_risk",
    EMERGENCY: "emergency",
  };

  const id = await createVisit({
    patientId: input.patientId,
    recordedBy: actorId,
    facilityId: input.facilityId,
    symptoms: input.symptoms,
    structuredSymptoms: input.structuredSymptoms ? JSON.stringify(input.structuredSymptoms) : undefined,
    notes: input.notes,
    diagnosis: input.diagnosis,
    bpSystolic: input.bpSystolic,
    bpDiastolic: input.bpDiastolic,
    pulse: input.pulse,
    spo2: input.spo2,
    temperature: input.temperature === undefined ? undefined : String(Number(input.temperature).toFixed(1)),
    glucose: input.glucose,
    weight: input.weight === undefined ? undefined : String(Number(input.weight).toFixed(1)),
    height: input.height === undefined ? undefined : String(Number(input.height).toFixed(1)),
    bmi: calculatedBmi === undefined ? undefined : String(Number(calculatedBmi).toFixed(1)),
    pregnancyStatus: input.pregnancyStatus,
    existingConditions: combinedConditions || undefined,
    triageLevel: deterministicTriage.triageLevel,
    riskScore: deterministicTriage.score,
    riskCategory: categoryEnumMap[evalResult.status] || "normal",
    recommendedAction: deterministicTriage.recommendedAction,
    aiSummary: `[${deterministicTriage.priorityDisplay}] Reasons: ${deterministicTriage.reasons.join("; ")}. Recommended Action: ${deterministicTriage.recommendedAction}`,
  });

  if (patient && (evalResult.status === "HIGH RISK" || evalResult.status === "EMERGENCY" || deterministicTriage.isEmergency)) {
    await createAlert({
      userId: actorId,
      patientId: patient.id,
      kind: "high_risk",
      title: `[${deterministicTriage.priorityDisplay}] Screening Alert for ${patient.name}`,
      message: `${patient.name} (${patient.village || "Village"}): ${deterministicTriage.reasons.join("; ")}. Recommended: ${deterministicTriage.recommendedAction}`,
    });
  }

  await createAuditEvent({
    actorId,
    action: "screening.created",
    entityType: "healthVisit",
    entityId: id,
    detail: `Status: ${evalResult.status} | Triage: ${deterministicTriage.category} (Score ${deterministicTriage.score}/100)`,
  });

  return { id, risk, triage, screeningResult: evalResult, deterministicTriage };
}

async function createReferralWorkflow(input: any, actorId: number, actorRole?: string, actorName?: string) {
  const id = await createReferral({
    ...input,
    createdBy: actorId,
    actorRole: actorRole || "doctor",
    actorName: actorName || "Clinical Team",
  });
  await createAlert({
    userId: actorId,
    patientId: input.patientId,
    referralId: id,
    kind: "referral",
    title: "Smart Referral Created",
    message: `${input.urgency.toUpperCase()} referral created (Score: ${input.recommendationScore ?? "N/A"}). Care-team coordination required.`,
  });
  await createAuditEvent({
    actorId,
    action: "referral.created",
    entityType: "referral",
    entityId: id,
    detail: `Target Facility #${input.targetFacilityId || "Unassigned"} (${input.specialty || "General"}) · Score: ${input.recommendationScore ?? "N/A"} · Reason: ${input.reason}`,
  });
  return { id };
}

async function createFollowUpWorkflow(input: any, actorId: number) {
  const reason = input.reason || input.title || "Follow-up Directive";
  const title = input.title || input.reason || "Follow-up Directive";
  const assignedTo = input.assignedTo ?? 2;
  const id = await createFollowUp({
    ...input,
    title,
    reason,
    assignedTo,
  });
  await createAuditEvent({
    actorId,
    action: "follow_up.scheduled",
    entityType: "followUp",
    entityId: id,
    detail: `Follow-up order: ${reason} (Worker #${assignedTo}) due ${new Date(input.dueAt).toLocaleDateString()}`,
  });
  return { id };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    demoLogin: publicProcedure
      .input(
        z.object({
          username: z.string(),
          password: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const username = input.username.toLowerCase();
        const account = SYNTHETIC_DEMO_ACCOUNTS.find(
          (u) =>
            u.username.toLowerCase() === username ||
            u.email?.toLowerCase() === username ||
            u.role.toLowerCase() === username
        );
        if (!account) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `User account '${input.username}' not found`,
          });
        }
        return {
          success: true,
          user: {
            id: SYNTHETIC_DEMO_ACCOUNTS.indexOf(account) + 1,
            openId: `demo-user-${account.role}`,
            name: account.name,
            email: account.email,
            role: account.role,
            facilityId: account.facilityId,
            village: account.village,
            district: account.district,
          },
          token: `demo-token-${account.role}`,
        };
      }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      if (ctx.user) {
        await createAuditEvent({
          actorId: ctx.user.id,
          action: "auth.logout",
          entityType: "user",
          entityId: ctx.user.id,
          detail: `User #${ctx.user.id} logged out`,
        });
      }
      return { success: true } as const;
    }),
  }),
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      return user || ctx.user;
    }),
    update: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "Name cannot be empty").optional(),
          phone: z.string().nullable().optional(),
          dateOfBirth: z.string().nullable().optional(),
          age: z.number().nullable().optional(),
          gender: z.string().nullable().optional(),
          village: z.string().nullable().optional(),
          district: z.string().nullable().optional(),
          emergencyContactName: z.string().nullable().optional(),
          emergencyContactPhone: z.string().nullable().optional(),
          bloodGroup: z.string().nullable().optional(),
          allergies: z.string().nullable().optional(),
          conditions: z.string().nullable().optional(),
          address: z.string().nullable().optional(),
          pincode: z.string().nullable().optional(),
          abhaId: z.string().nullable().optional(),
          avatarUrl: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Enforce user ownership
        const updated = await updateUserProfile(ctx.user.id, input);
        
        await createAuditEvent({
          actorId: ctx.user.id,
          action: "PROFILE_UPDATED",
          entityType: "profile",
          entityId: ctx.user.id,
          detail: `User #${ctx.user.id} updated permitted profile information`,
        });

        await createAlert({
          userId: ctx.user.id,
          kind: "system",
          title: "Profile Updated",
          message: "Your profile details have been updated successfully.",
        });

        await dispatchNotification({
          eventType: "account_status",
          recipientId: ctx.user.id,
          recipientName: updated?.name || ctx.user.name || "User",
          recipientEmail: updated?.email || ctx.user.email || undefined,
          recipientPhone: (updated?.phone as string) || (ctx.user.phone as string) || undefined,
          title: "Profile Updated",
          message: "Your profile details have been updated successfully.",
          priority: "routine",
        });

        return {
          success: true,
          user: updated || ctx.user,
          profile: updated || ctx.user,
        };
      }),
    completeOnboarding: protectedProcedure.input(z.object({ role: z.enum(["citizen", "asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"]) })).mutation(async ({ input, ctx }) => {
      if ((input.role === "admin" || input.role === "administrator") && !hasRole(ctx.user.role, "administrator", "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access must be granted by an existing administrator" });
      }
      await updateUserRole(ctx.user.id, input.role as any);
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "auth.onboarding_completed",
        entityType: "user",
        entityId: ctx.user.id,
        detail: `User completed onboarding with role ${input.role}`,
      });
      return { success: true, role: input.role };
    }),
    switchRole: protectedProcedure.input(z.object({ role: z.enum(["citizen", "asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"]) })).mutation(async ({ input, ctx }) => {
      if ((input.role === "admin" || input.role === "administrator") && !hasRole(ctx.user.role, "administrator", "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access must be granted by an existing administrator" });
      }
      await updateUserRole(ctx.user.id, input.role as any);
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "auth.role_updated",
        entityType: "user",
        entityId: ctx.user.id,
        detail: `User role updated to ${input.role}`,
      });
      return { success: true, role: input.role };
    }),
  }),
  dashboard: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      await seedDemoData();
      await markOverdueFollowUps();
      const metrics = await getDashboardMetrics(ctx.user.district ?? undefined);
      const isCareTeam = canCoordinate(ctx.user.role);
      const roleFocus = hasRole(ctx.user.role, "asha", "cho", "asha_cho")
        ? { title: "Village care rounds", description: "Register households, capture visits offline, screen NCDs, and keep field follow-ups moving." }
        : ctx.user.role === "doctor"
          ? { title: "Clinical review desk", description: "Prioritize emergency signals, write digital prescriptions, review OPD queues, and manage clinical referrals." }
          : ctx.user.role === "facility_staff"
            ? { title: "Facility operations & pharmacy", description: "Monitor drug inventory, prevent stockouts, flag expiring batches, and coordinate inbound patient transport." }
            : hasRole(ctx.user.role, "administrator")
              ? { title: "District command center", description: "Oversee cross-facility caseloads, referral funnels, pharmacy supply chains, and epidemiological signals." }
              : { title: "Your personal care plan", description: "Review your health vitals, active prescriptions, appointments, family records, and safety-net guidance." };
      return {
        role: ctx.user.role,
        district: ctx.user.district ?? "Ahmedabad Rural",
        roleFocus,
        metrics,
        permissions: {
          canCoordinate: isCareTeam,
          canViewDistrictAnalytics: hasRole(ctx.user.role, "administrator", "facility_staff"),
          canCreatePatient: hasRole(ctx.user.role, "asha", "cho", "asha_cho", "administrator"),
          canRecordVisit: hasRole(ctx.user.role, "asha", "cho", "asha_cho", "doctor", "administrator"),
          canManageInventory: hasRole(ctx.user.role, "facility_staff", "administrator"),
          canManageReferrals: hasRole(ctx.user.role, "doctor", "facility_staff", "administrator", "asha_cho", "asha", "cho"),
        },
      };
    }),
  }),
  households: router({
    list: protectedProcedure.query(({ ctx }) => hasRole(ctx.user.role, "asha_cho", "facility_staff", "administrator") ? getHouseholds() : []),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input, ctx }) => hasRole(ctx.user.role, "asha_cho", "facility_staff", "administrator") ? getHouseholdById(input.id) : undefined),
    create: protectedProcedure.input(z.object({ headName: z.string().min(2), village: z.string().min(2), district: z.string().default("Ahmedabad Rural"), contact: z.string().optional() })).mutation(async ({ input, ctx }) => {
      if (!canCoordinate(ctx.user.role)) throw new Error("Only ASHA/CHO workers and care-team roles can create households");
      const id = await createHousehold({ ...input, assignedWorkerId: ctx.user.id });
      await createAuditEvent({ actorId: ctx.user.id, action: "household.created", entityType: "household", entityId: id, detail: input.headName });
      return { id };
    }),
  }),
  patients: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional()).query(({ input, ctx }) => getPatientsForUser(ctx.user.id, ctx.user.role, input?.limit ?? 50)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input, ctx }) => assertPatientAccess(input.id, ctx.user.id, ctx.user.role)),
    timeline: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input, ctx }) => {
      await assertPatientAccess(input.id, ctx.user.id, ctx.user.role);
      return getPatientTimeline(input.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(2),
      age: z.number().int().min(0).max(120),
      gender: z.enum(["female", "male", "other", "undisclosed"]),
      contact: z.string().optional(),
      village: z.string().optional(),
      district: z.string().default("Ahmedabad Rural"),
      conditions: z.string().optional(),
      allergies: z.string().optional(),
      bloodGroup: z.string().optional(),
      emergencyContact: z.string().optional(),
      householdId: z.number().int().optional(),
      userId: z.number().int().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "asha_cho", "administrator")) {
        throw new Error("Only ASHA/CHO workers and administrators can create patient records");
      }
      const id = await createPatient(input);
      await createAuditEvent({ actorId: ctx.user.id, action: "patient.created", entityType: "patient", entityId: id, detail: input.name });
      return { id };
    }),
    addFamilyMember: protectedProcedure.input(z.object({
      name: z.string().min(2),
      age: z.number().int().min(0).max(120),
      gender: z.enum(["female", "male", "other", "undisclosed"]),
      contact: z.string().optional(),
      village: z.string().optional(),
      district: z.string().default("Ahmedabad Rural"),
      conditions: z.string().optional(),
      allergies: z.string().optional(),
      bloodGroup: z.string().optional(),
      emergencyContact: z.string().optional(),
      householdId: z.number().int().optional(),
    })).mutation(async ({ input, ctx }) => {
      const patientInput = {
        ...input,
        userId: ctx.user.id,
        village: input.village || ctx.user.village || "Sundarpur",
        district: input.district || ctx.user.district || "Ahmedabad Rural",
      };
      const id = await createPatient(patientInput);
      await createAuditEvent({ actorId: ctx.user.id, action: "patient.family_member_added", entityType: "patient", entityId: id, detail: `Family member ${input.name} added by user #${ctx.user.id}` });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      name: z.string().min(2).optional(),
      age: z.number().int().min(0).max(120).optional(),
      gender: z.enum(["female", "male", "other", "undisclosed"]).optional(),
      contact: z.string().optional(),
      village: z.string().optional(),
      district: z.string().optional(),
      conditions: z.string().optional(),
      allergies: z.string().optional(),
      bloodGroup: z.string().optional(),
      emergencyContact: z.string().optional(),
      householdId: z.number().int().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "asha_cho", "doctor", "administrator")) {
        throw new Error("Only care-team roles can update patient records");
      }
      const { id, ...data } = input;
      await updatePatient(id, data);
      await createAuditEvent({ actorId: ctx.user.id, action: "patient.updated", entityType: "patient", entityId: id, detail: data.name ?? `Updated patient #${id}` });
      return { success: true };
    }),
    getProfile: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input, ctx }) => {
      await assertPatientAccess(input.id, ctx.user.id, ctx.user.role);
      const profile = await getPatientProfile(input.id);
      if (!profile) throw new Error("Patient profile not found");
      return profile;
    }),
  }),
  visits: router({
    create: protectedProcedure.input(z.object({
      patientId: z.number().int().positive(),
      facilityId: z.number().int().optional(),
      symptoms: z.string().optional(),
      structuredSymptoms: z.array(z.string()).optional(),
      notes: z.string().optional(),
      diagnosis: z.string().optional(),
      bpSystolic: z.number().int().min(50, "Systolic BP must be at least 50 mmHg").max(300, "Systolic BP cannot exceed 300 mmHg").optional(),
      bpDiastolic: z.number().int().min(30, "Diastolic BP must be at least 30 mmHg").max(200, "Diastolic BP cannot exceed 200 mmHg").optional(),
      pulse: z.number().int().min(30, "Pulse must be at least 30 bpm").max(250, "Pulse cannot exceed 250 bpm").optional(),
      spo2: z.number().int().min(50, "SpO2 must be at least 50%").max(100, "SpO2 cannot exceed 100%").optional(),
      glucose: z.number().int().min(20, "Glucose must be at least 20 mg/dL").max(700, "Glucose cannot exceed 700 mg/dL").optional(),
      temperature: z.number().min(30, "Temperature is too low").max(115, "Temperature is too high").optional(),
      weight: z.number().min(1, "Weight must be at least 1 kg").max(300, "Weight cannot exceed 300 kg").optional(),
      height: z.number().min(30, "Height must be at least 30 cm").max(250, "Height cannot exceed 250 cm").optional(),
      bmi: z.number().optional(),
      pregnancyStatus: z.string().optional(),
      existingConditions: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "asha_cho", "doctor", "administrator", "facility_staff")) {
        throw new Error("Only ASHA/CHO workers, doctors, and administrators can record visits");
      }
      return recordVisitWorkflow(input, ctx.user.id);
    }),
    listForPatient: protectedProcedure.input(z.object({
      patientId: z.number().int().positive(),
    })).query(async ({ input, ctx }) => {
      await assertPatientAccess(input.patientId, ctx.user.id, ctx.user.role);
      const timeline = await getPatientTimeline(input.patientId);
      return timeline.visits;
    }),
  }),
  screenings: router({
    create: protectedProcedure.input(z.object({
      patientId: z.number().int().positive(),
      facilityId: z.number().int().optional(),
      symptoms: z.string().optional(),
      structuredSymptoms: z.array(z.string()).optional(),
      notes: z.string().optional(),
      diagnosis: z.string().optional(),
      bpSystolic: z.number().int().min(50, "Systolic BP must be at least 50 mmHg").max(300, "Systolic BP cannot exceed 300 mmHg").optional(),
      bpDiastolic: z.number().int().min(30, "Diastolic BP must be at least 30 mmHg").max(200, "Diastolic BP cannot exceed 200 mmHg").optional(),
      pulse: z.number().int().min(30, "Pulse must be at least 30 bpm").max(250, "Pulse cannot exceed 250 bpm").optional(),
      spo2: z.number().int().min(50, "SpO2 must be at least 50%").max(100, "SpO2 cannot exceed 100%").optional(),
      glucose: z.number().int().min(20, "Glucose must be at least 20 mg/dL").max(700, "Glucose cannot exceed 700 mg/dL").optional(),
      temperature: z.number().min(30, "Temperature is too low").max(115, "Temperature is too high").optional(),
      weight: z.number().min(1, "Weight must be at least 1 kg").max(300, "Weight cannot exceed 300 kg").optional(),
      height: z.number().min(30, "Height must be at least 30 cm").max(250, "Height cannot exceed 250 cm").optional(),
      bmi: z.number().optional(),
      pregnancyStatus: z.string().optional(),
      existingConditions: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "asha_cho", "doctor", "administrator", "facility_staff")) {
        throw new Error("Only care-team workers and administrators can record screening encounters");
      }
      return recordVisitWorkflow(input, ctx.user.id);
    }),
    listForPatient: protectedProcedure.input(z.object({
      patientId: z.number().int().positive(),
    })).query(async ({ input, ctx }) => {
      await assertPatientAccess(input.patientId, ctx.user.id, ctx.user.role);
      const timeline = await getPatientTimeline(input.patientId);
      return timeline.visits;
    }),
    assessInstant: protectedProcedure.input(z.object({
      patientId: z.number().int().positive().optional(),
      bpSystolic: z.number().int().min(50).max(300).optional(),
      bpDiastolic: z.number().int().min(30).max(200).optional(),
      pulse: z.number().int().min(30).max(250).optional(),
      spo2: z.number().int().min(50).max(100).optional(),
      temperature: z.number().min(30).max(115).optional(),
      glucose: z.number().int().min(20).max(700).optional(),
      weight: z.number().min(1).max(300).optional(),
      height: z.number().min(30).max(250).optional(),
      bmi: z.number().optional(),
      symptoms: z.string().optional(),
      structuredSymptoms: z.array(z.string()).optional(),
      existingConditions: z.string().optional(),
      pregnancyStatus: z.string().optional(),
      age: z.number().optional(),
      gender: z.enum(["female", "male", "other", "undisclosed"]).optional(),
    })).mutation(async ({ input }) => {
      return evaluateCommunityScreening(input);
    }),
  }),
  triage: router({
    getConfig: protectedProcedure.query(() => {
      return DEFAULT_TRIAGE_CONFIG;
    }),
    evaluateDeterministic: protectedProcedure.input(z.object({
      symptoms: z.string().optional(),
      structuredSymptoms: z.array(z.string()).optional(),
      age: z.number().optional(),
      gender: z.enum(["female", "male", "other", "undisclosed"]).optional(),
      bpSystolic: z.number().optional(),
      bpDiastolic: z.number().optional(),
      pulse: z.number().optional(),
      spo2: z.number().optional(),
      temperature: z.number().optional(),
      glucose: z.number().optional(),
      weight: z.number().optional(),
      height: z.number().optional(),
      bmi: z.number().optional(),
      conditions: z.string().optional(),
      existingConditions: z.string().optional(),
      pregnancyStatus: z.string().optional(),
      missedFollowUps: z.number().optional(),
    })).mutation(async ({ input }) => {
      return evaluateDeterministicClinicalTriage(input);
    }),
    assess: protectedProcedure.input(z.object({
      symptoms: z.string().optional(),
      structuredSymptoms: z.array(z.string()).optional(),
      age: z.number().optional(),
      gender: z.enum(["female", "male", "other", "undisclosed"]).optional(),
      bpSystolic: z.number().optional(),
      bpDiastolic: z.number().optional(),
      pulse: z.number().optional(),
      spo2: z.number().optional(),
      temperature: z.number().optional(),
      glucose: z.number().optional(),
      bmi: z.number().optional(),
      weight: z.number().optional(),
      height: z.number().optional(),
      conditions: z.string().optional(),
      existingConditions: z.string().optional(),
      pregnancyStatus: z.string().optional(),
      missedFollowUps: z.number().optional(),
    })).mutation(async ({ input }) => {
      // Step 1: Deterministic clinical triage executes FIRST
      const deterministic = evaluateDeterministicClinicalTriage(input);
      const risk = assessRisk(input);
      const rules = triageFromRules(input);

      // Step 2: Safety-guarded AI triage summary where deterministic rules override any lower AI risk
      const guardedResult = await executeDeterministicSafetyGuardedTriage(input);

      return {
        risk,
        rules,
        deterministic,
        summary: {
          summary: guardedResult.aiSummary,
          urgency: guardedResult.aiUrgency,
          safetyNet: guardedResult.safetyNet,
          isAiOverriddenByRule: guardedResult.isAiOverriddenByRule,
          disclaimer: "AI-assisted decision support only — not a clinical diagnosis. Immediate professional medical evaluation required for critical/urgent alerts.",
        },
        disclaimer: "AI-assisted decision support only — not a diagnosis.",
      };
    }),
  }),
  risk: router({
    calculateHybrid: protectedProcedure.input(z.object({
      age: z.number().optional(),
      gender: z.enum(["female", "male", "other", "undisclosed"]).optional(),
      bpSystolic: z.number().optional(),
      bpDiastolic: z.number().optional(),
      pulse: z.number().optional(),
      spo2: z.number().optional(),
      temperature: z.number().optional(),
      glucose: z.number().optional(),
      bmi: z.number().optional(),
      weight: z.number().optional(),
      height: z.number().optional(),
      symptoms: z.string().optional(),
      structuredSymptoms: z.array(z.string()).optional(),
      conditions: z.string().optional(),
      existingConditions: z.string().optional(),
      pregnancyStatus: z.string().optional(),
      previousRiskScore: z.number().optional(),
      previousRiskCategory: z.string().optional(),
      missedFollowUps: z.number().optional(),
    })).mutation(async ({ input }) => {
      return calculateHybridHealthRisk(input);
    }),
    getPatientRiskProfile: protectedProcedure.input(z.object({
      patientId: z.number().int().positive(),
    })).query(async ({ input, ctx }) => {
      const patient = await assertPatientAccess(input.patientId, ctx.user.id, ctx.user.role);
      const timeline = await getPatientTimeline(input.patientId);
      const latestVisit = timeline.visits[0];
      const overdueFollowUps = timeline.followUps.filter(
        (f) => f.status === "overdue" || (f.status === "open" && new Date(f.dueAt) < new Date())
      ).length;

      const riskInput = {
        patientId: patient.id,
        age: patient.age,
        gender: patient.gender,
        conditions: patient.conditions || undefined,
        existingConditions: patient.conditions || undefined,
        bpSystolic: latestVisit?.bpSystolic,
        bpDiastolic: latestVisit?.bpDiastolic,
        pulse: latestVisit?.pulse,
        spo2: latestVisit?.spo2,
        temperature: latestVisit?.temperature ? Number(latestVisit.temperature) : undefined,
        glucose: latestVisit?.glucose,
        weight: latestVisit?.weight ? Number(latestVisit.weight) : undefined,
        height: latestVisit?.height ? Number(latestVisit.height) : undefined,
        bmi: latestVisit?.bmi ? Number(latestVisit.bmi) : undefined,
        symptoms: latestVisit?.symptoms || undefined,
        pregnancyStatus: latestVisit?.pregnancyStatus,
        previousRiskScore: patient.riskScore,
        previousRiskCategory: patient.riskCategory,
        missedFollowUps: overdueFollowUps,
      };

      const assessment = calculateHybridHealthRisk(riskInput);
      return {
        patient,
        latestVisit,
        assessment,
      };
    }),
  }),
  referrals: router({
    recommend: protectedProcedure.input(z.object({
      patientId: z.number().int().positive().optional(),
      urgency: z.enum(["emergency", "urgent", "routine"]).default("urgent"),
      specialty: z.string().optional(),
      requiredCapabilities: z.array(z.string()).optional(),
      originVillage: z.string().optional(),
    })).query(async ({ input, ctx }) => {
      let originVillage = input.originVillage;
      let patientVitals = undefined;

      if (input.patientId) {
        const patient = await getPatientById(input.patientId);
        if (patient) {
          originVillage = originVillage || patient.village || undefined;
          const profile = await getPatientProfile(input.patientId);
          if (profile?.latestVitals) {
            patientVitals = {
              bpSystolic: profile.latestVitals.bpSystolic ?? undefined,
              bpDiastolic: profile.latestVitals.bpDiastolic ?? undefined,
              spo2: profile.latestVitals.spo2 ?? undefined,
              glucose: profile.latestVitals.glucose ?? undefined,
              riskScore: patient.riskScore,
              riskCategory: patient.riskCategory,
            };
          }
        }
      }

      const recommendations = rankFacilitiesForReferral({
        patientId: input.patientId,
        originVillage,
        urgency: input.urgency,
        specialty: input.specialty,
        requiredCapabilities: input.requiredCapabilities,
        patientVitals,
      });

      return {
        recommendations,
        topRecommendation: recommendations[0],
        originVillage: originVillage || "Sundarpur",
        urgency: input.urgency,
        specialty: input.specialty || "General Specialty",
        isSyntheticData: true,
        telemetrySource: "Synthetic Demo Facility Registry",
        telemetryDisclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
        generatedAt: new Date(),
      };
    }),

    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input, ctx }) => {
      const referral = await getReferralById(input.id);
      if (!referral) return undefined;
      const patient = await getPatientById(referral.patientId);
      const facility = SMART_FACILITIES_REGISTRY.find(f => f.id === referral.targetFacilityId);
      return {
        ...referral,
        patientName: patient?.name,
        patientAge: patient?.age,
        patientGender: patient?.gender,
        patientVillage: patient?.village,
        targetFacilityName: facility?.name,
        targetFacilityType: facility?.facilityType,
        targetFacilityPhone: facility?.phone,
        targetFacilityAddress: facility?.address,
      };
    }),

    getTimeline: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const referral = await getReferralById(input.id);
      const events = await getReferralTimeline(input.id);
      return {
        referral,
        events,
      };
    }),

    list: protectedProcedure.query(async ({ ctx }) => {
      if (!hasRole(ctx.user.role, "asha_cho", "doctor", "facility_staff", "administrator")) return [];
      const allReferrals = await getReferralsWithTimeline();
      const patients = await getPatients(100);

      return allReferrals.map((r) => {
        const patient = patients.find(p => p.id === r.patientId);
        const facility = SMART_FACILITIES_REGISTRY.find(f => f.id === r.targetFacilityId);
        return {
          ...r,
          patientName: patient?.name ?? `Patient #${r.patientId}`,
          patientAge: patient?.age,
          patientGender: patient?.gender,
          village: patient?.village,
          targetFacilityName: facility?.name ?? "Specialist Referral Hospital",
          targetFacilityType: facility?.facilityType ?? "district_hospital",
          targetFacilityPhone: facility?.phone,
          targetFacilityAddress: facility?.address,
        };
      }).sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
    }),

    citizenList: protectedProcedure.query(async ({ ctx }) => {
      const allReferrals = await getReferralsWithTimeline();
      let userReferrals: typeof allReferrals = [];
      if (ctx.user.role === "citizen") {
        const userPatients = await getPatientsForUser(ctx.user.id, "citizen");
        let patientIds = new Set(userPatients.map(p => p.id));
        if (patientIds.size === 0 && ctx.user.name) {
          const allPatients = await getPatients(100);
          const matched = allPatients.filter(p => p.name.toLowerCase() === ctx.user.name?.toLowerCase());
          if (matched.length) {
            patientIds = new Set(matched.map(p => p.id));
          }
        }
        if (patientIds.size > 0) {
          userReferrals = allReferrals.filter(r => patientIds.has(r.patientId));
        } else if (ctx.user.loginMethod === "test" || ctx.user.openId?.includes("citizen-user-") || ctx.user.openId?.startsWith("demo-")) {
          userReferrals = allReferrals.filter(r => r.patientId === 1);
        } else {
          userReferrals = [];
        }
      } else {
        userReferrals = allReferrals;
      }
      const patients = await getPatients(100);

      return userReferrals.map((r) => {
        const patient = patients.find(p => p.id === r.patientId);
        const facility = SMART_FACILITIES_REGISTRY.find(f => f.id === r.targetFacilityId);
        return {
          ...r,
          patientName: patient?.name ?? "You",
          targetFacilityName: facility?.name ?? "District Referral Hospital",
          targetFacilityType: facility?.facilityType ?? "district_hospital",
          targetFacilityPhone: facility?.phone,
          targetFacilityAddress: facility?.address,
          emergencyCapability: facility?.emergencyCapability,
          telemetryDisclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
        };
      }).sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
    }),

    create: protectedProcedure.input(z.object({
      patientId: z.number().int().positive(),
      targetFacilityId: z.number().int().optional(),
      specialty: z.string().optional(),
      urgency: z.enum(["emergency", "urgent", "routine"]),
      reason: z.string().min(5),
      recommendationScore: z.number().optional(),
      distanceKm: z.number().optional(),
      scoreBreakdown: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "facility_staff", "administrator", "asha_cho")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only doctors, facility staff, and authorized care-team roles can create referrals.",
        });
      }
      return createReferralWorkflow(input, ctx.user.id, ctx.user.role, ctx.user.name || undefined);
    }),

    confirm: protectedProcedure.input(z.object({
      patientId: z.number().int().positive(),
      targetFacilityId: z.number().int().positive(),
      specialty: z.string().optional(),
      urgency: z.enum(["emergency", "urgent", "routine"]).default("urgent"),
      reason: z.string().min(5),
      recommendationScore: z.number().optional(),
      distanceKm: z.number().optional(),
      scoreBreakdown: z.string().optional(),
      transportRequired: z.boolean().optional(),
      transportType: z.string().optional(),
      transportVehicle: z.string().optional(),
      transportDriverContact: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "facility_staff", "administrator", "asha_cho")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only authorized healthcare workers and doctors can confirm facility referrals.",
        });
      }

      const facility = SMART_FACILITIES_REGISTRY.find(f => f.id === input.targetFacilityId);
      const vehicle = input.transportVehicle || input.transportType;
      const hasTransport = input.transportRequired || !!vehicle;

      const res = await createReferralWorkflow(
        {
          patientId: input.patientId,
          targetFacilityId: input.targetFacilityId,
          specialty: input.specialty || facility?.specialties[0] || "General Medicine",
          urgency: input.urgency,
          reason: input.reason,
          recommendationScore: input.recommendationScore,
          distanceKm: input.distanceKm ? String(input.distanceKm) : undefined,
          scoreBreakdown: input.scoreBreakdown,
          status: hasTransport ? "TRANSPORT_ASSIGNED" : "PENDING",
          transportVehicle: vehicle,
          transportDriverContact: input.transportDriverContact,
        },
        ctx.user.id,
        ctx.user.role,
        ctx.user.name || undefined
      );

      if (hasTransport) {
        await addReferralEvent({
          referralId: res.id,
          status: "TRANSPORT_ASSIGNED",
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          actorName: ctx.user.name || undefined,
          notes: `Transport requisition assigned: ${vehicle || "108 Emergency Ambulance"}`,
          transportVehicle: vehicle,
          transportDriverContact: input.transportDriverContact,
        });
      }

      const fullReferral = await getReferralById(res.id);
      return fullReferral || { id: res.id };
    }),

    updateStatus: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      status: z.string(),
      notes: z.string().optional(),
      transportVehicle: z.string().optional(),
      transportDriverContact: z.string().optional(),
      outcome: z.string().optional(),
      cancellationReason: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "facility_staff", "administrator", "asha_cho")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only authorized healthcare workers, doctors, and facility staff can update referral status.",
        });
      }

      const canonicalStatus = input.status.toUpperCase();
      const updated = await updateReferralLifecycleStatus(input.id, {
        status: canonicalStatus,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        actorName: ctx.user.name || undefined,
        notes: input.notes,
        transportVehicle: input.transportVehicle,
        transportDriverContact: input.transportDriverContact,
        outcome: input.outcome,
        cancellationReason: input.cancellationReason,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "referral.status_updated",
        entityType: "referral",
        entityId: input.id,
        detail: `Referral #${input.id} transitioned to ${canonicalStatus}. Notes: ${input.notes || "None"}`,
      });

      return { success: true, referral: updated };
    }),
  }),
  followUps: router({
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getFollowUpById(input.id)),

    list: protectedProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            patientId: z.number().int().optional(),
            assignedTo: z.number().int().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === "citizen") {
          const userPatients = await getPatientsForUser(ctx.user.id, "citizen");
          if (!userPatients.length && !input?.patientId) return [];
          const targetId = input?.patientId || userPatients[0]?.id;
          return getFollowUps({ ...input, patientId: targetId });
        }
        if (!hasRole(ctx.user.role, "asha_cho", "doctor", "facility_staff", "administrator")) return [];
        return getFollowUps(input);
      }),

    schedule: protectedProcedure
      .input(
        z.object({
          patientId: z.number().int().positive(),
          assignedTo: z.number().int().positive().optional(),
          dueAt: z.coerce.date(),
          reason: z.string().min(2).optional(),
          title: z.string().min(2).optional(),
          referralId: z.number().int().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!hasRole(ctx.user.role, "asha_cho", "doctor", "facility_staff", "administrator")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only care-team roles can schedule follow-ups" });
        }
        return createFollowUpWorkflow(input, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          patientId: z.number().int().positive(),
          assignedTo: z.number().int().positive().optional(),
          title: z.string().min(2).optional(),
          reason: z.string().min(2).optional(),
          dueAt: z.coerce.date(),
          notes: z.string().optional().nullable(),
          referralId: z.number().int().optional().nullable(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!hasRole(ctx.user.role, "asha_cho", "doctor", "facility_staff", "administrator")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only care-team roles can assign follow-ups" });
        }
        return createFollowUpWorkflow(input, ctx.user.id);
      }),

    complete: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          completionNotes: z.string().optional(),
          vitals: z
            .object({
              bpSystolic: z.number().optional(),
              bpDiastolic: z.number().optional(),
              glucose: z.number().optional(),
              spo2: z.number().optional(),
              temperature: z.string().optional(),
            })
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.completionNotes || input.vitals) {
          await completeFollowUp({
            id: input.id,
            completedBy: ctx.user.id,
            completionNotes: input.completionNotes,
            vitals: input.vitals,
          });
        } else {
          await completeFollowUp(input.id);
        }
        await createAuditEvent({
          actorId: ctx.user.id,
          action: "follow_up.completed",
          entityType: "followUp",
          entityId: input.id,
          detail: input.completionNotes || "Follow-up marked completed",
        });
        return { success: true };
      }),

    cancel: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          cancellationReason: z.string().min(2),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!hasRole(ctx.user.role, "doctor", "facility_staff", "administrator")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only doctors or administrators can cancel follow-ups" });
        }
        await cancelFollowUp(input.id, input.cancellationReason, ctx.user.id);
        return { success: true };
      }),

    detectOverdue: protectedProcedure.mutation(async () => {
      return detectOverdueFollowUps();
    }),

    getWorkers: protectedProcedure.query(() => {
      return getHealthWorkers();
    }),

    citizenUpcoming: protectedProcedure
      .input(
        z
          .object({
            patientId: z.number().int().positive().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        await markOverdueFollowUps();
        let targetPatientId = input?.patientId;
        if (ctx.user.role === "citizen") {
          const userPatients = await getPatientsForUser(ctx.user.id, "citizen");
          const userPatientId = userPatients[0]?.id;
          const resolvedId = input?.patientId ?? userPatientId;
          if (!resolvedId) return [];
          targetPatientId = resolvedId;
          await assertPatientAccess(resolvedId, ctx.user.id, ctx.user.role);
        } else if (targetPatientId) {
          await assertPatientAccess(targetPatientId, ctx.user.id, ctx.user.role);
        }
        const list = await getFollowUps({ patientId: targetPatientId });
        const now = new Date();
        return list.map((f) => {
          const dueDate = new Date(f.dueAt);
          const diffMs = dueDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / 86400000);
          let relativeText = "";
          if (f.status === "COMPLETED") relativeText = "Completed";
          else if (f.status === "CANCELLED") relativeText = "Cancelled";
          else if (diffDays < 0) relativeText = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
          else if (diffDays === 0) relativeText = "Due today";
          else if (diffDays === 1) relativeText = "Due tomorrow";
          else relativeText = `Due in ${diffDays} days`;

          return {
            ...f,
            relativeText,
            isUpcoming: f.status === "OPEN" || f.status === "DUE_SOON" || f.status === "OVERDUE",
          };
        });
      }),
  }),
  inventory: router({
    list: protectedProcedure.input(z.object({ facilityId: z.number().int().positive().optional() }).optional()).query(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "facility_staff", "administrator", "asha_cho")) return [];
      let targetFacilityId = input?.facilityId;
      if (ctx.user.role === "facility_staff") {
        targetFacilityId = ctx.user.facilityId ?? 1;
      }
      return getInventory(targetFacilityId);
    }),

    getById: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "facility_staff", "administrator", "asha_cho")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized to view medicine details" });
      }
      return getMedicineById(input.id);
    }),

    add: protectedProcedure.input(z.object({
      name: z.string().min(2),
      category: z.string().optional(),
      facilityId: z.number().int().positive().optional(),
      currentStock: z.number().int().min(0).default(0),
      reorderLevel: z.number().int().min(0).default(10),
      unit: z.string().default("packs"),
      batchNumber: z.string().optional(),
      expiryDate: z.coerce.date().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "facility_staff", "administrator", "doctor")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only authorized facility staff and administrators can add medicines." });
      }

      const facilityId = ctx.user.role === "facility_staff"
        ? (ctx.user.facilityId ?? 1)
        : (input.facilityId ?? ctx.user.facilityId ?? 1);

      if (ctx.user.role === "facility_staff" && ctx.user.facilityId && input.facilityId && input.facilityId !== ctx.user.facilityId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Facility staff can only add inventory for their assigned facility.",
        });
      }

      const res = await addMedicine({
        facilityId,
        name: input.name,
        category: input.category,
        currentStock: input.currentStock,
        reorderLevel: input.reorderLevel,
        unit: input.unit,
        batchNumber: input.batchNumber,
        expiryDate: input.expiryDate,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        actorName: ctx.user.name || undefined,
        notes: input.notes,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "inventory.added",
        entityType: "medicine",
        entityId: res.id,
        detail: `Added medicine ${input.name} (Stock: ${input.currentStock} ${input.unit}) for Facility #${facilityId}`,
      });

      return { success: true, medicine: res.medicine, id: res.id };
    }),

    update: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      currentStock: z.number().int().min(0),
      reason: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "facility_staff", "administrator")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only facility staff and administrators can adjust inventory counts." });
      }

      const med = await getMedicineById(input.id);
      if (!med) throw new TRPCError({ code: "NOT_FOUND", message: "Medicine record not found" });

      if (ctx.user.role === "facility_staff" && ctx.user.facilityId && med.facilityId !== ctx.user.facilityId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Facility staff can only adjust inventory for their assigned facility.",
        });
      }

      const res = await updateMedicineStock(input.id, input.currentStock, {
        reason: input.reason,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        actorName: ctx.user.name || undefined,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "inventory.adjusted",
        entityType: "medicine",
        entityId: input.id,
        detail: `Stock adjusted to ${input.currentStock} for Medicine #${input.id}. Reason: ${input.reason || "Manual count correction"}`,
      });

      return res;
    }),

    receive: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      quantity: z.number().int().positive(),
      batchNumber: z.string().optional(),
      expiryDate: z.coerce.date().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "facility_staff", "administrator")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only facility staff and administrators can receive stock replenishments." });
      }

      const med = await getMedicineById(input.id);
      if (!med) throw new TRPCError({ code: "NOT_FOUND", message: "Medicine record not found" });

      if (ctx.user.role === "facility_staff" && ctx.user.facilityId && med.facilityId !== ctx.user.facilityId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Facility staff can only receive replenishment for their assigned facility.",
        });
      }

      const res = await receiveMedicineStock(input.id, input.quantity, {
        batchNumber: input.batchNumber,
        expiryDate: input.expiryDate,
        notes: input.notes,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        actorName: ctx.user.name || undefined,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "inventory.received",
        entityType: "medicine",
        entityId: input.id,
        detail: `Received ${input.quantity} units for Medicine #${input.id} (Batch: ${input.batchNumber || "Standard"})`,
      });

      return res;
    }),

    dispense: protectedProcedure.input(z.object({
      medicineId: z.number().int().positive(),
      quantity: z.number().int().positive(),
      patientId: z.number().int().positive().optional(),
      prescriptionId: z.number().int().positive().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "facility_staff", "doctor", "administrator")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only authorized facility staff and clinical personnel can dispense medications." });
      }

      const med = await getMedicineById(input.medicineId);
      if (!med) throw new TRPCError({ code: "NOT_FOUND", message: "Medicine record not found" });

      if (ctx.user.role === "facility_staff" && ctx.user.facilityId && med.facilityId !== ctx.user.facilityId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Facility staff can only dispense medications from their assigned facility.",
        });
      }

      const res = await dispenseMedicine({
        medicineId: input.medicineId,
        quantity: input.quantity,
        patientId: input.patientId,
        prescriptionId: input.prescriptionId,
        notes: input.notes,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        actorName: ctx.user.name || undefined,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "medicine.dispensed",
        entityType: "medicine",
        entityId: input.medicineId,
        detail: `Dispensed ${input.quantity} units of Medicine #${input.medicineId} for Patient #${input.patientId || "Unspecified"}`,
      });

      return res;
    }),

    setReorderThreshold: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      reorderLevel: z.number().int().min(0),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "facility_staff", "administrator")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only facility staff and administrators can adjust reorder thresholds." });
      }

      const med = await getMedicineById(input.id);
      if (!med) throw new TRPCError({ code: "NOT_FOUND", message: "Medicine record not found" });

      if (ctx.user.role === "facility_staff" && ctx.user.facilityId && med.facilityId !== ctx.user.facilityId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Facility staff can only adjust threshold for their assigned facility.",
        });
      }

      const res = await setMedicineReorderThreshold(input.id, input.reorderLevel, {
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        actorName: ctx.user.name || undefined,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "inventory.reorder_set",
        entityType: "medicine",
        entityId: input.id,
        detail: `Reorder threshold updated to ${input.reorderLevel} for Medicine #${input.id}`,
      });

      return res;
    }),

    transactions: protectedProcedure.input(z.object({
      facilityId: z.number().int().optional(),
      medicineId: z.number().int().optional(),
      transactionType: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).optional()).query(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "facility_staff", "administrator")) return [];
      const targetFacilityId = input?.facilityId ?? (ctx.user.role === "facility_staff" ? ctx.user.facilityId ?? 1 : undefined);
      return getMedicineTransactions({
        facilityId: targetFacilityId,
        medicineId: input?.medicineId,
        transactionType: input?.transactionType,
        limit: input?.limit,
      });
    }),

    analytics: protectedProcedure.input(z.object({ facilityId: z.number().int().optional() }).optional()).query(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "facility_staff", "administrator")) {
        return { totalSKUs: 0, inStockCount: 0, lowStockCount: 0, outOfStockCount: 0, expiringCount: 0, inStockItems: [], lowStockItems: [], outOfStockItems: [], expiringItems: [], reorderAlerts: [] };
      }
      const targetFacilityId = input?.facilityId ?? (ctx.user.role === "facility_staff" ? ctx.user.facilityId ?? 1 : undefined);
      return getMedicineAnalytics(targetFacilityId);
    }),
  }),
  medicineAvailability: router({
    check: protectedProcedure.input(z.object({
      facilityId: z.number().int().positive().optional(),
      medicineName: z.string().min(1).optional(),
      medicines: z.array(z.string().min(1)).optional(),
    })).query(async ({ input, ctx }) => {
      const facilityId = input.facilityId ?? (ctx.user.facilityId ?? 1);
      const names = input.medicines ?? (input.medicineName ? [input.medicineName] : ["Paracetamol"]);
      return batchCheckMedicineAvailability(facilityId, names, ctx.user.role);
    }),

    searchFacilities: protectedProcedure.input(z.object({
      medicineName: z.string().min(1),
      originVillage: z.string().optional(),
      district: z.string().optional(),
    })).query(async ({ input, ctx }) => {
      return searchFacilitiesForMedicine({
        medicineName: input.medicineName,
        originVillage: input.originVillage ?? (ctx.user.district ? undefined : "Sundarpur"),
        district: input.district ?? (ctx.user.district ?? undefined),
        userRole: ctx.user.role,
      });
    }),

    getCitizenView: protectedProcedure.input(z.object({
      facilityId: z.number().int().positive().optional(),
      medicineName: z.string().min(1),
      originVillage: z.string().optional(),
    })).query(async ({ input, ctx }) => {
      return getCitizenMedicineView({
        facilityId: input.facilityId,
        medicineName: input.medicineName,
        originVillage: input.originVillage ?? "Sundarpur",
      });
    }),

    getPrescriptionAvailability: protectedProcedure.input(z.object({
      prescriptionGroupId: z.string().optional(),
      patientId: z.number().int().positive().optional(),
      facilityId: z.number().int().positive().optional(),
    })).query(async ({ input, ctx }) => {
      let targetPatientId = input?.patientId;
      if (ctx.user.role === "citizen") {
        const userPatients = await getPatientsForUser(ctx.user.id, "citizen");
        const userPatientId = userPatients[0]?.id;
        const resolvedId = input?.patientId ?? userPatientId;
        if (!resolvedId) return { items: [], facilityId: 1, facilityName: "Sundarpur PHC" };
        targetPatientId = resolvedId;
        await assertPatientAccess(resolvedId, ctx.user.id, ctx.user.role);
      } else if (targetPatientId) {
        await assertPatientAccess(targetPatientId, ctx.user.id, ctx.user.role);
      }

      const allPrescriptions = await getPrescriptions(targetPatientId);
      const filteredPrescriptions = input.prescriptionGroupId
        ? allPrescriptions.filter(p => p.prescriptionGroupId === input.prescriptionGroupId)
        : allPrescriptions.filter(p => p.status === "active");

      const facilityId = input.facilityId ?? (ctx.user.facilityId ?? 1);
      const medicineNames = filteredPrescriptions.map(p => p.medicineName);

      const availabilityList = await batchCheckMedicineAvailability(facilityId, medicineNames, ctx.user.role);

      const allFacilities = await getFacilities();
      const targetFacility = allFacilities.find(f => f.id === facilityId);

      const items = filteredPrescriptions.map((rx, idx) => {
        const avail = availabilityList[idx] || {
          status: "UNAVAILABLE" as const,
          citizenStatus: "Unavailable" as const,
          isAvailable: false,
          facilityName: targetFacility?.name ?? "Sundarpur PHC",
          facilityType: targetFacility?.facilityType ?? "phc",
        };

        return {
          ...rx,
          facilityName: avail.facilityName,
          facilityType: avail.facilityType,
          availabilityStatus: avail.status,
          citizenAvailability: avail.citizenStatus,
          isAvailable: avail.isAvailable,
          currentStock: avail.currentStock,
          alternativeFacilities: avail.alternativeFacilitiesWithStock || [],
        };
      });

      const result: any = items;
      result.prescriptionGroupId = input.prescriptionGroupId;
      result.facilityId = facilityId;
      result.facilityName = targetFacility?.name ? (targetFacility.name.includes("Sundarpur") ? "Sundarpur PHC" : targetFacility.name) : "Sundarpur PHC";
      result.items = items;
      return result;
    }),
  }),
  consultations: router({
    getPatientContext: protectedProcedure.input(z.object({ patientId: z.number().int().positive() })).query(async ({ input, ctx }) => {
      await assertPatientAccess(input.patientId, ctx.user.id, ctx.user.role);
      const profile = await getPatientProfile(input.patientId);
      if (!profile) throw new Error("Patient profile not found");

      const hybridRisk = calculateHybridHealthRisk({
        age: profile.patient.age,
        bpSystolic: profile.latestVitals?.bpSystolic ?? undefined,
        bpDiastolic: profile.latestVitals?.bpDiastolic ?? undefined,
        pulse: profile.latestVitals?.pulse ?? undefined,
        spo2: profile.latestVitals?.spo2 ?? undefined,
        glucose: profile.latestVitals?.glucose ?? undefined,
        temperature: profile.latestVitals?.temperature ? Number(profile.latestVitals.temperature) : undefined,
        bmi: profile.latestVitals?.bmi ? Number(profile.latestVitals.bmi) : undefined,
        symptoms: profile.visits[0]?.symptoms ?? undefined,
        conditions: profile.patient.conditions ?? undefined,
        previousRiskScore: profile.patient.riskScore,
        previousRiskCategory: profile.patient.riskCategory,
        missedFollowUps: profile.followUps.filter(f => f.status === "overdue").length,
      });

      const deterministicTriage = evaluateDeterministicClinicalTriage({
        symptoms: profile.visits[0]?.symptoms ?? undefined,
        age: profile.patient.age,
        gender: profile.patient.gender,
        bpSystolic: profile.latestVitals?.bpSystolic ?? undefined,
        bpDiastolic: profile.latestVitals?.bpDiastolic ?? undefined,
        pulse: profile.latestVitals?.pulse ?? undefined,
        spo2: profile.latestVitals?.spo2 ?? undefined,
        glucose: profile.latestVitals?.glucose ?? undefined,
        temperature: profile.latestVitals?.temperature ? Number(profile.latestVitals.temperature) : undefined,
        bmi: profile.latestVitals?.bmi ? Number(profile.latestVitals.bmi) : undefined,
        existingConditions: profile.patient.conditions ?? undefined,
      });

      return {
        ...profile,
        hybridRisk,
        deterministicTriage,
        safetyDisclaimer: CLINICAL_SUMMARY_DISCLAIMER,
        safetyNotice: CLINICAL_SAFETY_NOTICE,
      };
    }),
    generateSummary: protectedProcedure.input(z.object({ patientId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "administrator", "facility_staff", "asha_cho", "asha", "cho")) {
        throw new Error("Only authorized care-team personnel can generate clinical summaries");
      }
      const profile = await getPatientProfile(input.patientId);
      if (!profile) throw new Error("Patient not found");

      const summaryResult = await generateDoctorClinicalSummary(profile);

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "consultation.summary_generated",
        entityType: "patient",
        entityId: input.patientId,
        detail: `Generated AI clinical briefing for Patient #${input.patientId} by User #${ctx.user.id}`,
      });

      return summaryResult;
    }),
    recordConsultation: protectedProcedure.input(z.object({
      patientId: z.number().int().positive(),
      clinicalAssessment: z.string().min(2, "Clinical assessment is required"),
      diagnosis: z.string().min(2, "Diagnosis is required"),
      notes: z.string().optional(),
      treatmentPlan: z.string().min(2, "Treatment plan is required"),
      recommendedTests: z.string().optional(),
      followUpPlan: z.string().optional(),
      followUpDueAt: z.coerce.date().optional(),
      appointmentId: z.number().int().optional(),
      aiSummaryUsed: z.string().optional(),
      bpSystolic: z.number().int().min(50).max(300).optional(),
      bpDiastolic: z.number().int().min(30).max(200).optional(),
      pulse: z.number().int().min(30).max(250).optional(),
      spo2: z.number().int().min(50).max(100).optional(),
      glucose: z.number().int().min(20).max(700).optional(),
      temperature: z.number().min(30).max(115).optional(),
      weight: z.number().min(1).max(300).optional(),
      height: z.number().min(30).max(250).optional(),
      bmi: z.number().optional(),
      prescriptions: z.array(z.object({
        medicineName: z.string().min(2),
        dosage: z.string().min(1),
        frequency: z.string().default("1-0-1"),
        duration: z.string().default("14 days"),
        route: z.string().default("Oral"),
        instructions: z.string().optional(),
      })).optional(),
      followUp: z.object({
        title: z.string().min(3),
        dueAt: z.coerce.date(),
        notes: z.string().optional(),
        assignedTo: z.number().int().optional(),
      }).optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "administrator")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only doctors and administrators can record clinical consultations and write prescriptions",
        });
      }
      const patient = await getPatientById(input.patientId);
      if (!patient) throw new Error("Patient not found");

      let calculatedBmi = input.bmi;
      if (!calculatedBmi && input.weight && input.height) {
        const bmiRes = calculateBMI(Number(input.weight), Number(input.height));
        if (bmiRes) calculatedBmi = bmiRes.bmi;
      }

      // 1. Create Consultation record
      const consultationId = await createConsultation({
        patientId: input.patientId,
        doctorId: ctx.user.id,
        facilityId: ctx.user.facilityId ?? 1,
        appointmentId: input.appointmentId,
        clinicalAssessment: input.clinicalAssessment,
        diagnosis: input.diagnosis,
        notes: input.notes,
        treatmentPlan: input.treatmentPlan,
        recommendedTests: input.recommendedTests,
        followUpPlan: input.followUpPlan || input.followUp?.title,
        followUpDueAt: input.followUpDueAt || input.followUp?.dueAt,
        aiSummaryUsed: input.aiSummaryUsed,
        bpSystolic: input.bpSystolic,
        bpDiastolic: input.bpDiastolic,
        pulse: input.pulse,
        spo2: input.spo2,
        glucose: input.glucose,
        temperature: input.temperature !== undefined ? String(Number(input.temperature).toFixed(1)) : undefined,
        weight: input.weight !== undefined ? String(Number(input.weight).toFixed(1)) : undefined,
        height: input.height !== undefined ? String(Number(input.height).toFixed(1)) : undefined,
        bmi: calculatedBmi !== undefined ? String(Number(calculatedBmi).toFixed(1)) : undefined,
      });

      // 2. Record in healthVisits for unified EHR timeline continuity
      const visitId = await createVisit({
        patientId: input.patientId,
        recordedBy: ctx.user.id,
        facilityId: ctx.user.facilityId ?? 1,
        diagnosis: input.diagnosis,
        notes: `[Doctor Consultation] ${input.clinicalAssessment}. Plan: ${input.treatmentPlan}. Notes: ${input.notes || ""}`,
        symptoms: input.clinicalAssessment,
        bpSystolic: input.bpSystolic,
        bpDiastolic: input.bpDiastolic,
        pulse: input.pulse,
        spo2: input.spo2,
        glucose: input.glucose,
        temperature: input.temperature !== undefined ? String(Number(input.temperature).toFixed(1)) : undefined,
        weight: input.weight !== undefined ? String(Number(input.weight).toFixed(1)) : undefined,
        height: input.height !== undefined ? String(Number(input.height).toFixed(1)) : undefined,
        bmi: calculatedBmi !== undefined ? String(Number(calculatedBmi).toFixed(1)) : undefined,
        triageLevel: "routine",
        riskScore: patient.riskScore,
        riskCategory: patient.riskCategory,
        recommendedAction: input.treatmentPlan,
        aiSummary: input.aiSummaryUsed ? `AI Summary Referenced: ${input.aiSummaryUsed.slice(0, 150)}...` : undefined,
      });

      // 3. Create digital prescriptions if included (Multi-medicine support with Route & Grouping)
      const createdPrescriptionIds: number[] = [];
      const prescriptionGroupId = `RX-GRP-${Date.now()}-${consultationId}`;
      if (input.prescriptions && input.prescriptions.length > 0) {
        for (const rx of input.prescriptions) {
          const rxId = await createPrescription({
            patientId: input.patientId,
            doctorId: ctx.user.id,
            facilityId: ctx.user.facilityId ?? 1,
            consultationId,
            prescriptionGroupId,
            medicineName: rx.medicineName,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: rx.duration,
            route: rx.route || "Oral",
            instructions: rx.instructions,
            status: "active",
          });
          createdPrescriptionIds.push(rxId);
          await createAuditEvent({
            actorId: ctx.user.id,
            action: "prescription.created",
            entityType: "prescription",
            entityId: rxId,
            detail: `${rx.medicineName} (${rx.dosage}, ${rx.route || "Oral"}, ${rx.frequency}, ${rx.duration}) prescribed for Patient #${input.patientId}`,
          });
        }
      }

      // 4. Create follow-up directive if included
      let createdFollowUpId: number | undefined = undefined;
      if (input.followUp) {
        createdFollowUpId = await createFollowUp({
          patientId: input.patientId,
          assignedTo: input.followUp.assignedTo ?? 2,
          title: input.followUp.title,
          dueAt: input.followUp.dueAt,
          notes: input.followUp.notes || `Post-consultation directive for ${input.diagnosis}`,
        });
        await createAuditEvent({
          actorId: ctx.user.id,
          action: "follow_up.created",
          entityType: "followUp",
          entityId: createdFollowUpId,
          detail: `Follow-up directive scheduled for Patient #${input.patientId}`,
        });
      }

      // 5. Complete appointment if provided
      if (input.appointmentId) {
        await updateAppointmentStatus(input.appointmentId, "completed");
      }

      // 6. Create primary Audit Event for the consultation (with PHI redaction)
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "consultation.created",
        entityType: "consultation",
        entityId: consultationId,
        detail: `Clinical consultation completed for Patient #${input.patientId} (Consultation #${consultationId}). Prescriptions: ${createdPrescriptionIds.length}, Follow-up: ${createdFollowUpId ? "Scheduled" : "None"}`,
      });

      return {
        success: true,
        consultationId,
        visitId,
        createdPrescriptionIds,
        createdFollowUpId,
      };
    }),
    getHistory: protectedProcedure.input(z.object({ patientId: z.number().int().positive() })).query(async ({ input, ctx }) => {
      await assertPatientAccess(input.patientId, ctx.user.id, ctx.user.role);
      return getConsultationsForPatient(input.patientId);
    }),
  }),
  prescriptions: router({
    list: protectedProcedure.input(z.object({
      patientId: z.number().int().positive().optional(),
      status: z.enum(["all", "active", "completed", "discontinued", "dispensed"]).optional(),
    }).optional()).query(async ({ input, ctx }) => {
      let targetPatientId = input?.patientId;
      if (ctx.user.role === "citizen") {
        const userPatients = await getPatientsForUser(ctx.user.id, "citizen");
        const userPatientId = userPatients[0]?.id;
        const resolvedId = input?.patientId ?? userPatientId;
        if (!resolvedId) return [];
        targetPatientId = resolvedId;
        await assertPatientAccess(resolvedId, ctx.user.id, ctx.user.role);
      } else if (targetPatientId) {
        await assertPatientAccess(targetPatientId, ctx.user.id, ctx.user.role);
      }

      let list = await getPrescriptions(targetPatientId);
      if (input?.status && input.status !== "all") {
        list = list.filter(p => p.status === input.status);
      }

      const patients = await getPatients(100);
      const facilities = await getFacilities();
      const allInventory = await getInventory();

      return list.map(p => {
        const patient = patients.find(pt => pt.id === p.patientId);
        const facility = facilities.find(f => f.id === p.facilityId) || facilities.find(f => f.id === 1);
        const facilityMeds = allInventory.filter(m => m.facilityId === (p.facilityId ?? 1));
        const matched = facilityMeds.find(m => matchesMedicine(p.medicineName, m.name));

        let availabilityStatus: "AVAILABLE" | "LOW STOCK" | "UNAVAILABLE" = "UNAVAILABLE";
        if (matched) {
          availabilityStatus = calculateAvailabilityStatus(Number(matched.currentStock), Number(matched.reorderLevel ?? 10));
        }
        const citizenAvailability = toCitizenStatus(availabilityStatus);

        return {
          ...p,
          patientName: patient?.name ?? `Patient #${p.patientId}`,
          patientAge: patient?.age,
          patientGender: patient?.gender,
          village: patient?.village,
          doctorName: p.doctorId === 1 ? "Dr. Rajesh Sharma, MD" : `Doctor #${p.doctorId ?? 1}`,
          facilityName: facility?.name ?? "Sundarpur Primary Health Centre (PHC)",
          facilityType: facility?.facilityType ?? "phc",
          availabilityStatus,
          citizenAvailability,
          isAvailable: availabilityStatus === "AVAILABLE",
          currentStock: hasRole(ctx.user.role, "doctor", "facility_staff", "administrator", "asha_cho", "asha", "cho") && matched ? Number(matched.currentStock) : undefined,
        };
      });
    }),

    getSummary: protectedProcedure.input(z.object({
      patientId: z.number().int().positive(),
    })).query(async ({ input, ctx }) => {
      await assertPatientAccess(input.patientId, ctx.user.id, ctx.user.role);
      const patient = await getPatientById(input.patientId);
      if (!patient) throw new Error("Patient record not found");

      const allPrescriptions = await getPrescriptions(input.patientId);
      const activeRaw = allPrescriptions.filter(p => p.status === "active");
      const historyRaw = allPrescriptions.filter(p => p.status !== "active");

      const facilities = await getFacilities();
      const allInventory = await getInventory();

      const enrichRx = (p: typeof allPrescriptions[0]) => {
        const facility = facilities.find(f => f.id === p.facilityId) || facilities.find(f => f.id === 1);
        const facilityMeds = allInventory.filter(m => m.facilityId === (p.facilityId ?? 1));
        const matched = facilityMeds.find(m => matchesMedicine(p.medicineName, m.name));

        let availabilityStatus: "AVAILABLE" | "LOW STOCK" | "UNAVAILABLE" = "UNAVAILABLE";
        if (matched) {
          availabilityStatus = calculateAvailabilityStatus(Number(matched.currentStock), Number(matched.reorderLevel ?? 10));
        }
        const citizenAvailability = toCitizenStatus(availabilityStatus);

        return {
          ...p,
          facilityName: facility?.name ?? "Sundarpur Primary Health Centre (PHC)",
          facilityType: facility?.facilityType ?? "phc",
          availabilityStatus,
          citizenAvailability,
          isAvailable: availabilityStatus === "AVAILABLE",
          currentStock: hasRole(ctx.user.role, "doctor", "facility_staff", "administrator", "asha_cho", "asha", "cho") && matched ? Number(matched.currentStock) : undefined,
        };
      };

      const activeList = activeRaw.map(enrichRx);
      const historyList = historyRaw.map(enrichRx);

      // Categorize into daily timetable slots
      const timetable = {
        morning: [] as typeof activeList,
        afternoon: [] as typeof activeList,
        evening: [] as typeof activeList,
        night: [] as typeof activeList,
        asNeeded: [] as typeof activeList,
      };

      for (const rx of activeList) {
        const freq = (rx.frequency || "").toLowerCase();
        const instr = (rx.instructions || "").toLowerCase();

        let categorized = false;
        if (freq.includes("1-0-0") || freq.includes("morning") || instr.includes("breakfast") || instr.includes("morning")) {
          timetable.morning.push(rx);
          categorized = true;
        }
        if (freq.includes("0-1-0") || freq.includes("afternoon") || instr.includes("lunch") || instr.includes("afternoon")) {
          timetable.afternoon.push(rx);
          categorized = true;
        }
        if (freq.includes("1-0-1") || freq.includes("1-1-1") || freq.includes("twice") || freq.includes("thrice") || freq.includes("tds") || freq.includes("bid")) {
          if (!timetable.morning.includes(rx)) timetable.morning.push(rx);
          if (freq.includes("1-1-1") || freq.includes("thrice") || freq.includes("tds")) {
            if (!timetable.afternoon.includes(rx)) timetable.afternoon.push(rx);
          }
          if (!timetable.night.includes(rx)) timetable.night.push(rx);
          categorized = true;
        }
        if (freq.includes("0-0-1") || freq.includes("night") || freq.includes("bedtime") || instr.includes("sleep") || instr.includes("dinner")) {
          if (!timetable.night.includes(rx)) timetable.night.push(rx);
          categorized = true;
        }
        if (freq.includes("sos") || freq.includes("prn") || freq.includes("as needed") || instr.includes("as needed") || instr.includes("if required")) {
          timetable.asNeeded.push(rx);
          categorized = true;
        }
        if (!categorized) {
          timetable.morning.push(rx);
        }
      }

      return {
        patient: {
          id: patient.id,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          village: patient.village,
          allergies: patient.allergies,
          conditions: patient.conditions,
        },
        activeCount: activeList.length,
        activePrescriptions: activeList,
        dailyTimetable: timetable,
        history: historyList,
        safetyNotice: "Medications must only be taken as directed by your attending doctor. Contact your nearest PHC or ASHA worker if you experience unexpected side effects.",
      };
    }),

    create: protectedProcedure.input(z.object({
      patientId: z.number().int().positive(),
      medicineName: z.string().min(2),
      dosage: z.string().min(1),
      frequency: z.string().default("1-0-1"),
      duration: z.string().default("14 days"),
      route: z.string().default("Oral"),
      instructions: z.string().optional(),
      consultationId: z.number().int().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "administrator")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only licensed doctors and administrators are authorized to create prescriptions. Citizens and ASHA workers cannot prescribe medications.",
        });
      }

      const patient = await getPatientById(input.patientId);
      if (!patient) throw new Error("Patient not found");

      const id = await createPrescription({
        patientId: input.patientId,
        doctorId: ctx.user.id,
        facilityId: ctx.user.facilityId ?? 1,
        consultationId: input.consultationId,
        medicineName: input.medicineName,
        dosage: input.dosage,
        frequency: input.frequency,
        duration: input.duration,
        route: input.route,
        instructions: input.instructions,
        status: "active",
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "prescription.created",
        entityType: "prescription",
        entityId: id,
        detail: `Prescribed ${input.medicineName} (${input.dosage}, Route: ${input.route}, Freq: ${input.frequency}, Duration: ${input.duration}) for ${patient.name} (Patient #${input.patientId}). Instructions: ${input.instructions || "None"}`,
      });

      return { id, success: true };
    }),

    createBatch: protectedProcedure.input(z.object({
      patientId: z.number().int().positive(),
      consultationId: z.number().int().optional(),
      medicines: z.array(z.object({
        medicineName: z.string().min(2),
        dosage: z.string().min(1),
        frequency: z.string().default("1-0-1"),
        duration: z.string().default("14 days"),
        route: z.string().default("Oral"),
        instructions: z.string().optional(),
      })).min(1),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "administrator")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only licensed doctors and administrators are authorized to prescribe multiple medications.",
        });
      }

      const patient = await getPatientById(input.patientId);
      if (!patient) throw new Error("Patient not found");

      const { groupId, createdIds } = await createPrescriptionsBatch(
        ctx.user.id,
        ctx.user.facilityId ?? 1,
        input.patientId,
        input.medicines,
        input.consultationId
      );

      for (let i = 0; i < input.medicines.length; i++) {
        const med = input.medicines[i];
        const rxId = createdIds[i];
        await createAuditEvent({
          actorId: ctx.user.id,
          action: "prescription.created",
          entityType: "prescription",
          entityId: rxId,
          detail: `Batch Item: ${med.medicineName} (${med.dosage}, Route: ${med.route || "Oral"}, ${med.frequency}, ${med.duration}) prescribed for ${patient.name} under Group #${groupId}`,
        });
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "prescription.batch_created",
        entityType: "prescription_batch",
        entityId: createdIds[0],
        detail: `Doctor prescribed batch of ${createdIds.length} medicines for ${patient.name} (Group ID: ${groupId})`,
      });

      return { success: true, groupId, createdIds };
    }),

    dispense: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      quantity: z.number().int().positive().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "facility_staff", "doctor", "administrator")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only authorized facility staff and doctors can dispense medications.",
        });
      }

      const existing = await getPrescriptionById(input.id);
      if (!existing) throw new Error("Prescription not found");

      const qty = input.quantity ?? 1;
      const facilityId = ctx.user.facilityId ?? existing.facilityId ?? 1;
      const inventoryList = await getInventory(facilityId);

      const cleanTarget = existing.medicineName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchedMed = inventoryList.find((m) => {
        const mClean = m.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return mClean.includes(cleanTarget) || cleanTarget.includes(mClean);
      });

      if (matchedMed) {
        if (matchedMed.currentStock < qty) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Insufficient inventory for "${matchedMed.name}". Available: ${matchedMed.currentStock} ${matchedMed.unit}, Requested: ${qty} ${matchedMed.unit}`,
          });
        }
        await dispenseMedicine({
          medicineId: matchedMed.id,
          quantity: qty,
          patientId: existing.patientId,
          prescriptionId: existing.id,
          notes: input.notes || `Prescription #${existing.id} dispensed (${existing.medicineName} ${existing.dosage})`,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          actorName: ctx.user.name || undefined,
        });
      } else {
        await dispensePrescription(input.id, ctx.user.id);
        await createAuditEvent({
          actorId: ctx.user.id,
          action: "prescription.dispensed",
          entityType: "prescription",
          entityId: input.id,
          detail: `Facility staff dispensed ${existing.medicineName} (${existing.dosage}) for Patient #${existing.patientId}. Notes: ${input.notes || "None"}`,
        });
      }

      const updated = await getPrescriptionById(input.id);
      return { success: true, prescription: updated };
    }),

    updateStatus: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["active", "completed", "discontinued", "dispensed"]),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "facility_staff", "administrator")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only authorized clinical and facility staff can modify prescription status.",
        });
      }

      const existing = await getPrescriptionById(input.id);
      if (!existing) throw new Error("Prescription not found");

      const res = await updatePrescription(input.id, input.status, ctx.user.id);

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "prescription.status_updated",
        entityType: "prescription",
        entityId: input.id,
        detail: `Prescription status for ${existing.medicineName} updated from ${existing.status} to ${input.status}`,
      });

      return res;
    }),
  }),
  appointments: router({
    list: protectedProcedure.input(z.object({ patientId: z.number().int().positive().optional() }).optional()).query(async ({ input, ctx }) => {
      let targetPatientId = input?.patientId;
      if (ctx.user.role === "citizen") {
        const userPatients = await getPatientsForUser(ctx.user.id, "citizen");
        const userPatientId = userPatients[0]?.id;
        const resolvedId = input?.patientId ?? userPatientId;
        if (!resolvedId) return [];
        targetPatientId = resolvedId;
        await assertPatientAccess(resolvedId, ctx.user.id, ctx.user.role);
      } else if (targetPatientId) {
        await assertPatientAccess(targetPatientId, ctx.user.id, ctx.user.role);
      }
      const list = await getAppointments(targetPatientId);
      const patients = await getPatients(100);
      const facilities = await getFacilities();
      return list.map(a => {
        const patient = patients.find(pt => pt.id === a.patientId);
        const facility = facilities.find(f => f.id === a.facilityId);
        return {
          ...a,
          patientName: patient?.name ?? `Patient #${a.patientId}`,
          village: patient?.village,
          facilityName: facility?.name ?? "Sundarpur Primary Health Centre",
        };
      });
    }),
    create: protectedProcedure.input(z.object({
      patientId: z.number().int().positive(),
      facilityId: z.number().int().optional(),
      scheduledAt: z.coerce.date(),
      type: z.enum(["general_opd", "ncd_followup", "anc_checkup", "teleconsultation", "specialist"]).default("general_opd"),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      let targetPatientId = input.patientId;
      try {
        await assertPatientAccess(input.patientId, ctx.user.id, ctx.user.role);
      } catch (e) {
        if (ctx.user.role === "citizen") {
          const myPatients = await getPatientsForUser(ctx.user.id, ctx.user.role);
          if (myPatients && myPatients.length > 0) {
            targetPatientId = myPatients[0].id;
          } else {
            const newPatId = await createPatient({
              name: ctx.user.name || "Citizen Patient",
              age: ctx.user.age ?? 30,
              gender: (ctx.user.gender as any) || "undisclosed",
              contact: ctx.user.phone || undefined,
              village: ctx.user.village || "Sundarpur",
              district: ctx.user.district || "Ahmedabad Rural",
              userId: ctx.user.id,
              bloodGroup: ctx.user.bloodGroup || undefined,
              conditions: ctx.user.conditions || undefined,
              allergies: ctx.user.allergies || undefined,
            });
            targetPatientId = newPatId;
          }
        } else {
          throw e;
        }
      }
      const id = await createAppointment({ ...input, patientId: targetPatientId, doctorId: 1, facilityId: input.facilityId ?? 1 });
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "appointment.created",
        entityType: "appointment",
        entityId: id,
        detail: `Appointment (${input.type}) scheduled for Patient #${targetPatientId}`,
      });
      return { id };
    }),
    updateStatus: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["scheduled", "in_consultation", "completed", "cancelled"]),
    })).mutation(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "doctor", "facility_staff", "administrator", "asha_cho")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only care-team personnel can update appointment status." });
      }
      const res = await updateAppointmentStatus(input.id, input.status);
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "appointment.status_updated",
        entityType: "appointment",
        entityId: input.id,
        detail: `Appointment #${input.id} status transitioned to ${input.status}`,
      });
      return res;
    }),
  }),
  campaigns: router({
    list: protectedProcedure
      .input(z.object({ district: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const { campaigns } = await getCampaignsWithStats(input?.district);
        return campaigns;
      }),
    getExecutiveSummary: protectedProcedure
      .input(z.object({ district: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return getCampaignsWithStats(input?.district);
      }),
    getPrioritization: protectedProcedure
      .input(z.object({ district: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return getVillagePrioritization(input?.district);
      }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(3),
          category: z.enum([
            "diabetes_screening",
            "hypertension_screening",
            "maternal_health",
            "nutrition",
            "immunization",
            "anemia_eradication",
            "ncd_screening",
            "eye_care",
            "sanitation",
          ]),
          description: z.string().optional(),
          village: z.string().optional(),
          targetVillages: z.array(z.string()).optional(),
          district: z.string().default("Ahmedabad Rural"),
          startDate: z.coerce.date(),
          endDate: z.coerce.date(),
          targetBeneficiaries: z.number().int().optional(),
          targetPopulation: z.number().int().optional(),
          assignedWorkers: z.array(z.string()).optional(),
          status: z.enum(["planned", "active", "completed", "paused"]).default("active"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const targetVillages =
          input.targetVillages && input.targetVillages.length > 0
            ? input.targetVillages
            : input.village
              ? [input.village]
              : ["Sundarpur"];
        const targetPopulation =
          input.targetPopulation || input.targetBeneficiaries || 100;
        const assignedWorkers =
          input.assignedWorkers && input.assignedWorkers.length > 0
            ? input.assignedWorkers
            : ["ASHA Team Lead", "CHO Staff"];

        const res = await createHealthCampaign({
          name: input.name,
          category: input.category,
          description: input.description,
          district: input.district,
          targetVillages,
          targetPopulation,
          startDate: input.startDate,
          endDate: input.endDate,
          assignedWorkers,
          status: input.status,
        });
        await createAuditEvent({
          actorId: ctx.user.id,
          action: "campaign.created",
          entityType: "campaign",
          entityId: res.id,
          detail: input.name,
        });
        return res;
      }),
    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["planned", "active", "completed", "paused"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const res = await updateCampaignStatus(input.id, input.status);
        await createAuditEvent({
          actorId: ctx.user.id,
          action: "campaign.status_updated",
          entityType: "campaign",
          entityId: input.id,
          detail: input.status,
        });
        return res;
      }),
    recordScreening: protectedProcedure
      .input(
        z.object({
          campaignId: z.number().int().positive(),
          highRisk: z.boolean().default(false),
        })
      )
      .mutation(async ({ input }) => {
        return recordCampaignScreening(input.campaignId, input.highRisk);
      }),
  }),
  facilities: router({
    list: protectedProcedure
      .input(z.object({ district: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const baseList = await getFacilities(input?.district);
        const inventory = await getInventory();
        return baseList.map((f) => {
          const facInventory = inventory.filter((m) => m.facilityId === f.id);
          const inStockCount = facInventory.filter((m) => Number(m.currentStock) > 0).length;
          const lowStockCount = facInventory.filter((m) => Number(m.currentStock) > 0 && Number(m.currentStock) <= Number(m.reorderLevel ?? 10)).length;
          return {
            ...f,
            inventorySummary: {
              totalMedicines: facInventory.length,
              inStockCount,
              lowStockCount,
              outOfStockCount: facInventory.filter((m) => Number(m.currentStock) <= 0).length,
            },
            telemetry: {
              isSynthetic: true,
              source: "Synthetic Demo Facility Registry",
              disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
              lastTelemetrySync: new Date().toISOString(),
            },
          };
        });
      }),

    getMapData: publicProcedure
      .input(
        z
          .object({
            district: z.string().optional(),
            facilityType: z.string().optional(),
            specialty: z.string().optional(),
            emergencyOnly: z.boolean().optional(),
            medicineQuery: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const rawFacilities = await getFacilities(input?.district);
        const inventory = await getInventory();

        const enrichedFacilities = rawFacilities.map((f) => {
          const facInventory = inventory.filter((m) => m.facilityId === f.id);
          const canViewExactStock = ctx.user && hasRole(ctx.user.role, "doctor", "facility_staff", "administrator", "asha_cho", "asha", "cho");
          const inStockMedicines = facInventory
            .filter((m) => Number(m.currentStock) > 0)
            .map((m) => ({
              id: m.id,
              name: m.name,
              category: m.category,
              currentStock: canViewExactStock
                ? Number(m.currentStock)
                : undefined,
              unit: m.unit,
              status: Number(m.currentStock) <= Number(m.reorderLevel ?? 10) ? ("LOW STOCK" as const) : ("AVAILABLE" as const),
            }));

          return {
            ...f,
            inStockMedicines,
            totalInventoryCount: facInventory.length,
            telemetryDisclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
            isDemoData: true,
          };
        });

        return {
          facilities: enrichedFacilities,
          villages: CONFIG_VILLAGES,
          telemetryDisclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
          isDemoData: true,
          center: { latitude: 22.98, longitude: 72.36, zoom: 11 },
        };
      }),

    findNearest: publicProcedure
      .input(
        z.object({
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          originVillage: z.string().optional(),
          facilityType: z.string().optional(),
          specialty: z.string().optional(),
          emergencyRequired: z.boolean().optional(),
          icuRequired: z.boolean().optional(),
          oxygenRequired: z.boolean().optional(),
          ambulanceRequired: z.boolean().optional(),
          requiredMedicine: z.string().optional(),
          maxDistanceKm: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        let originLat = input.latitude;
        let originLng = input.longitude;
        let originName = input.originVillage;

        // Resolve origin coordinates from village if not provided
        if ((originLat === undefined || originLng === undefined) && originName) {
          const foundVillage = CONFIG_VILLAGES.find(
            (v) => v.name.toLowerCase() === originName?.toLowerCase() || v.id.toLowerCase() === originName?.toLowerCase()
          );
          if (foundVillage) {
            originLat = foundVillage.latitude;
            originLng = foundVillage.longitude;
            originName = foundVillage.name;
          }
        }

        // Default fallback to Sundarpur
        if (originLat === undefined || originLng === undefined) {
          originLat = 23.012;
          originLng = 72.3508;
          originName = originName || "Sundarpur";
        }

        const rawFacilities = await getFacilities();
        const inventory = await getInventory();

        const results = rawFacilities
          .map((fac) => {
            const distanceKm =
              fac.latitude && fac.longitude
                ? calculateGeodesicDistanceKm(originLat!, originLng!, fac.latitude, fac.longitude)
                : 15.0;

            // Estimated driving transit time (average 35 km/h on rural roads with 3 min dispatch base)
            const estimatedTravelMins = Math.max(5, Math.round((distanceKm / 35) * 60 + 3));

            // Check capabilities
            const emergencyCap = fac.emergencyCapability || {
              is24x7: false,
              icuAvailable: false,
              oxygenAvailable: false,
              totalBeds: 0,
              availableBeds: 0,
            };

            // Check medicine stock
            const facInventory = inventory.filter((m) => m.facilityId === fac.id);
            let medicineStockStatus: "AVAILABLE" | "LOW STOCK" | "OUT OF STOCK" | "NOT APPLICABLE" = "NOT APPLICABLE";
            let matchedMedicineName: string | undefined = undefined;

            if (input.requiredMedicine && input.requiredMedicine.trim() !== "") {
              const reqClean = input.requiredMedicine.toLowerCase().replace(/[^a-z0-9]/g, "");
              const matched = facInventory.find((m) => {
                const mClean = m.name.toLowerCase().replace(/[^a-z0-9]/g, "");
                return mClean.includes(reqClean) || reqClean.includes(mClean);
              });
              if (matched) {
                matchedMedicineName = matched.name;
                const stock = Number(matched.currentStock);
                const reorder = Number(matched.reorderLevel ?? 10);
                if (stock <= 0) medicineStockStatus = "OUT OF STOCK";
                else if (stock <= reorder) medicineStockStatus = "LOW STOCK";
                else medicineStockStatus = "AVAILABLE";
              } else {
                medicineStockStatus = "OUT OF STOCK";
              }
            }

            // Check specialty match
            const specialtyMatch = !input.specialty || input.specialty === "all"
              ? true
              : (fac.specialties || []).some((s: string) => s.toLowerCase().includes(input.specialty!.toLowerCase()));

            // Appropriateness scoring calculation (0 - 100)
            let score = 100;

            // Distance penalty: -1.5 points per km
            score -= Math.min(45, distanceKm * 1.5);

            // Specialty suitability
            if (input.specialty && input.specialty !== "all") {
              if (specialtyMatch) score += 15;
              else if (fac.facilityType === "district_hospital" || fac.facilityType === "chc") score += 5;
              else score -= 25;
            }

            // Emergency suitability
            if (input.emergencyRequired) {
              if (emergencyCap.is24x7) score += 20;
              else score -= 35;
            }
            if (input.icuRequired) {
              if (emergencyCap.icuAvailable) score += 15;
              else score -= 30;
            }
            if (input.oxygenRequired) {
              if (emergencyCap.oxygenAvailable) score += 10;
              else score -= 20;
            }

            // Medicine suitability
            if (input.requiredMedicine) {
              if (medicineStockStatus === "AVAILABLE") score += 20;
              else if (medicineStockStatus === "LOW STOCK") score += 5;
              else score -= 30;
            }

            // Normalise score (0 - 100)
            const finalScore = Math.max(5, Math.min(100, Math.round(score)));

            return {
              facilityId: fac.id,
              name: fac.name,
              facilityType: fac.facilityType,
              district: fac.district,
              village: fac.village,
              address: fac.address,
              phone: fac.phone,
              latitude: fac.latitude,
              longitude: fac.longitude,
              distanceKm,
              estimatedTravelMins,
              specialties: fac.specialties || [],
              capabilities: fac.capabilities || [],
              emergencyCapability: emergencyCap,
              doctorAvailability: fac.doctorAvailability || [],
              appointmentAvailability: fac.appointmentAvailability,
              appropriatenessScore: finalScore,
              specialtyMatch,
              medicineStockStatus,
              matchedMedicineName,
              keyMedicinesInStock: facInventory
                .filter((m) => Number(m.currentStock) > 0)
                .slice(0, 5)
                .map((m) => m.name),
              telemetryDisclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
              isDemoData: true,
            };
          })
          // Apply strict filter constraints
          .filter((f) => {
            if (input.facilityType && input.facilityType !== "all" && f.facilityType !== input.facilityType) {
              return false;
            }
            if (input.specialty && input.specialty !== "all" && !f.specialtyMatch) {
              return false;
            }
            if (input.emergencyRequired && !f.emergencyCapability.is24x7) {
              return false;
            }
            if (input.icuRequired && !f.emergencyCapability.icuAvailable) {
              return false;
            }
            if (input.oxygenRequired && !f.emergencyCapability.oxygenAvailable) {
              return false;
            }
            if (input.requiredMedicine && input.requiredMedicine.trim() !== "" && f.medicineStockStatus === "OUT OF STOCK") {
              return false;
            }
            if (input.maxDistanceKm && f.distanceKm > input.maxDistanceKm) {
              return false;
            }
            return true;
          })
          // Sort by appropriateness score descending, then distance ascending
          .sort((a, b) => {
            if (b.appropriatenessScore !== a.appropriatenessScore) {
              return b.appropriatenessScore - a.appropriatenessScore;
            }
            return a.distanceKm - b.distanceKm;
          });

        return {
          origin: {
            name: originName || "Custom Pin Location",
            latitude: originLat,
            longitude: originLng,
          },
          results,
          topMatch: results[0] || null,
          totalFound: results.length,
          telemetryDisclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
          isDemoData: true,
          searchedAt: new Date(),
        };
      }),
  }),
  alerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await markOverdueFollowUps();
      return getAlerts(ctx.user.id);
    }),
  }),
  notifications: router({
    list: protectedProcedure
      .input(
        z
          .object({
            isRead: z.boolean().optional(),
            eventType: z
              .enum([
                "appointment_reminder",
                "follow_up_reminder",
                "overdue_follow_up",
                "referral_status",
                "medicine_availability",
                "low_stock",
                "health_campaign_assignment",
                "emergency_referral_alert",
                "system_alert",
                "account_status",
              ])
              .optional(),
            priority: z.enum(["routine", "medium", "high", "emergency"]).optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        await markOverdueFollowUps();
        return getInAppNotifications(ctx.user.id, input);
      }),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        return markNotificationAsRead(input.id);
      }),

    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      return markAllNotificationsAsRead(ctx.user.id);
    }),

    getHistory: protectedProcedure
      .input(
        z
          .object({
            eventType: z
              .enum([
                "appointment_reminder",
                "follow_up_reminder",
                "overdue_follow_up",
                "referral_status",
                "medicine_availability",
                "low_stock",
                "health_campaign_assignment",
                "emergency_referral_alert",
                "system_alert",
                "account_status",
              ])
              .optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return getNotificationHistory(input?.eventType);
      }),

    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      return getNotificationPreferences(ctx.user.id);
    }),

    updatePreferences: protectedProcedure
      .input(
        z.object({
          channels: z
            .object({
              inApp: z.boolean().optional(),
              sms: z.boolean().optional(),
              whatsapp: z.boolean().optional(),
              email: z.boolean().optional(),
            })
            .optional(),
          events: z
            .object({
              appointmentReminder: z.boolean().optional(),
              followUpReminder: z.boolean().optional(),
              overdueFollowUp: z.boolean().optional(),
              referralStatus: z.boolean().optional(),
              medicineAvailability: z.boolean().optional(),
              lowStock: z.boolean().optional(),
              campaignAssignment: z.boolean().optional(),
              emergencyAlerts: z.boolean().optional(),
            })
            .optional(),
          contactInfo: z
            .object({
              phone: z.string().optional(),
              whatsappNumber: z.string().optional(),
              email: z.string().optional(),
              language: z.enum(["en", "gu", "hi"]).optional(),
            })
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return updateNotificationPreferences(ctx.user.id, input as any);
      }),

    sendTest: protectedProcedure
      .input(
        z.object({
          eventType: z.enum([
            "appointment_reminder",
            "follow_up_reminder",
            "overdue_follow_up",
            "referral_status",
            "medicine_availability",
            "low_stock",
            "health_campaign_assignment",
            "emergency_referral_alert",
            "system_alert",
            "account_status",
          ]),
          recipientName: z.string().default("Field Beneficiary / Care Worker"),
          recipientPhone: z.string().optional(),
          recipientWhatsApp: z.string().optional(),
          recipientEmail: z.string().optional(),
          title: z.string(),
          message: z.string(),
          priority: z.enum(["routine", "medium", "high", "emergency"]).default("routine"),
          channels: z.array(z.enum(["in_app", "sms", "whatsapp", "email"])).default(["in_app", "sms", "whatsapp"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return dispatchNotification(
          {
            eventType: input.eventType,
            recipientId: ctx.user.id,
            recipientName: input.recipientName,
            recipientPhone: input.recipientPhone,
            recipientWhatsApp: input.recipientWhatsApp,
            recipientEmail: input.recipientEmail,
            title: input.title,
            message: input.message,
            priority: input.priority,
          },
          input.channels
        );
      }),

    getProviderStatus: protectedProcedure.query(async () => {
      return getProviderStatusTelemetry();
    }),
  }),
  analytics: router({
    overview: protectedProcedure.input(z.object({ district: z.string().optional() }).optional()).query(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "facility_staff", "administrator", "doctor", "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Operational analytics are restricted to authorized healthcare personnel." });
      }
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "administrative.analytics_viewed",
        entityType: "analytics_overview",
        detail: `Analytics overview queried for district: ${input?.district || "All"}`,
      });
      return getDashboardMetrics(input?.district);
    }),
    riskDistribution: protectedProcedure.input(z.object({ district: z.string().optional() }).optional()).query(async ({ input, ctx }) => {
      if (!hasRole(ctx.user.role, "facility_staff", "administrator", "doctor", "admin", "asha_cho")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Risk distribution analytics are restricted to healthcare personnel." });
      }
      return getRiskDistribution(input?.district);
    }),
    referrals: protectedProcedure.query(async ({ ctx }) => {
      if (!hasRole(ctx.user.role, "facility_staff", "administrator", "doctor", "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Referral analytics are restricted to authorized healthcare personnel." });
      }
      return getReferralAnalytics();
    }),
    medicines: protectedProcedure.query(async ({ ctx }) => {
      if (!hasRole(ctx.user.role, "facility_staff", "administrator", "doctor", "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Medicine analytics are restricted to authorized healthcare personnel." });
      }
      const facilityId = ctx.user.role === "facility_staff" ? (ctx.user.facilityId ?? 1) : undefined;
      return getMedicineAnalytics(facilityId);
    }),
    villageMap: protectedProcedure.query(async ({ ctx }) => {
      if (!hasRole(ctx.user.role, "facility_staff", "administrator", "doctor", "admin", "asha_cho")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Village health map is restricted to authorized healthcare personnel." });
      }
      return getVillageHealthMap();
    }),
    aiInsights: protectedProcedure.query(async ({ ctx }) => {
      if (!hasRole(ctx.user.role, "facility_staff", "administrator", "doctor", "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "AI Insights are restricted to authorized healthcare personnel." });
      }
      return getAIInsights();
    }),
  }),
  aiAssistant: router({
    chat: protectedProcedure.input(z.object({
      message: z.string().min(1),
      language: z.enum(["en", "hi", "gu"]).default("en"),
      patientContext: z.object({
        age: z.number().optional(),
        conditions: z.string().optional(),
        recentVitals: z.string().optional(),
      }).optional(),
    })).mutation(async ({ input }) => {
      const msg = input.message.toLowerCase();
      const isEmergency = msg.includes("chest pain") || msg.includes("severe breath") || msg.includes("unconscious") || msg.includes("bleeding heavily") || msg.includes("stroke");
      const isHypertension = msg.includes("bp") || msg.includes("blood pressure") || msg.includes("dizziness") || msg.includes("headache");
      const isDiabetes = msg.includes("sugar") || msg.includes("glucose") || msg.includes("thirst") || msg.includes("diabetes");
      const isPregnancy = msg.includes("pregnancy") || msg.includes("anc") || msg.includes("baby") || msg.includes("trimester");

      let reply = "";
      let urgency: "emergency" | "urgent" | "routine" = "routine";
      let recommendedAction = "Continue prescribed care routine and visit your nearest Sub-Centre / PHC for routine health rounds.";

      if (isEmergency) {
        urgency = "emergency";
        reply = input.language === "gu"
          ? "તાત્કાલિક ચેતવણી: આ લક્ષણો તાત્કાલિક તબીબી કટોકટી હોઈ શકે છે. વિલંબ કર્યા વિના 108 એમ્બ્યુલન્સને કૉલ કરો અથવા નજીકના CHC / સિવિલ હોસ્પિટલ પહોંચો."
          : input.language === "hi"
            ? "आपातकालीन चेतावनी: ये लक्षण गंभीर स्थिति का संकेत हो सकते हैं। कृपया तुरंत 108 एम्बुलेंस को कॉल करें या निकटतम CHC / अस्पताल जाएं।"
            : "EMERGENCY ALERT: These symptoms require immediate clinical attention. Please call 108 ambulance or proceed to the nearest CHC / District Hospital immediately.";
        recommendedAction = "Call 108 Emergency Medical Service. Do not exert physically.";
      } else if (isHypertension) {
        urgency = "urgent";
        reply = input.language === "gu"
          ? "બ્લડ પ્રેશર સંભાળ: સવાર-સાંજ BP માપણી કરાવો, મીઠું ઓછું કરો અને તમારી દવાનું નિયમિત સેવન કરો. જો માથાનો દુખાવો કે ચક્કર વધે તો તાત્કાલિક PHC પર તપાસ કરાવો."
          : input.language === "hi"
            ? "रक्तचाप सलाह: नियमित रूप से बीपी की जांच करवाएं, नमक का सेवन कम करें और समय पर दवाएं लें। यदि चक्कर आए तो तुरंत आशा कार्यकर्ता या पीएचसी से संपर्क करें।"
            : "Hypertension Care: Monitor blood pressure twice daily, maintain low sodium intake, take prescribed Telmisartan/Amlodipine on time, and avoid skipping doses.";
        recommendedAction = "Schedule BP check at Sundarpur PHC or request ASHA home visit.";
      } else if (isDiabetes) {
        urgency = "routine";
        reply = input.language === "gu"
          ? "ડાયાબિટીસ માર્ગદર્શન: ભોજન પછી નિયમિત દવા લો, વધુ પાણી પીવો અને ખાંડયુક્ત આહારથી બચો. નિયમિત સુગર ચેકઅપ માટે PHC ની મુલાકાત લો."
          : input.language === "hi"
            ? "मधुमेह मार्गदर्शन: भोजन के बाद दवा का सेवन करें, पर्याप्त पानी पिएं और मीठे से परहेज करें। नियमित शुगर जांच के लिए प्राथमिक स्वास्थ्य केंद्र जाएं।"
            : "Glycemic Management: Take Metformin strictly after meals, maintain high-fiber diet, stay well-hydrated, and track fasting glucose weekly.";
        recommendedAction = "Book fasting blood sugar test at nearest AAM / Sub-Centre.";
      } else if (isPregnancy) {
        urgency = "routine";
        reply = input.language === "gu"
          ? "માતૃત્વ સંભાળ: દરરોજ આયર્ન-ફોલિક એસિડની ગોળીઓ લીંબુ પાણી સાથે લો (ચા કે દૂધ સાથે નહીં). પોષણયુક્ત આહાર લો અને તમામ ANC તપાસ સમયસર પૂર્ણ કરો."
          : input.language === "hi"
            ? "मातृ स्वास्थ्य सलाह: प्रतिदिन आयरन-फोलिक एसिड की गोलियां नींबू पानी के साथ लें। पौष्टिक आहार लें और अपनी सभी एएनसी जांच समय पर पूरी करें।"
            : "Antenatal Care: Consume daily Iron & Folic Acid (IFA) tablets with citrus water. Ensure timely tetanus immunization and fetal wellness checkups.";
        recommendedAction = "Ensure registration in Pradhan Mantri Matritva Vandana Yojana drive.";
      } else {
        reply = input.language === "gu"
          ? `તમારા સ્વાસ્થ્ય પ્રશ્ન ("${input.message}") માટે: પુષ્કળ પાણી પીવો, પૂરતો આરામ કરો અને જો લક્ષણો 2 દિવસથી વધુ ચાલુ રહે તો તમારા આશા કાર્યકર અથવા સ્થાનિક PHC ડૉક્ટરનો સંપર્ક કરો.`
          : input.language === "hi"
            ? `आपके स्वास्थ्य प्रश्न ("${input.message}") के लिए: पर्याप्त आराम करें, स्वच्छ पानी पिएं और यदि 48 घंटे में आराम न मिले तो नजदीकी पीएचसी डॉक्टर से परामर्श लें।`
            : `Health Guidance regarding "${input.message}": Rest adequately, maintain good hydration, avoid unprescribed self-medication, and consult your village ASHA or PHC medical officer if symptoms persist beyond 48 hours.`;
      }

      return {
        reply,
        urgency,
        recommendedAction,
        disclaimer: "Arjuna is clinical decision support and health guidance, not a formal medical diagnosis.",
        timestamp: new Date(),
      };
    }),
  }),
  offline: router({
    sync: protectedProcedure.input(z.object({
      mutations: z.array(z.object({
        uuid: z.string().optional(),
        entity: z.enum(["household", "patient", "visit", "screening", "referral", "follow_up"]).optional(),
        type: z.string().optional(),
        operation: z.enum(["CREATE", "UPDATE"]).default("CREATE"),
        payload: z.record(z.string(), z.unknown()),
        timestamp: z.union([z.number(), z.string()]).optional(),
        clientTempId: z.union([z.string(), z.number()]).optional(),
        retryCount: z.number().optional(),
      })).max(100).optional(),
      events: z.array(z.object({
        uuid: z.string().optional(),
        entity: z.enum(["household", "patient", "visit", "screening", "referral", "follow_up"]).optional(),
        type: z.string().optional(),
        operation: z.enum(["CREATE", "UPDATE"]).default("CREATE"),
        payload: z.record(z.string(), z.unknown()),
        timestamp: z.union([z.number(), z.string()]).optional(),
        clientTempId: z.union([z.string(), z.number()]).optional(),
        retryCount: z.number().optional(),
      })).max(100).optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!canCoordinate(ctx.user.role)) throw new Error("Only care-team roles can sync offline actions");

      const rawItems = input.mutations || input.events || [];
      const results: Array<{
        uuid: string;
        status: "synced" | "failed" | "conflict";
        serverEntityId?: number;
        clientTempId?: string;
        message?: string;
        error?: string;
        conflictDetails?: Record<string, unknown>;
      }> = [];

      // ID Mapping dictionary for chained dependencies across batch:
      // Maps clientTempId (e.g. "temp_pat_123") -> real server ID (e.g. 42)
      const idMap = new Map<string, number>();

      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        const uuid = item.uuid || `sync_item_${i}_${Date.now()}`;
        const clientTempId = item.clientTempId ? String(item.clientTempId) : undefined;
        const payload = { ...item.payload };

        // Determine entity type (supports new entity field and legacy type field)
        let entity = item.entity;
        if (!entity && item.type) {
          const typeLower = item.type.toLowerCase();
          if (typeLower.includes("household")) entity = "household";
          else if (typeLower.includes("patient")) entity = "patient";
          else if (typeLower.includes("visit")) entity = "visit";
          else if (typeLower.includes("referral")) entity = "referral";
          else if (typeLower.includes("screening")) entity = "screening";
          else if (typeLower.includes("followup")) entity = "follow_up";
        }

        // Remap dependent foreign keys if payload references a temporary client ID
        if (payload.householdId && idMap.has(String(payload.householdId))) {
          payload.householdId = idMap.get(String(payload.householdId));
        }
        if (payload.patientId && idMap.has(String(payload.patientId))) {
          payload.patientId = idMap.get(String(payload.patientId));
        }

        try {
          // 1. HOUSEHOLD CREATION
          if (entity === "household") {
            const rawHeadName = payload.headName;
            if (!rawHeadName || typeof rawHeadName !== "string" || !rawHeadName.trim()) {
              throw new Error("Household head name is required.");
            }
            const headName = rawHeadName.trim();
            const village = String(payload.village || ctx.user.district || "Sundarpur").trim();
            const district = String(payload.district || ctx.user.district || "Ahmedabad Rural").trim();
            const contact = payload.contact ? String(payload.contact).trim() : undefined;

            // Check if household already exists (conflict detection)
            const allHouseholds = await getHouseholds();
            const existingHh = allHouseholds.find(
              (h) => h.headName.toLowerCase() === headName.toLowerCase() && h.village.toLowerCase() === village.toLowerCase()
            );

            if (existingHh) {
              if (clientTempId) idMap.set(clientTempId, existingHh.id);
              results.push({
                uuid,
                status: "conflict",
                serverEntityId: existingHh.id,
                clientTempId,
                message: `Household for "${headName}" in "${village}" already exists (#${existingHh.id}). Associated automatically.`,
                conflictDetails: { existingHouseholdId: existingHh.id, headName, village },
              });
            } else {
              const newHhId = await createHousehold({
                headName,
                village,
                district,
                contact,
                assignedWorkerId: ctx.user.id,
              });
              if (clientTempId) idMap.set(clientTempId, newHhId);
              results.push({
                uuid,
                status: "synced",
                serverEntityId: newHhId,
                clientTempId,
                message: `Household #${newHhId} created successfully.`,
              });
              await createAuditEvent({
                actorId: ctx.user.id,
                action: "household.created.offline_sync",
                entityType: "household",
                entityId: newHhId,
                detail: `Offline synced household: ${headName} (${village})`,
              });
            }
          }

          // 2. PATIENT CREATION
          else if (entity === "patient") {
            const rawName = payload.name;
            if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
              throw new Error("Beneficiary name is required for registration.");
            }
            const name = rawName.trim();
            const age = Number(payload.age) || 30;
            const gender = (payload.gender as any) || "undisclosed";
            const village = payload.village ? String(payload.village).trim() : undefined;
            const district = String(payload.district || ctx.user.district || "Ahmedabad Rural").trim();
            const contact = payload.contact ? String(payload.contact).trim() : undefined;
            const conditions = payload.conditions ? String(payload.conditions).trim() : undefined;
            const allergies = payload.allergies ? String(payload.allergies).trim() : undefined;
            const bloodGroup = payload.bloodGroup ? String(payload.bloodGroup).trim() : undefined;
            const emergencyContact = payload.emergencyContact ? String(payload.emergencyContact).trim() : undefined;
            const householdId = payload.householdId ? Number(payload.householdId) : undefined;

            try {
              const newPatId = await createPatient({
                name,
                age,
                gender,
                village,
                district,
                contact,
                conditions,
                allergies,
                bloodGroup,
                emergencyContact,
                householdId,
              });

              if (clientTempId) idMap.set(clientTempId, newPatId);
              results.push({
                uuid,
                status: "synced",
                serverEntityId: newPatId,
                clientTempId,
                message: `Patient #${newPatId} created successfully.`,
              });
              await createAuditEvent({
                actorId: ctx.user.id,
                action: "patient.created.offline_sync",
                entityType: "patient",
                entityId: newPatId,
                detail: `Offline synced patient: ${name} (${age}y, ${village || "Unknown"})`,
              });
            } catch (createErr: any) {
              // Duplicate patient conflict detection
              const allPatients = await getPatients(200);
              const matchingPatient = allPatients.find((p) => {
                const sameName = p.name.trim().toLowerCase() === name.toLowerCase();
                const sameVillage = (p.village || "").trim().toLowerCase() === (village || "").toLowerCase();
                return sameName && sameVillage;
              });

              if (matchingPatient) {
                if (clientTempId) idMap.set(clientTempId, matchingPatient.id);
                results.push({
                  uuid,
                  status: "conflict",
                  serverEntityId: matchingPatient.id,
                  clientTempId,
                  message: `Beneficiary "${name}" already registered in ${village || "village"} (#${matchingPatient.id}). Connected downstream records.`,
                  conflictDetails: { existingPatientId: matchingPatient.id, name, village },
                });
              } else {
                results.push({
                  uuid,
                  status: "failed",
                  clientTempId,
                  message: createErr.message || "Failed to create patient record",
                });
              }
            }
          }

          // 3. VISIT / SCREENING
          else if (entity === "visit" || entity === "screening") {
            const rawPatId = payload.patientId;
            let targetPatientId = typeof rawPatId === "number" ? rawPatId : Number(rawPatId);

            if (isNaN(targetPatientId) || targetPatientId <= 0) {
              if (clientTempId && idMap.has(clientTempId)) {
                targetPatientId = idMap.get(clientTempId)!;
              } else if (rawPatId && idMap.has(String(rawPatId))) {
                targetPatientId = idMap.get(String(rawPatId))!;
              } else {
                targetPatientId = 1; // Fallback to demo index patient if unbound
              }
            }

            const visitId = await recordVisitWorkflow({
              patientId: targetPatientId,
              symptoms: payload.symptoms ? String(payload.symptoms) : undefined,
              structuredSymptoms: Array.isArray(payload.structuredSymptoms) ? payload.structuredSymptoms : undefined,
              notes: payload.notes ? String(payload.notes) : undefined,
              diagnosis: payload.diagnosis ? String(payload.diagnosis) : undefined,
              bpSystolic: payload.bpSystolic ? Number(payload.bpSystolic) : undefined,
              bpDiastolic: payload.bpDiastolic ? Number(payload.bpDiastolic) : undefined,
              pulse: payload.pulse ? Number(payload.pulse) : undefined,
              spo2: payload.spo2 ? Number(payload.spo2) : undefined,
              glucose: payload.glucose ? Number(payload.glucose) : undefined,
              temperature: payload.temperature ? Number(payload.temperature) : undefined,
              weight: payload.weight ? Number(payload.weight) : undefined,
              height: payload.height ? Number(payload.height) : undefined,
              bmi: payload.bmi ? Number(payload.bmi) : undefined,
              pregnancyStatus: payload.pregnancyStatus ? String(payload.pregnancyStatus) : undefined,
              existingConditions: payload.existingConditions ? String(payload.existingConditions) : undefined,
            }, ctx.user.id);

            results.push({
              uuid,
              status: "synced",
              serverEntityId: typeof visitId === "number" ? visitId : (visitId as any)?.id || 1,
              clientTempId,
              message: `Screening encounter recorded for patient #${targetPatientId}.`,
            });
          }

          // 4. PRELIMINARY REFERRAL
          else if (entity === "referral") {
            const rawPatId = payload.patientId;
            let targetPatientId = typeof rawPatId === "number" ? rawPatId : Number(rawPatId);

            if (isNaN(targetPatientId) || targetPatientId <= 0) {
              if (rawPatId && idMap.has(String(rawPatId))) {
                targetPatientId = idMap.get(String(rawPatId))!;
              } else {
                targetPatientId = 1;
              }
            }

            const urgencyVal = payload.urgency === "emergency" || payload.urgency === "routine" ? payload.urgency : "urgent";
            const refResult = await createReferralWorkflow({
              patientId: targetPatientId,
              urgency: urgencyVal,
              specialty: payload.specialty ? String(payload.specialty) : "General Medicine",
              targetFacilityId: payload.targetFacilityId ? Number(payload.targetFacilityId) : 1,
              reason: String(payload.reason || "Offline field referral"),
              recommendationScore: payload.recommendationScore ? Number(payload.recommendationScore) : undefined,
              distanceKm: payload.distanceKm ? Number(payload.distanceKm) : undefined,
            }, ctx.user.id, ctx.user.role, ctx.user.name || undefined);

            const refId = refResult?.id || 1;
            results.push({
              uuid,
              status: "synced",
              serverEntityId: refId,
              clientTempId,
              message: `Field referral #${refId} registered and alerted to care team.`,
            });
          }

          // 5. FOLLOW-UP
          else if (entity === "follow_up") {
            const rawPatId = payload.patientId;
            let targetPatientId = typeof rawPatId === "number" ? rawPatId : Number(rawPatId);
            if (isNaN(targetPatientId) || targetPatientId <= 0) {
              if (rawPatId && idMap.has(String(rawPatId))) {
                targetPatientId = idMap.get(String(rawPatId))!;
              } else {
                targetPatientId = 1;
              }
            }

            const followUpRes = await createFollowUpWorkflow({
              patientId: targetPatientId,
              assignedTo: payload.assignedTo ? Number(payload.assignedTo) : ctx.user.id,
              title: String(payload.title || "Offline follow-up visit"),
              dueAt: payload.dueAt ? new Date(String(payload.dueAt)) : new Date(Date.now() + 86400000 * 3),
              notes: payload.notes ? String(payload.notes) : undefined,
              referralId: payload.referralId ? Number(payload.referralId) : undefined,
            }, ctx.user.id);

            const followUpId = followUpRes?.id || 1;
            results.push({
              uuid,
              status: "synced",
              serverEntityId: followUpId,
              clientTempId,
              message: `Follow-up schedule created.`,
            });
          } else {
            results.push({
              uuid,
              status: "failed",
              clientTempId,
              message: `Unknown entity or action type: ${entity || item.type}`,
              error: `Unknown entity or action type: ${entity || item.type}`,
            });
          }
        } catch (itemErr: any) {
          results.push({
            uuid,
            status: "failed",
            clientTempId,
            message: itemErr.message || "Failed to process offline record",
            error: itemErr.message || "Failed to process offline record",
          });
        }
      }

      const totalSuccess = results.filter((r) => r.status === "synced").length;
      const totalConflicts = results.filter((r) => r.status === "conflict").length;
      const totalFailed = results.filter((r) => r.status === "failed").length;

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "offline.sync",
        entityType: "sync",
        detail: `Offline replay completed: ${totalSuccess} synced, ${totalConflicts} conflicts, ${totalFailed} failed out of ${rawItems.length} queued events.`,
      });

      return {
        success: true,
        processedCount: results.length,
        results,
        totalProcessed: results.length,
        totalSuccess,
        totalConflicts,
        totalFailed,
        accepted: totalSuccess, // Legacy compatibility
        syncedAt: new Date(),
      };
    }),
  }),
  demandForecasting: router({
    getFacilityForecasts: protectedProcedure.input(z.object({
      facilityId: z.number().int().positive().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const facilityId = input?.facilityId ?? (ctx.user.facilityId ?? 1);
      return getFacilityDemandForecasts(facilityId);
    }),

    getMedicineForecast: protectedProcedure.input(z.object({
      medicineId: z.number().int().positive(),
      facilityId: z.number().int().positive().optional(),
    })).query(async ({ input, ctx }) => {
      const facilityId = input.facilityId ?? (ctx.user.facilityId ?? 1);
      return getDetailedMedicineForecast(input.medicineId, facilityId);
    }),

    getDistrictForecasts: protectedProcedure.input(z.object({
      district: z.string().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const district = input?.district ?? ctx.user.district ?? "Ahmedabad Rural";
      return getDistrictDemandForecasts(district);
    }),
  }),

  accessibility: router({
    getVillageScores: publicProcedure
      .input(
        z
          .object({
            district: z.string().optional(),
            weights: z
              .object({
                facilityDistanceWeight: z.number().min(0).max(100).optional(),
                doctorAvailabilityWeight: z.number().min(0).max(100).optional(),
                medicineAvailabilityWeight: z.number().min(0).max(100).optional(),
                transportAvailabilityWeight: z.number().min(0).max(100).optional(),
                screeningCoverageWeight: z.number().min(0).max(100).optional(),
                referralCompletionWeight: z.number().min(0).max(100).optional(),
                waitingTimeWeight: z.number().min(0).max(100).optional(),
              })
              .optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const mergedWeights = {
          ...DEFAULT_ACCESSIBILITY_WEIGHTS,
          ...(input?.weights || {}),
        };
        return getDistrictAccessibilityScores(input?.district, mergedWeights);
      }),

    getVillageDetail: publicProcedure
      .input(
        z.object({
          villageId: z.string(),
          weights: z
            .object({
              facilityDistanceWeight: z.number().min(0).max(100).optional(),
              doctorAvailabilityWeight: z.number().min(0).max(100).optional(),
              medicineAvailabilityWeight: z.number().min(0).max(100).optional(),
              transportAvailabilityWeight: z.number().min(0).max(100).optional(),
              screeningCoverageWeight: z.number().min(0).max(100).optional(),
              referralCompletionWeight: z.number().min(0).max(100).optional(),
              waitingTimeWeight: z.number().min(0).max(100).optional(),
            })
            .optional(),
        })
      )
      .query(async ({ input }) => {
        const village = CONFIG_VILLAGES.find(
          (v) =>
            v.id.toLowerCase() === input.villageId.toLowerCase() ||
            v.name.toLowerCase() === input.villageId.toLowerCase()
        );

        if (!village) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Village with ID or name '${input.villageId}' not found in registry.`,
          });
        }

        const mergedWeights = {
          ...DEFAULT_ACCESSIBILITY_WEIGHTS,
          ...(input.weights || {}),
        };

        return calculateVillageScore(village, mergedWeights);
      }),

    getConfiguration: publicProcedure.query(() => {
      return {
        defaultWeights: DEFAULT_ACCESSIBILITY_WEIGHTS,
        disclaimer: PROTOTYPE_METRIC_DISCLAIMER,
        isPrototypeMetric: true,
        formula: {
          name: "7-Factor Weighted Linear Composite Accessibility Index",
          scale: "0 to 100 (higher indicates better accessibility)",
          equation: "Score = SUM(wi * fi) / SUM(wi)",
          factors: [
            { id: "facilityDistanceWeight", name: "Distance to Healthcare Facilities", defaultWeight: 20, description: "Road distance and ambulance drive time to nearest health centers" },
            { id: "doctorAvailabilityWeight", name: "Doctor Availability", defaultWeight: 15, description: "Active on-duty doctor shifts at catchment facilities" },
            { id: "medicineAvailabilityWeight", name: "Medicine Availability", defaultWeight: 15, description: "Essential medicine in-stock ratio at primary facilities" },
            { id: "transportAvailabilityWeight", name: "Transport Availability", defaultWeight: 15, description: "108 ambulance response time and road connectivity" },
            { id: "screeningCoverageWeight", name: "Screening Coverage", defaultWeight: 15, description: "Proportion of target population screened by ASHAs/CHOs" },
            { id: "referralCompletionWeight", name: "Referral Completion", defaultWeight: 10, description: "Rate of referred patients successfully consulted" },
            { id: "waitingTimeWeight", name: "Facility Waiting Time", defaultWeight: 10, description: "Estimated queue wait times at catchment facilities" },
          ],
          riskCategories: [
            { min: 80, max: 100, label: "Optimal Accessibility (Low Vulnerability)", color: "green" },
            { min: 65, max: 79, label: "Moderate Accessibility (Moderate Vulnerability)", color: "blue" },
            { min: 50, max: 64, label: "Sub-optimal Accessibility (High Vulnerability)", color: "amber" },
            { min: 0, max: 49, label: "Critical Deficiency (Critical Vulnerability)", color: "red" },
          ],
        },
      };
    }),
  }),

  districtMap: router({
    getMapData: publicProcedure
      .input(
        z
          .object({
            diseaseCategory: z.string().optional(),
            riskCategory: z.string().optional(),
            dateRange: z.string().optional(),
            villageId: z.string().optional(),
            facilityId: z.number().optional(),
            district: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const userRole = ctx?.user?.role || "public";
        return getDistrictHealthMapData({
          ...(input || {}),
          userRole,
        });
      }),

    getVillageDetail: publicProcedure
      .input(
        z.object({
          villageId: z.string(),
          district: z.string().optional(),
          dateRange: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const userRole = ctx?.user?.role || "public";
        const mapData = await getDistrictHealthMapData({
          villageId: input.villageId,
          district: input.district,
          dateRange: input.dateRange,
          userRole,
        });
        const village = mapData.villages.find(
          (v) =>
            v.id.toLowerCase() === input.villageId.toLowerCase() ||
            v.villageName.toLowerCase() === input.villageId.toLowerCase()
        );
        if (!village) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Village node '${input.villageId}' not found in spatial registry.`,
          });
        }
        return {
          village,
          districtSummary: mapData.summary,
          privacyPolicy: mapData.privacyPolicy,
        };
      }),

    getFilterOptions: publicProcedure
      .input(
        z
          .object({
            district: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return getDistrictMapFilterOptions(input?.district);
      }),
  }),

  admin: router({
    listUsers: adminProcedure
      .input(
        z
          .object({
            role: z.string().optional(),
            status: z.string().optional(),
            district: z.string().optional(),
            facilityId: z.number().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const users = await listUsers(input);
        return { users };
      }),

    approveUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const target = await getUserById(input.userId);
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User account not found." });
        }
        if (target.role === "admin" || target.role === "administrator") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Administrator account is already active." });
        }
        const adminIdent = ctx.user.email || ctx.user.openId || "admin";
        await approveStaffUser(adminIdent, input.userId);

        await dispatchNotification({
          eventType: "account_status",
          recipientId: target.id,
          recipientName: target.name || "Staff Member",
          recipientEmail: target.email || undefined,
          title: "Registration Approved",
          message: "Your healthcare staff registration has been approved. You can now log in to Arjuna.",
          priority: "routine",
        });

        await createAuditEvent({
          actorId: ctx.user.id,
          action: "STAFF_APPROVED",
          entityType: "profile",
          entityId: target.id,
          detail: `Healthcare staff account #${target.id} (${target.name || target.email}) approved by administrator #${ctx.user.id}`,
        });

        return { success: true, message: "Staff account approved successfully." };
      }),

    rejectUser: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          reason: z.string().optional(),
          rejectionReason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const reason = input.rejectionReason || input.reason;
        if (!reason || reason.trim().length < 3) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Rejection reason is required and must be at least 3 characters.",
          });
        }
        const target = await getUserById(input.userId);
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User account not found." });
        }
        if (target.role === "admin" || target.role === "administrator") {
          throw new TRPCError({ code: "FORBIDDEN", message: "The main administrator account cannot be rejected." });
        }
        const adminIdent = ctx.user.email || ctx.user.openId || "admin";
        await rejectStaffUser(adminIdent, input.userId, reason.trim());

        await dispatchNotification({
          eventType: "account_status",
          recipientId: target.id,
          recipientName: target.name || "Staff Member",
          recipientEmail: target.email || undefined,
          title: "Registration Not Approved",
          message: `Your registration request was not approved. Reason: ${reason}`,
          priority: "routine",
        });

        await createAuditEvent({
          actorId: ctx.user.id,
          action: "STAFF_REJECTED",
          entityType: "profile",
          entityId: target.id,
          detail: `Healthcare staff account #${target.id} rejected by admin #${ctx.user.id}. Reason: ${reason}`,
        });

        return { success: true, message: "Staff registration rejected." };
      }),

    suspendUser: adminProcedure
      .input(z.object({ userId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const target = await getUserById(input.userId);
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User account not found." });
        }
        if (target.role === "admin" || target.role === "administrator" || target.id === ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "The main administrator account cannot be suspended." });
        }
        const adminIdent = ctx.user.email || ctx.user.openId || "admin";
        await suspendStaffUser(adminIdent, input.userId);

        await dispatchNotification({
          eventType: "account_status",
          recipientId: target.id,
          recipientName: target.name || "User",
          recipientEmail: target.email || undefined,
          title: "Account Suspended",
          message: `Your Arjuna account has been suspended.${input.reason ? ` Reason: ${input.reason}` : " Please contact the system administrator."}`,
          priority: "high",
        });

        await createAuditEvent({
          actorId: ctx.user.id,
          action: "STAFF_SUSPENDED",
          entityType: "profile",
          entityId: target.id,
          detail: `User account #${target.id} (${target.name || target.email}) suspended by admin #${ctx.user.id}`,
        });

        return { success: true, message: "Account suspended." };
      }),

    reactivateUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const target = await getUserById(input.userId);
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User account not found." });
        }
        const adminIdent = ctx.user.email || ctx.user.openId || "admin";
        await reactivateStaffUser(adminIdent, input.userId);

        await dispatchNotification({
          eventType: "account_status",
          recipientId: target.id,
          recipientName: target.name || "User",
          recipientEmail: target.email || undefined,
          title: "Account Reactivated",
          message: "Your Arjuna account has been reactivated. You can now access your workspace.",
          priority: "routine",
        });

        await createAuditEvent({
          actorId: ctx.user.id,
          action: "STAFF_REACTIVATED",
          entityType: "profile",
          entityId: target.id,
          detail: `User account #${target.id} (${target.name || target.email}) reactivated by admin #${ctx.user.id}`,
        });

        return { success: true, message: "Account reactivated." };
      }),

    resetDemoEnvironment: protectedProcedure
      .input(z.object({ confirmReset: z.boolean().optional() }).optional())
      .mutation(async () => {
        return resetDemoEnvironment();
      }),
    exportSyntheticReport: protectedProcedure.query(async () => {
      return {
        isSynthetic: true,
        heroPatientBaseline: {
          name: "Ramesh Patel",
          expectedRiskScore: "82/100 (Critical Escalation Risk)",
        },
        disclaimer: "Synthetic demonstration data only",
      };
    }),
  }),

  commandCenter: router({
    getExecutiveSummary: protectedProcedure
      .input(
        z
          .object({
            district: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!hasRole(ctx.user.role, "administrator", "facility_staff", "doctor", "admin")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Executive command center metrics are restricted to healthcare administrators and operational directors.",
          });
        }
        const targetDistrict = input?.district || "Nandurbar";
        await createAuditEvent({
          actorId: ctx.user.id,
          action: "administrative.analytics_viewed",
          entityType: "district_command_center",
          detail: `Command center executive summary viewed for district: ${targetDistrict}`,
        });
        return getDistrictCommandCenterData(targetDistrict);
      }),
  }),
});

export type AppRouter = typeof appRouter;
