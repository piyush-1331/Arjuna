import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState, useMemo } from "react";
import { getDistrictForCityOrVillage, findPredefinedAccount, DISTRICT_ADMIN_ACCOUNTS } from "@shared/maharashtraLocations";

function deriveUserFromSession(session: any) {
  const email = (session?.user?.email || "").toLowerCase();
  const u = session?.user;
  const meta = u?.user_metadata || {};
  const stableKey = email || u?.id;

  // 1. Check if email belongs to predefined district administrator or staff accounts
  const predefined = email ? findPredefinedAccount(email) : null;

  // Attempt to restore cached user profile for this account
  if (typeof window !== "undefined" && stableKey) {
    try {
      const cached = localStorage.getItem(`arjuna.auth.user_profile.${stableKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (!u || parsed.openId === u.id || (email && parsed.email?.toLowerCase() === email))) {
          return {
            ...parsed,
            district: predefined ? predefined.district : (parsed.district || "Pune"),
            role: predefined ? predefined.role : (parsed.role || "citizen"),
            lastSignedIn: new Date(),
          };
        }
      }
    } catch {
      // Storage parse ignore
    }
  }

  if (predefined) {
    return {
      id: 1,
      openId: predefined.id,
      authId: predefined.id,
      name: predefined.name,
      email: predefined.email,
      loginMethod: "supabase",
      role: predefined.role,
      status: "APPROVED",
      phone: predefined.phone || null,
      dateOfBirth: null,
      age: null,
      gender: null,
      village: predefined.village || null,
      district: predefined.district,
      facilityId: 101,
      facilityName: predefined.facilityName || null,
      designation: predefined.designation || null,
      employeeId: `EMP-${predefined.id.toUpperCase()}`,
      registrationNumber: null,
      assignedVillage: predefined.village || null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      bloodGroup: null,
      allergies: null,
      conditions: null,
      address: null,
      pincode: null,
      abhaId: null,
      avatarUrl: null,
      approvalRequestedAt: null,
      approvedAt: new Date(),
      approvedBy: "system",
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any;
  }

  if (!u) return null;

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

  const resolvedDistrict =
    meta.district ||
    (meta.village ? getDistrictForCityOrVillage(meta.village) : null) ||
    (meta.assigned_village ? getDistrictForCityOrVillage(meta.assigned_village) : null) ||
    "Pune";

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
    district: resolvedDistrict,
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

  const [activeEmail, setActiveEmail] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("arjuna.auth.active_email") || null;
    }
    return null;
  });

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
        if (nextSession.user?.email) {
          setActiveEmail(nextSession.user.email);
          localStorage.setItem("arjuna.auth.active_email", nextSession.user.email.toLowerCase());
        }
        void utils.auth.me.invalidate();
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [utils]);

  const fallbackUser = useMemo(() => {
    if (session) return deriveUserFromSession(session);
    if (activeEmail) {
      return deriveUserFromSession({ user: { email: activeEmail, id: activeEmail } });
    }
    return null;
  }, [session, activeEmail]);

  const user = meQuery.data || fallbackUser;
  const isAuthenticated = Boolean(user && (session || activeEmail || !supabase));

  // Sync fresh user profile data to persistent local cache
  useEffect(() => {
    if (meQuery.data && typeof window !== "undefined") {
      try {
        const u = meQuery.data;
        if (u.email) {
          localStorage.setItem(`arjuna.auth.user_profile.${u.email.toLowerCase()}`, JSON.stringify(u));
        }
        if (u.openId) {
          localStorage.setItem(`arjuna.auth.user_profile.${u.openId}`, JSON.stringify(u));
        }
      } catch {
        // Storage write error ignored
      }
    }
  }, [meQuery.data]);

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
      localStorage.removeItem("arjuna.auth.active_email");
      sessionStorage.removeItem("manus-cookie");
    } catch {
      // Ignore storage errors
    }

    setSession(null);
    setActiveEmail(null);
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
    refresh: () => {
      if (typeof window !== "undefined") {
        const emailNow = localStorage.getItem("arjuna.auth.active_email");
        if (emailNow) setActiveEmail(emailNow);
      }
      return meQuery.refetch();
    },
    logout,
  };
}
