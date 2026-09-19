import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Hospital,
  Building2,
  MapPin,
  Plus,
  Search,
  HeartPulse,
  Activity,
  Bed,
  Compass,
  X,
  RefreshCw,
  Navigation,
} from "lucide-react";
import {
  MAHARASHTRA_DISTRICTS,
  getCitiesForDistrict,
  getDistrictCoordinates,
} from "@shared/maharashtraLocations";
import HealthcareFacilityMap from "@/components/HealthcareFacilityMap";

const SPECIALTY_OPTIONS = [
  "General Medicine",
  "Obstetrics & Gynaecology",
  "Paediatrics & Neonatology",
  "General Surgery",
  "Orthopaedics & Trauma",
  "Cardiology",
  "Nephrology & Dialysis",
  "Ophthalmology",
  "ENT & Audiology",
  "Dermatology",
  "Psychiatry & Mental Health",
  "Emergency Medicine",
  "Pulmonology",
  "Radiology & Sonography",
];

export function FacilitiesManagementView() {
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"directory" | "map">("directory");

  // Add Facility Dialog state
  const [showAddFacilityModal, setShowAddFacilityModal] = useState(false);
  const [facilityForm, setFacilityForm] = useState({
    name: "",
    facilityType: "phc" as "sub_centre" | "phc" | "chc" | "sub_district_hospital" | "district_hospital" | "specialist",
    district: "Nandurbar",
    village: "Dhadgaon",
    address: "",
    phone: "",
    latitude: 21.3700,
    longitude: 74.2400,
    specialties: ["General Medicine", "Obstetrics & Gynaecology"] as string[],
    capabilities: ["24x7 Labor Room", "Basic Emergency Care", "Cold Chain Storage"] as string[],
    totalBeds: 20,
    availableBeds: 12,
    icuAvailable: false,
    oxygenAvailable: true,
    is24x7: true,
  });

  // Queries
  const facilitiesQuery = trpc.facilities.list.useQuery(undefined, {
    staleTime: 10000,
  });

  // Mutation
  const createFacilityMutation = trpc.facilities.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Health facility successfully registered into GIS database!");
      setShowAddFacilityModal(false);
      utils.facilities.list.invalidate();
      utils.facilities.getMapData.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to register facility");
    },
  });

  const availableCities = useMemo(() => {
    return getCitiesForDistrict(facilityForm.district);
  }, [facilityForm.district]);

  // Handle district selection change in modal
  const handleDistrictChange = (newDistrict: string) => {
    const cities = getCitiesForDistrict(newDistrict);
    const coords = getDistrictCoordinates(newDistrict);
    setFacilityForm((prev) => ({
      ...prev,
      district: newDistrict,
      village: cities[0] || "",
      latitude: Number(coords.lat.toFixed(4)),
      longitude: Number(coords.lng.toFixed(4)),
    }));
  };

  const allFacilities = facilitiesQuery.data || [];

  const filteredFacilities = useMemo(() => {
    return allFacilities.filter((f) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.district?.toLowerCase().includes(q) ||
        f.village?.toLowerCase().includes(q) ||
        (f.specialties && Array.isArray(f.specialties) && f.specialties.some((s: string) => s.toLowerCase().includes(q)));

      const matchesDistrict =
        selectedDistrictFilter === "all" ||
        f.district?.toLowerCase() === selectedDistrictFilter.toLowerCase();

      const matchesType =
        selectedTypeFilter === "all" || f.facilityType === selectedTypeFilter;

      return matchesSearch && matchesDistrict && matchesType;
    });
  }, [allFacilities, searchQuery, selectedDistrictFilter, selectedTypeFilter]);

  const stats = useMemo(() => {
    const total = allFacilities.length;
    const emergency24x7 = allFacilities.filter((f) => f.emergencyCapability?.is24x7 || (f as any).is24x7).length;
    const icu = allFacilities.filter((f) => f.emergencyCapability?.icuAvailable || (f as any).icuAvailable).length;
    const totalBeds = allFacilities.reduce((sum, f) => sum + (f.emergencyCapability?.totalBeds || (f as any).totalBeds || 0), 0);
    return { total, emergency24x7, icu, totalBeds };
  }, [allFacilities]);

  const toggleSpecialty = (spec: string) => {
    setFacilityForm((prev) => {
      const exists = prev.specialties.includes(spec);
      return {
        ...prev,
        specialties: exists
          ? prev.specialties.filter((s) => s !== spec)
          : [...prev.specialties, spec],
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Hospital className="h-5 w-5 text-emerald-600" />
            Healthcare Facilities &amp; Hospital GIS Registry
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Register and manage Sub-Centres, PHCs, CHCs, Sub-District and District Hospitals with verified GPS coordinates and live bed telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            <button
              onClick={() => setViewMode("directory")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                viewMode === "directory" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Directory ({filteredFacilities.length})
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                viewMode === "map" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Interactive GIS Map
            </button>
          </div>

          <Button
            onClick={() => {
              const defaultDist = "Nandurbar";
              const coords = getDistrictCoordinates(defaultDist);
              setFacilityForm({
                name: "",
                facilityType: "phc",
                district: defaultDist,
                village: getCitiesForDistrict(defaultDist)[0] || "",
                address: "",
                phone: "+91 98220 00000",
                latitude: Number(coords.lat.toFixed(4)),
                longitude: Number(coords.lng.toFixed(4)),
                specialties: ["General Medicine", "Obstetrics & Gynaecology"],
                capabilities: ["24x7 Labor Room", "Basic Emergency Care", "Cold Chain Storage"],
                totalBeds: 24,
                availableBeds: 14,
                icuAvailable: false,
                oxygenAvailable: true,
                is24x7: true,
              });
              setShowAddFacilityModal(true);
            }}
            className="rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Health Facility / Hospital
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-xs bg-[#e8f3ed]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Total Registered Facilities</p>
              <p className="display-font mt-1 text-2xl font-extrabold text-emerald-950">{stats.total}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Across Maharashtra districts</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-200/70 flex items-center justify-center text-emerald-800">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-[#f8e7e8]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">24x7 Emergency Units</p>
              <p className="display-font mt-1 text-2xl font-extrabold text-rose-950">{stats.emergency24x7}</p>
              <p className="text-[11px] text-rose-700 mt-0.5">Round-the-clock casualty</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-200/70 flex items-center justify-center text-rose-800">
              <HeartPulse className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-[#e4f1f8]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800">ICU-Equipped Facilities</p>
              <p className="display-font mt-1 text-2xl font-extrabold text-blue-950">{stats.icu}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">Critical care &amp; ventilators</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-200/70 flex items-center justify-center text-blue-800">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-[#fff4da]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Total Bed Capacity</p>
              <p className="display-font mt-1 text-2xl font-extrabold text-amber-950">{stats.totalBeds}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">General, maternity &amp; ICU</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-200/70 flex items-center justify-center text-amber-800">
              <Bed className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Directory vs Map View */}
      {viewMode === "map" ? (
        <Card className="border-0 shadow-xs bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Compass className="h-4 w-4 text-emerald-600" />
                Live Maharashtra Healthcare Facilities GIS Map
              </CardTitle>
              <CardDescription className="text-xs">
                Visualizing all registered government &amp; empanelled hospitals with live markers and route calculations
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                utils.facilities.getMapData.invalidate();
                toast.success("GIS Map data refreshed");
              }}
              className="rounded-full text-xs h-8 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-600" /> Refresh Map
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <HealthcareFacilityMap />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search facility by name, village, district, or specialty..."
                className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <select
                value={selectedDistrictFilter}
                onChange={(e) => setSelectedDistrictFilter(e.target.value)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-hidden"
              >
                <option value="all">All Districts (36)</option>
                {MAHARASHTRA_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>

              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-hidden"
              >
                <option value="all">All Facility Types</option>
                <option value="sub_centre">Sub-Centre (HSC)</option>
                <option value="phc">Primary Health Centre (PHC)</option>
                <option value="chc">Community Health Centre (CHC)</option>
                <option value="sub_district_hospital">Sub-District Hospital (SDH)</option>
                <option value="district_hospital">District Civil Hospital (DH)</option>
                <option value="specialist">Specialist / Medical College</option>
              </select>
            </div>
          </div>

          {/* Facility Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFacilities.map((fac) => {
              const facTypeLabels: Record<string, string> = {
                sub_centre: "Sub-Centre",
                phc: "Primary Health Centre (PHC)",
                chc: "Community Health Centre (CHC)",
                sub_district_hospital: "Sub-District Hospital",
                district_hospital: "District Civil Hospital",
                specialist: "Specialist / Medical College",
              };

              const is24x7 = fac.emergencyCapability?.is24x7 || (fac as any).is24x7;
              const icu = fac.emergencyCapability?.icuAvailable || (fac as any).icuAvailable;
              const oxygen = fac.emergencyCapability?.oxygenAvailable || (fac as any).oxygenAvailable;
              const beds = fac.emergencyCapability?.totalBeds || (fac as any).totalBeds || 0;
              const availableBeds = fac.emergencyCapability?.availableBeds || (fac as any).availableBeds || 0;

              return (
                <Card key={fac.id} className="border-0 shadow-xs bg-white hover:shadow-md transition-shadow">
                  <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-start justify-between">
                    <div>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold mb-1">
                        {facTypeLabels[fac.facilityType] || fac.facilityType}
                      </Badge>
                      <h3 className="font-bold text-sm text-slate-900 leading-snug">{fac.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                        {fac.village ? `${fac.village}, ` : ""}{fac.district}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-3 text-xs space-y-3">
                    <div className="flex items-center justify-between font-mono text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-500">GPS Coordinates:</span>
                      <span className="font-bold text-slate-700">
                        {fac.latitude ? Number(fac.latitude).toFixed(4) : "—"}, {fac.longitude ? Number(fac.longitude).toFixed(4) : "—"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Bed Availability</span>
                        <span className="font-bold text-slate-800">{availableBeds} / {beds} Beds</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Helpline</span>
                        <span className="font-bold text-slate-800 truncate block">{fac.phone || "+91 98220 00000"}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {is24x7 && (
                        <Badge className="bg-rose-100 text-rose-800 text-[10px] font-semibold">
                          24x7 Emergency
                        </Badge>
                      )}
                      {icu && (
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] font-semibold">
                          ICU Ready
                        </Badge>
                      )}
                      {oxygen && (
                        <Badge className="bg-teal-100 text-teal-800 text-[10px] font-semibold">
                          Oxygen Supply
                        </Badge>
                      )}
                    </div>

                    {fac.specialties && fac.specialties.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Key Specialties</span>
                        <div className="flex flex-wrap gap-1">
                          {fac.specialties.slice(0, 3).map((spec: string, idx: number) => (
                            <span key={idx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                              {spec}
                            </span>
                          ))}
                          {fac.specialties.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-semibold self-center">
                              +{fac.specialties.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredFacilities.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
              <Hospital className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-700">No healthcare facilities match your criteria</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the district or facility type filter.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Register Healthcare Facility / Hospital */}
      {showAddFacilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl border border-slate-200 shadow-2xl bg-white animate-in zoom-in-95 my-8">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Hospital className="h-5 w-5 text-emerald-600" />
                  Add Health Facility / Hospital
                </CardTitle>
                <CardDescription className="text-xs">
                  Register a government health centre or hospital with exact Maharashtra district mapping and GPS coordinates
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddFacilityModal(false)}
                className="rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700">Facility / Hospital Name *</label>
                  <Input
                    value={facilityForm.name}
                    onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                    placeholder="e.g. Navapur Sub-District Hospital, or Shahada PHC"
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Facility Type *</label>
                  <select
                    value={facilityForm.facilityType}
                    onChange={(e) => setFacilityForm({ ...facilityForm, facilityType: e.target.value as any })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-white text-slate-900 font-medium"
                  >
                    <option value="sub_centre">Health Sub-Centre (HSC)</option>
                    <option value="phc">Primary Health Centre (PHC)</option>
                    <option value="chc">Community Health Centre (CHC)</option>
                    <option value="sub_district_hospital">Sub-District Hospital (SDH)</option>
                    <option value="district_hospital">District Civil Hospital (DH)</option>
                    <option value="specialist">Specialist / Medical College Hospital</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Phone / Emergency Contact</label>
                  <Input
                    value={facilityForm.phone}
                    onChange={(e) => setFacilityForm({ ...facilityForm, phone: e.target.value })}
                    placeholder="+91 2564 220011"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Geographic Cascade: District & City/Village */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 space-y-3">
                <h4 className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                  Administrative Location (Maharashtra)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 text-[11px]">District *</label>
                    <select
                      value={facilityForm.district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs bg-white text-slate-900 font-medium"
                    >
                      {MAHARASHTRA_DISTRICTS.map((dist) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 text-[11px]">City / Village / Taluka *</label>
                    <select
                      value={facilityForm.village}
                      onChange={(e) => setFacilityForm({ ...facilityForm, village: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs bg-white text-slate-900 font-medium"
                    >
                      {availableCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 text-[11px]">Street Address / Landmark</label>
                  <Input
                    value={facilityForm.address}
                    onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })}
                    placeholder="e.g. Near Bus Stand, Main Road, Block Health Complex"
                    className="mt-1 text-xs bg-white"
                  />
                </div>
              </div>

              {/* GPS Coordinates & Map Placement */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                    <Navigation className="h-3.5 w-3.5 text-blue-700" />
                    GIS Location Coordinates (Leaflet Map Pin)
                  </h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const coords = getDistrictCoordinates(facilityForm.district);
                      setFacilityForm((prev) => ({
                        ...prev,
                        latitude: Number(coords.lat.toFixed(4)),
                        longitude: Number(coords.lng.toFixed(4)),
                      }));
                      toast.info(`Coordinates calibrated to ${facilityForm.district} centroid`);
                    }}
                    className="h-6 text-[10px] rounded-full bg-white text-blue-700"
                  >
                    Auto-Fill Centroid
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 text-[11px]">Latitude (deg) *</label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={facilityForm.latitude}
                      onChange={(e) => setFacilityForm({ ...facilityForm, latitude: parseFloat(e.target.value) || 0 })}
                      placeholder="21.3700"
                      className="mt-1 text-xs font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 text-[11px]">Longitude (deg) *</label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={facilityForm.longitude}
                      onChange={(e) => setFacilityForm({ ...facilityForm, longitude: parseFloat(e.target.value) || 0 })}
                      placeholder="74.2400"
                      className="mt-1 text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Bed Capacity & Clinical Capabilities */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Total Sanctioned Beds</label>
                  <Input
                    type="number"
                    value={facilityForm.totalBeds}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setFacilityForm({
                        ...facilityForm,
                        totalBeds: val,
                        availableBeds: Math.min(facilityForm.availableBeds, val),
                      });
                    }}
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Currently Available Beds</label>
                  <Input
                    type="number"
                    value={facilityForm.availableBeds}
                    onChange={(e) => setFacilityForm({ ...facilityForm, availableBeds: parseInt(e.target.value) || 0 })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Emergency Flags */}
              <div className="grid grid-cols-3 gap-2">
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold transition ${
                  facilityForm.is24x7 ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-slate-50 border-slate-200 text-slate-600"
                }`}>
                  <input
                    type="checkbox"
                    checked={facilityForm.is24x7}
                    onChange={(e) => setFacilityForm({ ...facilityForm, is24x7: e.target.checked })}
                    className="rounded text-rose-600"
                  />
                  24x7 Casualty
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold transition ${
                  facilityForm.icuAvailable ? "bg-blue-50 border-blue-200 text-blue-900" : "bg-slate-50 border-slate-200 text-slate-600"
                }`}>
                  <input
                    type="checkbox"
                    checked={facilityForm.icuAvailable}
                    onChange={(e) => setFacilityForm({ ...facilityForm, icuAvailable: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  ICU Facility
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold transition ${
                  facilityForm.oxygenAvailable ? "bg-teal-50 border-teal-200 text-teal-900" : "bg-slate-50 border-slate-200 text-slate-600"
                }`}>
                  <input
                    type="checkbox"
                    checked={facilityForm.oxygenAvailable}
                    onChange={(e) => setFacilityForm({ ...facilityForm, oxygenAvailable: e.target.checked })}
                    className="rounded text-teal-600"
                  />
                  Oxygen Supply
                </label>
              </div>

              {/* Medical Specialties */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Available Specialties &amp; Clinical Departments
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {SPECIALTY_OPTIONS.map((spec) => {
                    const isSelected = facilityForm.specialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                          isSelected
                            ? "bg-emerald-700 text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={() => {
                  if (!facilityForm.name.trim() || facilityForm.name.trim().length < 2) {
                    toast.error("Facility name must be at least 2 characters");
                    return;
                  }
                  if (!facilityForm.district.trim()) {
                    toast.error("District selection is mandatory");
                    return;
                  }
                  if (isNaN(facilityForm.latitude) || facilityForm.latitude < -90 || facilityForm.latitude > 90) {
                    toast.error("Please enter a valid Latitude (-90 to +90)");
                    return;
                  }
                  if (isNaN(facilityForm.longitude) || facilityForm.longitude < -180 || facilityForm.longitude > 180) {
                    toast.error("Please enter a valid Longitude (-180 to +180)");
                    return;
                  }

                  createFacilityMutation.mutate({
                    name: facilityForm.name.trim(),
                    facilityType: facilityForm.facilityType,
                    district: facilityForm.district.trim(),
                    village: facilityForm.village.trim() || undefined,
                    address: facilityForm.address.trim() || undefined,
                    phone: facilityForm.phone.trim() || undefined,
                    latitude: facilityForm.latitude,
                    longitude: facilityForm.longitude,
                    specialties: facilityForm.specialties,
                    capabilities: facilityForm.capabilities,
                    totalBeds: facilityForm.totalBeds,
                    availableBeds: facilityForm.availableBeds,
                    icuAvailable: facilityForm.icuAvailable,
                    oxygenAvailable: facilityForm.oxygenAvailable,
                    is24x7: facilityForm.is24x7,
                  });
                }}
                disabled={createFacilityMutation.isPending}
                className="w-full rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-10 mt-2"
              >
                {createFacilityMutation.isPending ? "Registering Facility into GIS Engine…" : "Save & Publish Health Facility"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
export default FacilitiesManagementView;
