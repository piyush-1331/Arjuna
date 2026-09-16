import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  CheckCircle2,
  Clock,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Shield,
  ShieldAlert,
  Sun,
  User,
  UserCheck,
  UserCog,
  XCircle,
} from "lucide-react";
import { useLocation } from "wouter";

const roleDisplayNames: Record<string, string> = {
  citizen: "Citizen",
  asha: "ASHA Worker",
  cho: "CHO Officer",
  asha_cho: "ASHA / CHO",
  doctor: "Doctor",
  facility_staff: "Facility Staff",
  administrator: "Administrator",
  admin: "Administrator",
};

interface ProfileDropdownMenuProps {
  align?: "start" | "center" | "end";
  className?: string;
}

export default function ProfileDropdownMenu({ align = "end", className }: ProfileDropdownMenuProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AR";

  const status = (user.status || "APPROVED").toUpperCase();

  const getStatusBadge = () => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span>APPROVED</span>
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-700 dark:text-amber-400" />
            <span>PENDING</span>
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-800 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
            <XCircle className="h-3 w-3 text-rose-700 dark:text-rose-400" />
            <span>REJECTED</span>
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-slate-600 dark:text-slate-400" />
            <span>SUSPENDED</span>
          </Badge>
        );
      default:
        return <Badge className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2.5 rounded-full p-1 transition hover:bg-slate-100/80 dark:hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${className || ""}`}
          aria-label="Open profile menu"
          title="Open profile menu"
        >
          <Avatar className="h-9 w-9 border border-black/10 dark:border-white/10 shadow-xs ring-1 ring-black/5 bg-[#15181b] dark:bg-slate-800 text-white">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name || "User Avatar"} />}
            <AvatarFallback className="bg-[#15181b] dark:bg-slate-800 text-white text-xs font-bold tracking-tight">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        className="w-72 rounded-2xl border border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95"
      >
        {/* Profile Card Header */}
        <DropdownMenuLabel className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{user.name || "Care Member"}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email || "No email"}</p>
            </div>
            {getStatusBadge()}
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Role: {roleDisplayNames[user.role] || user.role}
            </span>
            {user.district && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">· {user.district}</span>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />

        {/* Navigation Options */}
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => setLocation("/profile")}
            className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 gap-2.5"
          >
            <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>View Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setLocation("/profile?edit=true")}
            className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 gap-2.5"
          >
            <UserCog className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Edit Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setLocation("/change-password")}
            className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 gap-2.5"
          >
            <KeyRound className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Change Password</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />

        {/* Appearance / Dark Mode Selector */}
        <div className="px-3 py-1.5">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Theme</div>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center justify-center gap-1.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                theme === "light"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sun className="h-3 w-3 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center justify-center gap-1.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                theme === "dark"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Moon className="h-3 w-3 text-amber-400" />
              <span>Dark</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`flex items-center justify-center gap-1.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                theme === "system"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Monitor className="h-3 w-3 text-slate-400" />
              <span>Auto</span>
            </button>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />

        {/* Sign out */}
        <DropdownMenuItem
          onClick={() => logout()}
          className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 focus:bg-rose-50 dark:focus:bg-rose-950/50 gap-2.5"
        >
          <LogOut className="h-4 w-4 text-rose-500 dark:text-rose-400" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
