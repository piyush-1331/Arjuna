import type { InsertUser } from "../drizzle/schema";
import { isSupabaseConfigured, supabaseAdmin } from "./supabase";

const client = () => {
  if (!supabaseAdmin) throw new Error("Supabase server client is not configured");
  return supabaseAdmin;
};
const date = (value: unknown) => (value ? new Date(String(value)) : value);
const dateOrNull = (value: unknown) => (value ? new Date(String(value)) : null);
const unwrap = <T = any>(result: any): T => {
  if (result && result.error) throw new Error(result.error.message || String(result.error));
  return (result?.data ?? result) as T;
};
const many = <T = any>(rows: any): T[] => {
  if (Array.isArray(rows)) return rows as T[];
  if (rows && Array.isArray(rows.data)) return rows.data as T[];
  return (rows ?? []) as T[];
};

export function mapUser(row: any, meta?: any) {
  if (!row) return undefined;
  const m = meta || {};
  return {
    id: Number(row.id),
    openId: row.open_id || row.auth_id || String(row.id),
    authId: row.auth_id || row.open_id,
    name: row.name ?? m.full_name ?? m.name ?? null,
    email: row.email ?? m.email ?? null,
    loginMethod: row.login_method ?? m.login_method ?? null,
    role: row.role || m.selected_role || "citizen",
    status: (row.status || "APPROVED").toUpperCase(),
    phone: row.phone ?? m.phone ?? null,
    dateOfBirth: row.date_of_birth ?? m.date_of_birth ?? null,
    age: (row.age != null ? Number(row.age) : null) ?? (m.age != null ? Number(m.age) : null),
    gender: row.gender ?? m.gender ?? null,
    village: row.village ?? m.village ?? null,
    district: row.district ?? m.district ?? null,
    facilityId: row.facility_id == null ? null : Number(row.facility_id),
    facilityName: row.facility_name ?? m.facility_name ?? null,
    designation: row.designation ?? m.designation ?? null,
    employeeId: row.employee_id ?? m.employee_id ?? null,
    registrationNumber: row.registration_number ?? m.registration_number ?? null,
    assignedVillage: row.assigned_village ?? m.assigned_village ?? null,
    emergencyContactName: row.emergency_contact_name ?? m.emergency_contact_name ?? null,
    emergencyContactPhone: row.emergency_contact_phone ?? m.emergency_contact_phone ?? null,
    bloodGroup: row.blood_group ?? m.blood_group ?? null,
    allergies: row.allergies ?? m.allergies ?? null,
    conditions: row.conditions ?? m.conditions ?? null,
    address: row.address ?? m.address ?? null,
    pincode: row.pincode ?? m.pincode ?? null,
    abhaId: row.abha_id ?? m.abha_id ?? null,
    avatarUrl: row.avatar_url ?? m.avatar_url ?? null,
    approvalRequestedAt: dateOrNull(row.approval_requested_at),
    approvedAt: dateOrNull(row.approved_at),
    approvedBy: row.approved_by,
    rejectionReason: row.rejection_reason,
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
    lastSignedIn: date(row.last_signed_in),
  } as any;
}

