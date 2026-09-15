import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  Sliders,
  RotateCcw,
  Search,
  Building2,
  Stethoscope,
  Pill,
  Ambulance,
  Users,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  MapPin,
  TrendingDown,
  Sparkles,
  ArrowUpDown,
  FileText,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

export interface AccessibilityWeightsState {
  facilityDistanceWeight: number;
  doctorAvailabilityWeight: number;
  medicineAvailabilityWeight: number;
  transportAvailabilityWeight: number;
  screeningCoverageWeight: number;
  referralCompletionWeight: number;
  waitingTimeWeight: number;
}

const DEFAULT_WEIGHTS: AccessibilityWeightsState = {
  facilityDistanceWeight: 20,
  doctorAvailabilityWeight: 15,
  medicineAvailabilityWeight: 15,
  transportAvailabilityWeight: 15,
  screeningCoverageWeight: 15,
  referralCompletionWeight: 10,
  waitingTimeWeight: 10,
};

const FACTOR_ICONS: Record<string, React.ReactNode> = {
  facilityDistanceWeight: <Building2 className="w-4 h-4 text-blue-500" />,
  doctorAvailabilityWeight: <Stethoscope className="w-4 h-4 text-emerald-500" />,
  medicineAvailabilityWeight: <Pill className="w-4 h-4 text-purple-500" />,
  transportAvailabilityWeight: <Ambulance className="w-4 h-4 text-amber-500" />,
  screeningCoverageWeight: <Users className="w-4 h-4 text-cyan-500" />,
  referralCompletionWeight: <CheckCircle2 className="w-4 h-4 text-indigo-500" />,
  waitingTimeWeight: <Clock className="w-4 h-4 text-rose-500" />,
};

