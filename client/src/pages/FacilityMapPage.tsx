import React, { useState } from "react";
import HealthcareFacilityMap from "@/components/HealthcareFacilityMap";
import { VillageAccessibilityDashboard } from "@/components/VillageAccessibilityDashboard";
import { DistrictHealthIntelligenceMap } from "@/components/DistrictHealthIntelligenceMap";
import WorkspaceLayout, { type NavItem } from "@/components/WorkspaceLayout";
import {
  Compass,
  Activity,
  ArrowLeft,
  MapPin,
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function FacilityMapPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"district_intelligence" | "facility_map" | "village_accessibility">("district_intelligence");

  const navItems: NavItem[] = [
    { id: "district_intelligence", label: "District Health Intelligence Map", icon: MapPin },
    { id: "facility_map", label: "Healthcare Facility Map", icon: Compass },
    { id: "village_accessibility", label: "Village Accessibility Scores", icon: Activity },
  ];

  return (
    <WorkspaceLayout
      role="asha_cho"
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as any)}
      navItems={navItems}
      title="District Healthcare Grid & Health Intelligence Map"
      subtitle="Interactive GIS surveillance of village epidemiology, screening coverage, referral delays, drug shortages, and accessibility scores (0–100)"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.history.back()}
          className="rounded-full text-xs"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Dashboard
        </Button>
      }
    >
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {activeTab === "district_intelligence" && <DistrictHealthIntelligenceMap />}
        {activeTab === "facility_map" && <HealthcareFacilityMap />}
        {activeTab === "village_accessibility" && <VillageAccessibilityDashboard />}
      </div>
    </WorkspaceLayout>
  );
}

