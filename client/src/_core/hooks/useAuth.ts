import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState, useMemo } from "react";

function deriveUserFromSession(session: any) {
  if (!session?.user) return null;
  const u = session.user;
  const meta = u.user_metadata || {};
  const role = meta.selected_role || meta.role || "citizen";
  const fullName =
    typeof meta.full_name === "string" && meta.full_name.trim()
      ? meta.full_name.trim()
      : typeof meta.name === "string" && meta.name.trim()
      ? meta.name.trim()
      : typeof meta.user_name === "string" && meta.user_name.trim()
      ? meta.user_name.trim()
      : u.email
      ? u.email.split("@")[0]
      : "Care Workspace User";

  return {
    id: 1,
    openId: u.id,
    authId: u.id,
    name: fullName,
    email: u.email ?? null,
    loginMethod: "supabase",
    role,
    status: (meta.status || (role === "citizen" || role === "admin" || role === "administrator" ? "APPROVED" : "PENDING")).toUpperCase(),
    phone: meta.phone ?? null,
    dateOfBirth: meta.date_of_birth ?? null,
    age: meta.age != null && !isNaN(Number(meta.age)) ? Number(meta.age) : null,
    gender: meta.gender ?? null,
    village: meta.village ?? null,
    district: meta.district ?? "Ahmedabad Rural",
    facilityId: meta.facility_id != null ? Number(meta.facility_id) : null,
    facilityName: meta.facility_name ?? null,
    designation: meta.designation ?? null,
    employeeId: meta.employee_id ?? null,
    registrationNumber: meta.registration_number ?? null,
    assignedVillage: meta.assigned_village ?? null,
    emergencyContactName: meta.emergency_contact_name ?? null,
    emergencyContactPhone: meta.emergency_contact_phone ?? null,
    bloodGroup: meta.blood_group ?? null,
    allergies: meta.allergies ?? null,
    conditions: meta.conditions ?? null,
    address: meta.address ?? null,
    pincode: meta.pincode ?? null,
    abhaId: meta.abha_id ?? null,
    avatarUrl: meta.avatar_url ?? null,
    approvalRequestedAt: null,
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    createdAt: new Date(u.created_at || Date.now()),
    updatedAt: new Date(u.updated_at || Date.now()),
    lastSignedIn: new Date(),
  } as any;
}

export function useAuth() {
  const [session, setSession] = useState<Awaited<ReturnType<NonNullable<typeof supabase>["auth"]["getSession"]>>["data"]["session"]>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: Boolean(session) || !supabase,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!supabase) {
      setSessionLoading(false);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionLoading(false);
      if (nextSession) {
        void utils.auth.me.invalidate();
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [utils]);

  const fallbackUser = useMemo(() => deriveUserFromSession(session), [session]);
  const user = meQuery.data || fallbackUser;
  const isAuthenticated = Boolean(user && (session || !supabase));

  const logout = useCallback(async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("[Auth] Supabase signOut warning:", e);
    }

    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Ignore server session cleanup failure
    }

    try {
      localStorage.removeItem("arjuna.pendingRole");
      sessionStorage.removeItem("manus-cookie");
    } catch {
      // Ignore storage errors
    }

    setSession(null);
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();

    // Redirect to home/login screen
    if (typeof window !== "undefined") {
      const base = window.location.pathname.toLowerCase().startsWith("/arjuna") ? "/Arjuna/" : "/";
      window.location.assign(base);
    }
  }, [utils, logoutMutation]);

  return {
    user: user ?? null,
    loading: sessionLoading && !user,
    error: meQuery.error ?? null,
    isAuthenticated,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
