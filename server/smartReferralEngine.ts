/**
 * Arjuna - Smart Referral Engine
 * 
 * Computes ranked, multi-factor facility recommendations for patient referrals based on:
 * - Facility type and tier (AAM, Sub-Centre, PHC, CHC, District Hospital, Specialist Hospital)
 * - Clinical specialty match
 * - Equipment and diagnostic capabilities
 * - Distance proximity (km)
 * - Doctor and specialist on-duty availability
 * - Emergency & ICU capability matching urgency
 * - Appointment and bed queue availability
 * 
 * Transparently labels all telemetry as synthetic demo data unless connected to live ABDM gateway API.
 */

export interface FacilityMetadata {
  id: number;
  name: string;
  facilityType: "aam" | "sub_centre" | "phc" | "chc" | "district_hospital" | "specialist";
  district: string;
  village?: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  capabilities: string[];
  doctorAvailability: {
    specialty: string;
    doctorName: string;
    status: "Available" | "On-Duty" | "On-Call" | "Unavailable";
    shiftEnd?: string;
  }[];
  emergencyCapability: {
    is24x7: boolean;
    traumaLevel: "Level 1 Comprehensive" | "Level 2 District Trauma" | "Level 3 First Responder" | "Basic Stabilization" | "None";
    totalBeds: number;
    availableBeds: number;
    icuAvailable: boolean;
    oxygenAvailable: boolean;
  };
  appointmentAvailability: {
    status: "Immediate Slots" | "Available Today" | "Next Day" | "High Waitlist";
    queueLength: number;
    estimatedWaitMins: number;
    nextAvailableSlot: string;
  };
  distanceFromBaseKm: Record<string, number>; // distance in km from various villages/locations
  telemetry: {
    isSynthetic: boolean;
    source: string;
    disclaimer: string;
    lastTelemetrySync: string;
  };
}

export const SYNTHETIC_TELEMETRY_DISCLAIMER =
  "Simulated/Synthetic Demo Availability — not live tele-telemetry";

import { MAHARASHTRA_HOSPITALS_REGISTRY, type MaharashtraFacilityInfo } from "@shared/maharashtraLocations";

export const REFERRAL_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "TRANSPORT_ASSIGNED",
  "DEPARTED",
  "ARRIVED",
  "CONSULTED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

