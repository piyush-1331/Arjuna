import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import WorkspaceLayout, { NavItem } from "@/components/WorkspaceLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend as RechartsLegend,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  FileSpreadsheet,
  FileText,
  History,
  Hospital,
  Info,
  Layers,
  LineChart as LineChartIcon,
  Navigation,
  Package,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  X,
  Zap,
} from "lucide-react";

export default function FacilityStaffWorkspace() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("facility_dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [dispensaryFilter, setDispensaryFilter] = useState<string>("active");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>("ALL");

  // 1. Add Medicine Modal State
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [newMedForm, setNewMedForm] = useState({
    name: "",
    category: "Hypertension",
    currentStock: 50,
    reorderLevel: 20,
    unit: "strips",
    batchNumber: "",
    expiryDate: "",
    notes: "",
  });

  // 2. Receive Stock Modal State
  const [receiveStockModal, setReceiveStockModal] = useState<{
    id: number;
    name: string;
    currentStock: number;
    unit: string;
    batchNumber?: string;
  } | null>(null);
  const [receiveStockForm, setReceiveStockForm] = useState({
    quantity: 50,
    batchNumber: "",
    expiryDate: "",
    notes: "",
  });

  // 3. Stock Edit / Reconcile Modal State
  const [editStockModal, setEditStockModal] = useState<{
    id: number;
    name: string;
    currentStock: number;
    unit: string;
  } | null>(null);
  const [newStockVal, setNewStockVal] = useState("");
  const [editStockReason, setEditStockReason] = useState("");

  // 4. Set Reorder Threshold Modal State
  const [reorderThresholdModal, setReorderThresholdModal] = useState<{
    id: number;
    name: string;
    reorderLevel: number;
    unit: string;
  } | null>(null);
  const [newThresholdVal, setNewThresholdVal] = useState(10);

  // 5. Direct Dispense Modal State
  const [dispenseDirectModal, setDispenseDirectModal] = useState<{
    id: number;
    name: string;
    currentStock: number;
    unit: string;
    batchNumber?: string;
  } | null>(null);
  const [dispenseDirectForm, setDispenseDirectForm] = useState({
    quantity: 1,
    patientId: 1,
    notes: "",
  });

  // 6. View Single Medicine History Modal
  const [selectedMedicineHistoryId, setSelectedMedicineHistoryId] = useState<number | null>(null);

  // 7. Prescription Dispense Modal
  const [dispenseModal, setDispenseModal] = useState<{
    id: number;
    medicineName: string;
    dosage: string;
    route: string;
    patientName: string;
    instructions?: string;
  } | null>(null);
  const [dispenseNotes, setDispenseNotes] = useState("");

  // 8. Reorder requisition modal
  const [reorderModal, setReorderModal] = useState<{ id: number; name: string; currentStock: number; reorderLevel: number } | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(100);

  // 9. Referral Lifecycle Action Modal & Timeline
  const [selectedTimelineReferralId, setSelectedTimelineReferralId] = useState<number | null>(null);
  const [referralStatusModal, setReferralStatusModal] = useState<{
    id: number;
    patientName: string;
    nextStatus: string;
    actionLabel: string;
  } | null>(null);
  const [statusNotes, setStatusNotes] = useState("");
  const [transportVehicleInput, setTransportVehicleInput] = useState("108 Emergency Ambulance #GJ-01-204");
  const [transportDriverContactInput, setTransportDriverContactInput] = useState("+91 98 7654 3210 (Driver Ramesh)");
  const [outcomeInput, setOutcomeInput] = useState("");

  // 10. AI Demand Forecasting State
  const [selectedForecastMedicineId, setSelectedForecastMedicineId] = useState<number | null>(null);
  const [forecastSearchQuery, setForecastSearchQuery] = useState("");
  const [showModelBreakdown, setShowModelBreakdown] = useState(false);

  // Queries
  const utils = trpc.useUtils();
  const overview = trpc.dashboard.overview.useQuery();
  const inventory = trpc.inventory.list.useQuery();
  const prescriptions = trpc.prescriptions.list.useQuery();
  const medicineAnalytics = trpc.inventory.analytics.useQuery();
  const transactionsQuery = trpc.inventory.transactions.useQuery();
  const referrals = trpc.referrals.list.useQuery();
  const patients = trpc.patients.list.useQuery();

  const referralTimelineQuery = trpc.referrals.getTimeline.useQuery(
    { id: selectedTimelineReferralId! },
    { enabled: !!selectedTimelineReferralId }
  );

  const singleMedicineHistoryQuery = trpc.inventory.getById.useQuery(
    { id: selectedMedicineHistoryId! },
    { enabled: !!selectedMedicineHistoryId }
  );

  const facilityForecastsQuery = trpc.demandForecasting.getFacilityForecasts.useQuery(
    { facilityId: 1 },
    { staleTime: 30000 }
  );

  const facilityForecasts = facilityForecastsQuery.data || [];
  const effectiveForecastMedicineId = selectedForecastMedicineId ?? (
    facilityForecasts.find(f => f.stockOutRisk === "CRITICAL" || f.stockOutRisk === "HIGH")?.medicineId ?? facilityForecasts[0]?.medicineId ?? 1
  );

  const detailedForecastQuery = trpc.demandForecasting.getMedicineForecast.useQuery(
    { medicineId: effectiveForecastMedicineId, facilityId: 1 },
    { enabled: !!effectiveForecastMedicineId, staleTime: 30000 }
  );

  // Mutations
  const addMedicineMutation = trpc.inventory.add.useMutation({
    onSuccess: (data) => {
      toast.success(`Medicine "${data.medicine?.name}" added to facility inventory`);
      setShowAddMedModal(false);
      setNewMedForm({
        name: "",
        category: "Hypertension",
        currentStock: 50,
        reorderLevel: 20,
        unit: "strips",
        batchNumber: "",
        expiryDate: "",
        notes: "",
      });
      utils.inventory.list.invalidate();
      utils.inventory.analytics.invalidate();
      utils.inventory.transactions.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const receiveStockMutation = trpc.inventory.receive.useMutation({
    onSuccess: (data) => {
      toast.success(`Stock received! New balance: ${data.medicine?.currentStock} ${data.medicine?.unit}`);
      setReceiveStockModal(null);
      setReceiveStockForm({ quantity: 50, batchNumber: "", expiryDate: "", notes: "" });
      utils.inventory.list.invalidate();
      utils.inventory.analytics.invalidate();
      utils.inventory.transactions.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStockMutation = trpc.inventory.update.useMutation({
    onSuccess: (data) => {
      toast.success(`Inventory stock adjusted to ${data.medicine?.currentStock} ${data.medicine?.unit}`);
      setEditStockModal(null);
      setEditStockReason("");
      utils.inventory.list.invalidate();
      utils.inventory.analytics.invalidate();
      utils.inventory.transactions.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const setReorderThresholdMutation = trpc.inventory.setReorderThreshold.useMutation({
    onSuccess: (data) => {
      toast.success(`Reorder threshold for "${data.medicine?.name}" set to ${data.medicine?.reorderLevel} ${data.medicine?.unit}`);
      setReorderThresholdModal(null);
      utils.inventory.list.invalidate();
      utils.inventory.analytics.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const dispenseDirectMutation = trpc.inventory.dispense.useMutation({
    onSuccess: (data) => {
      toast.success(`Dispensed ${data.transaction?.quantity} ${data.medicine?.unit}. Remaining stock: ${data.medicine?.currentStock}`);
      setDispenseDirectModal(null);
      setDispenseDirectForm({ quantity: 1, patientId: 1, notes: "" });
      utils.inventory.list.invalidate();
      utils.inventory.analytics.invalidate();
      utils.inventory.transactions.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const dispensePrescriptionMutation = trpc.prescriptions.dispense.useMutation({
    onSuccess: () => {
      toast.success("Medication dispensed to patient and stock ledger updated");
      setDispenseModal(null);
      setDispenseNotes("");
      utils.prescriptions.list.invalidate();
      utils.inventory.list.invalidate();
      utils.inventory.analytics.invalidate();
      utils.inventory.transactions.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateReferral = trpc.referrals.updateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`Referral lifecycle updated to ${data.referral.status}`);
      setReferralStatusModal(null);
      setStatusNotes("");
      setOutcomeInput("");
      utils.referrals.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const allMedicines = inventory.data || [];
  const allTransactions = transactionsQuery.data || [];
  const analyticsData = medicineAnalytics.data;

  const lowStockItems = allMedicines.filter((m) => m.status === "LOW STOCK" || m.currentStock <= m.reorderLevel);
  const outOfStockItems = allMedicines.filter((m) => m.status === "OUT OF STOCK" || m.currentStock === 0);
  const expiringItems = allMedicines.filter((m) => m.status === "EXPIRING SOON" || (m.daysUntilExpiry !== null && m.daysUntilExpiry <= 90));
  const reorderAlerts = analyticsData?.reorderAlerts || [];
  const facilityReferrals = referrals.data || [];
  const allPrescriptions = prescriptions.data || [];
  const pendingPrescriptions = allPrescriptions.filter((p) => p.status === "active");

  const filteredMedicines = allMedicines.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.batchNumber && m.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === "all" || m.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesStatus = selectedStatusFilter === "all" || m.status === selectedStatusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const filteredTransactions = allTransactions.filter((t) => {
    if (transactionTypeFilter === "ALL") return true;
    return t.transactionType === transactionTypeFilter;
  });

  const criticalForecastCount = facilityForecasts.filter(f => f.stockOutRisk === "CRITICAL" || f.stockOutRisk === "HIGH").length;

  const navItems: NavItem[] = [
    { id: "facility_dashboard", label: "Facility Dashboard", icon: Activity },
    { id: "demand_forecasting", label: "AI Demand Forecasting", icon: TrendingUp, badge: criticalForecastCount > 0 ? `${criticalForecastCount} Alert` : "AI" },
    { id: "dispensary", label: "Pharmacy Dispensary", icon: Pill, badge: pendingPrescriptions.length > 0 ? pendingPrescriptions.length : undefined },
    { id: "inventory", label: "Medicine Inventory", icon: Package, badge: allMedicines.length },
    { id: "transactions", label: "Stock Ledger & Audits", icon: History, badge: allTransactions.length },
    { id: "low_stock", label: "Low Stock Alert", icon: AlertTriangle, badge: lowStockItems.length > 0 ? lowStockItems.length : undefined },
    { id: "expiring", label: "Expiring Medicines", icon: Clock, badge: expiringItems.length > 0 ? expiringItems.length : undefined },
    { id: "reorder_alerts", label: "Reorder & Supply Chain", icon: ShoppingCart, badge: reorderAlerts.length },
    { id: "referrals", label: "Facility Referrals", icon: Navigation, badge: facilityReferrals.length },
  ];

  return (
    <WorkspaceLayout
      role="facility_staff"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      navItems={navItems}
      title={
        activeTab === "facility_dashboard"
          ? "Primary Health Centre Operations & Pharmacy"
          : activeTab === "demand_forecasting"
          ? "AI-Assisted Medicine Demand Forecasting (Prototype)"
          : activeTab === "dispensary"
          ? "Digital Prescriptions & Pharmacy Dispensary Desk"
          : activeTab === "inventory"
          ? "Pharmacy Inventory & Drug Formulary"
          : activeTab === "transactions"
          ? "Medicine Transactions Ledger & Stock Audit Trail"
          : activeTab === "low_stock"
          ? "Critical Low Stock & Buffer Alerts"
          : activeTab === "expiring"
          ? "Expiring Batches & Stock Rotation"
          : activeTab === "reorder_alerts"
          ? "Purchase Requisitions & District Reorders"
          : "Inbound Patient Admission & Referrals"
      }
      subtitle={user?.name ? `${user.facilityName || "Sundarpur Primary Health Centre (PHC)"} · ${user.name} (${user.designation || "Pharmacist & Facility Staff"})` : "Sundarpur Primary Health Centre (PHC) · Pharmacy & Operations Desk"}
      actions={
        activeTab === "inventory" ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowAddMedModal(true)}
              className="rounded-full bg-[#15181b] hover:bg-slate-800 text-white text-xs font-semibold h-8 px-4"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Medicine
            </Button>
            <Button
              onClick={() => toast.success("Inventory stock report exported as CSV")}
              variant="outline"
              className="rounded-full bg-white text-xs font-semibold h-8"
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Export Stock CSV
            </Button>
          </div>
        ) : activeTab === "demand_forecasting" ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                facilityForecastsQuery.refetch();
                detailedForecastQuery.refetch();
                toast.success("Forecasting time-series models re-calculated");
              }}
              variant="outline"
              className="rounded-full bg-white text-xs font-semibold h-8 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-purple-600" /> Recalculate Models
            </Button>
          </div>
        ) : undefined
      }
    >
      {/* 1. FACILITY DASHBOARD VIEW */}
      {activeTab === "facility_dashboard" && (
        <div className="space-y-6">
          {/* Key Metric Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-xs bg-[#e4f1f8]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-blue-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total SKUs in Stock</span>
                  <Package className="h-4 w-4" />
                </div>
                <p className="display-font mt-4 text-3xl font-extrabold text-blue-900">{allMedicines.length} Medicines</p>
                <div className="mt-2 flex items-center justify-between text-xs text-blue-700">
                  <span>In-stock: {allMedicines.filter((m) => m.status === "IN STOCK").length}</span>
                  <span className="font-semibold text-rose-700">Out: {outOfStockItems.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-[#f8e7e8]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-rose-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Low Stock & Out</span>
                  <AlertOctagon className="h-4 w-4" />
                </div>
                <p className="display-font mt-4 text-3xl font-extrabold text-rose-900">{lowStockItems.length} Drugs</p>
                <p className="mt-2 text-xs text-rose-700">Below minimum buffer threshold</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-[#fff4da]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-amber-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Expiring Soon (&lt;90d)</span>
                  <Clock className="h-4 w-4" />
                </div>
                <p className="display-font mt-4 text-3xl font-extrabold text-amber-900">{expiringItems.length} Batches</p>
                <p className="mt-2 text-xs text-amber-800">Require FEFO stock rotation</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xs bg-[#e8f3ed]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Stock Transactions</span>
                  <History className="h-4 w-4" />
                </div>
                <p className="display-font mt-4 text-3xl font-extrabold text-emerald-900">{allTransactions.length}</p>
                <p className="mt-2 text-xs text-emerald-700">Audited dispensing & receipts</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Action Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Low Stock Warning Card */}
            <Card className="border-0 shadow-xs bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Critical Formulary</p>
                  <CardTitle className="display-font mt-1 text-lg font-bold">Medicines Requiring Immediate Reorder</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("low_stock")} className="text-xs font-semibold">
                  View all
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {lowStockItems.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">All drug stock levels are healthy.</p>
                ) : (
                  lowStockItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-rose-950 text-sm">{item.name}</p>
                          <Badge className={item.currentStock === 0 ? "bg-rose-700 text-white text-[10px]" : "bg-amber-600 text-white text-[10px]"}>
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-rose-700 mt-0.5">Stock: <strong>{item.currentStock} {item.unit}</strong> · Threshold: {item.reorderLevel}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setReceiveStockModal({ id: item.id, name: item.name, currentStock: item.currentStock, unit: item.unit, batchNumber: item.batchNumber })}
                        className="rounded-full bg-rose-700 text-white text-xs h-8"
                      >
                        <Plus className="mr-1 h-3 w-3" /> Receive Stock
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Dispensary Queue Preview */}
            <Card className="border-0 shadow-xs bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pharmacy Queue</p>
                  <CardTitle className="display-font mt-1 text-lg font-bold">Active Prescriptions Waiting</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("dispensary")} className="text-xs font-semibold">
                  Open Desk
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingPrescriptions.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No pending prescriptions in queue.</p>
                ) : (
                  pendingPrescriptions.slice(0, 3).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between rounded-2xl border border-purple-100 bg-purple-50/40 p-3.5 text-xs">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{p.medicineName}</p>
                        <p className="text-slate-600">Patient: <strong>{p.patientName}</strong> · Dosage: {p.dosage} ({p.frequency})</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setDispenseModal(p)}
                        className="rounded-full bg-purple-700 text-white text-xs h-8 font-bold"
                      >
                        Dispense
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Demand Forecasting Quick Alert Widget */}
          <Card className="border-0 shadow-xs bg-linear-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-100">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-700 text-white shadow-xs">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">AI Medicine Demand Forecasting &amp; Stock-Out Risk Radar</h4>
                    <Badge className="bg-purple-200 text-purple-900 text-[10px] font-bold">Prototype</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {criticalForecastCount > 0
                      ? `${criticalForecastCount} formulary medicines are projected to stock out within 15 days without replenishment.`
                      : "All monitored medications maintain safe clinical inventory buffer runway."}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setActiveTab("demand_forecasting")}
                className="rounded-full bg-[#15181b] hover:bg-slate-800 text-white text-xs font-bold shrink-0 h-8 px-4"
              >
                Open Demand Forecaster →
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. DEMAND FORECASTING (AI-ASSISTED) TAB VIEW */}
      {activeTab === "demand_forecasting" && (
        <div className="space-y-6">
          {/* A. PROTOTYPE FORECASTING DISCLAIMER BANNER */}
          <div className="rounded-2xl border-2 border-amber-300 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 p-4 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-xs">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-amber-950 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                    Prototype Forecasting System
                  </span>
                  <span className="text-[11px] font-semibold text-amber-900">
                    Decision Support · Experimental Statistical &amp; ML Engine
                  </span>
                </div>
                <p className="text-xs text-amber-950 font-medium leading-relaxed">
                  <strong>Important Planning Notice:</strong> This forecasting tool uses moving averages (SMA-7/14/30), exponential smoothing (&alpha;=0.3), and Ordinary Least Squares (OLS) linear trend regression over synthetic and logged facility dispensing records. <strong>Projections are decision-support estimates for planning guidance only and do NOT claim production accuracy.</strong> Always perform physical bin-card verification before finalizing purchase requisitions.
                </p>
              </div>
            </div>
          </div>

          {/* B. MEDICINE SELECTOR & RISK FILTER STRIP */}
          <Card className="border-0 shadow-xs bg-white">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Select Medication Formulary Item</h3>
                  <p className="text-xs text-slate-500">Pick any facility medicine to analyze consumption trajectory, stock runway, and reorder signals</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search medicine..."
                      value={forecastSearchQuery}
                      onChange={(e) => setForecastSearchQuery(e.target.value)}
                      className="pl-8 text-xs h-8 rounded-full"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowModelBreakdown(!showModelBreakdown)}
                    className="rounded-full text-xs h-8 gap-1.5"
                  >
                    <Layers className="h-3.5 w-3.5 text-purple-600" />
                    {showModelBreakdown ? "Hide Model Math" : "Model Math"}
                  </Button>
                </div>
              </div>

              {/* Horizontal Medicine Chips with Stock-out Risk Badges */}
              <div className="flex gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                {facilityForecasts
                  .filter((f) => !forecastSearchQuery || f.medicineName.toLowerCase().includes(forecastSearchQuery.toLowerCase()))
                  .map((item) => {
                    const isSelected = item.medicineId === effectiveForecastMedicineId;
                    const isCritical = item.stockOutRisk === "CRITICAL";
                    const isHigh = item.stockOutRisk === "HIGH";
                    return (
                      <button
                        key={item.medicineId}
                        onClick={() => setSelectedForecastMedicineId(item.medicineId)}
                        className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs transition-all text-left ${
                          isSelected
                            ? "border-purple-600 bg-purple-50/80 shadow-xs ring-2 ring-purple-500/20 font-bold text-purple-950"
                            : "border-slate-200 bg-white hover:border-purple-200 text-slate-700"
                        }`}
                      >
                        <Pill className={`h-4 w-4 shrink-0 ${isSelected ? "text-purple-600" : "text-slate-400"}`} />
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">{item.medicineName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Stock: <strong>{item.currentStock} {item.unit}</strong> · ~{item.daysUntilStockOut ?? "30+"}d
                          </div>
                        </div>
                        <Badge
                          className={`ml-1 text-[10px] uppercase font-bold shrink-0 ${
                            isCritical
                              ? "bg-rose-600 text-white animate-pulse"
                              : isHigh
                              ? "bg-orange-500 text-white"
                              : item.stockOutRisk === "MODERATE"
                              ? "bg-amber-500 text-white"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {item.stockOutRisk}
                        </Badge>
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* C. DETAILED FORECAST VIEW FOR SELECTED MEDICINE */}
          {detailedForecastQuery.isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading demand forecast models...</div>
          ) : detailedForecastQuery.data ? (
            (() => {
              const med = detailedForecastQuery.data;
              const isCritical = med.stockOutRisk === "CRITICAL";
              const isHigh = med.stockOutRisk === "HIGH";
              const isModerate = med.stockOutRisk === "MODERATE";

              return (
                <div className="space-y-6">
                  {/* C1. THE 5 REQUIRED METRIC CARDS */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {/* 1. CURRENT STOCK */}
                    <Card className="border-0 shadow-xs bg-[#e4f1f8]">
                      <CardContent className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between text-blue-700">
                          <span className="text-[11px] font-bold uppercase tracking-wider">CURRENT STOCK</span>
                          <Package className="h-4 w-4" />
                        </div>
                        <div className="display-font text-2xl font-black text-blue-950">
                          {med.currentStock} <span className="text-sm font-semibold text-blue-800">{med.unit}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-blue-800 pt-1 border-t border-blue-200/60">
                          <span>Reorder Buffer: <strong>{med.reorderLevel} {med.unit}</strong></span>
                        </div>
                        <p className="text-[11px] text-blue-700 font-medium">
                          {med.currentStock <= 0 ? "⚠️ Zero physical inventory" : `Est. runway: ~${med.daysUntilStockOut ?? "30+"} days`}
                        </p>
                      </CardContent>
                    </Card>

                    {/* 2. DAILY AVERAGE */}
                    <Card className="border-0 shadow-xs bg-[#f4effa]">
                      <CardContent className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between text-purple-700">
                          <span className="text-[11px] font-bold uppercase tracking-wider">DAILY AVERAGE</span>
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="display-font text-2xl font-black text-purple-950">
                          {med.averageDailyConsumption} <span className="text-xs font-semibold text-purple-800">units/day</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-purple-800 pt-1 border-t border-purple-200/60">
                          <span>7d SMA: <strong>{med.modelComparison.sma7DailyRate}</strong></span>
                          <span>30d SMA: <strong>{med.modelComparison.sma30DailyRate}</strong></span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-900">
                          {med.trendDirection === "accelerating" ? (
                            <span className="text-rose-700 flex items-center gap-0.5">
                              <ArrowUpRight className="h-3.5 w-3.5" /> Accelerating (+{med.trendPercentage}%)
                            </span>
                          ) : med.trendDirection === "decelerating" ? (
                            <span className="text-emerald-700 flex items-center gap-0.5">
                              <ArrowDownRight className="h-3.5 w-3.5" /> Decelerating ({med.trendPercentage}%)
                            </span>
                          ) : (
                            <span className="text-slate-600">→ Stable trajectory</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* 3. 30-DAY DEMAND */}
                    <Card className="border-0 shadow-xs bg-[#e8f3ed]">
                      <CardContent className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between text-emerald-700">
                          <span className="text-[11px] font-bold uppercase tracking-wider">30-DAY DEMAND</span>
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="display-font text-2xl font-black text-emerald-950">
                          {med.predicted30DayDemand} <span className="text-sm font-semibold text-emerald-800">{med.unit}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/60">
                          <span>Next 7 Days: <strong>{med.predicted7DayDemand} {med.unit}</strong></span>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                          80% Confidence: ±{Math.round(med.modelComparison.standardError * 1.282 * 15)} {med.unit}
                        </p>
                      </CardContent>
                    </Card>

                    {/* 4. STOCK-OUT RISK */}
                    <Card className={`border-0 shadow-xs ${isCritical ? "bg-[#f8e7e8]" : isHigh ? "bg-[#fff1e5]" : isModerate ? "bg-[#fff4da]" : "bg-[#e8f3ed]"}`}>
                      <CardContent className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${isCritical ? "text-rose-800" : isHigh ? "text-orange-800" : isModerate ? "text-amber-800" : "text-emerald-800"}`}>
                            STOCK-OUT RISK
                          </span>
                          <AlertTriangle className={`h-4 w-4 ${isCritical ? "text-rose-700" : isHigh ? "text-orange-700" : isModerate ? "text-amber-700" : "text-emerald-700"}`} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs font-black uppercase ${isCritical ? "bg-rose-700 text-white" : isHigh ? "bg-orange-600 text-white" : isModerate ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"}`}>
                            {med.stockOutRisk}
                          </Badge>
                        </div>
                        <div className="text-[11px] font-bold text-slate-800 pt-1 border-t border-slate-200/60">
                          <span>Out Date: </span>
                          <strong className={isCritical ? "text-rose-900" : "text-slate-900"}>
                            {med.predictedStockOutDate ? new Date(med.predictedStockOutDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "30+ days safe"}
                          </strong>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {med.daysUntilStockOut !== null ? `${med.daysUntilStockOut} days until depletion` : "Adequate clinical runway"}
                        </p>
                      </CardContent>
                    </Card>

                    {/* 5. REORDER RECOMMENDATION */}
                    <Card className="border-0 shadow-xs bg-[#fff8e8]">
                      <CardContent className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between text-amber-900">
                          <span className="text-[11px] font-bold uppercase tracking-wider">REORDER RECOMMENDATION</span>
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                        <div className="display-font text-2xl font-black text-amber-950">
                          {med.reorderRecommendation.suggestedReorderQuantity} <span className="text-sm font-semibold text-amber-900">{med.unit}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-amber-900 pt-1 border-t border-amber-200/60">
                          <span>Urgency: <strong className="uppercase">{med.reorderRecommendation.urgency}</strong></span>
                          <span>Lead: <strong>{med.reorderRecommendation.leadTimeDays}d</strong></span>
                        </div>
                        {med.reorderRecommendation.shouldReorder ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setOrderQuantity(med.reorderRecommendation.suggestedReorderQuantity);
                              setReorderModal({
                                id: med.medicineId,
                                name: med.medicineName,
                                currentStock: med.currentStock,
                                reorderLevel: med.reorderLevel,
                              });
                            }}
                            className="w-full rounded-full bg-[#15181b] hover:bg-slate-800 text-white text-[11px] font-bold h-7 mt-1"
                          >
                            <ShoppingCart className="mr-1 h-3 w-3" /> Create Requisition
                          </Button>
                        ) : (
                          <p className="text-[11px] text-emerald-800 font-semibold pt-1">Stock levels healthy</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* C2. INTERACTIVE RECHARTS VISUALIZATION */}
                  <Card className="border-0 shadow-xs bg-white">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2 border-b">
                      <div>
                        <div className="flex items-center gap-2">
                          <BarChart2 className="h-4 w-4 text-purple-600" />
                          <CardTitle className="display-font text-base font-bold text-slate-900">
                            60-Day Historical Consumption &amp; Projected 30-Day Demand Trajectory
                          </CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                          Shows daily dispensed actuals (past 30d), forecasted demand projection with 80% confidence interval, and remaining stock burn-down.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-xs bg-[#3b82f6]" /> Historical Actual
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-xs bg-[#8b5cf6]" /> Projected Demand
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-xs bg-[#f59e0b]" /> Stock Burn-Down
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="h-0.5 w-3 bg-[#ef4444] border-dashed" /> Reorder Buffer
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-6">
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={med.chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                              dataKey="displayDate"
                              tick={{ fontSize: 10, fill: "#64748b" }}
                              interval={5}
                              tickLine={false}
                            />
                            <YAxis
                              yAxisId="consumption"
                              tick={{ fontSize: 10, fill: "#64748b" }}
                              tickLine={false}
                              axisLine={false}
                              label={{ value: "Daily Units", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94a3b8" }}
                            />
                            <YAxis
                              yAxisId="stock"
                              orientation="right"
                              tick={{ fontSize: 10, fill: "#d97706" }}
                              tickLine={false}
                              axisLine={false}
                              label={{ value: "Stock Balance", angle: 90, position: "insideRight", fontSize: 10, fill: "#d97706" }}
                            />
                            <RechartsTooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-xs space-y-1">
                                      <p className="font-bold text-slate-900 border-b pb-1">{label} ({data.date})</p>
                                      {data.isHistorical && (
                                        <p className="text-blue-700 font-semibold">
                                          Actual Dispensed: <strong>{data.actualConsumption} {med.unit}</strong>
                                        </p>
                                      )}
                                      {data.isForecast && (
                                        <>
                                          <p className="text-purple-700 font-semibold">
                                            Forecast Demand: <strong>{data.forecastDemand} {med.unit}</strong>
                                          </p>
                                          <p className="text-slate-500 text-[10px]">
                                            80% Range: [{data.forecastConfidenceLower} – {data.forecastConfidenceUpper}] {med.unit}
                                          </p>
                                          <p className="text-amber-700 font-semibold">
                                            Remaining Stock: <strong>{data.remainingStockBurnDown} {med.unit}</strong>
                                          </p>
                                        </>
                                      )}
                                      <p className="text-rose-600 text-[10px]">
                                        Buffer Threshold: {data.reorderThreshold} {med.unit}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            {/* Actual consumption area (historical) */}
                            <Area
                              yAxisId="consumption"
                              type="monotone"
                              dataKey="actualConsumption"
                              stroke="#2563eb"
                              fill="#93c5fd"
                              fillOpacity={0.35}
                              strokeWidth={2}
                              connectNulls={false}
                            />
                            {/* Projected demand line (forecast) */}
                            <Line
                              yAxisId="consumption"
                              type="monotone"
                              dataKey="forecastDemand"
                              stroke="#7c3aed"
                              strokeDasharray="4 4"
                              strokeWidth={2.5}
                              dot={false}
                              connectNulls={false}
                            />
                            {/* Upper confidence bound */}
                            <Line
                              yAxisId="consumption"
                              type="monotone"
                              dataKey="forecastConfidenceUpper"
                              stroke="#c4b5fd"
                              strokeDasharray="2 2"
                              strokeWidth={1}
                              dot={false}
                              connectNulls={false}
                            />
                            {/* Stock Burn-Down curve */}
                            <Line
                              yAxisId="stock"
                              type="monotone"
                              dataKey="remainingStockBurnDown"
                              stroke="#d97706"
                              strokeWidth={2.5}
                              dot={false}
                              connectNulls={false}
                            />
                            {/* Reorder Buffer reference line */}
                            <ReferenceLine
                              yAxisId="stock"
                              y={med.reorderLevel}
                              stroke="#ef4444"
                              strokeDasharray="4 4"
                              label={{ value: `Buffer (${med.reorderLevel})`, fill: "#dc2626", fontSize: 10, position: "top" }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* C3. MODEL TRANSPARENCY & METHODOLOGY BREAKDOWN */}
                  {showModelBreakdown && (
                    <Card className="border-0 shadow-xs bg-slate-50/80">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <CardTitle className="display-font text-sm font-bold text-slate-900">
                            Model Mathematics &amp; Ensemble Parameter Breakdown
                          </CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                          Deterministic comparison of statistical baseline moving averages against ML Ordinary Least Squares linear trend regression.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-3 text-xs">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                            <span className="font-bold text-slate-900">Baseline 1: Moving Averages</span>
                            <p className="text-slate-600">SMA-7: <strong>{med.modelComparison.sma7DailyRate}</strong> units/day</p>
                            <p className="text-slate-600">SMA-14: <strong>{med.modelComparison.sma14DailyRate}</strong> units/day</p>
                            <p className="text-slate-600">SMA-30: <strong>{med.modelComparison.sma30DailyRate}</strong> units/day</p>
                            <p className="text-slate-400 text-[10px]">Captures rolling consumption velocity across varying observation windows.</p>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                            <span className="font-bold text-slate-900">Baseline 2: Exponential Smoothing</span>
                            <p className="text-slate-600">EMA Rate (&alpha;=0.3): <strong>{med.modelComparison.emaDailyRate}</strong> units/day</p>
                            <p className="text-slate-600">Weight on Recent Day: <strong>30%</strong></p>
                            <p className="text-slate-600">Memory Decay: <strong>Geometric</strong></p>
                            <p className="text-slate-400 text-[10px]">Rapidly adapts to sudden prescription volume shifts.</p>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                            <span className="font-bold text-slate-900">ML Model: Linear Trend (OLS)</span>
                            <p className="text-slate-600">Trend Slope (&beta;): <strong>{med.modelComparison.linearRegressionSlope}</strong> units/day</p>
                            <p className="text-slate-600">Model Fit (R&sup2;): <strong>{med.modelComparison.linearRegressionR2}</strong></p>
                            <p className="text-slate-600">Standard Error (&sigma;): <strong>{med.modelComparison.standardError}</strong></p>
                            <p className="text-slate-400 text-[10px]">Identifies whether community demand is accelerating, stable, or decelerating.</p>
                          </div>
                        </div>

                        <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-purple-950 font-medium">
                          <strong>Ensemble Formula:</strong> <code>D_ensemble = 0.55 &times; EMA + 0.45 &times; (Intercept + Slope &times; t)</code>. Reorder recommendation targets a <strong>45-day clinical buffer</strong> accounting for a <strong>7-day rural logistics lead time</strong> from the District Medical Warehouse.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })()
          ) : null}
        </div>
      )}

      {/* 2. PHARMACY DISPENSARY VIEW */}
      {activeTab === "dispensary" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <CardTitle className="display-font text-lg font-bold">Pharmacy Dispensary Desk</CardTitle>
                <CardDescription className="text-xs">
                  Inventory is deducted only upon pharmacist dispense confirmation with audit signature
                </CardDescription>
              </div>
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
                {["all", "active", "dispensed"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setDispensaryFilter(st)}
                    className={`rounded-lg px-3 py-1 font-semibold capitalize transition ${
                      dispensaryFilter === st ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {st === "active" ? "Pending Dispense" : st}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              {allPrescriptions
                .filter((p) => (dispensaryFilter === "all" ? true : p.status === dispensaryFilter))
                .map((p: any) => (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-purple-200 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-purple-50 text-purple-700 shrink-0">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{p.medicineName}</h4>
                          <Badge variant="outline" className="text-[10px] font-mono">{p.route || "Oral"}</Badge>
                        </div>
                        <p className="text-slate-600 font-medium">
                          Patient: <strong className="text-slate-900">{p.patientName}</strong> ({p.patientAge}y · {p.village})
                        </p>
                        <p className="text-slate-600">
                          Dosage: <strong>{p.dosage}</strong> · Schedule: <strong>{p.frequency}</strong> · Duration: <strong>{p.duration}</strong>
                        </p>
                        {p.instructions && (
                          <p className="text-slate-600 bg-slate-50 border border-slate-100 p-1.5 rounded-lg text-[11px]">
                            <strong>Doctor Advice:</strong> {p.instructions}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                          <span>Prescribed: {new Date(p.createdAt).toLocaleDateString()}</span>
                          {p.doctorName && <span>Prescriber: {p.doctorName}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={
                          p.status === "active"
                            ? "bg-amber-50 text-amber-700 border-amber-200 font-bold"
                            : p.status === "dispensed"
                            ? "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {p.status === "active" ? "PENDING DISPENSE" : p.status.toUpperCase()}
                      </Badge>
                      {p.status === "active" && (
                        <Button
                          size="sm"
                          onClick={() => setDispenseModal(p)}
                          className="rounded-full bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs h-8 px-4 shadow-xs"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Dispense Medicine
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. MEDICINE INVENTORY VIEW */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by medicine name, category, or batch number..."
                className="pl-9 rounded-full bg-white text-xs border-slate-200"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setShowAddMedModal(true)}
                className="rounded-full bg-[#15181b] text-white text-xs h-9 px-4 font-semibold shrink-0"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Medicine
              </Button>
            </div>
          </div>

          {/* Status & Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Status:</span>
              {["all", "IN STOCK", "LOW STOCK", "OUT OF STOCK", "EXPIRING SOON"].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatusFilter(st)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    selectedStatusFilter === st
                      ? "bg-[#15181b] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Category:</span>
              {["all", "Hypertension", "Diabetes", "Essential", "Maternal Health", "Antibiotics", "Analgesic", "Respiratory"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                    selectedCategory === cat
                      ? "bg-purple-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Inventory Grid Cards */}
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMedicines.map((m: any) => (
              <Card key={m.id} className="border-0 shadow-xs bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
                <CardContent className="p-4 text-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono mb-1">{m.category || "General"}</Badge>
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">{m.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Batch: <strong className="font-mono text-slate-600">{m.batchNumber || "N/A"}</strong></p>
                    </div>
                    <Badge
                      className={
                        m.status === "IN STOCK"
                          ? "bg-emerald-100 text-emerald-800 font-bold"
                          : m.status === "LOW STOCK"
                          ? "bg-amber-100 text-amber-800 font-bold"
                          : m.status === "OUT OF STOCK"
                          ? "bg-rose-100 text-rose-800 font-bold"
                          : "bg-orange-100 text-orange-800 font-bold"
                      }
                    >
                      {m.status}
                    </Badge>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Current Stock</span>
                      <strong className="text-slate-900 text-sm">{m.currentStock} {m.unit}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Reorder Threshold</span>
                      <div className="flex items-center gap-1">
                        <strong className="text-slate-900">{m.reorderLevel} {m.unit}</strong>
                        <button
                          onClick={() => {
                            setReorderThresholdModal({ id: m.id, name: m.name, reorderLevel: m.reorderLevel, unit: m.unit });
                            setNewThresholdVal(m.reorderLevel);
                          }}
                          className="text-purple-700 hover:text-purple-900 p-0.5"
                          title="Edit Reorder Threshold"
                        >
                          <Sliders className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                      <span>Expiry: {m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : "N/A"}</span>
                      {m.daysUntilExpiry !== null && (
                        <span className={m.daysUntilExpiry <= 90 ? "text-rose-600 font-bold" : "text-slate-400"}>
                          {m.daysUntilExpiry > 0 ? `${m.daysUntilExpiry} days left` : "Expired"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                    <Button
                      size="sm"
                      onClick={() => {
                        setReceiveStockModal({ id: m.id, name: m.name, currentStock: m.currentStock, unit: m.unit, batchNumber: m.batchNumber });
                        setReceiveStockForm({ quantity: 50, batchNumber: m.batchNumber || "", expiryDate: "", notes: "" });
                      }}
                      className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] h-7.5"
                    >
                      <Plus className="mr-1 h-3 w-3" /> Receive Stock
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        setDispenseDirectModal({ id: m.id, name: m.name, currentStock: m.currentStock, unit: m.unit, batchNumber: m.batchNumber });
                        setDispenseDirectForm({ quantity: 1, patientId: 1, notes: "" });
                      }}
                      disabled={m.currentStock <= 0}
                      className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-[11px] h-7.5"
                    >
                      <Pill className="mr-1 h-3 w-3" /> Dispense
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditStockModal({ id: m.id, name: m.name, currentStock: m.currentStock, unit: m.unit });
                        setNewStockVal(String(m.currentStock));
                      }}
                      className="rounded-xl text-[11px] h-7 text-slate-700"
                    >
                      Adjust Count
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedMedicineHistoryId(m.id)}
                      className="rounded-xl text-[11px] h-7 text-slate-700"
                    >
                      <History className="mr-1 h-3 w-3 text-slate-400" /> Ledger
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 4. STOCK LEDGER & TRANSACTIONS VIEW */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <CardTitle className="display-font text-lg font-bold">Stock Transactions Ledger & Audit Trail</CardTitle>
                <CardDescription className="text-xs">
                  Full immutable chronological history of all receipts, direct dispensations, prescription issues, and audit adjustments
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {["ALL", "STOCK_RECEIVED", "DISPENSED", "STOCK_ADJUSTMENT", "INITIAL_STOCK"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTransactionTypeFilter(type)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      transactionTypeFilter === type
                        ? "bg-[#15181b] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {type.replace("_", " ")}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              {filteredTransactions.length === 0 ? (
                <p className="p-8 text-center text-slate-400">No transactions recorded for this filter.</p>
              ) : (
                filteredTransactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <Badge
                        className={
                          tx.transactionType === "STOCK_RECEIVED"
                            ? "bg-emerald-100 text-emerald-800 font-bold"
                            : tx.transactionType === "DISPENSED"
                            ? "bg-purple-100 text-purple-800 font-bold"
                            : tx.transactionType === "STOCK_ADJUSTMENT"
                            ? "bg-amber-100 text-amber-800 font-bold"
                            : "bg-blue-100 text-blue-800 font-bold"
                        }
                      >
                        {tx.transactionType.replace("_", " ")}
                      </Badge>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{tx.medicineName}</span>
                          {tx.batchNumber && <span className="text-[10px] font-mono text-slate-500">Batch: {tx.batchNumber}</span>}
                        </div>
                        <p className="text-slate-600 text-[11px]">{tx.notes || "Transaction recorded"}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                          <span>Date: {new Date(tx.createdAt).toLocaleString()}</span>
                          <span>Actor: <strong>{tx.actorName || "Facility Staff"}</strong> ({tx.actorRole || "Staff"})</span>
                          {tx.patientId && <span>Patient Ref: #{tx.patientId}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-base font-extrabold font-mono ${
                          tx.quantity > 0 ? "text-emerald-700" : "text-purple-700"
                        }`}
                      >
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Balance: {tx.previousStock} → <strong>{tx.newStock}</strong>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. LOW STOCK VIEW */}
      {activeTab === "low_stock" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-900 flex items-center justify-between">
            <div>
              <strong>Stockout Warning:</strong> {lowStockItems.length} essential pharmaceuticals are currently below safe buffer thresholds. Auto-requisitions recommended.
            </div>
            <Button
              size="sm"
              onClick={() => setActiveTab("inventory")}
              className="rounded-full bg-rose-700 text-white text-xs h-7 px-3"
            >
              Open Formulary
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {lowStockItems.map((item: any) => (
              <Card key={item.id} className="border-0 shadow-xs bg-white">
                <CardContent className="p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900">{item.name}</h4>
                    <Badge className={item.currentStock === 0 ? "bg-rose-700 text-white text-[10px]" : "bg-amber-600 text-white text-[10px]"}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-slate-600">Current Stock: <strong>{item.currentStock} {item.unit}</strong> (Buffer Minimum: {item.reorderLevel} {item.unit})</p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => {
                        setReceiveStockModal({ id: item.id, name: item.name, currentStock: item.currentStock, unit: item.unit, batchNumber: item.batchNumber });
                        setReceiveStockForm({ quantity: Math.max(item.reorderLevel * 2, 50), batchNumber: item.batchNumber || "", expiryDate: "", notes: "" });
                      }}
                      className="flex-1 rounded-full bg-emerald-700 text-white text-xs"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Receive Stock
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReorderModal({ id: item.id, name: item.name, currentStock: item.currentStock, reorderLevel: item.reorderLevel })}
                      className="flex-1 rounded-full text-xs"
                    >
                      <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Requisition
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 6. EXPIRING MEDICINES VIEW */}
      {activeTab === "expiring" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader>
              <CardTitle className="display-font text-lg font-bold">Batches Approaching Expiration (&lt; 90 Days)</CardTitle>
              <CardDescription>First-Expiry-First-Out (FEFO) protocol: rotate these batches to active dispensary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {expiringItems.length === 0 ? (
                <p className="p-6 text-center text-slate-400">No batches expiring in the next 90 days.</p>
              ) : (
                expiringItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{item.name}</h4>
                      <p className="text-slate-600 mt-0.5">Batch: <strong className="font-mono">{item.batchNumber || "N/A"}</strong> · Remaining Stock: {item.currentStock} {item.unit}</p>
                      <p className="text-amber-800 font-semibold mt-1">
                        Expiry Date: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "N/A"} ({item.daysUntilExpiry} days remaining)
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast.success(`Flagged ${item.name} for priority dispensary dispatch`)}
                      className="rounded-full text-xs font-semibold bg-white"
                    >
                      Prioritize Dispensing
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 7. REORDER ALERTS VIEW */}
      {activeTab === "reorder_alerts" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader>
              <CardTitle className="display-font text-lg font-bold">Purchase Requisitions & Reorder Pipeline</CardTitle>
              <CardDescription>Automated replenishment workflows between Sundarpur PHC and District Central Warehouse</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {reorderAlerts.map((alert: any) => (
                <div key={alert.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-[#f9fafb] p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{alert.medicineName}</span>
                      <Badge className={alert.urgency === "critical" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}>
                        {alert.urgency}
                      </Badge>
                    </div>
                    <p className="text-slate-600 mt-1">Recommended Reorder: <strong>{alert.recommendedOrder} {alert.unit || "strips"}</strong> (Current Stock: {alert.currentStock})</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => toast.success(`Order requisition for ${alert.medicineName} dispatched to District Warehouse`)}
                    className="rounded-full bg-[#15181b] text-white text-xs"
                  >
                    <Truck className="mr-1.5 h-3.5 w-3.5" /> Dispatch Purchase Order
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 8. REFERRALS VIEW */}
      {activeTab === "referrals" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-purple-700" />
                  <CardTitle className="display-font text-lg font-bold">Facility Referral & Transport Desk</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Accept incoming referrals, dispatch 108 ambulance units, and record clinical handovers
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="font-mono bg-purple-50 text-purple-700 border-purple-200">
                  {facilityReferrals.length} Inbound Cases
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              {facilityReferrals.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Navigation className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p>No active facility referral handovers pending.</p>
                </div>
              ) : (
                facilityReferrals.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 hover:border-purple-200 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{r.patientName}</span>
                          <Badge
                            className={
                              r.urgency === "emergency"
                                ? "bg-rose-100 text-rose-800"
                                : r.urgency === "urgent"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {r.urgency?.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {r.specialty}
                          </Badge>
                          {r.recommendationScore && (
                            <Badge className="bg-purple-700 text-white font-mono text-[10px]">
                              Match: {r.recommendationScore}%
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-slate-600">
                          Origin: <strong>{r.village || "Sundarpur"}</strong> · Target: <strong>{r.targetFacilityName || "PHC Desk"}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-start">
                        <Badge
                          className={
                            r.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "CONSULTED"
                              ? "bg-blue-100 text-blue-800"
                              : r.status === "ARRIVED"
                              ? "bg-purple-100 text-purple-800"
                              : r.status === "TRANSPORT_ASSIGNED" || r.status === "DEPARTED"
                              ? "bg-amber-100 text-amber-800"
                              : r.status === "ACCEPTED"
                              ? "bg-teal-100 text-teal-800"
                              : r.status === "CANCELLED"
                              ? "bg-slate-200 text-slate-600"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }
                        >
                          {r.status?.toUpperCase() || "PENDING"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-[11px]">
                      <div>
                        <strong>Reason:</strong> {r.reason}
                      </div>
                      {r.transportVehicle && (
                        <div>
                          <strong>Transport:</strong> {r.transportVehicle} {r.transportDriverContact && `· ${r.transportDriverContact}`}
                        </div>
                      )}
                      {r.outcome && (
                        <div className="sm:col-span-2 text-emerald-700 font-medium">
                          <strong>Outcome:</strong> {r.outcome}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400">Initiated: {new Date(r.createdAt).toLocaleString()}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTimelineReferralId(r.id)}
                          className="rounded-full text-[11px] h-7 px-3 text-purple-700 hover:bg-purple-50 border-purple-200"
                        >
                          <Clock className="mr-1 h-3 w-3" /> Event Timeline
                        </Button>

                        {r.status === "PENDING" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setReferralStatusModal({
                                id: r.id,
                                patientName: r.patientName,
                                nextStatus: "ACCEPTED",
                                actionLabel: "Accept Inbound Referral",
                              })
                            }
                            className="rounded-full bg-teal-700 hover:bg-teal-800 text-white text-[11px] h-7 px-3"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Accept Referral
                          </Button>
                        )}

                        {r.status === "ACCEPTED" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setReferralStatusModal({
                                id: r.id,
                                patientName: r.patientName,
                                nextStatus: "TRANSPORT_ASSIGNED",
                                actionLabel: "Assign 108 Ambulance / Transport",
                              })
                            }
                            className="rounded-full bg-amber-600 hover:bg-amber-700 text-white text-[11px] h-7 px-3"
                          >
                            <Truck className="mr-1 h-3 w-3" /> Assign Transport
                          </Button>
                        )}

                        {r.status === "TRANSPORT_ASSIGNED" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setReferralStatusModal({
                                id: r.id,
                                patientName: r.patientName,
                                nextStatus: "DEPARTED",
                                actionLabel: "Confirm Patient Departed",
                              })
                            }
                            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] h-7 px-3"
                          >
                            <Truck className="mr-1 h-3 w-3" /> Mark Departed
                          </Button>
                        )}

                        {r.status === "DEPARTED" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setReferralStatusModal({
                                id: r.id,
                                patientName: r.patientName,
                                nextStatus: "ARRIVED",
                                actionLabel: "Confirm Patient Arrived at Facility",
                              })
                            }
                            className="rounded-full bg-purple-700 hover:bg-purple-800 text-white text-[11px] h-7 px-3"
                          >
                            <Hospital className="mr-1 h-3 w-3" /> Mark Arrived
                          </Button>
                        )}

                        {r.status === "ARRIVED" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setReferralStatusModal({
                                id: r.id,
                                patientName: r.patientName,
                                nextStatus: "CONSULTED",
                                actionLabel: "Record Clinical Consultation",
                              })
                            }
                            className="rounded-full bg-indigo-700 hover:bg-indigo-800 text-white text-[11px] h-7 px-3"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Mark Consulted
                          </Button>
                        )}

                        {r.status === "CONSULTED" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setReferralStatusModal({
                                id: r.id,
                                patientName: r.patientName,
                                nextStatus: "COMPLETED",
                                actionLabel: "Complete Referral & Document Outcome",
                              })
                            }
                            className="rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] h-7 px-3"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Complete Referral
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* 1. MODAL: Add New Medicine */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-purple-700 dark:text-purple-400" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Add Medicine to Inventory</CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Register new pharmaceutical SKU and initial stock</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddMedModal(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Medicine / Generic Name *</label>
                <Input
                  value={newMedForm.name}
                  onChange={(e) => setNewMedForm({ ...newMedForm, name: e.target.value })}
                  placeholder="e.g. Azithromycin 500mg, Metoprolol 25mg"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={newMedForm.category}
                    onChange={(e) => setNewMedForm({ ...newMedForm, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Hypertension">Hypertension</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Essential">Essential</option>
                    <option value="Maternal Health">Maternal Health</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Analgesic">Analgesic</option>
                    <option value="Respiratory">Respiratory</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Gastro">Gastro</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Unit Type</label>
                  <select
                    value={newMedForm.unit}
                    onChange={(e) => setNewMedForm({ ...newMedForm, unit: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="strips">strips</option>
                    <option value="packs">packs</option>
                    <option value="bottles">bottles</option>
                    <option value="vials">vials</option>
                    <option value="inhalers">inhalers</option>
                    <option value="tablets">tablets</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Initial Quantity</label>
                  <Input
                    type="number"
                    min="0"
                    value={newMedForm.currentStock}
                    onChange={(e) => setNewMedForm({ ...newMedForm, currentStock: Number(e.target.value) })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Reorder Threshold (Buffer)</label>
                  <Input
                    type="number"
                    min="0"
                    value={newMedForm.reorderLevel}
                    onChange={(e) => setNewMedForm({ ...newMedForm, reorderLevel: Number(e.target.value) })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Batch Number</label>
                  <Input
                    value={newMedForm.batchNumber}
                    onChange={(e) => setNewMedForm({ ...newMedForm, batchNumber: e.target.value })}
                    placeholder="e.g. AZI-2027-09"
                    className="mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Expiry Date</label>
                  <Input
                    type="date"
                    value={newMedForm.expiryDate}
                    onChange={(e) => setNewMedForm({ ...newMedForm, expiryDate: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Procurement / Formulary Notes</label>
                <Input
                  value={newMedForm.notes}
                  onChange={(e) => setNewMedForm({ ...newMedForm, notes: e.target.value })}
                  placeholder="e.g. Received from District CMS quota allocation"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddMedModal(false)} className="rounded-full text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!newMedForm.name.trim()) {
                      toast.error("Medicine name is required");
                      return;
                    }
                    addMedicineMutation.mutate({
                      name: newMedForm.name,
                      category: newMedForm.category,
                      currentStock: newMedForm.currentStock,
                      reorderLevel: newMedForm.reorderLevel,
                      unit: newMedForm.unit,
                      batchNumber: newMedForm.batchNumber || undefined,
                      expiryDate: newMedForm.expiryDate ? new Date(newMedForm.expiryDate) : undefined,
                      notes: newMedForm.notes || undefined,
                    });
                  }}
                  disabled={addMedicineMutation.isPending}
                  className="rounded-full bg-[#15181b] dark:bg-slate-700 text-white text-xs h-8 px-4"
                >
                  {addMedicineMutation.isPending ? "Adding…" : "Save to Inventory"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. MODAL: Receive Stock Shipment */}
      {receiveStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Receive Stock Shipment</CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">{receiveStockModal.name}</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setReceiveStockModal(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/50 p-3">
                <p className="text-emerald-900 dark:text-emerald-200">Current Stock in Inventory: <strong>{receiveStockModal.currentStock} {receiveStockModal.unit}</strong></p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Received Quantity ({receiveStockModal.unit}) *</label>
                <Input
                  type="number"
                  min="1"
                  value={receiveStockForm.quantity}
                  onChange={(e) => setReceiveStockForm({ ...receiveStockForm, quantity: Number(e.target.value) })}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Shipment Batch Number</label>
                  <Input
                    value={receiveStockForm.batchNumber}
                    onChange={(e) => setReceiveStockForm({ ...receiveStockForm, batchNumber: e.target.value })}
                    placeholder="e.g. BTH-2027-11"
                    className="mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Batch Expiry Date</label>
                  <Input
                    type="date"
                    value={receiveStockForm.expiryDate}
                    onChange={(e) => setReceiveStockForm({ ...receiveStockForm, expiryDate: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Invoice / Challan Reference</label>
                <Input
                  value={receiveStockForm.notes}
                  onChange={(e) => setReceiveStockForm({ ...receiveStockForm, notes: e.target.value })}
                  placeholder="e.g. Challan #CMS-9921 from District Central Store"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setReceiveStockModal(null)} className="rounded-full text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (receiveStockForm.quantity <= 0) {
                      toast.error("Quantity must be greater than 0");
                      return;
                    }
                    receiveStockMutation.mutate({
                      id: receiveStockModal.id,
                      quantity: receiveStockForm.quantity,
                      batchNumber: receiveStockForm.batchNumber || undefined,
                      expiryDate: receiveStockForm.expiryDate ? new Date(receiveStockForm.expiryDate) : undefined,
                      notes: receiveStockForm.notes || undefined,
                    });
                  }}
                  disabled={receiveStockMutation.isPending}
                  className="rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 px-4 font-semibold"
                >
                  {receiveStockMutation.isPending ? "Receiving…" : "Confirm Stock Receipt"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. MODAL: Direct Dispense */}
      {dispenseDirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-purple-700 dark:text-purple-400" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Dispense Medicine</CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">{dispenseDirectModal.name}</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDispenseDirectModal(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/50 p-3">
                <p className="text-purple-900 dark:text-purple-200">Available Stock: <strong>{dispenseDirectModal.currentStock} {dispenseDirectModal.unit}</strong></p>
                <p className="text-purple-700 dark:text-purple-300 text-[11px] mt-0.5">Batch: {dispenseDirectModal.batchNumber || "AML-2026-08"}</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Patient</label>
                <select
                  value={dispenseDirectForm.patientId}
                  onChange={(e) => setDispenseDirectForm({ ...dispenseDirectForm, patientId: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {(patients.data || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.age}y · {p.village})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Dispense Quantity ({dispenseDirectModal.unit}) *</label>
                <Input
                  type="number"
                  min="1"
                  max={dispenseDirectModal.currentStock}
                  value={dispenseDirectForm.quantity}
                  onChange={(e) => setDispenseDirectForm({ ...dispenseDirectForm, quantity: Number(e.target.value) })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Dispensing Notes / Clinical Indication</label>
                <Input
                  value={dispenseDirectForm.notes}
                  onChange={(e) => setDispenseDirectForm({ ...dispenseDirectForm, notes: e.target.value })}
                  placeholder="e.g. Direct walk-in OPD consultation dispensing"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDispenseDirectModal(null)} className="rounded-full text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (dispenseDirectForm.quantity <= 0) {
                      toast.error("Quantity must be greater than 0");
                      return;
                    }
                    if (dispenseDirectForm.quantity > dispenseDirectModal.currentStock) {
                      toast.error(`Cannot dispense ${dispenseDirectForm.quantity}. Only ${dispenseDirectModal.currentStock} available.`);
                      return;
                    }
                    dispenseDirectMutation.mutate({
                      medicineId: dispenseDirectModal.id,
                      quantity: dispenseDirectForm.quantity,
                      patientId: dispenseDirectForm.patientId,
                      notes: dispenseDirectForm.notes || undefined,
                    });
                  }}
                  disabled={dispenseDirectMutation.isPending}
                  className="rounded-full bg-purple-700 hover:bg-purple-800 text-white text-xs h-8 px-4 font-bold"
                >
                  {dispenseDirectMutation.isPending ? "Dispensing…" : "Confirm Dispensing"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. MODAL: Edit Stock Count (Reconciliation) */}
      {editStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Physical Stock Count Adjustment</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">{editStockModal.name}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditStockModal(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <p className="text-slate-500 dark:text-slate-400">Current Recorded Stock: <strong>{editStockModal.currentStock} {editStockModal.unit}</strong></p>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Verified Physical Quantity ({editStockModal.unit})</label>
                <Input
                  type="number"
                  min="0"
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Adjustment Reason</label>
                <Input
                  value={editStockReason}
                  onChange={(e) => setEditStockReason(e.target.value)}
                  placeholder="e.g. Periodic physical count audit reconciliation"
                  className="mt-1 text-xs"
                />
              </div>
              <Button
                onClick={() => {
                  updateStockMutation.mutate({
                    id: editStockModal.id,
                    currentStock: Number(newStockVal),
                    reason: editStockReason || undefined,
                  });
                }}
                disabled={updateStockMutation.isPending}
                className="w-full rounded-full bg-[#15181b] dark:bg-slate-700 text-white mt-2"
              >
                {updateStockMutation.isPending ? "Updating…" : "Save Stock Count"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. MODAL: Set Reorder Threshold */}
      {reorderThresholdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Set Reorder Threshold</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">{reorderThresholdModal.name}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setReorderThresholdModal(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <p className="text-slate-500 dark:text-slate-400">Current Threshold: <strong>{reorderThresholdModal.reorderLevel} {reorderThresholdModal.unit}</strong></p>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">New Minimum Buffer Threshold ({reorderThresholdModal.unit})</label>
                <Input
                  type="number"
                  min="0"
                  value={newThresholdVal}
                  onChange={(e) => setNewThresholdVal(Number(e.target.value))}
                  className="mt-1 text-xs"
                />
              </div>
              <Button
                onClick={() => {
                  setReorderThresholdMutation.mutate({
                    id: reorderThresholdModal.id,
                    reorderLevel: newThresholdVal,
                  });
                }}
                disabled={setReorderThresholdMutation.isPending}
                className="w-full rounded-full bg-[#15181b] dark:bg-slate-700 text-white mt-2"
              >
                {setReorderThresholdMutation.isPending ? "Saving…" : "Update Threshold"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. MODAL: Single Medicine History Ledger */}
      {selectedMedicineHistoryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-700 dark:text-purple-400" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {singleMedicineHistoryQuery.data?.name || "Medicine"} Ledger
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Current Stock: {singleMedicineHistoryQuery.data?.currentStock} {singleMedicineHistoryQuery.data?.unit} · Status: {singleMedicineHistoryQuery.data?.status}
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedMedicineHistoryId(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {(singleMedicineHistoryQuery.data?.transactions || []).length === 0 ? (
                <p className="text-slate-400 text-center py-6">No transaction entries found for this SKU.</p>
              ) : (
                singleMedicineHistoryQuery.data?.transactions.map((t: any) => (
                  <div key={t.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge className="text-[10px] bg-slate-900 text-white font-mono">
                        {t.transactionType.replace("_", " ")}
                      </Badge>
                      <span className={`font-bold font-mono ${t.quantity > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-purple-700 dark:text-purple-400"}`}>
                        {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">{t.notes || "Stock movement"}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span>{new Date(t.createdAt).toLocaleString()}</span>
                      <span>Balance: {t.previousStock} → <strong>{t.newStock}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 7. MODAL: Purchase Requisition */}
      {reorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Purchase Order Requisition</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">{reorderModal.name}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setReorderModal(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <p className="text-slate-500 dark:text-slate-400">Current: {reorderModal.currentStock} · Min Buffer: {reorderModal.reorderLevel}</p>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Order Quantity (Units)</label>
                <Input
                  type="number"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Number(e.target.value))}
                  className="mt-1 text-xs"
                />
              </div>
              <Button
                onClick={() => {
                  toast.success(`Purchase requisition for ${orderQuantity} units of ${reorderModal.name} routed to District Medical Store`);
                  setReorderModal(null);
                }}
                className="w-full rounded-full bg-[#15181b] dark:bg-slate-700 text-white mt-2"
              >
                Confirm Reorder
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 8. MODAL: Dispense Digital Prescription */}
      {dispenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Dispense Digital Prescription</CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Verify medication and log dispensary event</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDispenseModal(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3.5 pt-4 text-xs">
              <div className="rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/50 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{dispenseModal.medicineName}</span>
                  <Badge className="bg-purple-700 text-white font-mono text-[10px]">{dispenseModal.route || "Oral"}</Badge>
                </div>
                <p className="text-slate-600 dark:text-slate-300">Patient: <strong>{dispenseModal.patientName}</strong> · Dosage: <strong>{dispenseModal.dosage}</strong></p>
                {dispenseModal.instructions && <p className="text-slate-500 dark:text-slate-400 italic text-[11px]">"{dispenseModal.instructions}"</p>}
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Pharmacist Dispensing Notes (Optional)</label>
                <Input
                  value={dispenseNotes}
                  onChange={(e) => setDispenseNotes(e.target.value)}
                  placeholder="e.g. Batch verified. Patient counseled on morning intake."
                  className="text-xs h-8"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDispenseModal(null)}
                  className="rounded-full text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    dispensePrescriptionMutation.mutate({
                      id: dispenseModal.id,
                      notes: dispenseNotes || undefined,
                    });
                  }}
                  disabled={dispensePrescriptionMutation.isPending}
                  className="rounded-full bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs h-9 px-4 shadow-sm"
                >
                  {dispensePrescriptionMutation.isPending ? "Dispensing…" : "Confirm & Dispense Medication"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 9. MODAL: Referral Status Lifecycle Transition */}
      {referralStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-purple-700 dark:text-purple-400" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">{referralStatusModal.actionLabel}</CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Patient: {referralStatusModal.patientName}</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setReferralStatusModal(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3.5 pt-4 text-xs">
              <div className="rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/50 p-3 space-y-1">
                <p className="text-purple-900 dark:text-purple-200 font-semibold">Transitioning to Status: <span className="font-mono font-bold">{referralStatusModal.nextStatus}</span></p>
                <p className="text-purple-700 dark:text-purple-300 text-[11px]">This state update will be permanently logged in the ABDM audit trail with timestamp and facility worker signature.</p>
              </div>

              {referralStatusModal.nextStatus === "TRANSPORT_ASSIGNED" && (
                <>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">Vehicle / Transport Unit</label>
                    <Input
                      value={transportVehicleInput}
                      onChange={(e) => setTransportVehicleInput(e.target.value)}
                      placeholder="108 Emergency Ambulance #GJ-01-204"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">Driver / Dispatcher Contact</label>
                    <Input
                      value={transportDriverContactInput}
                      onChange={(e) => setTransportDriverContactInput(e.target.value)}
                      placeholder="+91 98 7654 3210 (Driver Ramesh)"
                      className="mt-1 text-xs"
                    />
                  </div>
                </>
              )}

              {referralStatusModal.nextStatus === "COMPLETED" && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Clinical Outcome / Discharge Summary</label>
                  <Textarea
                    value={outcomeInput}
                    onChange={(e) => setOutcomeInput(e.target.value)}
                    placeholder="e.g. Treated in Emergency Ward. Dual therapy adjusted. Discharged with 14-day home BP monitoring instructions."
                    className="mt-1 text-xs resize-none min-h-20"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Handover Notes / Instructions</label>
                <Textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Clinical notes, handover comments, or vital signs confirmation..."
                  className="mt-1 text-xs resize-none min-h-16"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" onClick={() => setReferralStatusModal(null)} className="rounded-full text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    updateReferral.mutate({
                      id: referralStatusModal.id,
                      status: referralStatusModal.nextStatus,
                      notes: statusNotes || undefined,
                      transportVehicle: referralStatusModal.nextStatus === "TRANSPORT_ASSIGNED" ? transportVehicleInput : undefined,
                      transportDriverContact: referralStatusModal.nextStatus === "TRANSPORT_ASSIGNED" ? transportDriverContactInput : undefined,
                      outcome: referralStatusModal.nextStatus === "COMPLETED" ? outcomeInput : undefined,
                    });
                  }}
                  disabled={updateReferral.isPending}
                  className="rounded-full bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs h-9 px-4 shadow-sm"
                >
                  {updateReferral.isPending ? "Updating…" : `Confirm ${referralStatusModal.nextStatus}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 10. MODAL: Referral Event Timeline Viewer */}
      {selectedTimelineReferralId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-700 dark:text-purple-400" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Referral Event Audit Timeline #{selectedTimelineReferralId}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Immutable handover audit trail with actor timestamps</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedTimelineReferralId(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              {((referralTimelineQuery.data as any)?.events || (referralTimelineQuery.data as any) || []).length === 0 ? (
                <p className="text-slate-400 text-center py-6">No timestamped events recorded yet.</p>
              ) : (
                <div className="relative pl-6 space-y-4 border-l-2 border-purple-200 dark:border-purple-800 ml-2">
                  {((referralTimelineQuery.data as any)?.events || (referralTimelineQuery.data as any) || []).map((ev: any, idx: number) => (
                    <div key={ev.id || idx} className="relative">
                      <div className="absolute -left-[31px] top-0.5 h-3.5 w-3.5 rounded-full bg-purple-600 border-2 border-white dark:border-slate-900 ring-2 ring-purple-200 dark:ring-purple-900" />
                      <div className="flex items-center justify-between">
                        <Badge className="font-mono text-[10px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
                          {ev.status}
                        </Badge>
                        <span className="text-[10px] text-slate-400">{new Date(ev.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-slate-800 dark:text-slate-200 font-semibold">{ev.notes || "Status transition recorded"}</p>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Actor: <strong>{ev.actorName || "Facility Officer"}</strong> ({ev.actorRole || "Staff"})
                        {ev.transportVehicle && <span className="block text-purple-700 dark:text-purple-400">Transport: {ev.transportVehicle}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </WorkspaceLayout>
  );
}
