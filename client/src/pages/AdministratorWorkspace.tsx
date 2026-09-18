import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import WorkspaceLayout, { NavItem } from "@/components/WorkspaceLayout";
import { VillageAccessibilityDashboard } from "@/components/VillageAccessibilityDashboard";
import { DistrictHealthIntelligenceMap } from "@/components/DistrictHealthIntelligenceMap";
import { DistrictCommandCenterView } from "@/components/DistrictCommandCenterView";
import { CampaignManagementView } from "@/components/CampaignManagementView";
import { NotificationCenter } from "@/components/NotificationCenter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend as RechartsLegend,
} from "recharts";
import { StaffApprovalsManagementView } from "@/components/StaffApprovalsManagementView";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileCheck,
  FileSpreadsheet,
  HeartPulse,
  Hospital,
  MapPin,
  Navigation,
  Package,
  PieChart,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
} from "lucide-react";

export default function AdministratorWorkspace() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("command_center");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVillageFilter, setSelectedVillageFilter] = useState("all");

  // Queries
  const utils = trpc.useUtils();
  const overview = trpc.dashboard.overview.useQuery(undefined, { enabled: isAuthenticated });
  const patients = trpc.patients.list.useQuery({ limit: 100 }, { enabled: isAuthenticated });
  const riskDist = trpc.analytics.riskDistribution.useQuery(undefined, { enabled: isAuthenticated });
  const referralAnalytics = trpc.analytics.referrals.useQuery(undefined, { enabled: isAuthenticated });
  const medicineAnalytics = trpc.analytics.medicines.useQuery(undefined, { enabled: isAuthenticated });
  const villageMap = trpc.analytics.villageMap.useQuery(undefined, { enabled: isAuthenticated });
  const aiInsights = trpc.analytics.aiInsights.useQuery(undefined, { enabled: isAuthenticated });
  const campaigns = trpc.campaigns.list.useQuery(undefined, { enabled: isAuthenticated });
  const followUps = trpc.followUps.list.useQuery(undefined, { enabled: isAuthenticated });
  const notifsQuery = trpc.notifications.list.useQuery(undefined, { enabled: isAuthenticated, staleTime: 10000 });
  const usersQuery = trpc.admin.listUsers.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15000 });
  const districtForecastQuery = trpc.demandForecasting.getDistrictForecasts.useQuery(
    { district: "Ahmedabad Rural" },
    { enabled: isAuthenticated, staleTime: 30000 }
  );
  const [selectedForecastFacilityId, setSelectedForecastFacilityId] = useState<number | "all">("all");

  const pendingApprovalsCount = (usersQuery.data?.users || []).filter((u) => u.status === "PENDING").length;

  const metrics = overview.data?.metrics ?? {
    patients: 6,
    highRisk: 3,
    referrals: 3,
    openFollowUps: 3,
    overdueFollowUps: 1,
    lowStock: 2,
    facilities: 5,
  };

  const allPatients = patients.data || [];
  const filteredPatients = allPatients.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.conditions && p.conditions.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesVillage = selectedVillageFilter === "all" || p.village?.toLowerCase() === selectedVillageFilter.toLowerCase();
    return matchesSearch && matchesVillage;
  });

  const navItems: NavItem[] = [
    { id: "command_center", label: "Command Center", icon: Activity },
    { id: "staff_approvals", label: "Staff Approvals & Users", icon: UserCheck, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined },
    { id: "notifications", label: "Notification Center", icon: Bell, badge: notifsQuery.data?.unreadCount || undefined },
    { id: "village_accessibility", label: "Village Accessibility Scores", icon: Activity },
    { id: "patients", label: "District Patients", icon: Users, badge: allPatients.length },
    { id: "risk_dist", label: "Risk Distribution", icon: PieChart },
    { id: "referral_analytics", label: "Referral Analytics", icon: Navigation },
    { id: "medicine_analytics", label: "Medicine Analytics", icon: Package, badge: metrics.lowStock > 0 ? metrics.lowStock : undefined },
    { id: "followup_analytics", label: "Follow-up Analytics", icon: Clock },
    { id: "village_map", label: "Village Health Map", icon: MapPin },
    { id: "campaigns", label: "Health Campaigns", icon: Calendar, badge: campaigns.data?.length },
    { id: "ai_insights", label: "AI Insights & Alerts", icon: Sparkles, badge: aiInsights.data?.length },
  ];

  return (
    <WorkspaceLayout
      role="administrator"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      navItems={navItems}
      title={
        activeTab === "command_center"
          ? "District Health Command Center"
          : activeTab === "staff_approvals"
          ? "Staff Registration Approvals & Role Governance"
          : activeTab === "notifications"
          ? "Multi-Channel Notification Center & History"
          : activeTab === "village_accessibility"
          ? "Village-Level Healthcare Accessibility Intelligence (0–100)"
          : activeTab === "patients"
          ? "District-Wide Patient Registry"
          : activeTab === "risk_dist"
          ? "Population Risk Stratification & Morbidity"
          : activeTab === "referral_analytics"
          ? "Referral Flow & Transit Bottleneck Analytics"
          : activeTab === "medicine_analytics"
          ? "Pharmaceutical Supply Chain Analytics"
          : activeTab === "followup_analytics"
          ? "Field Worker Adherence & Follow-up Velocity"
          : activeTab === "village_map"
          ? "Geospatial Village Risk Heatmap"
          : activeTab === "campaigns"
          ? "District Campaign Planning & Beneficiary Oversight"
          : "AI Epidemiological Anomaly Signals"
      }
      subtitle={user?.name ? `Government of Gujarat · Health & Family Welfare · ${user.name} (${user.district || "Ahmedabad Rural"} Administrator)` : "Government of Gujarat · Health & Family Welfare Department · Ahmedabad Rural District"}
      actions={
        activeTab === "command_center" ? (
          <Button onClick={() => toast.success("District Health Digest Report downloaded")} variant="outline" className="rounded-full bg-white text-xs font-semibold">
            <Download className="mr-2 h-4 w-4" /> Download District Digest
          </Button>
        ) : undefined
      }
    >
      {/* 1. COMMAND CENTER VIEW */}
      {activeTab === "command_center" && (
        <DistrictCommandCenterView initialDistrict="Ahmedabad Rural" />
      )}

      {/* STAFF APPROVALS & USER MANAGEMENT VIEW */}
      {activeTab === "staff_approvals" && (
        <StaffApprovalsManagementView />
      )}

      {/* 2. DISTRICT PATIENTS VIEW */}
      {activeTab === "patients" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by patient name or conditions across district..."
                className="pl-9 rounded-full bg-white text-xs border-slate-200"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {["all", "Sundarpur", "Rampura", "Sanand", "Bavla"].map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedVillageFilter(v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    selectedVillageFilter === v ? "bg-[#15181b] text-white" : "bg-white border border-slate-200 text-slate-700"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPatients.map((p) => (
              <Card key={p.id} className="border-0 shadow-xs bg-white">
                <CardContent className="p-4 text-xs space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{p.name}</h4>
                      <p className="text-slate-500">{p.age} yrs · {p.gender} · {p.village || "Sundarpur"}</p>
                    </div>
                    <Badge className={p.riskCategory === "critical" || p.riskCategory === "high" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}>
                      {p.riskCategory} · {p.riskScore}/100
                    </Badge>
                  </div>
                  <p className="text-slate-600"><strong>Conditions:</strong> {p.conditions || "None declared"}</p>
                  <p className="text-slate-500 text-[11px]">Emergency: {p.emergencyContact || "Registered"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 3. RISK DISTRIBUTION VIEW */}
      {activeTab === "risk_dist" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-xs bg-white">
              <CardHeader>
                <CardTitle className="display-font text-lg font-bold">Risk Stratification Breakdown</CardTitle>
                <CardDescription>Population health segmentation by clinical severity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between font-bold text-slate-800 mb-1">
                      <span>Critical Risk (Score 90-100)</span>
                      <span className="text-rose-700">1 Case (17%)</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-rose-600 rounded-full" style={{ width: "17%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-800 mb-1">
                      <span>High Risk (Score 70-89)</span>
                      <span className="text-orange-700">2 Cases (33%)</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: "33%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-800 mb-1">
                      <span>Moderate Risk (Score 40-69)</span>
                      <span className="text-amber-700">1 Case (17%)</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: "17%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-800 mb-1">
                      <span>Low Risk (Score 0-39)</span>
                      <span className="text-emerald-700">2 Cases (33%)</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "33%" }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-white">
              <CardHeader>
                <CardTitle className="display-font text-lg font-bold">Top Chronic Morbidities in District</CardTitle>
                <CardDescription>Disease burden prevalence across active screening cohorts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {(riskDist.data?.conditions || [
                  { name: "Hypertension", count: 4 },
                  { name: "Type 2 Diabetes", count: 2 },
                  { name: "Nutritional Anemia (Maternal)", count: 1 },
                  { name: "COPD / Chronic Bronchitis", count: 1 },
                  { name: "Osteoarthritis", count: 1 },
                ]).map((c) => (
                  <div key={c.name} className="flex items-center justify-between rounded-xl bg-[#f7f9fa] p-3">
                    <span className="font-bold text-slate-900">{c.name}</span>
                    <Badge variant="outline" className="bg-white">{c.count} beneficiaries</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 4. REFERRAL ANALYTICS VIEW */}
      {activeTab === "referral_analytics" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-0 shadow-xs bg-[#e4f1f8]">
              <CardContent className="p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Total Referrals Initiated</span>
                <p className="display-font mt-2 text-3xl font-extrabold text-blue-900">3 Cases</p>
                <p className="text-xs text-blue-600 mt-1">100% routed through digital stack</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-[#e8f3ed]">
              <CardContent className="p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Average Turnaround Time</span>
                <p className="display-font mt-2 text-3xl font-extrabold text-emerald-900">2.4 Days</p>
                <p className="text-xs text-emerald-600 mt-1">From field triage to specialist review</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-[#fff4da]">
              <CardContent className="p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Transport Bottlenecks</span>
                <p className="display-font mt-2 text-3xl font-extrabold text-amber-900">2 Corridors</p>
                <p className="text-xs text-amber-700 mt-1">Rampura Sub-Centre → Sanand CHC</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-xs bg-white">
            <CardHeader>
              <CardTitle className="display-font text-lg font-bold">Transit Corridors & Handover Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="rounded-2xl border border-slate-100 bg-[#f9fafb] p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Rampura Health Sub-Centre → Sanand Community Health Centre</h4>
                  <p className="text-slate-500 mt-0.5">Average delay: 36 hrs · Reason: 108 ambulance availability on rural sector 4</p>
                </div>
                <Badge className="bg-amber-100 text-amber-800">Moderate Delay</Badge>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-[#f9fafb] p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Sundarpur PHC → Bavla Sub-District Hospital</h4>
                  <p className="text-slate-500 mt-0.5">Average delay: 18 hrs · Reason: Specialist consultation scheduling backlog</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800">Healthy Flow</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. MEDICINE ANALYTICS & AI DEMAND FORECASTING VIEW */}
      {activeTab === "medicine_analytics" && (
        <div className="space-y-6">
          {/* A. PROTOTYPE FORECASTING DISCLAIMER BANNER */}
          <div className="rounded-2xl border-2 border-amber-300 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 p-4 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-xs">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-amber-950 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                    Prototype Forecasting System
                  </span>
                  <span className="text-[11px] font-semibold text-amber-900">
                    District Supply Chain Surveillance · Experimental Baseline + ML Models
                  </span>
                </div>
                <p className="text-xs text-amber-950 font-medium leading-relaxed">
                  <strong>District Planning Notice:</strong> Aggregated multi-facility projections are synthesized using historical moving averages, exponential smoothing, and Ordinary Least Squares linear trend velocity models. <strong>These estimates are experimental prototypes and do NOT claim production accuracy.</strong> Field verification is mandatory prior to generating bulk procurement indents or central warehouse challans.
                </p>
              </div>
            </div>
          </div>

          {/* B. DISTRICT KPI GRID */}
          {(() => {
            const df = districtForecastQuery.data;
            const criticalCount = df?.criticalStockOutCount ?? 2;
            const highCount = df?.highStockOutCount ?? 1;
            const totalDemand30d = df?.totalPredicted30DayDemandUnits ?? 2840;
            const urgentReorders = df?.urgentReorderSKUs ?? 3;

            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-xs bg-[#e4f1f8]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-blue-700">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Total Formulary SKUs</span>
                      <Package className="h-4 w-4" />
                    </div>
                    <p className="display-font mt-3 text-3xl font-extrabold text-blue-900">
                      {df?.totalSKUs ?? 33} <span className="text-sm font-semibold text-blue-700">Drugs</span>
                    </p>
                    <p className="text-xs text-blue-700 mt-1">Across 4 District Health Centres</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xs bg-[#f8e7e8]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-rose-700">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Imminent Stock-Out Risk</span>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <p className="display-font mt-3 text-3xl font-extrabold text-rose-900">
                      {criticalCount} <span className="text-sm font-semibold text-rose-700">Critical (&le;7d)</span>
                    </p>
                    <p className="text-xs text-rose-700 mt-1">+{highCount} high risk (8-15d runway)</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xs bg-[#e8f3ed]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-emerald-700">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Projected 30-Day Demand</span>
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <p className="display-font mt-3 text-3xl font-extrabold text-emerald-900">
                      {totalDemand30d.toLocaleString()} <span className="text-sm font-semibold text-emerald-700">Units</span>
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">Based on rolling consumption rates</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xs bg-[#fff4da]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-amber-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Replenishment Indents</span>
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                    <p className="display-font mt-3 text-3xl font-extrabold text-amber-900">
                      {urgentReorders} <span className="text-sm font-semibold text-amber-800">Orders Needed</span>
                    </p>
                    <p className="text-xs text-amber-700 mt-1">Central Medical Store quota action</p>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* C. FACILITY 30-DAY DEMAND CHART & REORDER ACTIONS */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* C1. Facility Demand Comparison Bar Chart */}
            <Card className="border-0 shadow-xs bg-white lg:col-span-2">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b">
                <div>
                  <CardTitle className="display-font text-base font-bold text-slate-900">
                    Projected 30-Day Pharmaceutical Demand by Facility Tier
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Synthesized consumption velocity comparing Sub-Centre, PHC, CHC, and Sub-District Hospital
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    districtForecastQuery.refetch();
                    toast.success("District forecast models recomputed");
                  }}
                  className="rounded-full text-xs h-8 gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-purple-600" /> Recalculate
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(districtForecastQuery.data?.facilitySummaries || []).map((f) => ({
                        name: f.facilityName.replace("Primary Health Centre (PHC)", "PHC").replace("Health Sub-Centre", "Sub-Centre").replace("Community Health Centre", "CHC").replace("Sub-District Hospital", "Hospital"),
                        demand: f.predicted30DayDemand,
                        critical: f.criticalCount,
                      }))}
                      margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(value: any, name: any) => [
                          name === "demand" ? `${value} units (30d)` : `${value} critical SKUs`,
                          name === "demand" ? "Projected Demand" : "Critical Stockouts",
                        ]}
                      />
                      <Bar dataKey="demand" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="demand" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* C2. Central Reorder Indent Dispatch Widget */}
            <Card className="border-0 shadow-xs bg-white">
              <CardHeader className="border-b pb-3">
                <CardTitle className="display-font text-base font-bold text-slate-900">
                  Central Medical Store Action
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated buffer replenishment dispatch
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-950">Amlodipine 5mg</span>
                    <Badge className="bg-rose-700 text-white text-[10px]">CRITICAL</Badge>
                  </div>
                  <p className="text-rose-800">Sundarpur PHC · Stock: 18 (Threshold 50)</p>
                  <p className="text-slate-500 text-[11px]">Recommended requisition: <strong>450 strips</strong></p>
                </div>

                <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-950">Azithromycin 250mg</span>
                    <Badge className="bg-rose-700 text-white text-[10px]">OUT OF STOCK</Badge>
                  </div>
                  <p className="text-rose-800">Sundarpur PHC · Stock: 0 (Threshold 25)</p>
                  <p className="text-slate-500 text-[11px]">Recommended requisition: <strong>225 strips</strong></p>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950">IFA Tablets</span>
                    <Badge className="bg-amber-600 text-white text-[10px]">HIGH RISK</Badge>
                  </div>
                  <p className="text-amber-800">Sundarpur PHC · Stock: 14 (Threshold 50)</p>
                  <p className="text-slate-500 text-[11px]">Recommended requisition: <strong>320 bottles</strong></p>
                </div>

                <Button
                  onClick={() => toast.success("District Emergency Indent batch transmitted to Central Medical Warehouse")}
                  className="w-full rounded-full bg-[#15181b] hover:bg-slate-800 text-white font-bold text-xs h-8 mt-2"
                >
                  <Truck className="mr-1.5 h-3.5 w-3.5" /> Dispatch District Indent Batch
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* D. TOP STOCK-OUT RISK MEDICINES MATRIX TABLE */}
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b">
              <div>
                <CardTitle className="display-font text-base font-bold text-slate-900">
                  Top Imminent Stock-Out Risk Medications Across District
                </CardTitle>
                <CardDescription className="text-xs">
                  Prioritized by projected days until physical stock exhaustion
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success("District Stockout Risk Matrix exported as CSV")}
                className="rounded-full text-xs h-8 gap-1.5"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Export Matrix CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f7f9fa] text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="p-3.5 pl-5">Medicine &amp; Category</th>
                      <th className="p-3.5">Facility</th>
                      <th className="p-3.5">Current Stock</th>
                      <th className="p-3.5">Daily Avg (ADC)</th>
                      <th className="p-3.5">30-Day Demand</th>
                      <th className="p-3.5">Projected Out Date</th>
                      <th className="p-3.5">Stock-Out Risk</th>
                      <th className="p-3.5">Reorder Rec.</th>
                      <th className="p-3.5 pr-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(districtForecastQuery.data?.topRiskMedicines || []).map((med) => {
                      const isCrit = med.stockOutRisk === "CRITICAL";
                      const isHg = med.stockOutRisk === "HIGH";

                      return (
                        <tr key={`${med.facilityId}-${med.medicineId}`} className="hover:bg-slate-50/70 transition">
                          <td className="p-3.5 pl-5">
                            <div className="font-bold text-slate-900">{med.medicineName}</div>
                            <div className="text-[11px] text-slate-500">{med.category}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800">{med.facilityName}</div>
                            <div className="text-[10px] uppercase font-mono text-slate-400">{med.facilityType}</div>
                          </td>
                          <td className="p-3.5 font-bold font-mono">
                            <span className={med.currentStock === 0 ? "text-rose-700" : med.currentStock <= med.reorderLevel ? "text-amber-700" : "text-slate-900"}>
                              {med.currentStock} {med.unit}
                            </span>
                            <div className="text-[10px] font-normal text-slate-400">Min: {med.reorderLevel}</div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-700">
                            {med.averageDailyConsumption} /day
                          </td>
                          <td className="p-3.5 font-mono font-bold text-purple-900">
                            {med.predicted30DayDemand} {med.unit}
                          </td>
                          <td className="p-3.5">
                            <div className={`font-semibold ${isCrit ? "text-rose-700 font-bold" : "text-slate-700"}`}>
                              {med.predictedStockOutDate ? new Date(med.predictedStockOutDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "30+ days safe"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              ~{med.daysUntilStockOut ?? "30+"}d remaining
                            </div>
                          </td>
                          <td className="p-3.5">
                            <Badge
                              className={`text-[10px] uppercase font-bold ${
                                isCrit
                                  ? "bg-rose-600 text-white"
                                  : isHg
                                  ? "bg-orange-500 text-white"
                                  : med.stockOutRisk === "MODERATE"
                                  ? "bg-amber-500 text-white"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              {med.stockOutRisk}
                            </Badge>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-amber-900">
                              +{med.reorderRecommendation.suggestedReorderQuantity} {med.unit}
                            </div>
                            <div className="text-[10px] uppercase text-slate-400 font-semibold">
                              {med.reorderRecommendation.urgency}
                            </div>
                          </td>
                          <td className="p-3.5 pr-5 text-right">
                            <Button
                              size="sm"
                              onClick={() => toast.success(`Replenishment requisition for ${med.medicineName} (${med.facilityName}) logged`)}
                              className="rounded-full bg-[#15181b] hover:bg-slate-800 text-white text-[11px] h-7 px-3"
                            >
                              Reorder
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. FOLLOW-UP ANALYTICS VIEW */}
      {activeTab === "followup_analytics" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader>
              <CardTitle className="display-font text-lg font-bold">ASHA & CHO Field Worker Adherence Rate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#f7f9fa] p-4">
                  <span className="text-slate-500 font-bold">Completed Home Visits</span>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">78.5%</p>
                </div>
                <div className="rounded-2xl bg-[#f7f9fa] p-4">
                  <span className="text-slate-500 font-bold">Overdue Escalations</span>
                  <p className="text-2xl font-extrabold text-rose-700 mt-1">1 Task</p>
                </div>
                <div className="rounded-2xl bg-[#f7f9fa] p-4">
                  <span className="text-slate-500 font-bold">Active Field Workers</span>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">12 ASHAs / 3 CHOs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 7. VILLAGE HEALTH MAP & GIS INTELLIGENCE VIEW */}
      {activeTab === "village_map" && (
        <div className="space-y-4">
          <DistrictHealthIntelligenceMap initialDistrict="Ahmedabad Rural" />
        </div>
      )}

      {/* 8. HEALTH CAMPAIGNS VIEW */}
      {activeTab === "campaigns" && (
        <CampaignManagementView initialDistrict="Ahmedabad Rural" />
      )}

      {/* 9. AI INSIGHTS VIEW */}
      {activeTab === "ai_insights" && (
        <div className="space-y-4">
          {(aiInsights.data || []).map((item) => (
            <Card key={item.id} className="border-0 shadow-xs bg-white">
              <CardContent className="p-5 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-sm text-slate-900">{item.title}</span>
                  </div>
                  <Badge className={item.severity === "critical" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}>
                    {item.category} · {item.severity.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-slate-600 leading-relaxed">{item.description}</p>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 text-blue-950 font-semibold">
                  Directive Action: {item.recommendation}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 10. VILLAGE ACCESSIBILITY VIEW */}
      {activeTab === "village_accessibility" && (
        <div className="space-y-4">
          <VillageAccessibilityDashboard initialDistrict="Ahmedabad Rural" />
        </div>
      )}

      {/* 11. NOTIFICATION CENTER VIEW */}
      {activeTab === "notifications" && (
        <NotificationCenter role="administrator" />
      )}
    </WorkspaceLayout>
  );
}