function mapFacility(row: any) { return row ? { ...row, id: Number(row.id), facilityType: row.facility_type, createdAt: date(row.created_at) } : undefined; }
function mapHousehold(row: any) { return row ? { ...row, id: Number(row.id), headName: row.head_name, assignedWorkerId: row.assigned_worker_id == null ? null : Number(row.assigned_worker_id), createdAt: date(row.created_at) } : undefined; }
export function mapSupabasePatient(row: any) {
  return row ? {
    ...row,
    id: Number(row.id),
    userId: row.user_id == null ? null : Number(row.user_id),
    householdId: row.household_id == null ? null : Number(row.household_id),
    emergencyContact: row.emergency_contact,
    bloodGroup: row.blood_group,
    riskScore: Number(row.risk_score ?? 0),
    riskCategory: row.risk_category || "low",
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  } : undefined;
}
const mapPatient = mapSupabasePatient;
function mapVisit(row: any) {
  if (!row) return undefined;
  return {
    ...row,
    id: Number(row.id),
    patientId: Number(row.patient_id),
    recordedBy: Number(row.recorded_by),
    facilityId: row.facility_id == null ? null : Number(row.facility_id),
    symptoms: row.symptoms,
    structuredSymptoms: row.structured_symptoms,
    notes: row.notes,
    diagnosis: row.diagnosis,
    bpSystolic: row.bp_systolic == null ? null : Number(row.bp_systolic),
    bpDiastolic: row.bp_diastolic == null ? null : Number(row.bp_diastolic),
    pulse: row.pulse == null ? null : Number(row.pulse),
    spo2: row.spo2 == null ? null : Number(row.spo2),
    glucose: row.glucose == null ? null : Number(row.glucose),
    temperature: row.temperature == null ? null : Number(row.temperature),
    weight: row.weight == null ? null : Number(row.weight),
    height: row.height == null ? null : Number(row.height),
    bmi: row.bmi == null ? null : Number(row.bmi),
    pregnancyStatus: row.pregnancy_status,
    existingConditions: row.existing_conditions,
    triageLevel: row.triage_level,
    riskScore: row.risk_score == null ? null : Number(row.risk_score),
    riskCategory: row.risk_category,
    recommendedAction: row.recommended_action,
    aiSummary: row.ai_summary,
    createdAt: date(row.created_at),
  };
}
function mapReferral(row: any) { return row ? { ...row, id: Number(row.id), patientId: Number(row.patient_id), createdBy: Number(row.created_by), targetFacilityId: row.target_facility_id == null ? null : Number(row.target_facility_id), createdAt: date(row.created_at), updatedAt: date(row.updated_at) } : undefined; }
function mapFollowUp(row: any) { return row ? { ...row, id: Number(row.id), patientId: Number(row.patient_id), assignedTo: Number(row.assigned_to), dueAt: date(row.due_at), completedAt: dateOrNull(row.completed_at), createdAt: date(row.created_at) } : undefined; }
function mapMedicine(row: any) { return row ? { ...row, id: Number(row.id), facilityId: Number(row.facility_id), currentStock: Number(row.current_stock), reorderLevel: Number(row.reorder_level), updatedAt: date(row.updated_at) } : undefined; }
function mapAlert(row: any) { return row ? { ...row, id: Number(row.id), userId: Number(row.user_id), patientId: row.patient_id == null ? null : Number(row.patient_id), readAt: dateOrNull(row.read_at), createdAt: date(row.created_at) } : undefined; }

async function insertId(table: string, input: Record<string, unknown>) {
  const row = unwrap(await client().from(table).insert(insertPayload(input)).select("id").single()) as { id?: number } | null;
  if (!row?.id) throw new Error(`Supabase insert into ${table} did not return an id`);
  return Number(row.id);
}

export function toSupabaseInsertPayload(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => {
    const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    return [snake, value instanceof Date ? value.toISOString() : value];
  }));
}

function insertPayload(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => {
    const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    return [snake, value instanceof Date ? value.toISOString() : value];
  }));
}

export function isSupabaseDataConfigured() { return isSupabaseConfigured; }

