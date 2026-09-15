import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Sparkles,
  Users,
  Target,
  HeartPulse,
  ShieldAlert,
  Navigation,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  MapPin,
  FileSpreadsheet,
  Activity,
  Layers,
  Info,
  ChevronRight,
  TrendingUp,
  Play,
  Pause,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export type CampaignCategory =
  | "diabetes_screening"
  | "hypertension_screening"
  | "maternal_health"
  | "nutrition"
  | "immunization"
  | "anemia_eradication"
  | "ncd_screening"
  | "eye_care"
  | "sanitation";

const CATEGORY_PRESETS: {
  category: CampaignCategory;
  label: string;
  defaultName: string;
  defaultDescription: string;
  color: string;
}[] = [
  {
    category: "diabetes_screening",
    label: "Diabetes Screening",
    defaultName: "Mukhyamantri Diabetes & Metabolic Screening Drive",
    defaultDescription: "Systematic fasting/random blood glucose screening and HbA1c testing for adults 30+ in high-risk village clusters.",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    category: "hypertension_screening",
    label: "Hypertension Screening",
    defaultName: "Universal Hypertension & CVD Early Detection Drive",
    defaultDescription: "Digital sphygmomanometer blood pressure mapping, cardiovascular risk scoring, and lifestyle counseling.",
    color: "bg-rose-100 text-rose-800 border-rose-200",
  },
  {
    category: "maternal_health",
    label: "Maternal Health (ANC)",
    defaultName: "Pradhan Mantri Matritva High-Risk Pregnancy Drive",
    defaultDescription: "Comprehensive 1st-to-3rd trimester antenatal tracking, ultrasound triage, and institutional delivery counseling.",
    color: "bg-pink-100 text-pink-800 border-pink-200",
  },
  {
    category: "nutrition",
    label: "POSHAN Nutrition & Anemia",
    defaultName: "POSHAN Abhiyaan & Anemia Eradication Outreach",
    defaultDescription: "Digital hemoglobinometry, Mid-Upper Arm Circumference (MUAC) assessment, and therapeutic IFA syrup dispensing.",
    color: "bg-amber-100 text-amber-900 border-amber-200",
  },
  {
    category: "immunization",
    label: "Immunization Awareness",
    defaultName: "Mission Indradhanush Full Immunization Catch-up",
    defaultDescription: "Zero-dose infant enumeration, dropout tracking, and comprehensive pentavalent/measles vaccine coverage.",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
];

const AVAILABLE_VILLAGES = [
  "Sundarpur",
  "Rampura",
  "Sanand",
  "Bavla",
  "Vasna",
  "Dholka",
  "Viramgam",
];

const AVAILABLE_WORKERS = [
  "ASHA Team Lead (Sundarpur)",
  "CHO In-Charge (Sanand PHC)",
  "ANM Field Nurse (Rampura)",
  "Medical Officer (Bavla CHC)",
  "Community Nutrition Worker",
  "Mobile Diagnostic Tech",
];

export function CampaignManagementView({
  initialDistrict = "Ahmedabad Rural",
}: {
  initialDistrict?: string;
}) {
  const utils = trpc.useUtils();
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [formCategory, setFormCategory] = useState<CampaignCategory>("diabetes_screening");
  const [formName, setFormName] = useState("Mukhyamantri Diabetes Screening Drive");
  const [formDescription, setFormDescription] = useState(
    "Systematic fasting/random blood glucose screening and HbA1c testing for adults 30+."
  );
  const [formTargetVillages, setFormTargetVillages] = useState<string[]>(["Sundarpur"]);
  const [formTargetPopulation, setFormTargetPopulation] = useState<number>(350);
  const [formStartDate, setFormStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [formEndDate, setFormEndDate] = useState<string>(
    new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0]
  );
  const [formAssignedWorkers, setFormAssignedWorkers] = useState<string[]>([
    "ASHA Team Lead (Sundarpur)",
    "CHO In-Charge (Sanand PHC)",
  ]);
  const [formStatus, setFormStatus] = useState<"planned" | "active">("active");

  // Queries
  const campaignsQuery = trpc.campaigns.getExecutiveSummary.useQuery(
    { district: initialDistrict },
    { staleTime: 15000, refetchOnWindowFocus: false }
  );

  const prioritizationQuery = trpc.campaigns.getPrioritization.useQuery(
    { district: initialDistrict },
    { staleTime: 60000, refetchOnWindowFocus: false }
  );

  // Mutations
  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Campaign created successfully!");
      setIsCreateModalOpen(false);
      utils.campaigns.getExecutiveSummary.invalidate();
      utils.campaigns.list.invalidate();
      utils.commandCenter.getExecutiveSummary.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to create campaign: ${err.message}`);
    },
  });

  const updateStatusMutation = trpc.campaigns.updateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.campaigns.getExecutiveSummary.invalidate();
      utils.campaigns.list.invalidate();
      utils.commandCenter.getExecutiveSummary.invalidate();
    },
    onError: (err) => {
      toast.error(`Status update failed: ${err.message}`);
    },
  });

  const recordScreeningMutation = trpc.campaigns.recordScreening.useMutation({
    onSuccess: () => {
      toast.success("Field screening recorded for campaign!");
      utils.campaigns.getExecutiveSummary.invalidate();
    },
  });

  const campaignsData = campaignsQuery.data?.campaigns || [];
  const summary = campaignsQuery.data?.summary;
  const prioritizedVillages = prioritizationQuery.data?.prioritizedVillages || [];

  // Filtered Campaigns
  const filteredCampaigns = campaignsData.filter((c) => {
    const matchesStatus =
      selectedStatusFilter === "all" || c.status.toLowerCase() === selectedStatusFilter.toLowerCase();
    const matchesCategory =
      selectedCategoryFilter === "all" || c.category.toLowerCase() === selectedCategoryFilter.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.targetVillages.some((v) => v.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.assignedWorkers.some((w) => w.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const handleApplyPreset = (preset: (typeof CATEGORY_PRESETS)[0]) => {
    setFormCategory(preset.category);
    setFormName(preset.defaultName);
    setFormDescription(preset.defaultDescription);
  };

  const handleAutoPlanForVillage = (villageNode: (typeof prioritizedVillages)[0]) => {
    const rec = villageNode.recommendedCampaign;
    setFormCategory(rec.category);
    setFormName(rec.name);
    setFormDescription(rec.rationale);
    setFormTargetVillages([villageNode.villageName]);
    setFormTargetPopulation(rec.targetBeneficiaries);
    setFormAssignedWorkers(rec.suggestedStaffing);
    setFormStatus("active");
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setFormEndDate(new Date(Date.now() + rec.suggestedDurationDays * 86400000).toISOString().split("T")[0]);
    setIsCreateModalOpen(true);
    toast.info(`Pre-filled campaign parameters from AI prioritization for ${villageNode.villageName}.`);
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter a campaign name.");
      return;
    }
    if (formTargetVillages.length === 0) {
      toast.error("Please select at least one target village.");
      return;
    }
    if (formTargetPopulation <= 0) {
      toast.error("Target population must be greater than 0.");
      return;
    }

    createMutation.mutate({
      name: formName,
      category: formCategory,
      description: formDescription,
      district: initialDistrict,
      targetVillages: formTargetVillages,
      targetPopulation: Number(formTargetPopulation),
      startDate: new Date(formStartDate),
      endDate: new Date(formEndDate),
      assignedWorkers: formAssignedWorkers,
      status: formStatus,
    });
  };

  const toggleVillageSelection = (v: string) => {
    setFormTargetVillages((prev) =>
      prev.includes(v) ? prev.filter((item) => item !== v) : [...prev, v]
    );
  };

  const toggleWorkerSelection = (w: string) => {
    setFormAssignedWorkers((prev) =>
      prev.includes(w) ? prev.filter((item) => item !== w) : [...prev, w]
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-sm border border-slate-700">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-[11px] font-bold uppercase tracking-wider">
              Health Campaign Operations
            </Badge>
            <span className="text-slate-400 text-xs">·</span>
            <span className="text-xs text-slate-300 font-medium">District Health Office · {initialDistrict}</span>
          </div>
          <h2 className="display-font text-2xl font-black mt-2 tracking-tight text-white">
            Health Campaign Planning &amp; Field Tracking
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Create targeted screening drives, track screening and referral yields in real time, and deploy AI-assisted village prioritization.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => {
              campaignsQuery.refetch();
              prioritizationQuery.refetch();
            }}
            variant="outline"
            size="sm"
            className="rounded-full bg-slate-800/80 hover:bg-slate-700 border-slate-600 text-slate-200 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${campaignsQuery.isFetching ? "animate-spin text-teal-400" : ""}`} />
            Refresh Data
          </Button>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs px-4 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Plan New Campaign
          </Button>
        </div>
      </div>

      {/* 2. Executive Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <Card className="border-0 shadow-xs bg-[#e6f4ea] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold uppercase">
            <span>Active Campaigns</span>
            <Play className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="my-1.5">
            <p className="display-font text-2xl font-extrabold text-emerald-950">
              {summary?.activeCampaigns ?? 0}
            </p>
            <span className="text-[10px] text-emerald-800 font-medium">
              {summary?.totalCampaigns ?? 0} Total Drives
            </span>
          </div>
        </Card>

        <Card className="border-0 shadow-xs bg-[#e4f1f8] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-800 text-[10px] font-bold uppercase">
            <span>Target Population</span>
            <Users className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="my-1.5">
            <p className="display-font text-2xl font-extrabold text-blue-950">
              {summary?.totalTargetPopulation ?? 0}
            </p>
            <span className="text-[10px] text-blue-700 font-medium">Beneficiary Target</span>
          </div>
        </Card>

        <Card className="border-0 shadow-xs bg-[#eef2ff] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-800 text-[10px] font-bold uppercase">
            <span>Total Screened</span>
            <HeartPulse className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div className="my-1.5">
            <p className="display-font text-2xl font-extrabold text-indigo-950">
              {summary?.totalScreened ?? 0}
            </p>
            <span className="text-[10px] text-indigo-700 font-medium">
              {summary?.overallCompletionPercent ?? 0}% Completion
            </span>
          </div>
        </Card>

        <Card className="border-0 shadow-xs bg-[#f8e7e8] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-800 text-[10px] font-bold uppercase">
            <span>High-Risk Identified</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <div className="my-1.5">
            <p className="display-font text-2xl font-extrabold text-rose-950">
              {summary?.totalHighRiskDetected ?? 0}
            </p>
            <span className="text-[10px] text-rose-700 font-medium">Critical / High Tier</span>
          </div>
        </Card>

        <Card className="border-0 shadow-xs bg-[#fff4da] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-900 text-[10px] font-bold uppercase">
            <span>Referrals Generated</span>
            <Navigation className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="my-1.5">
            <p className="display-font text-2xl font-extrabold text-amber-950">
              {summary?.totalReferralsGenerated ?? 0}
            </p>
            <span className="text-[10px] text-amber-800 font-medium">PHC/CHC Escalations</span>
          </div>
        </Card>

        <Card className="border-0 shadow-xs bg-[#fdf2f8] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pink-800 text-[10px] font-bold uppercase">
            <span>Follow-ups Logged</span>
            <Clock className="h-3.5 w-3.5 text-pink-600" />
          </div>
          <div className="my-1.5">
            <p className="display-font text-2xl font-extrabold text-pink-950">
              {summary?.totalFollowUpsLogged ?? 0}
            </p>
            <span className="text-[10px] text-pink-700 font-medium">Field Visits Scheduled</span>
          </div>
        </Card>
      </div>

      {/* 3. AI-Assisted Village Prioritization Section */}
      <Card className="border-0 shadow-xs bg-white rounded-3xl overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge className="bg-blue-600 text-white font-extrabold text-[10px] uppercase tracking-wider">
                  AI DECISION SUPPORT: VILLAGE PRIORITIZATION
                </Badge>
                <Badge variant="outline" className="text-[10px] font-semibold text-blue-900">
                  4-Factor Telemetry Grounding
                </Badge>
              </div>
              <CardTitle className="display-font text-lg font-black text-slate-900">
                Data-Driven Village Prioritization &amp; Campaign Targeting
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 mt-1 max-w-3xl">
                Algorithmic ranking evaluating <strong>Low Screening Coverage (35%)</strong>, <strong>High-Risk Morbidity Concentration (30%)</strong>, <strong>Target Population (20%)</strong>, and <strong>Previous Campaign Adherence (15%)</strong>.
              </CardDescription>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-400">Model Refresh: Real-time</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {prioritizedVillages.slice(0, 3).map((v) => (
              <div
                key={v.villageId}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between hover:border-blue-300 hover:shadow-xs transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-900 text-white text-[10px] font-extrabold">
                          #{v.rank}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{v.villageName}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500">{v.block} · Pop: {v.population}</p>
                    </div>

                    <Badge
                      className={
                        v.priorityLevel === "CRITICAL_PRIORITY"
                          ? "bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]"
                          : v.priorityLevel === "HIGH_PRIORITY"
                          ? "bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]"
                          : "bg-blue-100 text-blue-900 border-blue-300 font-bold text-[10px]"
                      }
                    >
                      {v.priorityScore}/100 Priority
                    </Badge>
                  </div>

                  {/* Primary Drivers */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Key Triggers:</span>
                    <div className="flex flex-wrap gap-1">
                      {v.primaryDrivers.map((driver, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                        >
                          {driver}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Campaign Type */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-2.5 text-xs">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-900">
                      <Sparkles className="h-3 w-3 text-blue-600" />
                      Suggested Action:
                    </div>
                    <p className="font-semibold text-blue-950 text-xs mt-0.5">
                      {v.recommendedCampaign.name}
                    </p>
                    <p className="text-[11px] text-blue-800/90 mt-1 leading-snug">
                      {v.recommendedCampaign.rationale}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Target: <strong>{v.recommendedCampaign.targetBeneficiaries}</strong>
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleAutoPlanForVillage(v)}
                    className="rounded-full bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] h-7 px-3 gap-1"
                  >
                    Auto-Plan Campaign <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Mandatory AI Decision Support Disclaimer */}
          <div className="rounded-xl bg-slate-100/80 border border-slate-200/70 p-3 text-[11px] text-slate-500 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
            <span>
              <strong>AI Decision Support Disclaimer:</strong> {prioritizationQuery.data?.disclaimer || "AI Decision Support: Village Prioritization for administrative planning and resource allocation only. Not a clinical diagnosis or epidemiological outbreak detection."}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Filter & Search Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-semibold">
            {["all", "active", "planned", "completed"].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatusFilter(status)}
                className={`px-3 py-1 rounded-full capitalize transition ${
                  selectedStatusFilter === status
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
            <SelectTrigger className="h-8 w-44 rounded-full bg-white text-xs border-slate-200">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="diabetes_screening">Diabetes Screening</SelectItem>
              <SelectItem value="hypertension_screening">Hypertension Screening</SelectItem>
              <SelectItem value="maternal_health">Maternal Health (ANC)</SelectItem>
              <SelectItem value="nutrition">POSHAN Nutrition</SelectItem>
              <SelectItem value="immunization">Immunization</SelectItem>
              <SelectItem value="anemia_eradication">Anemia Eradication</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns, villages, workers..."
            className="pl-9 h-8 rounded-full bg-white text-xs border-slate-200"
          />
        </div>
      </div>

      {/* 5. Campaign Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
        {filteredCampaigns.map((c) => {
          const categoryObj = CATEGORY_PRESETS.find((p) => p.category === c.category);
          const isCompleted = c.status === "completed";
          const isActive = c.status === "active";
          const isPlanned = c.status === "planned";

          return (
            <Card key={c.id} className="border-0 shadow-xs bg-white rounded-3xl p-5 space-y-4 hover:shadow-sm transition">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <Badge className={categoryObj?.color || "bg-slate-100 text-slate-800"}>
                      {categoryObj?.label || c.category.replace("_", " ")}
                    </Badge>
                    <Badge
                      className={
                        isActive
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]"
                          : isPlanned
                          ? "bg-blue-100 text-blue-800 border-blue-300 font-bold text-[10px]"
                          : "bg-slate-100 text-slate-700 font-bold text-[10px]"
                      }
                    >
                      {c.status.toUpperCase()}
                    </Badge>
                    {c.pacingStatus && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.pacingStatus === "ahead"
                            ? "bg-emerald-50 text-emerald-700"
                            : c.pacingStatus === "behind"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-slate-50 text-slate-600"
                        }`}
                      >
                        Pacing: {c.pacingStatus.replace("_", " ")}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-slate-900 tracking-tight leading-snug">
                    {c.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                    {c.description}
                  </p>
                </div>
              </div>

              {/* Villages & Dates */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">{c.targetVillages.join(", ")}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Progress Bar & Completion % */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>Screening Coverage</span>
                  <span className={c.completionPercent >= 80 ? "text-emerald-700" : "text-slate-700"}>
                    {c.completionPercent}% ({c.screenedCount} / {c.targetPopulation})
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      c.completionPercent >= 80
                        ? "bg-emerald-500"
                        : c.completionPercent >= 40
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, c.completionPercent)}%` }}
                  />
                </div>
              </div>

              {/* 4 Core Tracking Metrics */}
              <div className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-50 p-3 border border-slate-100 text-center">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Target</p>
                  <p className="font-extrabold text-slate-900 text-sm">{c.targetPopulation}</p>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-700 uppercase font-semibold">Screened</p>
                  <p className="font-extrabold text-emerald-700 text-sm">{c.screenedCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-rose-700 uppercase font-semibold">High-Risk</p>
                  <p className="font-extrabold text-rose-700 text-sm">{c.highRiskDetected}</p>
                </div>
                <div>
                  <p className="text-[10px] text-indigo-700 uppercase font-semibold">Referrals</p>
                  <p className="font-extrabold text-indigo-700 text-sm">{c.referralsCount}</p>
                </div>
              </div>

              {/* Assigned Field Workers */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Field Team:</span>
                <div className="flex flex-wrap gap-1">
                  {c.assignedWorkers.map((worker, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 font-medium"
                    >
                      {worker}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Controls */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => recordScreeningMutation.mutate({ campaignId: c.id, highRisk: false })}
                  className="rounded-full text-[11px] h-7 px-3 bg-white border-slate-200"
                >
                  <Plus className="mr-1 h-3 w-3 text-emerald-600" /> Log Screening
                </Button>

                <div className="flex items-center gap-1.5">
                  {c.status !== "active" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: c.id, status: "active" })}
                      className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-3 font-semibold"
                    >
                      <Play className="mr-1 h-3 w-3" /> Set Active
                    </Button>
                  )}

                  {c.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ id: c.id, status: "completed" })}
                      className="rounded-full text-slate-700 text-[11px] h-7 px-3 font-semibold bg-white"
                    >
                      <Check className="mr-1 h-3 w-3 text-emerald-600" /> Mark Completed
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 space-y-3">
          <Activity className="mx-auto h-8 w-8 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No campaigns found matching filter</p>
          <Button
            size="sm"
            onClick={() => {
              setSelectedStatusFilter("all");
              setSelectedCategoryFilter("all");
              setSearchQuery("");
            }}
            variant="outline"
            className="rounded-full text-xs"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CREATE CAMPAIGN MODAL DIALOG */}
      {/* ========================================================================= */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-teal-100 text-teal-900 border-teal-300 text-[10px] font-bold uppercase">
                Administrator Workflow
              </Badge>
            </div>
            <DialogTitle className="display-font text-xl font-bold text-slate-900 mt-1">
              Create New Health Campaign
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Deploy an evidence-based outreach drive with targeted beneficiaries, assigned care teams, and multi-village coverage.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitCreate} className="space-y-4 pt-2 text-xs">
            {/* Quick Templates */}
            <div>
              <Label className="text-xs font-bold text-slate-700">Quick Campaign Templates:</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                {CATEGORY_PRESETS.map((preset) => (
                  <button
                    key={preset.category}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`text-left p-2.5 rounded-2xl border transition ${
                      formCategory === preset.category
                        ? "border-teal-500 bg-teal-50/70 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-bold text-slate-900 text-xs">{preset.label}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{preset.defaultName}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Name & Category */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cName" className="text-xs font-bold text-slate-700">
                  Campaign Name *
                </Label>
                <Input
                  id="cName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Mukhyamantri Diabetes Screening Drive"
                  className="rounded-xl bg-slate-50 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cCategory" className="text-xs font-bold text-slate-700">
                  Campaign Category *
                </Label>
                <Select value={formCategory} onValueChange={(val) => setFormCategory(val as CampaignCategory)}>
                  <SelectTrigger id="cCategory" className="rounded-xl bg-slate-50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diabetes_screening">Diabetes Screening</SelectItem>
                    <SelectItem value="hypertension_screening">Hypertension Screening</SelectItem>
                    <SelectItem value="maternal_health">Maternal Health (ANC)</SelectItem>
                    <SelectItem value="nutrition">POSHAN Nutrition &amp; Anemia</SelectItem>
                    <SelectItem value="immunization">Immunization Awareness</SelectItem>
                    <SelectItem value="anemia_eradication">Anemia Eradication</SelectItem>
                    <SelectItem value="ncd_screening">General NCD Screening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target Villages Selection */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">
                Target Villages (Multiple Selection) *
              </Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {AVAILABLE_VILLAGES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleVillageSelection(v)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      formTargetVillages.includes(v)
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {formTargetVillages.includes(v) && "✓ "}
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Population & Status */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cPop" className="text-xs font-bold text-slate-700">
                  Target Beneficiaries (Population) *
                </Label>
                <Input
                  id="cPop"
                  type="number"
                  min="10"
                  value={formTargetPopulation}
                  onChange={(e) => setFormTargetPopulation(Number(e.target.value))}
                  className="rounded-xl bg-slate-50 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cStatus" className="text-xs font-bold text-slate-700">
                  Initial Campaign Status
                </Label>
                <Select value={formStatus} onValueChange={(val) => setFormStatus(val as "planned" | "active")}>
                  <SelectTrigger id="cStatus" className="rounded-xl bg-slate-50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Immediate Rollout)</SelectItem>
                    <SelectItem value="planned">Planned (Scheduled for later)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates: Start & End */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cStart" className="text-xs font-bold text-slate-700">
                  Start Date *
                </Label>
                <Input
                  id="cStart"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="rounded-xl bg-slate-50 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cEnd" className="text-xs font-bold text-slate-700">
                  End Date *
                </Label>
                <Input
                  id="cEnd"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="rounded-xl bg-slate-50 text-xs"
                  required
                />
              </div>
            </div>

            {/* Assigned Workers */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">
                Assigned Care Team &amp; Health Workers:
              </Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {AVAILABLE_WORKERS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggleWorkerSelection(w)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      formAssignedWorkers.includes(w)
                        ? "bg-teal-700 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {formAssignedWorkers.includes(w) && "✓ "}
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="cDesc" className="text-xs font-bold text-slate-700">
                Campaign Description &amp; Operational Protocols
              </Label>
              <Textarea
                id="cDesc"
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Field instructions, screening kits, diagnostic device allocations..."
                className="rounded-xl bg-slate-50 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-5"
              >
                {createMutation.isPending ? "Deploying..." : "Deploy Campaign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
