import React, { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import SupabaseAuthPortal from "@/components/SupabaseAuthPortal";
import { useLocation } from "wouter";
import { getPostLoginRoute } from "@shared/authFlow";
import { HeartPulse, RefreshCw } from "lucide-react";

export default function LoginPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading || !isAuthenticated || !user) return;
    const pendingRole = typeof window !== "undefined" ? localStorage.getItem("arjuna.pendingRole") : null;
    const destination = getPostLoginRoute(user.role, (user as any).status, pendingRole);
    if (destination) {
      if (pendingRole === user.role) {
        localStorage.removeItem("arjuna.pendingRole");
      }
      setLocation(destination);
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f3f5f8] text-[#15181b]">
        <div className="flex flex-col items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#15181b] text-white shadow-md animate-pulse">
            <HeartPulse className="h-6 w-6 text-[#8dc5e3]" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
            Loading Arjuna workspace...
          </div>
        </div>
      </div>
    );
  }

  // Display Supabase Auth Portal (Login / Citizen Sign Up / Staff Request)
  return <SupabaseAuthPortal />;
}
