import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Hospital,
  Building2,
  Stethoscope,
  HeartPulse,
  Pill,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Locate,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  ExternalLink,
  Compass,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// Custom SVG Icons for Leaflet Markers
function createLeafletIcon(color: string, iconHtml: string, size = 38) {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        border: 2px solid #ffffff;
      ">
        <div style="transform: rotate(45deg); color: #ffffff; display: flex; align-items: center; justify-content: center;">
          ${iconHtml}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 6],
  });
}

function createVillageIcon(size = 30) {
  return L.divIcon({
    className: "custom-village-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: #f59e0b;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(245,158,11,0.5);
        border: 2px solid #ffffff;
      ">
        <span style="color: #ffffff; font-size: 13px; font-weight: bold;">🏡</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function createOriginPinIcon(size = 42) {
  return L.divIcon({
    className: "custom-origin-marker",
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.35);
          animation: pulse-ring 2s infinite ease-in-out;
        "></div>
        <div style="
          width: 26px;
          height: 26px;
          background: #ef4444;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 14px rgba(239,68,68,0.7);
        ">
          <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const FACILITY_COLORS: Record<string, string> = {
  sub_centre: "#10b981", // Emerald (AAM)
  aam: "#10b981",
  phc: "#0284c7",        // Sky Blue
  chc: "#6366f1",        // Indigo
  district_hospital: "#e11d48", // Rose/Crimson
  sub_district_hospital: "#9333ea", // Purple
  specialist: "#8b5cf6",
};

const COMMON_SPECIALTIES = [
  "General Medicine",
  "Maternal & Child Health",
  "Cardiology",
  "Pediatrics",
  "Internal Medicine",
  "Nephrology",
  "Orthopedics",
  "Pulmonology / Chest",
  "Obstetrics & Gynecology",
  "Emergency Medicine",
];

const ESSENTIAL_MEDICINES = [
  "Telmisartan 40mg",
  "Metformin 500mg",
  "Amlodipine 5mg",
  "Iron & Folic Acid (IFA) Tablets",
  "ORS Sachets (WHO formula)",
  "Paracetamol 500mg",
  "Amoxicillin 500mg",
  "Salbutamol Inhaler 100mcg",
];

/**
 * Haversine formula to compute great-circle distance between two lat/lng coordinates in km.
 */
function calculateGeodesicDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Built-in Default Facility Registry (covering Gujarat & Maharashtra)
export const DEFAULT_FACILITIES = [
  // Ahmedabad Rural & Gujarat
  {
    id: 101,
    facilityId: 101,
    name: "Ahmedabad Civil Hospital & Trauma Centre",
    facilityType: "district_hospital",
    district: "Ahmedabad Rural",
    village: "Asarwa",
    address: "Civil Hospital Compound, Asarwa, Ahmedabad, Gujarat 380016",
    phone: "+91 79 2268 0074",
    latitude: 23.0524,
    longitude: 72.6029,
    specialties: ["Emergency Medicine", "Internal Medicine", "Cardiology", "General Surgery", "Orthopedics", "Pediatrics", "Obstetrics & Gynecology", "Nephrology", "Pulmonology / Chest"],
    capabilities: ["24/7 Emergency", "Level 1 Trauma", "ICU", "CCU", "NICU", "Dialysis", "CT Scan", "Digital X-Ray", "Blood Bank", "Central Pharmacy"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 280,
      availableBeds: 64,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 450, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 620, unit: "tablets", status: "AVAILABLE" as const },
      { id: 3, name: "Amlodipine 5mg", currentStock: 380, unit: "tablets", status: "AVAILABLE" as const },
      { id: 4, name: "Iron & Folic Acid (IFA) Tablets", currentStock: 900, unit: "tablets", status: "AVAILABLE" as const },
      { id: 5, name: "ORS Sachets (WHO formula)", currentStock: 500, unit: "sachets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 1200, unit: "tablets", status: "AVAILABLE" as const },
      { id: 7, name: "Amoxicillin 500mg", currentStock: 340, unit: "capsules", status: "AVAILABLE" as const },
      { id: 8, name: "Salbutamol Inhaler 100mcg", currentStock: 85, unit: "units", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 102,
    facilityId: 102,
    name: "Sanand Community Health Centre (CHC)",
    facilityType: "chc",
    district: "Ahmedabad Rural",
    village: "Sanand",
    address: "Station Road, Near Bus Station, Sanand, Gujarat 382110",
    phone: "+91 2717 222310",
    latitude: 22.9926,
    longitude: 72.3814,
    specialties: ["General Medicine", "Maternal & Child Health", "Obstetrics & Gynecology", "Pediatrics", "Emergency Medicine"],
    capabilities: ["24/7 Emergency", "Operation Theatre", "Maternity Ward", "Digital X-Ray", "Ultrasound", "Oxygen Support", "Full Pharmacy"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 2 District Trauma",
      totalBeds: 50,
      availableBeds: 18,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 120, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 180, unit: "tablets", status: "AVAILABLE" as const },
      { id: 3, name: "Amlodipine 5mg", currentStock: 140, unit: "tablets", status: "AVAILABLE" as const },
      { id: 4, name: "Iron & Folic Acid (IFA) Tablets", currentStock: 300, unit: "tablets", status: "AVAILABLE" as const },
      { id: 5, name: "ORS Sachets (WHO formula)", currentStock: 250, unit: "sachets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 400, unit: "tablets", status: "AVAILABLE" as const },
      { id: 7, name: "Amoxicillin 500mg", currentStock: 110, unit: "capsules", status: "AVAILABLE" as const },
      { id: 8, name: "Salbutamol Inhaler 100mcg", currentStock: 24, unit: "units", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 103,
    facilityId: 103,
    name: "Bavla Community Health Centre (CHC)",
    facilityType: "chc",
    district: "Ahmedabad Rural",
    village: "Bavla",
    address: "NH 8A, Bavla Rural Circle, Bavla, Gujarat 382220",
    phone: "+91 2714 222150",
    latitude: 22.8361,
    longitude: 72.3619,
    specialties: ["General Medicine", "General Surgery", "Pediatrics", "Emergency Medicine"],
    capabilities: ["24/7 Emergency", "Inpatient Wards", "Ultrasound", "Digital X-Ray", "Blood Storage", "Pharmacy"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 2 District Trauma",
      totalBeds: 40,
      availableBeds: 14,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 90, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 130, unit: "tablets", status: "AVAILABLE" as const },
      { id: 3, name: "Amlodipine 5mg", currentStock: 85, unit: "tablets", status: "AVAILABLE" as const },
      { id: 4, name: "Iron & Folic Acid (IFA) Tablets", currentStock: 220, unit: "tablets", status: "AVAILABLE" as const },
      { id: 5, name: "ORS Sachets (WHO formula)", currentStock: 190, unit: "sachets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 350, unit: "tablets", status: "AVAILABLE" as const },
      { id: 7, name: "Amoxicillin 500mg", currentStock: 80, unit: "capsules", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 104,
    facilityId: 104,
    name: "Sarkhej Primary Health Centre (PHC)",
    facilityType: "phc",
    district: "Ahmedabad Rural",
    village: "Sarkhej",
    address: "Near Sarkhej Roza, Sarkhej-Okaf, Gujarat 382210",
    phone: "+91 79 2682 1200",
    latitude: 22.9814,
    longitude: 72.5012,
    specialties: ["General Medicine", "Maternal & Child Health", "Cardiology"],
    capabilities: ["General OPD", "NCD Clinic", "Maternal Care", "Pharmacy", "Diagnostic Lab", "ECG"],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "Basic Stabilization",
      totalBeds: 12,
      availableBeds: 5,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 80, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 110, unit: "tablets", status: "AVAILABLE" as const },
      { id: 3, name: "Amlodipine 5mg", currentStock: 95, unit: "tablets", status: "AVAILABLE" as const },
      { id: 4, name: "Iron & Folic Acid (IFA) Tablets", currentStock: 400, unit: "tablets", status: "AVAILABLE" as const },
      { id: 5, name: "ORS Sachets (WHO formula)", currentStock: 300, unit: "sachets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 500, unit: "tablets", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 105,
    facilityId: 105,
    name: "Sundarpur Ayushman Arogya Mandir (AAM)",
    facilityType: "sub_centre",
    district: "Ahmedabad Rural",
    village: "Sundarpur",
    address: "Panchayat Chowk, Sundarpur Village, Sanand Taluka, Gujarat 382110",
    phone: "+91 2717 241010",
    latitude: 23.012,
    longitude: 72.3508,
    specialties: ["General Medicine", "Maternal & Child Health", "First Aid", "NCD Screening"],
    capabilities: ["Basic Screening", "Immunization", "First Aid", "Teleconsultation", "Essential Drugs"],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "None",
      totalBeds: 4,
      availableBeds: 2,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 50, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 60, unit: "tablets", status: "AVAILABLE" as const },
      { id: 3, name: "Amlodipine 5mg", currentStock: 40, unit: "tablets", status: "AVAILABLE" as const },
      { id: 4, name: "Iron & Folic Acid (IFA) Tablets", currentStock: 150, unit: "tablets", status: "AVAILABLE" as const },
      { id: 5, name: "ORS Sachets (WHO formula)", currentStock: 120, unit: "sachets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 200, unit: "tablets", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 106,
    facilityId: 106,
    name: "Viramgam Sub-District Hospital (SDH)",
    facilityType: "chc",
    district: "Ahmedabad Rural",
    village: "Viramgam",
    address: "Mandal Road, Viramgam, Gujarat 382150",
    phone: "+91 2715 222120",
    latitude: 23.1245,
    longitude: 72.0345,
    specialties: ["Internal Medicine", "General Surgery", "Orthopedics", "Pediatrics", "Emergency Medicine"],
    capabilities: ["24/7 Emergency", "Operation Theatre", "Digital X-Ray", "Ultrasound", "Blood Storage", "Pharmacy"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 2 District Trauma",
      totalBeds: 60,
      availableBeds: 22,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 110, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 140, unit: "tablets", status: "AVAILABLE" as const },
      { id: 3, name: "Amlodipine 5mg", currentStock: 100, unit: "tablets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 450, unit: "tablets", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 107,
    facilityId: 107,
    name: "Vadodara SSG Civil Hospital & Trauma Centre",
    facilityType: "district_hospital",
    district: "Vadodara",
    village: "Vadodara",
    address: "Jail Road, Anandpura, Vadodara, Gujarat 390001",
    phone: "+91 265 242 1594",
    latitude: 22.3072,
    longitude: 73.1812,
    specialties: ["Emergency Medicine", "Internal Medicine", "Cardiology", "Nephrology", "General Surgery", "Pediatrics"],
    capabilities: ["24/7 Emergency", "Level 1 Trauma", "ICU", "CCU", "NICU", "Dialysis", "CT Scan", "Digital X-Ray", "Blood Bank"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 220,
      availableBeds: 45,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 350, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 420, unit: "tablets", status: "AVAILABLE" as const },
      { id: 3, name: "Amlodipine 5mg", currentStock: 290, unit: "tablets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 800, unit: "tablets", status: "AVAILABLE" as const },
    ],
  },
  // Maharashtra Facilities
  {
    id: 1,
    facilityId: 1,
    name: "Karanji Budruk Health and Wellness Centre (AAM)",
    facilityType: "sub_centre",
    district: "Nandurbar",
    village: "Karanji Budruk",
    address: "Panchayat Chowk, Karanji Budruk, Taluka Shahada, Nandurbar, Maharashtra 425409",
    phone: "+91 2565 241010",
    latitude: 21.5432,
    longitude: 74.4521,
    specialties: ["General Medicine", "Maternal & Child Health", "First Aid", "NCD Screening"],
    capabilities: ["Basic Screening", "Immunization", "First Aid", "Teleconsultation", "Essential Drugs"],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "None",
      totalBeds: 4,
      availableBeds: 2,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 60, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 80, unit: "tablets", status: "AVAILABLE" as const },
      { id: 3, name: "Amlodipine 5mg", currentStock: 50, unit: "tablets", status: "AVAILABLE" as const },
      { id: 4, name: "Iron & Folic Acid (IFA) Tablets", currentStock: 200, unit: "tablets", status: "AVAILABLE" as const },
      { id: 5, name: "ORS Sachets (WHO formula)", currentStock: 150, unit: "sachets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 300, unit: "tablets", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 3,
    facilityId: 3,
    name: "Nimbayat Primary Health Centre (PHC)",
    facilityType: "phc",
    district: "Nandurbar",
    village: "Nimbayat",
    address: "Main Highway Road, Nimbayat, Taluka Nandurbar, Maharashtra 425412",
    phone: "+91 2564 228100",
    latitude: 21.3654,
    longitude: 74.2411,
    specialties: ["General Medicine", "Maternal & Child Health", "Cardiology", "Emergency Medicine"],
    capabilities: ["General OPD", "NCD Clinic", "Maternal Care", "Emergency Triage", "Full Pharmacy", "Diagnostic Lab", "ECG"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Basic Stabilization",
      totalBeds: 16,
      availableBeds: 7,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 120, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 150, unit: "tablets", status: "AVAILABLE" as const },
      { id: 3, name: "Amlodipine 5mg", currentStock: 110, unit: "tablets", status: "AVAILABLE" as const },
      { id: 4, name: "Iron & Folic Acid (IFA) Tablets", currentStock: 350, unit: "tablets", status: "AVAILABLE" as const },
      { id: 5, name: "ORS Sachets (WHO formula)", currentStock: 250, unit: "sachets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 600, unit: "tablets", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 4,
    facilityId: 4,
    name: "Dhanora Rural Hospital (RH / CHC)",
    facilityType: "chc",
    district: "Nandurbar",
    village: "Dhanora",
    address: "Taloda Road, Dhanora, Taluka Taloda, Nandurbar, Maharashtra 425413",
    phone: "+91 2567 252100",
    latitude: 21.4821,
    longitude: 74.2155,
    specialties: ["Internal Medicine", "General Surgery", "Obstetrics & Gynecology", "Pediatrics", "Emergency Medicine"],
    capabilities: ["24/7 Emergency", "Specialist Consultations", "Inpatient Wards", "Operation Theatre", "Lab & Digital X-Ray", "Blood Storage", "Pharmacy"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 2 District Trauma",
      totalBeds: 45,
      availableBeds: 16,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 100, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 140, unit: "tablets", status: "AVAILABLE" as const },
      { id: 3, name: "Amlodipine 5mg", currentStock: 90, unit: "tablets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 400, unit: "tablets", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 17,
    facilityId: 17,
    name: "Shirasgaon District Civil Hospital",
    facilityType: "district_hospital",
    district: "Nandurbar",
    village: "Shirasgaon",
    address: "Collectorate Circle, Shirasgaon, Nandurbar, Maharashtra 425412",
    phone: "+91 2564 222900",
    latitude: 21.3754,
    longitude: 74.2389,
    specialties: ["Internal Medicine", "Cardiology", "Nephrology", "General Surgery", "Orthopedics", "Obstetrics & Gynecology", "Pediatrics", "Emergency Medicine"],
    capabilities: ["24/7 Emergency", "ICU & CCU", "NICU", "Dialysis Unit", "Operation Theatre", "Blood Bank", "Digital X-Ray", "Ultrasound & 2D Echo", "CT Scan", "Central Pharmacy"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 120,
      availableBeds: 38,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 300, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 400, unit: "tablets", status: "AVAILABLE" as const },
      { id: 3, name: "Amlodipine 5mg", currentStock: 250, unit: "tablets", status: "AVAILABLE" as const },
      { id: 4, name: "Iron & Folic Acid (IFA) Tablets", currentStock: 700, unit: "tablets", status: "AVAILABLE" as const },
      { id: 5, name: "ORS Sachets (WHO formula)", currentStock: 450, unit: "sachets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 1000, unit: "tablets", status: "AVAILABLE" as const },
      { id: 7, name: "Amoxicillin 500mg", currentStock: 280, unit: "capsules", status: "AVAILABLE" as const },
      { id: 8, name: "Salbutamol Inhaler 100mcg", currentStock: 60, unit: "units", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 18,
    facilityId: 18,
    name: "KEM Hospital & Seth GS Medical College",
    facilityType: "district_hospital",
    district: "Mumbai City",
    village: "Parel",
    address: "Acharya Donde Marg, Parel, Mumbai City, Maharashtra 400012",
    phone: "+91 22 2410 7000",
    latitude: 19.0028,
    longitude: 72.8427,
    specialties: ["Cardiology", "Neurology", "Nephrology", "General Surgery", "Emergency Medicine", "Pediatrics"],
    capabilities: ["24/7 Emergency", "Level 1 Trauma", "ICU", "CCU", "NICU", "Dialysis", "CT Scan", "MRI", "Blood Bank"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 350,
      availableBeds: 62,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 320, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 410, unit: "tablets", status: "AVAILABLE" as const },
      { id: 3, name: "Amlodipine 5mg", currentStock: 270, unit: "tablets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 950, unit: "tablets", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 19,
    facilityId: 19,
    name: "Dr. R. N. Cooper Municipal General Hospital",
    facilityType: "district_hospital",
    district: "Mumbai Suburban",
    village: "Andheri",
    address: "JVPD Scheme, Juhu, Andheri West, Mumbai Suburban 400056",
    phone: "+91 22 2620 7254",
    latitude: 19.1075,
    longitude: 72.8362,
    specialties: ["General Medicine", "Emergency Medicine", "Orthopedics", "Pediatrics", "Cardiology"],
    capabilities: ["24/7 Trauma", "ICU", "Digital X-Ray", "CT Scan", "Central Pharmacy", "Blood Storage"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 240,
      availableBeds: 44,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 220, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 280, unit: "tablets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 600, unit: "tablets", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 20,
    facilityId: 20,
    name: "Thane District Civil & Trauma Hospital",
    facilityType: "district_hospital",
    district: "Thane",
    village: "Thane City",
    address: "Court Naka, Near Collector Office, Thane West, Maharashtra 400601",
    phone: "+91 22 2534 4022",
    latitude: 19.1972,
    longitude: 72.9734,
    specialties: ["General Surgery", "Internal Medicine", "Obstetrics & Gynecology", "Emergency Medicine", "Orthopedics"],
    capabilities: ["24/7 Emergency", "Trauma Unit", "ICU", "Blood Bank", "Dialysis", "Pathology Lab"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 180,
      availableBeds: 35,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 180, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 230, unit: "tablets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 500, unit: "tablets", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 21,
    facilityId: 21,
    name: "Government Medical College & Hospital (GMCH) Nagpur",
    facilityType: "district_hospital",
    district: "Nagpur",
    village: "Nagpur City",
    address: "Hanuman Nagar, Medical Square, Nagpur, Maharashtra 440003",
    phone: "+91 712 274 4671",
    latitude: 21.1278,
    longitude: 79.0982,
    specialties: ["Cardiology", "Neurology", "Nephrology", "General Medicine", "Oncology", "Trauma & Emergency"],
    capabilities: ["24/7 Super-Specialty Emergency", "Super ICU", "Level 1 Regional Trauma", "Cath Lab", "MRI & CT Scan", "Blood Bank"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 400,
      availableBeds: 75,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 350, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 450, unit: "tablets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 1100, unit: "tablets", status: "AVAILABLE" as const },
    ],
  },
  {
    id: 22,
    facilityId: 22,
    name: "Government Medical College & Hospital (GMCH) Chhatrapati Sambhajinagar",
    facilityType: "district_hospital",
    district: "Chhatrapati Sambhajinagar (Aurangabad)",
    village: "Chhatrapati Sambhajinagar City",
    address: "Panchakki Road, Ghati, Chhatrapati Sambhajinagar, Maharashtra 431001",
    phone: "+91 240 240 2412",
    latitude: 19.8913,
    longitude: 75.3218,
    specialties: ["Cardiology", "General Medicine", "Nephrology", "General Surgery", "Pediatrics", "Maternal Health"],
    capabilities: ["24/7 Tertiary Care", "ICU & CCU", "Dialysis", "CT Scan", "Digital Pathology", "Blood Bank"],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 280,
      availableBeds: 50,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    inStockMedicines: [
      { id: 1, name: "Telmisartan 40mg", currentStock: 250, unit: "tablets", status: "AVAILABLE" as const },
      { id: 2, name: "Metformin 500mg", currentStock: 320, unit: "tablets", status: "AVAILABLE" as const },
      { id: 6, name: "Paracetamol 500mg", currentStock: 750, unit: "tablets", status: "AVAILABLE" as const },
    ],
  },
];

// Built-in Default Village Registry
export const DEFAULT_VILLAGES = [
  // Ahmedabad Rural Villages
  {
    id: "sundarpur",
    name: "Sundarpur",
    district: "Ahmedabad Rural",
    block: "Sanand",
    latitude: 23.012,
    longitude: 72.3508,
    population: 2450,
    screenedCount: 1680,
    highRiskCount: 68,
    activeAlerts: 3,
    nearestFacilityName: "Sundarpur Ayushman Arogya Mandir (AAM)",
  },
  {
    id: "sanand_rural",
    name: "Sanand Rural",
    district: "Ahmedabad Rural",
    block: "Sanand",
    latitude: 22.985,
    longitude: 72.378,
    population: 3200,
    screenedCount: 2400,
    highRiskCount: 84,
    activeAlerts: 4,
    nearestFacilityName: "Sanand Community Health Centre (CHC)",
  },
  {
    id: "bavla_rural",
    name: "Bavla Rural",
    district: "Ahmedabad Rural",
    block: "Bavla",
    latitude: 22.84,
    longitude: 72.365,
    population: 4100,
    screenedCount: 2950,
    highRiskCount: 110,
    activeAlerts: 5,
    nearestFacilityName: "Bavla Community Health Centre (CHC)",
  },
  {
    id: "dholka_rural",
    name: "Dholka Rural",
    district: "Ahmedabad Rural",
    block: "Dholka",
    latitude: 22.72,
    longitude: 72.44,
    population: 2800,
    screenedCount: 1950,
    highRiskCount: 64,
    activeAlerts: 2,
    nearestFacilityName: "Bavla Community Health Centre (CHC)",
  },
  {
    id: "viramgam_rural",
    name: "Viramgam Rural",
    district: "Ahmedabad Rural",
    block: "Viramgam",
    latitude: 23.12,
    longitude: 72.04,
    population: 3600,
    screenedCount: 2600,
    highRiskCount: 92,
    activeAlerts: 4,
    nearestFacilityName: "Viramgam Sub-District Hospital (SDH)",
  },
  // Maharashtra Villages
  {
    id: "karanji_budruk",
    name: "Karanji Budruk",
    district: "Nandurbar",
    block: "Shahada",
    latitude: 21.5432,
    longitude: 74.4521,
    population: 2450,
    screenedCount: 1680,
    highRiskCount: 68,
    activeAlerts: 3,
    nearestFacilityName: "Karanji Budruk Health and Wellness Centre (AAM)",
  },
  {
    id: "nimbayat",
    name: "Nimbayat",
    district: "Nandurbar",
    block: "Nandurbar",
    latitude: 21.412,
    longitude: 74.312,
    population: 3200,
    screenedCount: 2350,
    highRiskCount: 84,
    activeAlerts: 4,
    nearestFacilityName: "Nimbayat Primary Health Centre (PHC)",
  },
  {
    id: "dhanora",
    name: "Dhanora",
    district: "Nandurbar",
    block: "Taloda",
    latitude: 21.562,
    longitude: 74.215,
    population: 4100,
    screenedCount: 2950,
    highRiskCount: 110,
    activeAlerts: 5,
    nearestFacilityName: "Dhanora Rural Hospital (RH / CHC)",
  },
];

interface HealthcareFacilityMapProps {
  onSelectFacilityForReferral?: (facilityId: number, facilityName: string) => void;
  defaultOriginVillage?: string;
  className?: string;
}

export default function HealthcareFacilityMap({
  onSelectFacilityForReferral,
  defaultOriginVillage = "Sundarpur",
  className = "",
}: HealthcareFacilityMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Queries (with error resilience for static/offline deployment)
  const mapDataQuery = trpc.facilities.getMapData.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Search & Filter State
  const [selectedVillage, setSelectedVillage] = useState<string>(defaultOriginVillage);
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number }>({ lat: 23.012, lng: 72.3508 });
  const [selectedFacilityType, setSelectedFacilityType] = useState<string>("all");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [filterEmergency, setFilterEmergency] = useState<boolean>(false);
  const [filterIcu, setFilterIcu] = useState<boolean>(false);
  const [filterOxygen, setFilterOxygen] = useState<boolean>(false);
  const [filterMedicine, setFilterMedicine] = useState<string>("");
  const [showVillages, setShowVillages] = useState<boolean>(true);
  const [focusedFacilityId, setFocusedFacilityId] = useState<number | null>(null);

  // Unified Facility and Village datasets (merges live server data with rich built-in fallback)
  const facilitiesPool = useMemo(() => {
    if (mapDataQuery.data?.facilities && mapDataQuery.data.facilities.length > 0) {
      return mapDataQuery.data.facilities;
    }
    return DEFAULT_FACILITIES;
  }, [mapDataQuery.data?.facilities]);

  const villagesPool = useMemo(() => {
    if (mapDataQuery.data?.villages && mapDataQuery.data.villages.length > 0) {
      return mapDataQuery.data.villages;
    }
    return DEFAULT_VILLAGES;
  }, [mapDataQuery.data?.villages]);

  // Client-side Geodesic Ranking Engine (always works online & offline)
  const clientRankedResults = useMemo(() => {
    return (facilitiesPool as any[])
      .map((fac: any) => {
        const facLat = fac.latitude ?? 23.012;
        const facLng = fac.longitude ?? 72.3508;
        const distanceKm = calculateGeodesicDistanceKm(originCoords.lat, originCoords.lng, facLat, facLng);
        const estimatedTravelMins = Math.max(5, Math.round((distanceKm / 35) * 60 + 3));

        const emergencyCap = fac.emergencyCapability || {
          is24x7: false,
          icuAvailable: false,
          oxygenAvailable: false,
          totalBeds: 0,
          availableBeds: 0,
        };

        // Check medicine stock
        let medicineStockStatus: "AVAILABLE" | "LOW STOCK" | "OUT OF STOCK" | "NOT APPLICABLE" = "NOT APPLICABLE";
        let matchedMedicineName: string | undefined = undefined;

        if (filterMedicine && filterMedicine.trim() !== "") {
          const reqClean = filterMedicine.toLowerCase().replace(/[^a-z0-9]/g, "");
          const medMatch = ((fac.inStockMedicines || []) as Array<{ name: string; status: any }>).find(
            (m: { name: string; status: any }) =>
              m.name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(reqClean)
          );

          if (medMatch) {
            matchedMedicineName = medMatch.name;
            medicineStockStatus = medMatch.status;
          } else {
            medicineStockStatus = "OUT OF STOCK";
          }
        }

        // Calculate multi-factor appropriateness score (0-100)
        let appropriatenessScore = 100;
        // Distance penalty: -1 pt per km up to -40 pts
        appropriatenessScore -= Math.min(40, Math.round(distanceKm * 0.8));
        // Specialty match boost
        if (selectedSpecialty !== "all") {
          const hasSpec = ((fac.specialties || []) as string[]).some((s: string) =>
            s.toLowerCase().includes(selectedSpecialty.toLowerCase())
          );
          if (hasSpec) appropriatenessScore += 15;
          else appropriatenessScore -= 20;
        }
        // Emergency capabilities
        if (filterEmergency && !emergencyCap.is24x7) appropriatenessScore -= 25;
        if (filterIcu && !emergencyCap.icuAvailable) appropriatenessScore -= 20;
        if (filterOxygen && !emergencyCap.oxygenAvailable) appropriatenessScore -= 15;
        if (filterMedicine && medicineStockStatus === "OUT OF STOCK") appropriatenessScore -= 25;

        appropriatenessScore = Math.max(10, Math.min(100, appropriatenessScore));

        return {
          facilityId: fac.facilityId || fac.id,
          id: fac.id || fac.facilityId,
          name: fac.name,
          facilityType: fac.facilityType,
          district: fac.district,
          village: fac.village,
          address: fac.address,
          phone: fac.phone,
          latitude: fac.latitude,
          longitude: fac.longitude,
          specialties: (fac.specialties || []) as string[],
          capabilities: (fac.capabilities || []) as string[],
          emergencyCapability: emergencyCap,
          distanceKm,
          estimatedTravelMins,
          appropriatenessScore,
          matchedMedicineName,
          medicineStockStatus,
        };
      })
      .filter((fac: any) => {
        // Apply filters
        if (selectedFacilityType !== "all" && fac.facilityType !== selectedFacilityType) {
          return false;
        }
        if (selectedSpecialty !== "all") {
          const hasSpec = ((fac.specialties || []) as string[]).some((s: string) =>
            s.toLowerCase().includes(selectedSpecialty.toLowerCase())
          );
          if (!hasSpec) return false;
        }
        if (filterEmergency && !fac.emergencyCapability.is24x7) return false;
        if (filterIcu && !fac.emergencyCapability.icuAvailable) return false;
        if (filterOxygen && !fac.emergencyCapability.oxygenAvailable) return false;
        if (filterMedicine && fac.medicineStockStatus === "OUT OF STOCK") return false;

        return true;
      })
      .sort((a: { distanceKm: number }, b: { distanceKm: number }) => a.distanceKm - b.distanceKm);
  }, [
    facilitiesPool,
    originCoords,
    selectedFacilityType,
    selectedSpecialty,
    filterEmergency,
    filterIcu,
    filterOxygen,
    filterMedicine,
  ]);

  const results = clientRankedResults;
  const topMatch = results[0] || null;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [originCoords.lat, originCoords.lng],
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Click anywhere on map to set custom origin coordinates
    map.on("click", (e: L.LeafletMouseEvent) => {
      setOriginCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setSelectedVillage("Custom Pin Location");
      toast.info(`Origin set to coordinate (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Map Markers whenever originCoords, filters, or datasets change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1. Draw Origin Marker (pulsating red pin) - ALWAYS RENDERED
    const originMarker = L.marker([originCoords.lat, originCoords.lng], {
      icon: createOriginPinIcon(),
      zIndexOffset: 1000,
    }).bindPopup(`
      <div style="font-family: sans-serif; min-width: 190px; padding: 4px;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: bold; color: #dc2626; font-size: 13px;">
          📍 Active Origin Pin
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #1f2937; margin-top: 4px;">${selectedVillage}</div>
        <div style="font-size: 10.5px; color: #6b7280; margin-top: 2px;">
          Lat: ${originCoords.lat.toFixed(4)}, Lng: ${originCoords.lng.toFixed(4)}
        </div>
        <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #059669; font-weight: bold;">
          ✓ Nearest: ${topMatch ? `${topMatch.name} (${topMatch.distanceKm} km)` : "Computing..."}
        </div>
      </div>
    `);
    markersLayer.addLayer(originMarker);

    // 2. Draw Villages (if showVillages enabled)
    if (showVillages && villagesPool.length > 0) {
      villagesPool.forEach((v) => {
        const vMarker = L.marker([v.latitude, v.longitude], {
          icon: createVillageIcon(),
          zIndexOffset: 400,
        }).bindPopup(`
          <div style="font-family: sans-serif; min-width: 200px; padding: 4px;">
            <div style="font-weight: bold; color: #d97706; font-size: 13px; margin-bottom: 4px;">
              🏡 Village: ${v.name}
            </div>
            <div style="font-size: 11px; color: #4b5563; line-height: 1.5;">
              <div><strong>Block / District:</strong> ${v.block}, ${v.district}</div>
              <div><strong>Population:</strong> ${v.population.toLocaleString()}</div>
              <div><strong>Screened Cohort:</strong> ${v.screenedCount} beneficiaries</div>
              <div><strong>High-Risk Detected:</strong> <span style="color: #dc2626; font-weight: bold;">${v.highRiskCount}</span></div>
              <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e5e7eb;">
                <strong>Primary Facility:</strong> ${v.nearestFacilityName}
              </div>
            </div>
          </div>
        `);
        vMarker.on("click", () => {
          handleSelectVillage(v.name);
        });
        markersLayer.addLayer(vMarker);
      });
    }

    // 3. Draw Facility Markers
    const facilitiesToRender = results.length > 0 ? results : facilitiesPool;

    facilitiesToRender.forEach((f) => {
      if (!f.latitude || !f.longitude) return;

      const color = FACILITY_COLORS[f.facilityType] || "#0284c7";
      const iconSymbol =
        f.facilityType === "district_hospital"
          ? "🏥"
          : f.facilityType === "chc"
          ? "🏢"
          : f.facilityType === "sub_centre"
          ? "🌿"
          : "⚕️";

      const fMarker = L.marker([f.latitude, f.longitude], {
        icon: createLeafletIcon(color, `<span style="font-size: 14px;">${iconSymbol}</span>`),
        zIndexOffset: 800,
      });

      const bedsAvailable = f.emergencyCapability?.availableBeds ?? 0;
      const totalBeds = f.emergencyCapability?.totalBeds ?? 0;
      const is24x7 = f.emergencyCapability?.is24x7;
      const dist = (f as any).distanceKm !== undefined ? (f as any).distanceKm : calculateGeodesicDistanceKm(originCoords.lat, originCoords.lng, f.latitude, f.longitude);
      const travelMins = Math.max(5, Math.round((dist / 35) * 60 + 3));

      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 240px; max-width: 280px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; background: ${color}20; color: ${color}; padding: 2px 6px; border-radius: 9999px;">
              ${f.facilityType.replace(/_/g, " ").toUpperCase()}
            </span>
            <span style="font-size: 10px; font-weight: bold; color: ${is24x7 ? "#16a34a" : "#ca8a04"};">
              ${is24x7 ? "● 24/7 Emergency" : "● Day OPD"}
            </span>
          </div>
          <div style="font-weight: bold; color: #111827; font-size: 13px; line-height: 1.3;">${f.name}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${f.address || f.village || f.district}</div>
          
          <div style="margin: 8px 0; padding: 6px; background: #f9fafb; border-radius: 8px; font-size: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div><strong>Distance:</strong> ${dist} km</div>
            <div><strong>Transit:</strong> ~${travelMins} mins</div>
            <div><strong>Beds:</strong> ${bedsAvailable}/${totalBeds}</div>
            <div><strong>ICU:</strong> ${f.emergencyCapability?.icuAvailable ? "Available" : "No"}</div>
            <div><strong>Oxygen:</strong> ${f.emergencyCapability?.oxygenAvailable ? "Yes" : "No"}</div>
            <div><strong>Phone:</strong> ${f.phone || "+91 108"}</div>
          </div>

          <div style="font-size: 10px; color: #4b5563; margin-bottom: 6px;">
            <strong>Specialties:</strong> ${(f.specialties || []).slice(0, 3).join(", ")}
          </div>
        </div>
      `;

      fMarker.bindPopup(popupHtml);
      fMarker.on("click", () => {
        handleFocusFacility({
          id: f.id || (f as any).facilityId,
          facilityId: (f as any).facilityId || f.id,
          name: f.name,
          latitude: f.latitude,
          longitude: f.longitude,
          distanceKm: dist,
          estimatedTravelMins: travelMins,
        });
      });
      markersLayer.addLayer(fMarker);
    });
  }, [originCoords, selectedVillage, showVillages, results, villagesPool, facilitiesPool, topMatch]);

  // Focus on specific facility & draw geodesic route line
  const handleFocusFacility = (facility: {
    facilityId?: number;
    id?: number;
    latitude?: number | null;
    longitude?: number | null;
    name: string;
    distanceKm?: number;
    estimatedTravelMins?: number;
  }) => {
    const map = mapInstanceRef.current;
    if (!map || !facility.latitude || !facility.longitude) return;

    setFocusedFacilityId(facility.facilityId || facility.id || null);

    // Pan & Zoom to facility
    map.flyTo([facility.latitude, facility.longitude], 13, { duration: 1.2 });

    // Draw geodesic dashed transit path from origin to facility
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    const latlngs: [number, number][] = [
      [originCoords.lat, originCoords.lng],
      [facility.latitude, facility.longitude],
    ];

    const polyline = L.polyline(latlngs, {
      color: "#dc2626",
      weight: 3.5,
      opacity: 0.85,
      dashArray: "6, 8",
    }).addTo(map);

    polyline.bindTooltip(
      `🛣️ ${facility.distanceKm ?? "Nearby"} km (~${facility.estimatedTravelMins ?? 15} mins transit)`,
      { permanent: true, direction: "center", className: "route-distance-tooltip" }
    );

    routeLineRef.current = polyline;
  };

  // Handle Village Select
  const handleSelectVillage = (villageName: string) => {
    setSelectedVillage(villageName);
    const found = villagesPool.find((v) => v.name.toLowerCase() === villageName.toLowerCase());
    if (found) {
      setOriginCoords({ lat: found.latitude, lng: found.longitude });
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([found.latitude, found.longitude], 12);
      }
      toast.success(`Origin updated to ${found.name}`);
    }
  };

  // Handle Geolocation (GPS)
  const handleUseCurrentLocation = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    const toastId = toast.loading("Acquiring GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss(toastId);
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setOriginCoords({ lat: userLat, lng: userLng });
        setSelectedVillage("My GPS Location");
        toast.success(`Location set to (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`);
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.flyTo([userLat, userLng], 12, { duration: 1.2 });
          } catch (err) {
            console.warn("Map flyTo error:", err);
          }
        }
      },
      (err) => {
        toast.dismiss(toastId);
        console.warn("Geolocation error:", err);
        toast.info("Using default location (GPS unavailable or permission denied)");
        handleSelectVillage("Sundarpur");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Reset view to fit all markers
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([originCoords.lat, originCoords.lng], 11, { duration: 1.0 });
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-5 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-bold">Healthcare Facility &amp; Village Geospatial Map</h2>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-[10px] font-semibold">
              District Health Grid
            </Badge>
          </div>
          <p className="text-xs text-slate-300">
            Interactive GIS map covering Sub-Centres (AAM), Primary Health Centres (PHC), Community Health Centres (CHC), and District Hospitals.
          </p>
        </div>
      </div>

      {/* 2. Grid Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Total Facilities</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                {facilitiesPool.length}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Hospital className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">24/7 Trauma Centers</p>
              <p className="text-xl font-extrabold text-rose-600 mt-0.5">
                {facilitiesPool.filter((f) => f.emergencyCapability?.is24x7).length}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <HeartPulse className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Covered Villages</p>
              <p className="text-xl font-extrabold text-amber-600 mt-0.5">
                {villagesPool.length}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <MapPin className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Available Beds</p>
              <p className="text-xl font-extrabold text-emerald-600 mt-0.5">
                {facilitiesPool.reduce(
                  (acc, f) => acc + (f.emergencyCapability?.availableBeds || 0),
                  0
                )}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Map & Controls Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Filter & Find Nearest Control Panel (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-0 shadow-xs bg-white">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-900">
                  <Navigation className="h-4 w-4 text-blue-600" />
                  Find Nearest Appropriate Facility
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 border-blue-200">
                  Geospatial
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Calculates geodesic distance, driving time, bed capacity, and medicine availability.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 pt-0 space-y-3.5 text-xs">
              {/* Origin Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Origin Village / Location</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUseCurrentLocation(e);
                    }}
                    className="text-blue-600 font-semibold flex items-center gap-1 hover:underline text-[11px] cursor-pointer"
                  >
                    <Locate className="h-3 w-3" /> My GPS
                  </button>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {villagesPool.slice(0, 6).map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectVillage(v.name);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-left font-medium border text-xs transition-colors cursor-pointer ${
                        selectedVillage === v.name
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🏡 {v.name}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 italic">
                  Tip: Or click anywhere directly on the map to set a custom origin pin!
                </div>
              </div>

              {/* Filters Section */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Filters &amp; Capabilities
                </p>

                {/* Facility Type Filter */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Facility Type</label>
                  <select
                    value={selectedFacilityType}
                    onChange={(e) => setSelectedFacilityType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types (AAM, PHC, CHC, District Hospital)</option>
                    <option value="sub_centre">AAM / Sub-Centre (Primary Outreach)</option>
                    <option value="phc">Primary Health Centre (PHC)</option>
                    <option value="chc">Community Health Centre (CHC)</option>
                    <option value="district_hospital">District Hospital / Civil Hospital</option>
                  </select>
                </div>

                {/* Specialty Filter */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Needed Clinical Specialty</label>
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Specialties</option>
                    {COMMON_SPECIALTIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Medicine Availability Filter */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Required Medicine in Stock</label>
                  <select
                    value={filterMedicine}
                    onChange={(e) => setFilterMedicine(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any Medicine / No Restriction</option>
                    {ESSENTIAL_MEDICINES.map((m) => (
                      <option key={m} value={m}>
                        💊 {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Emergency & Critical Capability Toggles */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Critical Capabilities</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFilterEmergency(!filterEmergency);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                        filterEmergency
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🚨 24/7 Emergency
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFilterIcu(!filterIcu);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                        filterIcu
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🛏️ ICU Available
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFilterOxygen(!filterOxygen);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                        filterOxygen
                          ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      💨 Oxygen Support
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowVillages(!showVillages);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                        showVillages
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      🏡 Show Villages
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results List: Nearest Appropriate Facilities */}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs px-1 text-slate-500 font-semibold">
              <span>{results.length} Facilities Ranked by Proximity &amp; Suitability</span>
              {topMatch && <span className="text-emerald-600 font-bold">Top Match: {topMatch.distanceKm} km</span>}
            </div>

            {results.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No facilities match the selected capability filters. Try broadening your filter criteria.
              </div>
            ) : (
              results.map((fac, idx) => {
                const isTop = idx === 0;
                const isFocused = focusedFacilityId === fac.facilityId;
                const color = FACILITY_COLORS[fac.facilityType] || "#0284c7";

                return (
                  <div
                    key={fac.facilityId}
                    onClick={() => handleFocusFacility(fac)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isFocused
                        ? "border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-600"
                        : isTop
                        ? "border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/70"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase"
                            style={{ backgroundColor: color }}
                          >
                            {fac.facilityType.replace(/_/g, " ")}
                          </span>
                          {isTop && (
                            <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                              ⭐ Best Match ({fac.appropriatenessScore} pts)
                            </Badge>
                          )}
                          {fac.emergencyCapability.is24x7 && (
                            <Badge className="bg-rose-100 text-rose-800 text-[10px] font-semibold border-rose-200">
                              24/7 Trauma
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs mt-1">{fac.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{fac.address || fac.village}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-extrabold text-blue-700">{fac.distanceKm} km</div>
                        <div className="text-[10px] text-slate-500">~{fac.estimatedTravelMins} mins</div>
                      </div>
                    </div>

                    {/* Capabilities & Stock Pills */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-slate-600">
                        🛏️ <strong>{fac.emergencyCapability.availableBeds}</strong> beds free
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600">
                        {fac.emergencyCapability.icuAvailable ? "ICU Yes" : "No ICU"}
                      </span>

                      {fac.matchedMedicineName && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              fac.medicineStockStatus === "AVAILABLE"
                                ? "bg-emerald-100 text-emerald-800"
                                : fac.medicineStockStatus === "LOW STOCK"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            💊 {fac.matchedMedicineName}: {fac.medicineStockStatus}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFocusFacility(fac);
                        }}
                        className="text-[11px] h-7 rounded-full text-blue-700 border-blue-200 hover:bg-blue-50 cursor-pointer"
                      >
                        <Navigation className="mr-1 h-3 w-3" /> Focus &amp; Route
                      </Button>

                      {onSelectFacilityForReferral && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelectFacilityForReferral(fac.facilityId, fac.name);
                          }}
                          className="text-[11px] h-7 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                        >
                          Refer Patient
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Leaflet Interactive Map View (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          {/* Map Layer Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-xs text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800">Map Legend:</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]"></span> AAM Sub-Centre
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7]"></span> PHC
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#6366f1]"></span> CHC
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e11d48]"></span> District Hospital
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]"></span> Village
              </span>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleResetView();
              }}
              className="text-[11px] h-7 rounded-full text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="mr-1 h-3 w-3" /> Reset View
            </Button>
          </div>

          {/* Leaflet Canvas Container */}
          <div className="relative w-full h-[580px] rounded-3xl overflow-hidden shadow-md border border-slate-200">
            <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

            {/* Floating Quick Stats Overlay on Top Right of Map */}
            <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-slate-200 text-xs space-y-1.5 max-w-[240px]">
              <div className="font-bold text-slate-900 flex items-center gap-1 text-xs">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                Active Origin Pin
              </div>
              <div className="text-[11px] text-slate-700 font-semibold">
                {selectedVillage}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {originCoords.lat.toFixed(4)}, {originCoords.lng.toFixed(4)}
              </div>
              <div className="pt-1.5 border-t border-slate-100 text-[11px] text-emerald-700 font-semibold">
                ✓ Nearest: {topMatch ? `${topMatch.name} (${topMatch.distanceKm} km)` : "None"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
