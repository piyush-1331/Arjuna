import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Navigation,
  Pill,
  Sparkles,
  Phone,
  Mail,
  MessageSquare,
  Smartphone,
  RefreshCw,
  Send,
  Sliders,
  History,
  Check,
  Eye,
  Info,
  Layers,
  ChevronRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

export type NotificationEventType =
  | "appointment_reminder"
  | "follow_up_reminder"
  | "overdue_follow_up"
  | "referral_status"
  | "medicine_availability"
  | "low_stock"
  | "health_campaign_assignment"
  | "emergency_referral_alert"
  | "system_alert"
  | "account_status";

const EVENT_TYPE_METADATA: Record<
  NotificationEventType,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    badgeBg: string;
    defaultTitle: string;
    defaultMessage: string;
    defaultPriority: "routine" | "medium" | "high" | "emergency";
  }
> = {
  appointment_reminder: {
    label: "Appointment Reminder",
    icon: Calendar,
    color: "text-blue-600",
    bg: "bg-blue-50",
    badgeBg: "bg-blue-100 text-blue-900 border-blue-200",
    defaultTitle: "Appointment Reminder: OPD Consultation",
    defaultMessage: "Your scheduled follow-up consultation with Dr. Sharma at Sundarpur PHC is tomorrow at 10:00 AM. Please carry your previous prescription card.",
    defaultPriority: "routine",
  },
  follow_up_reminder: {
    label: "Care Follow-up Reminder",
    icon: Clock,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-200",
    defaultTitle: "ASHA Care Visit Scheduled",
    defaultMessage: "Village ASHA worker home visit scheduled for blood pressure and medication adherence check on Friday.",
    defaultPriority: "medium",
  },
  overdue_follow_up: {
    label: "Overdue Follow-up Alert",
    icon: AlertTriangle,
    color: "text-rose-600",
    bg: "bg-rose-50",
    badgeBg: "bg-rose-100 text-rose-900 border-rose-200",
    defaultTitle: "CRITICAL: Field Care Follow-up Overdue",
    defaultMessage: "Meena Patel's blood pressure follow-up is overdue by 48 hours. Immediate ASHA home outreach required.",
    defaultPriority: "high",
  },
  referral_status: {
    label: "Referral Status Update",
    icon: Navigation,
    color: "text-amber-600",
    bg: "bg-amber-50",
    badgeBg: "bg-amber-100 text-amber-900 border-amber-200",
    defaultTitle: "Referral Transit Update: In Transit",
    defaultMessage: "Patient Asha Devi has departed Rampura Sub-Centre via 108 Emergency Ambulance en route to Sanand CHC.",
    defaultPriority: "medium",
  },
  medicine_availability: {
    label: "Medicine Availability",
    icon: Pill,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-200",
    defaultTitle: "Prescription Drug Restocked",
    defaultMessage: "Amlodipine 5mg has been restocked at Sundarpur PHC Pharmacy (200 strips available).",
    defaultPriority: "routine",
  },
  low_stock: {
    label: "Low Stock Buffer Alert",
    icon: AlertCircle,
    color: "text-purple-600",
    bg: "bg-purple-50",
    badgeBg: "bg-purple-100 text-purple-900 border-purple-200",
    defaultTitle: "Pharmacy Formulary Buffer Alert",
    defaultMessage: "Metformin 500mg has fallen below minimum reorder threshold (18 < 30 strips) at Sanand CHC.",
    defaultPriority: "high",
  },
  health_campaign_assignment: {
    label: "Health Campaign Assignment",
    icon: Sparkles,
    color: "text-teal-600",
    bg: "bg-teal-50",
    badgeBg: "bg-teal-100 text-teal-900 border-teal-200",
    defaultTitle: "Campaign Staffing Notification",
    defaultMessage: "You have been allocated to the Mukhyamantri Diabetes Screening Drive covering Sundarpur Block.",
    defaultPriority: "medium",
  },
  emergency_referral_alert: {
    label: "Emergency 108 Alert",
    icon: ShieldAlert,
    color: "text-rose-700",
    bg: "bg-rose-100",
    badgeBg: "bg-rose-600 text-white font-black",
    defaultTitle: "EMERGENCY 108 REFERRAL ALERT",
    defaultMessage: "Immediate red-flag referral triggered for Critical High-Risk ANC case in Rampura. Emergency desk alerted.",
    defaultPriority: "emergency",
  },
  system_alert: {
    label: "System Security Alert",
    icon: ShieldAlert,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-200",
    defaultTitle: "System Security & Administrative Alert",
    defaultMessage: "Administrative security notice regarding system policy updates.",
    defaultPriority: "routine",
  },
  account_status: {
    label: "Account Status Update",
    icon: ShieldCheck,
    color: "text-teal-600",
    bg: "bg-teal-50",
    badgeBg: "bg-teal-100 text-teal-900 border-teal-200",
    defaultTitle: "Account Status Changed",
    defaultMessage: "Your account registration or role verification status has been updated.",
    defaultPriority: "routine",
  },
};

