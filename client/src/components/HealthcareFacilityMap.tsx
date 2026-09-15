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
} from "lucide-react";
import { toast } from "sonner";

// Custom SVG Icons for Leaflet Markers
function createLeafletIcon(color: string, iconHtml: string, size = 38) {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 2px solid #ffffff;
      ">
        <div style="transform: rotate(45deg); color: #ffffff; display: flex; align-items: center; justify-content: center;">
          ${iconHtml}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 6],
  });
}

function createVillageIcon(size = 30) {
  return L.divIcon({
    className: "custom-village-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: #f59e0b;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(245,158,11,0.5);
        border: 2px solid #ffffff;
      ">
        <span style="color: #ffffff; font-size: 13px; font-weight: bold;">🏡</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function createOriginPinIcon(size = 42) {
  return L.divIcon({
    className: "custom-origin-marker",
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.25);
          animation: pulse-ring 2s infinite ease-in-out;
        "></div>
        <div style="
          width: 28px;
          height: 28px;
          background: #ef4444;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(239,68,68,0.6);
        ">
          <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const FACILITY_COLORS: Record<string, string> = {
  sub_centre: "#10b981", // Emerald (AAM)
  phc: "#0284c7",        // Sky Blue
  chc: "#6366f1",        // Indigo
  district_hospital: "#e11d48", // Rose/Crimson
  sub_district_hospital: "#9333ea", // Purple
};

const COMMON_SPECIALTIES = [
  "General Medicine",
  "Maternal & Child Health",
  "Cardiology",
  "Pediatrics",
  "Internal Medicine",
  "Nephrology",
  "Orthopedics",
  "Pulmonology / Chest",
  "Obstetrics & Gynecology",
  "Emergency Medicine",
];

const ESSENTIAL_MEDICINES = [
  "Telmisartan 40mg",
  "Metformin 500mg",
  "Amlodipine 5mg",
  "Iron & Folic Acid (IFA) Tablets",
  "ORS Sachets (WHO formula)",
  "Paracetamol 500mg",
  "Amoxicillin 500mg",
  "Salbutamol Inhaler 100mcg",
];

interface HealthcareFacilityMapProps {
  onSelectFacilityForReferral?: (facilityId: number, facilityName: string) => void;
  defaultOriginVillage?: string;
  className?: string;
}

export default function HealthcareFacilityMap({
  onSelectFacilityForReferral,
  defaultOriginVillage = "Sundarpur",
  className = "",
}: HealthcareFacilityMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Queries
  const mapDataQuery = trpc.facilities.getMapData.useQuery();

  // Search & Filter State
  const [selectedVillage, setSelectedVillage] = useState<string>(defaultOriginVillage);
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number }>({ lat: 23.012, lng: 72.3508 });
  const [selectedFacilityType, setSelectedFacilityType] = useState<string>("all");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [filterEmergency, setFilterEmergency] = useState<boolean>(false);
  const [filterIcu, setFilterIcu] = useState<boolean>(false);
  const [filterOxygen, setFilterOxygen] = useState<boolean>(false);
  const [filterMedicine, setFilterMedicine] = useState<string>("");
  const [showVillages, setShowVillages] = useState<boolean>(true);
  const [focusedFacilityId, setFocusedFacilityId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"nearest" | "all_facilities" | "layers">("nearest");

  // Geospatial Nearest Facility Query
  const nearestQuery = trpc.facilities.findNearest.useQuery(
    {
      latitude: originCoords.lat,
      longitude: originCoords.lng,
      originVillage: selectedVillage,
      facilityType: selectedFacilityType !== "all" ? selectedFacilityType : undefined,
      specialty: selectedSpecialty !== "all" ? selectedSpecialty : undefined,
      emergencyRequired: filterEmergency || undefined,
      icuRequired: filterIcu || undefined,
      oxygenRequired: filterOxygen || undefined,
      requiredMedicine: filterMedicine.trim() !== "" ? filterMedicine : undefined,
    },
    {
      enabled: true,
      refetchOnWindowFocus: false,
    }
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.98, 72.36],
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Click anywhere on map to set custom origin coordinates
    map.on("click", (e: L.LeafletMouseEvent) => {
      setOriginCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setSelectedVillage("Custom Pin Location");
      toast.info(`Origin set to coordinate (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Map Markers when data or filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer || !mapDataQuery.data) return;

    markersLayer.clearLayers();

    // 1. Draw Origin Marker (pulsating pin)
    const originMarker = L.marker([originCoords.lat, originCoords.lng], {
      icon: createOriginPinIcon(),
      zIndexOffset: 1000,
    }).bindPopup(`
      <div style="font-family: sans-serif; min-width: 180px; padding: 4px;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: bold; color: #dc2626; font-size: 13px;">
          📍 Origin Location
        </div>
        <div style="font-size: 12px; color: #374151; margin-top: 4px;">${selectedVillage}</div>
        <div style="font-size: 10px; color: #6b7280;">Lat: ${originCoords.lat.toFixed(4)}, Lng: ${originCoords.lng.toFixed(4)}</div>
      </div>
    `);
    markersLayer.addLayer(originMarker);

    // 2. Draw Villages (if enabled)
    if (showVillages && mapDataQuery.data.villages) {
      mapDataQuery.data.villages.forEach((v) => {
        const vMarker = L.marker([v.latitude, v.longitude], {
          icon: createVillageIcon(),
          zIndexOffset: 400,
        }).bindPopup(`
          <div style="font-family: sans-serif; min-width: 200px; padding: 4px;">
            <div style="font-weight: bold; color: #d97706; font-size: 13px; margin-bottom: 4px;">
              🏡 Village: ${v.name}
            </div>
            <div style="font-size: 11px; color: #4b5563; line-height: 1.5;">
              <div><strong>Block:</strong> ${v.block}, ${v.district}</div>
              <div><strong>Population:</strong> ${v.population.toLocaleString()}</div>
              <div><strong>Screened Cohort:</strong> ${v.screenedCount} beneficiaries</div>
              <div><strong>High-Risk Detected:</strong> <span style="color: #dc2626; font-weight: bold;">${v.highRiskCount}</span></div>
              <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e5e7eb;">
                <strong>Primary Facility:</strong> ${v.nearestFacilityName}
              </div>
            </div>
          </div>
        `);
        markersLayer.addLayer(vMarker);
      });
    }

    // 3. Draw Facilities
    const facilitiesToRender = nearestQuery.data?.results || mapDataQuery.data.facilities;

    facilitiesToRender.forEach((f) => {
      if (!f.latitude || !f.longitude) return;

      const color = FACILITY_COLORS[f.facilityType] || "#0284c7";
      const iconSymbol =
        f.facilityType === "district_hospital"
          ? "🏥"
          : f.facilityType === "chc"
          ? "🏢"
          : f.facilityType === "sub_centre"
          ? "🌿"
          : "⚕️";

      const fMarker = L.marker([f.latitude, f.longitude], {
        icon: createLeafletIcon(color, `<span style="font-size: 14px;">${iconSymbol}</span>`),
        zIndexOffset: 800,
      });

      const bedsAvailable = f.emergencyCapability?.availableBeds ?? 0;
      const totalBeds = f.emergencyCapability?.totalBeds ?? 0;
      const is24x7 = f.emergencyCapability?.is24x7;

      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 240px; max-width: 280px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; background: ${color}20; color: ${color}; padding: 2px 6px; border-radius: 9999px;">
              ${f.facilityType.replace(/_/g, " ").toUpperCase()}
            </span>
            <span style="font-size: 10px; font-weight: bold; color: ${is24x7 ? "#16a34a" : "#ca8a04"};">
              ${is24x7 ? "● 24/7 Emergency" : "● Day OPD"}
            </span>
          </div>
          <div style="font-weight: bold; color: #111827; font-size: 13px; line-height: 1.3;">${f.name}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${f.address || f.village || f.district}</div>
          
          <div style="margin: 8px 0; padding: 6px; background: #f9fafb; border-radius: 8px; font-size: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div><strong>Beds:</strong> ${bedsAvailable}/${totalBeds}</div>
            <div><strong>ICU:</strong> ${f.emergencyCapability?.icuAvailable ? "Available" : "No"}</div>
            <div><strong>Oxygen:</strong> ${f.emergencyCapability?.oxygenAvailable ? "Yes" : "No"}</div>
            <div><strong>Phone:</strong> ${f.phone || "+91 108"}</div>
          </div>

          <div style="font-size: 10px; color: #4b5563; margin-bottom: 6px;">
            <strong>Specialties:</strong> ${(f.specialties || []).slice(0, 3).join(", ")}
          </div>

          <div style="display: flex; gap: 4px; margin-top: 8px;">
            <button id="btn-focus-${f.facilityId || f.id}" style="
              flex: 1;
              background: #0284c7;
              color: white;
              border: none;
              padding: 5px 8px;
              border-radius: 6px;
              font-size: 11px;
              font-weight: bold;
              cursor: pointer;
            ">View Details</button>
          </div>
        </div>
      `;

      fMarker.bindPopup(popupHtml);
      markersLayer.addLayer(fMarker);
    });
  }, [mapDataQuery.data, nearestQuery.data, originCoords, selectedVillage, showVillages]);

  // Focus on specific facility & draw geodesic route line
  const handleFocusFacility = (facility: {
    facilityId?: number;
    id?: number;
    latitude?: number | null;
    longitude?: number | null;
    name: string;
    distanceKm?: number;
    estimatedTravelMins?: number;
  }) => {
    const map = mapInstanceRef.current;
    if (!map || !facility.latitude || !facility.longitude) return;

    setFocusedFacilityId(facility.facilityId || facility.id || null);

    // Pan & Zoom to facility
    map.flyTo([facility.latitude, facility.longitude], 13, { duration: 1.2 });

    // Draw geodesic dashed transit path from origin to facility
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    const latlngs: [number, number][] = [
      [originCoords.lat, originCoords.lng],
      [facility.latitude, facility.longitude],
    ];

    const polyline = L.polyline(latlngs, {
      color: "#dc2626",
      weight: 3.5,
      opacity: 0.85,
      dashArray: "6, 8",
    }).addTo(map);

    polyline.bindTooltip(
      `🛣️ ${facility.distanceKm ?? "Nearby"} km (~${facility.estimatedTravelMins ?? 15} mins transit)`,
      { permanent: true, direction: "center", className: "route-distance-tooltip" }
    );

    routeLineRef.current = polyline;
  };

  // Handle Village Select
  const handleSelectVillage = (villageName: string) => {
    setSelectedVillage(villageName);
    const found = mapDataQuery.data?.villages.find((v) => v.name === villageName);
    if (found) {
      setOriginCoords({ lat: found.latitude, lng: found.longitude });
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([found.latitude, found.longitude], 12);
      }
    }
  };

  // Handle Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    toast.loading("Acquiring GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss();
        setOriginCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSelectedVillage("My GPS Location");
        toast.success("Location updated successfully!");
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 13);
        }
      },
      () => {
        toast.dismiss();
        toast.info("Using default Sundarpur location (GPS unavailable/denied)");
        handleSelectVillage("Sundarpur");
      }
    );
  };

  const results = nearestQuery.data?.results || [];
  const topMatch = nearestQuery.data?.topMatch;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Header & Synthetic Telemetry Notice */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-5 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-bold">Healthcare Facility &amp; Village Geospatial Map</h2>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-[10px] font-semibold">
              District Health Grid
            </Badge>
          </div>
          <p className="text-xs text-slate-300">
            Interactive GIS map covering Sub-Centres (AAM), Primary Health Centres (PHC), Community Health Centres (CHC), and District Hospitals across Ahmedabad Rural.
          </p>
        </div>


      </div>

      {/* 2. Grid Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Total Facilities</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                {mapDataQuery.data?.facilities.length || 5}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Hospital className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">24/7 Trauma Centers</p>
              <p className="text-xl font-extrabold text-rose-600 mt-0.5">
                {(mapDataQuery.data?.facilities || []).filter((f) => f.emergencyCapability?.is24x7).length || 3}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <HeartPulse className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Covered Villages</p>
              <p className="text-xl font-extrabold text-amber-600 mt-0.5">
                {mapDataQuery.data?.villages.length || 7}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <MapPin className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Available Beds</p>
              <p className="text-xl font-extrabold text-emerald-600 mt-0.5">
                {(mapDataQuery.data?.facilities || []).reduce(
                  (acc, f) => acc + (f.emergencyCapability?.availableBeds || 0),
                  0
                )}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Map & Controls Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Filter & Find Nearest Control Panel (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-900">
                  <Navigation className="h-4 w-4 text-blue-600" />
                  Find Nearest Appropriate Facility
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 border-blue-200">
                  Geospatial
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Calculates geodesic distance, driving time, bed capacity, and medicine availability.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 pt-0 space-y-3.5 text-xs">
              {/* Origin Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Origin Village / Location</span>
                  <button
                    onClick={handleUseCurrentLocation}
                    className="text-blue-600 font-semibold flex items-center gap-1 hover:underline text-[11px]"
                  >
                    <Locate className="h-3 w-3" /> My GPS
                  </button>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(mapDataQuery.data?.villages || []).slice(0, 4).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleSelectVillage(v.name)}
                      className={`px-2.5 py-1.5 rounded-xl text-left font-medium border text-xs transition-colors ${
                        selectedVillage === v.name
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🏡 {v.name}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 italic">
                  Tip: Or click anywhere directly on the map to set a custom origin pin!
                </div>
              </div>

              {/* Filters Section */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Filters &amp; Capabilities
                </p>

                {/* Facility Type Filter */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Facility Type</label>
                  <select
                    value={selectedFacilityType}
                    onChange={(e) => setSelectedFacilityType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types (AAM, PHC, CHC, District Hospital)</option>
                    <option value="sub_centre">AAM / Sub-Centre (Primary Outreach)</option>
                    <option value="phc">Primary Health Centre (PHC)</option>
                    <option value="chc">Community Health Centre (CHC)</option>
                    <option value="district_hospital">District Hospital / Civil Hospital</option>
                  </select>
                </div>

                {/* Specialty Filter */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Needed Clinical Specialty</label>
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Specialties</option>
                    {COMMON_SPECIALTIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Medicine Availability Filter */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Required Medicine in Stock</label>
                  <select
                    value={filterMedicine}
                    onChange={(e) => setFilterMedicine(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any Medicine / No Restriction</option>
                    {ESSENTIAL_MEDICINES.map((m) => (
                      <option key={m} value={m}>
                        💊 {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Emergency & Critical Capability Toggles */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Critical Capabilities</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setFilterEmergency(!filterEmergency)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        filterEmergency
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🚨 24/7 Emergency
                    </button>
                    <button
                      onClick={() => setFilterIcu(!filterIcu)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        filterIcu
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🛏️ ICU Available
                    </button>
                    <button
                      onClick={() => setFilterOxygen(!filterOxygen)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        filterOxygen
                          ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      💨 Oxygen Support
                    </button>
                    <button
                      onClick={() => setShowVillages(!showVillages)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        showVillages
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      🏡 Show Villages
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results List: Nearest Appropriate Facilities */}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs px-1 text-slate-500 font-semibold">
              <span>{results.length} Facilities Ranked by Proximity &amp; Suitability</span>
              {topMatch && <span className="text-emerald-600 font-bold">Top Match: {topMatch.distanceKm} km</span>}
            </div>

            {results.map((fac, idx) => {
              const isTop = idx === 0;
              const isFocused = focusedFacilityId === fac.facilityId;
              const color = FACILITY_COLORS[fac.facilityType] || "#0284c7";

              return (
                <div
                  key={fac.facilityId}
                  onClick={() => handleFocusFacility(fac)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isFocused
                      ? "border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-600"
                      : isTop
                      ? "border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/70"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase"
                          style={{ backgroundColor: color }}
                        >
                          {fac.facilityType.replace(/_/g, " ")}
                        </span>
                        {isTop && (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                            ⭐ Best Match ({fac.appropriatenessScore} pts)
                          </Badge>
                        )}
                        {fac.emergencyCapability.is24x7 && (
                          <Badge className="bg-rose-100 text-rose-800 text-[10px] font-semibold border-rose-200">
                            24/7 Trauma
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs mt-1">{fac.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{fac.address || fac.village}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-blue-700">{fac.distanceKm} km</div>
                      <div className="text-[10px] text-slate-500">~{fac.estimatedTravelMins} mins</div>
                    </div>
                  </div>

                  {/* Capabilities & Stock Pills */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-slate-600">
                      🛏️ <strong>{fac.emergencyCapability.availableBeds}</strong> beds free
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">
                      {fac.emergencyCapability.icuAvailable ? "ICU Yes" : "No ICU"}
                    </span>

                    {fac.matchedMedicineName && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            fac.medicineStockStatus === "AVAILABLE"
                              ? "bg-emerald-100 text-emerald-800"
                              : fac.medicineStockStatus === "LOW STOCK"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          💊 {fac.matchedMedicineName}: {fac.medicineStockStatus}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFocusFacility(fac);
                      }}
                      className="text-[11px] h-7 rounded-full text-blue-700 border-blue-200 hover:bg-blue-50"
                    >
                      <Navigation className="mr-1 h-3 w-3" /> Focus on Map
                    </Button>

                    {onSelectFacilityForReferral && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFacilityForReferral(fac.facilityId, fac.name);
                        }}
                        className="text-[11px] h-7 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white"
                      >
                        Refer Patient
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Leaflet Interactive Map View (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          {/* Map Layer Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-xs text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Map Legend:</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]"></span> AAM Sub-Centre
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7]"></span> PHC
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#6366f1]"></span> CHC
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e11d48]"></span> District Hospital
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]"></span> Village
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([22.98, 72.36], 11);
                }
              }}
              className="text-[11px] h-7 rounded-full text-slate-600"
            >
              Reset View
            </Button>
          </div>

          {/* Leaflet Canvas Container */}
          <div className="relative w-full h-[580px] rounded-3xl overflow-hidden shadow-md border border-slate-200">
            <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

            {/* Floating Quick Stats Overlay on Top Right of Map */}
            <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-slate-200 text-xs space-y-1.5 max-w-[220px]">
              <div className="font-bold text-slate-900 flex items-center gap-1">
                📍 Active Origin Pin
              </div>
              <div className="text-[11px] text-slate-600">
                <strong>{selectedVillage}</strong>
              </div>
              <div className="text-[10px] text-slate-500">
                {originCoords.lat.toFixed(4)}, {originCoords.lng.toFixed(4)}
              </div>
              <div className="pt-1.5 border-t border-slate-100 text-[10px] text-emerald-700 font-semibold">
                ✓ Nearest: {topMatch ? `${topMatch.name} (${topMatch.distanceKm} km)` : "None"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