export function VillageAccessibilityDashboard({
  initialDistrict,
  onSelectVillageForReferral,
}: {
  initialDistrict?: string;
  onSelectVillageForReferral?: (villageName: string) => void;
}) {
  const [weights, setWeights] = useState<AccessibilityWeightsState>(DEFAULT_WEIGHTS);
  const [showWeightConfig, setShowWeightConfig] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>("all");
  const [expandedVillageId, setExpandedVillageId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score_asc" | "score_desc" | "population_desc">("score_asc");

  // Query tRPC accessibility endpoint with reactive weights
  const scoresQuery = trpc.accessibility.getVillageScores.useQuery(
    {
      district: initialDistrict,
      weights,
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  const configQuery = trpc.accessibility.getConfiguration.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 300000,
  });

  const isCustomWeightsApplied = useMemo(() => {
    return (
      weights.facilityDistanceWeight !== DEFAULT_WEIGHTS.facilityDistanceWeight ||
      weights.doctorAvailabilityWeight !== DEFAULT_WEIGHTS.doctorAvailabilityWeight ||
      weights.medicineAvailabilityWeight !== DEFAULT_WEIGHTS.medicineAvailabilityWeight ||
      weights.transportAvailabilityWeight !== DEFAULT_WEIGHTS.transportAvailabilityWeight ||
      weights.screeningCoverageWeight !== DEFAULT_WEIGHTS.screeningCoverageWeight ||
      weights.referralCompletionWeight !== DEFAULT_WEIGHTS.referralCompletionWeight ||
      weights.waitingTimeWeight !== DEFAULT_WEIGHTS.waitingTimeWeight
    );
  }, [weights]);

  const handleResetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
    toast.success("Reset formula weights to default standard distribution.");
  };

  // Filter and sort villages
  const filteredVillages = useMemo(() => {
    if (!scoresQuery.data?.villages) return [];

    return scoresQuery.data.villages
      .filter((v) => {
        const matchesSearch =
          searchQuery.trim() === "" ||
          v.villageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.block.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRisk =
          selectedRiskFilter === "all" || v.riskCategoryShort === selectedRiskFilter;

        return matchesSearch && matchesRisk;
      })
      .sort((a, b) => {
        if (sortBy === "score_asc") return a.overallScore - b.overallScore;
        if (sortBy === "score_desc") return b.overallScore - a.overallScore;
        if (sortBy === "population_desc") return b.population - a.population;
        return 0;
      });
  }, [scoresQuery.data?.villages, searchQuery, selectedRiskFilter, sortBy]);

  const summary = scoresQuery.data?.summary;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-300";
    if (score >= 65) return "text-blue-600 bg-blue-50 border-blue-300";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-300";
    return "text-rose-600 bg-rose-50 border-rose-300";
  };

  const getScoreBadgeBg = (shortRisk: string) => {
    switch (shortRisk) {
      case "low":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "moderate":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "high":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "critical":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Prototype Analytical Metric Disclaimer Banner */}
      <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm text-amber-900 leading-relaxed">
            <div className="font-bold uppercase tracking-wider text-amber-950 flex items-center gap-2">
              <span>Prototype Analytical Metric Notice</span>
              <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-400 font-mono">
                NON-GOVERNMENTAL
              </Badge>
            </div>
            <p className="mt-1">
              The <strong>Village-Level Healthcare Accessibility Score (0–100)</strong> is an analytical planning tool
              designed for rural outreach optimization, gap diagnosis, and resource allocation.
              <strong> It is NOT an official government score or index.</strong> All calculations utilize a transparent,
              multi-factor formula that can be tuned to district requirements.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            className="border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0 gap-1.5 text-xs"
          >
            <Info className="w-3.5 h-3.5" />
            {showFormulaInfo ? "Hide Formula" : "Formula Details"}
          </Button>
        </div>

        {/* Expandable Formula Explanation */}
        {showFormulaInfo && configQuery.data && (
          <div className="mt-4 pt-4 border-t border-amber-200 text-xs text-amber-950 space-y-3 bg-white/60 p-3.5 rounded-lg">
            <div className="font-semibold text-amber-950 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-700" />
              Formula Specification: {configQuery.data.formula.name}
            </div>
            <div className="font-mono bg-amber-100/80 p-2.5 rounded border border-amber-300 text-slate-800">
              {configQuery.data.formula.equation}
            </div>
            <p className="text-muted-foreground">
              Composite score is calculated by evaluating 7 normalized factor sub-scores (0–100) multiplied by their assigned weights.
              Any factor scoring &lt; 60 is flagged as a <strong>Main Limiting Factor</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2">
              {configQuery.data.formula.factors.map((f) => (
                <div key={f.id} className="p-2 bg-white rounded border border-amber-200 shadow-2xs">
                  <div className="font-medium text-slate-800 text-[11px]">{f.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Default Weight: {f.defaultWeight}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Catchment Villages</span>
              <MapPin className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold mt-1 text-slate-900">
              {summary?.totalVillages || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Ahmedabad Rural Catchments
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">District Avg Accessibility</span>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold mt-1 text-indigo-700">
              {summary?.averageScore || 0} <span className="text-xs font-normal text-muted-foreground">/ 100</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Across all evaluated catchments
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">High / Critical Vulnerability</span>
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold mt-1 text-rose-600">
              {(summary?.categoryCounts.suboptimal || 0) + (summary?.categoryCounts.critical || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Villages requiring outreach priority
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Optimal & Moderate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">
              {(summary?.categoryCounts.optimal || 0) + (summary?.categoryCounts.moderate || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Villages with adequate access
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Interactive Weight Configurator / Formula Simulator */}
      <Card className="border shadow-xs bg-slate-50/70">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Transparent Formula Weight Configurator
                {isCustomWeightsApplied && (
                  <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-300 font-mono">
                    CUSTOM WEIGHTS ACTIVE
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Simulate different healthcare planning priorities by tuning factor weights. Scores update dynamically.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isCustomWeightsApplied && (
                <Button size="sm" variant="ghost" onClick={handleResetWeights} className="text-xs text-slate-600 h-8 gap-1">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Defaults
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowWeightConfig(!showWeightConfig)}
                className="text-xs h-8 gap-1.5"
              >
                {showWeightConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showWeightConfig ? "Collapse Sliders" : "Tune Factor Weights"}
              </Button>
            </div>
          </div>
        </CardHeader>

        {showWeightConfig && (
          <CardContent className="p-4 pt-2 border-t bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-3">
              {/* Distance */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    Facility Distance & Transit
                  </span>
                  <span className="font-mono text-blue-600">{weights.facilityDistanceWeight}%</span>
                </div>
                <Slider
                  value={[weights.facilityDistanceWeight]}
                  min={0}
                  max={50}
                  step={5}
                  onValueChange={(val) => setWeights((prev) => ({ ...prev, facilityDistanceWeight: val[0] }))}
                />
              </div>

              {/* Doctor Availability */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-500" />
                    Doctor Availability
                  </span>
                  <span className="font-mono text-emerald-600">{weights.doctorAvailabilityWeight}%</span>
                </div>
                <Slider
                  value={[weights.doctorAvailabilityWeight]}
                  min={0}
                  max={50}
                  step={5}
                  onValueChange={(val) => setWeights((prev) => ({ ...prev, doctorAvailabilityWeight: val[0] }))}
                />
              </div>

              {/* Medicine Availability */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-purple-500" />
                    Essential Medicine Stock
                  </span>
                  <span className="font-mono text-purple-600">{weights.medicineAvailabilityWeight}%</span>
                </div>
                <Slider
                  value={[weights.medicineAvailabilityWeight]}
                  min={0}
                  max={50}
                  step={5}
                  onValueChange={(val) => setWeights((prev) => ({ ...prev, medicineAvailabilityWeight: val[0] }))}
                />
              </div>

              {/* Transport Availability */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Ambulance className="w-3.5 h-3.5 text-amber-500" />
                    Transport & Ambulance
                  </span>
                  <span className="font-mono text-amber-600">{weights.transportAvailabilityWeight}%</span>
                </div>
                <Slider
                  value={[weights.transportAvailabilityWeight]}
                  min={0}
                  max={50}
                  step={5}
                  onValueChange={(val) => setWeights((prev) => ({ ...prev, transportAvailabilityWeight: val[0] }))}
                />
              </div>

              {/* Screening Coverage */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-500" />
                    Screening Coverage
                  </span>
                  <span className="font-mono text-cyan-600">{weights.screeningCoverageWeight}%</span>
                </div>
                <Slider
                  value={[weights.screeningCoverageWeight]}
                  min={0}
                  max={50}
                  step={5}
                  onValueChange={(val) => setWeights((prev) => ({ ...prev, screeningCoverageWeight: val[0] }))}
                />
              </div>

              {/* Referral Completion */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                    Referral Completion
                  </span>
                  <span className="font-mono text-indigo-600">{weights.referralCompletionWeight}%</span>
                </div>
                <Slider
                  value={[weights.referralCompletionWeight]}
                  min={0}
                  max={50}
                  step={5}
                  onValueChange={(val) => setWeights((prev) => ({ ...prev, referralCompletionWeight: val[0] }))}
                />
              </div>

              {/* Waiting Time */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    Facility Waiting Time
                  </span>
                  <span className="font-mono text-rose-600">{weights.waitingTimeWeight}%</span>
                </div>
                <Slider
                  value={[weights.waitingTimeWeight]}
                  min={0}
                  max={50}
                  step={5}
                  onValueChange={(val) => setWeights((prev) => ({ ...prev, waitingTimeWeight: val[0] }))}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 4. Filter & Search Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by village or block name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Risk Category Quick Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant={selectedRiskFilter === "all" ? "default" : "outline"}
            onClick={() => setSelectedRiskFilter("all")}
            className="h-8 text-xs rounded-full"
          >
            All Villages ({scoresQuery.data?.villages.length || 0})
          </Button>
          <Button
            size="sm"
            variant={selectedRiskFilter === "critical" ? "default" : "outline"}
            onClick={() => setSelectedRiskFilter("critical")}
            className="h-8 text-xs rounded-full text-rose-700 border-rose-300 hover:bg-rose-50"
          >
            Critical Deficiency (&lt;50)
          </Button>
          <Button
            size="sm"
            variant={selectedRiskFilter === "high" ? "default" : "outline"}
            onClick={() => setSelectedRiskFilter("high")}
            className="h-8 text-xs rounded-full text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            Sub-optimal (50–64)
          </Button>
          <Button
            size="sm"
            variant={selectedRiskFilter === "moderate" ? "default" : "outline"}
            onClick={() => setSelectedRiskFilter("moderate")}
            className="h-8 text-xs rounded-full text-blue-700 border-blue-300 hover:bg-blue-50"
          >
            Moderate (65–79)
          </Button>
          <Button
            size="sm"
            variant={selectedRiskFilter === "low" ? "default" : "outline"}
            onClick={() => setSelectedRiskFilter("low")}
            className="h-8 text-xs rounded-full text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          >
            Optimal (80+)
          </Button>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-8 rounded border border-input bg-background px-2 text-xs"
          >
            <option value="score_asc">Sort: Lowest Score First (Most Vulnerable)</option>
            <option value="score_desc">Sort: Highest Score First</option>
            <option value="population_desc">Sort: Largest Population</option>
          </select>
        </div>
      </div>

      {/* 5. Village Scorecards Grid */}
      {scoresQuery.isLoading ? (
        <div className="p-12 text-center text-muted-foreground">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
          <p className="text-sm font-medium">Computing multi-factor accessibility scores...</p>
        </div>
      ) : filteredVillages.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed rounded-xl bg-slate-50 text-muted-foreground">
          <Info className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-medium">No villages match the selected filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVillages.map((v) => {
            const isExpanded = expandedVillageId === v.villageId;

            return (
              <Card
                key={v.villageId}
                className={`border transition-all duration-200 ${
                  isExpanded ? "ring-2 ring-indigo-500/20 shadow-md" : "hover:shadow-sm"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    {/* Village Name & Header Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                          🏡 {v.villageName}
                        </span>
                        <Badge variant="outline" className={`text-xs font-semibold ${getScoreBadgeBg(v.riskCategoryShort)}`}>
                          {v.riskCategory}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span><strong>Block:</strong> {v.block}, {v.district}</span>
                        <span>•</span>
                        <span><strong>Population:</strong> {v.population.toLocaleString()}</span>
                        <span>•</span>
                        <span><strong>Screened:</strong> {v.screeningStats.coveragePercent}%</span>
                      </div>
                    </div>

                    {/* Overall Score Badge Callout */}
                    <div className="flex items-center gap-4">
                      <div className={`px-4 py-2 rounded-xl border-2 text-center min-w-[110px] ${getScoreColor(v.overallScore)}`}>
                        <div className="text-xs font-medium uppercase tracking-wider">Accessibility</div>
                        <div className="text-2xl font-black">{v.overallScore}<span className="text-xs font-semibold">/100</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Main Limiting Factors Callout */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-start flex-wrap gap-3">
                    <div className="text-xs font-semibold text-slate-700 shrink-0 mt-0.5">
                      Main Limiting Factors:
                    </div>
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      {v.mainLimitingFactors.map((lim, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200"
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          {lim}
                        </span>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedVillageId(isExpanded ? null : v.villageId)}
                      className="text-xs h-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 gap-1 ml-auto"
                    >
                      {isExpanded ? "Hide Details" : "View Factor Breakdown"}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                  </div>

                  {/* Quick Metadata Stats */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 bg-slate-50/60 p-2.5 rounded-lg border border-slate-200/60">
                    <div>
                      <span className="text-muted-foreground">Nearest Center:</span>{" "}
                      <strong>{v.nearestFacility.name.split(" ")[0]} ({v.nearestFacility.distanceKm.toFixed(1)} km)</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ambulance ETA:</span>{" "}
                      <strong>~{v.transportStats.estimatedAmbulanceEtaMins} mins ({v.transportStats.roadConnectivity})</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Screening Gap:</span>{" "}
                      <strong>{v.population - v.screeningStats.screenedCount} unscreened</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Referral Consulted:</span>{" "}
                      <strong>{v.referralStats.completionRatePercent}% completed</strong>
                    </div>
                  </div>

                  {/* Expanded 7-Factor Deep Dive */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span>Detailed Factor Sub-Scores (Normalized 0–100 Scale)</span>
                        <span className="text-[11px] font-normal text-muted-foreground font-mono">
                          Formula: {v.telemetry.formulaVersion}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {v.factors.map((factor) => {
                          const icon = FACTOR_ICONS[factor.id] || <Activity className="w-4 h-4 text-slate-500" />;
                          return (
                            <div
                              key={factor.id}
                              className={`p-3 rounded-lg border ${
                                factor.isLimitingFactor
                                  ? "bg-rose-50/40 border-rose-200"
                                  : "bg-white border-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-medium text-xs text-slate-900">
                                  {icon}
                                  {factor.name}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-800">
                                    {factor.rawScore} <span className="text-[10px] font-normal text-muted-foreground">/ 100</span>
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1.5 py-0 ${
                                      factor.status === "optimal"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                        : factor.status === "acceptable"
                                        ? "bg-blue-50 text-blue-700 border-blue-300"
                                        : factor.status === "limiting"
                                        ? "bg-amber-50 text-amber-700 border-amber-300"
                                        : "bg-rose-50 text-rose-700 border-rose-300"
                                    }`}
                                  >
                                    {factor.status.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    factor.rawScore >= 80
                                      ? "bg-emerald-500"
                                      : factor.rawScore >= 60
                                      ? "bg-blue-500"
                                      : factor.rawScore >= 40
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${factor.rawScore}%` }}
                                ></div>
                              </div>

                              <div className="text-[11px] text-slate-600 mt-2 flex justify-between">
                                <span>{factor.metricSummary}</span>
                                <span className="text-muted-foreground font-mono">
                                  +{factor.weightedContribution} pts (w: {factor.weightPercent}%)
                                </span>
                              </div>

                              <div className="text-[10px] text-slate-500 mt-1 italic">
                                💡 <strong>Action:</strong> {factor.actionRecommendation}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Action trigger button */}
                      {onSelectVillageForReferral && (
                        <div className="flex justify-end pt-2">
                          <Button
                            size="sm"
                            onClick={() => onSelectVillageForReferral(v.villageName)}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Plan Outreach & Referral Campaign for {v.villageName}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
