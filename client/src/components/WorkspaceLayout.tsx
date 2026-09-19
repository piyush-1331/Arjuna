import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import SupabaseAuthPortal from "@/components/SupabaseAuthPortal";
import ProfileDropdownMenu from "@/components/ProfileDropdownMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronDown,
  Database,
  HeartPulse,
  LogOut,
  MapPin,
  Menu,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { getDistrictForCityOrVillage, getStateForDistrict } from "@shared/maharashtraLocations";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

interface WorkspaceLayoutProps {
  role: "citizen" | "asha" | "cho" | "asha_cho" | "doctor" | "facility_staff" | "administrator";
  activeTab: string;
  onTabChange: (tabId: string) => void;
  navItems: NavItem[];
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  district?: string;
  village?: string;
  state?: string;
}

const roleDisplayNames: Record<string, string> = {
  citizen: "Citizen",
  asha: "ASHA Worker",
  cho: "CHO Officer",
  asha_cho: "ASHA / CHO",
  doctor: "Doctor / MO",
  facility_staff: "Facility Staff",
  administrator: "District Admin",
};

const roleRoutes: Record<string, string> = {
  citizen: "/dashboard/citizen",
  asha: "/dashboard/asha",
  cho: "/dashboard/cho",
  asha_cho: "/dashboard/asha_cho",
  doctor: "/dashboard/doctor",
  facility_staff: "/dashboard/facility_staff",
  administrator: "/dashboard/administrator",
};