const BASE_SMART_FACILITIES: FacilityMetadata[] = [
  {
    id: 1,
    name: "Karanji Budruk Health and Wellness Centre (AAM)",
    facilityType: "aam",
    district: "Nandurbar",
    village: "Karanji Budruk",
    address: "Panchayat Chowk, Karanji Budruk, Taluka Shahada, Nandurbar, Maharashtra 425409",
    phone: "+91 2565 241010",
    latitude: 21.5432,
    longitude: 74.4521,
    specialties: ["Community Health", "First Aid", "Immunization", "NCD Screening", "Maternal Care"],
    capabilities: ["Basic Screening", "Immunization", "First Aid", "Teleconsultation", "Essential Drugs", "NCD Tracking"],
    doctorAvailability: [
      { specialty: "Community Health", doctorName: "Kavita Shinde (CHO)", status: "On-Duty", shiftEnd: "17:00" },
      { specialty: "Primary Health Support", doctorName: "Sunita More (ASHA Lead)", status: "Available", shiftEnd: "16:00" },
    ],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "None",
      totalBeds: 4,
      availableBeds: 2,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 2,
      estimatedWaitMins: 10,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: {
      "Karanji Budruk": 0.4,
      "Sonwadi": 4.2,
      "Nimbayat": 6.8,
      "Dhanora": 14.5,
      "Shirasgaon": 18.2,
      "Waghoda": 32.0,
      "Bhavadi": 45.0,
      "Pimpri Khurd": 52.0,
      "Sundarpur": 0.5,
      "Rampura": 6.2,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 2,
    name: "Sonwadi Sub-Centre",
    facilityType: "sub_centre",
    district: "Nandurbar",
    village: "Sonwadi",
    address: "Near Zilla Parishad School, Sonwadi, Taluka Shahada, Nandurbar, Maharashtra 425409",
    phone: "+91 2565 241012",
    latitude: 21.5120,
    longitude: 74.4102,
    specialties: ["Community Health", "Maternal Care", "Immunization"],
    capabilities: ["Basic Screening", "Immunization", "First Aid", "Essential Drugs"],
    doctorAvailability: [
      { specialty: "Community Health", doctorName: "Mangala Patil (ANM)", status: "On-Duty", shiftEnd: "16:00" },
    ],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "None",
      totalBeds: 2,
      availableBeds: 1,
      icuAvailable: false,
      oxygenAvailable: false,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 1,
      estimatedWaitMins: 5,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: {
      "Karanji Budruk": 4.2,
      "Sonwadi": 0.3,
      "Nimbayat": 8.5,
      "Dhanora": 16.0,
      "Shirasgaon": 21.0,
      "Sundarpur": 6.2,
      "Rampura": 0.2,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 3,
    name: "Nimbayat Primary Health Centre (PHC)",
    facilityType: "phc",
    district: "Nandurbar",
    village: "Nimbayat",
    address: "Main Highway Road, Nimbayat, Taluka Nandurbar, Maharashtra 425412",
    phone: "+91 2564 228100",
    latitude: 21.3654,
    longitude: 74.2411,
    specialties: ["General Medicine", "NCD Management", "Maternal & Child Health", "Cardiovascular Care", "Emergency Triage"],
    capabilities: [
      "General OPD",
      "NCD Clinic",
      "Maternal & Child Health",
      "Emergency Triage",
      "Full Pharmacy",
      "Diagnostic Lab",
      "ECG",
      "Observation Beds",
    ],
    doctorAvailability: [
      { specialty: "General Medicine", doctorName: "Dr. Amit Deshmukh, MBBS, DNB", status: "Available", shiftEnd: "18:00" },
      { specialty: "Maternal & Child Health", doctorName: "Dr. Priya Sonawane, MBBS, DGO", status: "On-Duty", shiftEnd: "17:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Basic Stabilization",
      totalBeds: 16,
      availableBeds: 7,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 3,
      estimatedWaitMins: 15,
      nextAvailableSlot: "Today in 15 mins",
    },
    distanceFromBaseKm: {
      "Karanji Budruk": 6.8,
      "Sonwadi": 8.5,
      "Nimbayat": 0.4,
      "Dhanora": 11.2,
      "Shirasgaon": 12.0,
      "Waghoda": 28.5,
      "Sundarpur": 14.5,
      "Rampura": 12.0,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 4,
    name: "Dhanora Rural Hospital (RH)",
    facilityType: "chc",
    district: "Nandurbar",
    village: "Dhanora",
    address: "Taloda Road, Dhanora, Taluka Taloda, Nandurbar, Maharashtra 425413",
    phone: "+91 2567 252100",
    latitude: 21.4821,
    longitude: 74.2155,
    specialties: ["Internal Medicine", "General Surgery", "Obstetrics & Gynecology", "Pediatrics", "Emergency Trauma"],
    capabilities: [
      "24/7 Emergency",
      "Specialist Consultations",
      "Inpatient Wards",
      "Operation Theatre",
      "Lab & Digital X-Ray",
      "Blood Storage",
      "Ultrasound",
      "Oxygen Beds",
      "Pharmacy",
    ],
    doctorAvailability: [
      { specialty: "Internal Medicine", doctorName: "Dr. Rajesh Kulkarni, MD", status: "Available", shiftEnd: "20:00" },
      { specialty: "General Surgery", doctorName: "Dr. Sachin Gawande, MS", status: "On-Duty", shiftEnd: "18:00" },
      { specialty: "Obstetrics & Gynecology", doctorName: "Dr. Rupali More, MS (OBG)", status: "On-Duty", shiftEnd: "19:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 2 District Trauma",
      totalBeds: 45,
      availableBeds: 16,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Available Today",
      queueLength: 6,
      estimatedWaitMins: 20,
      nextAvailableSlot: "Today in 25 mins",
    },
    distanceFromBaseKm: {
      "Karanji Budruk": 14.5,
      "Sonwadi": 16.0,
      "Nimbayat": 11.2,
      "Dhanora": 0.5,
      "Shirasgaon": 19.5,
      "Sundarpur": 19.8,
      "Bavla": 1.0,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 5,
    name: "Waghoda Health and Wellness Centre",
    facilityType: "aam",
    district: "Dhule",
    village: "Waghoda",
    address: "Shirpur Rural Road, Waghoda, Dhule, Maharashtra 425405",
    phone: "+91 2563 234100",
    latitude: 21.3512,
    longitude: 74.8812,
    specialties: ["Community Health", "Immunization", "NCD Screening"],
    capabilities: ["Basic Screening", "Immunization", "First Aid", "Teleconsultation"],
    doctorAvailability: [
      { specialty: "Community Health", doctorName: "Rekha Ahire (CHO)", status: "On-Duty", shiftEnd: "17:00" },
    ],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "None",
      totalBeds: 4,
      availableBeds: 2,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 2,
      estimatedWaitMins: 10,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: {
      "Karanji Budruk": 32.0,
      "Waghoda": 0.5,
      "Pimpri Khurd": 38.0,
      "Bhavadi": 18.0,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 6,
    name: "Pimpri Khurd Sub-Centre",
    facilityType: "sub_centre",
    district: "Dhule",
    village: "Pimpri Khurd",
    address: "Near Post Office, Pimpri Khurd, Sakri, Dhule, Maharashtra 424304",
    phone: "+91 2568 221100",
    latitude: 20.9854,
    longitude: 74.3125,
    specialties: ["Community Health", "Maternal Care"],
    capabilities: ["Basic Screening", "Immunization", "First Aid"],
    doctorAvailability: [
      { specialty: "Community Health", doctorName: "Sunita Pawar (ANM)", status: "On-Duty", shiftEnd: "16:00" },
    ],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "None",
      totalBeds: 2,
      availableBeds: 1,
      icuAvailable: false,
      oxygenAvailable: false,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 1,
      estimatedWaitMins: 5,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: {
      "Pimpri Khurd": 0.3,
      "Bhavadi": 24.0,
      "Karanji Budruk": 52.0,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 7,
    name: "Bhavadi Primary Health Centre",
    facilityType: "phc",
    district: "Dhule",
    village: "Bhavadi",
    address: "Sindkheda Road, Bhavadi, Dhule, Maharashtra 425406",
    phone: "+91 2566 231400",
    latitude: 21.2741,
    longitude: 74.7214,
    specialties: ["General Medicine", "Maternal & Child Health", "NCD Care", "Pharmacy"],
    capabilities: ["General OPD", "NCD Clinic", "Maternal Care", "Pharmacy", "Basic Lab"],
    doctorAvailability: [
      { specialty: "General Medicine", doctorName: "Dr. Pravin Patil, MBBS", status: "Available", shiftEnd: "18:00" },
    ],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "Basic Stabilization",
      totalBeds: 12,
      availableBeds: 5,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 3,
      estimatedWaitMins: 15,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: {
      "Bhavadi": 0.4,
      "Waghoda": 18.0,
      "Karanji Budruk": 45.0,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 8,
    name: "Kharpudi Rural Hospital",
    facilityType: "chc",
    district: "Nashik",
    village: "Kharpudi",
    address: "Dindori Road, Kharpudi, Nashik, Maharashtra 422202",
    phone: "+91 2557 221500",
    latitude: 20.2154,
    longitude: 73.8421,
    specialties: ["Internal Medicine", "General Surgery", "Obstetrics", "Pediatrics", "Trauma Care"],
    capabilities: ["24/7 Emergency", "Operation Theatre", "Inpatient Wards", "Ultrasound", "Digital X-Ray", "Pharmacy"],
    doctorAvailability: [
      { specialty: "Internal Medicine", doctorName: "Dr. Sanjay Jadhav, MD", status: "Available", shiftEnd: "20:00" },
      { specialty: "Obstetrics", doctorName: "Dr. Meera Gholap, MS", status: "On-Duty", shiftEnd: "18:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 2 District Trauma",
      totalBeds: 40,
      availableBeds: 14,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Available Today",
      queueLength: 5,
      estimatedWaitMins: 20,
      nextAvailableSlot: "Today in 20 mins",
    },
    distanceFromBaseKm: {
      "Kharpudi": 0.5,
      "Karanji Budruk": 120.0,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 9,
    name: "Chincholi Health and Wellness Centre",
    facilityType: "aam",
    district: "Ahmednagar",
    village: "Chincholi",
    address: "Sangamner Highway, Chincholi, Ahmednagar, Maharashtra 422605",
    phone: "+91 2425 223400",
    latitude: 19.5741,
    longitude: 74.2158,
    specialties: ["Community Health", "NCD Screening", "Maternal Care"],
    capabilities: ["Basic Screening", "Immunization", "First Aid", "Teleconsultation"],
    doctorAvailability: [
      { specialty: "Community Health", doctorName: "Anjali Gaikwad (CHO)", status: "On-Duty", shiftEnd: "17:00" },
    ],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "None",
      totalBeds: 4,
      availableBeds: 2,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 2,
      estimatedWaitMins: 10,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: {
      "Chincholi": 0.4,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 10,
    name: "Mhaswad Primary Health Centre",
    facilityType: "phc",
    district: "Satara",
    village: "Mhaswad",
    address: "Man Taluka Road, Mhaswad, Satara, Maharashtra 415509",
    phone: "+91 2165 271200",
    latitude: 17.6254,
    longitude: 74.7852,
    specialties: ["General Medicine", "Maternal & Child Health", "NCD Clinic"],
    capabilities: ["General OPD", "NCD Screening", "Maternal Care", "Pharmacy", "Lab"],
    doctorAvailability: [
      { specialty: "General Medicine", doctorName: "Dr. Nilesh Salunkhe, MBBS", status: "Available", shiftEnd: "18:00" },
    ],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "Basic Stabilization",
      totalBeds: 14,
      availableBeds: 6,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 3,
      estimatedWaitMins: 15,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: {
      "Mhaswad": 0.5,
      "Borgaon": 22.0,
      "Kinhai": 35.0,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 11,
    name: "Kumbhari Sub-Centre",
    facilityType: "sub_centre",
    district: "Solapur",
    village: "Kumbhari",
    address: "Solapur South Road, Kumbhari, Solapur, Maharashtra 413006",
    phone: "+91 217 2281100",
    latitude: 17.6124,
    longitude: 75.9852,
    specialties: ["Community Health", "Immunization", "First Aid"],
    capabilities: ["Basic Screening", "Immunization", "First Aid", "Essential Drugs"],
    doctorAvailability: [
      { specialty: "Community Health", doctorName: "Lata Rathod (ANM)", status: "On-Duty", shiftEnd: "16:00" },
    ],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "None",
      totalBeds: 2,
      availableBeds: 1,
      icuAvailable: false,
      oxygenAvailable: false,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 1,
      estimatedWaitMins: 5,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: {
      "Kumbhari": 0.3,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 12,
    name: "Rajewadi Rural Hospital",
    facilityType: "chc",
    district: "Pune",
    village: "Rajewadi",
    address: "Saswad-Purandar Road, Rajewadi, Pune, Maharashtra 412801",
    phone: "+91 2115 223500",
    latitude: 18.2854,
    longitude: 74.1521,
    specialties: ["Internal Medicine", "General Surgery", "Pediatrics", "Emergency Trauma"],
    capabilities: ["24/7 Emergency", "Operation Theatre", "Inpatient Wards", "Ultrasound", "Digital X-Ray", "Pharmacy"],
    doctorAvailability: [
      { specialty: "Internal Medicine", doctorName: "Dr. Sachin Bhosale, MS", status: "Available", shiftEnd: "20:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 2 District Trauma",
      totalBeds: 35,
      availableBeds: 12,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Available Today",
      queueLength: 4,
      estimatedWaitMins: 15,
      nextAvailableSlot: "Today in 20 mins",
    },
    distanceFromBaseKm: {
      "Rajewadi": 0.5,
      "Alegaon": 28.0,
      "Waki": 34.0,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 13,
    name: "Palsi Health and Wellness Centre",
    facilityType: "aam",
    district: "Beed",
    village: "Palsi",
    address: "Ashti Road, Palsi, Beed, Maharashtra 414203",
    phone: "+91 2441 234100",
    latitude: 18.8124,
    longitude: 75.1852,
    specialties: ["Community Health", "NCD Screening", "Maternal Care"],
    capabilities: ["Basic Screening", "Immunization", "First Aid", "Teleconsultation"],
    doctorAvailability: [
      { specialty: "Community Health", doctorName: "Sarita Kadam (CHO)", status: "On-Duty", shiftEnd: "17:00" },
    ],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "None",
      totalBeds: 4,
      availableBeds: 2,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 2,
      estimatedWaitMins: 10,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: {
      "Palsi": 0.4,
      "Ashti Khurd": 8.0,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 14,
    name: "Mohgaon Primary Health Centre",
    facilityType: "phc",
    district: "Latur",
    village: "Mohgaon",
    address: "Renapur Road, Mohgaon, Latur, Maharashtra 413527",
    phone: "+91 2382 245100",
    latitude: 18.5241,
    longitude: 76.5412,
    specialties: ["General Medicine", "NCD Clinic", "Maternal & Child Health", "Pharmacy"],
    capabilities: ["General OPD", "NCD Clinic", "Maternal Care", "Pharmacy", "Diagnostic Lab"],
    doctorAvailability: [
      { specialty: "General Medicine", doctorName: "Dr. Vikas Shinde, MBBS", status: "Available", shiftEnd: "18:00" },
    ],
    emergencyCapability: {
      is24x7: false,
      traumaLevel: "Basic Stabilization",
      totalBeds: 12,
      availableBeds: 5,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 3,
      estimatedWaitMins: 15,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: {
      "Mohgaon": 0.5,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 15,
    name: "Sawargaon Sub-District Hospital (SDH)",
    facilityType: "chc",
    district: "Osmanabad",
    village: "Sawargaon",
    address: "Tuljapur Highway, Sawargaon, Osmanabad, Maharashtra 413601",
    phone: "+91 2472 251900",
    latitude: 18.0125,
    longitude: 76.0852,
    specialties: ["Internal Medicine", "General Surgery", "Obstetrics & Gynecology", "Pediatrics", "Emergency Trauma"],
    capabilities: ["24/7 Emergency", "Inpatient Wards", "Operation Theatre", "Digital X-Ray", "Ultrasound", "Blood Storage", "Pharmacy"],
    doctorAvailability: [
      { specialty: "Internal Medicine", doctorName: "Dr. Sneha Chavan, MD", status: "Available", shiftEnd: "20:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 2 District Trauma",
      totalBeds: 50,
      availableBeds: 18,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Available Today",
      queueLength: 7,
      estimatedWaitMins: 20,
      nextAvailableSlot: "Today in 25 mins",
    },
    distanceFromBaseKm: {
      "Sawargaon": 0.5,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 16,
    name: "Devgaon Rural Hospital",
    facilityType: "chc",
    district: "Amravati",
    village: "Devgaon",
    address: "Achalpur-Paratwada Highway, Devgaon, Amravati, Maharashtra 444806",
    phone: "+91 7223 224500",
    latitude: 21.2854,
    longitude: 77.5124,
    specialties: ["Internal Medicine", "General Surgery", "Obstetrics", "Emergency Trauma"],
    capabilities: ["24/7 Emergency", "Operation Theatre", "Inpatient Wards", "X-Ray", "Ultrasound", "Pharmacy"],
    doctorAvailability: [
      { specialty: "Internal Medicine", doctorName: "Dr. Yogesh Raut, MS", status: "Available", shiftEnd: "19:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 2 District Trauma",
      totalBeds: 40,
      availableBeds: 15,
      icuAvailable: false,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Available Today",
      queueLength: 5,
      estimatedWaitMins: 20,
      nextAvailableSlot: "Today in 20 mins",
    },
    distanceFromBaseKm: {
      "Devgaon": 0.5,
      "Karanjkhed": 18.0,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 17,
    name: "Shirasgaon District Hospital",
    facilityType: "district_hospital",
    district: "Nandurbar",
    village: "Shirasgaon",
    address: "Collectorate Circle, Shirasgaon, Nandurbar, Maharashtra 425412",
    phone: "+91 2564 222900",
    latitude: 21.3754,
    longitude: 74.2389,
    specialties: [
      "Internal Medicine",
      "Cardiology",
      "Nephrology",
      "General Surgery",
      "Orthopedics",
      "Obstetrics & Gynecology",
      "Pediatrics",
      "Emergency Trauma",
    ],
    capabilities: [
      "24/7 Emergency",
      "ICU & CCU",
      "NICU",
      "Dialysis Unit",
      "Operation Theatre",
      "Blood Bank",
      "Digital X-Ray",
      "Ultrasound & 2D Echo",
      "CT Scan",
      "Maternal Critical Care",
      "Central Pharmacy",
    ],
    doctorAvailability: [
      { specialty: "Cardiology", doctorName: "Dr. Priya Joshi, MD, DM (Cardio)", status: "Available", shiftEnd: "19:00" },
      { specialty: "Internal Medicine", doctorName: "Dr. Rameshwar Deshmukh, MD", status: "Available", shiftEnd: "21:00" },
      { specialty: "Nephrology", doctorName: "Dr. Sandeep Kadam, DM (Nephro)", status: "On-Call", shiftEnd: "18:00" },
      { specialty: "Emergency Trauma", doctorName: "Dr. Anil Thorat, MS (Orthopedics)", status: "On-Duty", shiftEnd: "08:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 120,
      availableBeds: 38,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Available Today",
      queueLength: 12,
      estimatedWaitMins: 35,
      nextAvailableSlot: "Today in 45 mins",
    },
    distanceFromBaseKm: {
      "Karanji Budruk": 18.2,
      "Sonwadi": 21.0,
      "Nimbayat": 12.0,
      "Dhanora": 19.5,
      "Shirasgaon": 0.5,
      "Sundarpur": 19.8,
      "Viramgam": 34.0,
    },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 18,
    name: "KEM Hospital & Seth GS Medical College",
    facilityType: "district_hospital",
    district: "Mumbai City",
    village: "Parel",
    address: "Acharya Donde Marg, Parel, Mumbai City, Maharashtra 400012",
    phone: "+91 22 2410 7000",
    latitude: 19.0028,
    longitude: 72.8427,
    specialties: ["Cardiology", "Neurology", "Nephrology", "General Surgery", "Emergency Medicine", "Pediatrics", "Obstetrics & Gynecology"],
    capabilities: ["24/7 Emergency", "Level 1 Trauma", "ICU", "CCU", "NICU", "Dialysis", "CT Scan", "MRI", "Blood Bank", "Advanced Surgery"],
    doctorAvailability: [
      { specialty: "Cardiology", doctorName: "Dr. Arvind Mehta, MD, DM", status: "On-Duty", shiftEnd: "18:00" },
      { specialty: "Emergency Medicine", doctorName: "Dr. Smita Kulkarni, MD", status: "Available", shiftEnd: "20:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 350,
      availableBeds: 62,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 8,
      estimatedWaitMins: 15,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: { "Karanji Budruk": 390.0 },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 19,
    name: "Dr. R. N. Cooper Municipal General Hospital",
    facilityType: "district_hospital",
    district: "Mumbai Suburban",
    village: "Andheri",
    address: "U 15, Bhaktivedanta Swami Marg, JVPD Scheme, Juhu, Andheri West, Mumbai Suburban 400056",
    phone: "+91 22 2620 7254",
    latitude: 19.1075,
    longitude: 72.8362,
    specialties: ["General Medicine", "Emergency Medicine", "Orthopedics", "Pediatrics", "Cardiology"],
    capabilities: ["24/7 Trauma", "ICU", "Digital X-Ray", "CT Scan", "Central Pharmacy", "Blood Storage"],
    doctorAvailability: [
      { specialty: "General Medicine", doctorName: "Dr. Neha Shah, MD", status: "On-Duty", shiftEnd: "17:00" },
      { specialty: "Pediatrics", doctorName: "Dr. Vijay Rane, MD", status: "Available", shiftEnd: "19:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 240,
      availableBeds: 44,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Available Today",
      queueLength: 6,
      estimatedWaitMins: 12,
      nextAvailableSlot: "Today in 20 mins",
    },
    distanceFromBaseKm: { "Karanji Budruk": 375.0 },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 20,
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
    doctorAvailability: [
      { specialty: "Internal Medicine", doctorName: "Dr. Pradeep Patil, MD", status: "On-Duty", shiftEnd: "18:00" },
      { specialty: "Emergency Medicine", doctorName: "Dr. Alok Shinde, MBBS", status: "Available", shiftEnd: "22:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 180,
      availableBeds: 35,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Available Today",
      queueLength: 5,
      estimatedWaitMins: 10,
      nextAvailableSlot: "Today in 15 mins",
    },
    distanceFromBaseKm: { "Karanji Budruk": 360.0 },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 21,
    name: "Government Medical College & Hospital (GMCH) Nagpur",
    facilityType: "district_hospital",
    district: "Nagpur",
    village: "Nagpur City",
    address: "Hanuman Nagar, Medical Square, Nagpur, Maharashtra 440003",
    phone: "+91 712 274 4671",
    latitude: 21.1278,
    longitude: 79.0982,
    specialties: ["Cardiology", "Neurology", "Nephrology", "General Medicine", "Oncology", "Trauma & Emergency", "Pediatrics"],
    capabilities: ["24/7 Super-Specialty Emergency", "Super ICU", "Level 1 Regional Trauma", "Cath Lab", "MRI & CT Scan", "Blood Bank"],
    doctorAvailability: [
      { specialty: "Cardiology", doctorName: "Dr. Suresh Agrawal, DM", status: "On-Duty", shiftEnd: "19:00" },
      { specialty: "Trauma & Emergency", doctorName: "Dr. Manoj Wankhede, MS", status: "Available", shiftEnd: "21:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 400,
      availableBeds: 75,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 9,
      estimatedWaitMins: 20,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: { "Karanji Budruk": 480.0 },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 22,
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
    doctorAvailability: [
      { specialty: "General Medicine", doctorName: "Dr. Santosh Gaikwad, MD", status: "On-Duty", shiftEnd: "18:00" },
      { specialty: "Cardiology", doctorName: "Dr. Varsha Deshpande, DM", status: "Available", shiftEnd: "17:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 280,
      availableBeds: 50,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Available Today",
      queueLength: 7,
      estimatedWaitMins: 15,
      nextAvailableSlot: "Today in 25 mins",
    },
    distanceFromBaseKm: { "Karanji Budruk": 240.0 },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 23,
    name: "Chhatrapati Pramila Raje (CPR) General Hospital",
    facilityType: "district_hospital",
    district: "Kolhapur",
    village: "Kolhapur City",
    address: "Bhausingji Road, Mangalwar Peth, Kolhapur, Maharashtra 416012",
    phone: "+91 231 264 1234",
    latitude: 16.6985,
    longitude: 74.2281,
    specialties: ["Emergency Medicine", "General Surgery", "Orthopedics", "Cardiovascular Care", "Obstetrics & Gynecology"],
    capabilities: ["24/7 Trauma", "ICU", "Dialysis Unit", "Maternal Care", "Central Pharmacy", "Digital Imaging"],
    doctorAvailability: [
      { specialty: "Emergency Medicine", doctorName: "Dr. Aniket Bhosale, MS", status: "On-Duty", shiftEnd: "20:00" },
      { specialty: "Cardiovascular Care", doctorName: "Dr. Rutuja Mane, MD", status: "Available", shiftEnd: "18:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 200,
      availableBeds: 42,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 4,
      estimatedWaitMins: 10,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: { "Karanji Budruk": 440.0 },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 24,
    name: "Jalgaon Government Medical College & General Hospital",
    facilityType: "district_hospital",
    district: "Jalgaon",
    village: "Jalgaon City",
    address: "Civil Hospital Compound, Station Road, Jalgaon, Maharashtra 425001",
    phone: "+91 257 222 5544",
    latitude: 21.0077,
    longitude: 75.5626,
    specialties: ["General Medicine", "Pediatrics", "Emergency Trauma", "Cardiology", "Obstetrics & Gynecology"],
    capabilities: ["24/7 Emergency", "ICU", "Blood Bank", "Diagnostic Lab", "Digital X-Ray", "NICU"],
    doctorAvailability: [
      { specialty: "General Medicine", doctorName: "Dr. Nitin Chaudhari, MD", status: "On-Duty", shiftEnd: "18:00" },
      { specialty: "Pediatrics", doctorName: "Dr. Meena Patil, MD", status: "Available", shiftEnd: "17:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 160,
      availableBeds: 34,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 5,
      estimatedWaitMins: 12,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: { "Karanji Budruk": 130.0 },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 25,
    name: "District Civil Hospital & Trauma Centre Palghar",
    facilityType: "district_hospital",
    district: "Palghar",
    village: "Palghar City",
    address: "Tembhode Road, Palghar, Maharashtra 401404",
    phone: "+91 2525 252055",
    latitude: 19.6967,
    longitude: 72.7655,
    specialties: ["General Medicine", "Emergency Medicine", "Maternal Care", "Pediatrics", "Orthopedics"],
    capabilities: ["24/7 Emergency", "ICU", "Trauma Unit", "Maternal Care", "Pharmacy", "Laboratory"],
    doctorAvailability: [
      { specialty: "General Medicine", doctorName: "Dr. Deepak Gharat, MD", status: "On-Duty", shiftEnd: "17:00" },
      { specialty: "Maternal Care", doctorName: "Dr. Shilpa Vartak, MD", status: "Available", shiftEnd: "19:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 130,
      availableBeds: 28,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Available Today",
      queueLength: 3,
      estimatedWaitMins: 8,
      nextAvailableSlot: "Today in 10 mins",
    },
    distanceFromBaseKm: { "Karanji Budruk": 310.0 },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 26,
    name: "District Civil Hospital Gadchiroli",
    facilityType: "district_hospital",
    district: "Gadchiroli",
    village: "Gadchiroli City",
    address: "Complex Area, Dhanora Road, Gadchiroli, Maharashtra 442605",
    phone: "+91 7132 222120",
    latitude: 20.1849,
    longitude: 79.9948,
    specialties: ["General Medicine", "Community Health", "Emergency Trauma", "Maternal & Child Health", "Infectious Diseases"],
    capabilities: ["24/7 Emergency", "Tribal Health Outreach", "ICU", "Blood Bank", "Diagnostic Lab", "Essential Pharmacy"],
    doctorAvailability: [
      { specialty: "General Medicine", doctorName: "Dr. Abhay Madavi, MD", status: "On-Duty", shiftEnd: "18:00" },
      { specialty: "Community Health", doctorName: "Dr. Sarita Tembhurne, MBBS", status: "Available", shiftEnd: "17:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 110,
      availableBeds: 26,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 2,
      estimatedWaitMins: 5,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: { "Karanji Budruk": 580.0 },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 27,
    name: "District General Hospital Ratnagiri",
    facilityType: "district_hospital",
    district: "Ratnagiri",
    village: "Ratnagiri City",
    address: "Jail Road, Near Court, Ratnagiri, Maharashtra 415612",
    phone: "+91 2352 222366",
    latitude: 16.9902,
    longitude: 73.3120,
    specialties: ["General Medicine", "Emergency Medicine", "Pediatrics", "Cardiology", "Orthopedics"],
    capabilities: ["24/7 Emergency", "ICU", "Dialysis", "Operation Theatre", "Blood Bank", "Digital X-Ray"],
    doctorAvailability: [
      { specialty: "General Medicine", doctorName: "Dr. Shrikant Sawant, MD", status: "On-Duty", shiftEnd: "18:00" },
      { specialty: "Emergency Medicine", doctorName: "Dr. Pallavi Surve, MBBS", status: "Available", shiftEnd: "20:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 140,
      availableBeds: 30,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Available Today",
      queueLength: 4,
      estimatedWaitMins: 10,
      nextAvailableSlot: "Today in 15 mins",
    },
    distanceFromBaseKm: { "Karanji Budruk": 460.0 },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
  {
    id: 28,
    name: "Dr. Shankarrao Chavan Government Medical College & Hospital Nanded",
    facilityType: "district_hospital",
    district: "Nanded",
    village: "Nanded City",
    address: "Vishnupuri, Nanded, Maharashtra 431606",
    phone: "+91 2462 229285",
    latitude: 19.1238,
    longitude: 77.3012,
    specialties: ["Cardiology", "Nephrology", "General Medicine", "Pediatrics", "Emergency Trauma", "Obstetrics & Gynecology"],
    capabilities: ["24/7 Tertiary Emergency", "ICU & CCU", "NICU", "Dialysis Unit", "Blood Bank", "Advanced Diagnostics"],
    doctorAvailability: [
      { specialty: "General Medicine", doctorName: "Dr. Sanjay Rathod, MD", status: "On-Duty", shiftEnd: "19:00" },
      { specialty: "Pediatrics", doctorName: "Dr. Poonam Kadam, MD", status: "Available", shiftEnd: "17:00" },
    ],
    emergencyCapability: {
      is24x7: true,
      traumaLevel: "Level 1 Comprehensive",
      totalBeds: 260,
      availableBeds: 52,
      icuAvailable: true,
      oxygenAvailable: true,
    },
    appointmentAvailability: {
      status: "Immediate Slots",
      queueLength: 6,
      estimatedWaitMins: 15,
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: { "Karanji Budruk": 340.0 },
    telemetry: {
      isSynthetic: true,
      source: "Synthetic Demo Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: "2026-09-13T10:30:00Z",
    },
  },
];

function convertMaharashtraFacilityToMetadata(item: MaharashtraFacilityInfo): FacilityMetadata {
  const is24x7 = item.is24x7 ?? true;
  const traumaLevel =
    item.facilityType === "district_hospital" || item.facilityType === "specialist"
      ? "Level 1 Comprehensive"
      : item.facilityType === "sub_district_hospital" || item.facilityType === "chc"
      ? "Level 2 District Trauma"
      : "Basic Stabilization";

  const facType: FacilityMetadata["facilityType"] =
    item.facilityType === "sub_district_hospital"
      ? "district_hospital"
      : (item.facilityType as FacilityMetadata["facilityType"]);

  return {
    id: item.id,
    name: item.name,
    facilityType: facType,
    district: item.district,
    village: item.village,
    address: item.address,
    phone: item.phone,
    latitude: item.latitude,
    longitude: item.longitude,
    specialties: item.specialties || ["General Medicine"],
    capabilities: item.capabilities || ["Emergency Care", "OPD", "Diagnostics"],
    doctorAvailability: (item.specialties || ["General Medicine"]).slice(0, 3).map((spec, i) => ({
      specialty: spec,
      doctorName: `Dr. ${["Kulkarni", "Deshmukh", "Patil", "Shinde", "Joshi", "Chavan", "Pawar"][(item.id + i) % 7]} (Consultant)`,
      status: i === 0 ? "On-Duty" : "Available",
      shiftEnd: "18:00",
    })),
    emergencyCapability: {
      is24x7,
      traumaLevel: traumaLevel as any,
      totalBeds: item.totalBeds || 50,
      availableBeds: item.availableBeds || 12,
      icuAvailable: !!item.icuAvailable,
      oxygenAvailable: !!item.oxygenAvailable,
    },
    appointmentAvailability: {
      status: (item.availableBeds || 12) > 10 ? "Immediate Slots" : "Available Today",
      queueLength: Math.max(2, Math.floor(((item.totalBeds || 50) - (item.availableBeds || 12)) / 8)),
      estimatedWaitMins: Math.max(10, Math.floor(((item.totalBeds || 50) - (item.availableBeds || 12)) / 4)),
      nextAvailableSlot: "Today, Walk-in",
    },
    distanceFromBaseKm: {
      [item.village || item.district]: 0.8,
      "Pune City": 15.0,
      "Mumbai": 30.0,
      "Karanji Budruk": 140.0,
    },
    telemetry: {
      isSynthetic: true,
      source: "Maharashtra Public Health Facility Registry",
      disclaimer: SYNTHETIC_TELEMETRY_DISCLAIMER,
      lastTelemetrySync: new Date().toISOString(),
    },
  };
}

const convertedMahaFacilities: FacilityMetadata[] = MAHARASHTRA_HOSPITALS_REGISTRY.map(convertMaharashtraFacilityToMetadata);

export const SMART_FACILITIES_REGISTRY: FacilityMetadata[] = [
  ...BASE_SMART_FACILITIES,
  ...convertedMahaFacilities.filter(
    (mf) => !BASE_SMART_FACILITIES.some((bf) => bf.id === mf.id || bf.name.toLowerCase() === mf.name.toLowerCase())
  ),
];


export interface RecommendationScoreBreakdown {
  specialtyMatch: number;      // 0 - 30 pts
  distance: number;            // 0 - 25 pts
  doctorAvailability: number;  // 0 - 15 pts
  emergencyCapability: number; // 0 - 15 pts
  capabilitiesMatch: number;   // 0 - 10 pts
  appointmentAvailability: number; // 0 - 5 pts
}

export interface FacilityRecommendation {
  facility: FacilityMetadata;
  distanceKm: number;
  specialtyAvailable: boolean;
  specialtyStatus: "Available" | "On-Duty" | "On-Call" | "Unavailable";
  doctorAvailable: boolean;
  doctorStatus: "Available" | "On-Duty" | "Shift Coverage" | "Unavailable";
  emergencyCapable: boolean;
  emergencyStatus: "Yes (24/7 Emergency & Trauma)" | "Basic Stabilization" | "Daytime Only" | "No";
  appointmentAvailable: boolean;
  appointmentStatus: "Immediate Slots" | "Available Today" | "Next Day" | "High Waitlist";
  recommendationScore: number; // 0 - 100
  scoreBreakdown: RecommendationScoreBreakdown;
  summaryHighlights: {
    facilityName: string;
    distanceText: string;
    specialtyText: string;
    doctorText: string;
    emergencyText: string;
    recommendationScoreText: string;
  };
  recommendationReason: string;
  isSyntheticData: boolean;
  telemetrySource: string;
  telemetryDisclaimer: string;
}

export interface ReferralRecommendationInput {
  patientId?: number;
  originVillage?: string;
  urgency: "emergency" | "urgent" | "routine";
  specialty?: string;
  requiredCapabilities?: string[];
  patientVitals?: {
    bpSystolic?: number;
    bpDiastolic?: number;
    spo2?: number;
    glucose?: number;
    riskScore?: number;
    riskCategory?: string;
  };
}

/**
 * Normalizes specialty string comparisons
 */
function isSpecialtyMatching(specialtyQuery: string | undefined, facilitySpecialties: string[]): boolean {
  if (!specialtyQuery || specialtyQuery.trim() === "" || specialtyQuery.toLowerCase().includes("general")) {
    return true;
  }
  const cleanQuery = specialtyQuery.toLowerCase();
  return facilitySpecialties.some((s) => {
    const cleanSpec = s.toLowerCase();
    return (
      cleanSpec.includes(cleanQuery) ||
      cleanQuery.includes(cleanSpec) ||
      (cleanQuery.includes("cardio") && cleanSpec.includes("cardio")) ||
      (cleanQuery.includes("gyn") && cleanSpec.includes("gyn")) ||
      (cleanQuery.includes("obg") && cleanSpec.includes("obstetric")) ||
      (cleanQuery.includes("maternal") && cleanSpec.includes("maternal")) ||
      (cleanQuery.includes("pediatric") && cleanSpec.includes("pediatric")) ||
      (cleanQuery.includes("kidney") && cleanSpec.includes("nephro")) ||
      (cleanQuery.includes("ortho") && cleanSpec.includes("ortho")) ||
      (cleanQuery.includes("lung") && cleanSpec.includes("pulmon")) ||
      (cleanQuery.includes("chest") && cleanSpec.includes("pulmon"))
    );
  });
}

/**
 * Village demographic and geospatial registry for map rendering and referral origins
 */
export interface VillageMetadata {
  id: string;
  name: string;
  district: string;
  block: string;
  latitude: number;
  longitude: number;
  population: number;
  screenedCount: number;
  highRiskCount: number;
  activeAlerts: number;
  nearestFacilityId: number;
  nearestFacilityName: string;
  status: "good" | "moderate" | "high";
}

export const CONFIG_VILLAGES: VillageMetadata[] = [
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
    nearestFacilityId: 1,
    nearestFacilityName: "Karanji Budruk Health and Wellness Centre (AAM)",
    status: "moderate",
  },
  {
    id: "sonwadi",
    name: "Sonwadi",
    district: "Nandurbar",
    block: "Shahada",
    latitude: 21.5120,
    longitude: 74.4102,
    population: 1820,
    screenedCount: 1240,
    highRiskCount: 42,
    activeAlerts: 2,
    nearestFacilityId: 2,
    nearestFacilityName: "Sonwadi Sub-Centre",
    status: "good",
  },
  {
    id: "nimbayat",
    name: "Nimbayat",
    district: "Nandurbar",
    block: "Nandurbar",
    latitude: 21.4120,
    longitude: 74.3120,
    population: 3200,
    screenedCount: 2350,
    highRiskCount: 84,
    activeAlerts: 4,
    nearestFacilityId: 3,
    nearestFacilityName: "Nimbayat Primary Health Centre (PHC)",
    status: "moderate",
  },
  {
    id: "dhanora",
    name: "Dhanora",
    district: "Nandurbar",
    block: "Taloda",
    latitude: 21.5620,
    longitude: 74.2150,
    population: 4100,
    screenedCount: 2950,
    highRiskCount: 110,
    activeAlerts: 5,
    nearestFacilityId: 4,
    nearestFacilityName: "Dhanora Rural Hospital (RH)",
    status: "high",
  },
  {
    id: "waghoda",
    name: "Waghoda",
    district: "Dhule",
    block: "Shirpur",
    latitude: 21.3512,
    longitude: 74.8812,
    population: 2100,
    screenedCount: 1480,
    highRiskCount: 52,
    activeAlerts: 2,
    nearestFacilityId: 5,
    nearestFacilityName: "Waghoda Health and Wellness Centre",
    status: "good",
  },
  {
    id: "pimpri_khurd",
    name: "Pimpri Khurd",
    district: "Dhule",
    block: "Sakri",
    latitude: 20.9854,
    longitude: 74.3210,
    population: 1650,
    screenedCount: 1120,
    highRiskCount: 48,
    activeAlerts: 3,
    nearestFacilityId: 6,
    nearestFacilityName: "Pimpri Khurd Sub-Centre",
    status: "moderate",
  },
  {
    id: "bhavadi",
    name: "Bhavadi",
    district: "Dhule",
    block: "Sindkheda",
    latitude: 21.2845,
    longitude: 74.7412,
    population: 2900,
    screenedCount: 2100,
    highRiskCount: 76,
    activeAlerts: 4,
    nearestFacilityId: 7,
    nearestFacilityName: "Bhavadi Primary Health Centre (PHC)",
    status: "moderate",
  },
  {
    id: "kharpudi",
    name: "Kharpudi",
    district: "Nashik",
    block: "Dindori",
    latitude: 20.2145,
    longitude: 73.8421,
    population: 3600,
    screenedCount: 2600,
    highRiskCount: 92,
    activeAlerts: 4,
    nearestFacilityId: 8,
    nearestFacilityName: "Kharpudi Rural Hospital (RH)",
    status: "moderate",
  },
  {
    id: "chincholi",
    name: "Chincholi",
    district: "Ahmednagar",
    block: "Sangamner",
    latitude: 19.5741,
    longitude: 74.2145,
    population: 2800,
    screenedCount: 1950,
    highRiskCount: 64,
    activeAlerts: 2,
    nearestFacilityId: 9,
    nearestFacilityName: "Chincholi Health and Wellness Centre",
    status: "good",
  },
  {
    id: "mhaswad",
    name: "Mhaswad",
    district: "Satara",
    block: "Man",
    latitude: 17.6321,
    longitude: 74.7954,
    population: 4200,
    screenedCount: 3100,
    highRiskCount: 104,
    activeAlerts: 5,
    nearestFacilityId: 10,
    nearestFacilityName: "Mhaswad Primary Health Centre",
    status: "high",
  },
  {
    id: "borgaon",
    name: "Borgaon",
    district: "Satara",
    block: "Karad",
    latitude: 17.2845,
    longitude: 74.1852,
    population: 2100,
    screenedCount: 1540,
    highRiskCount: 50,
    activeAlerts: 2,
    nearestFacilityId: 10,
    nearestFacilityName: "Mhaswad Primary Health Centre",
    status: "good",
  },
  {
    id: "kumbhari",
    name: "Kumbhari",
    district: "Solapur",
    block: "Solapur South",
    latitude: 17.6124,
    longitude: 75.9852,
    population: 3100,
    screenedCount: 2200,
    highRiskCount: 78,
    activeAlerts: 3,
    nearestFacilityId: 11,
    nearestFacilityName: "Kumbhari Sub-Centre",
    status: "moderate",
  },
  {
    id: "rajewadi",
    name: "Rajewadi",
    district: "Pune",
    block: "Purandar",
    latitude: 18.2854,
    longitude: 74.1521,
    population: 3500,
    screenedCount: 2550,
    highRiskCount: 88,
    activeAlerts: 3,
    nearestFacilityId: 12,
    nearestFacilityName: "Rajewadi Rural Hospital",
    status: "moderate",
  },
  {
    id: "alegaon",
    name: "Alegaon",
    district: "Pune",
    block: "Shirur",
    latitude: 18.7214,
    longitude: 74.3854,
    population: 2600,
    screenedCount: 1850,
    highRiskCount: 62,
    activeAlerts: 2,
    nearestFacilityId: 12,
    nearestFacilityName: "Rajewadi Rural Hospital",
    status: "good",
  },
  {
    id: "waki",
    name: "Waki",
    district: "Pune",
    block: "Khed",
    latitude: 18.7952,
    longitude: 73.8941,
    population: 2900,
    screenedCount: 2050,
    highRiskCount: 70,
    activeAlerts: 3,
    nearestFacilityId: 12,
    nearestFacilityName: "Rajewadi Rural Hospital",
    status: "moderate",
  },
  {
    id: "ashti_khurd",
    name: "Ashti Khurd",
    district: "Beed",
    block: "Ashti",
    latitude: 18.8124,
    longitude: 75.1852,
    population: 2400,
    screenedCount: 1700,
    highRiskCount: 58,
    activeAlerts: 2,
    nearestFacilityId: 13,
    nearestFacilityName: "Palsi Health and Wellness Centre",
    status: "good",
  },
  {
    id: "palsi",
    name: "Palsi",
    district: "Beed",
    block: "Ashti",
    latitude: 18.7845,
    longitude: 75.1420,
    population: 1900,
    screenedCount: 1350,
    highRiskCount: 46,
    activeAlerts: 2,
    nearestFacilityId: 13,
    nearestFacilityName: "Palsi Health and Wellness Centre",
    status: "good",
  },
  {
    id: "kinhai",
    name: "Kinhai",
    district: "Satara",
    block: "Koregaon",
    latitude: 17.7214,
    longitude: 74.1520,
    population: 2200,
    screenedCount: 1550,
    highRiskCount: 52,
    activeAlerts: 2,
    nearestFacilityId: 10,
    nearestFacilityName: "Mhaswad Primary Health Centre",
    status: "good",
  },
  {
    id: "mohgaon",
    name: "Mohgaon",
    district: "Latur",
    block: "Renapur",
    latitude: 18.5214,
    longitude: 76.6214,
    population: 3300,
    screenedCount: 2350,
    highRiskCount: 82,
    activeAlerts: 3,
    nearestFacilityId: 14,
    nearestFacilityName: "Mohgaon Primary Health Centre",
    status: "moderate",
  },
  {
    id: "sawargaon",
    name: "Sawargaon",
    district: "Osmanabad",
    block: "Tuljapur",
    latitude: 18.0124,
    longitude: 76.0852,
    population: 3700,
    screenedCount: 2700,
    highRiskCount: 96,
    activeAlerts: 4,
    nearestFacilityId: 15,
    nearestFacilityName: "Sawargaon Sub-District Hospital (SDH)",
    status: "moderate",
  },
  {
    id: "karanjkhed",
    name: "Karanjkhed",
    district: "Amravati",
    block: "Morshi",
    latitude: 21.3214,
    longitude: 78.0124,
    population: 2800,
    screenedCount: 1980,
    highRiskCount: 68,
    activeAlerts: 3,
    nearestFacilityId: 16,
    nearestFacilityName: "Devgaon Rural Hospital",
    status: "moderate",
  },
  {
    id: "devgaon",
    name: "Devgaon",
    district: "Amravati",
    block: "Achalpur",
    latitude: 21.2654,
    longitude: 77.5124,
    population: 3400,
    screenedCount: 2450,
    highRiskCount: 86,
    activeAlerts: 3,
    nearestFacilityId: 16,
    nearestFacilityName: "Devgaon Rural Hospital",
    status: "moderate",
  },
  {
    id: "shirasgaon",
    name: "Shirasgaon",
    district: "Nandurbar",
    block: "Nandurbar",
    latitude: 21.3754,
    longitude: 74.2389,
    population: 4800,
    screenedCount: 3600,
    highRiskCount: 125,
    activeAlerts: 5,
    nearestFacilityId: 17,
    nearestFacilityName: "Shirasgaon District Hospital",
    status: "high",
  },
  {
    id: "tandulwadi",
    name: "Tandulwadi",
    district: "Jalgaon",
    block: "Raver",
    latitude: 21.2452,
    longitude: 75.9412,
    population: 2300,
    screenedCount: 1620,
    highRiskCount: 54,
    activeAlerts: 2,
    nearestFacilityId: 7,
    nearestFacilityName: "Bhavadi Primary Health Centre (PHC)",
    status: "good",
  },
];

/**
 * Calculates geodesic distance between two latitude/longitude points (in km)
 * using the Haversine formula with rural road tortuosity adjustment.
 */
export function calculateGeodesicDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directDistance = R * c;
  // Apply rural road tortuosity adjustment factor (1.18x)
  return Math.round(directDistance * 1.18 * 10) / 10;
}

/**
 * Calculates distance from origin village to facility
 */
export function getDistanceToFacility(facility: FacilityMetadata, originVillage?: string): number {
  const villageKey = originVillage || "Karanji Budruk";
  if (facility.distanceFromBaseKm[villageKey] !== undefined) {
    return facility.distanceFromBaseKm[villageKey];
  }
  const matchingVillage = CONFIG_VILLAGES.find(
    (v) => v.name.toLowerCase() === villageKey.toLowerCase() || v.id.toLowerCase() === villageKey.toLowerCase()
  );
  if (matchingVillage && facility.latitude && facility.longitude) {
    return calculateGeodesicDistanceKm(matchingVillage.latitude, matchingVillage.longitude, facility.latitude, facility.longitude);
  }
  // Default base fallback
  return facility.distanceFromBaseKm["Karanji Budruk"] || facility.distanceFromBaseKm["Sundarpur"] || 15.0;
}

/**
 * Scores distance proximity (25 max points)
 */
function scoreDistance(distanceKm: number): number {
  if (distanceKm <= 5) return 25;
  if (distanceKm <= 10) return 23;
  if (distanceKm <= 18) return 20; // 18 km -> 20 pts
  if (distanceKm <= 25) return 16;
  if (distanceKm <= 35) return 12;
  if (distanceKm <= 50) return 8;
  return 4;
}

/**
 * Evaluates and ranks facilities for patient referral with transparent scoring
 */
export function rankFacilitiesForReferral(input: ReferralRecommendationInput): FacilityRecommendation[] {
  const origin = input.originVillage || "Sundarpur";
  const urgency = input.urgency || "urgent";
  const reqSpecialty = input.specialty;
  const reqCapabilities = input.requiredCapabilities || [];

  const recommendations: FacilityRecommendation[] = SMART_FACILITIES_REGISTRY.map((fac) => {
    const distanceKm = getDistanceToFacility(fac, origin);

    // 1. Specialty Match (Max 30 pts)
    let specialtyMatchScore = 0;
    let specialtyStatus: "Available" | "On-Duty" | "On-Call" | "Unavailable" = "Unavailable";
    const hasSpecialty = isSpecialtyMatching(reqSpecialty, fac.specialties);

    if (hasSpecialty) {
      specialtyMatchScore = 30;
      specialtyStatus = "Available";
    } else if (fac.facilityType === "district_hospital" || fac.facilityType === "chc") {
      specialtyMatchScore = 18; // Comprehensive care backup
      specialtyStatus = "On-Call";
    } else {
      specialtyMatchScore = 6;
      specialtyStatus = "Unavailable";
    }

    // 2. Distance Proximity (Max 25 pts)
    const distanceScore = scoreDistance(distanceKm);

    // 3. Doctor Availability (Max 15 pts)
    let doctorScore = 0;
    let doctorStatus: "Available" | "On-Duty" | "Shift Coverage" | "Unavailable" = "Unavailable";

    const relevantDoctors = fac.doctorAvailability.filter((d) =>
      reqSpecialty ? isSpecialtyMatching(reqSpecialty, [d.specialty]) : true
    );
    const activeDoctor = relevantDoctors.find((d) => d.status === "Available" || d.status === "On-Duty") || fac.doctorAvailability[0];

    if (activeDoctor) {
      if (activeDoctor.status === "Available") {
        doctorScore = 15;
        doctorStatus = "Available";
      } else if (activeDoctor.status === "On-Duty") {
        doctorScore = 13;
        doctorStatus = "On-Duty";
      } else if (activeDoctor.status === "On-Call") {
        doctorScore = 9;
        doctorStatus = "Shift Coverage";
      } else {
        doctorScore = 3;
        doctorStatus = "Unavailable";
      }
    } else {
      doctorScore = fac.doctorAvailability.length > 0 ? 10 : 2;
      doctorStatus = "Shift Coverage";
    }

    // 4. Emergency & Acuity Capability (Max 15 pts)
    let emergencyScore = 0;
    let emergencyStatus: "Yes (24/7 Emergency & Trauma)" | "Basic Stabilization" | "Daytime Only" | "No" = "No";

    if (fac.emergencyCapability.is24x7) {
      emergencyStatus = "Yes (24/7 Emergency & Trauma)";
      if (urgency === "emergency") {
        emergencyScore = fac.emergencyCapability.availableBeds > 0 ? 15 : 12;
      } else if (urgency === "urgent") {
        emergencyScore = 14;
      } else {
        emergencyScore = 12;
      }
    } else if (fac.emergencyCapability.traumaLevel === "Basic Stabilization") {
      emergencyStatus = "Basic Stabilization";
      if (urgency === "emergency") {
        emergencyScore = 5; // Penalty for lacking full 24/7 trauma
      } else {
        emergencyScore = 12;
      }
    } else {
      emergencyStatus = "Daytime Only";
      emergencyScore = urgency === "emergency" ? 0 : 8;
    }

    // 5. Equipment & Capabilities Match (Max 10 pts)
    let capabilitiesScore = 0;
    if (reqCapabilities.length === 0) {
      capabilitiesScore = fac.capabilities.length >= 8 ? 10 : fac.capabilities.length >= 5 ? 8 : 5;
    } else {
      const matched = reqCapabilities.filter((c) =>
        fac.capabilities.some((fc) => fc.toLowerCase().includes(c.toLowerCase()))
      );
      capabilitiesScore = Math.round((matched.length / reqCapabilities.length) * 10);
    }

    // 6. Appointment & Bed Availability (Max 5 pts)
    let appointmentScore = 0;
    const apptStatus = fac.appointmentAvailability.status;
    if (apptStatus === "Immediate Slots") appointmentScore = 5;
    else if (apptStatus === "Available Today") appointmentScore = 4;
    else if (apptStatus === "Next Day") appointmentScore = 2;
    else appointmentScore = 1;

    // Total Normalized Score (0 - 100)
    let totalScore =
      specialtyMatchScore +
      distanceScore +
      doctorScore +
      emergencyScore +
      capabilitiesScore +
      appointmentScore;

    totalScore = Math.min(100, Math.max(0, totalScore));

    const breakdown: RecommendationScoreBreakdown = {
      specialtyMatch: specialtyMatchScore,
      distance: distanceScore,
      doctorAvailability: doctorScore,
      emergencyCapability: emergencyScore,
      capabilitiesMatch: capabilitiesScore,
      appointmentAvailability: appointmentScore,
    };

    // Construct human-readable reasoning
    const emergencyTag = fac.emergencyCapability.is24x7 ? "Yes" : "Basic/No";
    const reasonParts: string[] = [];
    if (specialtyStatus === "Available") {
      reasonParts.push(`Specialty: Available`);
    }
    if (doctorStatus === "Available" || doctorStatus === "On-Duty") {
      reasonParts.push(`Doctor: Available`);
    }
    if (fac.emergencyCapability.is24x7) {
      reasonParts.push(`Emergency: Yes`);
    }
    reasonParts.push(`Distance: ${distanceKm} km`);

    return {
      facility: fac,
      distanceKm,
      specialtyAvailable: specialtyStatus === "Available",
      specialtyStatus,
      doctorAvailable: doctorStatus === "Available" || doctorStatus === "On-Duty",
      doctorStatus,
      emergencyCapable: fac.emergencyCapability.is24x7,
      emergencyStatus,
      appointmentAvailable: apptStatus === "Immediate Slots" || apptStatus === "Available Today",
      appointmentStatus: apptStatus,
      recommendationScore: totalScore,
      scoreBreakdown: breakdown,
      summaryHighlights: {
        facilityName: fac.name,
        distanceText: `${distanceKm} km`,
        specialtyText: specialtyStatus,
        doctorText: doctorStatus,
        emergencyText: emergencyTag,
        recommendationScoreText: `${totalScore}`,
      },
      recommendationReason: reasonParts.join(" | "),
      isSyntheticData: fac.telemetry.isSynthetic,
      telemetrySource: fac.telemetry.source,
      telemetryDisclaimer: fac.telemetry.disclaimer,
    };
  });

  // Sort descending by Recommendation Score
  return recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
}