export async function upsertUser(user: Record<string, any>): Promise<void> {
  let existing: any = null;
  try {
    const existingRes = await client().from("profiles").select("*").eq("open_id", user.openId).maybeSingle();
    existing = existingRes.data;
  } catch {
    existing = null;
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const isAdminEmail = adminEmail && (user.email?.toLowerCase() === adminEmail || existing?.email?.toLowerCase() === adminEmail);
  
  // Enforce role and status defaults
  let targetRole = user.role ?? existing?.role;
  if (isAdminEmail || targetRole === "admin") {
    targetRole = "administrator";
  } else if (!targetRole) {
    targetRole = "citizen";
  }

  let targetStatus = user.status ?? existing?.status;
  if (isAdminEmail || targetRole === "citizen") {
    targetStatus = targetStatus || "APPROVED";
  } else if (!targetStatus) {
    targetStatus = "PENDING";
  }

  const fullPayload = insertPayload({
    openId: user.openId,
    authId: user.authId || user.openId,
    name: user.name !== undefined ? user.name : (existing?.name ?? null),
    email: user.email !== undefined ? user.email : (existing?.email ?? null),
    loginMethod: user.loginMethod !== undefined ? user.loginMethod : (existing?.login_method ?? null),
    role: targetRole,
    status: targetStatus,
    phone: user.phone !== undefined ? user.phone : (existing?.phone ?? null),
    dateOfBirth: user.dateOfBirth !== undefined ? user.dateOfBirth : (existing?.date_of_birth ?? null),
    age: user.age !== undefined ? user.age : (existing?.age ?? null),
    gender: user.gender !== undefined ? user.gender : (existing?.gender ?? null),
    village: user.village !== undefined ? user.village : (existing?.village ?? null),
    district: user.district !== undefined ? user.district : (existing?.district ?? null),
    facilityId: user.facilityId !== undefined ? user.facilityId : (existing?.facility_id ?? null),
    facilityName: user.facilityName !== undefined ? user.facilityName : (existing?.facility_name ?? null),
    designation: user.designation !== undefined ? user.designation : (existing?.designation ?? null),
    employeeId: user.employeeId !== undefined ? user.employeeId : (existing?.employee_id ?? null),
    registrationNumber: user.registrationNumber !== undefined ? user.registrationNumber : (existing?.registration_number ?? null),
    assignedVillage: user.assignedVillage !== undefined ? user.assignedVillage : (existing?.assigned_village ?? null),
    emergencyContactName: user.emergencyContactName !== undefined ? user.emergencyContactName : (existing?.emergency_contact_name ?? null),
    emergencyContactPhone: user.emergencyContactPhone !== undefined ? user.emergencyContactPhone : (existing?.emergency_contact_phone ?? null),
    bloodGroup: user.bloodGroup !== undefined ? user.bloodGroup : (existing?.blood_group ?? null),
    allergies: user.allergies !== undefined ? user.allergies : (existing?.allergies ?? null),
    conditions: user.conditions !== undefined ? user.conditions : (existing?.conditions ?? null),
    address: user.address !== undefined ? user.address : (existing?.address ?? null),
    pincode: user.pincode !== undefined ? user.pincode : (existing?.pincode ?? null),
    abhaId: user.abhaId !== undefined ? user.abhaId : (existing?.abha_id ?? null),
    avatarUrl: user.avatarUrl !== undefined ? user.avatarUrl : (existing?.avatar_url ?? null),
    approvalRequestedAt: user.approvalRequestedAt !== undefined ? user.approvalRequestedAt : (existing?.approval_requested_at ?? (targetStatus === "PENDING" ? new Date() : null)),
    approvedAt: user.approvedAt !== undefined ? user.approvedAt : (existing?.approved_at ?? (targetStatus === "APPROVED" ? new Date() : null)),
    approvedBy: user.approvedBy !== undefined ? user.approvedBy : (existing?.approved_by ?? null),
    rejectionReason: user.rejectionReason !== undefined ? user.rejectionReason : (existing?.rejection_reason ?? null),
    lastSignedIn: user.lastSignedIn ?? new Date(),
  });

  const { error } = await client().from("profiles").upsert(fullPayload, { onConflict: "open_id" });
  if (error) {
    if (error.message.includes("does not exist") || (error as any).code === "PGRST204" || (error as any).code === "42703") {
      const corePayload = insertPayload({
        openId: user.openId,
        authId: user.authId || user.openId,
        name: user.name !== undefined ? user.name : (existing?.name ?? null),
        email: user.email !== undefined ? user.email : (existing?.email ?? null),
        loginMethod: user.loginMethod !== undefined ? user.loginMethod : (existing?.login_method ?? null),
        role: targetRole,
        district: user.district !== undefined ? user.district : (existing?.district ?? null),
        facilityId: user.facilityId !== undefined ? user.facilityId : (existing?.facility_id ?? null),
        lastSignedIn: user.lastSignedIn ?? new Date(),
      });
      const retryRes = await client().from("profiles").upsert(corePayload, { onConflict: "open_id" });
      if (retryRes.error) throw new Error(retryRes.error.message);
      return;
    }
    throw new Error(error.message);
  }
}

export async function updateUserRole(userId: number, role: string) {
  const { error } = await client().from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function getUserByOpenId(openId: string, preloadedMeta?: any) {
  const row = unwrap(await client().from("profiles").select("*").eq("open_id", openId).maybeSingle());
  if (!row) return undefined;
  let meta = preloadedMeta;
  if (!meta && supabaseAdmin && (row.auth_id || row.open_id)) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(row.auth_id || row.open_id);
      if (authUser?.user?.user_metadata) {
        meta = authUser.user.user_metadata;
      }
    } catch {
      // Ignore
    }
  }
  return mapUser(row, meta);
}