export default function WorkspaceLayout({
  role,
  activeTab,
  onTabChange,
  navItems,
  title,
  subtitle,
  children,
  actions,
  district,
  village,
  state,
}: WorkspaceLayoutProps) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const effectiveDistrict =
    district ||
    user?.district ||
    (user?.village ? getDistrictForCityOrVillage(user.village) : null) ||
    (user?.assignedVillage ? getDistrictForCityOrVillage(user.assignedVillage) : null) ||
    "Pune";

  const effectiveState =
    state ||
    getStateForDistrict(effectiveDistrict, village || user?.village || user?.assignedVillage);

  const districtLabel = effectiveDistrict.toLowerCase().includes("district")
    ? effectiveDistrict
    : `${effectiveDistrict} District`;

  const {
    isOnline,
    isSyncing,
    statusText,
    pendingCount,
    triggerSync,
  } = useOfflineSync();

  const alertsQuery = trpc.alerts.list.useQuery();

  const handleSyncOffline = async () => {
    if (!isOnline) {
      toast.info("Device is currently offline. Will sync automatically when connection restores.");
      return;
    }
    if (pendingCount === 0) {
      toast.info("Offline queue is empty.");
      return;
    }
    await triggerSync();
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      const r = (user.role || "").toLowerCase();
      const s = (user.status || "APPROVED").toUpperCase();
      if (r !== "citizen" && r !== "admin" && r !== "administrator") {
        if (s === "PENDING") {
          setLocation("/pending-approval");
        } else if (s === "REJECTED") {
          setLocation("/registration-rejected");
        } else if (s === "SUSPENDED") {
          setLocation("/account-suspended");
        }
      }
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f3f5f8] dark:bg-[#0b0f14]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-500 dark:text-slate-400" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SupabaseAuthPortal />;
  }

  // Guard against unapproved staff accessing clinical dashboard
  if (
    user &&
    user.role !== "citizen" &&
    user.role !== "admin" &&
    user.role !== "administrator" &&
    (user.status || "").toUpperCase() === "PENDING"
  ) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f3f5f8] dark:bg-[#0b0f14] p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Verification In Progress</h2>
          <p className="text-xs text-slate-500">Your healthcare staff registration is pending administrator approval. Redirecting...</p>
          <Button onClick={() => setLocation("/pending-approval")} className="rounded-xl text-xs font-bold bg-[#15181b] text-white">
            View Application Status
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5f8] dark:bg-[#0b0f14] text-[#15181b] dark:text-[#f1f5f9] flex flex-col antialiased selection:bg-[#6c9db9]/20">
      {/* Decorative ambient background */}
      <div className="pointer-events-none fixed -right-24 -top-24 h-96 w-96 rounded-full bg-[#dbeaf5]/60 dark:bg-[#1e293b]/40 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#fae8eb]/50 dark:bg-[#1e293b]/30 blur-3xl" />

      {/* Top Application Header */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/85 dark:bg-[#121820]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div
              onClick={() => setLocation("/")}
              className="flex cursor-pointer items-center gap-2.5 transition hover:opacity-90"
            >
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#15181b] dark:bg-slate-800 text-white shadow-sm border border-transparent dark:border-white/10">
                <HeartPulse className="h-5 w-5 text-[#8dc5e3]" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="display-font text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Arjuna</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Universal Health Stack</p>
              </div>
            </div>
          </div>

          {/* Current Workspace Role Indicator */}
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-[#f7f9fa] dark:bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900" />
              <span>Workspace: <strong>{roleDisplayNames[role] || role}</strong></span>
            </div>

            {/* Offline/Online/Syncing Status Indicator */}
            <div className="flex items-center gap-2">
              {isSyncing ? (
                <div
                  className="flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 text-xs font-bold text-blue-800 dark:text-blue-300 shadow-xs animate-pulse"
                  title="Currently synchronizing offline records with server"
                >
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                  <span>SYNCING</span>
                </div>
              ) : !isOnline ? (
                <div
                  className="flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 shadow-xs"
                  title="Offline mode active - records will store in local IndexedDB"
                >
                  <WifiOff className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                  <span>OFFLINE</span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs"
                  title="Connected to district health network"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900" />
                  <span>ONLINE</span>
                </div>
              )}

              {/* Pending Records Action Pill */}
              {pendingCount > 0 && (
                <button
                  onClick={handleSyncOffline}
                  title="Click to sync pending mutations to district server"
                  className="flex items-center gap-1.5 rounded-full border border-amber-600 bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
                >
                  <Database className="h-3.5 w-3.5 text-amber-100" />
                  <span>{pendingCount} RECORD{pendingCount === 1 ? "" : "S"} PENDING</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Header Utilities: SOS Hotline, ThemeToggle, Notifications, User Profile */}
          <div className="flex items-center gap-2">
            <a
              href="tel:108"
              className="hidden items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 transition hover:bg-rose-100 dark:hover:bg-rose-900/80 sm:flex"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>108 Emergency</span>
            </a>

            {/* Light / Dark Mode Toggle */}
            <ThemeToggle variant="icon" />

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative h-9 w-9 rounded-xl border border-black/5 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="View notifications"
              >
                <Bell className="h-4.5 w-4.5 text-slate-700 dark:text-slate-200" />
                {(alertsQuery.data?.length ?? 0) > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </Button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xl z-50 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Live Alerts & Notifications</span>
                    <Badge variant="outline" className="text-[10px] dark:border-slate-700 dark:text-slate-300">{alertsQuery.data?.length ?? 0} active</Badge>
                  </div>
                  <div className="mt-3 max-h-72 space-y-2.5 overflow-y-auto">
                    {alertsQuery.data?.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400">No active alerts at this time.</p>
                    ) : (
                      alertsQuery.data?.map((alert) => (
                        <div key={alert.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-[#f9fafb] dark:bg-slate-800/50 p-3 text-left">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            <span>{alert.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{alert.message}</p>
                          <span className="mt-1.5 block text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <ProfileDropdownMenu />
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-black/5 dark:border-white/10 bg-white dark:bg-[#121820] p-4 lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Active Workspace</span>
              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-slate-200 dark:border-slate-700">
                {roleDisplayNames[role] || role}
              </Badge>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Navigation</span>
              <div className="mt-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold ${
                        isActive
                          ? "bg-[#15181b] dark:bg-slate-700 text-white"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-800 dark:text-slate-200">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 mt-3 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                className="w-full justify-center gap-2 rounded-xl text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 font-semibold"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace Body */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 items-start">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-black/[0.06] dark:border-white/[0.08] bg-[#f9fafb]/90 dark:bg-[#121820]/90 p-5 lg:flex sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto sidebar-scroll">
          <div className="mb-2 px-2 shrink-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {roleDisplayNames[role]} Workspace
            </p>
            <p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{districtLabel}</p>
          </div>

          <nav className="mt-4 space-y-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#15181b] dark:bg-slate-800 text-white shadow-xs border border-transparent dark:border-white/10"
                      : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/70 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid h-7 w-7 place-items-center rounded-xl ${isActive ? "bg-white/10" : "bg-black/5 dark:bg-white/5"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Safety & Protocol Badge */}
          <div className="mt-auto pt-4 shrink-0">
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#eaf2f7] dark:bg-slate-800/60 p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="h-4 w-4 text-[#4786a8] dark:text-[#6db1d6]" />
                <span>Clinical Safety Net</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                AI recommendations provide structured decision support and do not constitute a diagnostic prescription.
              </p>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10">
          {/* Top Page Title & Actions */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                <span>{effectiveState} · {effectiveDistrict}</span>
                <span>/</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{roleDisplayNames[role]}</span>
              </div>
              <h1 className="display-font mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl text-slate-900 dark:text-slate-100">
                {title}
              </h1>
              {subtitle && <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
          </div>

          {/* Workspace Views */}
          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
