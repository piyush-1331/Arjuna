import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import SupabaseAuthPortal from "@/components/SupabaseAuthPortal";
import ProfileDropdownMenu from "@/components/ProfileDropdownMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, LogOut, RefreshCw, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";

export default function AccountSuspendedPage() {
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

  return (
    <div className="min-h-screen bg-[#f3f5f8] text-[#15181b] flex flex-col antialiased selection:bg-[#6c9db9]/20">
      <div className="pointer-events-none fixed -right-24 -top-24 h-96 w-96 rounded-full bg-[#fae8eb]/60 blur-3xl" />

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
              <p className="text-[11px] font-medium text-slate-500">Security Guard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ProfileDropdownMenu />
          </div>
        </div>
      </header>

      {/* Main Status Container */}
      <main className="mx-auto max-w-xl w-full flex-1 p-4 sm:p-6 sm:py-12 flex flex-col justify-center">
        <Card className="border border-black/10 bg-white shadow-2xl rounded-3xl overflow-hidden text-center">
          <CardHeader className="p-6 sm:p-10 pb-4">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-slate-100 text-slate-700 border border-slate-300 shadow-sm">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div className="inline-flex justify-center mb-2">
              <Badge className="bg-slate-200 text-slate-900 border-slate-300 text-xs font-extrabold px-3 py-1">
                STATUS: ACCOUNT SUSPENDED
              </Badge>
            </div>

            <CardTitle className="display-font text-2xl font-extrabold text-slate-900">
              Your Arjuna account has been suspended.
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
              Access to protected clinical, screening, and supply workspaces has been paused by the system administrator.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-10 pt-2 space-y-6 text-left">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-700 space-y-2">
              <p className="font-bold text-slate-900">Next Steps:</p>
              <p className="leading-relaxed">
                Please contact the Chief Medical Officer or your District Health Administrator to reactivate your credentials.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => refresh()}
                className="flex-1 rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white font-bold text-xs h-11 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Check Status</span>
              </Button>

              <Button
                onClick={() => logout()}
                variant="outline"
                className="flex-1 rounded-2xl border-slate-200 text-slate-700 font-bold text-xs h-11 gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
