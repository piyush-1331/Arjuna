import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Eye, EyeOff, HeartPulse, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { getPasswordStrengthLabel, validatePasswordStrength } from "@shared/passwordPolicy";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);

  const passwordStrength = validatePasswordStrength(password);
  const strengthInfo = getPasswordStrengthLabel(passwordStrength.score);

  useEffect(() => {
    if (!supabase) {
      setHasValidSession(false);
      return;
    }

    // Check if recovery session or token is active in URL or Supabase Auth
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setHasValidSession(true);
      } else {
        // If there's an access_token or type=recovery in the hash
        const hash = window.location.hash;
        if (hash.includes("type=recovery") || hash.includes("access_token=")) {
          setHasValidSession(true);
        } else {
          setHasValidSession(false);
        }
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasValidSession(true);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast.error("Please enter a new password.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!passwordStrength.isValid) {
      toast.error(passwordStrength.errors[0] || "Password does not meet the security requirements.");
      return;
    }

    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success("Your password has been updated successfully.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password. Link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f8] text-[#15181b] flex items-center justify-center py-12 px-4 sm:px-6 antialiased selection:bg-[#6c9db9]/20">
      <div className="pointer-events-none fixed -right-24 -top-24 h-96 w-96 rounded-full bg-[#dbeaf5]/60 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#fae8eb]/50 blur-3xl" />

      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#15181b] text-white shadow-md">
            <HeartPulse className="h-6 w-6 text-[#8dc5e3]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="display-font text-2xl font-extrabold tracking-tight">Arjuna</span>
              <span className="rounded-md bg-[#15181b] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">AI</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Reset Account Password</p>
          </div>
        </div>

        <Card className="border border-black/10 bg-white shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 sm:p-8 pb-4 text-center">
            <CardTitle className="display-font text-xl font-bold">Set New Password</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Create a strong, secure password for your Arjuna account.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 pt-2 space-y-4">
            {success ? (
              <div className="space-y-4 text-center">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 flex items-start gap-2.5 text-left">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Your password has been updated. Please log in with your new password to access your care workspace.
                  </p>
                </div>

                <Button
                  onClick={() => setLocation("/")}
                  className="w-full rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white h-11 font-bold text-sm shadow-md"
                >
                  Log in with new password
                </Button>
              </div>
            ) : hasValidSession === false ? (
              <div className="space-y-4 text-center">
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-2.5 text-left">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    This password reset link is invalid or has expired. Please request a new password recovery link.
                  </p>
                </div>

                <Button
                  onClick={() => setLocation("/forgot-password")}
                  className="w-full rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white h-11 font-bold text-sm shadow-md"
                >
                  Request New Reset Link
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Minimum 8 characters with upper, lower, number, symbol"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 rounded-2xl bg-slate-50 border-slate-200 h-11 text-sm focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">Security strength:</span>
                      <span className={`font-bold text-[11px] ${strengthInfo.color}`}>{strengthInfo.label}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {loading ? "Updating password..." : "Update Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
