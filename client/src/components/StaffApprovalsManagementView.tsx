import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  Building,
  MapPin,
  IdCard,
  FileBadge,
  Sparkles,
  Lock,
  UserPlus,
} from "lucide-react";
import { MAHARASHTRA_DISTRICTS, getCitiesForDistrict } from "@shared/maharashtraLocations";

export function StaffApprovalsManagementView() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dialog states for reject, suspend, and manual staff addition
  const [addStaffDialogOpen, setAddStaffDialogOpen] = useState<boolean>(false);
  const [newStaffForm, setNewStaffForm] = useState({
    name: "",
    email: "",
    role: "doctor" as "doctor" | "asha" | "cho" | "facility_staff" | "administrator",
    phone: "",
    district: "Nandurbar",
    assignedVillage: "",
    employeeId: "",
    designation: "",
    facilityName: "",
    registrationNumber: "",
  });

  const [rejectDialogOpen, setRejectDialogOpen] = useState<boolean>(false);
  const [selectedUserForReject, setSelectedUserForReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const [suspendDialogOpen, setSuspendDialogOpen] = useState<boolean>(false);
  const [selectedUserForSuspend, setSelectedUserForSuspend] = useState<any | null>(null);
  const [suspensionReason, setSuspensionReason] = useState<string>("");

  const utils = trpc.useUtils();
  const usersQuery = trpc.admin.listUsers.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });

  const createStaffMutation = trpc.admin.createStaffUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Staff member created and approved successfully.");
      setAddStaffDialogOpen(false);
      setNewStaffForm({
        name: "",
        email: "",
        role: "doctor",
        phone: "",
        district: "Nandurbar",
        assignedVillage: "",
        employeeId: "",
        designation: "",
        facilityName: "",
        registrationNumber: "",
      });
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create staff member");
    },
  });

  const approveMutation = trpc.admin.approveUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "User approved successfully");
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to approve user");
    },
  });

  const rejectMutation = trpc.admin.rejectUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "User rejected successfully");
      setRejectDialogOpen(false);
      setSelectedUserForReject(null);
      setRejectionReason("");
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reject user");
    },
  });

  const suspendMutation = trpc.admin.suspendUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "User account suspended");
      setSuspendDialogOpen(false);
      setSelectedUserForSuspend(null);
      setSuspensionReason("");
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to suspend user");
    },
  });

  const reactivateMutation = trpc.admin.reactivateUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "User account reactivated");
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reactivate user");
    },
  });

  const allUsers = usersQuery.data?.users || [];

  // Metrics summary
  const totalUsers = allUsers.length;
  const pendingUsers = allUsers.filter((u) => u.status === "PENDING").length;
  const approvedStaff = allUsers.filter((u) => u.status === "APPROVED" && u.role !== "citizen").length;
  const suspendedUsers = allUsers.filter((u) => u.status === "SUSPENDED").length;
  const rejectedUsers = allUsers.filter((u) => u.status === "REJECTED").length;

  const filteredUsers = allUsers.filter((u) => {
    // Status filter
    if (statusFilter !== "ALL" && u.status !== statusFilter) return false;

    // Role filter
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = (u.phone || "").toLowerCase();
      const village = (u.village || "").toLowerCase();
      const designation = (u.designation || "").toLowerCase();
      const facility = (u.facilityName || "").toLowerCase();
      const regNo = (u.registrationNumber || "").toLowerCase();
      const empId = (u.employeeId || "").toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        village.includes(q) ||
        designation.includes(q) ||
        facility.includes(q) ||
        regNo.includes(q) ||
        empId.includes(q)
      );
    }

    return true;
  });

  const handleApprove = (user: any) => {
    approveMutation.mutate({ userId: user.id });
  };

  const handleOpenReject = (user: any) => {
    setSelectedUserForReject(user);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedUserForReject) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectMutation.mutate({
      userId: selectedUserForReject.id,
      rejectionReason: rejectionReason.trim(),
    });
  };

  const handleOpenSuspend = (user: any) => {
    setSelectedUserForSuspend(user);
    setSuspensionReason("");
    setSuspendDialogOpen(true);
  };

  const handleConfirmSuspend = () => {
    if (!selectedUserForSuspend) return;
    suspendMutation.mutate({
      userId: selectedUserForSuspend.id,
      reason: suspensionReason.trim() || undefined,
    });
  };

  const handleReactivate = (user: any) => {
    reactivateMutation.mutate({ userId: user.id });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Administrator</Badge>;
      case "doctor":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Doctor</Badge>;
      case "cho":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">CHO</Badge>;
      case "asha":
        return <Badge className="bg-teal-100 text-teal-800 border-teal-200">ASHA Worker</Badge>;
      case "facility_staff":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Facility Staff</Badge>;
      case "citizen":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Citizen</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 font-medium flex items-center gap-1 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Pending Approval
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-rose-500/10 text-rose-700 border-rose-300 font-medium flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge className="bg-slate-500/10 text-slate-700 border-slate-400 font-medium flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Suspended
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Total Accounts</p>
              <p className="text-xl font-bold text-slate-900">{totalUsers}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-xs rounded-2xl ${pendingUsers > 0 ? "bg-amber-50/80 border border-amber-200" : "bg-white"}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-amber-800 font-semibold">Pending Approvals</p>
              <p className="text-xl font-bold text-amber-900">{pendingUsers}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-100 text-teal-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Active Staff</p>
              <p className="text-xl font-bold text-teal-900">{approvedStaff}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Rejected</p>
              <p className="text-xl font-bold text-rose-900">{rejectedUsers}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-200 text-slate-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Suspended</p>
              <p className="text-xl font-bold text-slate-900">{suspendedUsers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. CONTROLS & FILTER BAR */}
      <Card className="border-0 shadow-xs bg-white rounded-2xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              <Button
                variant={statusFilter === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("ALL")}
                className="rounded-full text-xs"
              >
                All Users ({allUsers.length})
              </Button>
              <Button
                variant={statusFilter === "PENDING" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("PENDING")}
                className={`rounded-full text-xs ${
                  pendingUsers > 0 && statusFilter !== "PENDING" ? "border-amber-400 text-amber-700 bg-amber-50" : ""
                }`}
              >
                Pending ({pendingUsers})
              </Button>
              <Button
                variant={statusFilter === "APPROVED" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("APPROVED")}
                className="rounded-full text-xs"
              >
                Approved ({allUsers.filter((u) => u.status === "APPROVED").length})
              </Button>
              <Button
                variant={statusFilter === "REJECTED" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("REJECTED")}
                className="rounded-full text-xs"
              >
                Rejected ({rejectedUsers})
              </Button>
              <Button
                variant={statusFilter === "SUSPENDED" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("SUSPENDED")}
                className="rounded-full text-xs"
              >
                Suspended ({suspendedUsers})
              </Button>
            </div>

            {/* Refresh and actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => usersQuery.refetch()}
                disabled={usersQuery.isFetching}
                className="rounded-full text-xs text-slate-600"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${usersQuery.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setAddStaffDialogOpen(true)}
                className="rounded-full text-xs bg-[#15181b] hover:bg-slate-800 text-white font-bold gap-1.5 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Staff Manually
              </Button>
            </div>
          </div>

          {/* Search and Role Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, phone, facility, village, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs h-9"
              />
            </div>
            <div className="md:col-span-4">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-slate-50/70 border-slate-200 rounded-xl text-xs h-9">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="asha">ASHA Workers</SelectItem>
                  <SelectItem value="cho">Community Health Officers (CHO)</SelectItem>
                  <SelectItem value="doctor">Medical Officers / Doctors</SelectItem>
                  <SelectItem value="facility_staff">Facility Staff</SelectItem>
                  <SelectItem value="citizen">Citizens</SelectItem>
                  <SelectItem value="admin">Administrators</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. USER LIST CARDS */}
      <div className="space-y-3">
        {usersQuery.isLoading ? (
          <Card className="border-0 shadow-xs bg-white rounded-2xl p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto text-teal-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading user registry and verification requests...</p>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card className="border-0 shadow-xs bg-white rounded-2xl p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-bold text-slate-800">No users match the criteria</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search terms, role filters, or status tab.
            </p>
          </Card>
        ) : (
          filteredUsers.map((user) => {
            const isProtectedAdmin = user.role === "admin";

            return (
              <Card
                key={user.id}
                className={`border-0 shadow-xs bg-white rounded-2xl transition-all hover:shadow-sm ${
                  user.status === "PENDING"
                    ? "border-l-4 border-l-amber-500 bg-amber-50/20"
                    : user.status === "SUSPENDED"
                    ? "border-l-4 border-l-slate-400 bg-slate-50/30"
                    : user.status === "REJECTED"
                    ? "border-l-4 border-l-rose-400 bg-rose-50/10"
                    : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: User Avatar & Core Details */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700 text-base shrink-0 shadow-xs">
                        {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900 leading-none">
                            {user.name || "Unnamed User"}
                          </h4>
                          {getRoleBadge(user.role)}
                          {getStatusBadge(user.status)}
                          {isProtectedAdmin && (
                            <Badge className="bg-purple-900 text-purple-100 font-mono text-[10px] flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Single System Admin
                            </Badge>
                          )}
                        </div>

                        {/* Contact info row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {user.email}
                          </span>
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {user.phone}
                            </span>
                          )}
                        </div>

                        {/* Professional & Location details row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                          {user.designation && (
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <FileBadge className="w-3.5 h-3.5 text-teal-600" />
                              {user.designation}
                            </span>
                          )}
                          {user.facilityName && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                              {user.facilityName}
                            </span>
                          )}
                          {user.village && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              Village: {user.village}
                            </span>
                          )}
                          {user.employeeId && (
                            <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              <IdCard className="w-3 h-3 text-slate-500" />
                              Emp ID: {user.employeeId}
                            </span>
                          )}
                          {user.registrationNumber && (
                            <span className="flex items-center gap-1 font-mono text-[11px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-100">
                              <ShieldCheck className="w-3 h-3 text-blue-600" />
                              Reg No: {user.registrationNumber}
                            </span>
                          )}
                        </div>

                        {/* Status detail / reason banner if rejected or requested */}
                        {user.status === "PENDING" && (
                          <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Approval Requested:{" "}
                            {user.approvalRequestedAt
                              ? new Date(user.approvalRequestedAt).toLocaleString()
                              : user.createdAt
                              ? new Date(user.createdAt).toLocaleString()
                              : "Recently"}
                          </div>
                        )}

                        {user.status === "REJECTED" && user.rejectionReason && (
                          <div className="mt-2 text-[11px] text-rose-800 bg-rose-50 border border-rose-200/80 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>
                              <strong>Rejection Reason:</strong> {user.rejectionReason}
                            </span>
                          </div>
                        )}

                        {user.status === "APPROVED" && user.approvedBy && (
                          <div className="mt-1 text-[11px] text-slate-400">
                            Approved by <span className="text-slate-600">{user.approvedBy}</span>
                            {user.approvedAt ? ` on ${new Date(user.approvedAt).toLocaleDateString()}` : ""}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center pt-2 lg:pt-0">
                      {/* PENDING ACTIONS */}
                      {user.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(user)}
                            disabled={approveMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-4 shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReject(user)}
                            disabled={rejectMutation.isPending}
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold"
                          >
                            <XCircle className="w-4 h-4 mr-1.5" />
                            Reject
                          </Button>
                        </>
                      )}

                      {/* APPROVED ACTIONS */}
                      {user.status === "APPROVED" && !isProtectedAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenSuspend(user)}
                          disabled={suspendMutation.isPending}
                          className="border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          Suspend
                        </Button>
                      )}

                      {/* SUSPENDED ACTIONS */}
                      {user.status === "SUSPENDED" && (
                        <Button
                          size="sm"
                          onClick={() => handleReactivate(user)}
                          disabled={reactivateMutation.isPending}
                          className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Reactivate
                        </Button>
                      )}

                      {/* REJECTED ACTIONS (Allow re-evaluating and approving if corrected) */}
                      {user.status === "REJECTED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(user)}
                          disabled={approveMutation.isPending}
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Re-approve
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 4. REJECT USER DIALOG */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mb-2">
              <XCircle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Reject Staff Registration
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Please specify the reason for rejecting registration for{" "}
              <strong>{selectedUserForReject?.name || selectedUserForReject?.email}</strong>. This feedback will be displayed to the user.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <Textarea
                placeholder="e.g., Medical registration number could not be verified with Gujarat Medical Council registry..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="text-xs rounded-xl border-slate-300"
              />
            </div>

            {/* Quick Templates */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-500">Quick Templates:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Invalid or unverifiable registration number",
                  "Designation does not match facility staffing roster",
                  "Employee ID not found in health department registry",
                  "Duplicate registration application",
                ].map((tmpl) => (
                  <button
                    key={tmpl}
                    type="button"
                    onClick={() => setRejectionReason(tmpl)}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. SUSPEND USER DIALOG */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 mb-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Suspend User Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Suspending <strong>{selectedUserForSuspend?.name || selectedUserForSuspend?.email}</strong> will immediately revoke access to clinical and district workspaces.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Suspension Reason (Optional)
              </label>
              <Textarea
                placeholder="e.g., Temporary administrative hold pending audit..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                rows={2}
                className="text-xs rounded-xl border-slate-300"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSuspendDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSuspend}
              disabled={suspendMutation.isPending}
              className="rounded-xl text-xs bg-slate-800 hover:bg-slate-900 text-white"
            >
              {suspendMutation.isPending ? "Suspending..." : "Suspend Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. ADD STAFF MEMBER MANUALLY DIALOG */}
      <Dialog open={addStaffDialogOpen} onOpenChange={setAddStaffDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl p-6">
          <DialogHeader>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 mb-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Add Healthcare Staff Member Manually
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provision an authorized doctor, ASHA worker, CHO officer, or facility staff. Manually created accounts are immediately marked <strong>APPROVED</strong>.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newStaffForm.name.trim()) {
                toast.error("Full name is required.");
                return;
              }
              if (!newStaffForm.email.trim()) {
                toast.error("Official email is required.");
                return;
              }
              if (!newStaffForm.district.trim()) {
                toast.error("District selection is required.");
                return;
              }
              if (!newStaffForm.assignedVillage.trim()) {
                toast.error("City, village or taluka is required.");
                return;
              }
              createStaffMutation.mutate({
                name: newStaffForm.name.trim(),
                email: newStaffForm.email.trim(),
                role: newStaffForm.role,
                phone: newStaffForm.phone.trim() || "+91 94221 00000",
                district: newStaffForm.district,
                assignedVillage: newStaffForm.assignedVillage,
                village: newStaffForm.assignedVillage,
                employeeId: newStaffForm.employeeId.trim() || undefined,
                designation: newStaffForm.designation.trim() || undefined,
                facilityName: newStaffForm.facilityName.trim() || undefined,
                registrationNumber: newStaffForm.registrationNumber.trim() || undefined,
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Healthcare Role *</label>
                <select
                  value={newStaffForm.role}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value as any })}
                  className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold"
                >
                  <option value="doctor">Doctor / Medical Officer (MO)</option>
                  <option value="asha">ASHA Worker</option>
                  <option value="cho">Community Health Officer (CHO)</option>
                  <option value="facility_staff">Facility Staff / Pharmacist</option>
                  <option value="administrator">District Administrator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <Input
                  required
                  placeholder="e.g., Dr. Rajesh Deshmukh"
                  value={newStaffForm.name}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                  className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Email Address *</label>
                <Input
                  type="email"
                  required
                  placeholder="staff@arjuna.gov.in"
                  value={newStaffForm.email}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                  className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Mobile Number *</label>
                <Input
                  type="tel"
                  required
                  placeholder="+91 94221 00000"
                  value={newStaffForm.phone}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                  className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">District (Maharashtra) *</label>
                <select
                  value={newStaffForm.district}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, district: e.target.value, assignedVillage: "" })}
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">City / Village / Taluka *</label>
                <select
                  value={newStaffForm.assignedVillage}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, assignedVillage: e.target.value })}
                  className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium focus:bg-white text-slate-900"
                >
                  <option value="">{newStaffForm.district ? "Select City / Village / Taluka" : "Select district first"}</option>
                  {newStaffForm.district && getCitiesForDistrict(newStaffForm.district).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                  {newStaffForm.assignedVillage && newStaffForm.district && !getCitiesForDistrict(newStaffForm.district).includes(newStaffForm.assignedVillage) && (
                    <option value={newStaffForm.assignedVillage}>{newStaffForm.assignedVillage}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Employee ID / Worker ID</label>
                <Input
                  placeholder="EMP-DOC-102"
                  value={newStaffForm.employeeId}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, employeeId: e.target.value })}
                  className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                />
              </div>

              {newStaffForm.role === "doctor" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Medical Reg. Number *</label>
                  <Input
                    placeholder="MMC/2018/12345"
                    value={newStaffForm.registrationNumber}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, registrationNumber: e.target.value })}
                    className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Designation</label>
                  <Input
                    placeholder="e.g. ASHA Facilitator / Pharmacist"
                    value={newStaffForm.designation}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, designation: e.target.value })}
                    className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Assigned Facility / Hospital Name</label>
              <Input
                placeholder="e.g. Shahada Community Health Centre (CHC)"
                value={newStaffForm.facilityName}
                onChange={(e) => setNewStaffForm({ ...newStaffForm, facilityName: e.target.value })}
                className="rounded-2xl bg-slate-50 border-slate-200 h-10 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddStaffDialogOpen(false)}
                className="rounded-2xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createStaffMutation.isPending}
                className="rounded-2xl text-xs font-bold bg-[#15181b] hover:bg-slate-800 text-white shadow-md"
              >
                {createStaffMutation.isPending ? "Creating & Approving..." : "Add & Approve Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
