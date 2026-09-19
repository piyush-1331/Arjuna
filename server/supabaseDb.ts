import type { InsertUser } from "../drizzle/schema";
import { isSupabaseConfigured, supabaseAdmin } from "./supabase";
import { createHash, randomUUID } from "crypto";

export function toValidUuid(val: string | null | undefined): string {
  if (!val) return randomUUID();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const looseUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(val) || looseUuidRegex.test(val)) {
    return val;
  }
  const hash = createHash("md5").update(val).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function isMissingColumnError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  const code = (error.code || "").toString();
  return (
    code === "PGRST204" ||
    code === "42703" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the") ||
    msg.includes("column")
  );
}

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
  const rawRole = String(row.role || m.selected_role || m.role || "citizen").toLowerCase();
  const allowedRole = ["citizen", "asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"].includes(rawRole)
    ? rawRole
    : "citizen";
  const isStaff = ["doctor", "asha", "cho", "asha_cho", "facility_staff"].includes(allowedRole);

  let rawStatus = row.status || m.status;
  if (!rawStatus) {
    rawStatus = isStaff ? "PENDING" : "APPROVED";
  }
  const status = String(rawStatus).toUpperCase();

  const district =
    row.district ||
    m.district ||
    null;

  return {
    id: Number(row.id || (row.open_id ? Math.abs(row.open_id.split("").reduce((acc: number, c: string) => (acc << 5) - acc + c.charCodeAt(0), 0)) % 100000 : 1)),
    openId: row.open_id || row.auth_id || String(row.id),
    authId: row.auth_id || row.open_id,
    name: row.name || m.full_name || m.name || (row.email ? row.email.split("@")[0] : "Care Member"),
    email: row.email || m.email || null,
    loginMethod: row.login_method || m.login_method || "supabase",
    role: allowedRole,
    status,
    phone: row.phone || m.phone || null,
    dateOfBirth: row.date_of_birth || m.date_of_birth || null,
    age: (row.age != null && !isNaN(Number(row.age)) ? Number(row.age) : null) ?? (m.age != null && !isNaN(Number(m.age)) ? Number(m.age) : null),
    gender: row.gender || m.gender || null,
    village: row.village || m.village || null,
    district,
    facilityId: row.facility_id == null ? null : Number(row.facility_id),
    facilityName: row.facility_name || m.facility_name || null,
    designation: row.designation || m.designation || null,
    employeeId: row.employee_id || m.employee_id || null,
    registrationNumber: row.registration_number || m.registration_number || null,
    assignedVillage: row.assigned_village || m.assigned_village || null,
    emergencyContactName: row.emergency_contact_name || m.emergency_contact_name || null,
    emergencyContactPhone: row.emergency_contact_phone || m.emergency_contact_phone || null,
    bloodGroup: row.blood_group || m.blood_group || null,
    allergies: row.allergies || m.allergies || null,
    conditions: row.conditions || m.conditions || null,
    address: row.address || m.address || null,
    pincode: row.pincode || m.pincode || null,
    abhaId: row.abha_id || m.abha_id || null,
    avatarUrl: row.avatar_url || m.avatar_url || null,
    approvalRequestedAt: dateOrNull(row.approval_requested_at || row.approvalRequestedAt),
    approvedAt: dateOrNull(row.approved_at || row.approvedAt),
    approvedBy: row.approved_by || row.approvedBy,
    rejectionReason: row.rejection_reason || row.rejectionReason,
    createdAt: date(row.created_at || row.createdAt),
    updatedAt: date(row.updated_at || row.updatedAt),
    lastSignedIn: date(row.last_signed_in || row.lastSignedIn),
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
function mapAppointment(row: any) {
  if (!row) return undefined;
  return {
    ...row,
    id: Number(row.id),
    patientId: Number(row.patient_id),
    doctorId: row.doctor_id == null ? null : Number(row.doctor_id),
    facilityId: row.facility_id == null ? null : Number(row.facility_id),
    scheduledAt: date(row.scheduled_at),
    type: row.type || "general_opd",
    status: row.status || "scheduled",
    notes: row.notes,
    createdAt: date(row.created_at),
  };
}

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
  const safeOpenId = toValidUuid(user.openId);
  const safeAuthId = toValidUuid(user.authId || user.openId);

  let existing: any = null;
  try {
    const existingRes = await client().from("profiles").select("*").eq("open_id", safeOpenId).maybeSingle();
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

  // Also sync to Supabase Auth user metadata if supabaseAdmin is configured
  if (supabaseAdmin && (user.authId || user.openId)) {
    try {
      const rawId = user.authId || user.openId;
      await supabaseAdmin.auth.admin.updateUserById(rawId, {
        user_metadata: {
          role: targetRole,
          selected_role: targetRole,
          status: targetStatus,
          district: user.district || existing?.district,
          name: user.name || existing?.name,
          phone: user.phone || existing?.phone,
        }
      });
    } catch {
      // Ignore if auth user doesn't exist
    }
  }

  const fullPayload = insertPayload({
    openId: safeOpenId,
    authId: safeAuthId,
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
    if (isMissingColumnError(error)) {
      const corePayload = insertPayload({
        openId: safeOpenId,
        authId: safeAuthId,
        name: user.name !== undefined ? user.name : (existing?.name ?? null),
        email: user.email !== undefined ? user.email : (existing?.email ?? null),
        loginMethod: user.loginMethod !== undefined ? user.loginMethod : (existing?.login_method ?? null),
        role: targetRole,
        district: user.district !== undefined ? user.district : (existing?.district ?? null),
        facilityId: user.facilityId !== undefined ? user.facilityId : (existing?.facility_id ?? null),
        lastSignedIn: user.lastSignedIn ?? new Date(),
      });
      const retryRes = await client().from("profiles").upsert(corePayload, { onConflict: "open_id" });
      if (retryRes.error) {
        if (isMissingColumnError(retryRes.error)) {
          await client().from("profiles").upsert({
            open_id: safeOpenId,
            name: user.name || "Care Member",
            updated_at: new Date().toISOString(),
          }, { onConflict: "open_id" });
          return;
        }
        throw new Error(retryRes.error.message);
      }
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
  const safeOpenId = toValidUuid(openId);
  try {
    const rowRes = await client().from("profiles").select("*").eq("open_id", safeOpenId).maybeSingle();
    let row = rowRes.data;
    if (!row && safeOpenId !== openId) {
      const altRes = await client().from("profiles").select("*").eq("open_id", openId).maybeSingle();
      row = altRes.data;
    }
    if (row) {
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
  } catch (err) {
    console.warn("[Supabase] getUserByOpenId query warning:", err);
  }

  // If not found in profiles table, check Supabase Auth directly
  if (supabaseAdmin) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(openId);
      if (authUser?.user) {
        const u = authUser.user;
        const meta = preloadedMeta || u.user_metadata || {};
        return mapUser({
          id: 1,
          open_id: u.id,
          auth_id: u.id,
          email: u.email,
          created_at: u.created_at,
        }, meta);
      }
    } catch {
      // Ignore
    }
  }
  return undefined;
}

export async function getUserById(id: number) {
  try {
    const row = unwrap(await client().from("profiles").select("*").eq("id", id).maybeSingle());
    if (row) {
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
  } catch (err) {
    console.warn("[Supabase] getUserById query warning:", err);
  }
  return undefined;
}

export async function listUsers(filter?: { role?: string; status?: string; district?: string; facilityId?: number; search?: string }) {
  let query = client().from("profiles").select("*").order("created_at", { ascending: false });
  if (filter?.role && filter.role !== "all") query = query.eq("role", filter.role);
  if (filter?.district && filter.district !== "all") query = query.eq("district", filter.district);
  if (filter?.facilityId) query = query.eq("facility_id", filter.facilityId);
  const rows = many(unwrap(await query));

  const metaMap = new Map<string, any>();
  const authUsers: any[] = [];
  if (supabaseAdmin) {
    try {
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
      if (authList?.users) {
        for (const u of authList.users) {
          if (u.id) {
            authUsers.push(u);
            if (u.user_metadata) {
              metaMap.set(u.id, u.user_metadata);
            }
          }
        }
      }
    } catch {
      // Ignore auth list failure
    }
  }

  const existingKeys = new Set<string>();
  const result: any[] = [];

  for (const r of rows) {
    const mapped = mapUser(r, metaMap.get(r.auth_id || r.open_id));
    if (mapped) {
      const key = (mapped.email || mapped.openId || `profile-${mapped.id}`).toLowerCase();
      existingKeys.add(key);
      if (mapped.openId) existingKeys.add(mapped.openId.toLowerCase());
      if (mapped.authId) existingKeys.add(mapped.authId.toLowerCase());
      result.push(mapped);
    }
  }

  // Synthesize newly registered Supabase Auth users not yet persisted to profiles table
  for (const u of authUsers) {
    const uEmail = (u.email || "").toLowerCase();
    const uId = (u.id || "").toLowerCase();
    if (existingKeys.has(uEmail) || existingKeys.has(uId)) continue;

    const meta = u.user_metadata || {};
    const rawRole = String(meta.selected_role || meta.role || "citizen").toLowerCase();
    const role = ["citizen", "asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"].includes(rawRole)
      ? rawRole
      : "citizen";
    const isStaff = ["doctor", "asha", "cho", "asha_cho", "facility_staff"].includes(role);
    const status = (meta.status || (isStaff ? "PENDING" : "APPROVED")).toUpperCase();
    const district = meta.district || null;

    const synthUser = mapUser({
      id: Math.abs(uId.split("").reduce((acc: number, c: string) => (acc << 5) - acc + c.charCodeAt(0), 0)) % 100000 || 9999,
      open_id: u.id,
      auth_id: u.id,
      name: meta.full_name || meta.name || (u.email ? u.email.split("@")[0] : "Staff Member"),
      email: u.email,
      role,
      status,
      district,
      village: meta.village || meta.assigned_village || null,
      facility_name: meta.facility_name || null,
      designation: meta.designation || null,
      employee_id: meta.employee_id || null,
      registration_number: meta.registration_number || null,
      assigned_village: meta.assigned_village || null,
      phone: meta.phone || null,
      created_at: u.created_at,
      updated_at: u.updated_at,
    }, meta);

    if (synthUser) {
      existingKeys.add(uEmail);
      existingKeys.add(uId);
      result.push(synthUser);
    }
  }

  let filtered = result;
  if (filter?.role && filter.role !== "all" && filter.role !== "ALL") {
    const rLower = filter.role.toLowerCase();
    filtered = filtered.filter(u => (u.role || "").toLowerCase() === rLower);
  }
  if (filter?.district && filter.district !== "all" && filter.district !== "ALL") {
    const dLower = filter.district.toLowerCase();
    filtered = filtered.filter(u => {
      const uDist = (u.district || "").toLowerCase();
      return uDist === dLower || uDist.includes(dLower) || dLower.includes(uDist);
    });
  }
  if (filter?.status && filter.status !== "all" && filter.status !== "ALL") {
    const sUpper = filter.status.toUpperCase();
    filtered = filtered.filter(u => (u.status || "APPROVED").toUpperCase() === sUpper);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    filtered = filtered.filter(u => 
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.employeeId?.toLowerCase().includes(q) ||
      u.registrationNumber?.toLowerCase().includes(q)
    );
  }
  return filtered;
}

export async function approveStaffUser(adminIdentifier: string, userId: number) {
  const now = new Date().toISOString();
  let targetAuthId: string | null = null;
  try {
    const existing = unwrap(await client().from("profiles").select("auth_id, open_id").eq("id", userId).maybeSingle());
    if (existing) {
      targetAuthId = existing.auth_id || existing.open_id;
    }
  } catch {
    // Ignore
  }

  if (targetAuthId && supabaseAdmin) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(targetAuthId, {
        user_metadata: {
          status: "APPROVED",
          approved_at: now,
          approved_by: adminIdentifier,
          rejection_reason: null,
        },
      });
    } catch {
      // Ignore
    }
  }

  const { error } = await client().from("profiles").update({
    status: "APPROVED",
    approved_at: now,
    approved_by: adminIdentifier,
    rejection_reason: null,
    updated_at: now,
  }).eq("id", userId);

  if (error) {
    if (isMissingColumnError(error)) {
      try {
        await client().from("profiles").update({ updated_at: now }).eq("id", userId);
      } catch {
        // Safe fallback
      }
      return;
    }
    throw new Error(error.message);
  }
}

export async function rejectStaffUser(adminIdentifier: string, userId: number, reason: string) {
  const now = new Date().toISOString();
  let targetAuthId: string | null = null;
  try {
    const existing = unwrap(await client().from("profiles").select("auth_id, open_id").eq("id", userId).maybeSingle());
    if (existing) {
      targetAuthId = existing.auth_id || existing.open_id;
    }
  } catch {
    // Ignore
  }

  if (targetAuthId && supabaseAdmin) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(targetAuthId, {
        user_metadata: {
          status: "REJECTED",
          rejection_reason: reason,
          approved_by: adminIdentifier,
        },
      });
    } catch {
      // Ignore
    }
  }

  const { error } = await client().from("profiles").update({
    status: "REJECTED",
    rejection_reason: reason,
    approved_by: adminIdentifier,
    updated_at: now,
  }).eq("id", userId);

  if (error) {
    if (isMissingColumnError(error)) {
      try {
        await client().from("profiles").update({ updated_at: now }).eq("id", userId);
      } catch {
        // Safe fallback
      }
      return;
    }
    throw new Error(error.message);
  }
}

