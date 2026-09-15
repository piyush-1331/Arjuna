import React, { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Baby,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Flame,
  Heart,
  HeartPulse,
  History,
  Info,
  Navigation,
  Pill,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Thermometer,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { enqueueOfflineEvent } from "@/lib/offlineQueue";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { getLocalEntities, STORES, type LocalPatient } from "@/lib/offlineDb";

export type ScreeningStatusType = "NORMAL" | "ATTENTION" | "HIGH RISK" | "EMERGENCY";

interface CommunityScreeningDeskProps {
  initialPatientId?: number | string;
  isSimulatedOffline?: boolean;
  onRefreshOfflineState?: () => void;
  onEscalateReferral?: (patientId: number | string) => void;
  onScheduleFollowUp?: (patientId: number | string) => void;
}

const COMMON_SYMPTOM_OPTIONS = [
  { id: "chest_pain", label: "Chest Pain / Pressure", category: "cardio", emergency: true },
  { id: "palpitations", label: "Rapid Palpitations", category: "cardio" },
  { id: "leg_swelling", label: "Leg / Ankle Swelling", category: "cardio" },
  { id: "breathlessness", label: "Severe Breathlessness", category: "respiratory", emergency: true },
  { id: "cough", label: "Productive Cough (>2 wks)", category: "respiratory" },
  { id: "wheezing", label: "Wheezing / Chest Tightness", category: "respiratory" },
  { id: "severe_headache", label: "Severe Sudden Headache", category: "neuro", emergency: true },
  { id: "dizziness", label: "Dizziness / Vertigo", category: "neuro" },
  { id: "fever", label: "High Fever / Chills", category: "general" },
  { id: "fatigue", label: "Extreme Fatigue / Lethargy", category: "general" },
  { id: "nausea", label: "Nausea / Vomiting", category: "general" },
  { id: "polyuria", label: "Frequent Urination / Extreme Thirst", category: "endocrine" },
  { id: "blurred_vision", label: "Blurred Vision", category: "endocrine" },
  { id: "swelling_feet_pregnant", label: "Severe Swelling in Feet / Face (ANC)", category: "anc", emergency: true },
  { id: "reduced_fetal_movement", label: "Decreased / Absent Fetal Movement", category: "anc", emergency: true },
  { id: "bleeding_spotting", label: "Vaginal Bleeding / Spotting (ANC)", category: "anc", emergency: true },
];

const CHRONIC_CONDITIONS_LIST = [
  "Hypertension",
  "Type 2 Diabetes",
  "Asthma / COPD",
  "Heart Disease / CAD",
  "Chronic Kidney Disease",
  "Tuberculosis (Active/Past)",
  "Nutritional Anemia",
  "Thyroid Disorder",
  "Arthritis",
];

export default function CommunityScreeningDesk({
  initialPatientId,
  isSimulatedOffline,
  onRefreshOfflineState,
  onEscalateReferral,
  onScheduleFollowUp,
}: CommunityScreeningDeskProps) {
  const utils = trpc.useUtils();
  const { isOnline, createScreeningOfflineFirst } = useOfflineSync();
  const patientsQuery = trpc.patients.list.useQuery();
  const [localPatients, setLocalPatients] = useState<LocalPatient[]>([]);

  useEffect(() => {
    getLocalEntities<LocalPatient>(STORES.PATIENTS).then((res) => {
      setLocalPatients(res || []);
    }).catch(() => {});
  }, []);

  // Merge server patients with local offline patients
  const patients = useMemo(() => {
    const serverList = (patientsQuery.data || []) as any[];
    const combined = [
      ...localPatients.filter((lp) => !serverList.some((sp) => String(sp.id) === String(lp.id))),
      ...serverList,
    ];
    return combined;
  }, [patientsQuery.data, localPatients]);

  const [selectedPatientId, setSelectedPatientId] = useState<number | string>(
    initialPatientId || (patients[0]?.id ?? 1)
  );
  const [patientSearch, setPatientSearch] = useState("");
  const [activeScreeningTab, setActiveScreeningTab] = useState<"new_screening" | "screening_history">("new_screening");

  // Vitals State
  const [bpSystolic, setBpSystolic] = useState<string>("120");
  const [bpDiastolic, setBpDiastolic] = useState<string>("80");
  const [pulse, setPulse] = useState<string>("76");
  const [spo2, setSpo2] = useState<string>("98");
  const [temperature, setTemperature] = useState<string>("98.4");
  const [glucose, setGlucose] = useState<string>("110");
  const [weight, setWeight] = useState<string>("62");
  const [height, setHeight] = useState<string>("165");

  // Clinical Context State
  const [pregnancyStatus, setPregnancyStatus] = useState<string>("not_pregnant");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptomText, setCustomSymptomText] = useState("");
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [fieldNotes, setFieldNotes] = useState("");

  // Result state
  const [lastScreeningResult, setLastScreeningResult] = useState<{
    id?: number | string;
    status: ScreeningStatusType;
    score: number;
    factors: string[];
    recommendedAction: string;
    safetyNet: string;
    bmiData: { bmi: number; category: string } | null;
  } | null>(null);

  // Synchronize when initialPatientId changes
  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId);
    }
  }, [initialPatientId]);

  // When patient selection changes, prefill conditions and pregnancy status
  const currentPatient = useMemo(() => {
    return patients.find((p) => String(p.id) === String(selectedPatientId)) || patients[0];
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (currentPatient) {
      if (currentPatient.conditions) {
        const raw = currentPatient.conditions.split(",").map((c: string) => c.trim()).filter(Boolean);
        setSelectedConditions(raw);
      } else {
        setSelectedConditions([]);
      }
    }
  }, [currentPatient]);

  // Patient screening history query
  const screeningHistoryQuery = trpc.screenings.listForPatient.useQuery(
    { patientId: typeof selectedPatientId === "number" ? selectedPatientId : 1 },
    { enabled: typeof selectedPatientId === "number" && selectedPatientId > 0 }
  );

  // Real-time BMI calculation
  const bmiInfo = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || h <= 0 || w <= 0) return null;
    const hM = h / 100;
    const raw = w / (hM * hM);
    const bmiVal = Math.round(raw * 10) / 10;
    let cat = "Normal";
    let color = "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (bmiVal < 18.5) {
      cat = "Underweight";
      color = "bg-blue-50 text-blue-800 border-blue-200";
    } else if (bmiVal < 25.0) {
      cat = "Normal";
      color = "bg-emerald-50 text-emerald-800 border-emerald-200";
    } else if (bmiVal < 30.0) {
      cat = "Overweight";
      color = "bg-amber-50 text-amber-800 border-amber-200";
    } else {
      cat = "Obese";
      color = "bg-rose-50 text-rose-800 border-rose-200";
    }
    return { bmi: bmiVal, category: cat, color };
  }, [weight, height]);

  // Real-time Physiological Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const sys = parseInt(bpSystolic, 10);
    const dia = parseInt(bpDiastolic, 10);
    const pls = parseInt(pulse, 10);
    const oxy = parseInt(spo2, 10);
    const tmp = parseFloat(temperature);
    const glu = parseInt(glucose, 10);
    const wt = parseFloat(weight);
    const ht = parseFloat(height);

    if (bpSystolic !== "" && (isNaN(sys) || sys < 50 || sys > 300)) {
      errors.push("Systolic BP must be between 50 and 300 mmHg.");
    }
    if (bpDiastolic !== "" && (isNaN(dia) || dia < 30 || dia > 200)) {
      errors.push("Diastolic BP must be between 30 and 200 mmHg.");
    }
    if (!isNaN(sys) && !isNaN(dia) && sys <= dia) {
      errors.push("Systolic BP must be strictly greater than Diastolic BP.");
    }
    if (pulse !== "" && (isNaN(pls) || pls < 30 || pls > 250)) {
      errors.push("Pulse rate must be between 30 and 250 bpm.");
    }
    if (spo2 !== "" && (isNaN(oxy) || oxy < 50 || oxy > 100)) {
      errors.push("SpO2 oxygen saturation must be between 50% and 100%.");
    }
    if (temperature !== "" && (isNaN(tmp) || (tmp < 90 && tmp > 44) || tmp > 110 || tmp < 32)) {
      errors.push("Body temperature is outside physiological limits (90–110°F or 32–43.5°C).");
    }
    if (glucose !== "" && (isNaN(glu) || glu < 20 || glu > 700)) {
      errors.push("Blood glucose must be between 20 and 700 mg/dL.");
    }
    if (weight !== "" && (isNaN(wt) || wt < 1 || wt > 300)) {
      errors.push("Weight must be between 1 and 300 kg.");
    }
    if (height !== "" && (isNaN(ht) || ht < 30 || ht > 250)) {
      errors.push("Height must be between 30 and 250 cm.");
    }

    return errors;
  }, [bpSystolic, bpDiastolic, pulse, spo2, temperature, glucose, weight, height]);

  // Real-time Instant Triage Preview
  const instantTriage = useMemo(() => {
    const sys = parseInt(bpSystolic, 10) || 0;
    const dia = parseInt(bpDiastolic, 10) || 0;
    const pls = parseInt(pulse, 10) || 0;
    const oxy = parseInt(spo2, 10) || 100;
    const glu = parseInt(glucose, 10) || 0;
    const tmp = parseFloat(temperature) || 98.4;
    const tempF = tmp <= 45 ? (tmp * 9) / 5 + 32 : tmp;

    const hasEmergencySymptom = selectedSymptoms.some((id) => {
      const opt = COMMON_SYMPTOM_OPTIONS.find((s) => s.id === id);
      return opt?.emergency;
    }) || /chest pain|shortness of breath|unconscious|fainting|bleeding|seizure/i.test(customSymptomText);

    const isPregnant = pregnancyStatus !== "not_pregnant";

    if (
      hasEmergencySymptom ||
      (oxy > 0 && oxy < 90) ||
      sys >= 180 ||
      dia >= 120 ||
      glu >= 400 ||
      (glu > 0 && glu < 50) ||
      pls >= 140 ||
      (pls > 0 && pls < 40) ||
      tempF >= 104.0 ||
      (isPregnant && (sys >= 160 || dia >= 110))
    ) {
      return {
        status: "EMERGENCY" as ScreeningStatusType,
        color: "bg-rose-600 text-white animate-pulse",
        border: "border-rose-500 bg-rose-50/70",
        action: "IMMEDIATE EMERGENCY ESCALATION: Call 108 Emergency Medical Services immediately.",
      };
    }

    if (
      (oxy >= 90 && oxy < 94) ||
      (sys >= 140 && sys < 180) ||
      (dia >= 90 && dia < 120) ||
      (glu >= 200 && glu < 400) ||
      pls >= 100 ||
      (pls > 0 && pls < 50) ||
      tempF >= 101.5 ||
      (isPregnant && (sys >= 140 || dia >= 90))
    ) {
      return {
        status: "HIGH RISK" as ScreeningStatusType,
        color: "bg-rose-100 text-rose-800 border-rose-300",
        border: "border-rose-300 bg-rose-50/40",
        action: "Prompt 24–48h Clinical Consult at PHC/Sub-Centre with Medical Officer/CHO.",
      };
    }

    if (
      (sys >= 120 && sys < 140) ||
      (dia >= 80 && dia < 90) ||
      (glu >= 140 && glu < 200) ||
      (oxy >= 94 && oxy < 96) ||
      tempF >= 99.5 ||
      selectedSymptoms.length > 0 ||
      customSymptomText.trim().length > 0
    ) {
      return {
        status: "ATTENTION" as ScreeningStatusType,
        color: "bg-amber-100 text-amber-800 border-amber-300",
        border: "border-amber-200 bg-amber-50/40",
        action: "Targeted lifestyle & dietary counseling with ASHA home visit in 14–30 days.",
      };
    }

    return {
      status: "NORMAL" as ScreeningStatusType,
      color: "bg-emerald-100 text-emerald-800 border-emerald-300",
      border: "border-emerald-200 bg-emerald-50/40",
      action: "Vitals within healthy normal limits. Continue routine annual screening.",
    };
  }, [bpSystolic, bpDiastolic, pulse, spo2, glucose, temperature, selectedSymptoms, customSymptomText, pregnancyStatus]);

  // Create Screening Mutation
  const recordScreeningMutation = trpc.screenings.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Screening saved! Triage Status: ${data.screeningResult.status}`);
      setLastScreeningResult(data.screeningResult);
      if (typeof selectedPatientId === "number") {
        utils.screenings.listForPatient.invalidate({ patientId: selectedPatientId });
        utils.patients.getProfile.invalidate({ id: selectedPatientId });
      }
      utils.patients.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit screening record");
    },
  });

  const handleToggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((s) => s !== symptomId) : [...prev, symptomId]
    );
  };

  const handleToggleCondition = (cond: string) => {
    setSelectedConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  const handleSubmitScreening = async () => {
    if (validationErrors.length > 0) {
      toast.error("Please fix invalid vital signs before submitting.");
      return;
    }

    const payload = {
      patientId: selectedPatientId,
      bpSystolic: bpSystolic ? parseInt(bpSystolic, 10) : undefined,
      bpDiastolic: bpDiastolic ? parseInt(bpDiastolic, 10) : undefined,
      pulse: pulse ? parseInt(pulse, 10) : undefined,
      spo2: spo2 ? parseInt(spo2, 10) : undefined,
      temperature: temperature ? parseFloat(temperature) : undefined,
      glucose: glucose ? parseInt(glucose, 10) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      height: height ? parseFloat(height) : undefined,
      bmi: bmiInfo?.bmi,
      pregnancyStatus: currentPatient?.gender === "female" ? pregnancyStatus : undefined,
      structuredSymptoms: selectedSymptoms.map((id) => COMMON_SYMPTOM_OPTIONS.find((s) => s.id === id)?.label || id),
      symptoms: [
        ...selectedSymptoms.map((id) => COMMON_SYMPTOM_OPTIONS.find((s) => s.id === id)?.label || id),
        customSymptomText.trim(),
      ]
        .filter(Boolean)
        .join(", "),
      existingConditions: selectedConditions.join(", "),
      notes: fieldNotes.trim() || undefined,
    };

    if (!isOnline || isSimulatedOffline || typeof selectedPatientId === "string") {
      await createScreeningOfflineFirst(payload as any);
      if (onRefreshOfflineState) onRefreshOfflineState();
      toast.success("Offline Field Mode: Screening & vitals securely saved in IndexedDB queue.");
      setLastScreeningResult({
        id: "offline_" + Date.now(),
        status: instantTriage.status,
        score: instantTriage.status === "EMERGENCY" ? 90 : instantTriage.status === "HIGH RISK" ? 65 : instantTriage.status === "ATTENTION" ? 35 : 10,
        factors: [
          ...payload.structuredSymptoms,
          `Vitals recorded: BP ${payload.bpSystolic || "--"}/${payload.bpDiastolic || "--"}, SpO2 ${payload.spo2 || "--"}%, Glucose ${payload.glucose || "--"} mg/dL`,
        ],
        recommendedAction: instantTriage.action,
        safetyNet: "Screening stored locally on device and queued for automatic district sync.",
        bmiData: bmiInfo ? { bmi: bmiInfo.bmi, category: bmiInfo.category } : null,
      });
      return;
    }

    recordScreeningMutation.mutate(payload as any);
  };

  const handleResetForm = () => {
    setBpSystolic("120");
    setBpDiastolic("80");
    setPulse("76");
    setSpo2("98");
    setTemperature("98.4");
    setGlucose("110");
    setWeight("62");
    setHeight("165");
    setSelectedSymptoms([]);
    setCustomSymptomText("");
    setFieldNotes("");
    setLastScreeningResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-emerald-700" />
            <h2 className="display-font text-xl font-bold text-slate-900">Community Health Screening Desk</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Standardized NCD & maternal vital capture, physiological bounds verification, 4-tier triage, and EHR synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <Button
              size="sm"
              variant={activeScreeningTab === "new_screening" ? "default" : "ghost"}
              onClick={() => setActiveScreeningTab("new_screening")}
              className={`rounded-lg text-xs font-semibold ${
                activeScreeningTab === "new_screening"
                  ? "bg-[#1f4935] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Stethoscope className="mr-1.5 h-3.5 w-3.5" /> Conduct Screening
            </Button>
            <Button
              size="sm"
              variant={activeScreeningTab === "screening_history" ? "default" : "ghost"}
              onClick={() => setActiveScreeningTab("screening_history")}
              className={`rounded-lg text-xs font-semibold ${
                activeScreeningTab === "screening_history"
                  ? "bg-[#1f4935] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="mr-1.5 h-3.5 w-3.5" /> Previous History ({screeningHistoryQuery.data?.length || 0})
            </Button>
          </div>
        </div>
      </div>

      {/* 1. BENEFICIARY SELECTOR BAR */}
      <Card className="border-0 shadow-xs bg-[#f4f8f6]">
        <CardContent className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-center">
            <div className="lg:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#2d6148] block mb-1">
                Select Beneficiary
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => {
                  setSelectedPatientId(Number(e.target.value));
                  setLastScreeningResult(null);
                }}
                className="w-full rounded-xl border border-[#c2ded1] bg-white p-2.5 text-xs font-medium text-slate-900 shadow-xs focus:ring-2 focus:ring-[#2d6148] focus:outline-hidden"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.age} yrs · {p.gender.toUpperCase()} · {p.village || "Sundarpur"} (ID #{p.id})
                  </option>
                ))}
              </select>
            </div>

            {currentPatient && (
              <>
                <div className="rounded-xl bg-white p-2.5 border border-[#c2ded1]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Demographics</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {currentPatient.name}, {currentPatient.age} yrs ({currentPatient.gender})
                  </p>
                  <p className="text-[11px] text-slate-500">Village: {currentPatient.village || "Sundarpur"}</p>
                </div>

                <div className="rounded-xl bg-white p-2.5 border border-[#c2ded1]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Baseline</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge
                      className={`text-[10px] uppercase font-bold ${
                        currentPatient.riskCategory === "critical" || currentPatient.riskCategory === "high"
                          ? "bg-rose-100 text-rose-800"
                          : currentPatient.riskCategory === "moderate"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {currentPatient.riskCategory || "Low"} Risk ({currentPatient.riskScore || 0}/100)
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {currentPatient.conditions || "No chronic illnesses"}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. TAB: NEW SCREENING FORM */}
      {activeScreeningTab === "new_screening" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form (2 cols) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Vitals Capture Card */}
            <Card className="border-0 shadow-xs bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-600" />
                    <div>
                      <CardTitle className="display-font text-base font-bold text-slate-900">
                        1. Clinical Vital Signs
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Enter calibrated measurements from digital BP cuff, pulse oximeter, and glucometer
                      </CardDescription>
                    </div>
                  </div>
                  {bmiInfo && (
                    <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-1 ${bmiInfo.color}`}>
                      BMI: {bmiInfo.bmi} kg/m² ({bmiInfo.category})
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* BP & Pulse Row */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>BP Systolic (mmHg)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Normal: 90–120</span>
                    </label>
                    <Input
                      type="number"
                      min={50}
                      max={300}
                      value={bpSystolic}
                      onChange={(e) => setBpSystolic(e.target.value)}
                      placeholder="120"
                      className="text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>BP Diastolic (mmHg)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Normal: 60–80</span>
                    </label>
                    <Input
                      type="number"
                      min={30}
                      max={200}
                      value={bpDiastolic}
                      onChange={(e) => setBpDiastolic(e.target.value)}
                      placeholder="80"
                      className="text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Pulse Rate (bpm)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Normal: 60–100</span>
                    </label>
                    <Input
                      type="number"
                      min={30}
                      max={250}
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      placeholder="72"
                      className="text-xs font-medium"
                    />
                  </div>
                </div>

                {/* SpO2, Temp, Glucose Row */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>SpO2 Oxygen (%)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Normal: 95–100%</span>
                    </label>
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      placeholder="98"
                      className="text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Temperature (°F)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Normal: 97–99°F</span>
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min={90}
                      max={110}
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="98.4"
                      className="text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Blood Glucose (mg/dL)</span>
                      <span className="text-[10px] text-slate-400 font-normal">RBS/FBS</span>
                    </label>
                    <Input
                      type="number"
                      min={20}
                      max={700}
                      value={glucose}
                      onChange={(e) => setGlucose(e.target.value)}
                      placeholder="110"
                      className="text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Weight, Height, BMI Row */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Weight (kg)</span>
                      <span className="text-[10px] text-slate-400 font-normal">kg</span>
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min={1}
                      max={300}
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="65"
                      className="text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Height (cm)</span>
                      <span className="text-[10px] text-slate-400 font-normal">cm</span>
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min={30}
                      max={250}
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="165"
                      className="text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Auto BMI (kg/m²)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Formula</span>
                    </label>
                    <div className="flex h-9 w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 font-semibold">
                      {bmiInfo ? `${bmiInfo.bmi} (${bmiInfo.category})` : "Enter weight & height"}
                    </div>
                  </div>
                </div>

                {/* Validation Alerts */}
                {validationErrors.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertOctagon className="h-4 w-4 text-rose-600" />
                      <span>Physiological Range Alert (Impossible / Invalid Values)</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                      {validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Structured Symptoms & Pregnancy Status Card */}
            <Card className="border-0 shadow-xs bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="display-font text-base font-bold text-slate-900">
                  2. Symptoms & Clinical Observations
                </CardTitle>
                <CardDescription className="text-xs">
                  Select identified community red flags and enter field remarks
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-5">
                {/* Pregnancy Status (if applicable / female) */}
                {currentPatient?.gender === "female" && (
                  <div className="rounded-xl border border-pink-200 bg-pink-50/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-pink-900 flex items-center gap-1.5">
                        <Baby className="h-4 w-4 text-pink-600" />
                        <span>Maternal & Pregnancy Status</span>
                      </label>
                      <span className="text-[10px] text-pink-700">Pre-eclampsia screening active</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        { id: "not_pregnant", label: "Not Pregnant" },
                        { id: "trimester_1", label: "1st Trimester (<12 wks)" },
                        { id: "trimester_2", label: "2nd Trimester (13–27 wks)" },
                        { id: "trimester_3", label: "3rd Trimester (28–40 wks)" },
                        { id: "postpartum", label: "Postpartum (<6 weeks)" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setPregnancyStatus(opt.id)}
                          className={`rounded-lg border p-2 text-xs text-left font-medium transition-all ${
                            pregnancyStatus === opt.id
                              ? "border-pink-500 bg-pink-600 text-white font-bold shadow-xs"
                              : "border-pink-200 bg-white text-slate-700 hover:bg-pink-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Structured Symptoms Multi-select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Structured Symptom Checklist (Tap to Select)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_SYMPTOM_OPTIONS.map((sym) => {
                      const isSelected = selectedSymptoms.includes(sym.id);
                      return (
                        <button
                          key={sym.id}
                          type="button"
                          onClick={() => handleToggleSymptom(sym.id)}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                            isSelected
                              ? sym.emergency
                                ? "border-rose-600 bg-rose-600 text-white font-bold shadow-xs"
                                : "border-emerald-600 bg-[#1f4935] text-white font-bold shadow-xs"
                              : sym.emergency
                              ? "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {sym.emergency && <AlertTriangle className="h-3 w-3" />}
                          <span>{sym.label}</span>
                          {isSelected && <CheckCircle2 className="h-3 w-3 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Free Text Symptom Input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Additional Free-Text Symptoms / Complaints
                  </label>
                  <Input
                    value={customSymptomText}
                    onChange={(e) => setCustomSymptomText(e.target.value)}
                    placeholder="e.g. Swollen gums, difficulty sleeping due to cough, left-sided numbness..."
                    className="text-xs"
                  />
                </div>

                {/* Existing Chronic Conditions Checklist */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block">
                    Confirmed Existing Medical Conditions
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CHRONIC_CONDITIONS_LIST.map((cond) => {
                      const isSelected = selectedConditions.includes(cond);
                      return (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => handleToggleCondition(cond)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 font-bold"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {isSelected ? `✓ ${cond}` : `+ ${cond}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Field Notes Textarea */}
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block">
                    Field Notes & Environmental Observations
                  </label>
                  <Textarea
                    value={fieldNotes}
                    onChange={(e) => setFieldNotes(e.target.value)}
                    placeholder="Notes on medication adherence, household sanitary conditions, follow-up dates..."
                    className="text-xs resize-none h-18"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleSubmitScreening}
                    disabled={recordScreeningMutation.isPending || validationErrors.length > 0}
                    className="flex-1 rounded-full bg-[#1f4935] text-white hover:bg-[#163727] text-xs font-semibold py-2.5 shadow-xs"
                  >
                    {recordScreeningMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving & Evaluating Triage...
                      </>
                    ) : (
                      <>
                        <HeartPulse className="mr-2 h-4 w-4" /> Complete Screening & Stratify Triage
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetForm}
                    className="rounded-full text-xs font-semibold text-slate-600"
                  >
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Instant Triage Live Preview & Post-Submission Action Card */}
          <div className="space-y-6">
            {/* Live Triage Status Card */}
            <Card className={`border-2 shadow-xs transition-all ${instantTriage.border}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Live Real-Time Triage
                  </span>
                  <Badge className={`text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider ${instantTriage.color}`}>
                    {instantTriage.status}
                  </Badge>
                </div>
                <CardTitle className="display-font text-base font-bold text-slate-900 mt-1">
                  Stratification Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <p className="text-slate-700 leading-relaxed font-medium">
                  {instantTriage.action}
                </p>

                {/* Status Indicator Legend */}
                <div className="rounded-xl bg-white p-3 border border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Protocol Urgency Tiers
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 p-1 rounded-md bg-emerald-50 text-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-bold">NORMAL</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1 rounded-md bg-amber-50 text-amber-800">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-bold">ATTENTION</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1 rounded-md bg-orange-50 text-orange-800">
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                      <span className="font-bold">HIGH RISK</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1 rounded-md bg-rose-50 text-rose-800">
                      <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                      <span className="font-bold">EMERGENCY</span>
                    </div>
                  </div>
                </div>

                {isSimulatedOffline && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 flex items-center gap-2">
                    <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Operating in Offline Field Mode. Screening will be enqueued in device storage.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Post-Submission Result Card */}
            {lastScreeningResult && (
              <Card className="border-2 border-[#1f4935] shadow-md bg-white">
                <CardHeader className="pb-2 bg-[#f4f8f6] rounded-t-xl">
                  <div className="flex items-center gap-2 text-[#1f4935]">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="display-font text-sm font-bold">
                      Screening Recorded & Stratified
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assessed Tier</span>
                      <p className="display-font text-lg font-bold text-slate-900">
                        {lastScreeningResult.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score</span>
                      <p className="display-font text-lg font-bold text-emerald-800">
                        {lastScreeningResult.score}/100
                      </p>
                    </div>
                  </div>

                  {/* Identified Factors */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Identified Clinical Factors
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                      {lastScreeningResult.factors.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Guidance */}
                  <div className="rounded-xl bg-[#f0f6f3] p-3 border border-[#c2ded1] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#2d6148] block">
                      Recommended Next Step
                    </span>
                    <p className="text-slate-900 font-semibold leading-relaxed">
                      {lastScreeningResult.recommendedAction}
                    </p>
                  </div>

                  {/* Action Workflows */}
                  <div className="grid gap-2 pt-1">
                    {(lastScreeningResult.status === "EMERGENCY" || lastScreeningResult.status === "HIGH RISK") && (
                      <Button
                        size="sm"
                        onClick={() => onEscalateReferral && onEscalateReferral(selectedPatientId)}
                        className="w-full rounded-full bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold"
                      >
                        <Navigation className="mr-1.5 h-3.5 w-3.5" /> Escalate to PHC / CHC Referral
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onScheduleFollowUp && onScheduleFollowUp(selectedPatientId)}
                      className="w-full rounded-full text-xs font-semibold"
                    >
                      <Calendar className="mr-1.5 h-3.5 w-3.5 text-emerald-700" /> Schedule ASHA Field Follow-up
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* 3. TAB: SCREENING HISTORY */}
      {activeScreeningTab === "screening_history" && (
        <Card className="border-0 shadow-xs bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="display-font text-base font-bold text-slate-900">
                  Screening Longitudinal History
                </CardTitle>
                <CardDescription className="text-xs">
                  Historical vitals, triage records, and clinical recommendations for {currentPatient?.name} (ID #{selectedPatientId})
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => screeningHistoryQuery.refetch()}
                className="rounded-full text-xs"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${screeningHistoryQuery.isFetching ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {screeningHistoryQuery.isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-600 mb-2" />
                Loading patient screening timeline...
              </div>
            ) : !screeningHistoryQuery.data?.length ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <History className="mx-auto h-8 w-8 text-slate-400 mb-1" />
                <p className="font-bold text-slate-700">No previous screening records found for this beneficiary.</p>
                <p>Click "Conduct Screening" to record baseline vitals and symptoms.</p>
                <Button
                  size="sm"
                  onClick={() => setActiveScreeningTab("new_screening")}
                  className="rounded-full bg-[#1f4935] text-white text-xs mt-2"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Start First Screening
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {screeningHistoryQuery.data.map((item: any, idx: number) => {
                  const itemStatus = item.riskCategory
                    ? item.riskCategory === "critical" || item.riskCategory === "emergency"
                      ? "EMERGENCY"
                      : item.riskCategory === "high" || item.riskCategory === "high_risk"
                      ? "HIGH RISK"
                      : item.riskCategory === "moderate" || item.riskCategory === "attention"
                      ? "ATTENTION"
                      : "NORMAL"
                    : item.triageLevel === "emergency"
                    ? "EMERGENCY"
                    : item.triageLevel === "urgent"
                    ? "HIGH RISK"
                    : "NORMAL";

                  const badgeClass =
                    itemStatus === "EMERGENCY"
                      ? "bg-rose-100 text-rose-800 border-rose-300"
                      : itemStatus === "HIGH RISK"
                      ? "bg-orange-100 text-orange-800 border-orange-300"
                      : itemStatus === "ATTENTION"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300";

                  return (
                    <div key={item.id || idx} className="p-4 hover:bg-slate-50/70 transition-all text-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                            {itemStatus}
                          </Badge>
                          <span className="font-bold text-slate-900">
                            Screening Encounter #{item.id}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Vitals summary cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                        <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">BP (mmHg)</span>
                          <span className="font-bold text-slate-900">
                            {item.bpSystolic ? `${item.bpSystolic}/${item.bpDiastolic}` : "N/A"}
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Pulse</span>
                          <span className="font-bold text-slate-900">{item.pulse ? `${item.pulse} bpm` : "N/A"}</span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">SpO2</span>
                          <span className="font-bold text-slate-900">{item.spo2 ? `${item.spo2}%` : "N/A"}</span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Glucose</span>
                          <span className="font-bold text-slate-900">{item.glucose ? `${item.glucose} mg/dL` : "N/A"}</span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Temp</span>
                          <span className="font-bold text-slate-900">{item.temperature ? `${item.temperature}°F` : "N/A"}</span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Weight</span>
                          <span className="font-bold text-slate-900">{item.weight ? `${item.weight} kg` : "N/A"}</span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Height</span>
                          <span className="font-bold text-slate-900">{item.height ? `${item.height} cm` : "N/A"}</span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">BMI</span>
                          <span className="font-bold text-slate-900">{item.bmi ? `${item.bmi}` : "N/A"}</span>
                        </div>
                      </div>

                      {/* Symptoms & Action */}
                      <div className="space-y-1 text-slate-600 bg-[#f9fafb] p-2.5 rounded-lg border border-slate-100">
                        {item.symptoms && (
                          <p>
                            <strong className="text-slate-800">Reported Symptoms:</strong> {item.symptoms}
                          </p>
                        )}
                        {item.pregnancyStatus && item.pregnancyStatus !== "not_pregnant" && (
                          <p>
                            <strong className="text-pink-700">Maternal Status:</strong> {item.pregnancyStatus}
                          </p>
                        )}
                        {item.recommendedAction && (
                          <p className="text-slate-800 font-semibold">
                            <strong className="text-emerald-800">Action Recommended:</strong> {item.recommendedAction}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-slate-500 italic">
                            <strong>Remarks:</strong> {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
