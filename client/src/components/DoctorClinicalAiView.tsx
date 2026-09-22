import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Sparkles,
  Send,
  Stethoscope,
  Pill,
  ShieldAlert,
  Activity,
  AlertCircle,
  FileText,
  CheckCircle2,
  RefreshCw,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface DoctorClinicalAiViewProps {
  currentPatientId?: number;
  patientsList?: any[];
  userDistrict?: string;
  facilityName?: string;
}

export function DoctorClinicalAiView({
  currentPatientId = 1,
  patientsList = [],
  userDistrict = "Pune",
  facilityName = "Pune District Hospital",
}: DoctorClinicalAiViewProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<number>(currentPatientId);
  const [category, setCategory] = useState<"general_clinical" | "differential_diagnosis" | "drug_interactions" | "maternal_triage" | "epidemiology">("general_clinical");
  const [language, setLanguage] = useState<"en" | "mr" | "hi">("en");
  const [inputQuery, setInputQuery] = useState("");
  const [includePatientContext, setIncludePatientContext] = useState(true);

  const selectedPatient = patientsList.find((p) => p.id === selectedPatientId) || patientsList[0];

  const [conversation, setConversation] = useState<Array<{
    role: "user" | "ai";
    query: string;
    category?: string;
    reply: string;
    urgency?: string;
    recommendedAction?: string;
    model?: string;
    source?: string;
    timestamp: string;
  }>>([
    {
      role: "ai",
      query: "Initial Welcome",
      reply: `Welcome to **Arjuna Clinical AI Copilot** (Powered by Gemini 3.6 Flash).
I am calibrated to Maharashtra Directorate of Health Services (DHS) & National Health Mission (NHM) clinical guidelines.

You can ask me to:
- Formulate **Differential Diagnoses** for complex or high-risk rural OPD encounters.
- Perform **Drug-Drug Interaction & Dosage Safety** checks against the Maharashtra Essential Drug List (EDL).
- Review **High-Risk Maternal Protocols** (Pre-eclampsia, Gestational Diabetes, Severe Anemia).
- Guide **Tertiary Referral Criteria** to District Hospitals and Government Medical Colleges.`,
      timestamp: "Ready",
    },
  ]);

  const quickPrompts = trpc.aiAssistant.getQuickPrompts.useQuery({ role: "doctor", language: language as any });

  const clinicalMutation = trpc.aiAssistant.clinicalAssistant.useMutation({
    onSuccess: (data: any) => {
      setConversation((prev) => [
        ...prev,
        {
          role: "ai",
          query: inputQuery,
          category,
          reply: data.reply,
          urgency: data.urgency,
          recommendedAction: data.recommendedAction,
          model: data.model,
          source: data.source,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setInputQuery("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate clinical decision response.");
    },
  });

  const handleSend = (overrideQuery?: string) => {
    const q = (overrideQuery || inputQuery).trim();
    if (!q || clinicalMutation.isPending) return;

    setConversation((prev) => [
      ...prev,
      {
        role: "user",
        query: q,
        category,
        reply: q,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    clinicalMutation.mutate({
      query: q,
      category,
      language: language as any,
      patientContext: includePatientContext && selectedPatient
        ? {
            name: selectedPatient.name,
            age: selectedPatient.age,
            gender: selectedPatient.gender,
            vitals: `BP: ${selectedPatient.bpSystolic || 140}/${selectedPatient.bpDiastolic || 90}, Pulse: ${selectedPatient.pulse || 76}, SpO2: ${selectedPatient.spo2 || 98}%`,
            symptoms: selectedPatient.symptoms || selectedPatient.conditions || "None reported",
            history: selectedPatient.conditions || "None declared",
            currentMedications: selectedPatient.medications || "Telmisartan 40mg, Metformin 500mg",
            allergies: selectedPatient.allergies || "None",
          }
        : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Card */}
      <Card className="border-0 shadow-xs bg-gradient-to-r from-[#15181b] via-[#1a2332] to-[#1e3a5f] text-white">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#8dc5e3] backdrop-blur-sm border border-white/15">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="display-font text-lg font-bold">Arjuna Clinical AI Copilot</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-200 border border-blue-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                    Gemini 3.6 Flash Engine
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Clinical decision support, differential diagnoses, & Maharashtra DHS drug interaction checks
                </p>
              </div>
            </div>

            {/* Category Pills & Language */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setCategory("general_clinical")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${category === "general_clinical" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-300 hover:text-white"}`}
                >
                  General
                </button>
                <button
                  onClick={() => setCategory("differential_diagnosis")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${category === "differential_diagnosis" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-300 hover:text-white"}`}
                >
                  Differentials
                </button>
                <button
                  onClick={() => setCategory("drug_interactions")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${category === "drug_interactions" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-300 hover:text-white"}`}
                >
                  Drug Safety
                </button>
                <button
                  onClick={() => setCategory("maternal_triage")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${category === "maternal_triage" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-300 hover:text-white"}`}
                >
                  Maternal Triage
                </button>
              </div>

              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-2 py-1 rounded-lg font-medium ${language === "en" ? "bg-white text-slate-900 font-bold" : "text-slate-300"}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("mr")}
                  className={`px-2 py-1 rounded-lg font-medium ${language === "mr" ? "bg-white text-slate-900 font-bold" : "text-slate-300"}`}
                >
                  मराठी
                </button>
                <button
                  onClick={() => setLanguage("hi")}
                  className={`px-2 py-1 rounded-lg font-medium ${language === "hi" ? "bg-white text-slate-900 font-bold" : "text-slate-300"}`}
                >
                  हिंदी
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Context Bar */}
      {patientsList.length > 0 && (
        <Card className="border-0 shadow-xs bg-white">
          <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={includePatientContext}
                  onChange={(e) => setIncludePatientContext(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                Attach Active Patient Context
              </label>
              {includePatientContext && (
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800"
                >
                  {patientsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.age}y, {p.gender}) — {p.village} [{p.riskCategory?.toUpperCase() || "ROUTINE"}]
                    </option>
                  ))}
                </select>
              )}
            </div>
            {includePatientContext && selectedPatient && (
              <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                <span>Conditions: <strong className="text-slate-800">{selectedPatient.conditions || "None"}</strong></span>
                <span>District: <strong className="text-slate-800">{userDistrict}</strong></span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Clinical Prompts Bar */}
      {quickPrompts.data?.prompts && quickPrompts.data.prompts.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Quick Clinical Checks:</span>
          {quickPrompts.data.prompts.map((pt: string, idx: number) => (
            <button
              key={idx}
              onClick={() => handleSend(pt)}
              disabled={clinicalMutation.isPending}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 transition-colors shadow-2xs"
            >
              {pt}
            </button>
          ))}
        </div>
      )}

      {/* Chat / Consultation Stream */}
      <Card className="border-0 shadow-xs bg-white flex flex-col h-[520px]">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#15181b] text-white rounded-br-none shadow-sm"
                    : "bg-[#f4f7fb] text-slate-800 rounded-bl-none border border-slate-200/60 shadow-2xs"
                }`}
              >
                {msg.role === "ai" && (
                  <div className="flex items-center justify-between border-b border-slate-200/50 pb-2 mb-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900 text-[11px]">
                      <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                      Arjuna Clinical Advisor
                    </div>
                    {msg.model && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {msg.model}
                      </span>
                    )}
                  </div>
                )}
                <div className="whitespace-pre-line prose-xs">{msg.reply}</div>

                {msg.recommendedAction && (
                  <div className="mt-3 rounded-xl bg-white p-2.5 text-slate-900 font-bold border border-slate-200 text-[11px] shadow-2xs">
                    Clinical Action Recommendation: {msg.recommendedAction}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {clinicalMutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-200 w-fit">
              <Sparkles className="h-4 w-4 animate-spin text-blue-600" />
              <span>Analyzing case with Gemini 3.6 Flash against Maharashtra DHS Clinical Protocols…</span>
            </div>
          )}
        </CardContent>

        {/* Input Bar */}
        <div className="border-t border-slate-100 p-3 bg-slate-50/70 flex items-center gap-2 rounded-b-2xl">
          <Input
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              category === "differential_diagnosis"
                ? "Enter symptoms or vitals for differential diagnosis..."
                : category === "drug_interactions"
                ? "Enter medicines to check interactions & dosage safety..."
                : category === "maternal_triage"
                ? "Ask about high-risk pregnancy protocols or warning signs..."
                : "Ask any clinical, pharmacological, or protocol question..."
            }
            className="rounded-full border-slate-200 bg-white text-xs py-5 px-4 shadow-2xs"
          />
          <Button
            onClick={() => handleSend()}
            disabled={clinicalMutation.isPending || !inputQuery.trim()}
            className="rounded-full bg-[#15181b] px-4 text-white hover:bg-slate-800 transition-colors shrink-0 shadow-sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
