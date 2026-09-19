import React, { useEffect, useState } from "react";
import { SessionManager, type SessionEvent } from "@/_core/sessionManager";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, HeartPulse, LogIn, LogOut, ShieldAlert, UserCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function SessionManagerModal() {
  const [open, setOpen] = useState(false);
  const [eventDetails, setEventDetails] = useState<SessionEvent | null>(null);
  const { user, logout, refresh } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const unsubscribe = SessionManager.subscribe((event) => {
      if (event.type === "expired" || event.type === "invalid" || event.type === "unauthorized") {
        const path = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
        // Don't show modal if already on public login / onboarding pages
        if (
          path === "/" ||
          path === "/arjuna" ||
          path === "/arjuna/" ||
          path.includes("/login") ||
          path.includes("/forgot-password") ||
          path.includes("/reset-password")
        ) {
          return;
        }
        setEventDetails(event);
        setOpen(true);
        SessionManager.setModalVisible(true);
      } else if (event.type === "authenticated" || event.type === "logged_out") {
        setOpen(false);
        SessionManager.setModalVisible(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSignInAgain = () => {
    setOpen(false);
    SessionManager.setModalVisible(false);
    SessionManager.saveReturnUrl();
    setLocation("/login");
  };

  const handleSwitchAccount = async () => {
    setOpen(false);
    SessionManager.setModalVisible(false);
    await logout();
  };

  const handleViewPendingStatus = () => {
    setOpen(false);
    SessionManager.setModalVisible(false);
    setLocation("/pending-approval");
  };

  const isPendingStaff = user && (user as any).status === "PENDING";

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Prevent accidental dismissal by clicking outside
      if (!val) {
        setOpen(false);
        SessionManager.setModalVisible(false);
      }
    }}>
      <DialogContent className="max-w-md rounded-3xl border border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-50">
        <DialogHeader className="flex flex-col items-center text-center space-y-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800 shadow-sm animate-pulse">
            <Clock className="h-7 w-7" />
          </div>

          <DialogTitle className="display-font text-xl font-extrabold text-slate-900 dark:text-slate-100">
            {isPendingStaff ? "Staff Verification Pending" : "Session Expired"}
          </DialogTitle>

          <DialogDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {isPendingStaff ? (
              <>Your healthcare staff registration is currently awaiting verification by the <strong>{user?.district || "District"} Administrator</strong>. You can view your live approval status or sign in with another verified account.</>
            ) : (
              <>Your security authentication token has expired or is no longer active. To protect patient and healthcare operational data, please re-authenticate to continue seamlessly.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">User Profile:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{user.name || "Care User"}</span>
            </div>
            {user.email && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Email:</span>
                <span className="font-semibold truncate max-w-[200px]">{user.email}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Role / Status:</span>
              <span className="font-bold uppercase text-[11px] text-amber-600 dark:text-amber-400">
                {user.role} ({user.status || "PENDING"})
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2.5 pt-3">
          {isPendingStaff ? (
            <Button
              onClick={handleViewPendingStatus}
              className="flex-1 rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white font-bold text-xs h-11 gap-2 shadow-sm"
            >
              <UserCheck className="h-4 w-4 text-[#8dc5e3]" />
              <span>View Verification Status</span>
            </Button>
          ) : (
            <Button
              onClick={handleSignInAgain}
              className="flex-1 rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white font-bold text-xs h-11 gap-2 shadow-sm"
            >
              <LogIn className="h-4 w-4 text-[#8dc5e3]" />
              <span>Sign In to Resume</span>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleSwitchAccount}
            className="flex-1 rounded-2xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs h-11 gap-2"
          >
            <LogOut className="h-4 w-4 text-slate-500" />
            <span>Switch Account</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
