import React, { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import WorkspaceLayout, { NavItem } from "@/components/WorkspaceLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileHeart,
  FileText,
  HeartPulse,
  Hospital,
  Info,
  MapPin,
  MessageSquare,
  Moon,
  Navigation,
  Pill,
  Phone,
  Plus,
  Printer,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunrise,
  RefreshCw,
  Sunset,
  User,
  UserCog,
  Users,
  Volume2,
  Stethoscope,
  X,
  Zap,
} from "lucide-react";
import HealthcareFacilityMap, { DEFAULT_FACILITIES } from "@/components/HealthcareFacilityMap";
import EditProfileModal from "@/components/EditProfileModal";
import SupabaseAuthPortal from "@/components/SupabaseAuthPortal";
import { supabase } from "@/lib/supabase";

export default function CitizenWorkspace() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [prescriptionTab, setPrescriptionTab] = useState<"summary" | "active" | "history">("summary");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showMedicineFinderModal, setShowMedicineFinderModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [medicineSearchQuery, setMedicineSearchQuery] = useState("Paracetamol");
  const [citizenFollowUpFilter, setCitizenFollowUpFilter] = useState<"all" | "upcoming" | "completed">("all");

  // Sub-dialogs
  const [showBookAppt, setShowBookAppt] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    type: "general_opd" as const,
    scheduledAt: "",
    notes: "",
    facilityId: 1,
  });
  const [familyForm, setFamilyForm] = useState({
    name: "",
    age: "",
    gender: "female" as const,
    conditions: "",
    allergies: "",
    bloodGroup: "B+",
    emergencyContact: "",
  });

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string; action?: string; time: string }>>([
    {
      sender: "ai",
      text: `Namaste ${user?.name ? user.name.split(" ")[0] + " ji" : "ji"}. I am your Arjuna health assistant. You can ask about your symptoms, medicines, diet tips, or nearby health services in English, Hindi, or Gujarati.`,
      action: "Check your morning blood pressure reading",
      time: "Just now",
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [language, setLanguage] = useState<"en" | "hi" | "gu">("en");

  // Queries
  const utils = trpc.useUtils();
  const overview = trpc.dashboard.overview.useQuery(undefined, { enabled: isAuthenticated });
  const patients = trpc.patients.list.useQuery(undefined, { enabled: isAuthenticated });

  // Stable cache keys based on persistent user identity (email / openId / id)
  const userEmail = (user?.email || "").toLowerCase().trim();
  const userOpenId = user?.openId || user?.authId || "";
  const stableUserKey = useMemo(() => {
    const raw = userEmail || userOpenId || (user?.id ? `id_${user.id}` : "citizen_local");
    return raw.toLowerCase().replace(/[^a-z0-9_.-]/g, "_");
  }, [userEmail, userOpenId, user?.id]);

  const APPT_CACHE_KEY = `arjuna.citizen.appointments.${stableUserKey}`;
  const FAMILY_CACHE_KEY = `arjuna.citizen.family.${stableUserKey}`;

  // Local storage state fallback
  const [localFamily, setLocalFamily] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem(FAMILY_CACHE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [localAppts, setLocalAppts] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem(APPT_CACHE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Re-sync local storage whenever user identity / stableUserKey updates (e.g. after login or meQuery completion)
  React.useEffect(() => {
    try {
      const storedFam = localStorage.getItem(FAMILY_CACHE_KEY);
      if (storedFam) {
        const parsed = JSON.parse(storedFam);
        if (Array.isArray(parsed)) setLocalFamily(parsed);
      }
      const storedAppt = localStorage.getItem(APPT_CACHE_KEY);
      if (storedAppt) {
        const parsed = JSON.parse(storedAppt);
        if (Array.isArray(parsed)) setLocalAppts(parsed);
      }
    } catch (err) {
      console.warn("[Storage sync error]", err);
    }
  }, [FAMILY_CACHE_KEY, APPT_CACHE_KEY]);

  // Keep local storage safely synced with incoming server data without losing locally added entries
  React.useEffect(() => {
    if (patients.data && Array.isArray(patients.data)) {
      try {
        const currentStored = (() => {
          try {
            const raw = localStorage.getItem(FAMILY_CACHE_KEY);
            return raw ? JSON.parse(raw) : [];
          } catch { return []; }
        })();
        const merged = [...patients.data];
        for (const loc of currentStored) {
          const match = merged.some(
            m => (m.id && loc.id && m.id === loc.id) ||
                 (m.name && loc.name && m.name.trim().toLowerCase() === loc.name.trim().toLowerCase())
          );
          if (!match) merged.push(loc);
        }
        localStorage.setItem(FAMILY_CACHE_KEY, JSON.stringify(merged));
        setLocalFamily(merged);
      } catch { /* ignore */ }
    }
  }, [patients.data, FAMILY_CACHE_KEY]);

  // Merged family members (server + local cache)
  const familyMembers = useMemo(() => {
    const serverList = patients.data || [];
    const merged = [...serverList];
    for (const lf of localFamily) {
      const exists = merged.some(
        (m) =>
          (m.id && lf.id && m.id === lf.id) ||
          (m.name && lf.name && m.name.trim().toLowerCase() === lf.name.trim().toLowerCase())
      );
      if (!exists) {
        merged.push(lf);
      }
    }
    return merged;
  }, [patients.data, localFamily]);

  // Current primary citizen patient or logged in citizen
  const currentPatient = useMemo(() => {
    return (
      familyMembers.find(
        (p) =>
          (user?.id && p.userId === user.id) ||
          (user?.name && p.name && p.name.toLowerCase() === user.name.toLowerCase())
      ) || (user?.role === "citizen" ? familyMembers[0] : familyMembers[0])
    );
  }, [familyMembers, user]);

  const visits = trpc.patients.timeline.useQuery(
    { id: currentPatient?.id || 0 },
    { enabled: Boolean(isAuthenticated && currentPatient?.id) }
  );
  const prescriptions = trpc.prescriptions.list.useQuery(
    currentPatient?.id ? { patientId: currentPatient.id } : undefined,
    { enabled: Boolean(isAuthenticated && currentPatient?.id) }
  );
  const prescriptionSummary = trpc.prescriptions.getSummary.useQuery(
    { patientId: currentPatient?.id || 0 },
    { enabled: Boolean(isAuthenticated && currentPatient?.id) }
  );
  const appointments = trpc.appointments.list.useQuery(
    undefined,
    { enabled: Boolean(isAuthenticated) }
  );
  const referrals = trpc.referrals.citizenList.useQuery(undefined, { enabled: isAuthenticated });
  const followUps = trpc.followUps.citizenUpcoming.useQuery(undefined, { enabled: isAuthenticated });
  const facilities = trpc.facilities.list.useQuery(undefined, { enabled: isAuthenticated });
  const alerts = trpc.alerts.list.useQuery(undefined, { enabled: isAuthenticated });
  const patientRiskQuery = trpc.risk.getPatientRiskProfile.useQuery(
    { patientId: currentPatient?.id || 0 },
    { enabled: Boolean(isAuthenticated && currentPatient?.id) }
  );

  // Sync appointments from server into local storage cache safely
  React.useEffect(() => {
    if (appointments.data && Array.isArray(appointments.data)) {
      try {
        const currentStored = (() => {
          try {
            const raw = localStorage.getItem(APPT_CACHE_KEY);
            return raw ? JSON.parse(raw) : [];
          } catch { return []; }
        })();
        const merged = [...appointments.data];
        for (const loc of currentStored) {
          const match = merged.some(
            m => (m.id && loc.id && m.id === loc.id) ||
                 (m.scheduledAt && loc.scheduledAt && new Date(m.scheduledAt).getTime() === new Date(loc.scheduledAt).getTime())
          );
          if (!match) merged.push(loc);
        }
        localStorage.setItem(APPT_CACHE_KEY, JSON.stringify(merged));
        setLocalAppts(merged);
      } catch { /* ignore */ }
    }
  }, [appointments.data, APPT_CACHE_KEY]);

  // Merged and deduplicated appointments (server + local fallback)
  const allAppointments = useMemo(() => {
    const serverList = appointments.data || [];
    const merged = [...serverList];
    for (const la of localAppts) {
      const exists = merged.some(
        (a) =>
          (a.id && la.id && a.id === la.id) ||
          (a.scheduledAt && la.scheduledAt && new Date(a.scheduledAt).getTime() === new Date(la.scheduledAt).getTime())
      );
      if (!exists) {
        merged.push(la);
      }
    }
    return merged.sort((a: any, b: any) => Number(new Date(b.scheduledAt)) - Number(new Date(a.scheduledAt)));
  }, [appointments.data, localAppts]);

  const upcomingAppointments = useMemo(() => {
    return allAppointments.filter((a: any) => a.status === "scheduled" || !a.status);
  }, [allAppointments]);

  // Reliable facilities dataset for consultation booking and nearby care
  const facilitiesList = useMemo(() => {
    if (facilities.data && facilities.data.length > 0) return facilities.data;
    return DEFAULT_FACILITIES;
  }, [facilities.data]);

  const [isBookingAppt, setIsBookingAppt] = useState(false);
  const [isAddingFamily, setIsAddingFamily] = useState(false);

  // Mutations
  const createAppointment = trpc.appointments.create.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
    },
    onError: (err) => {
      console.warn("[tRPC Appointment Error]:", err?.message);
    },
  });

  const createFamilyMember = trpc.patients.addFamilyMember.useMutation({
    onSuccess: () => {
      utils.patients.list.invalidate();
    },
    onError: (err) => {
      console.warn("[tRPC Family Member Error]:", err?.message);
    },
  });

  const handleBookAppointment = async () => {
    if (!appointmentForm.scheduledAt) {
      toast.error("Please pick a date & time");
      return;
    }

    setIsBookingAppt(true);
    const scheduledDate = new Date(appointmentForm.scheduledAt);
    const targetFacilityId = appointmentForm.facilityId || facilitiesList[0]?.id || 1;
    const resolvedPatientId = currentPatient?.id || (user?.id ? Number(user.id) : 1);
    const facilityObj = facilitiesList.find((f: any) => f.id === targetFacilityId);

    const newApptItem = {
      id: Date.now(),
      patientId: resolvedPatientId,
      doctorId: 1,
      facilityId: targetFacilityId,
      facilityName: facilityObj?.name || "Sundarpur Primary Health Centre",
      patientName: displayName,
      village: displayVillage,
      type: appointmentForm.type,
      scheduledAt: scheduledDate,
      status: "scheduled" as const,
      notes: appointmentForm.notes || null,
      createdAt: new Date(),
    };

    // 1. Immediately cache locally
    try {
      const updatedLocal = [newApptItem, ...localAppts.filter(a => a.id !== newApptItem.id)];
      setLocalAppts(updatedLocal);
      localStorage.setItem(APPT_CACHE_KEY, JSON.stringify(updatedLocal));
    } catch {
      // LocalStorage non-fatal
    }

    // 2. Direct Supabase insert & audit log if connected
    if (supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const authUserId = sessionData.session?.user?.id;
        const { data: sbAppt } = await supabase.from("appointments").insert({
          patient_id: resolvedPatientId,
          facility_id: targetFacilityId,
          doctor_id: 1,
          scheduled_at: scheduledDate.toISOString(),
          type: appointmentForm.type,
          status: "scheduled",
          notes: appointmentForm.notes || null,
        }).select("id").maybeSingle();

        if (sbAppt?.id) {
          newApptItem.id = Number(sbAppt.id);
        }

        await supabase.from("audit_events").insert({
          action: "appointment.requested",
          entity_type: "appointment",
          details: `Appointment (${appointmentForm.type}) requested for ${displayName} at ${facilityObj?.name || "PHC"}`,
          actor_id: authUserId || "citizen",
        });
      } catch (sbErr) {
        console.warn("[Supabase] Appointment notice:", sbErr);
      }
    }

    // 3. Persist to server via tRPC
    try {
      const res = await createAppointment.mutateAsync({
        patientId: resolvedPatientId,
        facilityId: targetFacilityId,
        scheduledAt: scheduledDate,
        type: appointmentForm.type,
        notes: appointmentForm.notes || undefined,
      });
      if (res?.id) {
        newApptItem.id = res.id;
        const refreshed = [newApptItem, ...localAppts.filter(a => a.id !== newApptItem.id && a.id !== Date.now())];
        setLocalAppts(refreshed);
        try { localStorage.setItem(APPT_CACHE_KEY, JSON.stringify(refreshed)); } catch {}
      }
    } catch (trpcErr: any) {
      console.warn("[tRPC] Appointment create notice:", trpcErr?.message);
    }

    // 4. Optimistically update appointments cache
    utils.appointments.list.setData(undefined, (old: any) => {
      const prev = Array.isArray(old) ? old : [];
      return [newApptItem, ...prev.filter((x: any) => x.id !== newApptItem.id)];
    });

    await Promise.allSettled([
      utils.appointments.list.invalidate(),
      utils.dashboard.overview.invalidate(),
    ]);

    toast.success("Appointment request submitted to PHC!");
    setShowBookAppt(false);
    setAppointmentForm({
      type: "general_opd",
      scheduledAt: "",
      notes: "",
      facilityId: 1,
    });
    setIsBookingAppt(false);
  };

  const handleAddFamilyMember = async () => {
    if (!familyForm.name.trim() || !familyForm.age) {
      toast.error("Please provide name and age for the family member.");
      return;
    }

    setIsAddingFamily(true);
    const parsedAge = Number(familyForm.age);

    const newFamilyMemberItem = {
      id: Date.now(),
      userId: user?.id ? Number(user.id) : null,
      householdId: 1,
      name: familyForm.name.trim(),
      age: parsedAge,
      gender: familyForm.gender,
      contact: user?.phone || "",
      village: displayVillage,
      district: displayDistrict,
      conditions: familyForm.conditions.trim() || null,
      allergies: familyForm.allergies.trim() || null,
      bloodGroup: familyForm.bloodGroup || null,
      emergencyContact: user?.phone || displayEmergencyContact,
      riskScore: 10,
      riskCategory: "low",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 1. Immediately cache locally
    try {
      const updatedLocal = [...localFamily.filter(f => f.name.trim().toLowerCase() !== newFamilyMemberItem.name.toLowerCase()), newFamilyMemberItem];
      setLocalFamily(updatedLocal);
      localStorage.setItem(FAMILY_CACHE_KEY, JSON.stringify(updatedLocal));
    } catch {
      // LocalStorage non-fatal
    }

    // 2. Direct Supabase insert into patients table if connected
    if (supabase) {
      try {
        const { data, error } = await supabase.from("patients").insert([
          {
            name: newFamilyMemberItem.name,
            age: newFamilyMemberItem.age,
            gender: newFamilyMemberItem.gender,
            contact: newFamilyMemberItem.contact || undefined,
            village: newFamilyMemberItem.village || "Sundarpur",
            district: newFamilyMemberItem.district || "Ahmedabad Rural",
            conditions: newFamilyMemberItem.conditions || undefined,
            allergies: newFamilyMemberItem.allergies || undefined,
            blood_group: newFamilyMemberItem.bloodGroup || undefined,
            emergency_contact: newFamilyMemberItem.emergencyContact || undefined,
            household_id: 1,
            user_id: user?.id ? Number(user.id) : undefined,
            risk_score: 10,
            risk_category: "low",
          },
        ]).select().maybeSingle();

        if (!error && data) {
          newFamilyMemberItem.id = Number(data.id);
        }
      } catch (sbErr) {
        console.warn("[Supabase] Patient insert notice:", sbErr);
      }
    }

    // 3. Persist via tRPC
    try {
      const res = await createFamilyMember.mutateAsync({
        name: familyForm.name.trim(),
        age: parsedAge,
        gender: familyForm.gender,
        conditions: familyForm.conditions.trim() || undefined,
        allergies: familyForm.allergies.trim() || undefined,
        bloodGroup: familyForm.bloodGroup || undefined,
        householdId: 1,
      });
      if (res?.id) {
        newFamilyMemberItem.id = res.id;
        const refreshed = [...localFamily.filter(f => f.name.trim().toLowerCase() !== newFamilyMemberItem.name.toLowerCase()), newFamilyMemberItem];
        setLocalFamily(refreshed);
        try { localStorage.setItem(FAMILY_CACHE_KEY, JSON.stringify(refreshed)); } catch {}
      }
    } catch (trpcErr: any) {
      console.warn("[tRPC] Patient create notice:", trpcErr?.message);
    }

    // 4. Optimistically update patients query cache
    utils.patients.list.setData(undefined, (old: any) => {
      const prev = Array.isArray(old) ? old : [];
      return [...prev.filter((x: any) => x.id !== newFamilyMemberItem.id), newFamilyMemberItem];
    });

    await Promise.allSettled([
      utils.patients.list.invalidate(),
      utils.dashboard.overview.invalidate(),
    ]);

    toast.success("Family member added to your household record!");
    setShowAddFamily(false);
    setFamilyForm({
      name: "",
      age: "",
      gender: "female",
      conditions: "",
      allergies: "",
      bloodGroup: "B+",
      emergencyContact: "",
    });
    setIsAddingFamily(false);
  };

  const completeFollowUp = trpc.followUps.complete.useMutation({
    onSuccess: () => {
      toast.success("Care follow-up marked as completed");
      utils.followUps.citizenUpcoming.invalidate();
      utils.followUps.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
  });

  const aiChat = trpc.aiAssistant.chat.useMutation({
    onSuccess: (data) => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.reply,
          action: data.recommendedAction,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    },
    onError: (err) => toast.error(err.message),
  });

  const displayName = user?.name || currentPatient?.name || "Citizen";
  const displayAge = user?.age || currentPatient?.age;
  const displayGender = user?.gender || currentPatient?.gender || "Not specified";
  const displayVillage = user?.village || currentPatient?.village || "Not specified";
  const displayDistrict = user?.district || currentPatient?.district || "Ahmedabad Rural";
  const displayAbhaId = user?.abhaId || currentPatient?.abhaId || (user?.id ? `91-8201-${String(user.id).padStart(4, "0")}` : "91-8201-9921");
  const displayEmergencyContact = user?.emergencyContactPhone || user?.phone || currentPatient?.emergencyContact || user?.emergencyContactName || "Not Provided";
  const displayBloodGroup = user?.bloodGroup || currentPatient?.bloodGroup || "Not Provided";
  const displayAllergies = user?.allergies || currentPatient?.allergies || "None declared";
  const displayConditions = user?.conditions || currentPatient?.conditions || "None declared";

  const activePrescriptions = (prescriptions.data || []).filter((p) => p.status === "active");
  const citizenReferrals = referrals.data || [];
  const citizenFollowUps = followUps.data || [];
  const upcomingFollowUpsCount = citizenFollowUps.filter((f) => f.isUpcoming).length;

  const latestVisit = visits.data?.visits?.[0];
  const latestBp = latestVisit?.bpSystolic && latestVisit?.bpDiastolic ? `${latestVisit.bpSystolic}/${latestVisit.bpDiastolic}` : null;
  const latestGlucose = latestVisit?.glucose ? `${latestVisit.glucose}` : null;
  const latestSpo2 = latestVisit?.spo2 ? `${latestVisit.spo2}%` : null;
  const latestPulse = latestVisit?.pulse ? `${latestVisit.pulse} bpm` : null;
  const latestBmi = latestVisit?.bmi ? `${latestVisit.bmi}` : null;
  const latestWeight = latestVisit?.weight ? `${latestVisit.weight} kg` : null;

  const citizenFacilitySearch = trpc.medicineAvailability.searchFacilities.useQuery(
    {
      medicineName: medicineSearchQuery.trim() || "Paracetamol",
      originVillage: displayVillage,
    },
    {
      enabled: showMedicineFinderModal && !!medicineSearchQuery.trim(),
    }
  );

  const handleSendMessage = () => {
    if (!inputMsg.trim()) return;
    const msg = inputMsg;
    setChatMessages((prev) => [
      ...prev,
      { sender: "user", text: msg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ]);
    setInputMsg("");
    aiChat.mutate({
      message: msg,
      language,
      patientContext: {
        age: displayAge ? Number(displayAge) : undefined,
        conditions: displayConditions !== "None declared" ? displayConditions : undefined,
        recentVitals: latestBp ? `BP: ${latestBp}${latestGlucose ? `, Glucose: ${latestGlucose}` : ""}` : undefined,
      },
    });
  };

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "my_health", label: "My Health", icon: HeartPulse },
    { id: "family", label: "Family", icon: Users, badge: familyMembers.length },
    { id: "history", label: "Health History", icon: FileText },
    { id: "appointments", label: "Appointments", icon: Calendar, badge: upcomingAppointments.length },
    { id: "referrals", label: "Referrals", icon: Navigation, badge: citizenReferrals.length },
    { id: "prescriptions", label: "Prescriptions", icon: Pill, badge: activePrescriptions.length },
    { id: "followups", label: "Follow-ups", icon: Clock, badge: upcomingFollowUpsCount || undefined },
    { id: "facilities", label: "Nearby Facilities", icon: Hospital },
    { id: "ai_assistant", label: "AI Assistant", icon: Sparkles },
    { id: "notifications", label: "Notifications", icon: AlertCircle, badge: alerts.data?.length },
  ];

  return (
    <WorkspaceLayout
      role="citizen"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      navItems={navItems}
      title={
        activeTab === "dashboard"
          ? "My Care Plan & Health Portal"
          : activeTab === "my_health"
          ? "Personal Health & Vitals"
          : activeTab === "family"
          ? "Household Family Members"
          : activeTab === "history"
          ? "Clinical Visit History & Timeline"
          : activeTab === "appointments"
          ? "Doctor Consultations & Appointments"
          : activeTab === "referrals"
          ? "Referral & Specialist Care Pipeline"
          : activeTab === "prescriptions"
          ? "Active Prescriptions & Medication Timetable"
          : activeTab === "followups"
          ? "Home Follow-up & Care Reminders"
          : activeTab === "facilities"
          ? "Nearby Health Facilities & Sub-Centres"
          : activeTab === "ai_assistant"
          ? "Arjuna Health Assistant"
          : "Personal Alerts & Notifications"
      }
      subtitle={`Patient: ${displayName}${displayAge ? ` · ${displayAge} yrs` : ""} · ${displayVillage} (ABHA ID: ${displayAbhaId})`}
      actions={
        activeTab === "appointments" ? (
          <Button onClick={() => setShowBookAppt(true)} className="rounded-full bg-[#15181b] text-white">
            <Plus className="mr-2 h-4 w-4" /> Book Consultation
          </Button>
        ) : activeTab === "family" ? (
          <Button onClick={() => setShowAddFamily(true)} className="rounded-full bg-[#15181b] text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Family Member
          </Button>
        ) : activeTab === "dashboard" ? (
          <Button onClick={() => setActiveTab("ai_assistant")} className="rounded-full bg-[#15181b] text-white shadow-xs">
            <Sparkles className="mr-2 h-4 w-4 text-[#a9d1e8]" /> Ask AI Assistant
          </Button>
        ) : undefined
      }
    >
      {/* 1. DASHBOARD VIEW */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Welcome Health Card */}
          <Card className="border-0 bg-gradient-to-br from-[#e4f1f8] via-[#eef6fb] to-white shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Badge className="bg-[#15181b] text-white">Universal Health Card</Badge>
                  <h2 className="display-font mt-2 text-2xl font-extrabold sm:text-3xl text-slate-900">
                    Welcome back, {displayName}.
                  </h2>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
                    Your personal healthcare workspace is active. Check your clinical timeline, active medication regimen, or book a consultation below.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
                    <span className="rounded-xl bg-white px-3 py-1.5 shadow-xs border border-black/5">
                      Blood Group: <strong>{displayBloodGroup}</strong>
                    </span>
                    <span className="rounded-xl bg-white px-3 py-1.5 shadow-xs border border-black/5">
                      Assigned Centre: <strong>{user?.facilityName || "Sundarpur PHC"}</strong>
                    </span>
                    <span className="rounded-xl bg-white px-3 py-1.5 shadow-xs border border-black/5">
                      Emergency Contact: <strong>{displayEmergencyContact}</strong>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 sm:min-w-56">
                  <Button onClick={() => setActiveTab("prescriptions")} variant="outline" className="rounded-full justify-between bg-white text-xs font-semibold">
                    <span>{activePrescriptions.length} Active Prescriptions</span>
                    <Pill className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                  <Button onClick={() => setActiveTab("appointments")} variant="outline" className="rounded-full justify-between bg-white text-xs font-semibold">
                    <span>{upcomingAppointments.length} Upcoming Appointments</span>
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                  <Button onClick={() => setActiveTab("my_health")} className="rounded-full bg-[#15181b] text-white text-xs font-semibold">
                    View Health Record
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowEditProfileModal(true);
                    }}
                    variant="outline"
                    className="rounded-full justify-between bg-white text-xs font-semibold cursor-pointer"
                  >
                    <span>Edit My Profile</span>
                    <UserCog className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Vitals Snapshot */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-xs bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Latest Blood Pressure</span>
                  <Activity className="h-4 w-4 text-rose-500" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <p className="display-font text-3xl font-extrabold text-slate-900">{latestBp || "—"}</p>
                  {latestBp && <span className="text-xs text-slate-500">mmHg</span>}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                  {latestBp ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Last recorded reading</span>
                    </>
                  ) : (
                    <span className="text-slate-400">No readings recorded yet</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Blood Sugar (Random)</span>
                  <HeartPulse className="h-4 w-4 text-blue-500" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <p className="display-font text-3xl font-extrabold text-slate-900">{latestGlucose || "—"}</p>
                  {latestGlucose && <span className="text-xs text-slate-500">mg/dL</span>}
                </div>
                <p className="mt-2 text-xs text-slate-400">{latestGlucose ? "Recorded at screening" : "No glucose test recorded"}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Oxygen Saturation (SpO2)</span>
                  <Activity className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <p className="display-font text-3xl font-extrabold text-slate-900">{latestSpo2 || "—"}</p>
                  {latestSpo2 && <span className="text-xs text-slate-500">Normal</span>}
                </div>
                <p className="mt-2 text-xs text-slate-400 font-semibold">{latestPulse ? `Pulse: ${latestPulse}` : "No SpO2 recorded"}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Active Follow-up</span>
                  <Clock className="h-4 w-4 text-purple-500" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <p className="display-font text-2xl font-extrabold text-slate-900 truncate">
                    {citizenFollowUps[0]?.relativeText || "None Pending"}
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-500 truncate">
                  {citizenFollowUps[0]?.title || citizenFollowUps[0]?.reason || "No pending home visits"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* AI-Assisted Health Risk & Explainability Card */}
          {patientRiskQuery.data?.assessment && (
            <Card className="border-0 shadow-xs bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-cyan-300">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">AI-Assisted Hybrid Health Risk</span>
                        <Badge className="bg-white/15 text-white text-[10px] border-0">Prototype v1.0</Badge>
                      </div>
                      <h3 className="display-font text-lg font-bold">Comprehensive Care Priority Index</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[11px] text-slate-300 uppercase tracking-wider">Overall Risk Score</p>
                      <p className="display-font text-2xl font-extrabold text-white">
                        {patientRiskQuery.data.assessment.riskScore}
                        <span className="text-xs text-slate-400 font-normal">/100</span>
                      </p>
                    </div>
                    <Badge
                      className={`text-xs px-3 py-1 font-bold ${
                        patientRiskQuery.data.assessment.riskCategory === "CRITICAL"
                          ? "bg-rose-600 text-white"
                          : patientRiskQuery.data.assessment.riskCategory === "HIGH"
                          ? "bg-amber-500 text-white"
                          : patientRiskQuery.data.assessment.riskCategory === "MODERATE"
                          ? "bg-yellow-500 text-slate-950"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {patientRiskQuery.data.assessment.riskCategory}
                    </Badge>
                  </div>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                {/* Explainability Breakdown */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                    Contributing Health Factors & Risk Drivers
                  </h4>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {patientRiskQuery.data.assessment.contributingFactors.map((factor, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-[#f9fafb] p-3.5"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{factor.factor}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{factor.detail}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 font-bold bg-white text-slate-700">
                          +{factor.contribution} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Next Step Box */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-blue-900 text-xs block">Recommended Next Step:</span>
                      <p className="text-xs text-blue-800 mt-0.5">{patientRiskQuery.data.assessment.recommendedNextStep}</p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  {patientRiskQuery.data.assessment.modelMetadata.disclaimer}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Two-Column Action Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active Prescriptions Card */}
            <Card className="border-0 shadow-xs bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Medicine Schedule</p>
                  <CardTitle className="display-font mt-1 text-lg font-bold">Today's Prescribed Medicines</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("prescriptions")} className="text-xs font-semibold">
                  View all
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {activePrescriptions.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No active medicines.</p>
                ) : (
                  activePrescriptions.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-[#f9fafb] p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                          <Pill className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{p.medicineName}</p>
                          <p className="text-[11px] text-slate-500">{p.dosage} · {p.frequency}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-white">
                        {p.duration}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming Appointments & Follow-ups */}
            <Card className="border-0 shadow-xs bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Scheduled Care</p>
                  <CardTitle className="display-font mt-1 text-lg font-bold">Upcoming Doctor Consultations</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("appointments")} className="text-xs font-semibold">
                  Book visit
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingAppointments.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-400">
                    No scheduled visits. Click "Book visit" to request a consultation at Sundarpur PHC.
                  </div>
                ) : (
                  upcomingAppointments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-[#f9fafb] p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-700">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{a.facilityName}</p>
                          <p className="text-[11px] text-slate-500">
                            {new Date(a.scheduledAt).toLocaleDateString([], { month: "short", day: "numeric" })} · {a.type.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-0">
                        Confirmed
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. MY HEALTH VIEW */}
      {activeTab === "my_health" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-0 shadow-xs bg-white lg:col-span-1">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Patient Profile</p>
                  <CardTitle className="display-font text-xl">{displayName}</CardTitle>
                  <CardDescription>
                    {displayAge ? `Age: ${displayAge} yrs` : "Age not set"} · Gender: {displayGender}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowEditProfileModal(true);
                  }}
                  className="rounded-full text-xs font-semibold cursor-pointer"
                >
                  <UserCog className="h-3.5 w-3.5 mr-1" /> Edit Profile
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="rounded-2xl bg-[#f7f9fa] p-4 space-y-2">
                  <div className="flex justify-between"><span className="text-slate-500">ABHA Number</span><span className="font-semibold">{displayAbhaId}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Village</span><span className="font-semibold">{displayVillage}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">District</span><span className="font-semibold">{displayDistrict}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Primary Contact</span><span className="font-semibold">{user?.phone || currentPatient?.contact || "Not provided"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Blood Group</span><Badge variant="outline" className="font-bold">{displayBloodGroup}</Badge></div>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                  <span className="font-bold text-rose-800 text-[11px] uppercase tracking-wider block mb-1">Known Allergies</span>
                  <p className="text-rose-700">{displayAllergies}</p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                  <span className="font-bold text-amber-800 text-[11px] uppercase tracking-wider block mb-1">Diagnosed Conditions</span>
                  <p className="text-amber-700">{displayConditions}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-white lg:col-span-2">
              <CardHeader>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Clinical Parameters</p>
                <CardTitle className="display-font text-xl">Recorded Vitals & Trend Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[#f7f9fa] p-4">
                    <span className="text-[11px] text-slate-500 font-semibold">Systolic / Diastolic</span>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900">{latestBp || "—"}</p>
                    <span className="mt-1 block text-[10px] text-slate-500 font-medium">
                      {latestBp ? "Latest reading" : "No BP recorded"}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-[#f7f9fa] p-4">
                    <span className="text-[11px] text-slate-500 font-semibold">Blood Glucose</span>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900">{latestGlucose ? `${latestGlucose} mg/dL` : "—"}</p>
                    <span className="mt-1 block text-[10px] text-slate-500">
                      {latestGlucose ? "Screening check" : "No glucose recorded"}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-[#f7f9fa] p-4">
                    <span className="text-[11px] text-slate-500 font-semibold">BMI / Weight</span>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900">
                      {latestBmi || latestWeight ? `${latestBmi || "—"} / ${latestWeight || "—"}` : "—"}
                    </p>
                    <span className="mt-1 block text-[10px] text-slate-500">
                      {latestBmi ? "Calculated parameter" : "No anthropometry recorded"}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-black/5 bg-[#eaf2f7] p-5">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <ShieldCheck className="h-4 w-4 text-[#4786a8]" />
                    <span>AI Care Recommendations</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-700">
                    {latestVisit?.aiSummary || (currentPatient?.conditions ? `Care plan active for ${currentPatient.conditions}. Maintain healthy diet, ensure regular hydration, and attend scheduled follow-ups with your ASHA worker.` : "Welcome to your personal healthcare workspace. Once clinical visits or screenings are recorded by your ASHA worker or doctor, personalized insights and risk alerts will be shown here.")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 3. FAMILY VIEW */}
      {activeTab === "family" && (
        <div className="space-y-4">
          {familyMembers.length === 0 ? (
            <Card className="border-0 shadow-xs bg-white text-center py-12">
              <CardContent className="space-y-3">
                <Users className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-base">No Family Members Registered</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Add your family members or dependents to monitor their health records, prescriptions, and appointments together.
                </p>
                <Button onClick={() => setShowAddFamily(true)} className="rounded-full bg-[#15181b] text-white text-xs font-semibold mt-2">
                  <Plus className="mr-1.5 h-4 w-4" /> Add First Family Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {familyMembers.map((member) => (
                <Card key={member.id} className="border-0 shadow-xs bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-700">
                          {member.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{member.name}</h3>
                          <p className="text-xs text-slate-500">{member.age} yrs · {member.gender}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${member.riskCategory === "high" || member.riskCategory === "critical" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                        {member.riskCategory || "low"} risk
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      <p><strong>Conditions:</strong> {member.conditions || "None declared"}</p>
                      <p><strong>Allergies:</strong> {member.allergies || "None"}</p>
                      <p><strong>Contact:</strong> {member.contact || "Shared household"}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. HEALTH HISTORY VIEW */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader>
              <CardTitle className="display-font text-lg font-bold">Chronological Visit Records</CardTitle>
              <CardDescription>All clinical encounters recorded at Sub-Centres, PHCs, or field rounds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(visits.data?.visits || []).length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-400">No past visits recorded.</p>
              ) : (
                visits.data?.visits.map((v) => (
                  <div key={v.id} className="relative rounded-2xl border border-slate-100 bg-[#f9fafb] p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">
                        {v.diagnosis || "Health Visit & Screening"}
                      </span>
                      <Badge className="bg-slate-200 text-slate-800 text-[10px]">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    <p className="mt-2 text-slate-600"><strong>Symptoms & Notes:</strong> {v.symptoms || "Routine checkup"}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      {v.bpSystolic && <span className="rounded-md bg-white px-2 py-0.5 border">BP: {v.bpSystolic}/{v.bpDiastolic}</span>}
                      {v.glucose && <span className="rounded-md bg-white px-2 py-0.5 border">Sugar: {v.glucose} mg/dL</span>}
                      {v.spo2 && <span className="rounded-md bg-white px-2 py-0.5 border">SpO2: {v.spo2}%</span>}
                    </div>
                    {v.aiSummary && (
                      <p className="mt-2.5 rounded-xl bg-[#eaf2f7] p-2.5 text-[11px] text-slate-700">
                        <strong>AI Summary:</strong> {v.aiSummary}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. APPOINTMENTS VIEW */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="display-font text-lg font-bold">Doctor Consultations & Appointments</CardTitle>
                <CardDescription>Scheduled consultations at nearby PHC and Sub-Centres</CardDescription>
              </div>
              <Button onClick={() => setShowBookAppt(true)} size="sm" className="rounded-full bg-[#15181b] text-white text-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Book Consultation
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {allAppointments.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-400 space-y-2">
                  <Calendar className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">No scheduled appointments</p>
                  <p className="text-xs text-slate-400">Click "Book Consultation" to request a doctor visit or checkup.</p>
                </div>
              ) : (
                allAppointments.map((a: any) => (
                  <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-[#f9fafb] p-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{a.facilityName}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{(a.type || "general_opd").replace("_", " ")}</Badge>
                      </div>
                      <p className="mt-1 text-slate-500">
                        Scheduled: <strong>{new Date(a.scheduledAt).toLocaleString()}</strong>
                      </p>
                      {a.patientName && a.patientName !== displayName && (
                        <p className="mt-0.5 text-slate-500">Patient: <strong className="text-slate-700">{a.patientName}</strong></p>
                      )}
                      {a.notes && <p className="mt-1 text-slate-600">Reason: {a.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={a.status === "scheduled" || !a.status ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}>
                        {a.status || "scheduled"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. REFERRALS VIEW */}
      {activeTab === "referrals" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader>
              <CardTitle className="display-font text-lg font-bold">Referral & Specialist Care Pipeline</CardTitle>
              <CardDescription>Track handovers from village Sub-Centres to CHCs and District Hospitals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {citizenReferrals.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-[#f9fafb] p-8 text-center text-slate-400">
                  <Navigation className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="font-semibold text-sm text-slate-600">No active inter-facility referrals</p>
                  <p className="text-xs text-slate-400 mt-1">When your doctor or ASHA worker escalates care to a CHC or District Hospital, live referral tracking and ambulance status will appear here.</p>
                </div>
              ) : (
                citizenReferrals.map((r: any) => {
                  const stages = [
                    { key: "PENDING", label: "Requested" },
                    { key: "ACCEPTED", label: "Accepted" },
                    { key: "TRANSPORT_ASSIGNED", label: "108 Transport" },
                    { key: "DEPARTED", label: "In Transit" },
                    { key: "ARRIVED", label: "At Facility" },
                    { key: "CONSULTED", label: "Consulted" },
                    { key: "COMPLETED", label: "Completed" },
                  ];
                  const currentIdx = stages.findIndex((s) => s.key === r.status);
                  const isCancelled = r.status === "CANCELLED";

                  return (
                    <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                      {/* Top Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-base">
                              {r.targetFacilityName || "District Hospital"}
                            </span>
                            <Badge className="bg-purple-100 text-purple-800 border-0 text-[10px] font-bold">
                              {r.specialty || "Specialist Care"}
                            </Badge>
                            {r.recommendationScore && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-bold">
                                Match Score: {r.recommendationScore}/100
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 inline" />
                            {r.distanceKm ? `${r.distanceKm} km away` : "Nearby referral center"} · Urgency:{" "}
                            <span className={r.urgency === "emergency" ? "text-rose-600 font-bold uppercase" : "text-amber-700 font-semibold uppercase"}>
                              {r.urgency}
                            </span>
                          </p>
                        </div>
                        <Badge
                          className={`self-start sm:self-auto uppercase tracking-wide text-xs px-3 py-1 font-bold ${
                            isCancelled
                              ? "bg-rose-100 text-rose-800"
                              : r.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "CONSULTED"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          Status: {r.status?.replace("_", " ")}
                        </Badge>
                      </div>

                      {/* 8-Stage Progress Tracker */}
                      {!isCancelled ? (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-700 mb-2">Transit & Care Progression</p>
                          <div className="grid grid-cols-7 gap-1 text-center">
                            {stages.map((stage, idx) => {
                              const isPast = currentIdx >= idx;
                              const isCurrent = currentIdx === idx;
                              return (
                                <div key={stage.key} className="flex flex-col items-center">
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                                      isCurrent
                                        ? "bg-[#15181b] text-white ring-2 ring-purple-400 scale-110"
                                        : isPast
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-200 text-slate-400"
                                    }`}
                                  >
                                    {isPast && !isCurrent ? "✓" : idx + 1}
                                  </div>
                                  <span className={`text-[9px] leading-tight font-medium ${isCurrent ? "font-bold text-slate-950" : isPast ? "text-emerald-700" : "text-slate-400"}`}>
                                    {stage.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
                          <strong>Referral Cancelled:</strong> {r.cancellationReason || "Care diverted or cancelled."}
                        </div>
                      )}

                      {/* Details & Transport Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#fbfcfd] p-3 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-slate-500 font-medium">Clinical Reason:</p>
                          <p className="text-slate-800 font-semibold mt-0.5">{r.reason}</p>
                          {r.outcome && (
                            <div className="mt-2 text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-[11px]">
                              <strong>Doctor Outcome:</strong> {r.outcome}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l sm:pl-3 border-slate-200">
                          <p className="text-slate-500 font-medium">Assigned Transport / Ambulance:</p>
                          <p className="text-slate-800 font-bold">
                            {r.transportVehicle || "108 Emergency Ambulance (On Standby)"}
                          </p>
                          {r.transportDriverContact && (
                            <p className="text-slate-600 text-[11px]">
                              Driver Contact: <strong className="text-slate-900">{r.transportDriverContact}</strong>
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">
                            Authorized by: {r.sourceFacilityName || "Ayushman Arogya Mandir"} ·{" "}
                            {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Timeline Events Accordion */}
                      {r.events && r.events.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-500" /> Event & Handover Audit Trail ({r.events.length})
                          </span>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {r.events.map((ev: any) => (
                              <div key={ev.id} className="flex items-start justify-between bg-slate-50 p-2 rounded-lg text-[11px] border border-slate-100">
                                <div>
                                  <span className="font-bold text-slate-800 uppercase text-[10px] bg-white px-1.5 py-0.5 rounded border mr-1.5">
                                    {ev.status.replace("_", " ")}
                                  </span>
                                  <span className="text-slate-700">{ev.notes}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                                  {new Date(ev.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 7. PRESCRIPTIONS VIEW */}
      {activeTab === "prescriptions" && (
        <div className="space-y-4">
          {/* Executive Header Card */}
          <Card className="border-0 shadow-xs bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white/20 text-white font-mono text-[10px] border-0">ABHA: 91-8201-9921</Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] border-emerald-400/30">Active Regimen</Badge>
                  </div>
                  <h2 className="display-font text-xl sm:text-2xl font-black tracking-tight">
                    Personal Prescription & Medication Care Plan
                  </h2>
                  <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
                    Clear daily schedule authorized by <strong>Dr. Rajesh Sharma, MD</strong> (Sundarpur Ayushman Arogya Mandir). Live availability linked with central health centres.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => {
                      setMedicineSearchQuery(activePrescriptions[0]?.medicineName || "Paracetamol");
                      setShowMedicineFinderModal(true);
                    }}
                    className="rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-9 shadow-sm"
                  >
                    <Search className="h-3.5 w-3.5 mr-1.5" /> Check Centre Stock
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowPrintModal(true)}
                    className="rounded-full bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs h-9 shadow-sm"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / Save Rx Slip
                  </Button>
                </div>
              </div>

              {/* Quick Tab Selector */}
              <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <button
                  onClick={() => setPrescriptionTab("summary")}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    prescriptionTab === "summary" ? "bg-white text-slate-950 shadow-sm" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Sunrise className="h-3.5 w-3.5 text-amber-400" /> Daily Timetable Summary
                </button>
                <button
                  onClick={() => setPrescriptionTab("active")}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    prescriptionTab === "active" ? "bg-white text-slate-950 shadow-sm" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Pill className="h-3.5 w-3.5 text-purple-300" /> Active Prescriptions ({activePrescriptions.length})
                </button>
                <button
                  onClick={() => setPrescriptionTab("history")}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    prescriptionTab === "history" ? "bg-white text-slate-950 shadow-sm" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 text-blue-300" /> Complete Rx History ({prescriptions.data?.length || 0})
                </button>
              </div>
            </CardContent>
          </Card>

          {/* TAB 1: DAILY TIMETABLE SUMMARY */}
          {prescriptionTab === "summary" && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {/* Morning Slot */}
                <Card className="border-0 shadow-xs bg-white relative overflow-hidden">
                  <div className="h-1.5 w-full bg-amber-400" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
                          <Sunrise className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-slate-900">Morning Dose</CardTitle>
                          <span className="text-[10px] text-slate-400 font-medium">Around 8:00 AM (Breakfast)</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-50/60 text-amber-700 border-amber-200 text-[10px]">
                        {(prescriptionSummary.data?.dailyTimetable?.morning || []).length} Meds
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5 pt-2 text-xs">
                    {(prescriptionSummary.data?.dailyTimetable?.morning || []).length === 0 ? (
                      <p className="text-slate-400 py-3 text-center text-xs">No morning medications prescribed.</p>
                    ) : (
                      (prescriptionSummary.data?.dailyTimetable?.morning || []).map((rx) => (
                        <div key={rx.id} className="rounded-xl border border-slate-100 bg-[#f9fafb] p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-900">{rx.medicineName}</h4>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] font-mono">
                              {rx.route || "Oral"}
                            </Badge>
                          </div>
                          <p className="text-slate-600 text-[11px] font-medium">Strength: <strong className="text-slate-800">{rx.dosage}</strong></p>
                          {rx.instructions && (
                            <p className="text-amber-800 text-[11px] bg-amber-50/80 p-1.5 rounded-lg">
                              💡 {rx.instructions}
                            </p>
                          )}
                          {/* Timetable Availability Badge */}
                          <div className="rounded-lg bg-white p-2 border border-slate-200/80 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-slate-500 uppercase">Availability</span>
                              <Badge
                                className={`text-[9px] px-1.5 py-0.2 font-bold ${
                                  rx.availabilityStatus === "AVAILABLE" || rx.citizenAvailability?.availability === "Available"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : rx.availabilityStatus === "LOW_STOCK" || rx.citizenAvailability?.availability === "Low Stock"
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : "bg-rose-100 text-rose-800 border-rose-300"
                                }`}
                              >
                                {rx.citizenAvailability?.availability || (rx.availabilityStatus === "AVAILABLE" ? "Available" : rx.availabilityStatus === "LOW_STOCK" ? "Low Stock" : "Unavailable")}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                              <span>Centre: <strong>{rx.facilityName || "Sundarpur PHC"}</strong></span>
                              <button
                                onClick={() => {
                                  setMedicineSearchQuery(rx.medicineName);
                                  setShowMedicineFinderModal(true);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                              >
                                Find nearby
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Afternoon Slot */}
                <Card className="border-0 shadow-xs bg-white relative overflow-hidden">
                  <div className="h-1.5 w-full bg-orange-400" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 text-orange-600">
                          <Sun className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-slate-900">Afternoon Dose</CardTitle>
                          <span className="text-[10px] text-slate-400 font-medium">Around 1:30 PM (Lunch)</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-orange-50/60 text-orange-700 border-orange-200 text-[10px]">
                        {(prescriptionSummary.data?.dailyTimetable?.afternoon || []).length} Meds
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5 pt-2 text-xs">
                    {(prescriptionSummary.data?.dailyTimetable?.afternoon || []).length === 0 ? (
                      <p className="text-slate-400 py-3 text-center text-xs">No afternoon medications prescribed.</p>
                    ) : (
                      (prescriptionSummary.data?.dailyTimetable?.afternoon || []).map((rx) => (
                        <div key={rx.id} className="rounded-xl border border-slate-100 bg-[#f9fafb] p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-900">{rx.medicineName}</h4>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] font-mono">
                              {rx.route || "Oral"}
                            </Badge>
                          </div>
                          <p className="text-slate-600 text-[11px] font-medium">Strength: <strong className="text-slate-800">{rx.dosage}</strong></p>
                          {rx.instructions && (
                            <p className="text-orange-800 text-[11px] bg-orange-50/80 p-1.5 rounded-lg">
                              💡 {rx.instructions}
                            </p>
                          )}
                          {/* Timetable Availability Badge */}
                          <div className="rounded-lg bg-white p-2 border border-slate-200/80 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-slate-500 uppercase">Availability</span>
                              <Badge
                                className={`text-[9px] px-1.5 py-0.2 font-bold ${
                                  rx.availabilityStatus === "AVAILABLE" || rx.citizenAvailability?.availability === "Available"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : rx.availabilityStatus === "LOW_STOCK" || rx.citizenAvailability?.availability === "Low Stock"
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : "bg-rose-100 text-rose-800 border-rose-300"
                                }`}
                              >
                                {rx.citizenAvailability?.availability || (rx.availabilityStatus === "AVAILABLE" ? "Available" : rx.availabilityStatus === "LOW_STOCK" ? "Low Stock" : "Unavailable")}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                              <span>Centre: <strong>{rx.facilityName || "Sundarpur PHC"}</strong></span>
                              <button
                                onClick={() => {
                                  setMedicineSearchQuery(rx.medicineName);
                                  setShowMedicineFinderModal(true);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                              >
                                Find nearby
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Night Slot */}
                <Card className="border-0 shadow-xs bg-white relative overflow-hidden">
                  <div className="h-1.5 w-full bg-indigo-500" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                          <Moon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-slate-900">Night / Bedtime</CardTitle>
                          <span className="text-[10px] text-slate-400 font-medium">Around 9:30 PM (After dinner)</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-indigo-50/60 text-indigo-700 border-indigo-200 text-[10px]">
                        {(prescriptionSummary.data?.dailyTimetable?.night || []).length} Meds
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5 pt-2 text-xs">
                    {(prescriptionSummary.data?.dailyTimetable?.night || []).length === 0 ? (
                      <p className="text-slate-400 py-3 text-center text-xs">No night medications prescribed.</p>
                    ) : (
                      (prescriptionSummary.data?.dailyTimetable?.night || []).map((rx) => (
                        <div key={rx.id} className="rounded-xl border border-slate-100 bg-[#f9fafb] p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-900">{rx.medicineName}</h4>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] font-mono">
                              {rx.route || "Oral"}
                            </Badge>
                          </div>
                          <p className="text-slate-600 text-[11px] font-medium">Strength: <strong className="text-slate-800">{rx.dosage}</strong></p>
                          {rx.instructions && (
                            <p className="text-indigo-800 text-[11px] bg-indigo-50/80 p-1.5 rounded-lg">
                              💡 {rx.instructions}
                            </p>
                          )}
                          {/* Timetable Availability Badge */}
                          <div className="rounded-lg bg-white p-2 border border-slate-200/80 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-slate-500 uppercase">Availability</span>
                              <Badge
                                className={`text-[9px] px-1.5 py-0.2 font-bold ${
                                  rx.availabilityStatus === "AVAILABLE" || rx.citizenAvailability?.availability === "Available"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : rx.availabilityStatus === "LOW_STOCK" || rx.citizenAvailability?.availability === "Low Stock"
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : "bg-rose-100 text-rose-800 border-rose-300"
                                }`}
                              >
                                {rx.citizenAvailability?.availability || (rx.availabilityStatus === "AVAILABLE" ? "Available" : rx.availabilityStatus === "LOW_STOCK" ? "Low Stock" : "Unavailable")}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                              <span>Centre: <strong>{rx.facilityName || "Sundarpur PHC"}</strong></span>
                              <button
                                onClick={() => {
                                  setMedicineSearchQuery(rx.medicineName);
                                  setShowMedicineFinderModal(true);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                              >
                                Find nearby
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Safety & Advisory Notice */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-blue-950">Safe Medication Guidance</h4>
                  <p className="text-blue-800 text-xs leading-relaxed">
                    Do not adjust dosages or discontinue prescribed medicines without consulting your doctor or village CHO/ASHA worker. If you miss a dose, take it as soon as you remember unless it is near the time for your next scheduled dose.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE DETAILED PRESCRIPTIONS */}
          {prescriptionTab === "active" && (
            <div className="space-y-4">
              {activePrescriptions.length === 0 ? (
                <Card className="border-0 shadow-xs bg-white p-8 text-center text-slate-400">
                  <Pill className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No active prescriptions on file.</p>
                </Card>
              ) : (
                activePrescriptions.map((p) => (
                  <Card key={p.id} className="border-0 shadow-xs bg-white overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-purple-100 text-purple-800 font-bold">
                            <Pill className="h-6 w-6" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-base text-slate-900">{p.medicineName}</h3>
                              <Badge className="bg-purple-600 text-white text-[10px] font-mono">
                                {p.route || "Oral"}
                              </Badge>
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                ACTIVE
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600 font-medium">
                              Strength: <strong className="text-slate-800">{p.dosage}</strong> · Schedule: <strong className="text-slate-800">{p.frequency}</strong> · Duration: <strong className="text-slate-800">{p.duration}</strong>
                            </p>
                            {p.instructions && (
                              <p className="text-xs text-slate-700 bg-slate-50 border border-slate-100 p-2 rounded-xl mt-1 font-medium">
                                <strong>Doctor Directions:</strong> {p.instructions}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                              <span>Prescribed on: {new Date(p.createdAt).toLocaleDateString()}</span>
                              {p.doctorName && <span>Doctor: {p.doctorName}</span>}
                              {p.facilityName && <span>PHC: {p.facilityName}</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Citizen View: Medicine, Availability, Facility */}
                      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <div className="flex items-center gap-2">
                            <Hospital className="h-4 w-4 text-indigo-600" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              Government Health Centre Availability
                            </span>
                          </div>
                          <Badge
                            className={`text-xs font-bold px-2.5 py-0.5 ${
                              p.availabilityStatus === "AVAILABLE" || p.citizenAvailability?.availability === "Available"
                                ? "bg-emerald-600 text-white"
                                : p.availabilityStatus === "LOW_STOCK" || p.citizenAvailability?.availability === "Low Stock"
                                ? "bg-amber-500 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {p.citizenAvailability?.availability || (p.availabilityStatus === "AVAILABLE" ? "Available" : p.availabilityStatus === "LOW_STOCK" ? "Low Stock" : "Unavailable")}
                          </Badge>
                        </div>

                        {/* Exact Citizen Card Format Display */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Medicine</span>
                            <span className="font-extrabold text-sm text-slate-900 mt-0.5 block">{p.medicineName}</span>
                          </div>

                          <div className="rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Availability</span>
                            <span className={`font-extrabold text-sm mt-0.5 block ${
                              p.availabilityStatus === "AVAILABLE" || p.citizenAvailability?.availability === "Available"
                                ? "text-emerald-600"
                                : p.availabilityStatus === "LOW_STOCK" || p.citizenAvailability?.availability === "Low Stock"
                                ? "text-amber-600"
                                : "text-rose-600"
                            }`}>
                              {p.citizenAvailability?.availability || (p.availabilityStatus === "AVAILABLE" ? "Available" : p.availabilityStatus === "LOW_STOCK" ? "Low Stock" : "Unavailable")}
                            </span>
                          </div>

                          <div className="rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Facility</span>
                            <span className="font-extrabold text-sm text-slate-900 mt-0.5 block">{p.facilityName || "Sundarpur PHC"}</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            Free medicine dispensing under Mukhyamantri Amrutum & Jan Aushadhi Scheme
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setMedicineSearchQuery(p.medicineName);
                              setShowMedicineFinderModal(true);
                            }}
                            className="rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs h-8 px-3.5 shrink-0 cursor-pointer"
                          >
                            <MapPin className="h-3.5 w-3.5 mr-1.5 text-indigo-600" /> Search Nearby Centres
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB 3: COMPLETE PRESCRIPTION HISTORY */}
          {prescriptionTab === "history" && (
            <div className="space-y-3">
              <Card className="border-0 shadow-xs bg-white">
                <CardHeader>
                  <CardTitle className="display-font text-base font-bold">Prescription History Timeline</CardTitle>
                  <CardDescription className="text-xs">Complete chronological record of past and active medications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {(prescriptions.data || []).map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-[#f9fafb] p-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{p.medicineName}</h4>
                          <Badge variant="outline" className="text-[10px] font-mono">{p.route || "Oral"}</Badge>
                          <Badge
                            className={
                              p.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "dispensed"
                                ? "bg-blue-100 text-blue-800"
                                : p.status === "completed"
                                ? "bg-slate-200 text-slate-700"
                                : "bg-rose-100 text-rose-800"
                            }
                          >
                            {p.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-slate-600">
                          {p.dosage} · {p.frequency} · {p.duration} {p.instructions && `· ${p.instructions}`}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Prescribed: {new Date(p.createdAt).toLocaleDateString()} · By: {p.doctorName || "Dr. Rajesh Sharma, MD"} · Facility: {p.facilityName || "Sundarpur PHC"}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* 8. FOLLOW-UPS VIEW */}
      {activeTab === "followups" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="display-font text-xl font-bold text-slate-900">Home Follow-ups & Care Reminders</h2>
              <p className="text-xs text-slate-500">Care visits scheduled by your doctor for home recovery monitoring and vitals verification</p>
            </div>
          </div>

          {(() => {
            const allItems = citizenFollowUps;
            const upcoming = allItems.filter(
              (f) => (f.status || "").toUpperCase() === "OPEN" || (f.status || "").toUpperCase() === "DUE_SOON" || (f.status || "").toUpperCase() === "OVERDUE"
            );
            const history = allItems.filter(
              (f) => (f.status || "").toUpperCase() === "COMPLETED" || (f.status || "").toUpperCase() === "CANCELLED"
            );

            const getPrepAdvice = (reason: string, notes?: string | null) => {
              const text = `${reason} ${notes || ""}`.toLowerCase();
              if (text.includes("bp") || text.includes("pressure") || text.includes("hypertension")) {
                return "Sit comfortably for 5 minutes before your worker arrives. Keep your blood pressure medication strips and previous test slips handy.";
              }
              if (text.includes("sugar") || text.includes("glucose") || text.includes("diabet")) {
                return "Note whether you have eaten or taken your diabetes medicine today. Keep your glucometer log (if any) ready for review.";
              }
              if (text.includes("pregnancy") || text.includes("anc") || text.includes("maternal")) {
                return "Keep your Mother & Child Protection (MCP) card, iron-folic acid tablets, and latest scan reports ready.";
              }
              if (text.includes("inhaler") || text.includes("copd") || text.includes("asthma")) {
                return "Have your inhaler device ready so the worker can check your inhalation technique and dose counter.";
              }
              return "Keep your doctor prescription slip and current medicine strips on the table for quick verification by the health worker.";
            };

            const getRelativeCountdown = (dueAt: Date | string, status: string) => {
              const now = new Date();
              const due = new Date(dueAt);
              const diffMs = due.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / 86400000);
              const upper = (status || "").toUpperCase();
              if (upper === "COMPLETED") return { text: "Completed", isOverdue: false, isDueSoon: false };
              if (upper === "CANCELLED") return { text: "Cancelled", isOverdue: false, isDueSoon: false };
              if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`, isOverdue: true, isDueSoon: false };
              if (diffDays === 0) return { text: "Due today", isOverdue: false, isDueSoon: true };
              if (diffDays === 1) return { text: "Due tomorrow", isOverdue: false, isDueSoon: true };
              if (diffDays === 2) return { text: "Due in 2 days", isOverdue: false, isDueSoon: true };
              return { text: `Due in ${diffDays} days`, isOverdue: false, isDueSoon: false };
            };

            return (
              <div className="space-y-6">
                {/* UPCOMING FOLLOW-UPS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      Upcoming Home Care Visits ({upcoming.length})
                    </h3>
                  </div>

                  {upcoming.length === 0 ? (
                    <Card className="border-0 shadow-xs bg-white text-center py-8">
                      <CardContent>
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-bold text-slate-700 text-sm">No pending home follow-ups</p>
                        <p className="text-xs text-slate-400 mt-0.5">Your doctor will schedule visits whenever follow-up monitoring is required.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {upcoming.map((f) => {
                        const countdown = getRelativeCountdown(f.dueAt, f.status);
                        const prep = getPrepAdvice(f.reason || f.title, f.notes);

                        return (
                          <Card
                            key={f.id}
                            className={`border transition-all shadow-xs ${
                              countdown.isOverdue
                                ? "border-rose-300 bg-rose-50/20"
                                : countdown.isDueSoon
                                ? "border-amber-300 bg-amber-50/20"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <CardContent className="p-4 sm:p-5 text-xs space-y-3">
                              {/* Header & Badges */}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Clinical Indication
                                  </span>
                                  <h4 className="font-bold text-sm text-slate-900 mt-0.5">
                                    {f.reason || f.title}
                                  </h4>
                                </div>
                                <Badge
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                                    countdown.isOverdue
                                      ? "bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
                                      : countdown.isDueSoon
                                      ? "bg-amber-100 text-amber-800 border-amber-200"
                                      : "bg-sky-100 text-sky-800 border-sky-200"
                                  }`}
                                >
                                  {countdown.text}
                                </Badge>
                              </div>

                              {/* Scheduled Date */}
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span>Scheduled for: <strong className="text-slate-800">{new Date(f.dueAt).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</strong></span>
                              </div>

                              {/* Linked Referral Context */}
                              {f.referral && (
                                <div className="p-2 rounded-xl bg-purple-50/80 border border-purple-100 text-purple-900 text-[11px] flex items-center gap-1.5">
                                  <Hospital className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                  <span>
                                    Follow-up linked to <strong>{f.referral.targetFacilityName}</strong> ({f.referral.specialty})
                                  </span>
                                </div>
                              )}

                              {/* Doctor's Advice / Notes */}
                              {f.notes && (
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 space-y-0.5">
                                  <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block">Doctor's Instructions</span>
                                  <p className="text-slate-800 leading-relaxed">{f.notes}</p>
                                </div>
                              )}

                              {/* Patient Preparation Box */}
                              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100/80 text-blue-950 space-y-1">
                                <span className="font-bold text-[10px] text-blue-700 uppercase tracking-wider block flex items-center gap-1">
                                  <Info className="h-3 w-3 text-blue-600" /> How to Prepare for Home Visit
                                </span>
                                <p className="text-[11px] text-blue-900 leading-relaxed">{prep}</p>
                              </div>

                              {/* Assigned Health Worker Info & Call Shortcut */}
                              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                                    {(f.workerName || "ASHA")[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-xs">{f.workerName || "Sunita Devi"}</p>
                                    <p className="text-[10px] text-slate-400">{f.workerRole || "ASHA Worker"} · {f.village || "Sundarpur"}</p>
                                  </div>
                                </div>
                                {f.workerContact && (
                                  <a
                                    href={`tel:${f.workerContact}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs transition-colors border border-emerald-200/60"
                                  >
                                    <Phone className="h-3 w-3" /> Call ASHA
                                  </a>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PAST CHECKUP HISTORY */}
                {history.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Past Checkup History & Completed Directives ({history.length})
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {history.map((f) => (
                        <Card key={f.id} className="border border-slate-100 bg-white shadow-xs">
                          <CardContent className="p-4 text-xs space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-bold text-slate-900 text-xs">{f.reason || f.title}</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Conducted: {f.completedAt ? new Date(f.completedAt).toLocaleDateString() : new Date(f.dueAt).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                {f.status}
                              </Badge>
                            </div>
                            {f.completionNotes && (
                              <p className="text-slate-600 bg-slate-50 p-2 rounded-lg text-[11px]">
                                <strong>Outcome:</strong> {f.completionNotes}
                              </p>
                            )}
                            {f.vitals && (
                              <div className="flex flex-wrap gap-2 text-[10px] text-slate-700 bg-emerald-50/50 border border-emerald-100 p-2 rounded-lg">
                                {f.vitals.bpSystolic && <span>BP: <strong>{f.vitals.bpSystolic}/{f.vitals.bpDiastolic} mmHg</strong></span>}
                                {f.vitals.glucose && <span>Glucose: <strong>{f.vitals.glucose} mg/dL</strong></span>}
                                {f.vitals.spo2 && <span>SpO2: <strong>{f.vitals.spo2}%</strong></span>}
                                {f.vitals.temperature && <span>Temp: <strong>{f.vitals.temperature}°F</strong></span>}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500 pt-1 flex justify-between border-t border-slate-100">
                              <span>Health Worker: {f.workerName || "ASHA Worker"}</span>
                              {f.completedByName && <span>Verified: {f.completedByName}</span>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 9. NEARBY FACILITIES VIEW */}
      {activeTab === "facilities" && (
        <div className="space-y-4">
          <HealthcareFacilityMap defaultOriginVillage={currentPatient?.village || "Sundarpur"} />
        </div>
      )}

      {/* 10. AI ASSISTANT VIEW */}
      {activeTab === "ai_assistant" && (
        <Card className="border-0 shadow-xs bg-white flex flex-col h-[650px]">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#15181b] text-white">
                  <Sparkles className="h-5 w-5 text-[#8dc5e3]" />
                </div>
                <div>
                  <CardTitle className="display-font text-lg font-bold">Arjuna Health Assistant</CardTitle>
                  <CardDescription className="text-xs">Multilingual rural health triage & safe guidance</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setLanguage("en")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${language === "en" ? "bg-white shadow-xs text-black" : "text-slate-500"}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage("hi")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${language === "hi" ? "bg-white shadow-xs text-black" : "text-slate-500"}`}
                >
                  हिंदी
                </button>
                <button
                  onClick={() => setLanguage("gu")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${language === "gu" ? "bg-white shadow-xs text-black" : "text-slate-500"}`}
                >
                  ગુજરાતી
                </button>
              </div>
            </div>
          </CardHeader>

          {/* Chat Stream */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#15181b] text-white rounded-br-none"
                      : "bg-[#f0f5f9] text-slate-800 rounded-bl-none"
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.action && (
                    <div className="mt-2.5 rounded-xl bg-white/80 p-2.5 text-slate-900 font-bold border border-black/5">
                      Recommended Action: {msg.action}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
            {aiChat.isPending && (
              <div className="flex items-center gap-2 text-xs text-slate-500 p-2">
                <Sparkles className="h-4 w-4 animate-spin text-blue-500" />
                <span>Reviewing health guidelines and calculating safety-net advice…</span>
              </div>
            )}
          </CardContent>

          {/* Chat Input */}
          <div className="border-t border-slate-100 p-3 bg-[#f9fafb] flex items-center gap-2 rounded-b-2xl">
            <Input
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={
                language === "gu"
                  ? "તમારા લક્ષણો અથવા દવા વિશે પૂછો..."
                  : language === "hi"
                  ? "अपने लक्षण या दवा के बारे में पूछें..."
                  : "Type symptoms, medicine questions, or health queries..."
              }
              className="rounded-full border-slate-200 bg-white text-xs"
            />
            <Button onClick={handleSendMessage} disabled={aiChat.isPending || !inputMsg.trim()} className="rounded-full bg-[#15181b] px-4 text-white">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* 11. NOTIFICATIONS VIEW */}
      {activeTab === "notifications" && (
        <div className="space-y-3">
          {(alerts.data || []).map((alert) => (
            <Card key={alert.id} className="border-0 shadow-xs bg-white">
              <CardContent className="p-4 flex items-start gap-3 text-xs">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{alert.title}</span>
                    <span className="text-[10px] text-slate-400">{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-slate-600 leading-relaxed">{alert.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL: Book Appointment */}
      {showBookAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Book Doctor Consultation</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Select visit type and scheduled date</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowBookAppt(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Health Facility *</label>
                <select
                  value={appointmentForm.facilityId || facilitiesList[0]?.id || 1}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, facilityId: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-[#f9fafb] dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-900"
                >
                  {facilitiesList.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.facilityType ? String(f.facilityType).toUpperCase().replace("_", " ") : "PHC"} · {f.district || "Maharashtra"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Consultation Type</label>
                <select
                  value={appointmentForm.type}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, type: e.target.value as any })}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-[#f9fafb] dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="general_opd">General OPD</option>
                  <option value="ncd_followup">NCD & Hypertension Review</option>
                  <option value="anc_checkup">Antenatal (ANC) Checkup</option>
                  <option value="teleconsultation">Teleconsultation</option>
                  <option value="specialist">Specialist Consultation</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Preferred Date & Time</label>
                <Input
                  type="datetime-local"
                  value={appointmentForm.scheduledAt}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduledAt: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Chief Symptoms / Reason</label>
                <Textarea
                  value={appointmentForm.notes}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                  placeholder="Describe your symptoms or reason for visit..."
                  className="mt-1 text-xs resize-none"
                />
              </div>
              <Button
                onClick={handleBookAppointment}
                disabled={isBookingAppt || createAppointment.isPending}
                className="w-full rounded-full bg-[#15181b] dark:bg-slate-700 text-white mt-2 cursor-pointer"
              >
                {isBookingAppt || createAppointment.isPending ? "Submitting…" : "Confirm Booking"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Add Family Member */}
      {showAddFamily && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Add Family Member</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Register a member to your household record</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddFamily(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                <Input
                  value={familyForm.name}
                  onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Patel"
                  className="mt-1 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Age</label>
                  <Input
                    type="number"
                    value={familyForm.age}
                    onChange={(e) => setFamilyForm({ ...familyForm, age: e.target.value })}
                    placeholder="e.g. 35"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Gender</label>
                  <select
                    value={familyForm.gender}
                    onChange={(e) => setFamilyForm({ ...familyForm, gender: e.target.value as any })}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-[#f9fafb] dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Known Conditions</label>
                <Input
                  value={familyForm.conditions}
                  onChange={(e) => setFamilyForm({ ...familyForm, conditions: e.target.value })}
                  placeholder="e.g. Diabetes, Asthma (or leave empty)"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Allergies</label>
                <Input
                  value={familyForm.allergies}
                  onChange={(e) => setFamilyForm({ ...familyForm, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Pollen"
                  className="mt-1 text-xs"
                />
              </div>
              <Button
                onClick={handleAddFamilyMember}
                disabled={isAddingFamily || createFamilyMember.isPending}
                className="w-full rounded-full bg-[#15181b] dark:bg-slate-700 text-white mt-2 cursor-pointer"
              >
                {isAddingFamily || createFamilyMember.isPending ? "Saving…" : "Add Member"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Printable Official Digital Prescription Slip */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-700 dark:text-indigo-400" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Official Digital Prescription (e-Rx Slip)</CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Ayushman Bharat Digital Mission (ABDM) Compliant</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPrintModal(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              {/* Prescription Header */}
              <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 uppercase tracking-tight">Sundarpur Ayushman Arogya Mandir</h3>
                  <p className="text-slate-600 dark:text-slate-300">Health & Wellness Centre, Ahmedabad Rural District, Gujarat</p>
                  <p className="text-slate-500 dark:text-slate-400 font-mono text-[10px] mt-0.5">Facility Registry Code: HWC-GJ-AMD-0041</p>
                </div>
                <div className="sm:text-right text-xs">
                  <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-mono">
                    Rx Group #{activePrescriptions[0]?.prescriptionGroupId || "RX-GRP-1001"}
                  </Badge>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Beneficiary Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Patient Name</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{displayName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Age / Gender</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{displayAge ? `${displayAge} yrs` : "—"} / {displayGender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">ABHA Number</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{displayAbhaId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Village / Block</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{displayVillage}, {displayDistrict}</span>
                </div>
              </div>

              {/* Rx Medicine Table */}
              <div className="space-y-2">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">℞ Prescribed Medications</span>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Medicine Name</th>
                        <th className="p-2.5">Dosage</th>
                        <th className="p-2.5">Route</th>
                        <th className="p-2.5">Frequency</th>
                        <th className="p-2.5">Duration</th>
                        <th className="p-2.5">Centre Availability</th>
                        <th className="p-2.5">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activePrescriptions.map((rx, idx) => (
                        <tr key={rx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{rx.medicineName}</td>
                          <td className="p-2.5 font-medium">{rx.dosage}</td>
                          <td className="p-2.5">
                            <span className="rounded-md bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 text-purple-700 dark:text-purple-300 font-mono text-[10px]">
                              {rx.route || "Oral"}
                            </span>
                          </td>
                          <td className="p-2.5 font-medium">{rx.frequency}</td>
                          <td className="p-2.5">{rx.duration}</td>
                          <td className="p-2.5">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                rx.availabilityStatus === "AVAILABLE" || rx.citizenAvailability?.availability === "Available"
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : rx.availabilityStatus === "LOW_STOCK" || rx.citizenAvailability?.availability === "Low Stock"
                                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                  : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              }`}
                            >
                              {rx.citizenAvailability?.availability || "Available"} @ {rx.facilityName || "Sundarpur PHC"}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-300">{rx.instructions || "As directed"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Signature & Seal */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <p className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Electronically Signed & Verified
                  </p>
                  <p>Prescribed by: <strong>Dr. Rajesh Sharma, MD (Reg # G-44912)</strong></p>
                  <p className="text-[10px] text-slate-400">Scan at any Jan Aushadhi Kendra or Government Pharmacy</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      window.print();
                      toast.success("Sending prescription slip to printer / PDF save");
                    }}
                    className="rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-8 px-4 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Download / Print PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Citizen Medicine Availability & Nearby Centre Finder */}
      {showMedicineFinderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 flex flex-col animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold">
                  <Hospital className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Find Medicine at Nearby Health Centres
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time stock availability across primary, community, and sub-district centres
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowMedicineFinderModal(false)} className="rounded-full cursor-pointer">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-5 overflow-y-auto space-y-4">
              {/* Search Input Bar */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={medicineSearchQuery}
                    onChange={(e) => setMedicineSearchQuery(e.target.value)}
                    placeholder="Search medicine (e.g. Paracetamol, Amlodipine, Metformin...)"
                    className="pl-10 pr-4 py-2 text-sm rounded-xl border-slate-200 dark:border-slate-700"
                  />
                </div>

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Quick check:</span>
                  {["Paracetamol", "Amlodipine 5mg", "Metformin 500mg", "ORS Sachet", "Amoxicillin 500mg", "Salbutamol Inhaler"].map((med) => (
                    <button
                      key={med}
                      onClick={() => setMedicineSearchQuery(med)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                        medicineSearchQuery.toLowerCase() === med.toLowerCase()
                          ? "bg-purple-700 text-white border-purple-700 shadow-2xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {med}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Disclaimer */}
              <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/30 p-3 text-xs text-blue-900 dark:text-blue-300 flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" />
                <p className="text-[11px] leading-snug">
                  <strong>Citizen Health View:</strong> Real-time availability is updated directly from the central state medical stores catalog. Warehouse item counts are protected for institutional privacy.
                </p>
              </div>

              {/* Search Results List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold px-1">
                  <span>Showing Centres near {currentPatient?.village || "Sundarpur"}</span>
                  {citizenFacilitySearch.isFetching ? (
                    <span className="text-purple-600 dark:text-purple-400 animate-pulse">Checking stock levels...</span>
                  ) : (
                    <span>{citizenFacilitySearch.data?.length || 0} facilities mapped</span>
                  )}
                </div>

                {citizenFacilitySearch.isLoading ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <div className="h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs">Querying regional health centres...</p>
                  </div>
                ) : (citizenFacilitySearch.data || []).length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 text-center text-slate-500 dark:text-slate-400 space-y-1">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Facilities Found</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Could not find active distribution centres for "{medicineSearchQuery}". Please try searching another medicine or contact your local ASHA worker.
                    </p>
                  </div>
                ) : (
                  (citizenFacilitySearch.data || []).map((fac: any) => (
                    <div
                      key={fac.facilityId}
                      className={`rounded-2xl border p-4 transition-all ${
                        fac.availabilityStatus === "AVAILABLE"
                          ? "bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-300 shadow-2xs"
                          : fac.availabilityStatus === "LOW_STOCK"
                          ? "bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800/60 hover:border-amber-300 shadow-2xs"
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-85"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{fac.facilityName}</h4>
                            <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium uppercase">
                              {fac.facilityType || "PHC"}
                            </Badge>
                            {fac.distanceKm !== undefined && (
                              <Badge className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px] font-bold">
                                <MapPin className="h-3 w-3 mr-0.5 inline" /> {fac.distanceKm} km away
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Location: <strong>{fac.village || "Sanand Taluka"}</strong>
                            {fac.phone && (
                              <span className="ml-3">
                                <Phone className="h-3 w-3 inline mr-1 text-slate-400" />
                                {fac.phone}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <Badge
                            className={`text-xs font-bold px-3 py-1 ${
                              fac.availabilityStatus === "AVAILABLE"
                                ? "bg-emerald-600 text-white"
                                : fac.availabilityStatus === "LOW_STOCK"
                                ? "bg-amber-500 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {fac.availabilityStatus === "AVAILABLE"
                              ? "Available"
                              : fac.availabilityStatus === "LOW_STOCK"
                              ? "Low Stock"
                              : "Unavailable"}
                          </Badge>
                        </div>
                      </div>

                      {/* Exact Citizen Card Format Display */}
                      <div className="mt-3 grid grid-cols-3 gap-2 bg-slate-50/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[9px] block">Medicine</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{medicineSearchQuery}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[9px] block">Availability</span>
                          <span className={`font-bold ${
                            fac.availabilityStatus === "AVAILABLE" ? "text-emerald-700 dark:text-emerald-400" : fac.availabilityStatus === "LOW_STOCK" ? "text-amber-700 dark:text-amber-400" : "text-rose-700 dark:text-rose-400"
                          }`}>
                            {fac.availabilityStatus === "AVAILABLE" ? "Available" : fac.availabilityStatus === "LOW_STOCK" ? "Low Stock" : "Unavailable"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[9px] block">Facility</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{fac.facilityName}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={showEditProfileModal}
        onOpenChange={setShowEditProfileModal}
      />
    </WorkspaceLayout>
  );
}
