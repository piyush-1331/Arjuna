import React from "react";
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
  ShieldAlert,
  User,
} from "lucide-react";
import { useLocation } from "wouter";
import { getDistrictForCityOrVillage } from "@shared/maharashtraLocations";

const roleDisplayNames: Record<string, string> = {
  citizen: "Citizen",
  asha: "ASHA Worker",
  cho: "Community Health Officer (CHO)",
  asha_cho: "ASHA / CHO worker",
  doctor: "Doctor / Medical Officer",
  facility_staff: "Facility Staff / Pharmacist",
  administrator: "Administrator",
  admin: "Administrator",
};

export default function PendingApprovalPage() {
  const { user, isAuthenticated, loading, logout, refresh } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f3f5f8]">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <SupabaseAuthPortal />;
  }

  // If approved, redirect to proper dashboard
  if (user.status === "APPROVED") {
    setLocation(`/dashboard/${user.role}`);
    return null;
  }

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
                <span className="rounded-md bg-[#15181b] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">AI</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">Registration Verification</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ProfileDropdownMenu />
          </div>
        </div>
      </header>

      {/* Main Status Container */}
      <main className="mx-auto max-w-2xl w-full flex-1 p-4 sm:p-6 sm:py-12 flex flex-col justify-center">
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
              Your registration is pending approval.
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
              A district health administrator is reviewing your application and professional credentials. You will be able to access the clinical care workspace as soon as your account is approved.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-10 pt-2 space-y-6 text-left">
            {/* Applicant Summary */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 space-y-3.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Submitted Application Details
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
                  <p className="font-bold text-slate-800">{user.district || (user.village ? getDistrictForCityOrVillage(user.village) : null) || (user.assignedVillage ? getDistrictForCityOrVillage(user.assignedVillage) : null) || "Pune"}</p>
                </div>

                {user.facilityName && (
                  <div>
                    <span className="text-slate-500">Assigned Facility:</span>
                    <p className="font-bold text-slate-800">{user.facilityName}</p>
                  </div>
                )}

                {user.assignedVillage && (
                  <div>
                    <span className="text-slate-500">Assigned Village:</span>
                    <p className="font-bold text-slate-800">{user.assignedVillage}</p>
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
                onClick={() => refresh()}
                className="flex-1 rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white font-bold text-xs h-11 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Check Approval Status</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/profile")}
                className="flex-1 rounded-2xl border-slate-200 text-slate-700 font-bold text-xs h-11"
              >
                View Profile Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
