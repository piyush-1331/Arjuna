export interface WorkspacePersona {
  username: string;
  role: string;
  roleTitle: string;
  name: string;
  facility: string;
  village: string;
  district: string;
  route: string;
  badgeColor: string;
}

export const WORKSPACE_PERSONAS: WorkspacePersona[] = [
  {
    username: "asha.demo",
    role: "asha",
    roleTitle: "ASHA Worker",
    name: "Sunita More",
    facility: "Karanji Budruk HWC",
    village: "Karanji Budruk",
    district: "Nandurbar",
    route: "/dashboard/asha",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    username: "cho.demo",
    role: "cho",
    roleTitle: "Community Health Officer (CHO)",
    name: "Kavita Shinde",
    facility: "Karanji Budruk HWC",
    village: "Karanji Budruk",
    district: "Nandurbar",
    route: "/dashboard/cho",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    username: "doctor.demo",
    role: "doctor",
    roleTitle: "Medical Officer (MO)",
    name: "Dr. Amit Deshmukh",
    facility: "Nimbayat Primary Health Centre (PHC)",
    village: "Nimbayat",
    district: "Nandurbar",
    route: "/dashboard/doctor",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    username: "staff.demo",
    role: "facility_staff",
    roleTitle: "Pharmacist / Facility Staff",
    name: "Swapnil Patil",
    facility: "Nimbayat Primary Health Centre (PHC)",
    village: "Nimbayat",
    district: "Nandurbar",
    route: "/dashboard/facility_staff",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    username: "admin.demo",
    role: "administrator",
    roleTitle: "Chief District Health Officer (CDHO)",
    name: "Dr. Vijay Patil",
    facility: "Shirasgaon District Hospital",
    village: "Shirasgaon",
    district: "Nandurbar",
    route: "/dashboard/administrator",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    username: "citizen.demo",
    role: "citizen",
    roleTitle: "Citizen Beneficiary",
    name: "Meena Patel",
    facility: "Karanji Budruk HWC Catchment",
    village: "Karanji Budruk",
    district: "Nandurbar",
    route: "/dashboard/citizen",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
];

export const DEMO_PERSONAS = WORKSPACE_PERSONAS;
