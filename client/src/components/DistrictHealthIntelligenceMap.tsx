import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Hospital,
  Building2,
  Stethoscope,
  HeartPulse,
  Pill,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Locate,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  ExternalLink,
  Compass,
  Users,
  X,
  TrendingDown,
  TrendingUp,
  Activity,
  Calendar,
  AlertCircle,
  Eye,
  RefreshCw,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export type MapActiveLayer = "accessibility" | "risk" | "screening" | "referral" | "medicine";

interface FilterState {
  diseaseCategory: string;
  riskCategory: string;
  dateRange: string;
  villageId: string;
  facilityId: number;
}

const DEFAULT_FILTERS: FilterState = {
  diseaseCategory: "all",
  riskCategory: "all",
  dateRange: "all",
  villageId: "all",
  facilityId: 0,
};

// SVG Icon factory for Leaflet markers
function createLeafletVillageIcon(
  color: string,
  badgeText: string,
  iconChar: string,
  pulseColor?: string,
  size = 40
) {
  const pulseHtml = pulseColor
    ? `<div style="
        position: absolute;
        top: -6px;
        left: -6px;
        width: ${size + 12}px;
        height: ${size + 12}px;
        border-radius: 50%;
        background: ${pulseColor};
        opacity: 0.35;
        animation: pulse-ring 2s infinite ease-out;
      "></div>`
    : "";

  return L.divIcon({
    className: "custom-intelligence-marker",
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${pulseHtml}
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          border: 2.5px solid #ffffff;
          position: relative;
          z-index: 10;
        ">
          <span style="color: #ffffff; font-size: ${size > 36 ? 16 : 14}px; font-weight: bold;">${iconChar}</span>
        </div>
        <div style="
          position: absolute;
          bottom: -16px;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(4px);
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          white-space: nowrap;
          z-index: 12;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        ">
          ${badgeText}
        </div>
      </div>
    `,
    iconSize: [size, size + 16],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function createFacilityPinIcon(type: string, name: string) {
  let color = "#3b82f6"; // PHC / blue
  let icon = "🏥";
  if (type === "district_hospital" || type === "specialist") {
    color = "#8b5cf6"; // Hospital / purple
    icon = "🏛️";
  } else if (type === "chc") {
    color = "#0ea5e9"; // CHC / cyan
    icon = "🏨";
  } else if (type === "sub_centre" || type === "aam") {
    color = "#10b981"; // Subcentre / emerald
    icon = "🩺";
  }

  return L.divIcon({
    className: "custom-facility-pin",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          width: 34px;
          height: 34px;
          background: ${color};
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          border: 2px solid #ffffff;
        ">
          <span style="font-size: 16px;">${icon}</span>
        </div>
        <div style="
          margin-top: 2px;
          background: #ffffff;
          color: #1e293b;
          font-size: 9.5px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          white-space: nowrap;
        ">
          ${name.length > 16 ? name.slice(0, 15) + "…" : name}
        </div>
      </div>
    `,
    iconSize: [34, 48],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
}

export function DistrictHealthIntelligenceMap({
  initialDistrict = "Ahmedabad Rural",
  onSelectVillage,
}: {
  initialDistrict?: string;
  onSelectVillage?: (villageName: string) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const facilitiesLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapActiveLayer>("accessibility");
  const [showFacilities, setShowFacilities] = useState<boolean>(true);
  const [showReferralLines, setShowReferralLines] = useState<boolean>(true);
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>("sundarpur");

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Fetch filter options
  const filterOptionsQuery = trpc.districtMap.getFilterOptions.useQuery(
    { district: initialDistrict },
    { staleTime: 300000 }
  );

  // Fetch district health intelligence map data
  const mapDataQuery = trpc.districtMap.getMapData.useQuery(
    {
      district: initialDistrict,
      diseaseCategory: filters.diseaseCategory,
      riskCategory: filters.riskCategory,
      dateRange: filters.dateRange,
      villageId: filters.villageId,
      facilityId: filters.facilityId > 0 ? filters.facilityId : undefined,
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  const mapData = mapDataQuery.data;
  const summary = mapData?.summary;
  const villages = mapData?.villages || [];
  const facilities = mapData?.facilities || [];

  // Selected village node for deep-dive drawer
  const selectedVillage = useMemo(() => {
    if (!selectedVillageId) return villages[0] || null;
    return villages.find((v) => v.id.toLowerCase() === selectedVillageId.toLowerCase() || v.villageName.toLowerCase() === selectedVillageId.toLowerCase()) || villages[0] || null;
  }, [villages, selectedVillageId]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered at Ahmedabad Rural / Sanand coordinates
    const map = L.map(mapContainerRef.current, {
      center: [22.99, 72.36],
      zoom: 11,
      zoomControl: true,
      attributionControl: false,
    });

    // Clean OpenStreetMap Tile Layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    // Layer groups for markers, routes, facilities
    const markersGroup = L.layerGroup().addTo(map);
    const routesGroup = L.layerGroup().addTo(map);
    const facilitiesGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    routesLayerRef.current = routesGroup;
    facilitiesLayerRef.current = facilitiesGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Markers and GIS Layers when data or activeLayer changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routesLayer = routesLayerRef.current;
    const facilitiesLayer = facilitiesLayerRef.current;

    if (!map || !markersLayer || !routesLayer || !facilitiesLayer) return;

    markersLayer.clearLayers();
    routesLayer.clearLayers();
    facilitiesLayer.clearLayers();

    // 1. Render Facility Pins
    if (showFacilities && facilities.length > 0) {
      facilities.forEach((fac) => {
        const icon = createFacilityPinIcon(fac.facilityType, fac.name);
        const marker = L.marker([fac.latitude, fac.longitude], { icon });

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 2px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${fac.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">${fac.facilityType} · ${fac.emergency24x7 ? "24/7 Emergency" : "Day Care"}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; background: #f8fafc; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div><strong>Doctors on Duty:</strong> ${fac.doctorOnDutyCount}</div>
              <div><strong>Available Beds:</strong> ${fac.availableBeds}</div>
            </div>
            <div style="margin-top: 6px; font-size: 10.5px; color: #059669; font-weight: 600;">🚑 108 Dispatch Ready</div>
          </div>
        `;
        marker.bindPopup(popupContent);
        facilitiesLayer.addLayer(marker);
      });
    }

    // 2. Render Village Intelligence Markers
    villages.forEach((v) => {
      let markerColor = "#10b981";
      let iconChar = "🏡";
      let badgeText = `${v.accessibility.score}/100`;
      let pulseColor: string | undefined = undefined;

      if (activeLayer === "accessibility") {
        const s = v.accessibility.score;
        if (s >= 80) {
          markerColor = "#10b981"; // Emerald
          badgeText = `${s} Optimal`;
          iconChar = "🛡️";
        } else if (s >= 65) {
          markerColor = "#3b82f6"; // Blue
          badgeText = `${s} Moderate`;
          iconChar = "⚖️";
        } else if (s >= 50) {
          markerColor = "#f59e0b"; // Amber
          badgeText = `${s} Suboptimal`;
          pulseColor = "rgba(245, 158, 11, 0.4)";
          iconChar = "⚠️";
        } else {
          markerColor = "#ef4444"; // Red
          badgeText = `${s} Critical`;
          pulseColor = "rgba(239, 68, 68, 0.5)";
          iconChar = "🚨";
        }
      } else if (activeLayer === "risk") {
        const crit = v.riskDistribution.criticalCount;
        const high = v.riskDistribution.highRiskCount;
        const critPct = v.riskDistribution.criticalPercent;

        if (crit >= 15 || critPct >= 10) {
          markerColor = "#e11d48"; // Rose/Red
          badgeText = `${crit} Critical / ${high} High`;
          pulseColor = "rgba(225, 29, 72, 0.5)";
          iconChar = "🔴";
        } else if (high >= 25) {
          markerColor = "#ea580c"; // Orange
          badgeText = `${high} High-Risk`;
          pulseColor = "rgba(234, 88, 12, 0.4)";
          iconChar = "🟠";
        } else {
          markerColor = "#059669"; // Green
          badgeText = `${high} High-Risk`;
          iconChar = "🟢";
        }
      } else if (activeLayer === "screening") {
        const cov = v.screening.coveragePercent;
        if (cov >= 80) {
          markerColor = "#10b981"; // Green
          badgeText = `${cov}% Covered`;
          iconChar = "✅";
        } else if (cov >= 60) {
          markerColor = "#0284c7"; // Sky
          badgeText = `${cov}% Screened`;
          iconChar = "📊";
        } else if (cov >= 45) {
          markerColor = "#f59e0b"; // Amber
          badgeText = `${cov}% Gap`;
          pulseColor = "rgba(245, 158, 11, 0.4)";
          iconChar = "⚠️";
        } else {
          markerColor = "#dc2626"; // Red
          badgeText = `${cov}% Critically Low`;
          pulseColor = "rgba(220, 38, 38, 0.5)";
          iconChar = "❗";
        }
      } else if (activeLayer === "referral") {
        const delay = v.referrals.avgDelayHours;
        if (delay >= 4.0) {
          markerColor = "#dc2626"; // Red
          badgeText = `~${delay}h Delay`;
          pulseColor = "rgba(220, 38, 38, 0.5)";
          iconChar = "⏱️";
        } else if (delay >= 2.5) {
          markerColor = "#ea580c"; // Orange
          badgeText = `~${delay}h Delay`;
          iconChar = "⏳";
        } else {
          markerColor = "#059669"; // Green
          badgeText = `~${delay}h Fast`;
          iconChar = "⚡";
        }
      } else if (activeLayer === "medicine") {
        const status = v.medicineStatus.status;
        const ratio = v.medicineStatus.inStockRatioPercent;
        if (status === "critical_shortage") {
          markerColor = "#ef4444"; // Red
          badgeText = `Shortage (${ratio}% Stock)`;
          pulseColor = "rgba(239, 68, 68, 0.5)";
          iconChar = "💊";
        } else if (status === "moderate_shortage") {
          markerColor = "#f59e0b"; // Amber
          badgeText = `Low Stock (${ratio}%)`;
          iconChar = "📦";
        } else {
          markerColor = "#10b981"; // Green
          badgeText = `In Stock (${ratio}%)`;
          iconChar = "🩺";
        }
      }

      // Highlight if selected
      const isSelected = selectedVillageId === v.id || selectedVillageId === v.villageName;
      const markerSize = isSelected ? 46 : 38;

      const markerIcon = createLeafletVillageIcon(
        isSelected ? "#0f172a" : markerColor,
        badgeText,
        iconChar,
        isSelected ? "rgba(15, 23, 42, 0.3)" : pulseColor,
        markerSize
      );

      const marker = L.marker([v.latitude, v.longitude], { icon: markerIcon, zIndexOffset: isSelected ? 1000 : 100 });

      // Click event selects village and opens drawer
      marker.on("click", () => {
        setSelectedVillageId(v.id);
        if (onSelectVillage) onSelectVillage(v.villageName);
        toast.info(`Inspecting ${v.villageName} (${v.block} Block)`);
      });

      // Tooltip on hover
      marker.bindTooltip(
        `<strong>${v.villageName}</strong> (${v.population.toLocaleString()} pop)<br/>Score: <strong>${v.accessibility.score}/100</strong> · Screened: <strong>${v.screening.coveragePercent}%</strong>`,
        { direction: "top", offset: [0, -20] }
      );

      markersLayer.addLayer(marker);

      // 3. Render Referral Flow Lines
      if (showReferralLines && (activeLayer === "referral" || activeLayer === "accessibility")) {
        const fac = facilities.find((f) => f.name.toLowerCase() === v.referrals.primaryDestinationFacility.toLowerCase()) || facilities[0];
        if (fac) {
          const isDelayed = v.referrals.avgDelayHours >= 3.0;
          const polyline = L.polyline(
            [
              [v.latitude, v.longitude],
              [fac.latitude, fac.longitude],
            ],
            {
              color: isDelayed ? "#ef4444" : "#3b82f6",
              weight: isSelected ? 3.5 : 2,
              opacity: isSelected ? 0.9 : 0.45,
              dashArray: isDelayed ? "6, 6" : undefined,
            }
          );
          polyline.bindTooltip(
            `${v.villageName} → ${fac.name}<br/>Est. Transit: ~${v.referrals.avgDelayHours}h (${v.accessibility.nearestFacilityDistanceKm} km)`,
            { sticky: true }
          );
          routesLayer.addLayer(polyline);
        }
      }
    });

    // Auto-fit bounds if we have villages
    if (villages.length > 0) {
      const latLngs = villages.map((v) => [v.latitude, v.longitude] as [number, number]);
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [villages, facilities, activeLayer, showFacilities, showReferralLines, selectedVillageId]);

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    toast.success("Filters reset to default view.");
  };

  return (
    <div className="space-y-4">
      {/* Top District Summary KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-0 shadow-xs bg-slate-900 text-white rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase">
            <span>Villages / Catchments</span>
            <MapPin className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <p className="text-2xl font-black mt-1">{summary?.totalVillages ?? 0}</p>
          <span className="text-[10px] text-slate-400">{(summary?.totalPopulation ?? 0).toLocaleString()} Total Population</span>
        </Card>

        <Card className="border-0 shadow-xs bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold uppercase">
            <span>Screening Coverage</span>
            <HeartPulse className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-950 mt-1">{summary?.districtScreeningCoveragePercent ?? 0}%</p>
          <span className="text-[10px] text-emerald-700 font-medium">{(summary?.totalScreened ?? 0).toLocaleString()} Screened</span>
        </Card>

        <Card className="border-0 shadow-xs bg-rose-50 border border-rose-200 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-rose-800 text-[11px] font-bold uppercase">
            <span>High-Risk Patients</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-950 mt-1">{summary?.totalHighRiskCases ?? 0}</p>
          <span className="text-[10px] text-rose-700 font-medium">{summary?.districtHighRiskPercent ?? 0}% Morbidity Rate</span>
        </Card>

        <Card className="border-0 shadow-xs bg-blue-50 border border-blue-200 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-blue-800 text-[11px] font-bold uppercase">
            <span>Avg Accessibility</span>
            <Activity className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-950 mt-1">{summary?.avgAccessibilityScore ?? 0}<span className="text-xs font-normal text-blue-700">/100</span></p>
          <span className="text-[10px] text-blue-700 font-medium">7-Factor Index</span>
        </Card>

        <Card className="border-0 shadow-xs bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold uppercase">
            <span>Avg Transit Delay</span>
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-950 mt-1">~{summary?.avgReferralDelayHours ?? 0} <span className="text-xs font-normal text-amber-700">hrs</span></p>
          <span className="text-[10px] text-amber-700 font-medium">Village to Specialist</span>
        </Card>

        <Card className="border-0 shadow-xs bg-purple-50 border border-purple-200 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-purple-800 text-[11px] font-bold uppercase">
            <span>Critical Shortages</span>
            <Pill className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-950 mt-1">{summary?.criticalMedicineShortagesCount ?? 0}</p>
          <span className="text-[10px] text-purple-700 font-medium">Catchments Affected</span>
        </Card>
      </div>

      {/* Layer Control Bar & Filter Toggles */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Layer Selector Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-slate-700" /> Visual Layer:
          </span>

          <Button
            size="sm"
            variant={activeLayer === "accessibility" ? "default" : "outline"}
            onClick={() => setActiveLayer("accessibility")}
            className={`rounded-full text-xs font-bold h-8 px-3 ${activeLayer === "accessibility" ? "bg-emerald-700 hover:bg-emerald-800 text-white" : "text-slate-700"}`}
          >
            🛡️ Accessibility Score (0–100)
          </Button>

          <Button
            size="sm"
            variant={activeLayer === "risk" ? "default" : "outline"}
            onClick={() => setActiveLayer("risk")}
            className={`rounded-full text-xs font-bold h-8 px-3 ${activeLayer === "risk" ? "bg-rose-700 hover:bg-rose-800 text-white" : "text-slate-700"}`}
          >
            🔴 Risk &amp; Morbidity
          </Button>

          <Button
            size="sm"
            variant={activeLayer === "screening" ? "default" : "outline"}
            onClick={() => setActiveLayer("screening")}
            className={`rounded-full text-xs font-bold h-8 px-3 ${activeLayer === "screening" ? "bg-blue-700 hover:bg-blue-800 text-white" : "text-slate-700"}`}
          >
            📊 Screening Coverage
          </Button>

          <Button
            size="sm"
            variant={activeLayer === "referral" ? "default" : "outline"}
            onClick={() => setActiveLayer("referral")}
            className={`rounded-full text-xs font-bold h-8 px-3 ${activeLayer === "referral" ? "bg-amber-700 hover:bg-amber-800 text-white" : "text-slate-700"}`}
          >
            ⏱️ Referral Transit Delays
          </Button>

          <Button
            size="sm"
            variant={activeLayer === "medicine" ? "default" : "outline"}
            onClick={() => setActiveLayer("medicine")}
            className={`rounded-full text-xs font-bold h-8 px-3 ${activeLayer === "medicine" ? "bg-purple-700 hover:bg-purple-800 text-white" : "text-slate-700"}`}
          >
            💊 Medicine Shortages
          </Button>
        </div>

        {/* Layer Toggles & Filter Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
            <input
              type="checkbox"
              checked={showFacilities}
              onChange={(e) => setShowFacilities(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Show Health Facilities</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
            <input
              type="checkbox"
              checked={showReferralLines}
              onChange={(e) => setShowReferralLines(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Show Feeder Routes</span>
          </label>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`rounded-full text-xs font-bold h-8 px-3.5 gap-1.5 ${
              filters.diseaseCategory !== "all" || filters.riskCategory !== "all" || filters.dateRange !== "all" || filters.villageId !== "all" || filters.facilityId !== 0
                ? "border-blue-500 bg-blue-50 text-blue-900"
                : "text-slate-700"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters {filters.diseaseCategory !== "all" || filters.riskCategory !== "all" || filters.villageId !== "all" ? "• Active" : ""}
          </Button>
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilterDrawer && (
        <Card className="border border-blue-200 bg-blue-50/40 shadow-xs rounded-2xl p-4 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-700" />
              <h4 className="font-bold text-sm text-slate-900">District Intelligence Filters</h4>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={handleResetFilters} className="text-xs text-slate-600 hover:text-slate-900">
                Reset
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowFilterDrawer(false)} className="rounded-full h-7 w-7 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3">
            {/* 1. Disease / Morbidity Category */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Disease / Morbidity</label>
              <select
                value={filters.diseaseCategory}
                onChange={(e) => setFilters({ ...filters, diseaseCategory: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
              >
                {(filterOptionsQuery.data?.diseaseCategories || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* 2. Risk Tier */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Risk Tier Stratification</label>
              <select
                value={filters.riskCategory}
                onChange={(e) => setFilters({ ...filters, riskCategory: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
              >
                {(filterOptionsQuery.data?.riskCategories || []).map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* 3. Date Range */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Surveillance Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
              >
                {(filterOptionsQuery.data?.dateRanges || []).map((dr) => (
                  <option key={dr.id} value={dr.id}>{dr.label}</option>
                ))}
              </select>
            </div>

            {/* 4. Village Catchment */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Village Catchment</label>
              <select
                value={filters.villageId}
                onChange={(e) => {
                  setFilters({ ...filters, villageId: e.target.value });
                  if (e.target.value !== "all") setSelectedVillageId(e.target.value);
                }}
                className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
              >
                {(filterOptionsQuery.data?.villages || []).map((v) => (
                  <option key={v.id} value={v.id}>{v.name} {(v as any).block ? `(${ (v as any).block })` : ""}</option>
                ))}
              </select>
            </div>

            {/* 5. Linked Health Facility */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Primary / Secondary Facility</label>
              <select
                value={filters.facilityId}
                onChange={(e) => setFilters({ ...filters, facilityId: Number(e.target.value) })}
                className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
              >
                {(filterOptionsQuery.data?.facilities || []).map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Main Map + Slide-out Village Drawer Container */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Leaflet GIS Map Canvas */}
        <div className={`transition-all duration-300 ${selectedVillage ? "lg:col-span-8" : "lg:col-span-12"}`}>
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
            {/* Map Container */}
            <div ref={mapContainerRef} className="w-full h-[600px] z-10" />

            {/* Floating Layer Legend */}
            <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-md text-xs space-y-1.5 pointer-events-auto max-w-xs">
              <div className="font-bold text-slate-900 text-[11px] flex items-center justify-between">
                <span>Legend: {activeLayer.toUpperCase()}</span>
                <Badge variant="outline" className="text-[9px] uppercase font-mono">Live Grid</Badge>
              </div>

              {activeLayer === "accessibility" && (
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" /> 80–100: Optimal Accessibility</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-500 inline-block" /> 65–79: Moderate Accessibility</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500 inline-block" /> 50–64: Sub-optimal Access</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-500 inline-block" /> 0–49: Critical Deficiency</div>
                </div>
              )}

              {activeLayer === "risk" && (
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-600 inline-block" /> High Concentration Critical Cases</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-orange-500 inline-block" /> Moderate High-Risk NCD Cluster</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-600 inline-block" /> Controlled Baseline Risk</div>
                </div>
              )}

              {activeLayer === "screening" && (
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" /> &gt;80% Target Population Screened</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-sky-500 inline-block" /> 60–80% Screened</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500 inline-block" /> 45–60% Surveillance Gap</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-600 inline-block" /> &lt;45% Priority Outreach Drive Needed</div>
                </div>
              )}

              {activeLayer === "referral" && (
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" /> &lt;2.5 hrs Average Transit Delay</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-orange-500 inline-block" /> 2.5–4.0 hrs Transit Delay</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-600 inline-block" /> &gt;4.0 hrs Feeder Bottleneck Delay</div>
                </div>
              )}

              {activeLayer === "medicine" && (
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" /> Adequate Formulary Stock (&gt;75%)</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500 inline-block" /> Low Buffer Threshold (50–75%)</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-600 inline-block" /> Critical Stockout Detected (&lt;50%)</div>
                </div>
              )}
            </div>

            {/* Privacy Shield Notice at Top Right of Map */}
            <div className="absolute top-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-slate-700 shadow-md text-[11px] font-semibold flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-emerald-400" />
              <span>De-identified Demographic View</span>
            </div>
          </div>
        </div>

        {/* Slide-out Village Intelligence Inspection Drawer (Right Side) */}
        {selectedVillage && (
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="display-font text-lg font-bold text-slate-900">{selectedVillage.villageName}</h3>
                      <Badge className="bg-slate-200 text-slate-800 text-[10px] uppercase font-bold">{selectedVillage.block} Block</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedVillage.district} · {selectedVillage.latitude.toFixed(4)}°N, {selectedVillage.longitude.toFixed(4)}°E</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedVillageId(null)}
                    className="rounded-full h-7 w-7 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 max-h-[530px] overflow-y-auto text-xs">
                {/* 1. Accessibility Score Spotlight */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-900 uppercase">Healthcare Accessibility Score</span>
                      <p className="text-2xl font-black text-emerald-950 mt-0.5">{selectedVillage.accessibility.score}<span className="text-sm font-semibold text-emerald-700"> / 100</span></p>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-bold text-xs">
                      {selectedVillage.accessibility.riskCategoryShort.toUpperCase()} RISK
                    </Badge>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-emerald-200/60 text-[11px] text-slate-700">
                    <strong>Nearest Facility:</strong> {selectedVillage.accessibility.nearestFacilityName} ({selectedVillage.accessibility.nearestFacilityDistanceKm} km)
                  </div>
                  {selectedVillage.accessibility.mainLimitingFactors.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {selectedVillage.accessibility.mainLimitingFactors.map((lim, idx) => (
                        <span key={idx} className="bg-white/80 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-300">
                          {lim}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Demographics & Screening */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-blue-600" /> Population &amp; Screening
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold text-blue-700 bg-blue-50">
                      {selectedVillage.screening.coveragePercent}% Screened
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Population</span>
                      <strong className="text-slate-900">{selectedVillage.population.toLocaleString()}</strong> ({selectedVillage.householdCount} Households)
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Screened Beneficiaries</span>
                      <strong className="text-emerald-700">{selectedVillage.screening.screenedCount.toLocaleString()}</strong> ({selectedVillage.screening.unscreenedGap} Gap)
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-600">
                    <strong>Active Campaign:</strong> {selectedVillage.screening.activeCampaignName}
                  </div>
                </div>

                {/* 3. High-Risk Morbidity Cohort Breakdown */}
                <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-rose-950 text-xs flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-600" /> High-Risk Epidemiological Cohort
                    </span>
                    <span className="text-[11px] font-extrabold text-rose-800">
                      {selectedVillage.riskDistribution.criticalCount} Critical · {selectedVillage.riskDistribution.highRiskCount} High
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Hypertension &amp; Cardiac</span>
                      <strong className="text-slate-900">{selectedVillage.riskDistribution.morbidityBreakdown.hypertension} cases</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Type 2 Diabetes</span>
                      <strong className="text-slate-900">{selectedVillage.riskDistribution.morbidityBreakdown.diabetes} cases</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Maternal &amp; High-Risk ANC</span>
                      <strong className="text-slate-900">{selectedVillage.riskDistribution.morbidityBreakdown.maternalHighRisk} cases</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Respiratory &amp; COPD</span>
                      <strong className="text-slate-900">{selectedVillage.riskDistribution.morbidityBreakdown.respiratoryCopd} cases</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Severe Anemia</span>
                      <strong className="text-slate-900">{selectedVillage.riskDistribution.morbidityBreakdown.anemia} cases</strong>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-rose-200/60 text-[10.5px] text-rose-900 font-semibold">
                    Primary Morbidity Burden: {selectedVillage.riskDistribution.dominantCondition}
                  </div>
                </div>

                {/* 4. Referral Transit Delays */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <Navigation className="h-3.5 w-3.5 text-amber-600" /> Referral Velocity &amp; Delays
                    </span>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]">
                      ~{selectedVillage.referrals.avgDelayHours} hrs transit
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center bg-white p-2 rounded-xl border border-amber-100 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Referrals</span>
                      <strong className="text-slate-800">{selectedVillage.referrals.totalReferrals}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Completed</span>
                      <strong className="text-emerald-700">{selectedVillage.referrals.completedCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">In Transit</span>
                      <strong className="text-blue-700">{selectedVillage.referrals.inTransitCount}</strong>
                    </div>
                  </div>
                  {selectedVillage.referrals.bottleneckRoute && (
                    <div className="mt-2 text-[10.5px] text-amber-900 font-medium">
                      ⚠️ <strong>Bottleneck Route:</strong> {selectedVillage.referrals.bottleneckRoute}
                    </div>
                  )}
                </div>

                {/* 5. Medicine Stock & Shortages */}
                <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                      <Pill className="h-3.5 w-3.5 text-purple-600" /> Pharmacy &amp; Stock Availability
                    </span>
                    <Badge className={selectedVillage.medicineStatus.status === "critical_shortage" ? "bg-rose-100 text-rose-900 border-rose-300 font-bold text-[10px]" : "bg-emerald-100 text-emerald-900 font-bold text-[10px]"}>
                      {selectedVillage.medicineStatus.inStockRatioPercent}% In-Stock
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Linked primary pharmacy: <strong>{selectedVillage.medicineStatus.linkedFacilityName}</strong>
                  </p>
                  {selectedVillage.medicineStatus.criticalShortageDrugs.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] font-bold text-rose-900 block mb-1">Critical Stockout / Low-Stock Drugs:</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedVillage.medicineStatus.criticalShortageDrugs.map((drug, idx) => (
                          <span key={idx} className="bg-rose-100 text-rose-900 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-rose-200">
                            {drug}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Follow-up Adherence */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-600" /> Field Follow-up Completion
                    </span>
                    <span className="font-bold text-emerald-700 text-xs">{selectedVillage.followUps.completionRatePercent}% Done</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center bg-white p-2 rounded-xl border text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Assigned</span>
                      <strong>{selectedVillage.followUps.totalAssigned}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Completed</span>
                      <strong className="text-emerald-700">{selectedVillage.followUps.completedCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Overdue</span>
                      <strong className="text-rose-700">{selectedVillage.followUps.overdueCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Privacy & De-identification Guard notice */}
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[10px] text-slate-500 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>PHI Protected:</strong> Patient names, phone numbers, and identifying records are redacted. Only aggregated cohorts and anonymized clinical distributions are displayed.
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
