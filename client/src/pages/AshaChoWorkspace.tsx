import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Database,
  Edit,
  Eye,
  FileCheck,
  FileHeart,
  FilePlus,
  HeartPulse,
  Home,
  MapPin,
  Navigation,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { AshaHealthAiView } from "@/components/AshaHealthAiView";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import {
  getLocalEntities,
  clearSyncedMutations,
  STORES,
  type LocalHousehold,
  type LocalPatient,
  type LocalReferral,
  type OfflineMutation,
} from "@/lib/offlineDb";
import CommunityScreeningDesk from "@/components/CommunityScreeningDesk";
import HealthcareFacilityMap from "@/components/HealthcareFacilityMap";
import { VillageAccessibilityDashboard } from "@/components/VillageAccessibilityDashboard";
import {
  MAHARASHTRA_DISTRICTS,
  getCitiesForDistrict,
} from "@shared/maharashtraLocations";

export default function AshaChoWorkspace() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("village_dashboard");
  const [selectedPatientForScreening, setSelectedPatientForScreening] = useState<number | string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [householdSearchQuery, setHouseholdSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [villageFilter, setVillageFilter] = useState("all");

  // Dialog & Selection states
  const [showAddHousehold, setShowAddHousehold] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [showPatientProfile, setShowPatientProfile] = useState(false);
  const [showHouseholdDetail, setShowHouseholdDetail] = useState(false);
  const [showCreateReferral, setShowCreateReferral] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState<number | string | null>(null);
  const [selectedHousehold, setSelectedHousehold] = useState<any | null>(null);
  const [selectedPatientForReferral, setSelectedPatientForReferral] = useState<number | string | null>(null);

  // Offline Sync Hook & Local State
  const {
    isOnline,
    isSimulatedOffline,
    isSyncing,
    statusText,
    pendingCount,
    syncedCount,
    failedCount,
    conflictCount,
    queue: offlineQueue,
    triggerSync,
    retryMutation,
    retryAllFailed,
    removeMutation,
    toggleSimulatedOffline,
    createHouseholdOfflineFirst,
    createPatientOfflineFirst,
    createScreeningOfflineFirst,
    createReferralOfflineFirst,
  } = useOfflineSync();

  const [localHouseholds, setLocalHouseholds] = useState<LocalHousehold[]>([]);
  const [localPatients, setLocalPatients] = useState<LocalPatient[]>([]);
  const [localReferrals, setLocalReferrals] = useState<LocalReferral[]>([]);
  const [selectedMutationDetails, setSelectedMutationDetails] = useState<OfflineMutation | null>(null);
  const [queueFilter, setQueueFilter] = useState<"all" | "pending" | "synced" | "conflict" | "failed">("all");

  const refreshLocalData = useCallback(async () => {
    try {
      const [hh, pts, refs] = await Promise.all([
        getLocalEntities<LocalHousehold>(STORES.HOUSEHOLDS),
        getLocalEntities<LocalPatient>(STORES.PATIENTS),
        getLocalEntities<LocalReferral>(STORES.REFERRALS),
      ]);
      setLocalHouseholds(hh || []);
      setLocalPatients(pts || []);
      setLocalReferrals(refs || []);
    } catch {
      // Ignore initial IndexedDB error
    }
  }, []);

  useEffect(() => {
    refreshLocalData();
  }, [refreshLocalData, offlineQueue.length, isSyncing]);

  // Forms
  const userDistrict = user?.district || "Pune";
  const userVillage = user?.assignedVillage || user?.village || "Pune City";

  const [householdForm, setHouseholdForm] = useState({
    headName: "",
    village: userVillage,
    district: userDistrict,
    contact: "",
  });

  const [patientForm, setPatientForm] = useState({
    name: "",
    age: "",
    gender: "female" as "female" | "male" | "other" | "undisclosed",
    contact: "",
    village: userVillage,
    district: userDistrict,
    emergencyContact: "",
    bloodGroup: "B+",
    allergies: "",
    conditions: "",
    householdId: undefined as number | string | undefined,
  });

  const [editPatientForm, setEditPatientForm] = useState({
    id: 0,
    name: "",
    age: "",
    gender: "female" as "female" | "male" | "other" | "undisclosed",
    contact: "",
    village: userVillage,
    district: userDistrict,
    emergencyContact: "",
    bloodGroup: "B+",
    allergies: "",
    conditions: "",
    householdId: undefined as number | undefined,
  });

  // Dynamic city/village dropdown options for each modal
  const availableHouseholdCities = useMemo(() => {
    return getCitiesForDistrict(householdForm.district);
  }, [householdForm.district]);

  const availablePatientCities = useMemo(() => {
    return getCitiesForDistrict(patientForm.district);
  }, [patientForm.district]);

  const availableEditPatientCities = useMemo(() => {
    return getCitiesForDistrict(editPatientForm.district);
  }, [editPatientForm.district]);

  const [referralForm, setReferralForm] = useState({
    patientId: 1 as number | string,
    targetFacilityId: 3,
    specialty: "General Medicine",
    urgency: "urgent" as "routine" | "urgent" | "emergency",
    reason: "",
  });
  const [selectedFacilityForReferral, setSelectedFacilityForReferral] = useState<any | null>(null);
  const [transportVehicle, setTransportVehicle] = useState("108 Emergency Ambulance (GJ-01-AB-1088)");
  const [transportDriverContact, setTransportDriverContact] = useState("+91 98765 43210");

  // NCD Screening Form State
  const [screening, setScreening] = useState({
    patientId: 1 as number | string,
    bpSystolic: 140,
    bpDiastolic: 90,
    glucose: 145,
    spo2: 98,
    weight: 62,
    temperature: 98.4,
    symptoms: "Occasional headache and fatigue",
    notes: "NCD field screening at Anganwadi Centre",
  });
  const [screenedRisk, setScreenedRisk] = useState<{ score: number; category: string; summary: string } | null>(null);

  // Follow-up Field Visit State
  const [selectedFollowUpToComplete, setSelectedFollowUpToComplete] = useState<any | null>(null);
  const [completionForm, setCompletionForm] = useState({
    bpSystolic: 128,
    bpDiastolic: 82,
    glucose: 112,
    spo2: 98,
    temperature: "98.4",
    notes: "Patient adhered to daily morning medication. Blood pressure stable. No dizziness or edema observed.",
  });
  const [ashaFollowUpFilter, setAshaFollowUpFilter] = useState<string>("ALL");
  const [deletePatientModal, setDeletePatientModal] = useState<{ id: number; name: string } | null>(null);

  // tRPC queries & mutations
  const utils = trpc.useUtils();
  const overview = trpc.dashboard.overview.useQuery(undefined, { enabled: isAuthenticated });
  const patients = trpc.patients.list.useQuery(undefined, { enabled: isAuthenticated });
  const households = trpc.households.list.useQuery(undefined, { enabled: isAuthenticated });
  const referrals = trpc.referrals.list.useQuery(undefined, { enabled: isAuthenticated });
  const followUps = trpc.followUps.list.useQuery(undefined, { enabled: isAuthenticated });
  const campaigns = trpc.campaigns.list.useQuery(undefined, { enabled: isAuthenticated });
  const facilities = trpc.facilities.list.useQuery(undefined, { enabled: isAuthenticated });

  const referralRecommendations = trpc.referrals.recommend.useQuery(
    {
      patientId: typeof (selectedPatientForReferral || referralForm.patientId) === "number" ? Number(selectedPatientForReferral || referralForm.patientId) : 1,
      specialty: referralForm.specialty,
      urgency: referralForm.urgency,
      originVillage: "Sundarpur",
    },
    { enabled: Boolean(isAuthenticated && showCreateReferral) }
  );

  const confirmReferral = trpc.referrals.confirm.useMutation({
    onSuccess: (data) => {
      toast.success(`Referral #${data.referral.id} confirmed to ${data.facility.name}`);
      setShowCreateReferral(false);
      utils.referrals.list.invalidate();
      utils.dashboard.overview.invalidate();
      if (typeof selectedPatientId === "number") utils.patients.getProfile.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Active patient profile query
  const patientProfile = trpc.patients.getProfile.useQuery(
    { id: typeof selectedPatientId === "number" ? selectedPatientId : 1 },
    { enabled: typeof selectedPatientId === "number" && showPatientProfile }
  );

  const createHousehold = trpc.households.create.useMutation({
    onSuccess: () => {
      toast.success("Household registered successfully in village records");
      setShowAddHousehold(false);
      setHouseholdForm({ headName: "", village: userVillage, district: userDistrict, contact: "" });
      utils.households.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createPatient = trpc.patients.create.useMutation({
    onSuccess: () => {
      toast.success("Beneficiary successfully registered in village roster");
      setShowAddPatient(false);
      setPatientForm({
        name: "",
        age: "",
        gender: "female",
        contact: "",
        village: userVillage,
        district: userDistrict,
        emergencyContact: "",
        bloodGroup: "B+",
        allergies: "",
        conditions: "",
        householdId: undefined,
      });
      utils.patients.list.invalidate();
      utils.households.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updatePatient = trpc.patients.update.useMutation({
    onSuccess: () => {
      toast.success("Beneficiary profile updated successfully");
      setShowEditPatient(false);
      utils.patients.list.invalidate();
      utils.households.list.invalidate();
      if (selectedPatientId) utils.patients.getProfile.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deletePatientMutation = trpc.patients.delete.useMutation({
    onSuccess: (data: any) => {
      toast.success(data?.message || "Beneficiary record removed");
      utils.patients.list.invalidate();
      utils.households.list.invalidate();
      utils.dashboard.overview.invalidate();
      setDeletePatientModal(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const recordVisit = trpc.visits.create.useMutation({
    onSuccess: (data) => {
      toast.success("Screening vitals & visit record stored");
      setScreenedRisk({
        score: data.risk.score,
        category: data.risk.category,
        summary: `Risk ${data.risk.score}/100 (${data.risk.category}). Triage: ${data.triage.level}. ${data.risk.nextStep}`,
      });
      utils.patients.list.invalidate();
      utils.dashboard.overview.invalidate();
      if (selectedPatientId) utils.patients.getProfile.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createReferral = trpc.referrals.create.useMutation({
    onSuccess: () => {
      toast.success("Field referral generated and alerted to care team");
      setShowCreateReferral(false);
      utils.referrals.list.invalidate();
      utils.dashboard.overview.invalidate();
      if (selectedPatientId) utils.patients.getProfile.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const completeFollowUp = trpc.followUps.complete.useMutation({
    onSuccess: () => {
      toast.success("Home follow-up visit successfully completed & doctor notified");
      setSelectedFollowUpToComplete(null);
      utils.followUps.list.invalidate();
      utils.alerts.list.invalidate();
      utils.dashboard.overview.invalidate();
      if (selectedPatientId) utils.patients.getProfile.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const openPatientProfileModal = (patientId: number | string) => {
    setSelectedPatientId(patientId);
    setShowPatientProfile(true);
  };

  const openEditPatientModal = (patient: any) => {
    setEditPatientForm({
      id: typeof patient.id === "number" ? patient.id : 0,
      name: patient.name,
      age: String(patient.age),
      gender: patient.gender || "female",
      contact: patient.contact || "",
      village: patient.village || userVillage,
      district: patient.district || userDistrict,
      emergencyContact: patient.emergencyContact || "",
      bloodGroup: patient.bloodGroup || "B+",
      allergies: patient.allergies || "",
      conditions: patient.conditions || "",
      householdId: typeof patient.householdId === "number" ? patient.householdId : undefined,
    });
    setShowEditPatient(true);
  };

  const openAddMemberModal = (householdId?: number | string) => {
    setPatientForm({
      name: "",
      age: "",
      gender: "female",
      contact: "",
      village: householdId
        ? allHouseholds.find((h) => String(h.id) === String(householdId))?.village || userVillage
        : userVillage,
      district: userDistrict,
      emergencyContact: "",
      bloodGroup: "B+",
      allergies: "",
      conditions: "",
      householdId: householdId,
    });
    setShowAddPatient(true);
  };

  // Merged Patients (Server + Local Offline)
  const allPatients = useMemo(() => {
    const remote = (patients.data || []) as any[];
    const combined = [
      ...localPatients.filter((lp) => !remote.some((rp) => String(rp.id) === String(lp.id))),
      ...remote,
    ];
    return combined;
  }, [patients.data, localPatients]);

  const filteredPatients = allPatients.filter((p) => {
    const matchesSearch =
      searchQuery === "" ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.village && p.village.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.conditions && p.conditions.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.bloodGroup && p.bloodGroup.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.contact && p.contact.includes(searchQuery));

    const matchesRisk = riskFilter === "all" || p.riskCategory === riskFilter;
    const matchesGender = genderFilter === "all" || p.gender === genderFilter;
    const matchesVillage = villageFilter === "all" || p.village === villageFilter;

    return matchesSearch && matchesRisk && matchesGender && matchesVillage;
  });

  // Merged Households (Server + Local Offline)
  const allHouseholds = useMemo(() => {
    const remote = (households.data || []) as any[];
    const combined = [
      ...localHouseholds.filter((lh) => !remote.some((rh) => String(rh.id) === String(lh.id))),
      ...remote,
    ];
    return combined;
  }, [households.data, localHouseholds]);

  const filteredHouseholds = allHouseholds.filter((h) => {
    return (
      householdSearchQuery === "" ||
      h.headName.toLowerCase().includes(householdSearchQuery.toLowerCase()) ||
      h.village.toLowerCase().includes(householdSearchQuery.toLowerCase()) ||
      (h.contact && h.contact.includes(householdSearchQuery))
    );
  });

  // Merged Referrals (Server + Local Offline)
  const allReferrals = useMemo(() => {
    const remote = (referrals.data || []) as any[];
    const combined = [
      ...localReferrals.filter((lr) => !remote.some((rr) => String(rr.id) === String(lr.id))),
      ...remote,
    ];
    return combined;
  }, [referrals.data, localReferrals]);

  const highRiskPatients = allPatients.filter((p) => p.riskCategory === "high" || p.riskCategory === "critical");
  const uniqueVillages = Array.from(new Set(allPatients.map((p) => p.village || "Sundarpur")));

  const navItems: NavItem[] = [
    { id: "village_dashboard", label: "Village Dashboard", icon: Home },
    { id: "households", label: "Households", icon: Users, badge: allHouseholds.length },
    { id: "patients", label: "Patients & Beneficiaries", icon: FileHeart, badge: allPatients.length },
    { id: "screening", label: "Screening Desk", icon: HeartPulse },
    { id: "high_risk", label: "High-Risk Cases", icon: ShieldAlert, badge: highRiskPatients.length },
    { id: "asha_ai", label: "ASHA Health Copilot", icon: Sparkles },
    {
      id: "follow_ups",
      label: "Follow-ups",
      icon: Clock,
      badge: (followUps.data || []).filter((f) => {
        const s = (f.status || "").toUpperCase();
        return s === "OPEN" || s === "DUE_SOON" || s === "OVERDUE";
      }).length,
    },
    { id: "facility_map", label: "Facility GIS Map", icon: Compass },
    { id: "village_accessibility", label: "Village Accessibility", icon: Activity },
    { id: "offline_sync", label: "Offline Sync", icon: Database, badge: pendingCount > 0 ? pendingCount : undefined },
  ];

  return (
    <WorkspaceLayout
      role="asha_cho"
      title="ASHA / CHO Village Command Hub"
      subtitle={user?.name ? `${user.name} (${user.role === "cho" ? "Community Health Officer" : "ASHA Facilitator"}) · ${user.assignedVillage ? `${user.assignedVillage}, ` : ""}${user.district || "Nandurbar"} · Comprehensive Field Care & Screening` : "Government of Maharashtra · Health & Family Welfare Department · Rural Healthcare Unit"}
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          {isSyncing ? (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-bold gap-1 animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
              SYNCING
            </Badge>
          ) : !isOnline || isSimulatedOffline ? (
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-bold gap-1">
              <WifiOff className="h-3 w-3 text-amber-700" />
              OFFLINE
            </Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              ONLINE
            </Badge>
          )}

          {/* Pending pill */}
          {pendingCount > 0 && (
            <Button
              size="sm"
              onClick={() => setActiveTab("offline_sync")}
              className="rounded-full bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold shadow-xs h-8 px-3"
            >
              <Database className="mr-1 h-3.5 w-3.5 text-amber-200" />
              {pendingCount} RECORD{pendingCount === 1 ? "" : "S"} PENDING
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={toggleSimulatedOffline}
            className={`rounded-full text-xs font-semibold ${isSimulatedOffline ? "border-amber-400 bg-amber-50 text-amber-900" : "bg-white"}`}
          >
            {isSimulatedOffline ? (
              <>
                <WifiOff className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> Simulated Offline
              </>
            ) : (
              <>
                <Wifi className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Field Offline Mode
              </>
            )}
          </Button>

          <Button size="sm" onClick={() => openAddMemberModal()} className="rounded-full bg-[#1f4935] text-white hover:bg-[#163727] text-xs font-semibold">
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> + Register Patient
          </Button>

          <Button size="sm" onClick={() => setShowAddHousehold(true)} className="rounded-full bg-[#15181b] text-white hover:bg-slate-800 text-xs font-semibold">
            <Home className="mr-1.5 h-3.5 w-3.5" /> + New Household
          </Button>
        </div>
      }
    >
      {/* Sticky Field Offline Notice Banner */}
      {(!isOnline || isSimulatedOffline) && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-xl bg-amber-200 text-amber-900">
              <WifiOff className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold">Field Offline Mode Active</span>
              <span className="text-amber-800 ml-1.5 hidden sm:inline">
                — All household registrations, patients, vitals, screenings, and referrals are saved to local IndexedDB and will auto-sync on reconnect.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-600 text-white border-0 font-bold text-[10px]">
              {pendingCount} Pending Sync
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab("offline_sync")}
              className="rounded-full h-7 text-[11px] border-amber-300 bg-white hover:bg-amber-100"
            >
              Sync Desk
            </Button>
          </div>
        </div>
      )}
      {/* 1. VILLAGE DASHBOARD VIEW */}
      {activeTab === "village_dashboard" && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-xs bg-[#e8f3ed]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-[#2d6148]">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Households Covered</span>
                  <Home className="h-4 w-4" />
                </div>
                <p className="display-font mt-4 text-3xl font-extrabold text-[#1f4935]">{households.data?.length ?? 0} Units</p>
                <p className="mt-2 text-xs text-[#2d6148]">{patients.data?.length ?? 0} registered village beneficiaries</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-[#f8e7e8]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-rose-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">High-Risk Stratification</span>
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <p className="display-font mt-4 text-3xl font-extrabold text-rose-900">{highRiskPatients.length} Patients</p>
                <p className="mt-2 text-xs text-rose-700">Priority NCD & maternal surveillance</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-[#e4f1f8]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-blue-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Active Referrals</span>
                  <Navigation className="h-4 w-4" />
                </div>
                <p className="display-font mt-4 text-3xl font-extrabold text-blue-900">{referrals.data?.length ?? 0} Open</p>
                <p className="mt-2 text-xs text-blue-700">PHC / CHC specialist escalations</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-[#fff4da]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-amber-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Pending Home Follow-ups</span>
                  <Clock className="h-4 w-4" />
                </div>
                <p className="display-font mt-4 text-3xl font-extrabold text-amber-900">{followUps.data?.filter((f) => f.status === "open" || f.status === "overdue").length ?? 0}</p>
                <p className="mt-2 text-xs text-amber-800">Field visits scheduled for this week</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Outreach */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-xs bg-white">
              <CardHeader>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Field Workflows</p>
                <CardTitle className="display-font text-lg font-bold">Quick Field Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Button onClick={() => openAddMemberModal()} variant="outline" className="h-auto p-4 flex-col items-start gap-1 rounded-2xl border-slate-200 text-left hover:bg-slate-50">
                  <UserPlus className="h-5 w-5 text-emerald-600 mb-1" />
                  <span className="font-bold text-xs text-slate-900">Register Patient</span>
                  <span className="text-[11px] text-slate-500">Add demographic & medical baseline</span>
                </Button>

                <Button onClick={() => setShowAddHousehold(true)} variant="outline" className="h-auto p-4 flex-col items-start gap-1 rounded-2xl border-slate-200 text-left hover:bg-slate-50">
                  <Home className="h-5 w-5 text-blue-600 mb-1" />
                  <span className="font-bold text-xs text-slate-900">Register Household</span>
                  <span className="text-[11px] text-slate-500">Record family unit & worker assignment</span>
                </Button>

                <Button onClick={() => setActiveTab("screening")} variant="outline" className="h-auto p-4 flex-col items-start gap-1 rounded-2xl border-slate-200 text-left hover:bg-slate-50">
                  <HeartPulse className="h-5 w-5 text-rose-600 mb-1" />
                  <span className="font-bold text-xs text-slate-900">Conduct Screening</span>
                  <span className="text-[11px] text-slate-500">Record BP, Glucose, SpO2 & Triage</span>
                </Button>

                <Button onClick={() => setActiveTab("offline_sync")} variant="outline" className="h-auto p-4 flex-col items-start gap-1 rounded-2xl border-slate-200 text-left hover:bg-slate-50">
                  <Database className="h-5 w-5 text-amber-600 mb-1" />
                  <span className="font-bold text-xs text-slate-900">Offline Field Queue</span>
                  <span className="text-[11px] text-slate-500">{pendingCount} queued offline records</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Community Outreach</p>
                  <CardTitle className="display-font mt-1 text-lg font-bold">Active Village Health Campaigns</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("campaigns")} className="text-xs font-semibold">
                  View all
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {(campaigns.data || []).slice(0, 2).map((c) => (
                  <div key={c.id} className="rounded-2xl border border-slate-100 bg-[#f9fafb] p-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{c.name}</span>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{c.status}</Badge>
                    </div>
                    <p className="mt-1 text-slate-500">{c.description}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 border-t pt-2">
                      <span>Target: {c.targetBeneficiaries} beneficiaries</span>
                      <span className="font-bold text-emerald-700">Screened: {c.screenedCount} ({c.highRiskDetected} high-risk)</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. HOUSEHOLDS VIEW */}
      {activeTab === "households" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                value={householdSearchQuery}
                onChange={(e) => setHouseholdSearchQuery(e.target.value)}
                placeholder="Search households by head of family, village, or contact number..."
                className="pl-9 rounded-full bg-white text-xs border-slate-200"
              />
            </div>
            <Button onClick={() => setShowAddHousehold(true)} className="rounded-full bg-[#1f4935] text-white text-xs font-semibold whitespace-nowrap">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Register Household
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredHouseholds.map((h) => (
              <Card key={h.id} className="border-0 shadow-xs bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-5 text-xs">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <Home className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{h.headName}</h3>
                        <p className="text-slate-500">{h.village}, {h.district}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-slate-50">HH #{h.id}</Badge>
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Primary Contact:</span>
                      <span className="font-medium text-slate-800">{h.contact || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Worker:</span>
                      <span className="font-medium text-slate-800">ASHA ID #{h.assignedWorkerId ?? 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Enrolled Members:</span>
                      <span className="font-bold text-emerald-700">{h.members?.length ?? 0} persons</span>
                    </div>
                  </div>

                  {h.members && h.members.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Family Members:</p>
                      <div className="flex flex-wrap gap-1">
                        {h.members.slice(0, 3).map((m: any) => (
                          <Badge
                            key={m.id}
                            variant="secondary"
                            className="cursor-pointer hover:bg-emerald-100 text-[10px] py-0.5"
                            onClick={() => openPatientProfileModal(m.id)}
                          >
                            {m.name} ({m.age}y)
                          </Badge>
                        ))}
                        {h.members.length > 3 && (
                          <Badge variant="outline" className="text-[10px] py-0.5 text-slate-500">
                            +{h.members.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-full text-xs"
                      onClick={() => {
                        setSelectedHousehold(h);
                        setShowHouseholdDetail(true);
                      }}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" /> View Details
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 rounded-full bg-[#1f4935] text-white hover:bg-[#163727] text-xs"
                      onClick={() => openAddMemberModal(h.id)}
                    >
                      <UserPlus className="mr-1 h-3.5 w-3.5" /> + Member
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 3. PATIENTS VIEW */}
      {activeTab === "patients" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            {/* Search & Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search beneficiaries by name, village, condition, blood group, or contact..."
                  className="pl-9 rounded-full bg-white text-xs border-slate-200"
                />
              </div>
              <Button onClick={() => openAddMemberModal()} className="rounded-full bg-[#1f4935] text-white text-xs font-semibold whitespace-nowrap">
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> + Register Beneficiary
              </Button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-slate-400 font-medium text-[11px]">Filter by:</span>

              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              >
                <option value="all">All Risk Levels</option>
                <option value="critical">Critical</option>
                <option value="high">High Risk</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low Risk</option>
              </select>

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              >
                <option value="all">All Genders</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>

              <select
                value={villageFilter}
                onChange={(e) => setVillageFilter(e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              >
                <option value="all">All Villages</option>
                {uniqueVillages.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>

              {(searchQuery || riskFilter !== "all" || genderFilter !== "all" || villageFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setRiskFilter("all");
                    setGenderFilter("all");
                    setVillageFilter("all");
                  }}
                  className="rounded-full text-xs text-rose-600 hover:text-rose-700 h-7 px-2"
                >
                  <X className="mr-1 h-3 w-3" /> Reset Filters
                </Button>
              )}
            </div>
          </div>

          {/* Patients Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPatients.map((p) => (
              <Card key={p.id} className="border-0 shadow-xs bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-slate-900">{p.name}</h4>
                        {p.bloodGroup && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200">
                            {p.bloodGroup}
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-500 mt-0.5">{p.age} yrs · {p.gender} · {p.village || "Sundarpur"}</p>
                    </div>
                    <Badge
                      className={`text-[10px] ${
                        p.riskCategory === "critical"
                          ? "bg-rose-100 text-rose-800"
                          : p.riskCategory === "high"
                          ? "bg-orange-100 text-orange-800"
                          : p.riskCategory === "moderate"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {p.riskCategory} · {p.riskScore}/100
                    </Badge>
                  </div>

                  <div className="mt-2.5 space-y-1 text-slate-600">
                    <p><strong>Conditions:</strong> {p.conditions || "None declared"}</p>
                    {p.allergies && (
                      <p className="text-rose-700"><strong>Allergies:</strong> {p.allergies}</p>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Contact: {p.contact || "N/A"}</span>
                      {p.householdId && <span>HH #{p.householdId}</span>}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-slate-100 pt-2.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPatientProfileModal(p.id)}
                      className="flex-1 rounded-full text-xs font-semibold text-slate-700"
                    >
                      <FileHeart className="mr-1 h-3.5 w-3.5 text-emerald-600" /> View EHR
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditPatientModal(p)}
                      className="rounded-full text-xs p-2 text-slate-600 hover:text-slate-900"
                      title="Edit Patient"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedPatientForScreening(p.id);
                        setActiveTab("screening");
                      }}
                      className="rounded-full text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                      <HeartPulse className="mr-1 h-3.5 w-3.5" /> Screen
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletePatientModal({ id: p.id, name: p.name })}
                      className="rounded-full text-xs p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      title="Delete Beneficiary Record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 4. SCREENING DESK VIEW */}
      {activeTab === "screening" && (
        <CommunityScreeningDesk
          initialPatientId={selectedPatientForScreening || patients.data?.[0]?.id || 1}
          isSimulatedOffline={isSimulatedOffline}
          onRefreshOfflineState={refreshLocalData}
          onEscalateReferral={(patientId) => {
            setSelectedPatientForReferral(patientId);
            setShowCreateReferral(true);
          }}
          onScheduleFollowUp={(patientId) => {
            toast.success(`Follow-up checklist created for patient #${patientId}`);
            utils.followUps.list.invalidate();
          }}
        />
      )}

      {/* 5. HIGH RISK CASES VIEW */}
      {activeTab === "high_risk" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-100 bg-[#f8e7e8] p-4 text-xs text-rose-900">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldAlert className="h-4 w-4 text-rose-700" />
              <span>Priority High-Risk Village Watchlist</span>
            </div>
            <p className="mt-1 text-rose-800">
              Patients with elevated cardiovascular, glycemic, or maternal risk factors requiring mandatory weekly field checkups.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {highRiskPatients.map((p) => (
              <Card key={p.id} className="border-0 shadow-xs bg-white border-l-4 border-l-rose-600">
                <CardContent className="p-4 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{p.name}</h4>
                      <p className="text-slate-500">{p.age} yrs · {p.gender} · {p.village}</p>
                    </div>
                    <Badge className="bg-rose-100 text-rose-800 text-[10px]">
                      Score: {p.riskScore}/100
                    </Badge>
                  </div>
                  <p className="mt-2 text-slate-700"><strong>Chronic:</strong> {p.conditions || "Severe hypertension"}</p>
                  <p className="mt-1 text-slate-500">Emergency Contact: {p.emergencyContact || p.contact || "N/A"}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPatientProfileModal(p.id)}
                      className="rounded-full text-xs font-semibold"
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" /> Full EHR
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedPatientForReferral(p.id);
                        setShowCreateReferral(true);
                      }}
                      className="rounded-full bg-rose-600 text-white hover:bg-rose-700 text-xs"
                    >
                      <Navigation className="mr-1 h-3.5 w-3.5" /> PHC Referral
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 6. REFERRALS VIEW */}
      {activeTab === "referrals" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="display-font text-base font-bold text-slate-900">Active Village Referrals</h3>
            <Button
              size="sm"
              onClick={() => {
                setSelectedPatientForReferral(patients.data?.[0]?.id || 1);
                setShowCreateReferral(true);
              }}
              className="rounded-full bg-[#1f4935] text-white text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> New Referral
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(referrals.data || []).map((r) => (
              <Card key={r.id} className="border-0 shadow-xs bg-white">
                <CardContent className="p-4 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{r.patientName || `Patient #${r.patientId}`}</h4>
                      <p className="text-slate-500">{r.village || "Sundarpur"} · {r.specialty || "Internal Medicine"}</p>
                    </div>
                    <Badge
                      className={`text-[10px] ${
                        r.urgency === "emergency"
                          ? "bg-rose-100 text-rose-800"
                          : r.urgency === "urgent"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {r.urgency}
                    </Badge>
                  </div>
                  <p className="mt-2 text-slate-600"><strong>Reason:</strong> {r.reason}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                    <span>Status: <strong className="text-slate-800 uppercase">{r.status}</strong></span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 7. FOLLOW-UPS VIEW */}
      {activeTab === "follow_ups" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="display-font text-lg font-bold text-slate-900">
                Scheduled Home Follow-ups &amp; Care Coordination
              </h3>
              <p className="text-xs text-slate-500">
                Assigned field directives for home visits, chronic disease compliance, and post-referral recovery
              </p>
            </div>
            {(() => {
              const allTasks = followUps.data || [];
              const overdueCount = allTasks.filter((f) => (f.status || "").toUpperCase() === "OVERDUE").length;
              const dueSoonCount = allTasks.filter((f) => (f.status || "").toUpperCase() === "DUE_SOON").length;
              return (
                <div className="flex gap-2 text-xs">
                  {overdueCount > 0 && (
                    <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold animate-pulse">
                      <AlertTriangle className="h-3 w-3 mr-1 inline" /> {overdueCount} Overdue
                    </Badge>
                  )}
                  {dueSoonCount > 0 && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold">
                      <Clock className="h-3 w-3 mr-1 inline" /> {dueSoonCount} Due Soon
                    </Badge>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Filter Pills */}
          {(() => {
            const allTasks = followUps.data || [];
            const countAll = allTasks.length;
            const countDueSoon = allTasks.filter((f) => (f.status || "").toUpperCase() === "DUE_SOON").length;
            const countOverdue = allTasks.filter((f) => (f.status || "").toUpperCase() === "OVERDUE").length;
            const countOpen = allTasks.filter((f) => (f.status || "").toUpperCase() === "OPEN").length;
            const countCompleted = allTasks.filter((f) => (f.status || "").toUpperCase() === "COMPLETED").length;

            return (
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { id: "ALL", label: `All Tasks (${countAll})` },
                  { id: "DUE_SOON", label: `Due Soon (${countDueSoon})`, alert: countDueSoon > 0 },
                  { id: "OVERDUE", label: `Overdue (${countOverdue})`, critical: countOverdue > 0 },
                  { id: "OPEN", label: `Open (${countOpen})` },
                  { id: "COMPLETED", label: `Completed (${countCompleted})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAshaFollowUpFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all text-xs ${
                      ashaFollowUpFilter === tab.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : tab.critical
                        ? "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                        : tab.alert
                        ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Task Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(() => {
              const allTasks = followUps.data || [];
              const filtered = allTasks.filter((f) => {
                if (ashaFollowUpFilter === "ALL") return true;
                return (f.status || "").toUpperCase() === ashaFollowUpFilter;
              });

              if (filtered.length === 0) {
                return (
                  <div className="col-span-full py-10 text-center bg-white rounded-2xl border border-slate-100 p-6">
                    <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No follow-up tasks in this category</p>
                    <p className="text-xs text-slate-400 mt-1">All home visits are up-to-date.</p>
                  </div>
                );
              }

              return filtered.map((f) => {
                const isOverdue = (f.status || "").toUpperCase() === "OVERDUE";
                const isDueSoon = (f.status || "").toUpperCase() === "DUE_SOON";
                const isCompleted = (f.status || "").toUpperCase() === "COMPLETED";
                const isCancelled = (f.status || "").toUpperCase() === "CANCELLED";

                return (
                  <Card
                    key={f.id}
                    className={`border transition-all shadow-xs ${
                      isOverdue
                        ? "border-rose-300 bg-rose-50/20"
                        : isDueSoon
                        ? "border-amber-200 bg-amber-50/20"
                        : isCompleted
                        ? "border-emerald-100 bg-emerald-50/10"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <CardContent className="p-4 text-xs space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-sm text-slate-900">{f.patientName || `Patient #${f.patientId}`}</h4>
                            <span className="text-[11px] text-slate-400">
                              ({f.patientAge || "—"}y · {f.village || "Sundarpur"})
                            </span>
                          </div>
                          <p className="font-semibold text-xs text-indigo-900 mt-0.5 flex items-center gap-1">
                            <Stethoscope className="h-3 w-3 text-indigo-600" />
                            {f.reason || f.title}
                          </p>
                        </div>
                        <Badge
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : isOverdue
                              ? "bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
                              : isDueSoon
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-sky-100 text-sky-800 border-sky-200"
                          }`}
                        >
                          {isCompleted && <CheckCircle2 className="mr-1 h-3 w-3 inline" />}
                          {isOverdue && <AlertTriangle className="mr-1 h-3 w-3 inline" />}
                          {isDueSoon && <Clock className="mr-1 h-3 w-3 inline" />}
                          {f.status}
                        </Badge>
                      </div>

                      {f.notes && (
                        <p className="text-slate-600 bg-slate-50 border border-slate-100 p-2 rounded-xl text-xs">
                          <strong>Directive:</strong> {f.notes}
                        </p>
                      )}

                      {f.referral && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                          Linked to {f.referral.targetFacilityName} ({f.referral.specialty})
                        </Badge>
                      )}

                      {isCompleted && (
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 space-y-0.5 text-[11px]">
                          <span className="font-bold block flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Visit Completed
                          </span>
                          <p>{f.completionNotes || "Home vitals evaluation recorded."}</p>
                          {f.completedAt && (
                            <span className="text-slate-400 text-[10px] block">
                              Completed: {new Date(f.completedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Due: {new Date(f.dueAt).toLocaleDateString()}
                        </span>
                        {!isCompleted && !isCancelled && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedFollowUpToComplete(f);
                              setCompletionForm({
                                bpSystolic: 128,
                                bpDiastolic: 82,
                                glucose: 112,
                                spo2: 98,
                                temperature: "98.4",
                                notes: `Home visit conducted for ${f.patientName}. Vitals evaluated and medication compliance confirmed.`,
                              });
                            }}
                            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark Visited
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* MODAL: Complete Home Follow-up Visit */}
      {selectedFollowUpToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Record Home Follow-up Visit Outcome
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedFollowUpToComplete.patientName} — {selectedFollowUpToComplete.reason || selectedFollowUpToComplete.title}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFollowUpToComplete(null)}
                className="rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              {selectedFollowUpToComplete.notes && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  <span className="font-bold block text-slate-800 dark:text-slate-200 mb-0.5">Doctor's Directive:</span>
                  {selectedFollowUpToComplete.notes}
                </div>
              )}

              {/* Vitals Evaluation Form */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider text-[10px]">
                  Home Visit Vitals Evaluation
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">BP Systolic</label>
                    <Input
                      type="number"
                      value={completionForm.bpSystolic}
                      onChange={(e) => setCompletionForm({ ...completionForm, bpSystolic: Number(e.target.value) })}
                      placeholder="120"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">BP Diastolic</label>
                    <Input
                      type="number"
                      value={completionForm.bpDiastolic}
                      onChange={(e) => setCompletionForm({ ...completionForm, bpDiastolic: Number(e.target.value) })}
                      placeholder="80"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">Blood Sugar</label>
                    <Input
                      type="number"
                      value={completionForm.glucose}
                      onChange={(e) => setCompletionForm({ ...completionForm, glucose: Number(e.target.value) })}
                      placeholder="110"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">SpO2 (%)</label>
                    <Input
                      type="number"
                      value={completionForm.spo2}
                      onChange={(e) => setCompletionForm({ ...completionForm, spo2: Number(e.target.value) })}
                      placeholder="98"
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Visit Observations & Outcome */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Field Observations, Medication Adherence &amp; Outcome
                </label>
                <Textarea
                  rows={3}
                  value={completionForm.notes}
                  onChange={(e) => setCompletionForm({ ...completionForm, notes: e.target.value })}
                  placeholder="e.g. Verified morning blood pressure. Counted Telmisartan pills - compliance regular. Patient advised on dietary salt reduction."
                  className="text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => setSelectedFollowUpToComplete(null)}
                  className="rounded-full text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    completeFollowUp.mutate({
                      id: selectedFollowUpToComplete.id,
                      completionNotes: completionForm.notes,
                      vitals: {
                        bpSystolic: completionForm.bpSystolic,
                        bpDiastolic: completionForm.bpDiastolic,
                        glucose: completionForm.glucose,
                        spo2: completionForm.spo2,
                        temperature: completionForm.temperature,
                      },
                    });
                  }}
                  disabled={completeFollowUp.isPending}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  {completeFollowUp.isPending ? "Submitting Outcome…" : "Complete Visit & Notify Doctor"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 8. CAMPAIGNS VIEW */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          <h3 className="display-font text-base font-bold text-slate-900">Village Health Drives & Outreach</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {(campaigns.data || []).map((c) => (
              <Card key={c.id} className="border-0 shadow-xs bg-white">
                <CardContent className="p-5 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px] uppercase mb-1.5">{c.category}</Badge>
                      <h4 className="font-bold text-base text-slate-900">{c.name}</h4>
                      <p className="text-slate-500">{c.village || "Sundarpur Village"}, {c.district}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                  </div>
                  <p className="mt-3 text-slate-600">{c.description}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#f9fafb] p-3 border border-slate-100">
                    <div>
                      <p className="text-slate-400 text-[10px]">Target Population</p>
                      <p className="font-bold text-slate-800 text-sm">{c.targetBeneficiaries} People</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Screened / Identified</p>
                      <p className="font-bold text-emerald-700 text-sm">{c.screenedCount} ({c.highRiskDetected} High-Risk)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ASHA HEALTH COPILOT VIEW */}
      {activeTab === "asha_ai" && (
        <AshaHealthAiView
          userVillage={userVillage}
          userDistrict={userDistrict}
          patientsList={allPatients}
        />
      )}

      {/* 9. OFFLINE SYNC VIEW */}
      {activeTab === "offline_sync" && (
        <div className="space-y-6">
          {/* Main Control Card */}
          <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60 p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="display-font text-lg font-bold">Field Offline Storage &amp; Sync Command</CardTitle>
                    {isSyncing ? (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 animate-pulse font-bold text-[11px]">
                        <RefreshCw className="mr-1 h-3 w-3 animate-spin text-blue-600" /> SYNCING
                      </Badge>
                    ) : !isOnline || isSimulatedOffline ? (
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[11px]">
                        <WifiOff className="mr-1 h-3 w-3 text-amber-700" /> OFFLINE
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" /> ONLINE
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    IndexedDB mutation queue (`arjuna-offline-v2`) with topological dependency remapping &amp; conflict tracking.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={toggleSimulatedOffline}
                    variant="outline"
                    size="sm"
                    className={`rounded-full text-xs font-semibold ${isSimulatedOffline ? "border-amber-400 bg-amber-50 text-amber-900" : "bg-white"}`}
                  >
                    {isSimulatedOffline ? (
                      <>
                        <WifiOff className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> Disable Offline Simulation
                      </>
                    ) : (
                      <>
                        <Wifi className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Simulate Offline Round
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={async () => {
                      await clearSyncedMutations();
                      refreshLocalData();
                      toast.success("Cleared all synchronized records from IndexedDB queue.");
                    }}
                    variant="ghost"
                    size="sm"
                    disabled={syncedCount === 0}
                    className="rounded-full text-xs text-slate-600 hover:bg-slate-100"
                  >
                    Clear Synced
                  </Button>

                  {(failedCount > 0 || conflictCount > 0) && (
                    <Button
                      onClick={retryAllFailed}
                      disabled={isSyncing}
                      size="sm"
                      variant="outline"
                      className="rounded-full border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-semibold"
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Retry Errors ({failedCount + conflictCount})
                    </Button>
                  )}

                  <Button
                    onClick={async () => {
                      const res = await triggerSync();
                      refreshLocalData();
                      utils.patients.list.invalidate();
                      utils.households.list.invalidate();
                      utils.referrals.list.invalidate();
                      utils.dashboard.overview.invalidate();
                    }}
                    disabled={pendingCount === 0 || isSyncing}
                    size="sm"
                    className="rounded-full bg-[#1f4935] text-white hover:bg-[#163727] text-xs font-bold shadow-xs px-4"
                  >
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Synchronizing Queue…" : `Sync Now (${pendingCount} Pending)`}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold">Total Queue</span>
                    <Database className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-1">{offlineQueue.length}</p>
                  <span className="text-[11px] text-slate-400">IndexedDB stored</span>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-800 font-semibold">Pending Replay</span>
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</p>
                  <span className="text-[11px] text-amber-700 font-medium">Awaiting auto-sync</span>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-800 font-semibold">Synced on Server</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{syncedCount}</p>
                  <span className="text-[11px] text-emerald-700 font-medium">Verified &amp; active</span>
                </div>

                <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-800 font-semibold">Conflicts &amp; Errors</span>
                    <AlertTriangle className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-black text-purple-900 mt-1">{conflictCount + failedCount}</p>
                  <span className="text-[11px] text-purple-700 font-medium">Non-destructive log</span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  {(["all", "pending", "synced", "conflict", "failed"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setQueueFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                        queueFilter === f
                          ? "bg-[#15181b] text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {f === "all"
                        ? `All Records (${offlineQueue.length})`
                        : f === "pending"
                        ? `Pending (${pendingCount})`
                        : f === "synced"
                        ? `Synced (${syncedCount})`
                        : f === "conflict"
                        ? `Conflicts (${conflictCount})`
                        : `Failed (${failedCount})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mutation Queue Table / Cards */}
              {offlineQueue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-800 text-sm">IndexedDB Mutation Queue Clean</p>
                  <p className="text-xs text-slate-500 mt-1">
                    All household registrations, patients, screening vitals, and preliminary referrals are synchronized.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {offlineQueue
                    .filter((m) => (queueFilter === "all" ? true : m.syncStatus === queueFilter))
                    .map((m) => {
                      const entityColors: Record<string, string> = {
                        household: "bg-blue-100 text-blue-800 border-blue-200",
                        patient: "bg-emerald-100 text-emerald-800 border-emerald-200",
                        visit: "bg-rose-100 text-rose-800 border-rose-200",
                        screening: "bg-rose-100 text-rose-800 border-rose-200",
                        referral: "bg-purple-100 text-purple-800 border-purple-200",
                      };

                      const statusColors: Record<string, string> = {
                        pending: "bg-amber-100 text-amber-900 border-amber-300",
                        syncing: "bg-blue-100 text-blue-900 border-blue-300 animate-pulse",
                        synced: "bg-emerald-100 text-emerald-900 border-emerald-300",
                        conflict: "bg-purple-100 text-purple-900 border-purple-300",
                        failed: "bg-rose-100 text-rose-900 border-rose-300",
                      };

                      // Human-readable summary
                      let summaryText = "";
                      if (m.entity === "household") {
                        summaryText = `Household Head: ${m.payload.headName || "Unnamed"} · Village: ${m.payload.village || "Sundarpur"}`;
                      } else if (m.entity === "patient") {
                        summaryText = `Beneficiary: ${m.payload.name || "Unnamed"} (${m.payload.age}y, ${m.payload.gender || "female"}) · ${m.payload.village || "Sundarpur"}`;
                      } else if (m.entity === "visit" || m.entity === "screening") {
                        summaryText = `Vitals: BP ${m.payload.bpSystolic || "--"}/${m.payload.bpDiastolic || "--"}, SpO2 ${m.payload.spo2 || "--"}%, Glucose ${m.payload.glucose || "--"} mg/dL`;
                      } else if (m.entity === "referral") {
                        summaryText = `Urgency: ${(String(m.payload.urgency || "urgent")).toUpperCase()} · Reason: ${m.payload.reason || "Field referral"}`;
                      }

                      return (
                        <div
                          key={m.uuid}
                          className="rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`text-[10px] font-bold uppercase ${entityColors[m.entity] || "bg-slate-100 text-slate-800"}`}>
                                  {m.entity}
                                </Badge>
                                <span className="text-[10px] font-mono text-slate-400">
                                  UUID: {m.uuid.substring(0, 14)}…
                                </span>
                                <Badge className={`text-[10px] font-bold uppercase ${statusColors[m.syncStatus]}`}>
                                  {m.syncStatus}
                                </Badge>
                                {m.retryCount > 0 && (
                                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    Retries: {m.retryCount}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs font-semibold text-slate-800">{summaryText}</p>

                              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                <span>Captured: {new Date(m.timestamp).toLocaleTimeString()} ({new Date(m.timestamp).toLocaleDateString()})</span>
                                {m.serverEntityId && (
                                  <span className="text-emerald-700 font-semibold">Server ID: #{m.serverEntityId}</span>
                                )}
                              </div>

                              {m.lastError && (
                                <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 font-medium">
                                  <strong>Notice:</strong> {m.lastError}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedMutationDetails(m)}
                                className="rounded-full text-xs h-8 px-3"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" /> Details
                              </Button>

                              {(m.syncStatus === "failed" || m.syncStatus === "conflict" || m.syncStatus === "pending") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => retryMutation(m.uuid)}
                                  className="rounded-full text-xs h-8 px-3 text-emerald-700 hover:bg-emerald-50"
                                >
                                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeMutation(m.uuid)}
                                className="rounded-full text-xs h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete from queue"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 8. HEALTHCARE FACILITY GIS MAP VIEW */}
      {activeTab === "facility_map" && (
        <div className="space-y-4">
          <HealthcareFacilityMap
            defaultOriginVillage="Sundarpur"
            onSelectFacilityForReferral={(facId, facName) => {
              setReferralForm((prev) => ({ ...prev, targetFacilityId: facId }));
              setShowCreateReferral(true);
              toast.info(`Pre-selected ${facName} for referral.`);
            }}
          />
        </div>
      )}

      {/* 9. VILLAGE ACCESSIBILITY SCORES VIEW */}
      {activeTab === "village_accessibility" && (
        <div className="space-y-4">
          <VillageAccessibilityDashboard
            onSelectVillageForReferral={(villageName) => {
              toast.info(`Selected ${villageName} catchment for priority planning.`);
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS & DRAWERS */}
      {/* ========================================================================= */}

      {/* MODAL 0: Mutation Details Drawer */}
      {selectedMutationDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-base font-bold">IndexedDB Mutation Record</CardTitle>
                <CardDescription className="text-xs font-mono">{selectedMutationDetails.uuid}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedMutationDetails(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Entity</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 uppercase">{selectedMutationDetails.entity}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Operation</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{selectedMutationDetails.operation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold uppercase text-slate-900 dark:text-slate-100">{selectedMutationDetails.syncStatus}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Retries</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{selectedMutationDetails.retryCount}</span>
                </div>
              </div>

              {selectedMutationDetails.lastError && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-rose-900 dark:text-rose-200">
                  <span className="font-bold block mb-0.5">Server / Sync Response:</span>
                  <p>{selectedMutationDetails.lastError}</p>
                </div>
              )}

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Payload JSON</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56">
                  {JSON.stringify(selectedMutationDetails.payload, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMutationDetails(null)}
                  className="rounded-full text-xs"
                >
                  Close
                </Button>
                {(selectedMutationDetails.syncStatus === "failed" || selectedMutationDetails.syncStatus === "conflict" || selectedMutationDetails.syncStatus === "pending") && (
                  <Button
                    onClick={() => {
                      retryMutation(selectedMutationDetails.uuid);
                      setSelectedMutationDetails(null);
                    }}
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    Retry Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 1: Register Household */}
      {showAddHousehold && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Register Village Household</CardTitle>
                <CardDescription className="text-xs">Create new household unit in village demographic registry</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddHousehold(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Head of Household Name *</label>
                <Input
                  value={householdForm.headName}
                  onChange={(e) => setHouseholdForm({ ...householdForm, headName: e.target.value })}
                  placeholder="e.g. Govindbhai Patel"
                  className="mt-1 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">District *</label>
                  <select
                    value={householdForm.district}
                    onChange={(e) => {
                      const newDist = e.target.value;
                      const cities = getCitiesForDistrict(newDist);
                      setHouseholdForm({
                        ...householdForm,
                        district: newDist,
                        village: cities[0] || "",
                      });
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {MAHARASHTRA_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">City / Village / Taluka *</label>
                  <select
                    value={householdForm.village}
                    onChange={(e) => setHouseholdForm({ ...householdForm, village: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {availableHouseholdCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Primary Contact Number</label>
                <Input
                  value={householdForm.contact}
                  onChange={(e) => setHouseholdForm({ ...householdForm, contact: e.target.value })}
                  placeholder="+91 98 2211 4410"
                  className="mt-1 text-xs"
                />
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                <strong>Assigned Worker:</strong> Current ASHA/CHO user will be assigned as primary health coordinator.
              </div>
              <Button
                onClick={async () => {
                  if (!householdForm.headName.trim()) {
                    toast.error("Head of household name is required");
                    return;
                  }
                  if (!householdForm.village.trim()) {
                    toast.error("Village name is required");
                    return;
                  }

                  if (!isOnline || isSimulatedOffline) {
                    await createHouseholdOfflineFirst({
                      headName: householdForm.headName.trim(),
                      village: householdForm.village.trim(),
                      district: householdForm.district.trim(),
                      contact: householdForm.contact.trim() || undefined,
                    });
                    setShowAddHousehold(false);
                    setHouseholdForm({ headName: "", village: userVillage, district: userDistrict, contact: "" });
                    toast.success("Household saved to offline IndexedDB (will sync when online)");
                    refreshLocalData();
                    return;
                  }

                  createHousehold.mutate({
                    headName: householdForm.headName.trim(),
                    village: householdForm.village.trim(),
                    district: householdForm.district.trim(),
                    contact: householdForm.contact.trim() || undefined,
                  });
                }}
                disabled={createHousehold.isPending}
                className="w-full rounded-full bg-[#1f4935] text-white hover:bg-[#163727] mt-2 font-semibold"
              >
                {createHousehold.isPending ? "Saving Household…" : "Save Household"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 2: Register Patient / Add Member */}
      {showAddPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <Card className="w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95 my-8">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Register Patient / Beneficiary</CardTitle>
                <CardDescription className="text-xs">Complete demographic & baseline clinical profile</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddPatient(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
                  <Input
                    value={patientForm.name}
                    onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                    placeholder="e.g. Savita Ben Vaghela"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Age (Years) *</label>
                  <Input
                    type="number"
                    value={patientForm.age}
                    onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                    placeholder="45"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Gender *</label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value as any })}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                    <option value="undisclosed">Undisclosed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Contact Number</label>
                  <Input
                    value={patientForm.contact}
                    onChange={(e) => setPatientForm({ ...patientForm, contact: e.target.value })}
                    placeholder="+91 98 7654 3210"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Emergency Contact</label>
                  <Input
                    value={patientForm.emergencyContact}
                    onChange={(e) => setPatientForm({ ...patientForm, emergencyContact: e.target.value })}
                    placeholder="+91 98 2211 4400"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">District *</label>
                  <select
                    value={patientForm.district}
                    onChange={(e) => {
                      const newDist = e.target.value;
                      const cities = getCitiesForDistrict(newDist);
                      setPatientForm({
                        ...patientForm,
                        district: newDist,
                        village: cities[0] || "",
                      });
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {MAHARASHTRA_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">City / Village / Taluka *</label>
                  <select
                    value={patientForm.village}
                    onChange={(e) => setPatientForm({ ...patientForm, village: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {availablePatientCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Blood Group</label>
                  <select
                    value={patientForm.bloodGroup}
                    onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Household Affiliation</label>
                  <select
                    value={patientForm.householdId || ""}
                    onChange={(e) => setPatientForm({ ...patientForm, householdId: e.target.value ? Number(e.target.value) : undefined })}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">None / Standalone Record</option>
                    {(households.data || []).map((h) => (
                      <option key={h.id} value={h.id}>HH #{h.id} - {h.headName} ({h.village})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Known Allergies</label>
                <Input
                  value={patientForm.allergies}
                  onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Sulfa drugs, Peanuts"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Existing Chronic Conditions</label>
                <Input
                  value={patientForm.conditions}
                  onChange={(e) => setPatientForm({ ...patientForm, conditions: e.target.value })}
                  placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma"
                  className="mt-1 text-xs"
                />
              </div>

              <Button
                onClick={async () => {
                  if (!patientForm.name.trim() || patientForm.name.trim().length < 2) {
                    toast.error("Full name must be at least 2 characters");
                    return;
                  }
                  if (!patientForm.age || isNaN(Number(patientForm.age)) || Number(patientForm.age) < 0 || Number(patientForm.age) > 120) {
                    toast.error("Please enter a valid age between 0 and 120");
                    return;
                  }
                  if (!patientForm.village.trim()) {
                    toast.error("Village is required");
                    return;
                  }

                  if (!isOnline || isSimulatedOffline) {
                    await createPatientOfflineFirst({
                      name: patientForm.name.trim(),
                      age: Number(patientForm.age),
                      gender: patientForm.gender,
                      contact: patientForm.contact.trim() || undefined,
                      village: patientForm.village.trim(),
                      district: patientForm.district.trim(),
                      emergencyContact: patientForm.emergencyContact.trim() || undefined,
                      bloodGroup: patientForm.bloodGroup || undefined,
                      allergies: patientForm.allergies.trim() || undefined,
                      conditions: patientForm.conditions.trim() || undefined,
                      householdId: patientForm.householdId,
                    });
                    refreshLocalData();
                    setShowAddPatient(false);
                    toast.success("Beneficiary saved to offline IndexedDB (will sync when online)");
                    return;
                  }

                  createPatient.mutate({
                    name: patientForm.name.trim(),
                    age: Number(patientForm.age),
                    gender: patientForm.gender,
                    contact: patientForm.contact.trim() || undefined,
                    village: patientForm.village.trim(),
                    district: patientForm.district.trim(),
                    emergencyContact: patientForm.emergencyContact.trim() || undefined,
                    bloodGroup: patientForm.bloodGroup || undefined,
                    allergies: patientForm.allergies.trim() || undefined,
                    conditions: patientForm.conditions.trim() || undefined,
                    householdId: typeof patientForm.householdId === "number" ? patientForm.householdId : undefined,
                  });
                }}
                disabled={createPatient.isPending}
                className="w-full rounded-full bg-[#1f4935] text-white hover:bg-[#163727] mt-2 font-semibold"
              >
                {createPatient.isPending ? "Registering Beneficiary…" : "Register Beneficiary"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 3: Edit Patient */}
      {showEditPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <Card className="w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95 my-8">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Edit Beneficiary Profile</CardTitle>
                <CardDescription className="text-xs">Update demographics, contacts, and clinical baseline</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowEditPatient(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
                  <Input
                    value={editPatientForm.name}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, name: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Age (Years) *</label>
                  <Input
                    type="number"
                    value={editPatientForm.age}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, age: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Gender</label>
                  <select
                    value={editPatientForm.gender}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, gender: e.target.value as any })}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                    <option value="undisclosed">Undisclosed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Contact Number</label>
                  <Input
                    value={editPatientForm.contact}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, contact: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Emergency Contact</label>
                  <Input
                    value={editPatientForm.emergencyContact}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, emergencyContact: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">District</label>
                  <select
                    value={editPatientForm.district}
                    onChange={(e) => {
                      const newDist = e.target.value;
                      const cities = getCitiesForDistrict(newDist);
                      setEditPatientForm({
                        ...editPatientForm,
                        district: newDist,
                        village: cities[0] || "",
                      });
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {MAHARASHTRA_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">City / Village / Taluka</label>
                  <select
                    value={editPatientForm.village}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, village: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {availableEditPatientCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Blood Group</label>
                  <select
                    value={editPatientForm.bloodGroup}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, bloodGroup: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Household Affiliation</label>
                  <select
                    value={editPatientForm.householdId || ""}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, householdId: e.target.value ? Number(e.target.value) : undefined })}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">None / Standalone Record</option>
                    {(households.data || []).map((h) => (
                      <option key={h.id} value={h.id}>HH #{h.id} - {h.headName} ({h.village})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Known Allergies</label>
                <Input
                  value={editPatientForm.allergies}
                  onChange={(e) => setEditPatientForm({ ...editPatientForm, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Sulfa drugs"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Existing Chronic Conditions</label>
                <Input
                  value={editPatientForm.conditions}
                  onChange={(e) => setEditPatientForm({ ...editPatientForm, conditions: e.target.value })}
                  placeholder="e.g. Hypertension, Type 2 Diabetes"
                  className="mt-1 text-xs"
                />
              </div>

              <Button
                onClick={() => {
                  if (!editPatientForm.name.trim() || editPatientForm.name.trim().length < 2) {
                    toast.error("Full name must be at least 2 characters");
                    return;
                  }
                  if (!editPatientForm.age || isNaN(Number(editPatientForm.age))) {
                    toast.error("Valid age is required");
                    return;
                  }
                  updatePatient.mutate({
                    id: editPatientForm.id,
                    name: editPatientForm.name.trim(),
                    age: Number(editPatientForm.age),
                    gender: editPatientForm.gender,
                    contact: editPatientForm.contact.trim() || undefined,
                    village: editPatientForm.village.trim() || undefined,
                    district: editPatientForm.district.trim() || undefined,
                    emergencyContact: editPatientForm.emergencyContact.trim() || undefined,
                    bloodGroup: editPatientForm.bloodGroup || undefined,
                    allergies: editPatientForm.allergies.trim() || undefined,
                    conditions: editPatientForm.conditions.trim() || undefined,
                    householdId: editPatientForm.householdId,
                  });
                }}
                disabled={updatePatient.isPending}
                className="w-full rounded-full bg-[#1f4935] text-white hover:bg-[#163727] mt-2 font-semibold"
              >
                {updatePatient.isPending ? "Updating…" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 4: PATIENT PROFILE & HEALTH HISTORY (Comprehensive EHR) */}
      {showPatientProfile && selectedPatientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
          <Card className="w-full max-w-4xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f3ed] dark:bg-emerald-950/60 text-[#1f4935] dark:text-emerald-400 font-bold text-lg">
                  {patientProfile.data?.patient?.name?.charAt(0) || "P"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {patientProfile.data?.patient?.name || `Patient #${selectedPatientId}`}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">ID: #{selectedPatientId}</Badge>
                    {patientProfile.data?.patient?.bloodGroup && (
                      <Badge className="bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 text-[10px] font-bold">
                        {patientProfile.data.patient.bloodGroup}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    {patientProfile.data?.patient?.age} yrs · {patientProfile.data?.patient?.gender} · {patientProfile.data?.patient?.village}, {patientProfile.data?.patient?.district}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {patientProfile.data?.patient && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowPatientProfile(false);
                      openEditPatientModal(patientProfile.data.patient);
                    }}
                    className="rounded-full text-xs"
                  >
                    <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setShowPatientProfile(false)} className="rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs overflow-y-auto flex-1">
              {patientProfile.isLoading ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-600 mb-2" />
                  <p>Loading beneficiary EHR record…</p>
                </div>
              ) : patientProfile.data ? (
                <>
                  {/* Top Info Grid */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* Demographics & Contact */}
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#f9fafb] dark:bg-slate-800/60 p-3.5 space-y-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">Contact & Location</p>
                      <p className="text-slate-600 dark:text-slate-400"><strong>Phone:</strong> {patientProfile.data.patient.contact || "N/A"}</p>
                      <p className="text-slate-600 dark:text-slate-400"><strong>Emergency:</strong> {patientProfile.data.patient.emergencyContact || "N/A"}</p>
                      <p className="text-slate-600 dark:text-slate-400"><strong>Village:</strong> {patientProfile.data.patient.village}</p>
                    </div>

                    {/* Household & Family */}
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#f9fafb] dark:bg-slate-800/60 p-3.5 space-y-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">Household Affiliation</p>
                      {patientProfile.data.household ? (
                        <>
                          <p className="text-slate-600 dark:text-slate-400"><strong>HH #{patientProfile.data.household.id}:</strong> {patientProfile.data.household.headName} (Head)</p>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                            Family Members ({patientProfile.data.familyMembers.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {patientProfile.data.familyMembers.map((fm) => (
                              <Badge key={fm.id} variant="secondary" className="text-[9px] cursor-pointer" onClick={() => openPatientProfileModal(fm.id)}>
                                {fm.name} ({fm.age}y)
                              </Badge>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-slate-400">No household linked</p>
                      )}
                    </div>

                    {/* Risk Stratification */}
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#f9fafb] dark:bg-slate-800/60 p-3.5 space-y-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">Risk Stratification</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-xs ${
                            patientProfile.data.patient.riskCategory === "critical"
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                              : patientProfile.data.patient.riskCategory === "high"
                              ? "bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300"
                              : patientProfile.data.patient.riskCategory === "moderate"
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                              : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                          }`}
                        >
                          {patientProfile.data.patient.riskCategory?.toUpperCase()}
                        </Badge>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{patientProfile.data.patient.riskScore}/100</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Based on vitals, clinical history & missed follow-ups</p>
                    </div>
                  </div>

                  {/* Baseline Allergies & Conditions Alert */}
                  {(patientProfile.data.patient.allergies || patientProfile.data.patient.conditions) && (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/40 p-3.5 flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        {patientProfile.data.patient.allergies && (
                          <p className="text-rose-800 dark:text-rose-300 font-bold">
                            ⚠️ Allergies: <span className="font-normal">{patientProfile.data.patient.allergies}</span>
                          </p>
                        )}
                        {patientProfile.data.patient.conditions && (
                          <p className="text-amber-900 dark:text-amber-300 font-bold">
                            🩺 Chronic Conditions: <span className="font-normal">{patientProfile.data.patient.conditions}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Latest Vitals Card */}
                  {patientProfile.data.latestVitals && (
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <HeartPulse className="h-4 w-4 text-rose-600" />
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">Latest Recorded Vitals</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(patientProfile.data.latestVitals.lastCheckedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                        <div className="rounded-xl bg-[#f9fafb] dark:bg-slate-800/60 p-2 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400">BP (mmHg)</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {patientProfile.data.latestVitals.bpSystolic && patientProfile.data.latestVitals.bpDiastolic
                              ? `${patientProfile.data.latestVitals.bpSystolic}/${patientProfile.data.latestVitals.bpDiastolic}`
                              : "N/A"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#f9fafb] dark:bg-slate-800/60 p-2 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400">Blood Glucose</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {patientProfile.data.latestVitals.glucose ? `${patientProfile.data.latestVitals.glucose} mg/dL` : "N/A"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#f9fafb] dark:bg-slate-800/60 p-2 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400">SpO2</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {patientProfile.data.latestVitals.spo2 ? `${patientProfile.data.latestVitals.spo2}%` : "N/A"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#f9fafb] dark:bg-slate-800/60 p-2 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400">Weight</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {patientProfile.data.latestVitals.weight ? `${patientProfile.data.latestVitals.weight} kg` : "N/A"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#f9fafb] dark:bg-slate-800/60 p-2 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400">Triage Level</span>
                          <p className="font-bold text-rose-700 dark:text-rose-400 text-sm uppercase">
                            {patientProfile.data.latestVitals.triageLevel || "Normal"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prescriptions & Follow-ups */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Active Prescriptions */}
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#f9fafb] dark:bg-slate-800/60 p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold text-xs">
                        <Pill className="h-3.5 w-3.5 text-blue-600" /> Active Prescriptions ({patientProfile.data.prescriptions.length})
                      </div>
                      {patientProfile.data.prescriptions.length === 0 ? (
                        <p className="text-slate-400 text-[11px]">No active prescriptions on record.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {patientProfile.data.prescriptions.map((rx) => (
                            <div key={rx.id} className="rounded-xl bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800 text-[11px]">
                              <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                                <span>{rx.medicineName} ({rx.dosage})</span>
                                <Badge variant="outline" className="text-[9px]">{rx.frequency}</Badge>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">Duration: {rx.duration} · {rx.instructions || "Take with water"}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Follow-ups */}
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#f9fafb] dark:bg-slate-800/60 p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold text-xs">
                        <Clock className="h-3.5 w-3.5 text-amber-600" /> Scheduled Follow-ups ({patientProfile.data.followUps.length})
                      </div>
                      {patientProfile.data.followUps.length === 0 ? (
                        <p className="text-slate-400 text-[11px]">No active follow-ups scheduled.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {patientProfile.data.followUps.map((fu) => (
                            <div key={fu.id} className="rounded-xl bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between">
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{fu.title}</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[10px]">Due: {new Date(fu.dueAt).toLocaleDateString()}</p>
                              </div>
                              <Badge className={fu.status === "completed" ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[9px]" : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[9px]"}>
                                {fu.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clinical Visits & Health History Timeline */}
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#f9fafb] dark:bg-slate-800/60 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">Health History & Clinical Encounters ({patientProfile.data.visits.length})</span>
                    </div>

                    {patientProfile.data.visits.length === 0 ? (
                      <p className="text-slate-400 text-[11px]">No recorded field visits or screenings yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {patientProfile.data.visits.map((v) => (
                          <div key={v.id} className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(v.createdAt).toLocaleDateString()} - Field Checkup</span>
                              <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[9px]">Triage: {v.triageLevel || "Routine"}</Badge>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400"><strong>Symptoms:</strong> {v.symptoms || "Routine surveillance"}</p>
                            {v.diagnosis && <p className="text-slate-600 dark:text-slate-400"><strong>Diagnosis:</strong> {v.diagnosis}</p>}
                            <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                              {v.bpSystolic && <span>BP: {v.bpSystolic}/{v.bpDiastolic} mmHg</span>}
                              {v.glucose && <span>Glucose: {v.glucose} mg/dL</span>}
                              {v.spo2 && <span>SpO2: {v.spo2}%</span>}
                              {v.temperature && <span>Temp: {v.temperature}°F</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Referrals */}
                  {patientProfile.data.referrals.length > 0 && (
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#f9fafb] dark:bg-slate-800/60 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-blue-700" />
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">Referral History</span>
                      </div>
                      <div className="space-y-1.5">
                        {patientProfile.data.referrals.map((ref) => (
                          <div key={ref.id} className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 text-[11px]">
                            <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                              <span>Specialty: {ref.specialty || "Internal Medicine"} ({ref.urgency})</span>
                              <Badge variant="outline" className="text-[9px] uppercase">{ref.status}</Badge>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">Reason: {ref.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 5: Household Details View with Complete Citizen Profiles */}
      {showHouseholdDetail && selectedHousehold && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95 my-6 max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                      Household #{selectedHousehold.id} — {selectedHousehold.headName}
                    </CardTitle>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                      {selectedHousehold.members?.length ?? 0} Enrolled Citizens
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    📍 {selectedHousehold.village}, {selectedHousehold.district} · Primary Contact: {selectedHousehold.contact || "N/A"}
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowHouseholdDetail(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs overflow-y-auto flex-1">
              {/* Household Summary Pill */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-medium">Head of Family</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedHousehold.headName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Contact Number</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedHousehold.contact || "Not Provided"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Assigned ASHA</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">ASHA ID #{selectedHousehold.assignedWorkerId ?? 1}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Location</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedHousehold.village}</span>
                </div>
              </div>

              {/* Citizen Members Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    Enrolled Citizens & Family Health Profiles ({selectedHousehold.members?.length ?? 0})
                  </h4>
                </div>

                {(!selectedHousehold.members || selectedHousehold.members.length === 0) ? (
                  <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-slate-400 text-xs">No individual citizens linked to this household yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedHousehold.members.map((m: any, idx: number) => {
                      const abhaFormatted = m.abhaId || `91-${1000 + ((m.id * 37) % 8999)}-${2000 + ((m.id * 53) % 7999)}-${1000 + ((m.id * 19) % 8999)}`;
                      const isHead = m.name?.toLowerCase() === selectedHousehold.headName?.toLowerCase() || idx === 0;
                      const relationship = isHead ? "Head of Family" : idx === 1 ? (m.gender === "female" ? "Spouse" : "Son") : idx === 2 ? "Child / Dependent" : "Family Member";

                      return (
                        <div
                          key={m.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-3 shadow-xs space-y-2.5 transition hover:border-emerald-300"
                        >
                          {/* Member Top Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                                {m.name ? m.name.charAt(0).toUpperCase() : "C"}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-900 dark:text-white">{m.name}</span>
                                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-medium">
                                    {relationship}
                                  </Badge>
                                  {m.bloodGroup && (
                                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                                      {m.bloodGroup}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  {m.age} years · {m.gender} · ABHA ID: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{abhaFormatted}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              {m.riskCategory && (
                                <Badge
                                  className={`text-[10px] uppercase font-bold ${
                                    m.riskCategory === "critical"
                                      ? "bg-rose-600 text-white"
                                      : m.riskCategory === "high"
                                      ? "bg-amber-600 text-white"
                                      : m.riskCategory === "moderate"
                                      ? "bg-yellow-500 text-slate-900"
                                      : "bg-emerald-600 text-white"
                                  }`}
                                >
                                  {m.riskCategory} Risk
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2.5 rounded-full border-slate-300 text-slate-700 hover:bg-slate-100"
                                onClick={() => {
                                  setShowHouseholdDetail(false);
                                  openPatientProfileModal(m.id);
                                }}
                              >
                                View EHR
                              </Button>
                            </div>
                          </div>

                          {/* Clinical Profile & Vitals */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div className="space-y-1">
                              <p className="text-slate-600">
                                <strong className="text-slate-800 dark:text-slate-200">Conditions:</strong>{" "}
                                {m.conditions || "None reported / Healthy"}
                              </p>
                              <p className="text-slate-600">
                                <strong className="text-slate-800 dark:text-slate-200">Allergies:</strong>{" "}
                                {m.allergies || "None reported"}
                              </p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-around text-center">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">BP</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {m.bpSystolic && m.bpDiastolic ? `${m.bpSystolic}/${m.bpDiastolic}` : "120/80"}
                                </span>
                              </div>
                              <div className="border-l border-slate-200 dark:border-slate-700 h-6"></div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Glucose</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {m.glucose ? `${m.glucose} mg/dL` : "105 mg/dL"}
                                </span>
                              </div>
                              <div className="border-l border-slate-200 dark:border-slate-700 h-6"></div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">SpO2</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {m.spo2 ? `${m.spo2}%` : "98%"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 rounded-b-2xl shrink-0">
              <Button
                onClick={() => {
                  setShowHouseholdDetail(false);
                  openAddMemberModal(selectedHousehold.id);
                }}
                className="w-full rounded-full bg-[#1f4935] text-white hover:bg-[#163727] text-xs font-semibold h-9 shadow-sm gap-1.5"
              >
                <UserPlus className="h-4 w-4" /> + Add New Citizen to this Household
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 6: Create Referral with Smart Facility Recommendations */}
      {showCreateReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95 my-8">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-3 bg-[#15181b] text-white rounded-t-xl">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#a9d1e8]" />
                  <CardTitle className="text-lg font-bold text-white">Smart Referral Engine & Transport</CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-300">
                  AI-Assisted Multi-Factor Facility Ranking & 108 Emergency Transit Coordination
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateReferral(false)} className="rounded-full text-white hover:bg-white/10">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Form Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Beneficiary</label>
                  <select
                    value={selectedPatientForReferral || referralForm.patientId}
                    onChange={(e) => setSelectedPatientForReferral(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {(patients.data || []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.age} yrs · {p.village})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Clinical Specialty</label>
                  <Input
                    value={referralForm.specialty}
                    onChange={(e) => setReferralForm({ ...referralForm, specialty: e.target.value })}
                    placeholder="General Medicine / Cardiology"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Triage Urgency</label>
                  <select
                    value={referralForm.urgency}
                    onChange={(e) => setReferralForm({ ...referralForm, urgency: e.target.value as any })}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="routine">Routine Handover</option>
                    <option value="urgent">Urgent (Within 4-6h)</option>
                    <option value="emergency">Emergency (Immediate 108)</option>
                  </select>
                </div>
              </div>

              {/* Smart Recommendations List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                    <Navigation className="h-3.5 w-3.5 text-blue-600" />
                    Ranked Facility Recommendations
                  </span>
                </div>

                {referralRecommendations.isLoading ? (
                  <p className="p-4 text-center text-xs text-slate-400">Evaluating proximity, specialties, and doctor schedules…</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {(referralRecommendations.data?.recommendations || []).map((rec: any, idx: number) => {
                      const isSelected = (selectedFacilityForReferral?.id || referralForm.targetFacilityId) === rec.id;
                      return (
                        <div
                          key={rec.id}
                          onClick={() => {
                            setSelectedFacilityForReferral(rec);
                            setReferralForm({ ...referralForm, targetFacilityId: rec.id });
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#15181b] bg-[#f0f7fb] dark:bg-slate-800 ring-2 ring-[#15181b]/10 dark:ring-emerald-500/30"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  #{idx + 1} {rec.name}
                                </span>
                                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] border-0">
                                  {rec.facilityType}
                                </Badge>
                                {rec.emergency24x7 && (
                                  <Badge className="bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[9px] border-0">
                                    24/7 Emergency
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                📍 Distance: <strong>{rec.distanceKm} km</strong> · Doctor on Duty: <strong>{rec.doctorOnDuty?.name || "Available"}</strong> ({rec.doctorOnDuty?.status || "On Duty"})
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge className="bg-emerald-600 text-white font-mono text-xs px-2 py-0.5">
                                Score: {rec.rankingScore}/100
                              </Badge>
                              <span className="block text-[10px] text-slate-400 mt-0.5">
                                {isSelected ? "✓ Selected" : "Click to select"}
                              </span>
                            </div>
                          </div>

                          {/* Breakdown tags */}
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                            <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              Specialty: <strong>{rec.scoreBreakdown?.specialtyMatch ? "Matched (+30)" : "General"}</strong>
                            </span>
                            <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              Distance: <strong>{rec.distanceKm} km (+{rec.scoreBreakdown?.distanceScore || 0})</strong>
                            </span>
                            <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              Doctor: <strong>{rec.doctorOnDuty?.status === "On Duty" ? "Available (+15)" : "On Call"}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reason & Transport Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Clinical Reason / Diagnosis</label>
                  <Textarea
                    value={referralForm.reason}
                    onChange={(e) => setReferralForm({ ...referralForm, reason: e.target.value })}
                    placeholder="Provide detailed clinical handover notes, symptoms, and vital triggers..."
                    className="mt-1 text-xs resize-none h-20"
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">Assigned Transit / 108 Ambulance</label>
                    <Input
                      value={transportVehicle}
                      onChange={(e) => setTransportVehicle(e.target.value)}
                      placeholder="e.g. 108 Ambulance (GJ-01-AB-1088)"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">Ambulance / Driver Contact</label>
                    <Input
                      value={transportDriverContact}
                      onChange={(e) => setTransportDriverContact(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateReferral(false)}
                  className="w-1/3 rounded-full text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!referralForm.reason.trim()) {
                      toast.error("Please provide clinical referral reason");
                      return;
                    }
                    const targetId = selectedFacilityForReferral?.id || referralForm.targetFacilityId || 1;
                    const targetFacilityName = selectedFacilityForReferral?.name || "District Hospital / CHC";

                    if (!isOnline || isSimulatedOffline || typeof selectedPatientForReferral === "string") {
                      await createReferralOfflineFirst({
                        patientId: selectedPatientForReferral || referralForm.patientId || 1,
                        targetFacilityId: targetId,
                        targetFacilityName,
                        specialty: referralForm.specialty,
                        urgency: referralForm.urgency,
                        reason: referralForm.reason.trim(),
                        recommendationScore: selectedFacilityForReferral?.rankingScore || 85,
                        distanceKm: selectedFacilityForReferral?.distanceKm || 4.2,
                      });
                      setShowCreateReferral(false);
                      toast.success("Preliminary referral queued offline in IndexedDB (will sync when online)");
                      refreshLocalData();
                      return;
                    }

                    confirmReferral.mutate({
                      patientId: typeof (selectedPatientForReferral || referralForm.patientId) === "number" ? Number(selectedPatientForReferral || referralForm.patientId) : 1,
                      targetFacilityId: targetId,
                      specialty: referralForm.specialty,
                      urgency: referralForm.urgency,
                      reason: referralForm.reason.trim(),
                      transportVehicle: transportVehicle.trim() || undefined,
                      transportDriverContact: transportDriverContact.trim() || undefined,
                    });
                  }}
                  disabled={confirmReferral.isPending}
                  className="w-2/3 rounded-full bg-[#15181b] text-white hover:bg-black font-semibold text-xs shadow-sm"
                >
                  {confirmReferral.isPending ? "Confirming & Alerting Facility…" : "Confirm Facility & Dispatch 108"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Delete Beneficiary Record */}
      {deletePatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="h-5 w-5" />
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Delete Beneficiary Record</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDeletePatientModal(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Are you sure you want to permanently delete the village health record for <strong>{deletePatientModal.name}</strong>?
                This removes their registered profile, medical history, and related records from the roster.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setDeletePatientModal(null)} className="rounded-full text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => deletePatientMutation.mutate({ id: deletePatientModal.id })}
                  disabled={deletePatientMutation.isPending}
                  className="rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  {deletePatientMutation.isPending ? "Deleting..." : "Delete Beneficiary"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </WorkspaceLayout>
  );
}
