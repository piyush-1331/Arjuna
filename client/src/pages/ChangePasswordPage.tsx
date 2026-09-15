import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import SupabaseAuthPortal from "@/components/SupabaseAuthPortal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, HeartPulse, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { getPasswordStrengthLabel, validatePasswordStrength } from "@shared/passwordPolicy";
import ProfileDropdownMenu from "@/components/ProfileDropdownMenu";

export default function ChangePasswordPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength = validatePasswordStrength(newPassword);
  const strengthInfo = getPasswordStrengthLabel(passwordStrength.score);

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f3f5f8]">
        <p className="text-xs font-semibold text-slate-500">Checking credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <SupabaseAuthPortal />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }

    if (!newPassword) {
      toast.error("Please enter a new password.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (!passwordStrength.isValid) {
      toast.error(passwordStrength.errors[0] || "New password does not meet security requirements.");
      return;
    }

    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    setLoading(true);
    try {
      // 1. Re-authenticate current password
      if (user.email) {
        const { error: reauthErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        if (reauthErr) {
          throw new Error("Current password verification failed. Please ensure your current password is correct.");
        }
      }

      // 2. Update password in Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateErr) throw updateErr;

      toast.success("Your password has been updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setLocation("/profile");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f8] text-[#15181b] flex flex-col antialiased selection:bg-[#6c9db9]/20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div
            onClick={() => setLocation("/")}
            className="flex cursor-pointer items-center gap-2.5 transition hover:opacity-90"
          >
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#15181b] text-white shadow-sm">
              <HeartPulse className="h-5 w-5 text-[#8dc5e3]" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="display-font text-base font-extrabold tracking-tight">Arjuna</span>
                <span className="rounded-md bg-[#15181b] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">AI</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">Security & Account</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ProfileDropdownMenu />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-10">
        <Card className="w-full max-w-md border border-black/10 bg-white shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 sm:p-8 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setLocation("/profile")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to profile</span>
              </button>
            </div>
            <CardTitle className="display-font text-xl font-bold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-600" />
              <span>Change Account Password</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Verify your current password and establish a new secure credential.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 pt-2 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Current Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 pr-10 rounded-2xl bg-slate-50 border-slate-200 h-11 text-sm focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">New Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="Minimum 8 characters with upper, lower, number, symbol"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10 rounded-2xl bg-slate-50 border-slate-200 h-11 text-sm focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">Strength:</span>
                    <span className={`font-bold text-[11px] ${strengthInfo.color}`}>{strengthInfo.label}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Confirm New Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Re-enter your new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pl-10 pr-10 rounded-2xl bg-slate-50 border-slate-200 h-11 text-sm focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white h-11 font-bold text-sm shadow-md mt-2"
              >
                {loading ? "Updating password..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