export async function getUserById(id: number) {
  const row = unwrap(await client().from("profiles").select("*").eq("id", id).maybeSingle());
  if (!row) return undefined;
  let meta: any = null;
  const authId = row.auth_id || row.open_id;
  if (authId && supabaseAdmin) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(authId);
      if (authUser?.user?.user_metadata) {
        meta = authUser.user.user_metadata;
      }
    } catch {
      // Ignore if auth lookup fails
    }
  }
  return mapUser(row, meta);
}

export async function listUsers(filter?: { role?: string; status?: string; district?: string; facilityId?: number; search?: string }) {
  let query = client().from("profiles").select("*").order("created_at", { ascending: false });
  if (filter?.role && filter.role !== "all") query = query.eq("role", filter.role);
  if (filter?.district && filter.district !== "all") query = query.eq("district", filter.district);
  if (filter?.facilityId) query = query.eq("facility_id", filter.facilityId);
  const rows = many(unwrap(await query));

  const metaMap = new Map<string, any>();
  if (supabaseAdmin) {
    try {
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
      if (authList?.users) {
        for (const u of authList.users) {
          if (u.id && u.user_metadata) {
            metaMap.set(u.id, u.user_metadata);
          }
        }
      }
    } catch {
      // Ignore auth list failure
    }
  }

  let result = rows.map((r) => mapUser(r, metaMap.get(r.auth_id || r.open_id)));
  if (filter?.status && filter.status !== "all") {
    result = result.filter(u => (u.status || "APPROVED").toUpperCase() === filter.status?.toUpperCase());
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    result = result.filter(u => 
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.employeeId?.toLowerCase().includes(q) ||
      u.registrationNumber?.toLowerCase().includes(q)
    );
  }
  return result;
}

export async function approveStaffUser(adminIdentifier: string, userId: number) {
  const now = new Date().toISOString();
  const { error } = await client().from("profiles").update({
    status: "APPROVED",
    approved_at: now,
    approved_by: adminIdentifier,
    rejection_reason: null,
    updated_at: now,
  }).eq("id", userId);
  if (error) {
    if (error.message.includes("does not exist")) {
      await client().from("profiles").update({ updated_at: now }).eq("id", userId);
      return;
    }
    throw new Error(error.message);
  }
}

