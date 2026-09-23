import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import SupabaseAuthPortal from "@/components/SupabaseAuthPortal";
import ProfileDropdownMenu from "@/components/ProfileDropdownMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Calendar,
  Clock,
  HeartPulse,
  IdCard,
  LogOut,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import { useLocation } from "wouter";
import { getDistrictForCityOrVillage } from "@shared/maharashtraLocations";
import { getPostLoginRoute } from "@shared/authFlow";
import { toast } from "sonner";

const roleDisplayNames: Record<string, string> = {
  citizen: "Citizen",
  asha: "ASHA Worker",
  cho: "Community Health Officer (CHO)",
  asha_cho: "ASHA / CHO Worker",
  doctor: "Doctor / Medical Officer",
  facility_staff: "Facility Staff / Pharmacist",
  administrator: "Administrator",
  admin: "Administrator",
};

export default function PendingApprovalPage() {
  const { user, isAuthenticated, loading, logout, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [checking, setChecking] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f3f5f8] text-[#15181b]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
          <p className="text-xs font-semibold text-slate-500">Checking verification status...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <SupabaseAuthPortal />;
  }

  // If approved, redirect to proper dashboard
  if (user.status === "APPROVED") {
    const targetRoute = getPostLoginRoute(user.role, "APPROVED");
    if (targetRoute) {
      setLocation(targetRoute);
      return null;
    }
  }

  if (user.status === "REJECTED") {
    setLocation("/registration-rejected");
    return null;
  }

  if (user.status === "SUSPENDED") {
    setLocation("/account-suspended");
    return null;
  }

  const resolvedDistrict =
    user.district ||
    (user.village ? getDistrictForCityOrVillage(user.village) : null) ||
    (user.assignedVillage ? getDistrictForCityOrVillage(user.assignedVillage) : null) ||
    "Pune";

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await refresh();
      toast.info(`Status refreshed. Registration is under active review by the ${resolvedDistrict} District Administrator.`);
    } catch {
      toast.error("Failed to refresh status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f8] text-[#15181b] flex flex-col antialiased selection:bg-[#6c9db9]/20">
      <div className="pointer-events-none fixed -right-24 -top-24 h-96 w-96 rounded-full bg-[#dbeaf5]/60 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#fae8eb]/50 blur-3xl" />

      {/* Top Application Header */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#15181b] text-white shadow-sm">
              <HeartPulse className="h-5 w-5 text-[#8dc5e3]" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="display-font text-base font-extrabold tracking-tight">Arjuna</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">Registration Verification Console</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ProfileDropdownMenu />
          </div>
        </div>
      </header>

      {/* Main Status Container */}
      <main className="mx-auto max-w-2xl w-full flex-1 p-4 sm:p-6 sm:py-10 flex flex-col justify-center">
        <Card className="border border-black/10 bg-white shadow-2xl rounded-3xl overflow-hidden text-center">
          <CardHeader className="p-6 sm:p-10 pb-4">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm animate-pulse">
              <Clock className="h-8 w-8" />
            </div>

            <div className="inline-flex justify-center mb-2">
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-extrabold px-3 py-1">
                STATUS: PENDING APPROVAL
              </Badge>
            </div>

            <CardTitle className="display-font text-2xl font-extrabold text-slate-900">
              Registration Sent to {resolvedDistrict} District Administrator
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
              Your healthcare staff credentials have been submitted and forwarded to the <strong>{resolvedDistrict} District Health Administration</strong>. You will receive immediate clinical care workspace access upon administrator approval.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-10 pt-2 space-y-6 text-left">
            {/* Reviewing Authority Card */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Assigned Review Authority</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-indigo-950">
                <div>
                  <span className="text-indigo-600/80 font-medium">District Health Office:</span>
                  <p className="font-bold">{resolvedDistrict} District Health Administration</p>
                </div>
                <div>
                  <span className="text-indigo-600/80 font-medium">Reviewing Administrator:</span>
                  <p className="font-bold">admin.{resolvedDistrict.toLowerCase().replace(/[^a-z]/g, "")}@arjuna.gov.in</p>
                </div>
              </div>
            </div>

            {/* Applicant Summary */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 space-y-3.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Submitted Application Details</span>
                <span className="text-[10px] font-medium text-slate-500 lowercase">arjuna care network</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Applicant:</span>
                  <p className="font-bold text-slate-800">{user.name || "Healthcare Staff"}</p>
                </div>

                <div>
                  <span className="text-slate-500">Requested Role:</span>
                  <p className="font-bold text-slate-800">{roleDisplayNames[user.role] || user.role}</p>
                </div>

                <div>
                  <span className="text-slate-500">Email:</span>
                  <p className="font-bold text-slate-800 truncate">{user.email || "-"}</p>
                </div>

                <div>
                  <span className="text-slate-500">Mobile Number:</span>
                  <p className="font-bold text-slate-800">{user.phone || "-"}</p>
                </div>

                {user.employeeId && (
                  <div>
                    <span className="text-slate-500">Employee / Worker ID:</span>
                    <p className="font-bold text-slate-800">{user.employeeId}</p>
                  </div>
                )}

                {user.registrationNumber && (
                  <div>
                    <span className="text-slate-500">Medical Registration No.:</span>
                    <p className="font-bold text-slate-800">{user.registrationNumber}</p>
                  </div>
                )}

                <div>
                  <span className="text-slate-500">District:</span>
                  <p className="font-bold text-slate-800">{resolvedDistrict}</p>
                </div>

                {user.facilityName && (
                  <div>
                    <span className="text-slate-500">Assigned Facility:</span>
                    <p className="font-bold text-slate-800">{user.facilityName}</p>
                  </div>
                )}

                {(user.assignedVillage || user.village) && (
                  <div>
                    <span className="text-slate-500">Assigned City / Village:</span>
                    <p className="font-bold text-slate-800">{user.assignedVillage || user.village}</p>
                  </div>
                )}

                <div>
                  <span className="text-slate-500">Registration Date:</span>
                  <p className="font-bold text-slate-800">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Today"}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleCheckStatus}
                disabled={checking}
                className="flex-1 rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white font-bold text-xs h-11 gap-2 shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                <span>{checking ? "Checking Approval..." : "Check Approval Status"}</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => logout()}
                className="flex-1 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs h-11 gap-2"
              >
                <LogOut className="h-4 w-4 text-slate-500" />
                <span>Log Out / Switch User</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
