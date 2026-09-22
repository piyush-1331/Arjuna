import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  Edit,
  Lock,
  Mail,
  Phone,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Plus,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Award,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  MAHARASHTRA_DISTRICTS,
  MAHARASHTRA_DISTRICTS_REGISTRY,
  isSystemAdmin,
  getDefaultRolePassword,
} from "@shared/maharashtraLocations";

export interface DistrictAdminsManagementViewProps {
  isSystemAdmin?: boolean;
}

export function DistrictAdminsManagementView({
  isSystemAdmin: propIsSystemAdmin,
}: DistrictAdminsManagementViewProps = {}) {
  const { user } = useAuth();
  const isSys = propIsSystemAdmin ?? isSystemAdmin(user);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "administrator" as "administrator" | "admin" | "super_admin",
    district: "",
    designation: "",
    employeeId: "",
    password: "",
    status: "APPROVED" as "APPROVED" | "PENDING" | "REJECTED" | "SUSPENDED",
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  // New Admin Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "+91 94220 00000",
    district: "Pune",
    role: "administrator" as "administrator" | "super_admin",
    designation: "District Health Officer (CDHO)",
    employeeId: "",
    password: "Admin@Arjuna2026",
  });

  const utils = trpc.useUtils();
  const districtAdminsQuery = trpc.admin.listDistrictAdmins.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });

  const updateAdminMutation = trpc.admin.updateUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Administrator details updated successfully!");
      setEditModalOpen(false);
      setSelectedAdmin(null);
      utils.admin.listDistrictAdmins.invalidate();
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update administrator");
    },
  });

  const createAdminMutation = trpc.admin.createStaffUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "New administrator account provisioned!");
      setCreateModalOpen(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "+91 94220 00000",
        district: "Pune",
        role: "administrator",
        designation: "District Health Officer (CDHO)",
        employeeId: "",
        password: "Admin@Arjuna2026",
      });
      utils.admin.listDistrictAdmins.invalidate();
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create administrator");
    },
  });

  const suspendMutation = trpc.admin.suspendUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Account status changed to SUSPENDED");
      utils.admin.listDistrictAdmins.invalidate();
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to suspend administrator");
    },
  });

  const reactivateMutation = trpc.admin.reactivateUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Account reactivated and set to APPROVED");
      utils.admin.listDistrictAdmins.invalidate();
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reactivate administrator");
    },
  });

  const districtAdmins = districtAdminsQuery.data?.districtAdmins || [];

  // Extract unique administrative divisions
  const divisions = Array.from(
    new Set(districtAdmins.map((d) => d.division).filter(Boolean))
  ).sort();

  // Filter district admins
  const filteredAdmins = districtAdmins.filter((admin) => {
    if (selectedDivisionFilter !== "ALL" && admin.division !== selectedDivisionFilter) {
      return false;
    }
    if (selectedStatusFilter !== "ALL" && admin.status !== selectedStatusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        admin.name.toLowerCase().includes(q) ||
        admin.district.toLowerCase().includes(q) ||
        admin.email.toLowerCase().includes(q) ||
        (admin.headquarters && admin.headquarters.toLowerCase().includes(q)) ||
        (admin.division && admin.division.toLowerCase().includes(q)) ||
        (admin.phone && admin.phone.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenEdit = (admin: any) => {
    setSelectedAdmin(admin);
    const isSuper = admin.isSuperAdmin || admin.role === "super_admin";
    setEditForm({
      name: admin.name || "",
      email: admin.email || "",
      phone: admin.phone || "",
      role: isSuper ? "super_admin" : "administrator",
      district: admin.district || "Pune",
      designation: isSuper
        ? "Apex State Health Director & Super Administrator"
        : `${admin.headquarters || admin.district} District Health Officer (CDHO)`,
      employeeId: `EMP-${(admin.id || admin.district || "ADM").toString().toUpperCase()}`,
      password: "",
      status: admin.status || "APPROVED",
    });
    setShowEditPassword(false);
    setEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    const numericUserId = typeof selectedAdmin.id === "number" ? selectedAdmin.id : 1;

    updateAdminMutation.mutate({
      userId: numericUserId,
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      role: editForm.role,
      district: editForm.district,
      designation: editForm.designation.trim(),
      employeeId: editForm.employeeId.trim(),
      status: editForm.status,
      password: editForm.password.trim() || undefined,
    });
  };

  const handleQuickPasswordReset = (admin: any) => {
    const numericUserId = typeof admin.id === "number" ? admin.id : 1;
    const defaultPwd = admin.isSuperAdmin ? "SuperAdmin@Arjuna2026" : "Admin@Arjuna2026";
    updateAdminMutation.mutate({
      userId: numericUserId,
      password: defaultPwd,
    });
  };

  const handleToggleStatus = (admin: any) => {
    const numericUserId = typeof admin.id === "number" ? admin.id : 1;
    if (admin.status === "APPROVED") {
      suspendMutation.mutate({ userId: numericUserId, reason: "Administrative suspension by Super Admin" });
    } else {
      reactivateMutation.mutate({ userId: numericUserId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3 py-1 text-xs uppercase tracking-wider rounded-full shadow-md">
                🏛️ State Directorate Apex Control
              </Badge>
              <Badge className="bg-indigo-600/80 text-white font-semibold text-xs rounded-full border border-indigo-400/30">
                Maharashtra State Health Governance
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              District Administrators & Super Admins Directory
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Full administrative authority over all 36 Maharashtra District Health Administrators (CDHOs) and State Super Administrators. View, edit credentials, reassign jurisdictions, and enforce governance state-wide.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => districtAdminsQuery.refetch()}
              variant="outline"
              disabled={districtAdminsQuery.isFetching}
              className="rounded-2xl border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs h-10 gap-2 backdrop-blur-md"
            >
              <RefreshCw className={`h-4 w-4 ${districtAdminsQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh Directory
            </Button>
            {isSys && (
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-10 gap-2 shadow-lg hover:shadow-amber-500/20 transition-all"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                Provision District Admin
              </Button>
            )}
          </div>
        </div>

        {/* Quick Numerical Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3 backdrop-blur-xs border border-white/5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Administrators</p>
            <p className="text-2xl font-black text-white mt-0.5">{districtAdmins.length}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 backdrop-blur-xs border border-white/5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Administrative Districts</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">36 Districts</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 backdrop-blur-xs border border-white/5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Super Administrators</p>
            <p className="text-2xl font-black text-amber-400 mt-0.5">
              {districtAdmins.filter((d) => d.isSuperAdmin || d.isSystemAdmin).length} Apex
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 backdrop-blur-xs border border-white/5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">System Status</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-emerald-300">100% Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by District, Administrator Name, Email, Division, Headquarters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Division Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedDivisionFilter} onValueChange={setSelectedDivisionFilter}>
                <SelectTrigger className="w-[180px] h-10 rounded-2xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="ALL">All Divisions (All Maharashtra)</SelectItem>
                  {divisions.map((div) => (
                    <SelectItem key={div} value={div}>
                      {div}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="w-[140px] h-10 rounded-2xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Administrators Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAdmins.map((admin) => {
          const isSuper = admin.isSuperAdmin || admin.isSystemAdmin || admin.id === "super-admin-state";
          return (
            <Card
              key={admin.id}
              className={`rounded-3xl border transition-all duration-200 hover:shadow-lg ${
                isSuper
                  ? "border-amber-400/60 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 dark:from-amber-950/20 dark:via-slate-900 dark:to-amber-950/10 shadow-md ring-1 ring-amber-400/30"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              }`}
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        className={`text-[10px] font-black uppercase tracking-wider rounded-full px-2.5 py-0.5 ${
                          isSuper
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                        }`}
                      >
                        {isSuper ? "🏛️ Super Admin" : "📍 District Admin"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold rounded-full ${
                          admin.status === "APPROVED"
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                            : admin.status === "SUSPENDED"
                            ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30"
                            : "border-amber-500 text-amber-600 bg-amber-50"
                        }`}
                      >
                        {admin.status}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white truncate mt-1">
                      {admin.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">{admin.district}</span>
                      {admin.headquarters && admin.headquarters !== admin.district && (
                        <span>· {admin.headquarters}</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                {/* Admin Contact & Metadata Box */}
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-2 text-xs border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
                    </span>
                    <span className="font-mono font-semibold text-[11px] truncate max-w-[180px]" title={admin.email}>
                      {admin.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> Phone
                    </span>
                    <span className="font-semibold text-[11px]">{admin.phone || "—"}</span>
                  </div>

                  {admin.division && (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" /> Division
                      </span>
                      <span className="font-semibold text-[11px] text-indigo-600 dark:text-indigo-400">
                        {admin.division}
                      </span>
                    </div>
                  )}
                </div>

                {/* Management Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={() => handleOpenEdit(admin)}
                    size="sm"
                    className="flex-1 rounded-2xl bg-[#15181b] dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs h-9 gap-1.5 shadow-sm"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit Details
                  </Button>

                  <Button
                    onClick={() => handleQuickPasswordReset(admin)}
                    size="sm"
                    variant="outline"
                    title="Reset password to default"
                    className="rounded-2xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-semibold text-xs h-9 px-3"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>

                  {!isSuper && (
                    <Button
                      onClick={() => handleToggleStatus(admin)}
                      size="sm"
                      variant={admin.status === "APPROVED" ? "outline" : "default"}
                      title={admin.status === "APPROVED" ? "Suspend Administrator" : "Reactivate Administrator"}
                      className={`rounded-2xl text-xs font-semibold h-9 px-3 ${
                        admin.status === "APPROVED"
                          ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                      }`}
                    >
                      {admin.status === "APPROVED" ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAdmins.length === 0 && (
        <Card className="rounded-3xl border-dashed border-2 border-slate-200 dark:border-slate-800 p-12 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base">No District Administrators Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No administrators match the search query "{searchQuery}" or selected division filter.
          </p>
          <Button
            onClick={() => {
              setSearchQuery("");
              setSelectedDivisionFilter("ALL");
              setSelectedStatusFilter("ALL");
            }}
            variant="outline"
            size="sm"
            className="mt-4 rounded-2xl text-xs font-bold"
          >
            Clear Filters
          </Button>
        </Card>
      )}

      {/* 1. EDIT ADMINISTRATOR MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500 text-slate-950 font-black text-xs rounded-full">
                Apex Super Admin Control
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold mt-1">
              Edit Administrator · {editForm.district}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update administrator credentials, contact details, assigned district, role, or status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</Label>
              <Input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="rounded-2xl text-xs h-10"
                placeholder="Dr. Sanjay Deshmukh"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Official Email *</Label>
                <Input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="rounded-2xl text-xs h-10 font-mono"
                  placeholder="admin.pune@arjuna.gov.in"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number *</Label>
                <Input
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="rounded-2xl text-xs h-10"
                  placeholder="+91 94220 12345"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Assigned District *</Label>
                <Select
                  value={editForm.district}
                  onValueChange={(val) => setEditForm({ ...editForm, district: val })}
                >
                  <SelectTrigger className="rounded-2xl text-xs h-10 font-semibold">
                    <SelectValue placeholder="Select District" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-56">
                    <SelectItem value="All Districts (Maharashtra)">All Districts (State-Wide)</SelectItem>
                    {MAHARASHTRA_DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Governance Role *</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(val: any) => setEditForm({ ...editForm, role: val })}
                >
                  <SelectTrigger className="rounded-2xl text-xs h-10 font-semibold">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="administrator">District Administrator</SelectItem>
                    <SelectItem value="super_admin">🏛️ State Super Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Designation / Title</Label>
                <Input
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  className="rounded-2xl text-xs h-10"
                  placeholder="Chief District Health Officer (CDHO)"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Account Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(val: any) => setEditForm({ ...editForm, status: val })}
                >
                  <SelectTrigger className="rounded-2xl text-xs h-10 font-semibold">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="APPROVED">APPROVED (Active)</SelectItem>
                    <SelectItem value="SUSPENDED">SUSPENDED (Disabled)</SelectItem>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Update Password (leave blank to keep current)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditForm({ ...editForm, password: "Admin@Arjuna2026" })}
                  className="text-[11px] h-6 px-2 text-indigo-600 font-semibold"
                >
                  Use Default (Admin@Arjuna2026)
                </Button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type={showEditPassword ? "text" : "password"}
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="pl-10 pr-10 rounded-2xl text-xs h-10 font-mono"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="rounded-2xl text-xs font-bold h-10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateAdminMutation.isPending}
                className="rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-10 px-5 shadow-md"
              >
                {updateAdminMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. PROVISION DISTRICT ADMIN MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500 text-slate-950 font-black text-xs rounded-full">
                Apex Provisioning
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold mt-1">
              Provision New Administrator Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create and activate a new District Health Administrator or Super Administrator account.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createAdminMutation.mutate({
                name: createForm.name.trim(),
                email: createForm.email.trim(),
                phone: createForm.phone.trim(),
                district: createForm.district,
                role: createForm.role,
                designation: createForm.designation.trim(),
                employeeId: createForm.employeeId.trim() || undefined,
                password: createForm.password.trim() || "Admin@Arjuna2026",
              });
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Administrator Full Name *</Label>
              <Input
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="rounded-2xl text-xs h-10"
                placeholder="Dr. Rajesh Kulkarni"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Official Email *</Label>
                <Input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="rounded-2xl text-xs h-10 font-mono"
                  placeholder="admin.new@arjuna.gov.in"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number *</Label>
                <Input
                  required
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="rounded-2xl text-xs h-10"
                  placeholder="+91 94220 12345"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Jurisdiction District *</Label>
                <Select
                  value={createForm.district}
                  onValueChange={(val) => setCreateForm({ ...createForm, district: val })}
                >
                  <SelectTrigger className="rounded-2xl text-xs h-10 font-semibold">
                    <SelectValue placeholder="Select District" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-56">
                    <SelectItem value="All Districts (Maharashtra)">All Districts (State Super Admin)</SelectItem>
                    {MAHARASHTRA_DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Role *</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(val: any) => setCreateForm({ ...createForm, role: val })}
                >
                  <SelectTrigger className="rounded-2xl text-xs h-10 font-semibold">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="administrator">District Administrator</SelectItem>
                    <SelectItem value="super_admin">🏛️ Super Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</Label>
              <Input
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="rounded-2xl text-xs h-10 font-mono"
                placeholder="Admin@Arjuna2026"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-2xl text-xs font-bold h-10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAdminMutation.isPending}
                className="rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-10 px-5 shadow-md"
              >
                {createAdminMutation.isPending ? "Provisioning..." : "Provision Administrator"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