export async function rejectStaffUser(adminIdentifier: string, userId: number, reason: string) {
  const now = new Date().toISOString();
  const { error } = await client().from("profiles").update({
    status: "REJECTED",
    rejection_reason: reason,
    approved_by: adminIdentifier,
    updated_at: now,
  }).eq("id", userId);
  if (error) {
    if (error.message.includes("does not exist")) {
      await client().from("profiles").update({ updated_at: now }).eq("id", userId);
      return;
    }
    throw new Error(error.message);
  }
}

export async function suspendStaffUser(adminIdentifier: string, userId: number) {
  const now = new Date().toISOString();
  const { error } = await client().from("profiles").update({
    status: "SUSPENDED",
    updated_at: now,
  }).eq("id", userId);
  if (error) {
    if (error.message.includes("does not exist")) {
      await client().from("profiles").update({ updated_at: now }).eq("id", userId);
      return;
    }
    throw new Error(error.message);
  }
}

export async function reactivateStaffUser(adminIdentifier: string, userId: number) {
  const now = new Date().toISOString();
  const { error } = await client().from("profiles").update({
    status: "APPROVED",
    updated_at: now,
  }).eq("id", userId);
  if (error) {
    if (error.message.includes("does not exist")) {
      await client().from("profiles").update({ updated_at: now }).eq("id", userId);
      return;
    }
    throw new Error(error.message);
  }
}

export async function updateUserProfile(userId: number, editableFields: Record<string, unknown>) {
  // Fetch existing profile to retrieve auth_id / open_id
  const currentProfile = unwrap(await client().from("profiles").select("*").eq("id", userId).maybeSingle());
  if (!currentProfile) throw new Error("Profile not found");

  const authId = currentProfile.auth_id || currentProfile.open_id;

  // Build metadata update for Supabase Auth (supports all fields seamlessly)
  const metadataUpdate: Record<string, unknown> = {};
  if (editableFields.name !== undefined) {
    metadataUpdate.name = editableFields.name;
    metadataUpdate.full_name = editableFields.name;
  }
  if (editableFields.phone !== undefined) metadataUpdate.phone = editableFields.phone;
  if (editableFields.dateOfBirth !== undefined) metadataUpdate.date_of_birth = editableFields.dateOfBirth;
  if (editableFields.age !== undefined) metadataUpdate.age = editableFields.age;
  if (editableFields.gender !== undefined) metadataUpdate.gender = editableFields.gender;
  if (editableFields.village !== undefined) metadataUpdate.village = editableFields.village;
  if (editableFields.district !== undefined) metadataUpdate.district = editableFields.district;
  if (editableFields.emergencyContactName !== undefined) metadataUpdate.emergency_contact_name = editableFields.emergencyContactName;
  if (editableFields.emergencyContactPhone !== undefined) metadataUpdate.emergency_contact_phone = editableFields.emergencyContactPhone;
  if (editableFields.bloodGroup !== undefined) metadataUpdate.blood_group = editableFields.bloodGroup;
  if (editableFields.allergies !== undefined) metadataUpdate.allergies = editableFields.allergies;
  if (editableFields.conditions !== undefined) metadataUpdate.conditions = editableFields.conditions;
  if (editableFields.address !== undefined) metadataUpdate.address = editableFields.address;
  if (editableFields.pincode !== undefined) metadataUpdate.pincode = editableFields.pincode;
  if (editableFields.abhaId !== undefined) metadataUpdate.abha_id = editableFields.abhaId;
  if (editableFields.avatarUrl !== undefined) metadataUpdate.avatar_url = editableFields.avatarUrl;

  // 1. Persist to Supabase Auth user_metadata (guaranteed to persist regardless of table schema)
  if (authId && supabaseAdmin) {
    try {
      const { data: currentAuth } = await supabaseAdmin.auth.admin.getUserById(authId);
      const existingMeta = currentAuth?.user?.user_metadata || {};
      const mergedMeta = { ...existingMeta, ...metadataUpdate };
      await supabaseAdmin.auth.admin.updateUserById(authId, {
        user_metadata: mergedMeta,
      });
    } catch (metaErr) {
      console.warn("[Supabase] Auth user_metadata sync warning:", metaErr);
    }
  }

  // 2. Persist to Supabase profiles PostgreSQL table
  const forbidden = ["role", "status", "approved_by", "approved_at", "rejection_reason", "employee_id", "registration_number", "facility_id", "open_id", "auth_id", "id"];
  const safePayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(editableFields)) {
    const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (!forbidden.includes(snake)) {
      safePayload[snake] = value;
    }
  }
  safePayload.updated_at = new Date().toISOString();

  const { error } = await client().from("profiles").update(safePayload).eq("id", userId);
  if (error) {
    // If PostgreSQL table lacks custom columns, update standard base columns that exist
    const baseColumns = ["name", "district", "updated_at"];
    const fallbackPayload: Record<string, unknown> = { updated_at: safePayload.updated_at };
    for (const col of baseColumns) {
      if (safePayload[col] !== undefined) fallbackPayload[col] = safePayload[col];
    }
    try {
      await client().from("profiles").update(fallbackPayload).eq("id", userId);
    } catch (retryErr) {
      console.warn("[Supabase] Fallback profile table update warning:", retryErr);
    }
  }

  // 3. Sync to patients table if user has a corresponding citizen patient profile
  try {
    const patientUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (editableFields.name !== undefined) patientUpdate.name = editableFields.name;
    if (editableFields.age !== undefined) patientUpdate.age = Number(editableFields.age) || null;
    if (editableFields.gender !== undefined) patientUpdate.gender = editableFields.gender;
    if (editableFields.phone !== undefined) patientUpdate.contact = editableFields.phone;
    if (editableFields.village !== undefined) patientUpdate.village = editableFields.village;
    if (editableFields.district !== undefined) patientUpdate.district = editableFields.district;
    if (editableFields.emergencyContactPhone !== undefined || editableFields.emergencyContactName !== undefined) {
      patientUpdate.emergency_contact = (editableFields.emergencyContactPhone as string) || (editableFields.emergencyContactName as string);
    }
    if (editableFields.bloodGroup !== undefined) patientUpdate.blood_group = editableFields.bloodGroup;
    if (editableFields.allergies !== undefined) patientUpdate.allergies = editableFields.allergies;
    if (editableFields.conditions !== undefined) patientUpdate.conditions = editableFields.conditions;

    await client().from("patients").update(patientUpdate).eq("user_id", userId);
  } catch (syncErr) {
    console.warn("[Supabase] Optional patient record sync skipped:", syncErr);
  }

  return getUserById(userId);
}

