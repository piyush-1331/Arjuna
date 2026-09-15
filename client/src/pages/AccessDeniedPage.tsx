import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert, Home, LogOut } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getPostLoginRoute } from "@shared/authFlow";

export default function AccessDeniedPage() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const handleReturnToWorkspace = () => {
    if (!user) {
      setLocation("/login");
      return;
    }
    const route = getPostLoginRoute(user.role, (user as any).status) || "/login";
    setLocation(route);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-rose-500/20 bg-slate-900/90 backdrop-blur-xl text-white shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
            <ShieldAlert className="w-9 h-9 text-rose-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">
            Access Restricted
          </CardTitle>
          <CardDescription className="text-slate-400 mt-1.5 text-sm">
            You do not have the required permissions to access this administrative resource.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl p-4 text-xs text-rose-200 leading-relaxed space-y-2">
            <div className="font-semibold text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              Role-Based Authorization Enforced
            </div>
            <p>
              Administrative workspaces and functions are restricted strictly to the designated system administrator. All access attempts are logged for security auditing.
            </p>
            {user && (
              <div className="pt-2 border-t border-rose-800/30 text-slate-300 flex justify-between items-center">
                <span>Signed in as: <strong className="text-white">{user.email}</strong></span>
                <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px] font-mono">
                  {user.role.replace("_", " ")}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleReturnToWorkspace}
              className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-medium py-2 rounded-xl transition shadow-lg shadow-teal-500/10"
            >
              <Home className="w-4 h-4 mr-2" />
              My Workspace
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1 border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-200 py-2 rounded-xl transition"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
