import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  EyeOff,
  HeartPulse,
  Info,
  Lock,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  buildSupabaseSignUpOptions,
  getSupabaseSignUpMessage,
  HealthcareStaffRole,
  validateSupabaseCredentials,
} from "@shared/supabaseAuthFlow";
import { getPasswordStrengthLabel, validatePasswordStrength } from "@shared/passwordPolicy";
import { MAHARASHTRA_DISTRICTS, getCitiesForDistrict } from "@shared/maharashtraLocations";
import { useLocation } from "wouter";

type AuthTab = "login" | "citizen" | "staff";

interface Props {
  onAuthenticated?: () => void;
}

export default function SupabaseAuthPortal({ onAuthenticated }: Props) {
  const [tab, setTab] = useState<AuthTab>("login");
  const [, setLocation] = useLocation();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // Staff specific states
  const [staffRole, setStaffRole] = useState<HealthcareStaffRole>("doctor");
  const [employeeId, setEmployeeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [assignedVillage, setAssignedVillage] = useState("");

  const passwordStrength = validatePasswordStrength(password);
  const strengthInfo = getPasswordStrengthLabel(passwordStrength.score);

  const handleLogin = async () => {
    if (!supabase) {
      toast.error("Supabase is not configured for this environment.");
      return;
    }
    const err = validateSupabaseCredentials({ mode: "login", email: email.trim(), password });
    if (err) {
      toast.error(err);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success("Signed in successfully.");
      refresh();
      onAuthenticated?.();
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "Authentication failed. Check your credentials.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCitizenRegister = async () => {
    if (!supabase) {
      toast.error("Supabase is not configured for this environment.");
      return;
    }
    if (!district) {
      toast.error("Please select your district.");
      return;
    }
    if (!gender) {
      toast.error("Please select your gender.");
      return;
    }
    const err = validateSupabaseCredentials({
      mode: "citizen_register",
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      confirmPassword,
      phone: phone.trim(),
      district,
      village,
      dateOfBirth,
      gender,
      emergencyContactName,
      emergencyContactPhone,
    });
    if (err) {
      toast.error(err);
      return;
    }

    setLoading(true);
    try {
      let computedAge: number | null = null;
      if (dateOfBirth) {
        const parsedDob = new Date(dateOfBirth);
        if (!isNaN(parsedDob.getTime())) {
          const diffMs = Date.now() - parsedDob.getTime();
          computedAge = Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
        }
      }

      const metadata = {
        full_name: fullName.trim(),
        selected_role: "citizen",
        phone: phone.trim(),
        district,
        village,
        date_of_birth: dateOfBirth,
        age: computedAge,
        gender,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
      };

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: buildSupabaseSignUpOptions(metadata),
      });

      if (error) throw error;

      if (!data.session) {
        toast.success(getSupabaseSignUpMessage(false, "citizen"), { duration: 6000 });
        setTab("login");
        setPassword("");
        setConfirmPassword("");
      } else {
        toast.success(getSupabaseSignUpMessage(true, "citizen"));
        refresh();
        onAuthenticated?.();
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffRegister = async () => {
    if (!supabase) {
      toast.error("Supabase is not configured for this environment.");
      return;
    }
    if (!district) {
      toast.error("Please select your district.");
      return;
    }
    const err = validateSupabaseCredentials({
      mode: "staff_register",
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      confirmPassword,
      role: staffRole,
      phone: phone.trim(),
      district,
      employeeId,
      designation,
      facilityName,
      registrationNumber,
      assignedVillage,
    });
    if (err) {
      toast.error(err);
      return;
    }

    setLoading(true);
    try {
      const metadata = {
        full_name: fullName.trim(),
        selected_role: staffRole,
        phone: phone.trim(),
        district,
        employee_id: employeeId.trim(),
        designation: designation.trim(),
        facility_name: facilityName.trim(),
        registration_number: registrationNumber.trim(),
        assigned_village: assignedVillage.trim(),
      };

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: buildSupabaseSignUpOptions(metadata),
      });

      if (error) throw error;

      toast.success("Healthcare staff registration submitted! Your account is PENDING administrator approval.", {
        duration: 7000,
      });
      setTab("login");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Staff registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f8] text-[#15181b] flex items-center justify-center py-10 px-4 sm:px-6 antialiased selection:bg-[#6c9db9]/20">
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none fixed -right-24 -top-24 h-96 w-96 rounded-full bg-[#dbeaf5]/60 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#fae8eb]/50 blur-3xl" />

      <div className="mx-auto max-w-5xl w-full grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        {/* Left Side: Brand Narrative */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#15181b] text-white shadow-md">
              <HeartPulse className="h-6 w-6 text-[#8dc5e3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="display-font text-2xl font-extrabold tracking-tight">Arjuna</span>
                <span className="rounded-md bg-[#15181b] px-2 py-0.5 text-xs font-bold text-white uppercase">AI</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Universal Health Stack · Rural Care Platform</p>
            </div>
          </div>

          <h1 className="display-font text-3xl font-extrabold tracking-tight sm:text-5xl text-slate-900 leading-[1.1]">
            Evidence-based healthcare coordination for rural communities.
          </h1>

          <p className="text-sm leading-relaxed text-slate-600 max-w-lg">
            Role-governed clinical decision support, deterministic safety-net screening, intelligent GIS referrals, and pharmacy supply assurance across Maharashtra districts.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white/80 p-3.5 shadow-xs">
              <UserCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-slate-800">Citizens:</strong> Direct self-registration with immediate health plan access.
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white/80 p-3.5 shadow-xs">
              <Stethoscope className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-slate-800">Healthcare Staff:</strong> ASHA, CHO, Doctors, and Facility staff require administrator credential verification.
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-black/5 bg-[#eaf2f7] p-3.5 shadow-xs">
              <ShieldCheck className="h-5 w-5 text-[#4786a8] shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700">
                <strong>Safety Guard:</strong> AI recommendations provide structured decision support and do not constitute autonomous clinical diagnosis.
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <Card className="border border-black/10 bg-white shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-4 pt-6 px-6 sm:px-8 border-b border-black/5">
            {/* Tabs Header */}
            <div className="flex rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTab("login")}
                className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${
                  tab === "login"
                    ? "bg-[#15181b] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setTab("citizen")}
                className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${
                  tab === "citizen"
                    ? "bg-[#15181b] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Citizen Sign Up
              </button>
              <button
                type="button"
                onClick={() => setTab("staff")}
                className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${
                  tab === "staff"
                    ? "bg-[#15181b] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Staff Request
              </button>
            </div>

            <CardTitle className="display-font mt-4 text-xl font-bold">
              {tab === "login" && "Access your workspace"}
              {tab === "citizen" && "Citizen Self-Registration"}
              {tab === "staff" && "Healthcare Staff Registration"}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {tab === "login" && "Enter your email and password to log in to Arjuna."}
              {tab === "citizen" && "Create your patient profile. Instant access upon registration."}
              {tab === "staff" && "Healthcare worker accounts require administrator approval before access."}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* 1. LOGIN FORM */}
            {tab === "login" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleLogin();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      required
                      placeholder="name@example.gov.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 rounded-2xl bg-slate-50 border-slate-200 h-11 text-sm focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">Password</Label>
                    <button
                      type="button"
                      onClick={() => setLocation("/forgot-password")}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 rounded-2xl bg-slate-50 border-slate-200 h-11 text-sm focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white h-11 font-bold text-sm shadow-md mt-2"
                >
                  {loading ? "Signing in..." : "Log in to Arjuna"}
                </Button>
              </form>
            )}

            {/* 2. CITIZEN REGISTRATION FORM */}
            {tab === "citizen" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleCitizenRegister();
                }}
                className="space-y-3.5"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Full Name *</Label>
                  <Input
                    required
                    placeholder="Ramesh Patel"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Email Address *</Label>
                    <Input
                      type="email"
                      required
                      placeholder="citizen@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Mobile Number *</Label>
                    <Input
                      type="tel"
                      required
                      placeholder="+91 98221 00000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">District (Maharashtra) *</Label>
                    <select
                      value={district}
                      onChange={(e) => {
                        setDistrict(e.target.value);
                        setVillage("");
                      }}
                      className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium focus:bg-white text-slate-900"
                    >
                      <option value="">Select District</option>
                      {MAHARASHTRA_DISTRICTS.map((dist) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div
                    className="space-y-1.5 relative cursor-pointer"
                    onClickCapture={(e) => {
                      if (!district) {
                        e.stopPropagation();
                        toast.error("Please select a district first");
                      }
                    }}
                  >
                    <Label className="text-xs font-bold text-slate-700">City / Village / Taluka</Label>
                    <select
                      value={village}
                      disabled={!district}
                      onChange={(e) => setVillage(e.target.value)}
                      className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed text-slate-900"
                    >
                      <option value="">{district ? "Select City / Village / Taluka" : "Please select district first"}</option>
                      {district && getCitiesForDistrict(district).map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                      {village && district && !getCitiesForDistrict(district).includes(village) && (
                        <option value={village}>{village}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Date of Birth</Label>
                    <Input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Gender</Label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium focus:bg-white text-slate-900"
                    >
                      <option value="">Select Gender</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Emergency Contact</Label>
                    <Input
                      placeholder="Contact Name"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Emergency Phone</Label>
                    <Input
                      type="tel"
                      placeholder="+91 98221 11111"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                    />
                  </div>
                </div>

                {/* Password & Confirmation */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Minimum 8 characters with upper, lower, number, symbol"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Strength:</span>
                      <span className={`font-bold ${strengthInfo.color}`}>{strengthInfo.label}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10 rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white h-11 font-bold text-sm shadow-md mt-2"
                >
                  {loading ? "Creating account..." : "Register as Citizen"}
                </Button>
              </form>
            )}

            {/* 3. HEALTHCARE STAFF REGISTRATION FORM */}
            {tab === "staff" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleStaffRegister();
                }}
                className="space-y-3.5"
              >
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Administrator Approval Required:</strong> Healthcare staff accounts require credential verification by a district administrator before workspace access is unlocked.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Requested Healthcare Role *</Label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as HealthcareStaffRole)}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold"
                  >
                    <option value="doctor">Doctor / Medical Officer (MO)</option>
                    <option value="asha">ASHA Worker</option>
                    <option value="cho">Community Health Officer (CHO)</option>
                    <option value="facility_staff">Facility Staff / Pharmacist</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Full Name *</Label>
                  <Input
                    required
                    placeholder="Dr. Rajesh Deshmukh"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Official Email *</Label>
                    <Input
                      type="email"
                      required
                      placeholder="doctor.rajesh@arjuna.gov.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Mobile Number *</Label>
                    <Input
                      type="tel"
                      required
                      placeholder="+91 94221 00000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">District (Maharashtra) *</Label>
                  <select
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setAssignedVillage("");
                    }}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium focus:bg-white text-slate-900"
                  >
                    <option value="">Select District</option>
                    {MAHARASHTRA_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role Specific Dynamic Fields */}
                {staffRole === "doctor" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Medical Reg. Number *</Label>
                      <Input
                        required
                        placeholder="MMC/2018/12345"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Employee ID</Label>
                      <Input
                        placeholder="EMP-DOC-102"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                      />
                    </div>
                  </div>
                )}

                {staffRole === "asha" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">ASHA Worker ID</Label>
                      <Input
                        placeholder="ASHA-MH-442"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                      />
                    </div>
                    <div
                      className="space-y-1.5 relative cursor-pointer"
                      onClickCapture={(e) => {
                        if (!district) {
                          e.stopPropagation();
                          toast.error("Please select a district first");
                        }
                      }}
                    >
                      <Label className="text-xs font-bold text-slate-700">Assigned Village *</Label>
                      <select
                        value={assignedVillage}
                        disabled={!district}
                        onChange={(e) => setAssignedVillage(e.target.value)}
                        className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed text-slate-900"
                      >
                        <option value="">{district ? "Select Assigned Village / Taluka" : "Please select district first"}</option>
                        {district && getCitiesForDistrict(district).map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                        {assignedVillage && district && !getCitiesForDistrict(district).includes(assignedVillage) && (
                          <option value={assignedVillage}>{assignedVillage}</option>
                        )}
                      </select>
                    </div>
                  </div>
                )}

                {staffRole === "cho" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">CHO Employee ID</Label>
                      <Input
                        placeholder="CHO-NAND-88"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Health & Wellness Centre</Label>
                      <Input
                        placeholder="Karanji HWC"
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                      />
                    </div>
                  </div>
                )}

                {staffRole === "facility_staff" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Designation</Label>
                      <Input
                        placeholder="Chief Pharmacist / Nurse"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Facility / Hospital</Label>
                      <Input
                        placeholder="Nandurbar Sub-District Hospital"
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Password & Confirmation */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Minimum 8 characters with upper, lower, number, symbol"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Strength:</span>
                      <span className={`font-bold ${strengthInfo.color}`}>{strengthInfo.label}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10 rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white h-11 font-bold text-sm shadow-md mt-2"
                >
                  {loading ? "Submitting request..." : "Submit Registration Request"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