export async function getPatients(limit = 50) { return many(unwrap(await client().from("patients").select("*").order("updated_at", { ascending: false }).limit(limit))).map(mapPatient); }
export async function getPatientsForUser(userId: number, role: string, limit = 50) { const query = client().from("patients").select("*").order("updated_at", { ascending: false }).limit(limit); const result = ["asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"].includes(role) ? await query : await query.eq("user_id", userId); return many(unwrap(result)).map(mapPatient); }

export async function markOverdueFollowUps() {
  const now = new Date().toISOString();
  const overdue = many(unwrap(await client().from("follow_ups").select("*").eq("status", "open").lt("due_at", now)));
  for (const item of overdue) {
    unwrap(await client().from("follow_ups").update({ status: "overdue" }).eq("id", item.id));
    unwrap(await client().from("alerts").insert({ user_id: item.assigned_to, patient_id: item.patient_id, kind: "overdue_follow_up", title: "Follow-up is overdue", message: item.title }));
  }
  return overdue.length;
}

export async function getHouseholds() {
  const list = many(unwrap(await client().from("households").select("*").order("created_at", { ascending: false }))).map(mapHousehold);
  const allPatients = await getPatients(200);
  return list.map(h => ({
    ...h,
    members: allPatients.filter(p => p.householdId === h?.id),
  }));
}
export async function getHouseholdById(id: number) {
  const h = mapHousehold(unwrap(await client().from("households").select("*").eq("id", id).maybeSingle()));
  if (!h) return undefined;
  const allPatients = await getPatients(200);
  return {
    ...h,
    members: allPatients.filter(p => p.householdId === id),
  };
}
export async function createHousehold(input: Record<string, unknown>) { return insertId("households", input); }
export async function getPatientById(id: number) { return mapPatient(unwrap(await client().from("patients").select("*").eq("id", id).maybeSingle())); }