export async function suspendStaffUser(adminIdentifier: string, userId: number) {
  const now = new Date().toISOString();
  let targetAuthId: string | null = null;
  try {
    const existing = unwrap(await client().from("profiles").select("auth_id, open_id").eq("id", userId).maybeSingle());
    if (existing) {
      targetAuthId = existing.auth_id || existing.open_id;
    }
  } catch {
    // Ignore
  }

  if (targetAuthId && supabaseAdmin) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(targetAuthId, {
        user_metadata: {
          status: "SUSPENDED",
        },
      });
    } catch {
      // Ignore
    }
  }

  const { error } = await client().from("profiles").update({
    status: "SUSPENDED",
    updated_at: now,
  }).eq("id", userId);

  if (error) {
    if (isMissingColumnError(error)) {
      try {
        await client().from("profiles").update({ updated_at: now }).eq("id", userId);
      } catch {
        // Safe fallback
      }
      return;
    }
    throw new Error(error.message);
  }
}

export async function reactivateStaffUser(adminIdentifier: string, userId: number) {
  const now = new Date().toISOString();
  let targetAuthId: string | null = null;
  try {
    const existing = unwrap(await client().from("profiles").select("auth_id, open_id").eq("id", userId).maybeSingle());
    if (existing) {
      targetAuthId = existing.auth_id || existing.open_id;
    }
  } catch {
    // Ignore
  }

  if (targetAuthId && supabaseAdmin) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(targetAuthId, {
        user_metadata: {
          status: "APPROVED",
        },
      });
    } catch {
      // Ignore
    }
  }

  const { error } = await client().from("profiles").update({
    status: "APPROVED",
    updated_at: now,
  }).eq("id", userId);

  if (error) {
    if (isMissingColumnError(error)) {
      try {
        await client().from("profiles").update({ updated_at: now }).eq("id", userId);
      } catch {
        // Safe fallback
      }
      return;
    }
    throw new Error(error.message);
  }
}

