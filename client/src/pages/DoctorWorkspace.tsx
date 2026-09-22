import React, { useState } from "react";
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
  AlertTriangle,
  ArrowRight,
  Ban,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileHeart,
  FilePlus,
  FileText,
  HeartPulse,
  Hospital,
  Info,
  Navigation,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { DoctorClinicalAiView } from "@/components/DoctorClinicalAiView";

export default function DoctorWorkspace() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchPatientId, setSearchPatientId] = useState<number>(1);

  // Consultation Desk Form
  const [consultForm, setConsultForm] = useState({
    patientId: 1,
    clinicalAssessment: "Essential Hypertension Stage 1 with morning systolic spikes and early nephropathy risk",
    diagnosis: "Essential Hypertension Stage 1, Type 2 Diabetes Mellitus",
    clinicalNotes: "Patient counseled on low sodium diet, hydration, and adherence to morning medication routine.",
    treatmentPlan: "Continue Telmisartan 40mg once daily after breakfast. Restrict dietary sodium to <5g/day. Increase fluid intake and walk 30 mins daily.",
    recommendedTests: "Serum Creatinine, Spot Urine Albumin-to-Creatinine Ratio (UACR), Fasting Blood Glucose",
    followUpTitle: "Post-Consultation Blood Pressure & Glycemic Review",
    followUpDays: 14,
    followUpNotes: "Check morning systolic BP and ensure Telmisartan compliance.",
    bpSystolic: 154,
    bpDiastolic: 94,
    pulse: 78,
    glucose: 158,
    spo2: 97,
    temperature: 98.4,
    weight: 64.0,
    height: 158.0,
    symptoms: "Morning dizziness, mild ankle edema, missed doses",
  });

  // Digital Prescriptions for Active Encounter
  const [consultPrescriptions, setConsultPrescriptions] = useState<
    Array<{ medicineName: string; dosage: string; frequency: string; duration: string; route: string; instructions: string }>
  >([
    {
      medicineName: "Telmisartan 40mg",
      dosage: "40mg",
      frequency: "1-0-0 (Morning)",
      duration: "30 days",
      route: "Oral",
      instructions: "Take daily with water after breakfast.",
    },
  ]);

  // AI Summary State
  const [aiSummaryData, setAiSummaryData] = useState<{
    header: string;
    summary: string;
    structuredBrief?: any;
    keyClinicalAlerts?: string[];
    suggestedFocusAreas?: string[];
    disclaimer?: string;
    safetyNotice?: string;
  } | null>(null);

  // History Tab in Consultation Desk
  const [historySubTab, setHistorySubTab] = useState<"visits" | "prescriptions" | "referrals" | "followups">("visits");

  // Digital Prescription Form Modal (Multi-medicine Batch Support)
  const [batchPrescPatientId, setBatchPrescPatientId] = useState(1);
  const [batchPrescItems, setBatchPrescItems] = useState<
    Array<{ medicineName: string; dosage: string; frequency: string; duration: string; route: string; instructions: string }>
  >([
    {
      medicineName: "Telmisartan 40mg",
      dosage: "40mg",
      frequency: "1-0-0 (Morning with water)",
      duration: "30 days",
      route: "Oral",
      instructions: "Take daily after breakfast. Do not miss doses.",
    },
  ]);
  const [prescStatusFilter, setPrescStatusFilter] = useState<string>("all");
  const [showAddPrescription, setShowAddPrescription] = useState(false);

  // Referral Outcome Form & Smart Referral State
  const [outcomeDialog, setOutcomeDialog] = useState<{ id: number; patientName: string; reason: string } | null>(null);
  const [outcomeText, setOutcomeText] = useState("");
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralPatientId, setReferralPatientId] = useState(1);
  const [referralUrgency, setReferralUrgency] = useState<"emergency" | "urgent" | "routine">("urgent");
  const [referralSpecialty, setReferralSpecialty] = useState("Cardiology / Internal Medicine");
  const [referralReason, setReferralReason] = useState("Uncontrolled hypertension (172/104) with SpO2 94% and diabetes. Requires specialist cardiology and ICU-ready bed.");
  const [transportRequired, setTransportRequired] = useState(true);
  const [transportType, setTransportType] = useState("108 Emergency Ambulance");
  const [selectedTimelineReferralId, setSelectedTimelineReferralId] = useState<number | null>(null);

  // Medicine Availability & Multi-Facility Stock Finder State
  const [medicineLookupModal, setMedicineLookupModal] = useState<{ isOpen: boolean; medicineName: string } | null>(null);
  const [medicineSearchQuery, setMedicineSearchQuery] = useState("");

  // Follow-up Management State
  const [showScheduleFollowUp, setShowScheduleFollowUp] = useState(false);
  const [scheduleFollowUpForm, setScheduleFollowUpForm] = useState({
    patientId: 1,
    assignedTo: 2,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    reason: "Post-Consultation Blood Pressure & Glycemic Review",
    referralId: "" as string | number,
    notes: "Measure sitting BP, check morning adherence to Telmisartan, verify pulse and evaluate recovery.",
  });
  const [followUpStatusFilter, setFollowUpStatusFilter] = useState<string>("ALL");
  const [cancelFollowUpModal, setCancelFollowUpModal] = useState<{ id: number; patientName: string; reason: string } | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState("");

  // Queries
  const utils = trpc.useUtils();
  const overview = trpc.dashboard.overview.useQuery(undefined, { enabled: isAuthenticated });
  const patients = trpc.patients.list.useQuery(undefined, { enabled: isAuthenticated });
  const appointments = trpc.appointments.list.useQuery(undefined, { enabled: isAuthenticated });
  const referrals = trpc.referrals.list.useQuery(undefined, { enabled: isAuthenticated });
  const prescriptions = trpc.prescriptions.list.useQuery(undefined, { enabled: isAuthenticated });
  const followUps = trpc.followUps.list.useQuery(undefined, { enabled: isAuthenticated });
  const healthWorkers = trpc.followUps.getWorkers.useQuery(undefined, { enabled: isAuthenticated });

  const scheduleFollowUpMutation = trpc.followUps.schedule.useMutation({
    onSuccess: () => {
      toast.success("Follow-up directive scheduled and worker notified");
      setShowScheduleFollowUp(false);
      utils.followUps.list.invalidate();
      utils.alerts.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelFollowUpMutation = trpc.followUps.cancel.useMutation({
    onSuccess: () => {
      toast.success("Follow-up directive cancelled");
      setCancelFollowUpModal(null);
      setCancelReasonText("");
      utils.followUps.list.invalidate();
      utils.alerts.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const detectOverdueMutation = trpc.followUps.detectOverdue.useMutation({
    onSuccess: (data) => {
      toast.info(`Overdue scan complete: ${data.overdue} overdue, ${data.dueSoon} due soon`);
      utils.followUps.list.invalidate();
      utils.alerts.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const timeline = trpc.patients.timeline.useQuery({ id: searchPatientId }, { enabled: Boolean(isAuthenticated && searchPatientId) });
  const inventory = trpc.inventory.list.useQuery(undefined, { enabled: isAuthenticated });
  const patientRiskQuery = trpc.risk.getPatientRiskProfile.useQuery({ patientId: consultForm.patientId }, { enabled: Boolean(isAuthenticated && consultForm.patientId) });
  const patientContextQuery = trpc.consultations.getPatientContext.useQuery(
    { patientId: consultForm.patientId },
    { enabled: Boolean(isAuthenticated && consultForm.patientId) }
  );

  // Real-time stock check for Consultation Desk medicines
  const consultMedsQuery = trpc.medicineAvailability.check.useQuery(
    { medicines: consultPrescriptions.map((p) => p.medicineName).filter(Boolean) },
    { enabled: consultPrescriptions.some((p) => Boolean(p.medicineName)) }
  );

  // Real-time stock check for Batch Prescription Modal medicines
  const batchMedsQuery = trpc.medicineAvailability.check.useQuery(
    { medicines: batchPrescItems.map((p) => p.medicineName).filter(Boolean) },
    { enabled: batchPrescItems.some((p) => Boolean(p.medicineName)) }
  );

  // Search across facilities when medicine lookup modal is open
  const facilityMedicineSearchQuery = trpc.medicineAvailability.searchFacilities.useQuery(
    { medicineName: medicineSearchQuery || medicineLookupModal?.medicineName || "" },
    { enabled: Boolean(medicineLookupModal?.isOpen && (medicineSearchQuery || medicineLookupModal?.medicineName)) }
  );

  const smartRecommendationsQuery = trpc.referrals.recommend.useQuery({
    patientId: referralPatientId,
    urgency: referralUrgency,
    specialty: referralSpecialty,
  });

  const referralTimelineQuery = trpc.referrals.getTimeline.useQuery(
    { id: selectedTimelineReferralId! },
    { enabled: !!selectedTimelineReferralId }
  );

  // Mutations
  const confirmReferralMutation = trpc.referrals.confirm.useMutation({
    onSuccess: () => {
      toast.success("Facility referral confirmed and routed with ranking metadata");
      setShowReferralModal(false);
      utils.referrals.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const generateSummaryMutation = trpc.consultations.generateSummary.useMutation({
    onSuccess: (data) => {
      setAiSummaryData(data);
      toast.success("AI clinical summary generated for doctor review");
    },
    onError: (err) => toast.error(err.message),
  });

  const recordConsultationMutation = trpc.consultations.recordConsultation.useMutation({
    onSuccess: () => {
      toast.success("Consultation saved to EHR and audit event recorded");
      utils.consultations.getPatientContext.invalidate();
      utils.patients.list.invalidate();
      utils.appointments.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const recordVisit = trpc.visits.create.useMutation({
    onSuccess: () => {
      toast.success("Clinical consultation documented and stored in patient EHR");
      utils.patients.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createPrescription = trpc.prescriptions.create.useMutation({
    onSuccess: () => {
      toast.success("Digital prescription created and routed to pharmacy queue");
      setShowAddPrescription(false);
      utils.prescriptions.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createBatchPrescription = trpc.prescriptions.createBatch.useMutation({
    onSuccess: () => {
      toast.success("Multi-drug digital prescription batch created and routed to pharmacy");
      setShowAddPrescription(false);
      utils.prescriptions.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updatePrescriptionStatus = trpc.prescriptions.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Prescription status updated");
      utils.prescriptions.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateReferral = trpc.referrals.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Referral clinical outcome updated");
      setOutcomeDialog(null);
      setOutcomeText("");
      utils.referrals.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createFollowUp = trpc.followUps.create.useMutation({
    onSuccess: () => {
      toast.success("Follow-up task assigned to field ASHA worker");
      utils.followUps.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const highRiskCases = (patients.data || []).filter((p) => p.riskCategory === "high" || p.riskCategory === "critical");
  const todayOpd = (appointments.data || []).filter((a) => a.status === "scheduled");
  const activeReferrals = referrals.data || [];
  const overdueFollowUpsCount = (followUps.data || []).filter(
    (f) => f.status === "OVERDUE" || f.status === "overdue"
  ).length;

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "today_patients", label: "Today's OPD Queue", icon: Users, badge: todayOpd.length },
    { id: "high_risk", label: "High-Risk Cases", icon: ShieldAlert, badge: highRiskCases.length },
    { id: "consultations", label: "Consultation Desk", icon: Stethoscope },
    { id: "clinical_ai", label: "Clinical AI Copilot", icon: Sparkles },
    { id: "patient_history", label: "Patient EHR History", icon: FileText },
    { id: "referrals", label: "Inbound Referrals", icon: Navigation, badge: activeReferrals.length },
    { id: "prescriptions", label: "Prescriptions", icon: Pill, badge: prescriptions.data?.length },
    { id: "followups", label: "Follow-up Orders", icon: Clock, badge: overdueFollowUpsCount > 0 ? overdueFollowUpsCount : undefined },
  ];

  return (
    <WorkspaceLayout
      role="doctor"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      navItems={navItems}
      title={
        activeTab === "dashboard"
          ? "Clinical Review & Outpatient Desk"
          : activeTab === "today_patients"
          ? "Today's Patient Queue (OPD)"
          : activeTab === "high_risk"
          ? "High-Risk & Critical Case Reviews"
          : activeTab === "consultations"
          ? "Active Consultation & Encounter Room"
          : activeTab === "clinical_ai"
          ? "Arjuna Clinical AI Copilot & Drug Safety"
          : activeTab === "patient_history"
          ? "Patient Longitudinal EHR History"
          : activeTab === "referrals"
          ? "Specialist & Inbound Referral Desk"
          : activeTab === "prescriptions"
          ? "Digital Prescription Registry"
          : "Field Follow-up Directives"
      }
      subtitle={`${user?.facilityName || "Primary Health Centre & Sub-District Network"} · ${user?.district || "Nandurbar"} · ${user?.name ? (user.name.startsWith("Dr.") ? user.name : `Dr. ${user.name}`) : "Dr. Sanjay Trivedi"} (${user?.designation || "Medical Officer"})`}
      actions={
        activeTab === "prescriptions" ? (
          <Button onClick={() => setShowAddPrescription(true)} className="rounded-full bg-[#15181b] text-white">
            <Plus className="mr-2 h-4 w-4" /> New Prescription
          </Button>
        ) : activeTab === "today_patients" ? (
          <Button onClick={() => setActiveTab("consultations")} className="rounded-full bg-[#15181b] text-white">
            <Stethoscope className="mr-2 h-4 w-4" /> Open Consultation Desk
          </Button>
        ) : undefined
      }
    >
      {/* 1. DASHBOARD VIEW */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Key Metric Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-xs bg-[#f8e7e8]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-rose-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Critical & High-Risk Cases</span>
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <p className="display-font mt-4 text-3xl font-extrabold text-rose-900">{highRiskCases.length}</p>
                <p className="mt-2 text-xs text-rose-700">Abnormal BP & glycemic alerts</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-[#e4f1f8]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-blue-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Today's Scheduled OPD</span>
                  <Users className="h-4 w-4" />
                </div>
                <p className="display-font mt-4 text-3xl font-extrabold text-blue-900">{todayOpd.length} Patients</p>
                <p className="mt-2 text-xs text-blue-700">Triaged general & NCD queue</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-[#e8f3ed]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Inbound Referrals</span>
                  <Navigation className="h-4 w-4" />
                </div>
                <p className="display-font mt-4 text-3xl font-extrabold text-emerald-900">{activeReferrals.length}</p>
                <p className="mt-2 text-xs text-emerald-700">From village Sub-Centres</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Active Prescriptions</span>
                  <Pill className="h-4 w-4 text-purple-600" />
                </div>
                <p className="display-font mt-4 text-3xl font-extrabold text-slate-900">{prescriptions.data?.length ?? 4}</p>
                <p className="mt-2 text-xs text-slate-500">Dispensed via PHC Pharmacy</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Consultation desk shortcut & High Risk Patients */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Today's Queue Card */}
            <Card className="border-0 shadow-xs bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Waiting Room</p>
                  <CardTitle className="display-font mt-1 text-lg font-bold">Today's OPD Consultations</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("today_patients")} className="text-xs font-semibold">
                  Queue details
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayOpd.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No patients waiting in queue.</p>
                ) : (
                  todayOpd.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-[#f9fafb] p-3.5 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700 font-bold">
                          {a.patientName?.split(" ").map((n: string) => n[0]).join("") || "PT"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{a.patientName}</p>
                          <p className="text-[11px] text-slate-500">{a.village} · {a.type.replace("_", " ")}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setConsultForm({ ...consultForm, patientId: a.patientId });
                          setActiveTab("consultations");
                        }}
                        className="rounded-full bg-[#15181b] text-white text-xs"
                      >
                        Examine
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* High Risk Alerts */}
            <Card className="border-0 shadow-xs bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Surveillance</p>
                  <CardTitle className="display-font mt-1 text-lg font-bold">High-Risk Case Alerts</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("high_risk")} className="text-xs font-semibold">
                  View board
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {highRiskCases.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/50 p-3.5 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-950">{p.name}</span>
                        <Badge className="bg-rose-600 text-white text-[10px]">{p.riskCategory} · {p.riskScore}/100</Badge>
                      </div>
                      <p className="text-rose-800 text-[11px] mt-0.5">{p.conditions || "Critical vitals flagged"}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSearchPatientId(p.id);
                        setActiveTab("patient_history");
                      }}
                      className="rounded-full text-xs"
                    >
                      History
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. TODAY'S PATIENTS VIEW */}
      {activeTab === "today_patients" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader>
              <CardTitle className="display-font text-lg font-bold">Today's Patient Queue (OPD)</CardTitle>
              <CardDescription>Prioritized by triage urgency and appointment schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {(appointments.data || []).map((a) => (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-[#f9fafb] p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 font-bold">
                      {a.patientName?.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{a.patientName}</h4>
                        <Badge variant="outline" className="text-[10px]">{a.type.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-slate-500 mt-0.5">Village: {a.village} · Facility: {a.facilityName}</p>
                      {a.notes && <p className="text-slate-600 mt-1">Chief Note: {a.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setConsultForm({ ...consultForm, patientId: a.patientId });
                        setActiveTab("consultations");
                      }}
                      className="rounded-full bg-[#15181b] text-white text-xs"
                    >
                      Start Consultation
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. HIGH RISK CASES VIEW */}
      {activeTab === "high_risk" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {highRiskCases.map((p) => (
              <Card key={p.id} className="border-0 shadow-xs bg-white">
                <CardContent className="p-5 text-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{p.name}</h3>
                      <p className="text-slate-500">{p.age} yrs · {p.gender} · {p.village}</p>
                    </div>
                    <Badge className="bg-rose-600 text-white text-[10px]">
                      Risk Score: {p.riskScore}/100
                    </Badge>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="font-bold text-slate-700 block mb-1">Clinical Chronic Profile:</span>
                    <p className="text-slate-600">{p.conditions || "Uncontrolled vitals"}</p>
                  </div>

                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        setConsultForm({ ...consultForm, patientId: p.id });
                        setActiveTab("consultations");
                      }}
                      className="rounded-full bg-[#15181b] text-white text-xs flex-1"
                    >
                      Consult Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSearchPatientId(p.id);
                        setActiveTab("patient_history");
                      }}
                      className="rounded-full text-xs"
                    >
                      Full EHR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 4. CONSULTATION DESK VIEW */}
      {activeTab === "consultations" && (
        <div className="space-y-6">
          {/* Header & Patient Quick Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-xs border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#15181b] text-white">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h2 className="display-font text-base font-bold text-slate-900">Clinical Encounter & Consultation Desk</h2>
                <p className="text-xs text-slate-500">Comprehensive patient EHR review, AI clinical briefing, and official medical order documentation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Active Patient:</span>
              <select
                value={consultForm.patientId}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setConsultForm({ ...consultForm, patientId: newId });
                  setAiSummaryData(null);
                }}
                className="rounded-xl border border-slate-200 bg-[#f9fafb] p-2 text-xs font-semibold text-slate-800"
              >
                {(patients.data || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.age}y, {p.gender.toUpperCase()}) · {p.village} · Risk: {p.riskScore}/100
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Patient 11-Dimensional Context EHR Grid */}
          {patientContextQuery.data && (
            <div className="space-y-4">
              {/* Top EHR Summary Bar */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* 1. Demographics & Baseline Profile */}
                <Card className="border-0 shadow-xs bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">1. Demographics</span>
                      <Badge variant="outline" className="text-[10px] font-mono">ID #{patientContextQuery.data.patient.id}</Badge>
                    </div>
                    <CardTitle className="display-font text-base font-bold text-slate-900 mt-1">
                      {patientContextQuery.data.patient.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {patientContextQuery.data.patient.age} yrs · {patientContextQuery.data.patient.gender.toUpperCase()} · Blood Group: <strong className="text-slate-800">{patientContextQuery.data.patient.bloodGroup || "O+"}</strong>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs space-y-1.5 pt-0 text-slate-600">
                    <div className="flex justify-between py-1 border-t border-slate-100">
                      <span className="text-slate-400">Location</span>
                      <span className="font-semibold text-slate-800">{patientContextQuery.data.patient.village || "Sundarpur"}, {patientContextQuery.data.patient.district}</span>
                    </div>
                    <div className="flex justify-between py-1 border-t border-slate-100">
                      <span className="text-slate-400">Beneficiary Contact</span>
                      <span className="font-semibold text-slate-800">{patientContextQuery.data.patient.contact || "+91 98221 14400"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-t border-slate-100">
                      <span className="text-slate-400">Emergency Kin</span>
                      <span className="font-semibold text-slate-800">{patientContextQuery.data.patient.emergencyContact || "Son (Rakesh)"}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 2 & 3. Allergies Banner & Existing Conditions */}
                <Card className="border-0 shadow-xs bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">2 & 3. Clinical Alerts & Profile</span>
                      <ShieldAlert className="h-4 w-4 text-rose-500" />
                    </div>
                    <CardTitle className="display-font text-base font-bold text-slate-900 mt-1">
                      Allergies & Chronic Diseases
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-3 pt-0">
                    {/* Allergies Highlight */}
                    <div className="rounded-xl bg-rose-50 border border-rose-200/70 p-2.5">
                      <div className="flex items-center gap-1.5 text-rose-800 font-bold text-[11px] uppercase tracking-wider">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>Documented Allergies:</span>
                      </div>
                      <p className="mt-1 font-extrabold text-rose-700 text-xs pl-5">
                        {patientContextQuery.data.patient.allergies || "No Known Drug Allergies (NKDA)"}
                      </p>
                    </div>

                    {/* Existing Chronic Conditions */}
                    <div>
                      <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block mb-1.5">Existing Conditions:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(patientContextQuery.data.patient.conditions || "None documented")
                          .split(/[,;\n]/)
                          .map((cond: string, i: number) => (
                            <Badge key={i} className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 text-[11px]">
                              {cond.trim()}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 6 & 7. Hybrid Risk Score & Deterministic Triage */}
                <Card className="border-0 shadow-xs bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">6 & 7. AI Risk & Triage Priority</span>
                      <Sparkles className="h-4 w-4 text-cyan-600" />
                    </div>
                    <CardTitle className="display-font text-base font-bold text-slate-900 mt-1">
                      Clinical Urgency Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2.5 pt-0">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 block">Hybrid Risk Score</span>
                        <span className="text-base font-extrabold text-slate-900">
                          {patientContextQuery.data.hybridRisk?.riskScore ?? patientContextQuery.data.patient.riskScore}/100
                        </span>
                      </div>
                      <Badge
                        className={
                          String(patientContextQuery.data.hybridRisk?.riskCategory || patientContextQuery.data.patient.riskCategory).toUpperCase() === "CRITICAL"
                            ? "bg-rose-600 text-white"
                            : String(patientContextQuery.data.hybridRisk?.riskCategory || patientContextQuery.data.patient.riskCategory).toUpperCase() === "HIGH"
                            ? "bg-amber-500 text-white"
                            : "bg-emerald-600 text-white"
                        }
                      >
                        {String(patientContextQuery.data.hybridRisk?.riskCategory || patientContextQuery.data.patient.riskCategory || "LOW").toUpperCase()}
                      </Badge>
                    </div>

                    <div className="rounded-xl bg-blue-50/80 p-2.5 text-blue-900">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span>Triage Level:</span>
                        <Badge variant="outline" className="bg-white text-blue-800 border-blue-200 uppercase text-[10px]">
                          {patientContextQuery.data.deterministicTriage?.priorityDisplay || "Routine Care"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-blue-800">
                        {patientContextQuery.data.deterministicTriage?.recommendedAction || "Routine PHC outpatient examination and counseling."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 4 & 5. Current Physiological Vitals & Presenting Symptoms */}
              <Card className="border-0 shadow-xs bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">4 & 5. Examination Vitals & Symptoms</span>
                      <CardTitle className="display-font text-base font-bold text-slate-900 mt-0.5">
                        Current Vitals & Presentation
                      </CardTitle>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (patientContextQuery.data?.latestVitals) {
                          const lv = patientContextQuery.data.latestVitals;
                          setConsultForm((prev) => ({
                            ...prev,
                            bpSystolic: lv.bpSystolic ?? prev.bpSystolic,
                            bpDiastolic: lv.bpDiastolic ?? prev.bpDiastolic,
                            pulse: lv.pulse ?? prev.pulse,
                            glucose: lv.glucose ?? prev.glucose,
                            spo2: lv.spo2 ?? prev.spo2,
                            temperature: lv.temperature ? Number(lv.temperature) : prev.temperature,
                            weight: lv.weight ? Number(lv.weight) : prev.weight,
                            height: lv.height ? Number(lv.height) : prev.height,
                          }));
                          toast.success("Loaded baseline vitals into consultation form");
                        }
                      }}
                      className="text-xs h-7 rounded-full"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Sync Vitals to Form
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-xs space-y-3 pt-0">
                  {/* Vitals Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-center">
                    <div className="rounded-xl bg-[#f8fafc] border border-slate-100 p-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">BP (mmHg)</span>
                      <span className={`text-sm font-extrabold ${consultForm.bpSystolic >= 140 || consultForm.bpDiastolic >= 90 ? "text-rose-600" : "text-slate-800"}`}>
                        {consultForm.bpSystolic}/{consultForm.bpDiastolic}
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#f8fafc] border border-slate-100 p-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Pulse (bpm)</span>
                      <span className="text-sm font-extrabold text-slate-800">{consultForm.pulse || 78}</span>
                    </div>
                    <div className="rounded-xl bg-[#f8fafc] border border-slate-100 p-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">SpO2 (%)</span>
                      <span className={`text-sm font-extrabold ${consultForm.spo2 < 95 ? "text-rose-600" : "text-slate-800"}`}>
                        {consultForm.spo2}%
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#f8fafc] border border-slate-100 p-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Glucose (mg/dL)</span>
                      <span className={`text-sm font-extrabold ${consultForm.glucose >= 180 ? "text-amber-600" : "text-slate-800"}`}>
                        {consultForm.glucose}
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#f8fafc] border border-slate-100 p-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Temp (°F)</span>
                      <span className="text-sm font-extrabold text-slate-800">{consultForm.temperature}°F</span>
                    </div>
                    <div className="rounded-xl bg-[#f8fafc] border border-slate-100 p-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Weight (kg)</span>
                      <span className="text-sm font-extrabold text-slate-800">{consultForm.weight} kg</span>
                    </div>
                    <div className="rounded-xl bg-[#f8fafc] border border-slate-100 p-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Height (cm)</span>
                      <span className="text-sm font-extrabold text-slate-800">{consultForm.height} cm</span>
                    </div>
                    <div className="rounded-xl bg-[#f8fafc] border border-slate-100 p-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">BMI</span>
                      <span className="text-sm font-extrabold text-slate-800">
                        {(consultForm.weight / Math.pow(consultForm.height / 100, 2)).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Active Symptoms Box */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-3">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Presenting Complaints / Symptoms:
                    </span>
                    <p className="text-xs text-slate-800 font-medium">
                      {consultForm.symptoms || patientContextQuery.data.visits[0]?.symptoms || "Routine medical consultation. No acute symptom flare reported."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 8, 9, 10, 11: Longitudinal History Subtabs (Visits, Prescriptions, Referrals, Follow-ups) */}
              <Card className="border-0 shadow-xs bg-white">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">8, 9, 10 & 11. Patient Longitudinal EHR Records</span>
                      <CardTitle className="display-font text-base font-bold text-slate-900 mt-0.5">
                        Clinical History & Care Trajectory
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                      <button
                        onClick={() => setHistorySubTab("visits")}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${historySubTab === "visits" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Visits ({patientContextQuery.data.visits.length})
                      </button>
                      <button
                        onClick={() => setHistorySubTab("prescriptions")}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${historySubTab === "prescriptions" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Prescriptions ({patientContextQuery.data.prescriptions.length})
                      </button>
                      <button
                        onClick={() => setHistorySubTab("referrals")}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${historySubTab === "referrals" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Referrals ({patientContextQuery.data.referrals.length})
                      </button>
                      <button
                        onClick={() => setHistorySubTab("followups")}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${historySubTab === "followups" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Follow-ups ({patientContextQuery.data.followUps.length})
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs pt-2">
                  {/* Previous Visits */}
                  {historySubTab === "visits" && (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {patientContextQuery.data.visits.length === 0 ? (
                        <p className="text-slate-400 py-3 text-center">No prior visits on record.</p>
                      ) : (
                        patientContextQuery.data.visits.map((v) => (
                          <div key={v.id} className="rounded-xl border border-slate-100 bg-[#f9fafb] p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{v.diagnosis || "Encounter / General Screening"}</span>
                              <span className="text-slate-400 text-[11px]">{new Date(v.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-600">{v.notes || v.symptoms || "Routine vitals recording"}</p>
                            <div className="flex gap-2 text-[11px] text-slate-500 pt-1 font-mono">
                              <span>BP: {v.bpSystolic || "—"}/{v.bpDiastolic || "—"}</span>
                              <span>• Glucose: {v.glucose || "—"} mg/dL</span>
                              <span>• SpO2: {v.spo2 || "—"}%</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Previous Prescriptions */}
                  {historySubTab === "prescriptions" && (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {patientContextQuery.data.prescriptions.length === 0 ? (
                        <p className="text-slate-400 py-3 text-center">No previous prescriptions recorded.</p>
                      ) : (
                        patientContextQuery.data.prescriptions.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#f9fafb] p-2.5">
                            <div>
                              <p className="font-bold text-slate-900">{p.medicineName} <span className="font-normal text-slate-500">({p.dosage})</span></p>
                              <p className="text-[11px] text-slate-500">{p.frequency} · {p.duration} {p.instructions && `· ${p.instructions}`}</p>
                            </div>
                            <Badge className={p.status === "active" ? "bg-emerald-600 text-white text-[10px]" : "bg-slate-200 text-slate-700 text-[10px]"}>
                              {p.status.toUpperCase()}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Referrals */}
                  {historySubTab === "referrals" && (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {patientContextQuery.data.referrals.length === 0 ? (
                        <p className="text-slate-400 py-3 text-center">No referrals on record.</p>
                      ) : (
                        patientContextQuery.data.referrals.map((r) => (
                          <div key={r.id} className="rounded-xl border border-slate-100 bg-[#f9fafb] p-2.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{r.specialty || "Specialist Referral"}</span>
                              <Badge className={r.urgency === "emergency" ? "bg-rose-600 text-white" : r.urgency === "urgent" ? "bg-amber-500 text-white" : "bg-blue-600 text-white"}>
                                {r.urgency.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-slate-600 text-[11px]">{r.reason}</p>
                            {r.outcome && <p className="text-emerald-700 text-[11px] font-semibold bg-emerald-50 p-1.5 rounded-lg">Outcome: {r.outcome}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Follow-ups */}
                  {historySubTab === "followups" && (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {patientContextQuery.data.followUps.length === 0 ? (
                        <p className="text-slate-400 py-3 text-center">No follow-ups recorded.</p>
                      ) : (
                        patientContextQuery.data.followUps.map((f) => (
                          <div key={f.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#f9fafb] p-2.5">
                            <div>
                              <p className="font-bold text-slate-900">{f.title}</p>
                              <p className="text-[11px] text-slate-500">Due: {new Date(f.dueAt).toLocaleDateString()} {f.notes && `· ${f.notes}`}</p>
                            </div>
                            <Badge className={f.status === "completed" ? "bg-emerald-600 text-white" : f.status === "overdue" ? "bg-rose-600 text-white" : "bg-amber-500 text-white"}>
                              {f.status.toUpperCase()}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI-GENERATED SUMMARY PANEL */}
              <Card className="border-2 border-cyan-500/30 shadow-sm bg-gradient-to-br from-[#f0f9ff] via-[#f8fafc] to-[#eef2ff]">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-cyan-700 text-white font-black tracking-widest text-[11px] px-2.5 py-0.5 uppercase shadow-xs">
                        AI-GENERATED SUMMARY
                      </Badge>
                      <span className="text-xs text-slate-500 font-medium hidden sm:inline">· Clinical Decision Support Only</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => generateSummaryMutation.mutate({ patientId: consultForm.patientId })}
                      disabled={generateSummaryMutation.isPending}
                      className="rounded-full bg-cyan-700 hover:bg-cyan-800 text-white text-xs h-8"
                    >
                      {generateSummaryMutation.isPending ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Synthesizing EHR Profile…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> {aiSummaryData ? "Regenerate AI Summary" : "Generate AI Clinical Summary"}
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-xs space-y-3 pt-0">
                  {/* Safety Boundary Notice Banner */}
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-amber-900">
                    <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                      <strong>Clinical Governance Safety Guard:</strong> AI must never autonomously diagnose or prescribe. Clinical decisions, diagnoses, and medical orders belong strictly to the attending doctor.
                    </div>
                  </div>

                  {/* Summary Text Content */}
                  {aiSummaryData ? (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-white p-3.5 border border-cyan-100 shadow-xs space-y-2">
                        <p className="font-semibold text-slate-800 leading-relaxed whitespace-pre-line text-xs">
                          {aiSummaryData.summary}
                        </p>

                        {/* Key Alerts & Suggested Focus Areas */}
                        {aiSummaryData.keyClinicalAlerts && aiSummaryData.keyClinicalAlerts.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                              Flagged Clinical Alerts:
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700 font-medium">
                              {aiSummaryData.keyClinicalAlerts.map((alert, idx) => (
                                <li key={idx}>{alert}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {aiSummaryData.suggestedFocusAreas && aiSummaryData.suggestedFocusAreas.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
                              Suggested Exam Focus:
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700">
                              {aiSummaryData.suggestedFocusAreas.map((area, idx) => (
                                <li key={idx}>{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] text-slate-500 italic">
                          {aiSummaryData.disclaimer}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setConsultForm((prev) => ({
                              ...prev,
                              clinicalNotes: `${prev.clinicalNotes ? prev.clinicalNotes + "\n\n" : ""}[AI Clinical Summary Briefing]:\n${aiSummaryData.summary}`,
                            }));
                            toast.success("AI summary copied to doctor clinical notes for editing");
                          }}
                          className="text-xs rounded-full bg-white h-7 shrink-0"
                        >
                          <Copy className="h-3 w-3 mr-1" /> Insert into Clinical Notes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-white/70 p-4 text-center text-slate-500 border border-slate-200/60">
                      <Sparkles className="h-6 w-6 text-cyan-600 mx-auto mb-1.5 opacity-80" />
                      <p className="font-semibold text-slate-700">Ready to synthesize structured patient records.</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Click "Generate AI Clinical Summary" above to create an instantaneous encounter briefing.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* DOCTOR CONSULTATION RECORDING FORM */}
              <Card className="border-0 shadow-xs bg-white">
                <CardHeader>
                  <CardTitle className="display-font text-lg font-bold text-slate-900">
                    Official Doctor Clinical Consultation Record
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Record formal clinical assessment, verified diagnosis, editable notes, comprehensive treatment plan, lab orders, and follow-up directives.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  {/* Examination Vitals Inputs */}
                  <div className="rounded-xl bg-slate-50 p-3.5 space-y-2 border border-slate-100">
                    <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">
                      Encounter Vitals & Measurements (Editable)
                    </span>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">BP Systolic / Diastolic (mmHg)</label>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Input
                            type="number"
                            value={consultForm.bpSystolic}
                            onChange={(e) => setConsultForm({ ...consultForm, bpSystolic: Number(e.target.value) })}
                            className="text-xs font-semibold"
                          />
                          <span>/</span>
                          <Input
                            type="number"
                            value={consultForm.bpDiastolic}
                            onChange={(e) => setConsultForm({ ...consultForm, bpDiastolic: Number(e.target.value) })}
                            className="text-xs font-semibold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">Blood Glucose (mg/dL)</label>
                        <Input
                          type="number"
                          value={consultForm.glucose}
                          onChange={(e) => setConsultForm({ ...consultForm, glucose: Number(e.target.value) })}
                          className="mt-1 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">Pulse (bpm)</label>
                        <Input
                          type="number"
                          value={consultForm.pulse}
                          onChange={(e) => setConsultForm({ ...consultForm, pulse: Number(e.target.value) })}
                          className="mt-1 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">SpO2 (%)</label>
                        <Input
                          type="number"
                          value={consultForm.spo2}
                          onChange={(e) => setConsultForm({ ...consultForm, spo2: Number(e.target.value) })}
                          className="mt-1 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clinical Assessment */}
                  <div>
                    <label className="font-bold text-slate-800 text-xs">
                      1. Clinical Assessment & Evaluation <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={consultForm.clinicalAssessment}
                      onChange={(e) => setConsultForm({ ...consultForm, clinicalAssessment: e.target.value })}
                      placeholder="e.g. Essential Hypertension Stage 1 with morning systolic pressure spikes"
                      className="mt-1 text-xs font-medium"
                    />
                  </div>

                  {/* Diagnosis */}
                  <div>
                    <label className="font-bold text-slate-800 text-xs">
                      2. Clinical Diagnosis <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={consultForm.diagnosis}
                      onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })}
                      placeholder="e.g. Essential Hypertension Stage 1, Type 2 Diabetes Mellitus"
                      className="mt-1 text-xs font-bold text-slate-900"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold">Quick select:</span>
                      {[
                        "Essential Hypertension Stage 1",
                        "Type 2 Diabetes Mellitus",
                        "Chronic Bronchitis / COPD",
                        "Pregnancy 28 Wks - Mild Anemia",
                        "Acute Upper Respiratory Infection",
                        "Osteoarthritis",
                      ].map((d, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setConsultForm({ ...consultForm, diagnosis: d })}
                          className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-200"
                        >
                          + {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Editable Doctor Notes */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 text-xs">
                        3. Doctor Clinical Notes (Full Editing Control)
                      </label>
                      <span className="text-[10px] text-slate-400">Doctor can freely write, edit, and append notes</span>
                    </div>
                    <Textarea
                      rows={4}
                      value={consultForm.clinicalNotes}
                      onChange={(e) => setConsultForm({ ...consultForm, clinicalNotes: e.target.value })}
                      placeholder="Document clinical observations, patient response to therapy, compliance discussions, etc."
                      className="mt-1 text-xs leading-relaxed"
                    />
                  </div>

                  {/* Treatment Plan & Advice */}
                  <div>
                    <label className="font-bold text-slate-800 text-xs">
                      4. Treatment Plan & Patient Instructions <span className="text-rose-500">*</span>
                    </label>
                    <Textarea
                      rows={3}
                      value={consultForm.treatmentPlan}
                      onChange={(e) => setConsultForm({ ...consultForm, treatmentPlan: e.target.value })}
                      placeholder="Document medication schedule, dietary counseling (low sodium, sugar control), and physical activity instructions."
                      className="mt-1 text-xs leading-relaxed"
                    />
                  </div>

                  {/* Recommended Diagnostic Tests / Investigations */}
                  <div>
                    <label className="font-bold text-slate-800 text-xs">
                      5. Recommended Diagnostic Tests / Lab Investigations
                    </label>
                    <Input
                      value={consultForm.recommendedTests}
                      onChange={(e) => setConsultForm({ ...consultForm, recommendedTests: e.target.value })}
                      placeholder="e.g. Serum Creatinine, Spot Urine Albumin-to-Creatinine Ratio (UACR), Fasting Blood Glucose, ECG"
                      className="mt-1 text-xs font-medium"
                    />
                  </div>

                  {/* Follow-up Directive */}
                  <div className="rounded-xl bg-slate-50 p-3.5 space-y-2 border border-slate-100">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                      6. Scheduled Follow-up Directive
                    </span>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-600">Follow-up Title & Purpose</label>
                        <Input
                          value={consultForm.followUpTitle}
                          onChange={(e) => setConsultForm({ ...consultForm, followUpTitle: e.target.value })}
                          placeholder="e.g. Post-Consultation Blood Pressure & Glycemic Review"
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">Due In (Days)</label>
                        <select
                          value={consultForm.followUpDays}
                          onChange={(e) => setConsultForm({ ...consultForm, followUpDays: Number(e.target.value) })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium"
                        >
                          <option value={7}>7 Days (1 Week)</option>
                          <option value={14}>14 Days (2 Weeks)</option>
                          <option value={21}>21 Days (3 Weeks)</option>
                          <option value={30}>30 Days (1 Month)</option>
                          <option value={60}>60 Days (2 Months)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">ASHA / Care-Team Instructions</label>
                      <Input
                        value={consultForm.followUpNotes}
                        onChange={(e) => setConsultForm({ ...consultForm, followUpNotes: e.target.value })}
                        placeholder="Instructions for field ASHA worker during home visit"
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>

                  {/* Digital Prescriptions Section */}
                  <div className="rounded-2xl border border-slate-200 bg-[#f9fafb] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-purple-600" />
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">Digital Prescriptions (Multi-Drug Order)</span>
                          <span className="text-[10px] text-slate-500">Add medicines with route, dosage, frequency & clinical directions</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setConsultPrescriptions((prev) => [
                            ...prev,
                            {
                              medicineName: "Amlodipine 5mg",
                              dosage: "5mg",
                              frequency: "0-0-1 (Night)",
                              duration: "14 days",
                              route: "Oral",
                              instructions: "Take with water after dinner.",
                            },
                          ])
                        }
                        className="text-xs h-7 rounded-full bg-white shadow-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Medication
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {consultPrescriptions.map((rx, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs text-xs space-y-2">
                          <div className="grid gap-2 sm:grid-cols-6 items-end">
                            <div className="sm:col-span-2">
                              <label className="text-[10px] text-slate-500 font-bold block mb-1">Medicine Name & Strength</label>
                              <Input
                                value={rx.medicineName}
                                onChange={(e) => {
                                  const updated = [...consultPrescriptions];
                                  updated[idx].medicineName = e.target.value;
                                  setConsultPrescriptions(updated);
                                }}
                                placeholder="e.g. Telmisartan 40mg"
                                className="text-xs h-8 font-semibold text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 font-bold block mb-1">Dosage</label>
                              <Input
                                value={rx.dosage}
                                onChange={(e) => {
                                  const updated = [...consultPrescriptions];
                                  updated[idx].dosage = e.target.value;
                                  setConsultPrescriptions(updated);
                                }}
                                placeholder="40mg"
                                className="text-xs h-8"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 font-bold block mb-1">Route</label>
                              <select
                                value={rx.route || "Oral"}
                                onChange={(e) => {
                                  const updated = [...consultPrescriptions];
                                  updated[idx].route = e.target.value;
                                  setConsultPrescriptions(updated);
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-medium h-8"
                              >
                                <option value="Oral">Oral (PO)</option>
                                <option value="Inhalation">Inhalation</option>
                                <option value="Topical">Topical / Cream</option>
                                <option value="Intravenous (IV)">Intravenous (IV)</option>
                                <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                                <option value="Sublingual">Sublingual</option>
                                <option value="Subcutaneous">Subcutaneous (SC)</option>
                                <option value="Ophthalmic Drops">Ophthalmic Drops</option>
                                <option value="Ear Drops">Ear Drops</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 font-bold block mb-1">Frequency</label>
                              <Input
                                value={rx.frequency}
                                onChange={(e) => {
                                  const updated = [...consultPrescriptions];
                                  updated[idx].frequency = e.target.value;
                                  setConsultPrescriptions(updated);
                                }}
                                placeholder="1-0-1"
                                className="text-xs h-8"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1">
                                <label className="text-[10px] text-slate-500 font-bold block mb-1">Duration</label>
                                <Input
                                  value={rx.duration}
                                  onChange={(e) => {
                                    const updated = [...consultPrescriptions];
                                    updated[idx].duration = e.target.value;
                                    setConsultPrescriptions(updated);
                                  }}
                                  placeholder="30 days"
                                  className="text-xs h-8"
                                />
                              </div>
                              {consultPrescriptions.length > 1 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setConsultPrescriptions(consultPrescriptions.filter((_, i) => i !== idx))}
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0 shrink-0 mb-0.5 rounded-full"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div>
                            <Input
                              value={rx.instructions}
                              onChange={(e) => {
                                const updated = [...consultPrescriptions];
                                updated[idx].instructions = e.target.value;
                                setConsultPrescriptions(updated);
                              }}
                              placeholder="Clinical directions (e.g. Take after breakfast with water. Avoid high sodium pickles.)"
                              className="text-xs h-7 bg-slate-50 border-slate-200/80 text-slate-700"
                            />
                          </div>

                          {/* Live Inventory Stock Status & Multi-Facility Finder */}
                          {(() => {
                            const match = consultMedsQuery.data?.find(
                              (m) => m.medicineName.toLowerCase() === rx.medicineName.toLowerCase() || m.normalizedQuery === rx.medicineName.toLowerCase()
                            );
                            const status = match?.status ?? "AVAILABLE";
                            return (
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-500 font-bold">Local PHC Stock:</span>
                                  <Badge
                                    className={
                                      status === "AVAILABLE"
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold"
                                        : status === "LOW STOCK"
                                        ? "bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold"
                                        : "bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold"
                                    }
                                  >
                                    {status === "AVAILABLE" ? "AVAILABLE" : status === "LOW STOCK" ? "LOW STOCK" : "UNAVAILABLE"}
                                  </Badge>
                                  {match?.currentStock !== undefined && (
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      ({match.currentStock} {match.unit || "units"})
                                    </span>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setMedicineSearchQuery(rx.medicineName);
                                    setMedicineLookupModal({ isOpen: true, medicineName: rx.medicineName });
                                  }}
                                  className="h-6 text-[10px] text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 font-semibold px-2 rounded-full"
                                >
                                  <Search className="h-3 w-3 mr-1" /> Check Other Facilities
                                </Button>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Safety Confirmation & Final Action Bar */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-slate-600 text-xs">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-[11px]">
                        <strong>Attending Doctor Confirmation:</strong> All clinical assessments, diagnoses, prescriptions, and orders are verified and approved by the doctor.
                      </span>
                    </div>

                    <Button
                      onClick={() => {
                        if (!consultForm.diagnosis.trim() || !consultForm.treatmentPlan.trim()) {
                          toast.error("Please provide clinical diagnosis and treatment plan");
                          return;
                        }

                        recordConsultationMutation.mutate({
                          patientId: consultForm.patientId,
                          clinicalAssessment: consultForm.clinicalAssessment,
                          diagnosis: consultForm.diagnosis,
                          notes: consultForm.clinicalNotes,
                          treatmentPlan: consultForm.treatmentPlan,
                          recommendedTests: consultForm.recommendedTests,
                          followUpPlan: consultForm.followUpTitle,
                          followUpDueAt: new Date(Date.now() + consultForm.followUpDays * 86400000),
                          aiSummaryUsed: aiSummaryData?.summary,
                          bpSystolic: consultForm.bpSystolic,
                          bpDiastolic: consultForm.bpDiastolic,
                          pulse: consultForm.pulse,
                          spo2: consultForm.spo2,
                          glucose: consultForm.glucose,
                          temperature: consultForm.temperature,
                          weight: consultForm.weight,
                          height: consultForm.height,
                          prescriptions: consultPrescriptions,
                          followUp: {
                            title: consultForm.followUpTitle,
                            dueAt: new Date(Date.now() + consultForm.followUpDays * 86400000),
                            notes: consultForm.followUpNotes,
                          },
                        });
                      }}
                      disabled={recordConsultationMutation.isPending}
                      className="w-full sm:w-auto rounded-full bg-[#15181b] hover:bg-black text-white text-xs px-6 py-2.5 font-bold"
                    >
                      {recordConsultationMutation.isPending ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" /> Saving Consultation Record…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Save & Finalize Consultation
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* CLINICAL AI COPILOT VIEW */}
      {activeTab === "clinical_ai" && (
        <DoctorClinicalAiView
          currentPatientId={consultForm.patientId}
          patientsList={patients.data || []}
          userDistrict={user?.district || "Pune"}
          facilityName={user?.facilityName || "Primary Health Centre"}
        />
      )}

      {/* 5. PATIENT HISTORY VIEW */}
      {activeTab === "patient_history" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="display-font text-lg font-bold">Longitudinal Patient Health Record</CardTitle>
                <CardDescription>Select patient to view timeline of visits, diagnoses, and past referrals</CardDescription>
              </div>
              <select
                value={searchPatientId}
                onChange={(e) => setSearchPatientId(Number(e.target.value))}
                className="rounded-xl border border-slate-200 p-2 text-xs bg-[#f9fafb]"
              >
                {(patients.data || []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.age} yrs · {p.village})</option>
                ))}
              </select>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {(timeline.data?.visits || []).length === 0 ? (
                <p className="p-6 text-center text-slate-400">No visits recorded for this patient.</p>
              ) : (
                timeline.data?.visits.map((v) => (
                  <div key={v.id} className="rounded-2xl border border-slate-100 bg-[#f9fafb] p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{v.diagnosis || "Health Encounter"}</span>
                      <span className="text-[11px] text-slate-400">{new Date(v.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-600"><strong>Symptoms:</strong> {v.symptoms}</p>
                    <p className="text-slate-600"><strong>Notes:</strong> {v.notes || "Standard check"}</p>
                    <div className="flex gap-2 text-[11px] text-slate-500 pt-1">
                      {v.bpSystolic && <span className="border rounded bg-white px-2 py-0.5">BP: {v.bpSystolic}/{v.bpDiastolic}</span>}
                      {v.glucose && <span className="border rounded bg-white px-2 py-0.5">Glucose: {v.glucose}</span>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. SMART REFERRALS VIEW */}
      {activeTab === "referrals" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="display-font text-lg font-bold">Smart Referral Engine & Inter-Facility Transfers</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Intelligent multi-factor facility ranking, 8-stage lifecycle tracking, and timestamped event timeline
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowReferralModal(true)}
                className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4 shadow-sm"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New Smart Referral
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              {(referrals.data || []).length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Navigation className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p>No active inter-facility referrals found.</p>
                </div>
              ) : (
                (referrals.data || []).map((r: any) => (
                  <div
                    key={r.id}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 hover:border-indigo-200 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{r.patientName}</span>
                          <Badge
                            className={
                              r.urgency === "emergency"
                                ? "bg-rose-100 text-rose-800"
                                : r.urgency === "urgent"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {r.urgency?.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {r.specialty}
                          </Badge>
                          {r.recommendationScore && (
                            <Badge className="bg-indigo-700 text-white font-mono text-[10px]">
                              Score: {r.recommendationScore}/100
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-slate-600">
                          Target: <strong>{r.targetFacilityName}</strong> ({r.distanceKm ? `${r.distanceKm} km` : "Proximity routed"})
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-start">
                        <Badge
                          className={
                            r.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "CONSULTED"
                              ? "bg-blue-100 text-blue-800"
                              : r.status === "ARRIVED"
                              ? "bg-purple-100 text-purple-800"
                              : r.status === "TRANSPORT_ASSIGNED" || r.status === "DEPARTED"
                              ? "bg-amber-100 text-amber-800"
                              : r.status === "ACCEPTED"
                              ? "bg-teal-100 text-teal-800"
                              : r.status === "CANCELLED"
                              ? "bg-slate-200 text-slate-600"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }
                        >
                          {r.status?.toUpperCase() || "PENDING"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-[11px]">
                      <div>
                        <strong>Reason:</strong> {r.reason}
                      </div>
                      {r.transportVehicle && (
                        <div>
                          <strong>Transport:</strong> {r.transportVehicle} {r.transportDriverContact && `· ${r.transportDriverContact}`}
                        </div>
                      )}
                      {r.outcome && (
                        <div className="sm:col-span-2 text-emerald-700 font-medium">
                          <strong>Outcome:</strong> {r.outcome}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                      <span>Initiated: {new Date(r.createdAt).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTimelineReferralId(r.id)}
                          className="rounded-full text-[11px] h-7 px-3 text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                        >
                          <Clock className="mr-1 h-3 w-3" /> Event Timeline
                        </Button>
                        {r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setOutcomeDialog({ id: r.id, patientName: r.patientName, reason: r.reason })}
                            className="rounded-full text-[11px] h-7 px-3"
                          >
                            Document Outcome
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 7. PRESCRIPTIONS VIEW */}
      {activeTab === "prescriptions" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="display-font text-lg font-bold">Digital Prescription Registry</CardTitle>
                <CardDescription>Clinical medication orders with route, dosage schedule, and pharmacy dispensary status</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
                  {["all", "active", "dispensed", "completed", "discontinued"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setPrescStatusFilter(st)}
                      className={`rounded-lg px-2.5 py-1 font-semibold capitalize transition-all ${
                        prescStatusFilter === st ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowAddPrescription(true)}
                  className="rounded-full bg-slate-900 text-white text-xs h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> New Prescription
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {(prescriptions.data || [])
                .filter((p) => prescStatusFilter === "all" || p.status === prescStatusFilter)
                .map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-[#f9fafb] p-4 hover:border-slate-200 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-purple-50 text-purple-700">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{p.medicineName}</h4>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-mono text-[10px]">
                            {p.route || "Oral"}
                          </Badge>
                          <span className="text-slate-400">·</span>
                          <span className="font-semibold text-slate-700">{p.patientName}</span>
                          {p.village && <span className="text-slate-400">({p.village})</span>}
                        </div>
                        <p className="text-slate-600 font-medium">
                          Strength: <strong className="text-slate-800">{p.dosage}</strong> · Schedule: <strong className="text-slate-800">{p.frequency}</strong> · Duration: <strong className="text-slate-800">{p.duration}</strong>
                        </p>
                        {p.instructions && (
                          <p className="text-slate-500 bg-white/80 border border-slate-100 p-1.5 rounded-lg text-[11px]">
                            <strong>Instructions:</strong> {p.instructions}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                          <span>Prescribed: {new Date(p.createdAt).toLocaleDateString()}</span>
                          {p.doctorName && <span>By: {p.doctorName}</span>}
                          {p.facilityName && <span>Facility: {p.facilityName}</span>}
                          {p.prescriptionGroupId && <span className="font-mono">Ref: {p.prescriptionGroupId}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={
                          p.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                            : p.status === "dispensed"
                            ? "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                            : p.status === "completed"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }
                      >
                        {p.status.toUpperCase()}
                      </Badge>
                      {p.status === "active" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updatePrescriptionStatus.mutate({ id: p.id, status: "completed" })}
                            disabled={updatePrescriptionStatus.isPending}
                            className="rounded-full text-[11px] h-7"
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updatePrescriptionStatus.mutate({ id: p.id, status: "discontinued" })}
                            disabled={updatePrescriptionStatus.isPending}
                            className="rounded-full text-[11px] text-rose-600 hover:bg-rose-50 h-7"
                          >
                            Discontinue
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 8. FOLLOW-UPS VIEW */}
      {activeTab === "followups" && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-500/30 text-[10px] uppercase font-bold">
                  Clinical Care Directives
                </Badge>
                {overdueFollowUpsCount > 0 && (
                  <Badge className="bg-rose-500 text-white animate-pulse text-[10px] font-bold">
                    {overdueFollowUpsCount} OVERDUE ALERTS
                  </Badge>
                )}
              </div>
              <h2 className="display-font text-2xl font-bold mt-2">Field Follow-up Directives & Care Coordination</h2>
              <p className="text-slate-300 text-xs mt-1 max-w-2xl">
                Track clinical directives assigned to village ASHA and CHO teams with live completion tracking, worker visit outcomes, and overdue escalation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => detectOverdueMutation.mutate()}
                disabled={detectOverdueMutation.isPending}
                className="rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold backdrop-blur-md"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${detectOverdueMutation.isPending ? "animate-spin" : ""}`} />
                Scan Overdue
              </Button>
              <Button
                size="sm"
                onClick={() => setShowScheduleFollowUp(true)}
                className="rounded-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/30"
              >
                <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                Schedule Follow-up Directive
              </Button>
            </div>
          </div>

          {/* Metric Status Pills */}
          {(() => {
            const allFollowUps = followUps.data || [];
            const countTotal = allFollowUps.length;
            const countOpen = allFollowUps.filter((f) => (f.status || "").toUpperCase() === "OPEN").length;
            const countDueSoon = allFollowUps.filter((f) => (f.status || "").toUpperCase() === "DUE_SOON").length;
            const countOverdue = allFollowUps.filter((f) => (f.status || "").toUpperCase() === "OVERDUE").length;
            const countCompleted = allFollowUps.filter((f) => (f.status || "").toUpperCase() === "COMPLETED").length;
            const countCancelled = allFollowUps.filter((f) => (f.status || "").toUpperCase() === "CANCELLED").length;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFollowUpStatusFilter("ALL")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    followUpStatusFilter === "ALL"
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                  <span className="text-lg font-bold">{countTotal}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpStatusFilter("DUE_SOON")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    followUpStatusFilter === "DUE_SOON"
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-amber-50/50 text-amber-900 border-amber-200 hover:border-amber-300"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-amber-600 block">Due Soon (&lt;48h)</span>
                  <span className="text-lg font-bold text-amber-700">{countDueSoon}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpStatusFilter("OVERDUE")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    followUpStatusFilter === "OVERDUE"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-rose-50/50 text-rose-900 border-rose-200 hover:border-rose-300"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-rose-600 block">Overdue Alerts</span>
                  <span className="text-lg font-bold text-rose-700">{countOverdue}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpStatusFilter("OPEN")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    followUpStatusFilter === "OPEN"
                      ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                      : "bg-sky-50/50 text-sky-900 border-sky-200 hover:border-sky-300"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-sky-600 block">Open</span>
                  <span className="text-lg font-bold text-sky-700">{countOpen}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpStatusFilter("COMPLETED")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    followUpStatusFilter === "COMPLETED"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-emerald-50/50 text-emerald-900 border-emerald-200 hover:border-emerald-300"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Completed</span>
                  <span className="text-lg font-bold text-emerald-700">{countCompleted}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpStatusFilter("CANCELLED")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    followUpStatusFilter === "CANCELLED"
                      ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Cancelled</span>
                  <span className="text-lg font-bold text-slate-700">{countCancelled}</span>
                </button>
              </div>
            );
          })()}

          {/* Follow-up Cards List */}
          <div className="space-y-3">
            {(() => {
              const allFollowUps = followUps.data || [];
              const filtered = allFollowUps.filter((f) => {
                if (followUpStatusFilter === "ALL") return true;
                return (f.status || "").toUpperCase() === followUpStatusFilter;
              });

              if (filtered.length === 0) {
                return (
                  <Card className="border-0 shadow-xs bg-white text-center py-12">
                    <CardContent>
                      <Clock className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700 text-sm">No follow-up directives found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {followUpStatusFilter !== "ALL"
                          ? `No records matching status "${followUpStatusFilter}".`
                          : "Schedule follow-up directives to assign home care visits to ASHA workers."}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setShowScheduleFollowUp(true)}
                        className="mt-4 rounded-full bg-slate-900 text-white text-xs font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Schedule Directive
                      </Button>
                    </CardContent>
                  </Card>
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
                        : isCancelled
                        ? "border-slate-200 bg-slate-50/40 opacity-75"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">
                              {f.patientName}
                            </span>
                            <span className="text-slate-400 text-xs">
                              ({f.patientAge}y · {f.patientGender || "U"} · {f.village || "Sundarpur"})
                            </span>
                            {f.referral && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                                Linked to {f.referral.targetFacilityName} ({f.referral.specialty})
                              </Badge>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Stethoscope className="h-3.5 w-3.5 text-indigo-600" />
                            {f.reason || f.title}
                          </h4>
                          {f.notes && (
                            <p className="text-slate-600 text-xs bg-slate-50 border border-slate-100 p-2 rounded-xl">
                              <span className="font-semibold text-slate-700">Directive:</span> {f.notes}
                            </p>
                          )}
                        </div>

                        {/* Status Badge & Due Date */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5">
                          <Badge
                            className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : isOverdue
                                ? "bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
                                : isDueSoon
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : isCancelled
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : "bg-sky-100 text-sky-800 border-sky-200"
                            }`}
                          >
                            {isCompleted && <CheckCircle2 className="mr-1 h-3 w-3 inline" />}
                            {isOverdue && <AlertTriangle className="mr-1 h-3 w-3 inline" />}
                            {isDueSoon && <Clock className="mr-1 h-3 w-3 inline" />}
                            {f.status}
                          </Badge>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Due: {new Date(f.dueAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Worker & Meta Row */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-600 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              Assigned Worker: <strong className="text-slate-800">{f.workerName || "ASHA Sunita Devi"}</strong> ({f.workerRole || "ASHA"})
                            </span>
                          </div>
                          {f.workerContact && (
                            <span className="text-slate-400">· {f.workerContact}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!isCompleted && !isCancelled && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setCancelFollowUpModal({
                                  id: f.id,
                                  patientName: f.patientName,
                                  reason: f.reason || f.title,
                                })
                              }
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full text-xs h-7 px-2.5"
                            >
                              <Ban className="h-3 w-3 mr-1" /> Cancel Directive
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Completed Outcome Review Banner */}
                      {isCompleted && (
                        <div className="mt-3 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs flex items-center gap-1 text-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Field Visit Completed &amp; Verified
                            </span>
                            <span className="text-[11px] text-emerald-700">
                              {f.completedAt ? new Date(f.completedAt).toLocaleString() : "Recently"}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-800">
                            <strong>Visit Notes:</strong> {f.completionNotes || "Home vitals evaluation conducted. Patient adherence checked."}
                          </p>
                          {f.completedByName && (
                            <p className="text-[11px] text-emerald-700 font-medium">
                              Recorded by: {f.completedByName}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Cancelled Banner */}
                      {isCancelled && (
                        <div className="mt-3 p-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs">
                          <span className="font-semibold text-slate-800">Cancellation Reason:</span> {f.cancellationReason || "Cancelled by doctor"}
                          {f.cancelledAt && (
                            <span className="text-slate-500 text-[11px] block mt-0.5">
                              Cancelled on: {new Date(f.cancelledAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* MODAL: Schedule Follow-Up Directive */}
      {showScheduleFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <CalendarPlus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Schedule Field Follow-up Directive
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Assign actionable home visit tasks to local ASHA &amp; CHO workers
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowScheduleFollowUp(false)}
                className="rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Patient</label>
                <select
                  value={scheduleFollowUpForm.patientId}
                  onChange={(e) =>
                    setScheduleFollowUpForm({
                      ...scheduleFollowUpForm,
                      patientId: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-[#f9fafb] dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  {(patients.data || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.age}y · {p.village || "Sundarpur"}) - ID #{p.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Assigned Health Worker</label>
                <select
                  value={scheduleFollowUpForm.assignedTo}
                  onChange={(e) =>
                    setScheduleFollowUpForm({
                      ...scheduleFollowUpForm,
                      assignedTo: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-[#f9fafb] dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  {(healthWorkers.data || [
                    { id: 2, name: "Sunita Devi", roleTitle: "ASHA Worker", village: "Sundarpur" },
                    { id: 3, name: "Priya Sharma", roleTitle: "Community Health Officer (CHO)", village: "Rampura" },
                    { id: 4, name: "Anita Rathod", roleTitle: "ASHA Worker", village: "Rampura" },
                    { id: 5, name: "Rajesh Solanki", roleTitle: "CHO", village: "Sanand" },
                  ]).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.roleTitle} · {w.village})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Clinical Reason &amp; Purpose</label>
                <Input
                  value={scheduleFollowUpForm.reason}
                  onChange={(e) =>
                    setScheduleFollowUpForm({
                      ...scheduleFollowUpForm,
                      reason: e.target.value,
                    })
                  }
                  placeholder="e.g. Post-Consultation Blood Pressure & Glycemic Review"
                  className="text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Due Date</label>
                  <div className="flex gap-1.5">
                    {[
                      { days: 3, label: "+3d" },
                      { days: 7, label: "+7d" },
                      { days: 14, label: "+14d" },
                      { days: 30, label: "+30d" },
                    ].map((pill) => (
                      <button
                        key={pill.days}
                        type="button"
                        onClick={() => {
                          const target = new Date(Date.now() + pill.days * 86400000)
                            .toISOString()
                            .split("T")[0];
                          setScheduleFollowUpForm({
                            ...scheduleFollowUpForm,
                            dueDate: target,
                          });
                        }}
                        className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-200"
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  type="date"
                  value={scheduleFollowUpForm.dueDate}
                  onChange={(e) =>
                    setScheduleFollowUpForm({
                      ...scheduleFollowUpForm,
                      dueDate: e.target.value,
                    })
                  }
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Linked Referral (Optional)</label>
                <select
                  value={scheduleFollowUpForm.referralId}
                  onChange={(e) =>
                    setScheduleFollowUpForm({
                      ...scheduleFollowUpForm,
                      referralId: e.target.value ? Number(e.target.value) : "",
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-[#f9fafb] dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">None (Independent Directive)</option>
                  {(referrals.data || []).map((r) => (
                    <option key={r.id} value={r.id}>
                      Referral #{r.id} - {r.specialty || "Specialist"} ({r.urgency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Instructions &amp; Guidance for Health Worker
                </label>
                <Textarea
                  rows={3}
                  value={scheduleFollowUpForm.notes}
                  onChange={(e) =>
                    setScheduleFollowUpForm({
                      ...scheduleFollowUpForm,
                      notes: e.target.value,
                    })
                  }
                  placeholder="e.g. Check sitting BP, count pill compliance, note if patient reports morning dizziness."
                  className="text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleFollowUp(false)}
                  className="rounded-full text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    scheduleFollowUpMutation.mutate({
                      patientId: scheduleFollowUpForm.patientId,
                      assignedTo: scheduleFollowUpForm.assignedTo,
                      dueAt: new Date(scheduleFollowUpForm.dueDate),
                      reason: scheduleFollowUpForm.reason,
                      notes: scheduleFollowUpForm.notes,
                      referralId: scheduleFollowUpForm.referralId
                        ? Number(scheduleFollowUpForm.referralId)
                        : null,
                    });
                  }}
                  disabled={scheduleFollowUpMutation.isPending || !scheduleFollowUpForm.reason}
                  className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  {scheduleFollowUpMutation.isPending ? "Scheduling Directive…" : "Confirm Directive"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Cancel Follow-Up Directive */}
      {cancelFollowUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <Ban className="h-4 w-4" /> Cancel Follow-up Directive
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  {cancelFollowUpModal.patientName} — {cancelFollowUpModal.reason}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCancelFollowUpModal(null)}
                className="rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Cancellation
                </label>
                <Textarea
                  rows={3}
                  value={cancelReasonText}
                  onChange={(e) => setCancelReasonText(e.target.value)}
                  placeholder="e.g. Patient admitted to secondary centre; in-person OPD review scheduled instead."
                  className="text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => setCancelFollowUpModal(null)}
                  className="rounded-full text-xs font-semibold"
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    cancelFollowUpMutation.mutate({
                      id: cancelFollowUpModal.id,
                      cancellationReason: cancelReasonText || "Cancelled by doctor",
                    });
                  }}
                  disabled={cancelFollowUpMutation.isPending || !cancelReasonText.trim()}
                  className="rounded-full text-xs font-bold"
                >
                  {cancelFollowUpMutation.isPending ? "Cancelling…" : "Confirm Cancel"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: New Prescription (Multi-medicine Batch Support) */}
      {showAddPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Pill className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Write Digital Prescription Order
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Prescribe single or multiple medications with designated administration routes</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddPrescription(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Beneficiary Patient</label>
                <select
                  value={batchPrescPatientId}
                  onChange={(e) => setBatchPrescPatientId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-[#f9fafb] dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  {(patients.data || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.age} yrs · {p.village || "Sundarpur"}) - ID #{p.id}</option>
                  ))}
                </select>
              </div>

              {/* Medicine rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Medication List ({batchPrescItems.length})</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setBatchPrescItems((prev) => [
                        ...prev,
                        {
                          medicineName: "Amoxicillin 500mg",
                          dosage: "500mg",
                          frequency: "1-0-1 (After food)",
                          duration: "5 days",
                          route: "Oral",
                          instructions: "Complete full antibiotic course.",
                        },
                      ])
                    }
                    className="text-xs h-7 rounded-full"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Another Medicine
                  </Button>
                </div>

                {batchPrescItems.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-[#f9fafb] dark:bg-slate-800/60 p-3 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px]">
                        Medicine #{idx + 1}
                      </Badge>
                      {batchPrescItems.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setBatchPrescItems(batchPrescItems.filter((_, i) => i !== idx))}
                          className="h-6 w-6 p-0 text-rose-600 hover:bg-rose-50 rounded-full"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Medicine Name</label>
                        <Input
                          value={item.medicineName}
                          onChange={(e) => {
                            const updated = [...batchPrescItems];
                            updated[idx].medicineName = e.target.value;
                            setBatchPrescItems(updated);
                          }}
                          placeholder="e.g. Telmisartan 40mg"
                          className="text-xs h-8 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Dosage / Strength</label>
                        <Input
                          value={item.dosage}
                          onChange={(e) => {
                            const updated = [...batchPrescItems];
                            updated[idx].dosage = e.target.value;
                            setBatchPrescItems(updated);
                          }}
                          placeholder="e.g. 40mg / 5ml"
                          className="text-xs h-8 bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Route</label>
                        <select
                          value={item.route}
                          onChange={(e) => {
                            const updated = [...batchPrescItems];
                            updated[idx].route = e.target.value;
                            setBatchPrescItems(updated);
                          }}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-1.5 text-xs h-8"
                        >
                          <option value="Oral">Oral (PO)</option>
                          <option value="Inhalation">Inhalation</option>
                          <option value="Topical">Topical / Cream</option>
                          <option value="Intravenous (IV)">Intravenous (IV)</option>
                          <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                          <option value="Sublingual">Sublingual</option>
                          <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                          <option value="Ophthalmic Drops">Ophthalmic Drops</option>
                          <option value="Ear Drops">Ear Drops</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Frequency</label>
                        <Input
                          value={item.frequency}
                          onChange={(e) => {
                            const updated = [...batchPrescItems];
                            updated[idx].frequency = e.target.value;
                            setBatchPrescItems(updated);
                          }}
                          placeholder="1-0-1"
                          className="text-xs h-8 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Duration</label>
                        <Input
                          value={item.duration}
                          onChange={(e) => {
                            const updated = [...batchPrescItems];
                            updated[idx].duration = e.target.value;
                            setBatchPrescItems(updated);
                          }}
                          placeholder="30 days"
                          className="text-xs h-8 bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Directions & Advice</label>
                      <Input
                        value={item.instructions}
                        onChange={(e) => {
                          const updated = [...batchPrescItems];
                          updated[idx].instructions = e.target.value;
                          setBatchPrescItems(updated);
                        }}
                        placeholder="Take after breakfast with water. Avoid milk."
                        className="text-xs h-8 bg-white dark:bg-slate-900"
                      />
                    </div>

                    {/* Stock Status & Facility Lookup */}
                    {(() => {
                      const match = batchMedsQuery.data?.find(
                        (m) => m.medicineName.toLowerCase() === item.medicineName.toLowerCase() || m.normalizedQuery === item.medicineName.toLowerCase()
                      );
                      const status = match?.status ?? "AVAILABLE";
                      return (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Stock Status:</span>
                            <Badge
                              className={
                                status === "AVAILABLE"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold"
                                  : status === "LOW STOCK"
                                  ? "bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold"
                                  : "bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold"
                              }
                            >
                              {status === "AVAILABLE" ? "AVAILABLE" : status === "LOW STOCK" ? "LOW STOCK" : "UNAVAILABLE"}
                            </Badge>
                            {match?.currentStock !== undefined && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                ({match.currentStock} {match.unit || "units"})
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setMedicineSearchQuery(item.medicineName);
                              setMedicineLookupModal({ isOpen: true, medicineName: item.medicineName });
                            }}
                            className="h-6 text-[10px] text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-semibold px-2 rounded-full"
                          >
                            <Search className="h-3 w-3 mr-1" /> Check Other Facilities
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>

              {/* Formulary Quick Suggestions from Inventory */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                  Available Facility Formulary:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(inventory.data || []).slice(0, 6).map((med) => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => {
                        setBatchPrescItems((prev) => [
                          ...prev,
                          {
                            medicineName: med.name,
                            dosage: med.name.match(/\d+mg|\d+mcg|\d+ml/)?.[0] || "1 unit",
                            frequency: "1-0-1",
                            duration: "14 days",
                            route: med.name.toLowerCase().includes("inhaler") ? "Inhalation" : "Oral",
                            instructions: "Take as directed by doctor.",
                          },
                        ]);
                      }}
                      className="rounded-lg bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-purple-950 hover:text-purple-700 dark:hover:text-purple-300 hover:border-purple-200 transition-all font-medium"
                    >
                      + {med.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Certified doctor authorization will be permanently logged.</span>
                </div>
                <Button
                  onClick={() => {
                    const invalid = batchPrescItems.some((m) => !m.medicineName.trim() || !m.dosage.trim());
                    if (invalid) {
                      toast.error("All medicines must have a name and dosage");
                      return;
                    }

                    createBatchPrescription.mutate({
                      patientId: batchPrescPatientId,
                      medicines: batchPrescItems,
                    });
                  }}
                  disabled={createBatchPrescription.isPending}
                  className="rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-5 shadow-sm"
                >
                  {createBatchPrescription.isPending ? "Issuing Orders…" : `Sign & Prescribe (${batchPrescItems.length} Meds)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Referral Outcome */}
      {outcomeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Document Clinical Outcome</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Patient: {outcomeDialog.patientName}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOutcomeDialog(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <p className="text-slate-500 dark:text-slate-400"><strong>Referral Reason:</strong> {outcomeDialog.reason}</p>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Clinical Outcome & Specialist Findings</label>
                <Textarea
                  value={outcomeText}
                  onChange={(e) => setOutcomeText(e.target.value)}
                  placeholder="e.g. Evaluated by cardiologist. Dual antihypertensive regimen prescribed. Discharged for home monitoring."
                  className="mt-1 text-xs resize-none min-h-24"
                />
              </div>
              <Button
                onClick={() => {
                  if (!outcomeText.trim()) {
                    toast.error("Outcome notes required");
                    return;
                  }
                  updateReferral.mutate({
                    id: outcomeDialog.id,
                    status: "completed",
                    outcome: outcomeText,
                  });
                }}
                disabled={updateReferral.isPending}
                className="w-full rounded-full bg-[#15181b] dark:bg-slate-700 text-white mt-2"
              >
                {updateReferral.isPending ? "Saving…" : "Close Referral Loop"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      {/* MODAL: Smart Facility Referral Recommendation Engine */}
      {showReferralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-indigo-700 dark:text-indigo-400" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Smart Referral & Facility Recommendation Engine</CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Multi-factor ranked facility routing with live capacity indicators</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowReferralModal(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              {/* Patient & Urgency Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Patient</label>
                  <select
                    value={referralPatientId}
                    onChange={(e) => setReferralPatientId(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {(patients.data || []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.age}y · {p.village})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Urgency Tier</label>
                  <select
                    value={referralUrgency}
                    onChange={(e) => setReferralUrgency(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-800 font-semibold text-rose-700 dark:text-rose-400"
                  >
                    <option value="emergency">EMERGENCY (Immediate 108 / Resuscitation)</option>
                    <option value="urgent">URGENT (24-Hour Specialist Care)</option>
                    <option value="routine">ROUTINE (Elective / OPD Follow-up)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Specialty</label>
                  <select
                    value={referralSpecialty}
                    onChange={(e) => setReferralSpecialty(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Cardiology / Internal Medicine">Cardiology / Internal Medicine</option>
                    <option value="Obstetrics & Gynecology">Obstetrics & Gynecology (Maternal)</option>
                    <option value="Pediatrics">Pediatrics / NICU</option>
                    <option value="Nephrology / Dialysis">Nephrology / Dialysis</option>
                    <option value="Orthopedics">Orthopedics / Trauma</option>
                    <option value="General Surgery">General Surgery</option>
                    <option value="Emergency Medicine">Emergency Medicine / Resus</option>
                  </select>
                </div>
              </div>

              {/* Clinical Reason & Transport Option */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300">Clinical Indication & Referral Notes</label>
                <Textarea
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  className="text-xs resize-none min-h-16"
                  placeholder="Clinical findings, vital signs snapshot, and specific treatment required at target centre..."
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="doc_transport_req"
                    checked={transportRequired}
                    onChange={(e) => setTransportRequired(e.target.checked)}
                    className="rounded border-slate-300 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="doc_transport_req" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Request Emergency Transport / Ambulance Dispatch
                  </label>
                </div>
                {transportRequired && (
                  <select
                    value={transportType}
                    onChange={(e) => setTransportType(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="108 Emergency Ambulance">108 Emergency Ambulance (ALS)</option>
                    <option value="108 Basic Ambulance">108 Basic Ambulance (BLS)</option>
                    <option value="Govt Health Van">Govt Health Van / Patient Transport</option>
                  </select>
                )}
              </div>

              {/* Ranked Facility Recommendations */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center justify-between">
                  <span>Ranked Facility Recommendations (Top Matches)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Ranked by distance, specialty, doctor & ICU availability</span>
                </h4>

                <div className="space-y-2.5">
                  {(smartRecommendationsQuery.data?.recommendations || []).map((rec: any, idx: number) => (
                    <div
                      key={rec.facility.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        idx === 0
                          ? "border-indigo-500/50 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-xs"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {idx + 1}. {rec.facility.name}
                            </span>
                            {idx === 0 && (
                              <Badge className="bg-indigo-700 text-white text-[10px] font-bold">TOP MATCH</Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {rec.facility.facilityType}
                            </Badge>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px]">{rec.facility.address} · {rec.facility.phone}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-lg font-extrabold text-indigo-700 dark:text-indigo-400 font-mono">
                              {rec.recommendationScore}
                              <span className="text-xs text-slate-400 font-normal">/100</span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">Score</span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!referralReason.trim()) {
                                toast.error("Please provide a referral reason");
                                return;
                              }
                              confirmReferralMutation.mutate({
                                patientId: referralPatientId,
                                targetFacilityId: rec.facility.id,
                                specialty: referralSpecialty,
                                urgency: referralUrgency,
                                reason: referralReason,
                                recommendationScore: rec.recommendationScore,
                                distanceKm: rec.distanceKm,
                                scoreBreakdown: JSON.stringify(rec.scoreBreakdown),
                                transportRequired,
                                transportType,
                              });
                            }}
                            disabled={confirmReferralMutation.isPending}
                            className={`rounded-full text-xs font-semibold h-8 px-4 shadow-xs ${
                              idx === 0
                                ? "bg-indigo-700 hover:bg-indigo-800 text-white"
                                : "bg-slate-900 hover:bg-slate-800 text-white"
                            }`}
                          >
                            {confirmReferralMutation.isPending ? "Routing…" : "Confirm Facility"}
                          </Button>
                        </div>
                      </div>

                      {/* Factors Grid */}
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-2.5 text-[11px]">
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                          <span className="text-slate-400 block text-[10px]">Distance</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{rec.distanceKm} km</span>
                        </div>
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                          <span className="text-slate-400 block text-[10px]">Specialty</span>
                          <span className={`font-bold ${rec.specialtyAvailable ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                            {rec.specialtyStatus}
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                          <span className="text-slate-400 block text-[10px]">Doctor</span>
                          <span className={`font-bold ${rec.doctorAvailable ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                            {rec.doctorStatus}
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                          <span className="text-slate-400 block text-[10px]">Emergency</span>
                          <span className={`font-bold ${rec.emergencyCapable ? "text-rose-700 dark:text-rose-400" : "text-slate-600 dark:text-slate-300"}`}>
                            {rec.emergencyCapable ? "Yes (24/7)" : "Basic"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] text-slate-400 italic">
                        {rec.recommendationReason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Referral Event Timeline Viewer */}
      {selectedTimelineReferralId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-700 dark:text-indigo-400" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Referral Event Audit Timeline #{selectedTimelineReferralId}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Immutable handover audit trail with actor timestamps</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedTimelineReferralId(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              {((referralTimelineQuery.data as any)?.events || (referralTimelineQuery.data as any) || []).length === 0 ? (
                <p className="text-slate-400 text-center py-6">No timestamped events recorded yet.</p>
              ) : (
                <div className="relative pl-6 space-y-4 border-l-2 border-indigo-200 dark:border-indigo-800 ml-2">
                  {((referralTimelineQuery.data as any)?.events || (referralTimelineQuery.data as any) || []).map((ev: any, idx: number) => (
                    <div key={ev.id || idx} className="relative">
                      <div className="absolute -left-[31px] top-0.5 h-3.5 w-3.5 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900 ring-2 ring-indigo-200 dark:ring-indigo-900" />
                      <div className="flex items-center justify-between">
                        <Badge className="font-mono text-[10px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
                          {ev.status}
                        </Badge>
                        <span className="text-[10px] text-slate-400">{new Date(ev.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-slate-800 dark:text-slate-200 font-semibold">{ev.notes || "Status transition recorded"}</p>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Actor: <strong>{ev.actorName || "System / Clinical User"}</strong> ({ev.actorRole || "Doctor"})
                        {ev.transportVehicle && <span className="block text-indigo-700 dark:text-indigo-400">Transport: {ev.transportVehicle}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {/* MODAL: Medicine Availability & Multi-Facility Stock Finder */}
      {medicineLookupModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  <Pill className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Network Medicine Availability & Facility Finder
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Search health centres (PHCs, CHCs, Sub-Centres, District Hospitals) where this medicine is stocked
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setMedicineLookupModal(null);
                  setMedicineSearchQuery("");
                }}
                className="rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              {/* Search Bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={medicineSearchQuery}
                    onChange={(e) => setMedicineSearchQuery(e.target.value)}
                    placeholder="Search medicine name (e.g. Paracetamol, Telmisartan, Metformin, IFA)..."
                    className="pl-9 text-xs h-9"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => facilityMedicineSearchQuery.refetch()}
                  className="rounded-full bg-slate-900 dark:bg-slate-700 text-white text-xs h-9 px-4"
                >
                  Search
                </Button>
              </div>

              {/* Status Explanation Banner */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  AVAILABLE: Stock &gt; Buffer
                </div>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  LOW STOCK: Buffer Alert
                </div>
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  UNAVAILABLE: Out of Stock
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                  <span>Facility Results ({(facilityMedicineSearchQuery.data || []).length})</span>
                  <span>Medicine: <strong>{medicineSearchQuery || medicineLookupModal.medicineName}</strong></span>
                </div>

                {facilityMedicineSearchQuery.isLoading ? (
                  <p className="text-center py-8 text-slate-400">Querying facility inventories across district...</p>
                ) : (facilityMedicineSearchQuery.data || []).length === 0 ? (
                  <p className="text-center py-8 text-slate-400">No facility records found matching this query.</p>
                ) : (
                  (facilityMedicineSearchQuery.data || []).map((res) => (
                    <div
                      key={res.facilityId}
                      className={`rounded-2xl border p-4 transition-all ${
                        res.status === "AVAILABLE"
                          ? "bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800/60 shadow-xs"
                          : res.status === "LOW STOCK"
                          ? "bg-amber-50/40 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60"
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-80"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{res.facilityName}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {res.facilityType.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                            {res.village ? `${res.village}, ` : ""}{res.district}
                            {res.distanceKm !== undefined && ` · ${res.distanceKm} km from base`}
                            {res.phone && ` · Ph: ${res.phone}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <Badge
                            className={
                              res.status === "AVAILABLE"
                                ? "bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-0.5"
                                : res.status === "LOW STOCK"
                                ? "bg-amber-500 text-white font-bold text-[10px] px-2.5 py-0.5"
                                : "bg-rose-600 text-white font-bold text-[10px] px-2.5 py-0.5"
                            }
                          >
                            {res.status}
                          </Badge>
                          {res.currentStock !== undefined && (
                            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg">
                              {res.currentStock} {res.unit || "units"}
                            </span>
                          )}
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
    </WorkspaceLayout>
  );
}