export async function updatePatient(id: number, input: Record<string, unknown>) {
  unwrap(await client().from("patients").update(insertPayload({ ...input, updatedAt: new Date() })).eq("id", id));
  return { success: true };
}

export async function getPatientTimeline(patientId: number) {
  const [v, r, f] = await Promise.all([
    client().from("health_visits").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
    client().from("referrals").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
    client().from("follow_ups").select("*").eq("patient_id", patientId).order("due_at", { ascending: false }),
  ]);
  return { visits: many(unwrap(v)).map(mapVisit), consultations: [], referrals: many(unwrap(r)).map(mapReferral), followUps: many(unwrap(f)).map(mapFollowUp) };
}

export async function getFacilities(district?: string) { const query = client().from("facilities").select("*").order("name"); const result = district ? await query.eq("district", district) : await query; return many(unwrap(result)).map(mapFacility); }
export async function getInventory(facilityId?: number) { const query = client().from("medicines").select("*").order("name"); const result = facilityId ? await query.eq("facility_id", facilityId) : await query; return many(unwrap(result)).map(mapMedicine); }
export async function getAlerts(userId?: number) { const query = client().from("alerts").select("*").order("created_at", { ascending: false }).limit(30); const result = userId ? await query.eq("user_id", userId) : await query; return many(unwrap(result)).map(mapAlert); }

export async function getDashboardMetrics(district?: string) {
  const [p, r, f, m, facilities] = await Promise.all([
    client().from("patients").select("id,risk_category,district").limit(1000),
    client().from("referrals").select("id,status").limit(1000),
    client().from("follow_ups").select("id,status,due_at").limit(1000),
    client().from("medicines").select("id,current_stock,reorder_level").limit(1000),
    client().from("facilities").select("id,district").limit(1000),
  ]);
  const patients: any[] = many(unwrap(p)).filter((row: any) => !district || row.district === district);
  const facilityRows: any[] = many(unwrap(facilities)).filter((row: any) => !district || row.district === district);
  const referralRows: any[] = many(unwrap(r));
  const followUps: any[] = many(unwrap(f));
  const medicines: any[] = many(unwrap(m));
  return {
    patients: patients.length,
    highRisk: patients.filter((row: any) => ["high", "critical"].includes(row.risk_category)).length,
    referrals: referralRows.filter((row: any) => !["completed", "cancelled"].includes(row.status)).length,
    openFollowUps: followUps.filter((row: any) => row.status === "open").length,
    overdueFollowUps: followUps.filter((row: any) => row.status === "overdue" || (row.status === "open" && new Date(row.due_at) < new Date())).length,
    lowStock: medicines.filter((row: any) => Number(row.current_stock) <= Number(row.reorder_level)).length,
    facilities: facilityRows.length,
  };
}

