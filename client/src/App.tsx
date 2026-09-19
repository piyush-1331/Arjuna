import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Router as WouterRouter, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SessionManagerModal from "./components/SessionManagerModal";
import LoginPage from "@/pages/LoginPage";
import RoleDashboard from "@/pages/RoleDashboard";
import CitizenDashboard from "@/pages/CitizenDashboard";
import AshaChoDashboard from "@/pages/AshaChoDashboard";
import DoctorDashboard from "@/pages/DoctorDashboard";
import FacilityStaffDashboard from "@/pages/FacilityStaffDashboard";
import AdministratorDashboard from "@/pages/AdministratorDashboard";
import FacilityMapPage from "@/pages/FacilityMapPage";

// Authentication, Profile & Account Lifecycle Pages
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import ProfilePage from "@/pages/ProfilePage";
import PendingApprovalPage from "@/pages/PendingApprovalPage";
import RegistrationRejectedPage from "@/pages/RegistrationRejectedPage";
import AccountSuspendedPage from "@/pages/AccountSuspendedPage";
import AccessDeniedPage from "@/pages/AccessDeniedPage";

export function getRouterBase(): string {
  if (typeof window === "undefined") return "";
  const pathname = window.location.pathname;
  // If hosted on GitHub Pages (e.g., /Arjuna or /Arjuna/...)
  const match = pathname.match(/^(\/[a-zA-Z0-9_-]+)/);
  if (window.location.hostname.endsWith("github.io") && match) {
    return match[1];
  }
  if (pathname.toLowerCase().startsWith("/arjuna")) {
    return "/Arjuna";
  }
  return "";
}

function AppRoutes() {
  return (
    <Switch>
      {/* Public & Entry Routes - Shows Login page first on browser launch */}
      <Route path={"/"} component={LoginPage} />
      <Route path={"/login"} component={LoginPage} />
      <Route path={"/workspace"} component={LoginPage} />
      <Route path={"/dashboard"} component={LoginPage} />
      <Route path={"/home"} component={LoginPage} />
      <Route path={"/index.html"} component={LoginPage} />

      {/* Password Recovery & Account Management */}
      <Route path={"/forgot-password"} component={ForgotPasswordPage} />
      <Route path={"/reset-password"} component={ResetPasswordPage} />
      <Route path={"/change-password"} component={ChangePasswordPage} />
      <Route path={"/profile"} component={ProfilePage} />

      {/* Account Status / Lifecycle Routing */}
      <Route path={"/pending-approval"} component={PendingApprovalPage} />
      <Route path={"/registration-rejected"} component={RegistrationRejectedPage} />
      <Route path={"/account-suspended"} component={AccountSuspendedPage} />
      <Route path={"/access-denied"} component={AccessDeniedPage} />

      {/* GIS, Maps & Facility Directory */}
      <Route path={"/facilities"} component={FacilityMapPage} />
      <Route path={"/map"} component={FacilityMapPage} />
      <Route path={"/accessibility"} component={FacilityMapPage} />

      {/* Role-Specific Workspaces & Dashboards */}
      <Route path={"/dashboard/citizen"} component={CitizenDashboard} />
      <Route path={"/dashboard/asha"} component={AshaChoDashboard} />
      <Route path={"/dashboard/cho"} component={AshaChoDashboard} />
      <Route path={"/dashboard/asha_cho"} component={AshaChoDashboard} />
      <Route path={"/dashboard/doctor"} component={DoctorDashboard} />
      <Route path={"/dashboard/facility_staff"} component={FacilityStaffDashboard} />
      <Route path={"/dashboard/administrator"} component={AdministratorDashboard} />
      <Route path={"/dashboard/admin"} component={AdministratorDashboard} />
      <Route path={"/dashboard/:role"} component={RoleDashboard} />

      {/* Friendly direct role route shortcuts */}
      <Route path={"/citizen"} component={CitizenDashboard} />
      <Route path={"/asha"} component={AshaChoDashboard} />
      <Route path={"/cho"} component={AshaChoDashboard} />
      <Route path={"/doctor"} component={DoctorDashboard} />
      <Route path={"/facility"} component={FacilityStaffDashboard} />
      <Route path={"/facility_staff"} component={FacilityStaffDashboard} />
      <Route path={"/admin"} component={AdministratorDashboard} />
      <Route path={"/administrator"} component={AdministratorDashboard} />

      {/* Fallback 404 Route */}
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const base = getRouterBase();

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <SessionManagerModal />
          <WouterRouter base={base}>
            <AppRoutes />
          </WouterRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
