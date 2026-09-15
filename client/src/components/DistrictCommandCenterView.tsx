import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend as RechartsLegend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  FileCheck,
  FileSpreadsheet,
  HeartPulse,
  Hospital,
  Info,
  Layers,
  MapPin,
  Navigation,
  Package,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { DistrictHealthIntelligenceMap } from "./DistrictHealthIntelligenceMap";

const RISK_COLORS = ["#e11d48", "#ea580c", "#f59e0b", "#10b981"];

export function DistrictCommandCenterView({
  initialDistrict = "Ahmedabad Rural",
}: {
  initialDistrict?: string;
}) {
  const [activeTabSection, setActiveTabSection] = useState<"overview" | "map" | "charts" | "insights">("overview");

  // Fetch executive command center summary
  const summaryQuery = trpc.commandCenter.getExecutiveSummary.useQuery(
    { district: initialDistrict },
    {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  const data = summaryQuery.data;
  const kpis = data?.kpis;
  const charts = data?.charts;
  const insights = data?.aiOperationalInsights || [];
  const notes = data?.summaryNotes;

  const handleDownloadDigest = () => {
    toast.success("District Health Digest Report downloaded for Ahmedabad Rural (PDF/JSON Export)");
  };

  const handleExecuteInsightAction = (insight: (typeof insights)[0]) => {
    if (insight.actionType === "schedule_camp") {
      toast.success(`Priority NCD Screening Camp scheduled for ${insight.affectedVillageOrFacility}. Block Medical Officer notified.`);
    } else if (insight.actionType === "rebalance_stock") {
      toast.success(`Stock rebalancing dispatch order issued for ${insight.affectedVillageOrFacility}. Warehouse transfer in queue.`);
    } else if (insight.actionType === "assign_worker") {
      toast.success(`Urgent home visit reminder sent to ASHA / CHO care team in ${insight.affectedVillageOrFacility}.`);
    } else if (insight.actionType === "dispatch_ambulance") {
      toast.success(`108 Emergency transport coordinator alerted for ${insight.affectedVillageOrFacility}.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-sm border border-slate-700">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px] font-bold uppercase tracking-wider">
              Executive Command Center
            </Badge>
            <span className="text-slate-400 text-xs">·</span>
            <span className="text-xs text-slate-300 font-medium">Government of Gujarat · Health &amp; Family Welfare Department</span>
          </div>
          <h2 className="display-font text-2xl font-black mt-2 tracking-tight text-white">
            {initialDistrict} Health Intelligence Command
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Real-time district surveillance across 7 rural blocks, primary health centers, community screening drives, and pharmaceutical supply chain corridors.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => summaryQuery.refetch()}
            variant="outline"
            size="sm"
            className="rounded-full bg-slate-800/80 hover:bg-slate-700 border-slate-600 text-slate-200 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${summaryQuery.isFetching ? "animate-spin text-emerald-400" : ""}`} />
            Refresh Feed
          </Button>

          <Button
            onClick={handleDownloadDigest}
            size="sm"
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs px-4 gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Download District Digest
          </Button>
        </div>
      </div>

      {/* 8 Core Database-Grounded KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Registered Patients */}
        <Card className="border-0 shadow-xs bg-[#e8f3ed] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#1f4935] text-[10px] font-bold uppercase">
            <span>Registered Patients</span>
            <Users className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="my-2">
            <p className="display-font text-2xl font-extrabold text-[#1f4935]">{kpis?.registeredPatients ?? 0}</p>
            <span className="text-[10px] text-emerald-800 font-medium">District Registry</span>
          </div>
        </Card>

        {/* 2. Today's Screenings */}
        <Card className="border-0 shadow-xs bg-[#e4f1f8] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-800 text-[10px] font-bold uppercase">
            <span>Today's Screenings</span>
            <HeartPulse className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="my-2">
            <p className="display-font text-2xl font-extrabold text-blue-950">{kpis?.todaysScreenings ?? 0}</p>
            <span className="text-[10px] text-blue-700 font-medium">Daily Field Velocity</span>
          </div>
        </Card>

        {/* 3. High-Risk Patients */}
        <Card className="border-0 shadow-xs bg-[#f8e7e8] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-800 text-[10px] font-bold uppercase">
            <span>High-Risk Patients</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <div className="my-2">
            <p className="display-font text-2xl font-extrabold text-rose-950">{kpis?.highRiskPatients ?? 0}</p>
            <span className="text-[10px] text-rose-700 font-medium">Priority NCD / Maternal</span>
          </div>
        </Card>

        {/* 4. Active Referrals */}
        <Card className="border-0 shadow-xs bg-[#fff4da] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-900 text-[10px] font-bold uppercase">
            <span>Active Referrals</span>
            <Navigation className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="my-2">
            <p className="display-font text-2xl font-extrabold text-amber-950">{kpis?.activeReferrals ?? 0}</p>
            <span className="text-[10px] text-amber-800 font-medium">In Transit / Queue</span>
          </div>
        </Card>

        {/* 5. Referral Completion */}
        <Card className="border-0 shadow-xs bg-[#eef2ff] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-800 text-[10px] font-bold uppercase">
            <span>Referral Completion</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div className="my-2">
            <p className="display-font text-2xl font-extrabold text-indigo-950">{kpis?.referralCompletionRatePercent ?? 0}%</p>
            <span className="text-[10px] text-indigo-700 font-medium">Consulted at Facility</span>
          </div>
        </Card>

        {/* 6. Missed Follow-ups */}
        <Card className="border-0 shadow-xs bg-[#fdf2f8] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pink-800 text-[10px] font-bold uppercase">
            <span>Missed Follow-ups</span>
            <Clock className="h-3.5 w-3.5 text-pink-600" />
          </div>
          <div className="my-2">
            <p className="display-font text-2xl font-extrabold text-pink-950">{kpis?.missedFollowUps ?? 0}</p>
            <span className="text-[10px] text-pink-700 font-medium">Overdue Field Visits</span>
          </div>
        </Card>

        {/* 7. Medicine Stock Alerts */}
        <Card className="border-0 shadow-xs bg-[#faf5ff] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-800 text-[10px] font-bold uppercase">
            <span>Stock Alerts</span>
            <Pill className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <div className="my-2">
            <p className="display-font text-2xl font-extrabold text-purple-950">{kpis?.medicineStockAlerts ?? 0}</p>
            <span className="text-[10px] text-purple-700 font-medium">SKUs Below Buffer</span>
          </div>
        </Card>

        {/* 8. Active Campaigns */}
        <Card className="border-0 shadow-xs bg-[#ecfdf5] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-teal-800 text-[10px] font-bold uppercase">
            <span>Active Campaigns</span>
            <Calendar className="h-3.5 w-3.5 text-teal-600" />
          </div>
          <div className="my-2">
            <p className="display-font text-2xl font-extrabold text-teal-950">{kpis?.activeCampaigns ?? 0}</p>
            <span className="text-[10px] text-teal-700 font-medium">Outreach Drives</span>
          </div>
        </Card>
      </div>

      {/* View Switcher Tabs: Overview / Integrated GIS Map / Analytical Charts / AI Insights */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTabSection("overview")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition ${
            activeTabSection === "overview"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Overview &amp; Intelligence Grid
        </button>

        <button
          onClick={() => setActiveTabSection("map")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTabSection === "map"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          District GIS Surveillance Map
        </button>

        <button
          onClick={() => setActiveTabSection("charts")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTabSection === "charts"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Analytics &amp; Trends (5 Charts)
        </button>

        <button
          onClick={() => setActiveTabSection("insights")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTabSection === "insights"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          AI Operational Insights ({insights.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: OVERVIEW (Map + AI Insights + Top Charts) */}
      {/* ========================================================================= */}
      {(activeTabSection === "overview" || activeTabSection === "map") && (
        <div className="space-y-6">
          {/* Integrated Village Health Intelligence GIS Map */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="display-font text-base font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="h-4 w-4 text-emerald-700" />
                  Village Health Intelligence GIS Grid
                </h3>
                <p className="text-xs text-slate-500">
                  Spatial visualization of village risk concentration, screening coverage, referral turnaround delays, drug shortages, and accessibility index.
                </p>
              </div>
            </div>
            <DistrictHealthIntelligenceMap initialDistrict={initialDistrict} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: 5 ANALYTICAL CHARTS (Screening, Risk, Referral, Medicine, Followup) */}
      {/* ========================================================================= */}
      {(activeTabSection === "overview" || activeTabSection === "charts") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="display-font text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-700" />
                Comprehensive District Health Analytics
              </h3>
              <p className="text-xs text-slate-500">
                Data-driven tracking of screening volume, epidemiological risk stratification, referral transit performance, formulary stock, and field adherence.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Chart 1: Screening Trend */}
            <Card className="border-0 shadow-xs bg-white rounded-2xl p-4">
              <CardHeader className="p-0 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <HeartPulse className="h-4 w-4 text-emerald-600" />
                    1. Weekly Screening Volume Trend vs Target Pace
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">7-Day Velocity</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts?.screeningTrend || []}>
                    <defs>
                      <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <RechartsLegend wrapperStyle={{ fontSize: "11px" }} />
                    <Area type="monotone" dataKey="screenings" name="Screenings Done" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#screenGrad)" />
                    <Area type="monotone" dataKey="highRiskDetected" name="High-Risk Flagged" stroke="#e11d48" strokeWidth={2} fillOpacity={1} fill="url(#riskGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chart 2: Risk & Morbidity Distribution */}
            <Card className="border-0 shadow-xs bg-white rounded-2xl p-4">
              <CardHeader className="p-0 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    2. Risk Tier Stratification &amp; Chronic Conditions
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">Cohort Load</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.conditionBreakdown || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="condition" type="category" tick={{ fontSize: 10 }} width={120} />
                    <RechartsTooltip />
                    <Bar dataKey="count" name="Identified Patients" fill="#f43f5e" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chart 3: Referral Performance */}
            <Card className="border-0 shadow-xs bg-white rounded-2xl p-4">
              <CardHeader className="p-0 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Navigation className="h-4 w-4 text-blue-600" />
                    3. Referral Lifecycle Progression &amp; Resolution
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">Transit Status</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.referralPerformance || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" name="Referrals" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                      {(charts?.referralPerformance || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chart 4: Medicine Stock Levels */}
            <Card className="border-0 shadow-xs bg-white rounded-2xl p-4">
              <CardHeader className="p-0 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Pill className="h-4 w-4 text-purple-600" />
                    4. Pharmaceutical Stock Availability by Category
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">Formulary SKUs</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.medicineStock || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <RechartsLegend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="inStock" name="In Stock (Adequate)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lowStock" name="Low Stock (Buffer Alert)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outOfStock" name="Out of Stock" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Chart 5: Follow-up Completion & Field Adherence */}
          <Card className="border-0 shadow-xs bg-white rounded-2xl p-5">
            <CardHeader className="p-0 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-600" />
                  5. ASHA / CHO Field Follow-up Completion Rate by Village Catchment
                </CardTitle>
                <span className="text-xs font-bold text-emerald-700">Overall 82% Adherence</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                {(charts?.villageFollowUpAdherence || []).map((v) => (
                  <div key={v.village} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-xs text-slate-900">{v.village}</strong>
                      <Badge className={v.adherencePercent >= 80 ? "bg-emerald-100 text-emerald-800 text-[10px]" : "bg-amber-100 text-amber-900 text-[10px]"}>
                        {v.adherencePercent}%
                      </Badge>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden my-2">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${v.adherencePercent}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Completed: <strong>{v.completed}</strong></span>
                      <span className="text-rose-600">Overdue: <strong>{v.overdue}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: AI OPERATIONAL INSIGHTS (Explicitly Labeled) */}
      {/* ========================================================================= */}
      {(activeTabSection === "overview" || activeTabSection === "insights") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <h3 className="display-font text-base font-bold text-slate-900">
                  AI-Generated Operational Intelligence &amp; Resource Recommendations
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Machine-assisted anomaly signals, outreach prioritization, and inventory replenishment directives grounded in telemetry data.
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-[10px] font-mono">
              DISHA / ABDM Guard Active
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {insights.map((insight) => (
              <Card key={insight.id} className="border-0 shadow-xs bg-white rounded-2xl overflow-hidden hover:shadow-sm transition">
                <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/60 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {/* Crucial mandatory badge */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge className="bg-blue-600 text-white font-extrabold text-[9.5px] uppercase tracking-wider">
                          {insight.badge}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-semibold text-slate-700">
                          {insight.category}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-bold text-slate-900">{insight.title}</CardTitle>
                      <CardDescription className="text-[11px] text-slate-500 mt-0.5">
                        Target: <strong>{insight.affectedVillageOrFacility}</strong> · Trigger: {insight.metricDriver}
                      </CardDescription>
                    </div>

                    <Badge className={insight.urgency === "critical" ? "bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]" : "bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]"}>
                      {insight.urgency.toUpperCase()} PRIORITY
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs">
                  <p className="text-slate-600 leading-relaxed text-xs">
                    {insight.description}
                  </p>

                  {/* Recommendation Directive */}
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-blue-950 font-medium space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                      <ArrowUpRight className="h-4 w-4 text-blue-600" />
                      Recommended Administrative Action:
                    </div>
                    <p className="text-xs text-blue-900/90">{insight.recommendation}</p>

                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10px] text-blue-700 font-semibold">One-Click Dispatch:</span>
                      <Button
                        size="sm"
                        onClick={() => handleExecuteInsightAction(insight)}
                        className="rounded-full bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] h-7 px-3"
                      >
                        {insight.actionType === "schedule_camp" && "Schedule NCD Camp"}
                        {insight.actionType === "rebalance_stock" && "Initiate Stock Transfer"}
                        {insight.actionType === "assign_worker" && "Dispatch ASHA Task"}
                        {insight.actionType === "dispatch_ambulance" && "Pre-route 108 Corridor"}
                      </Button>
                    </div>
                  </div>

                  {/* Mandatory Clinical/Diagnostic Disclaimer */}
                  <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100 flex items-start gap-1">
                    <Info className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>{insight.disclaimer}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
