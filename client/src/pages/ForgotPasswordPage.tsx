import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, HeartPulse, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!supabase) {
      toast.error("Supabase is not configured for this environment.");
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.warn("[Auth] Password reset notice:", error.message);
      }

      // Generic privacy-preserving message
      setSubmitted(true);
      toast.success("Password reset instructions sent.");
    } catch (err: any) {
      // Always show generic message to avoid leaking user registration status
      setSubmitted(true);
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
            </div>
            <p className="text-xs text-slate-500 font-medium">Password Recovery</p>
          </div>
        </div>

        <Card className="border border-black/10 bg-white shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 sm:p-8 pb-4 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle className="display-font text-xl font-bold">Forgot your password?</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Enter your registered email address. If an account exists, you will receive a secure reset link.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 pt-2 space-y-4">
            {submitted ? (
              <div className="space-y-4 text-center">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 flex items-start gap-2.5 text-left">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    If an account exists for <strong>{email}</strong>, a password reset link has been sent to your inbox. Please check your email and follow the instructions to reset your password.
                  </p>
                </div>

                <Button
                  onClick={() => setLocation("/")}
                  className="w-full rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white h-11 font-bold text-sm shadow-md"
                >
                  Return to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Registered Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      required
                      placeholder="name@example.gov.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 rounded-2xl bg-slate-50 border-slate-200 h-11 text-sm focus:bg-white"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#15181b] hover:bg-slate-800 text-white h-11 font-bold text-sm shadow-md"
                >
                  {loading ? "Sending reset link..." : "Send Password Reset Link"}
                </Button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setLocation("/")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to login</span>
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