export function NotificationCenter({
  role = "administrator",
}: {
  role?: "administrator" | "asha_cho" | "doctor" | "citizen" | "facility_staff";
}) {
  const [activeTab, setActiveTab] = useState<"feed" | "history" | "preferences" | "test">("feed");
  const [filterReadStatus, setFilterReadStatus] = useState<"all" | "unread" | "read">("all");
  const [filterEventType, setFilterEventType] = useState<string>("all");

  const utils = trpc.useUtils();

  // Queries
  const notificationsQuery = trpc.notifications.list.useQuery(
    {
      isRead: filterReadStatus === "unread" ? false : filterReadStatus === "read" ? true : undefined,
      eventType: filterEventType !== "all" ? (filterEventType as NotificationEventType) : undefined,
    },
    { refetchOnWindowFocus: false, staleTime: 10000 }
  );

  const historyQuery = trpc.notifications.getHistory.useQuery(
    {},
    { refetchOnWindowFocus: false, staleTime: 30000 }
  );

  const preferencesQuery = trpc.notifications.getPreferences.useQuery(
    undefined,
    { refetchOnWindowFocus: false, staleTime: 60000 }
  );

  const providerStatusQuery = trpc.notifications.getProviderStatus.useQuery(
    undefined,
    { refetchOnWindowFocus: false, staleTime: 60000 }
  );

  // Mutations
  const markReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.alerts.list.invalidate();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: (data) => {
      toast.success(`Marked ${data.markedCount} notifications as read.`);
      utils.notifications.list.invalidate();
      utils.alerts.list.invalidate();
    },
  });

  const updatePreferencesMutation = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences saved successfully!");
      utils.notifications.getPreferences.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to update preferences: ${err.message}`);
    },
  });

  const sendTestMutation = trpc.notifications.sendTest.useMutation({
    onSuccess: (data) => {
      toast.success(`Test notification dispatched! ID: ${data.historyEntryId}`);
      utils.notifications.list.invalidate();
      utils.notifications.getHistory.invalidate();
    },
    onError: (err) => {
      toast.error(`Dispatch failed: ${err.message}`);
    },
  });

  // Test Dispatch Form State
  const [testEventType, setTestEventType] = useState<NotificationEventType>("appointment_reminder");
  const [testRecipientName, setTestRecipientName] = useState("Ramesh Kumar (Beneficiary)");
  const [testPhone, setTestPhone] = useState("+91-9876543210");
  const [testWhatsApp, setTestWhatsApp] = useState("+91-9876543210");
  const [testEmail, setTestEmail] = useState("ramesh.patel@example.gov.in");
  const [testTitle, setTestTitle] = useState(EVENT_TYPE_METADATA.appointment_reminder.defaultTitle);
  const [testMessage, setTestMessage] = useState(EVENT_TYPE_METADATA.appointment_reminder.defaultMessage);
  const [testPriority, setTestPriority] = useState<"routine" | "medium" | "high" | "emergency">("routine");
  const [testChannels, setTestChannels] = useState<string[]>(["in_app", "sms", "whatsapp", "email"]);

  // Local preferences copy for form editing
  const [prefsForm, setPrefsForm] = useState(preferencesQuery.data);

  // Synchronize preferences query with local state
  React.useEffect(() => {
    if (preferencesQuery.data) {
      setPrefsForm(preferencesQuery.data);
    }
  }, [preferencesQuery.data]);

  const handleEventTypeChangeForTest = (type: NotificationEventType) => {
    setTestEventType(type);
    const meta = EVENT_TYPE_METADATA[type];
    setTestTitle(meta.defaultTitle);
    setTestMessage(meta.defaultMessage);
    setTestPriority(meta.defaultPriority);
  };

  const handleToggleTestChannel = (channel: string) => {
    setTestChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleSavePreferences = () => {
    if (!prefsForm) return;
    updatePreferencesMutation.mutate({
      channels: prefsForm.channels,
      events: prefsForm.events,
      contactInfo: prefsForm.contactInfo,
    });
  };

  const handleExecuteSendTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (testChannels.length === 0) {
      toast.error("Please select at least one delivery channel.");
      return;
    }

    sendTestMutation.mutate({
      eventType: testEventType,
      recipientName: testRecipientName,
      recipientPhone: testPhone,
      recipientWhatsApp: testWhatsApp,
      recipientEmail: testEmail,
      title: testTitle,
      message: testMessage,
      priority: testPriority,
      channels: testChannels as any,
    });
  };

  const notifications = notificationsQuery.data?.notifications || [];
  const unreadCount = notificationsQuery.data?.unreadCount || 0;
  const historyEntries = historyQuery.data || [];
  const providerTelemetry = providerStatusQuery.data;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-sm border border-slate-700">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[11px] font-bold uppercase tracking-wider">
              Multi-Channel Healthcare Communications
            </Badge>
            <span className="text-slate-400 text-xs">·</span>
            <span className="text-xs text-slate-300 font-medium">In-App · SMS · WhatsApp · Email</span>
          </div>
          <h2 className="display-font text-2xl font-black mt-2 tracking-tight text-white flex items-center gap-2.5">
            <Bell className="h-6 w-6 text-blue-400" />
            Healthcare Notification System &amp; History
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Automated delivery pipeline for appointment alerts, maternal care visits, overdue follow-ups, referral status updates, and pharmacy stock notifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => {
              notificationsQuery.refetch();
              historyQuery.refetch();
              preferencesQuery.refetch();
            }}
            variant="outline"
            size="sm"
            className="rounded-full bg-slate-800/80 hover:bg-slate-700 border-slate-600 text-slate-200 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${notificationsQuery.isFetching ? "animate-spin text-blue-400" : ""}`} />
            Refresh Feed
          </Button>

          {unreadCount > 0 && (
            <Button
              onClick={() => markAllReadMutation.mutate()}
              size="sm"
              variant="secondary"
              className="rounded-full text-xs font-bold gap-1 bg-white text-slate-900 hover:bg-slate-100"
            >
              <Check className="h-3.5 w-3.5" />
              Mark All Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* 2. Provider Abstraction Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* In-App Provider */}
        <Card className="border-0 shadow-xs bg-white rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
              <Bell className="h-4 w-4 text-blue-600" />
              <span>In-App Channel</span>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              LIVE (ACTIVE)
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Real-time feed &amp; unread badges stored in system state.
          </p>
        </Card>

        {/* SMS Provider */}
        <Card className="border-0 shadow-xs bg-white rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
              <Smartphone className="h-4 w-4 text-amber-600" />
              <span>SMS Gateway</span>
            </div>
            <Badge
              className={
                providerTelemetry?.sms.isConfigured
                  ? "bg-emerald-100 text-emerald-800 text-[10px] font-bold"
                  : "bg-amber-100 text-amber-900 text-[10px] font-bold"
              }
            >
              {providerTelemetry?.sms.isConfigured ? "LIVE GATEWAY" : "MOCK SIMULATION"}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            CDAC / Twilio gateway integration with mock fallback.
          </p>
        </Card>

        {/* WhatsApp Provider */}
        <Card className="border-0 shadow-xs bg-white rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              <span>WhatsApp API</span>
            </div>
            <Badge
              className={
                providerTelemetry?.whatsapp.isConfigured
                  ? "bg-emerald-100 text-emerald-800 text-[10px] font-bold"
                  : "bg-emerald-100 text-emerald-900 text-[10px] font-bold"
              }
            >
              {providerTelemetry?.whatsapp.isConfigured ? "LIVE API" : "MOCK SIMULATION"}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Meta Cloud Health Templates with mock fallback.
          </p>
        </Card>

        {/* Email Provider */}
        <Card className="border-0 shadow-xs bg-white rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
              <Mail className="h-4 w-4 text-purple-600" />
              <span>Email Provider</span>
            </div>
            <Badge
              className={
                providerTelemetry?.email.isConfigured
                  ? "bg-emerald-100 text-emerald-800 text-[10px] font-bold"
                  : "bg-purple-100 text-purple-900 text-[10px] font-bold"
              }
            >
              {providerTelemetry?.email.isConfigured ? "LIVE SMTP" : "MOCK SIMULATION"}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            SMTP &amp; Resend dispatch pipeline with mock fallback.
          </p>
        </Card>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab("feed")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "feed"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          In-App Feed ({notifications.length})
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "history"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Multi-Channel Audit History ({historyEntries.length})
        </button>

        <button
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "preferences"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          Notification Preferences
        </button>

        <button
          onClick={() => setActiveTab("test")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "test"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Send className="h-3.5 w-3.5 text-blue-400" />
          Test Notification Sandbox
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: IN-APP NOTIFICATIONS FEED */}
      {/* ========================================================================= */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          {/* Feed Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Read/Unread Filters */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-semibold">
                {["all", "unread", "read"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterReadStatus(status as any)}
                    className={`px-3 py-1 rounded-full capitalize transition ${
                      filterReadStatus === status
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Event Type Filter */}
              <Select value={filterEventType} onValueChange={setFilterEventType}>
                <SelectTrigger className="h-8 w-48 rounded-full bg-white text-xs border-slate-200">
                  <SelectValue placeholder="All 8 Event Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All 8 Event Types</SelectItem>
                  {Object.entries(EVENT_TYPE_METADATA).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <strong>{notifications.length}</strong> items ({unreadCount} unread)
            </div>
          </div>

          {/* Feed List */}
          <div className="space-y-3">
            {notifications.map((n) => {
              const meta = EVENT_TYPE_METADATA[n.eventType] || EVENT_TYPE_METADATA.appointment_reminder;
              const IconComponent = meta.icon;

              return (
                <Card
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markReadMutation.mutate({ id: n.id });
                  }}
                  className={`border-0 shadow-xs rounded-2xl transition cursor-pointer hover:shadow-sm ${
                    n.isRead ? "bg-white opacity-85" : "bg-white ring-1 ring-blue-500/30"
                  }`}
                >
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className={`p-2.5 rounded-2xl shrink-0 ${meta.bg} ${meta.color}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={meta.badgeBg}>{meta.label}</Badge>
                          {!n.isRead && (
                            <Badge className="bg-rose-500 text-white font-extrabold text-[9px] uppercase px-1.5 py-0.2">
                              UNREAD
                            </Badge>
                          )}
                          <span className="text-[11px] text-slate-400 font-medium">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                          {n.message}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right space-y-2">
                      {!n.isRead ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            markReadMutation.mutate({ id: n.id });
                          }}
                          className="rounded-full text-xs text-blue-700 hover:bg-blue-50 h-7 px-2.5 font-semibold"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Mark Read
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Read
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {notifications.length === 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 space-y-2">
                <Bell className="mx-auto h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No notifications in feed</p>
                <p className="text-xs text-slate-400">All healthcare communication items are up to date.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: MULTI-CHANNEL NOTIFICATION HISTORY */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="display-font text-base font-bold text-slate-900">
                Multi-Channel Dispatch Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                Complete historical record of dispatches across In-App, SMS, WhatsApp, and Email with verified delivery telemetry.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              {historyEntries.length} Dispatches Recorded
            </Badge>
          </div>

          <div className="space-y-3">
            {historyEntries.map((h) => {
              const meta = EVENT_TYPE_METADATA[h.eventType] || EVENT_TYPE_METADATA.appointment_reminder;

              return (
                <Card key={h.id} className="border-0 shadow-xs bg-white rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={meta.badgeBg}>{meta.label}</Badge>
                        <span className="text-xs font-bold text-slate-800">
                          Recipient: {h.recipientName}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{h.title}</h4>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 font-medium">
                      {new Date(h.dispatchedAt).toLocaleString()}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600">{h.message}</p>

                  {/* Channel Delivery Breakdown */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Delivery Status by Channel:</span>
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                      {h.deliveryResults.map((r, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold capitalize text-slate-800">{r.channel}</span>
                            <Badge
                              className={
                                r.status === "delivered" && r.mode === "live"
                                  ? "bg-emerald-100 text-emerald-800 text-[9px] font-bold"
                                  : r.status === "simulated_mock"
                                  ? "bg-amber-100 text-amber-900 text-[9px] font-bold"
                                  : "bg-rose-100 text-rose-800 text-[9px] font-bold"
                              }
                            >
                              {r.mode === "live" ? "DELIVERED (LIVE)" : "SIMULATED MOCK"}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">
                            {r.deliveryNote}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}

            {historyEntries.length === 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100">
                <p className="text-xs text-slate-400">No notification dispatch history recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: NOTIFICATION PREFERENCES */}
      {/* ========================================================================= */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Delivery Channels */}
            <Card className="border-0 shadow-xs bg-white rounded-3xl p-6 space-y-4">
              <div>
                <CardTitle className="display-font text-base font-bold">
                  Active Delivery Channels
                </CardTitle>
                <CardDescription className="text-xs">
                  Toggle communication mediums for receiving healthcare alerts.
                </CardDescription>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-bold text-xs text-slate-900">In-App Notifications</p>
                      <p className="text-[10px] text-slate-500">Live feed inside Arjuna dashboard</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefsForm?.channels.inApp ?? true}
                    onCheckedChange={(checked) =>
                      setPrefsForm((prev) =>
                        prev ? { ...prev, channels: { ...prev.channels, inApp: checked } } : prev
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-bold text-xs text-slate-900">SMS Alerts</p>
                      <p className="text-[10px] text-slate-500">Direct mobile text message updates</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefsForm?.channels.sms ?? true}
                    onCheckedChange={(checked) =>
                      setPrefsForm((prev) =>
                        prev ? { ...prev, channels: { ...prev.channels, sms: checked } } : prev
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-bold text-xs text-slate-900">WhatsApp Health Updates</p>
                      <p className="text-[10px] text-slate-500">Official WhatsApp template alerts</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefsForm?.channels.whatsapp ?? true}
                    onCheckedChange={(checked) =>
                      setPrefsForm((prev) =>
                        prev ? { ...prev, channels: { ...prev.channels, whatsapp: checked } } : prev
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-bold text-xs text-slate-900">Email Digests &amp; Reports</p>
                      <p className="text-[10px] text-slate-500">Comprehensive summary documents</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefsForm?.channels.email ?? true}
                    onCheckedChange={(checked) =>
                      setPrefsForm((prev) =>
                        prev ? { ...prev, channels: { ...prev.channels, email: checked } } : prev
                      )
                    }
                  />
                </div>
              </div>
            </Card>

            {/* Event Subscriptions */}
            <Card className="border-0 shadow-xs bg-white rounded-3xl p-6 space-y-4">
              <div>
                <CardTitle className="display-font text-base font-bold">
                  Event Subscriptions (8 Types)
                </CardTitle>
                <CardDescription className="text-xs">
                  Subscribe to specific clinical, operational, and emergency notifications.
                </CardDescription>
              </div>

              <div className="space-y-2.5 pt-2 text-xs">
                {[
                  { key: "emergencyAlerts", label: "Emergency 108 Critical Referrals" },
                  { key: "overdueFollowUp", label: "Overdue Field Follow-up Alerts" },
                  { key: "appointmentReminder", label: "OPD Appointment Reminders" },
                  { key: "followUpReminder", label: "ASHA / CHO Care Visit Reminders" },
                  { key: "referralStatus", label: "Referral Lifecycle Progression" },
                  { key: "medicineAvailability", label: "Pharmacy Medicine Restock Notices" },
                  { key: "lowStock", label: "Drug Buffer & Formulary Low Stock" },
                  { key: "campaignAssignment", label: "Health Campaign Allocations" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-800">{item.label}</span>
                    <Switch
                      checked={(prefsForm?.events as any)?.[item.key] ?? true}
                      onCheckedChange={(checked) =>
                        setPrefsForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                events: {
                                  ...prev.events,
                                  [item.key]: checked,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Contact Information & Language */}
          <Card className="border-0 shadow-xs bg-white rounded-3xl p-6 space-y-4">
            <div>
              <CardTitle className="display-font text-base font-bold">
                Contact Coordinates &amp; Multilingual Delivery
              </CardTitle>
              <CardDescription className="text-xs">
                Communication endpoints used for dispatching SMS, WhatsApp, and Email alerts.
              </CardDescription>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-2 text-xs">
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Mobile Phone (SMS)</Label>
                <Input
                  value={prefsForm?.contactInfo.phone || ""}
                  onChange={(e) =>
                    setPrefsForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            contactInfo: { ...prev.contactInfo, phone: e.target.value },
                          }
                        : prev
                    )
                  }
                  placeholder="+91-9876543210"
                  className="rounded-xl bg-slate-50 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-700">WhatsApp Number</Label>
                <Input
                  value={prefsForm?.contactInfo.whatsappNumber || ""}
                  onChange={(e) =>
                    setPrefsForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            contactInfo: { ...prev.contactInfo, whatsappNumber: e.target.value },
                          }
                        : prev
                    )
                  }
                  placeholder="+91-9876543210"
                  className="rounded-xl bg-slate-50 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Email Address</Label>
                <Input
                  value={prefsForm?.contactInfo.email || ""}
                  onChange={(e) =>
                    setPrefsForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            contactInfo: { ...prev.contactInfo, email: e.target.value },
                          }
                        : prev
                    )
                  }
                  placeholder="officer@ahmedabad.gov.in"
                  className="rounded-xl bg-slate-50 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="font-bold text-xs text-slate-700">Preferred Language:</Label>
                <Select
                  value={prefsForm?.contactInfo.language || "en"}
                  onValueChange={(val) =>
                    setPrefsForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            contactInfo: { ...prev.contactInfo, language: val as any },
                          }
                        : prev
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-36 rounded-full bg-slate-50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="gu">ગુજરાતી (Gujarati)</SelectItem>
                    <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSavePreferences}
                disabled={updatePreferencesMutation.isPending}
                className="rounded-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-5"
              >
                {updatePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: TEST NOTIFICATION DISPATCHER SANDBOX */}
      {/* ========================================================================= */}
      {activeTab === "test" && (
        <Card className="border-0 shadow-xs bg-white rounded-3xl p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-[10px] font-bold uppercase">
                Diagnostic Sandbox
              </Badge>
            </div>
            <CardTitle className="display-font text-lg font-bold text-slate-900 mt-1">
              Dispatch Multi-Channel Test Notification
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Trigger any of the 8 notification events to test delivery across In-App, SMS, WhatsApp, and Email providers.
            </CardDescription>
          </div>

          <form onSubmit={handleExecuteSendTest} className="space-y-4 text-xs">
            {/* 8 Event Preset Selectors */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Select Healthcare Event Preset:</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(EVENT_TYPE_METADATA).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleEventTypeChangeForTest(key as NotificationEventType)}
                    className={`text-left p-2.5 rounded-2xl border transition ${
                      testEventType === key
                        ? "border-blue-500 bg-blue-50/80 shadow-xs font-bold"
                        : "border-slate-200 bg-white hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <p className="text-xs text-slate-900">{meta.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient & Channels */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Recipient Name</Label>
                <Input
                  value={testRecipientName}
                  onChange={(e) => setTestRecipientName(e.target.value)}
                  className="rounded-xl bg-slate-50 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Priority Level</Label>
                <Select
                  value={testPriority}
                  onValueChange={(val) => setTestPriority(val as any)}
                >
                  <SelectTrigger className="rounded-xl bg-slate-50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="emergency">Emergency 108</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Channels Checklist */}
            <div className="space-y-1">
              <Label className="font-bold text-slate-700">Select Dispatch Channels:</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  { id: "in_app", label: "In-App Notification Feed" },
                  { id: "sms", label: "SMS Gateway (Mock/Live)" },
                  { id: "whatsapp", label: "WhatsApp Template (Mock/Live)" },
                  { id: "email", label: "Email (Mock/Live)" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleToggleTestChannel(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      testChannels.includes(c.id)
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {testChannels.includes(c.id) && "✓ "}
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Message */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Notification Title</Label>
                <Input
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="rounded-xl bg-slate-50 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Notification Content / Message</Label>
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="rounded-xl bg-slate-50 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={sendTestMutation.isPending}
                className="rounded-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-6 gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {sendTestMutation.isPending ? "Dispatching..." : "Dispatch Notification"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