export async function createAlert(input: Record<string, unknown>) { return insertId("alerts", input); }
export async function createAuditEvent(input: Record<string, unknown>) { unwrap(await client().from("audit_events").insert(insertPayload(input))); }
export async function createPatient(input: Record<string, unknown>) { return insertId("patients", input); }
export async function createVisit(input: Record<string, unknown>) { return insertId("health_visits", input); }
export async function createReferral(input: Record<string, unknown>) { return insertId("referrals", input); }
export async function getReferrals(patientId?: number) {
  const query = client().from("referrals").select("*").order("created_at", { ascending: false });
  const result = patientId ? await query.eq("patient_id", patientId) : await query;
  return many<any>(unwrap(result)).map(mapReferral);
}
export async function getVisits(patientId?: number) {
  const query = client().from("health_visits").select("*").order("created_at", { ascending: false });
  const result = patientId ? await query.eq("patient_id", patientId) : await query;
  return many<any>(unwrap(result)).map(mapVisit);
}
export async function getReferralById(id: number) { return mapReferral(unwrap(await client().from("referrals").select("*").eq("id", id).maybeSingle())); }
export async function updateReferral(id: number, values: Record<string, unknown>) { unwrap(await client().from("referrals").update(insertPayload(values)).eq("id", id)); }
export async function createFollowUp(input: Record<string, unknown>) { return insertId("follow_ups", input); }
export async function getFollowUpById(id: number) { return mapFollowUp(unwrap(await client().from("follow_ups").select("*").eq("id", id).maybeSingle())); }
export async function completeFollowUp(input: number | { id: number; completedBy?: number; completionNotes?: string; vitals?: Record<string, unknown> }) {
  const id = typeof input === "number" ? input : input.id;
  const completedBy = typeof input === "number" ? null : (input.completedBy ?? null);
  const completionNotes = typeof input === "number" ? null : (input.completionNotes ?? null);
  unwrap(await client().from("follow_ups").update({
    status: "COMPLETED",
    completed_at: new Date().toISOString(),
    completed_by: completedBy,
    completion_notes: completionNotes,
  }).eq("id", id));
}
export async function cancelFollowUp(id: number, cancellationReason: string) {
  unwrap(await client().from("follow_ups").update({
    status: "CANCELLED",
    cancelled_at: new Date().toISOString(),
    cancellation_reason: cancellationReason,
  }).eq("id", id));
}
export async function updateMedicine(id: number, currentStock: number) { unwrap(await client().from("medicines").update({ current_stock: currentStock, updated_at: new Date().toISOString() }).eq("id", id)); }

export async function seedDemoData() {
  const count: any[] = many(unwrap(await client().from("patients").select("id").limit(1)));
  if (count.length) return;
  const facility = await insertId("facilities", { name: "Sundarpur Primary Health Centre", facility_type: "phc", district: "Ahmedabad Rural", village: "Sundarpur", address: "Main Road, Sundarpur", phone: "+91 79 2456 1020", capabilities: "General medicine, maternal care, diagnostics" });
  const household = await insertId("households", { head_name: "Meena Patel", village: "Sundarpur", district: "Ahmedabad Rural", contact: "+91 98 2211 4400" });
  unwrap(await client().from("patients").insert([
    { name: "Meena Patel", age: 56, gender: "female", contact: "+91 98 2211 4400", village: "Sundarpur", district: "Ahmedabad Rural", household_id: household, blood_group: "B+", conditions: "Hypertension", risk_score: 78, risk_category: "high" },
    { name: "Rakesh Patel", age: 34, gender: "male", contact: "+91 98 2211 4401", village: "Sundarpur", district: "Ahmedabad Rural", household_id: household, risk_score: 22, risk_category: "low" },
    { name: "Asha Devi", age: 68, gender: "female", contact: "+91 98 2211 4402", village: "Rampura", district: "Ahmedabad Rural", conditions: "Diabetes, arthritis", risk_score: 91, risk_category: "critical" },
  ]));
  unwrap(await client().from("medicines").insert([
    { facility_id: facility, name: "Amlodipine 5mg", category: "Hypertension", current_stock: 24, reorder_level: 30, unit: "strips" },
    { facility_id: facility, name: "ORS sachets", category: "Essential", current_stock: 118, reorder_level: 50, unit: "packs" },
    { facility_id: facility, name: "Metformin 500mg", category: "Diabetes", current_stock: 42, reorder_level: 40, unit: "strips" },
  ]));
}
