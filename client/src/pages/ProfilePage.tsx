import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import SupabaseAuthPortal from "@/components/SupabaseAuthPortal";
import ProfileDropdownMenu from "@/components/ProfileDropdownMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Droplet,
  Edit3,
  HeartPulse,
  IdCard,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const roleDisplayNames: Record<string, string> = {
  citizen: "Citizen",
  asha: "ASHA Worker",
  cho: "CHO Officer",
  asha_cho: "ASHA / CHO",
  doctor: "Doctor",
  facility_staff: "Facility Staff",
  administrator: "District Administrator",
  admin: "District Administrator",
};

export default function ProfilePage() {
  const { user, isAuthenticated, loading: authLoading, refresh } = useAuth();
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Load latest profile data directly from profile endpoint
  const profileQuery = trpc.profile.get.useQuery(undefined, {
    enabled: Boolean(isAuthenticated || user),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const currentUser = profileQuery.data || user;

  // Check URL query param for edit mode (e.g., /profile?edit=true)
  const isInitialEdit = typeof window !== "undefined" && (window.location.search.includes("edit=true") || window.location.href.includes("edit=true"));
  const [isEditing, setIsEditing] = useState(isInitialEdit);

  useEffect(() => {
    if (typeof window !== "undefined" && (window.location.search.includes("edit=true") || window.location.href.includes("edit=true"))) {
      setIsEditing(true);
    }
  }, [location]);

  // Form fields for editable data
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(currentUser?.dateOfBirth || "");
  const [age, setAge] = useState<number | string>(currentUser?.age ?? "");
  const [gender, setGender] = useState(currentUser?.gender || "female");
  const [village, setVillage] = useState(currentUser?.village || "");
  const [district, setDistrict] = useState(currentUser?.district || "Ahmedabad Rural");
  const [address, setAddress] = useState(currentUser?.address || "");
  const [pincode, setPincode] = useState(currentUser?.pincode || "");
  const [emergencyContactName, setEmergencyContactName] = useState(currentUser?.emergencyContactName || "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(currentUser?.emergencyContactPhone || "");
  const [bloodGroup, setBloodGroup] = useState(currentUser?.bloodGroup || "");
  const [allergies, setAllergies] = useState(currentUser?.allergies || "");
  const [conditions, setConditions] = useState(currentUser?.conditions || "");
  const [abhaId, setAbhaId] = useState(currentUser?.abhaId || "");

  useEffect(() => {
    if (currentUser && !isEditing) {
      setName(currentUser.name || "");
      setPhone(currentUser.phone || "");
      setDateOfBirth(currentUser.dateOfBirth || "");
      setAge(currentUser.age ?? "");
      setGender(currentUser.gender || "female");
      setVillage(currentUser.village || "");
      setDistrict(currentUser.district || "Ahmedabad Rural");
      setAddress(currentUser.address || "");
      setPincode(currentUser.pincode || "");
      setEmergencyContactName(currentUser.emergencyContactName || "");
      setEmergencyContactPhone(currentUser.emergencyContactPhone || "");
      setBloodGroup(currentUser.bloodGroup || "");
      setAllergies(currentUser.allergies || "");
      setConditions(currentUser.conditions || "");
      setAbhaId(currentUser.abhaId || "");
    }
  }, [currentUser, isEditing]);

  // Automatically calculate age when Date of Birth is updated
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dobValue = e.target.value;
    setDateOfBirth(dobValue);
    if (dobValue) {
      const parsed = new Date(dobValue);
      if (!isNaN(parsed.getTime())) {
        const diffMs = Date.now() - parsed.getTime();
        const calculatedAge = Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
        setAge(calculatedAge);
      }
    }
  };

  const updateProfileMutation = trpc.profile.update.useMutation();

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f3f5f8]">
        <div className="text-center space-y-2">
          <HeartPulse className="h-8 w-8 text-slate-700 animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !user && !currentUser) {
    return <SupabaseAuthPortal />;
  }

  const status = (currentUser.status || "APPROVED").toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      age: age !== "" && !isNaN(Number(age)) ? Number(age) : undefined,
      gender: gender || undefined,
      village: village.trim() || undefined,
      district: district || undefined,
      address: address.trim() || undefined,
      pincode: pincode.trim() || undefined,
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      bloodGroup: bloodGroup || undefined,
      allergies: allergies.trim() || undefined,
      conditions: conditions.trim() || undefined,
      abhaId: abhaId.trim() || undefined,
    };

    try {
      if (supabase) {
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: payload.name,
              name: payload.name,
              phone: payload.phone,
              date_of_birth: payload.dateOfBirth,
              age: payload.age,
              gender: payload.gender,
              village: payload.village,
              district: payload.district,
              address: payload.address,
              pincode: payload.pincode,
              emergency_contact_name: payload.emergencyContactName,
              emergency_contact_phone: payload.emergencyContactPhone,
              blood_group: payload.bloodGroup,
              allergies: payload.allergies,
              conditions: payload.conditions,
              abha_id: payload.abhaId,
            },
          });
        } catch (sbErr) {
          console.warn("[Supabase] Client user_metadata update warning:", sbErr);
        }
      }

      const res = await updateProfileMutation.mutateAsync(payload);

      if (res?.user) {
        utils.auth.me.setData(undefined, res.user as any);
        utils.profile.get.setData(undefined, res.user as any);
        setName(res.user.name || "");
        setPhone(res.user.phone || "");
        setDateOfBirth(res.user.dateOfBirth || "");
        setAge(res.user.age ?? "");
        setGender(res.user.gender || "female");
        setVillage(res.user.village || "");
        setDistrict(res.user.district || "Ahmedabad Rural");
        setAddress(res.user.address || "");
        setPincode(res.user.pincode || "");
        setEmergencyContactName(res.user.emergencyContactName || "");
        setEmergencyContactPhone(res.user.emergencyContactPhone || "");
        setBloodGroup(res.user.bloodGroup || "");
        setAllergies(res.user.allergies || "");
        setConditions(res.user.conditions || "");
        setAbhaId(res.user.abhaId || "");
      }

      toast.success("Profile details saved and updated successfully.");
      setIsEditing(false);

      // Invalidate and refetch queries immediately
      await Promise.all([
        utils.auth.me.invalidate(),
        utils.profile.get.invalidate(),
        utils.patients.list.invalidate(),
        utils.patients.timeline.invalidate(),
        utils.patients.getProfile.invalidate(),
        utils.dashboard.overview.invalidate(),
        utils.alerts.list.invalidate(),
        utils.notifications.list.invalidate(),
        utils.notifications.getHistory.invalidate(),
      ]);
      await profileQuery.refetch();
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold px-3 py-1 flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>APPROVED</span>
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold px-3 py-1 flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5 text-amber-700" />
            <span>PENDING APPROVAL</span>
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-bold px-3 py-1 flex items-center gap-1.5 text-xs">
            <XCircle className="h-3.5 w-3.5 text-rose-700" />
            <span>REGISTRATION REJECTED</span>
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge className="bg-slate-200 text-slate-800 border-slate-300 font-bold px-3 py-1 flex items-center gap-1.5 text-xs">
            <ShieldAlert className="h-3.5 w-3.5 text-slate-600" />
            <span>ACCOUNT SUSPENDED</span>
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f8] text-[#15181b] flex flex-col antialiased selection:bg-[#6c9db9]/20">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div
            onClick={() => setLocation("/")}
            className="flex cursor-pointer items-center gap-2.5 transition hover:opacity-90"
          >
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#15181b] text-white shadow-sm">
              <HeartPulse className="h-5 w-5 text-[#8dc5e3]" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="display-font text-base font-extrabold tracking-tight">Arjuna</span>
                <span className="rounded-md bg-[#15181b] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">AI</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">Account & Profile</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ProfileDropdownMenu />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl w-full flex-1 p-4 sm:p-6 sm:py-8 space-y-6">
        {/* Navigation & Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const targetWorkspace = user?.role ? `/dashboard/${user.role === "admin" ? "administrator" : user.role}` : "/";
                setLocation(targetWorkspace);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to workspace</span>
            </button>
            <h1 className="display-font text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              User Profile & Identity
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your personal identity, demographic attributes, medical baseline, and emergency contacts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (currentUser) {
                    setName(currentUser.name || "");
                    setPhone(currentUser.phone || "");
                    setDateOfBirth(currentUser.dateOfBirth || "");
                    setAge(currentUser.age ?? "");
                    setGender(currentUser.gender || "female");
                    setVillage(currentUser.village || "");
                    setDistrict(currentUser.district || "Ahmedabad Rural");
                    setAddress(currentUser.address || "");
                    setPincode(currentUser.pincode || "");
                    setEmergencyContactName(currentUser.emergencyContactName || "");
                    setEmergencyContactPhone(currentUser.emergencyContactPhone || "");
                    setBloodGroup(currentUser.bloodGroup || "");
                    setAllergies(currentUser.allergies || "");
                    setConditions(currentUser.conditions || "");
                    setAbhaId(currentUser.abhaId || "");
                  }
                  setIsEditing(true);
                }}
                className="rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white font-bold text-xs gap-1.5 h-10 px-4 cursor-pointer shadow-xs"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditing(false);
                }}
                className="rounded-2xl border-slate-200 text-slate-700 font-bold text-xs gap-1.5 h-10 px-4 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLocation("/change-password");
              }}
              className="rounded-2xl border-slate-200 text-slate-700 font-bold text-xs gap-1.5 h-10 px-4 cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5 text-slate-500" />
              <span>Change Password</span>
            </Button>
          </div>
        </div>

        {/* Rejection Alert Banner if Rejected */}
        {status === "REJECTED" && (
          <div className="rounded-3xl bg-rose-50 border border-rose-200 p-5 shadow-xs flex items-start gap-3.5">
            <XCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-900">Registration Not Approved</h3>
              <p className="text-xs text-rose-800 leading-relaxed mt-1">
                Your staff registration request was reviewed and rejected by the district administrator.
              </p>
              {currentUser.rejectionReason && (
                <p className="text-xs font-semibold text-rose-950 mt-2 bg-white/70 p-2.5 rounded-xl border border-rose-200">
                  <strong>Reason:</strong> {currentUser.rejectionReason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Profile Card */}
        <Card className="border border-black/10 bg-white shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 sm:p-8 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#15181b] text-white text-xl font-extrabold shadow-md">
                {currentUser.name
                  ? currentUser.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : "AR"}
              </div>
              <div>
                <h2 className="display-font text-xl font-extrabold text-slate-900">{currentUser.name || "Care Member"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {roleDisplayNames[currentUser.role] || currentUser.role}
                  </span>
                  {currentUser.district && <span className="text-xs text-slate-500">· {currentUser.district}</span>}
                  {currentUser.age ? <span className="text-xs text-slate-500">· {currentUser.age} yrs</span> : null}
                </div>
              </div>
            </div>

            <div>{getStatusBadge()}</div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            {isEditing ? (
              /* EDIT PROFILE FORM */
              <form onSubmit={handleSave} className="space-y-6">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
                  <strong>Notice:</strong> All personal demographics, age, health records, and emergency contacts are securely stored in the health database and synced across your care workflows.
                </div>

                {/* Section 1: Basic Identity & Contact Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    1. Identity & Contact Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Full Name *</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        required
                        className="rounded-2xl border-slate-200 bg-slate-50 h-11 text-sm focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Mobile Number</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98221 00000"
                        className="rounded-2xl border-slate-200 bg-slate-50 h-11 text-sm focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Demographics & Physical Profile */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    2. Demographics & Age
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Date of Birth</Label>
                      <Input
                        type="date"
                        value={dateOfBirth}
                        onChange={handleDobChange}
                        className="rounded-2xl border-slate-200 bg-slate-50 h-11 text-sm focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Age (Years)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="130"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 42"
                        className="rounded-2xl border-slate-200 bg-slate-50 h-11 text-sm focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Gender</Label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium focus:bg-white"
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                        <option value="undisclosed">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Health & Medical Baseline */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    3. Health, Blood Group & Medical Baseline
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Blood Group</Label>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium focus:bg-white"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">ABHA / Ayushman Health ID</Label>
                      <Input
                        value={abhaId}
                        onChange={(e) => setAbhaId(e.target.value)}
                        placeholder="e.g. 91-8201-4401-9921"
                        className="rounded-2xl border-slate-200 bg-slate-50 h-11 text-sm focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Known Allergies</Label>
                      <Input
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="e.g. Penicillin, Dust, Sulfa, None"
                        className="rounded-2xl border-slate-200 bg-slate-50 h-11 text-sm focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Chronic / Existing Conditions</Label>
                      <Input
                        value={conditions}
                        onChange={(e) => setConditions(e.target.value)}
                        placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma"
                        className="rounded-2xl border-slate-200 bg-slate-50 h-11 text-sm focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Location & Address */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    4. Residential & Administrative Location
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Village / Town</Label>
                      <Input
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        placeholder="e.g. Karanji Budruk"
                        className="rounded-2xl border-slate-200 bg-slate-50 h-11 text-sm focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">District</Label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium focus:bg-white"
                      >
                        <option value="Ahmedabad Rural">Ahmedabad Rural</option>
                        <option value="Nandurbar">Nandurbar</option>
                        <option value="Nashik">Nashik</option>
                        <option value="Pune">Pune</option>
                        <option value="Gadchiroli">Gadchiroli</option>
                        <option value="Amravati">Amravati</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Street / House Address</Label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House No, Ward, Street"
                        className="rounded-2xl border-slate-200 bg-slate-50 h-11 text-sm focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Postal Pincode</Label>
                      <Input
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="e.g. 423101"
                        className="rounded-2xl border-slate-200 bg-slate-50 h-11 text-sm focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Emergency Contacts */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    5. Emergency Contact Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Emergency Contact Person</Label>
                      <Input
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        placeholder="e.g. Ramesh More (Brother / Spouse)"
                        className="rounded-2xl border-slate-200 bg-slate-50 h-11 text-sm focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Emergency Contact Mobile</Label>
                      <Input
                        value={emergencyContactPhone}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        placeholder="+91 98221 00000"
                        className="rounded-2xl border-slate-200 bg-slate-50 h-11 text-sm focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="rounded-2xl border-slate-200 text-slate-700 font-bold text-xs h-11 px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white font-bold text-xs h-11 px-6 gap-2 shadow-sm"
                  >
                    <Save className="h-4 w-4" />
                    <span>{updateProfileMutation.isPending ? "Saving Profile..." : "Save Changes"}</span>
                  </Button>
                </div>
              </form>
            ) : (
              /* VIEW PROFILE DETAILS */
              <div className="space-y-8">
                {/* 1. Account & Contact Information */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Contact & Identity Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>Email Address</span>
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1 truncate">{currentUser.email || "Not specified"}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>Mobile Number</span>
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.phone || "Not specified"}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>District</span>
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.district || "Ahmedabad Rural"}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>Village / Town</span>
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.village || "Not specified"}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>Date of Birth / Age</span>
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1">
                        {currentUser.dateOfBirth ? `${currentUser.dateOfBirth} (${currentUser.age || "N/A"} yrs)` : currentUser.age ? `${currentUser.age} years` : "Not specified"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>Gender</span>
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1 capitalize">{currentUser.gender || "Not specified"}</p>
                    </div>

                    {currentUser.address && (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>Address</span>
                        </span>
                        <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.address}</p>
                      </div>
                    )}

                    {currentUser.pincode && (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>Pincode</span>
                        </span>
                        <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.pincode}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Health & Medical Profile */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Health Baseline & Medical Identity
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <Droplet className="h-3.5 w-3.5 text-rose-500" />
                        <span>Blood Group</span>
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.bloodGroup || "Not recorded"}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <IdCard className="h-3.5 w-3.5 text-indigo-500" />
                        <span>ABHA Health ID</span>
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1">
                        {currentUser.abhaId || `91-8201-${String(currentUser.id || 9921).padStart(4, "0")}`}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        <span>Allergies</span>
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.allergies || "None reported"}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-blue-500" />
                        <span>Chronic Conditions</span>
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.conditions || "None reported"}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Emergency Contact Information */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Emergency Contact Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                        <span>Emergency Contact Person</span>
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.emergencyContactName || "Not specified"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <PhoneCall className="h-3.5 w-3.5 text-slate-400" />
                        <span>Emergency Phone</span>
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.emergencyContactPhone || "Not specified"}</p>
                    </div>
                  </div>
                </div>

                {/* 4. Professional & Identity Information (for Staff/Doctor/Admin) */}
                {currentUser.role !== "citizen" && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Professional & Staff Credentials
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentUser.employeeId && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                            <IdCard className="h-3.5 w-3.5 text-slate-400" />
                            <span>Staff / Worker ID</span>
                          </span>
                          <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.employeeId}</p>
                        </div>
                      )}

                      {currentUser.registrationNumber && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                            <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                            <span>Medical Registration No.</span>
                          </span>
                          <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.registrationNumber}</p>
                        </div>
                      )}

                      {currentUser.designation && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-slate-400" />
                            <span>Designation</span>
                          </span>
                          <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.designation}</p>
                        </div>
                      )}

                      {currentUser.facilityName && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>Assigned Facility</span>
                          </span>
                          <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.facilityName}</p>
                        </div>
                      )}

                      {currentUser.assignedVillage && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>Assigned Village</span>
                          </span>
                          <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.assignedVillage}</p>
                        </div>
                      )}

                      {currentUser.approvedBy && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                            <span>Approved By</span>
                          </span>
                          <p className="text-xs font-bold text-slate-900 mt-1">Administrator ({currentUser.approvedBy})</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