export async function updateUserProfile(userId: number, editableFields: Record<string, unknown>) {
  try {
    // Fetch existing profile to retrieve auth_id / open_id
    let currentProfile: any = null;
    try {
      currentProfile = unwrap(await client().from("profiles").select("*").eq("id", userId).maybeSingle());
    } catch (fetchErr) {
      console.warn("[Supabase] Fetch profile by id warning:", fetchErr);
    }

    const authId = currentProfile?.auth_id || currentProfile?.open_id;

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
    if (currentProfile) {
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

    const updatedUser = await getUserById(userId);
    if (updatedUser) return updatedUser;
  } catch (err) {
    console.warn("[Supabase] updateUserProfile error, falling back to local store:", err);
  }
  return undefined;
}

export async function getPatients(limit = 50) { return many(unwrap(await client().from("patients").select("*").order("updated_at", { ascending: false }).limit(limit))).map(mapPatient); }
export async function getPatientsForUser(userId: number, role: string, limit = 50, targetDistrict?: string, targetVillage?: string) {
  let query = client().from("patients").select("*").order("updated_at", { ascending: false }).limit(limit);
  if (["asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"].includes(role)) {
    if (targetDistrict) {
      query = query.ilike("district", `%${targetDistrict}%`);
    }
    if (targetVillage) {
      query = query.ilike("village", `%${targetVillage}%`);
    }
  } else {
    query = query.eq("user_id", userId);
  }
  const result = await query;
  let list = many(unwrap(result)).map(mapPatient);

  // For citizen users, ensure all household members, matching contact, and name records are retrieved
  if (role === "citizen") {
    try {
      const userRow = await getUserById(userId);
      if (userRow) {
        // Find by contact / phone if user has phone
        if (userRow.phone) {
          const contactQuery = await client().from("patients").select("*").eq("contact", userRow.phone).limit(20);
          const contactList = many(unwrap(contactQuery)).map(mapPatient);
          for (const cp of contactList) {
            if (!list.some(p => p.id === cp.id)) {
              list.push(cp);
              // Auto-link user_id
              void client().from("patients").update({ user_id: userId }).eq("id", cp.id);
            }
          }
        }

        // Find by name if list is still empty
        if (list.length === 0 && userRow.name) {
          const nameQuery = await client().from("patients").select("*").ilike("name", `%${userRow.name.trim()}%`).limit(10);
          const nameList = many(unwrap(nameQuery)).map(mapPatient);
          if (nameList.length > 0) {
            for (const np of nameList) {
              list.push(np);
              void client().from("patients").update({ user_id: userId }).eq("id", np.id);
            }
            return list;
          }

          // Auto-seed primary patient record for this citizen
          const newPatRow = await client().from("patients").insert({
            user_id: userId,
            name: userRow.name,
            age: userRow.age || 30,
            gender: userRow.gender || "undisclosed",
            contact: userRow.phone || null,
            village: userRow.village || (userRow as any).assignedVillage || "Sundarpur",
            district: userRow.district || "Ahmedabad Rural",
            blood_group: userRow.bloodGroup || null,
            conditions: userRow.conditions || null,
            allergies: userRow.allergies || null,
            emergency_contact: userRow.emergencyContactPhone || userRow.emergencyContactName || userRow.phone || null,
            risk_score: 10,
            risk_category: "low",
          }).select().maybeSingle();
          const created = unwrap(newPatRow);
          if (created) return [mapPatient(created)];
        }
      }
    } catch {
      // Ignore background auto-link errors
    }
  }

  // Fallback to all if district filter yielded 0 for demo accounts
  if (list.length === 0 && ["doctor", "administrator", "admin", "facility_staff"].includes(role) && targetDistrict) {
    const fallbackRes = await client().from("patients").select("*").order("updated_at", { ascending: false }).limit(limit);
    return many(unwrap(fallbackRes)).map(mapPatient);
  }
  return list;
}

export async function createFacility(input: Record<string, unknown>) {
  return insertId("facilities", input);
}

export async function markOverdueFollowUps() {
  const now = new Date().toISOString();
  const overdue = many(unwrap(await client().from("follow_ups").select("*").eq("status", "open").lt("due_at", now)));
  for (const item of overdue) {
    unwrap(await client().from("follow_ups").update({ status: "overdue" }).eq("id", item.id));
    unwrap(await client().from("alerts").insert({ user_id: item.assigned_to, patient_id: item.patient_id, kind: "overdue_follow_up", title: "Follow-up is overdue", message: item.title }));
  }
  return overdue.length;
}

export async function getHouseholds(district?: string) {
  let query = client().from("households").select("*").order("created_at", { ascending: false });
  if (district && district !== "all") {
    query = query.eq("district", district);
  }
  const list = many(unwrap(await query)).map(mapHousehold);
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

export async function createAlert(input: Record<string, unknown>) {
  try {
    return await insertId("alerts", input);
  } catch (err) {
    console.warn("[Supabase] createAlert non-fatal error:", err);
    return 1;
  }
}

export async function createAuditEvent(input: Record<string, unknown>) {
  try {
    const payload = insertPayload(input);
    const { error } = await client().from("audit_events").insert(payload);
    if (error) {
      // If 'detail' column is missing or named 'details'/'description', retry with fallback payload
      const fallbackPayload: Record<string, unknown> = {};
      if (payload.actor_id !== undefined) fallbackPayload.actor_id = payload.actor_id;
      if (payload.action !== undefined) fallbackPayload.action = payload.action;
      if (payload.entity_type !== undefined) fallbackPayload.entity_type = payload.entity_type;
      if (payload.entity_id !== undefined) fallbackPayload.entity_id = payload.entity_id;
      if (payload.detail !== undefined) fallbackPayload.details = payload.detail;

      try {
        const retryRes = await client().from("audit_events").insert(fallbackPayload);
        if (retryRes.error) {
          const minimal = {
            actor_id: payload.actor_id,
            action: payload.action,
            entity_type: payload.entity_type,
          };
          await client().from("audit_events").insert(minimal);
        }
      } catch {
        // Non-fatal audit log failure
      }
    }
  } catch (err) {
    console.warn("[Supabase] createAuditEvent non-fatal warning:", err);
  }
}
export async function createPatient(input: Record<string, unknown>) {
  try {
    return await insertId("patients", input);
  } catch (err) {
    try {
      const essential = {
        name: input.name,
        age: input.age,
        gender: input.gender,
        contact: input.contact,
        village: input.village,
        district: input.district,
        user_id: input.userId,
        household_id: input.householdId || 1,
        blood_group: input.bloodGroup,
        conditions: input.conditions,
        allergies: input.allergies,
        emergency_contact: input.emergencyContact,
        risk_score: input.riskScore ?? 0,
        risk_category: input.riskCategory || "low",
      };
      const row = unwrap(await client().from("patients").insert(insertPayload(essential)).select("id").single()) as { id?: number } | null;
      if (row?.id) return Number(row.id);
    } catch (retryErr) {
      console.warn("[Supabase] createPatient fallback notice:", retryErr);
    }
    throw err;
  }
}
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
export async function getAppointments(patientId?: number, doctorId?: number) {
  try {
    let query = client().from("appointments").select("*").order("scheduled_at", { ascending: true });
    if (patientId) query = query.eq("patient_id", patientId);
    if (doctorId) query = query.eq("doctor_id", doctorId);
    const result = await query;
    return many(unwrap(result)).map(mapAppointment);
  } catch (err) {
    console.warn("[Supabase] getAppointments fallback notice:", err);
    return [];
  }
}
export async function createAppointment(input: Record<string, unknown>) {
  try {
    return await insertId("appointments", input);
  } catch (err) {
    try {
      const essential = {
        patient_id: input.patientId,
        doctor_id: input.doctorId || 1,
        facility_id: input.facilityId || 1,
        scheduled_at: input.scheduledAt,
        type: input.type || "general_opd",
        status: input.status || "scheduled",
        notes: input.notes,
      };
      const row = unwrap(await client().from("appointments").insert(essential).select("id").single()) as { id?: number } | null;
      if (row?.id) return Number(row.id);
    } catch (retryErr) {
      console.warn("[Supabase] createAppointment fallback notice:", retryErr);
    }
    throw err;
  }
}

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
