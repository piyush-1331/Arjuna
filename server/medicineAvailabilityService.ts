import { getFacilities, getInventory, getMedicineById, getPrescriptions } from "./db";
import { SMART_FACILITIES_REGISTRY } from "./smartReferralEngine";

export type AvailabilityStatus = "AVAILABLE" | "LOW STOCK" | "UNAVAILABLE";
export type CitizenAvailabilityStatus = "Available" | "Low Stock" | "Unavailable";

export interface MedicineAvailabilityResult {
  medicineName: string;
  normalizedQuery: string;
  facilityId: number;
  facilityName: string;
  facilityType: string;
  village?: string;
  district: string;
  status: AvailabilityStatus;
  availabilityStatus: AvailabilityStatus;
  citizenStatus: CitizenAvailabilityStatus;
  isAvailable: boolean;
  matchedInventoryId?: number;
  matchedMedicineName?: string;
  currentStock?: number; // Only for care-team staff
  reorderLevel?: number; // Only for care-team staff
  unit?: string;
  citizenView: CitizenMedicineView;
  alternativeFacilitiesWithStock?: Array<{
    facilityId: number;
    facilityName: string;
    facilityType: string;
    village?: string;
    district: string;
    distanceKm?: number;
    phone?: string;
    status: AvailabilityStatus;
    availabilityStatus: AvailabilityStatus;
    citizenStatus: CitizenAvailabilityStatus;
    currentStock?: number;
    unit?: string;
  }>;
}

export interface FacilityMedicineSearchResult {
  facilityId: number;
  facilityName: string;
  facilityType: string;
  district: string;
  village?: string;
  address?: string;
  phone?: string;
  distanceKm?: number;
  medicineName: string;
  dosage?: string;
  category?: string;
  status: AvailabilityStatus;
  availabilityStatus: AvailabilityStatus;
  citizenStatus: CitizenAvailabilityStatus;
  isAvailable: boolean;
  // Private inventory information (ONLY included for authorized staff, stripped for citizen view)
  currentStock?: number;
  reorderLevel?: number;
  unit?: string;
  batchNumber?: string;
  expiryDate?: Date | string;
}

export interface CitizenMedicineView {
  medicineName: string;
  availability: CitizenAvailabilityStatus;
  facilityName: string;
  facilityType: string;
  village?: string;
  distanceKm?: number;
  phone?: string;
  address?: string;
  facilities?: CitizenMedicineView[];
}

/**
 * Normalizes medicine names for fuzzy/clean matching.
 * Strips dosages, form factors (tab, syrup, strip), and special characters.
 */
export function normalizeMedicineName(name: string): string {
  if (!name || typeof name !== "string") return "";
  return name
    .toLowerCase()
    .replace(/\b(tab|tablet|tablets|cap|capsule|capsules|syp|syrup|inj|injection|drops|inhaler|gel|ointment|solution|cream|sachet|sachets|suspension|powder|packet|sachets)\b/gi, "")
    .replace(/\b\d+(\.\d+)?\s*(mg|mcg|gm|g|ml|iu|%|meq|puffs)\b/gi, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Evaluates core 3-tier availability status:
 * - AVAILABLE: currentStock > reorderLevel (and > 0)
 * - LOW STOCK: 0 < currentStock <= reorderLevel
 * - UNAVAILABLE: currentStock <= 0
 */
export function calculateAvailabilityStatus(currentStock: number, reorderLevel: number = 10): AvailabilityStatus {
  const stock = Number(currentStock);
  const threshold = Number(reorderLevel);

  if (stock <= 0) {
    return "UNAVAILABLE";
  }
  if (stock <= threshold) {
    return "LOW STOCK";
  }
  return "AVAILABLE";
}

/**
 * Converts internal AvailabilityStatus to citizen-friendly string.
 */
export function toCitizenStatus(status: AvailabilityStatus): CitizenAvailabilityStatus {
  switch (status) {
    case "AVAILABLE":
      return "Available";
    case "LOW STOCK":
      return "Low Stock";
    case "UNAVAILABLE":
    default:
      return "Unavailable";
  }
}

/**
 * Helper to get clean display name for a facility.
 */
export function getCleanFacilityName(name?: string, id?: number): string {
  if (name) return name;
  const reg = SMART_FACILITIES_REGISTRY.find(f => f.id === id);
  if (reg) return reg.name;
  return `Facility #${id || 1}`;
}

/**
 * Checks if a specific medicine query matches an inventory item name.
 */
export function matchesMedicine(query: any, inventoryName: any): boolean {
  if (!query || !inventoryName) return false;
  const qRaw = typeof query === "string" ? query : String(query?.medicineName || query?.name || "");
  const invRaw = typeof inventoryName === "string" ? inventoryName : String(inventoryName?.name || "");

  if (!qRaw || !invRaw) return false;

  const qClean = qRaw.toLowerCase().replace(/[^a-z0-9]/g, "");
  const invClean = invRaw.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (qClean === invClean) return true;
  if (invClean.includes(qClean) || qClean.includes(invClean)) return true;

  const qNorm = normalizeMedicineName(qRaw);
  const invNorm = normalizeMedicineName(invRaw);

  if (qNorm && invNorm && (qNorm === invNorm || invNorm.includes(qNorm) || qNorm.includes(invNorm))) {
    return true;
  }

  // Token-level check (e.g., "Paracetamol" in "Paracetamol 500mg IP")
  const qTokens = qNorm.split(" ").filter((t) => t.length > 2);
  const invTokens = invNorm.split(" ").filter((t) => t.length > 2);
  if (qTokens.length > 0 && qTokens.some((tok) => invTokens.includes(tok))) {
    return true;
  }

  return false;
}

/**
 * Determines availability of a medicine at a target facility.
 * Supports both positional parameters and object options.
 */
export async function determineMedicineAvailability(
  facilityIdOrOptions: number | { facilityId: number; medicineName: string; userRole?: string },
  medicineNameArg?: string,
  userRoleArg: string = "citizen"
): Promise<MedicineAvailabilityResult> {
  let facilityId = 1;
  let medicineName = "Paracetamol";
  let userRole = userRoleArg;

  if (typeof facilityIdOrOptions === "object" && facilityIdOrOptions !== null) {
    facilityId = facilityIdOrOptions.facilityId;
    medicineName = facilityIdOrOptions.medicineName;
    userRole = facilityIdOrOptions.userRole ?? userRoleArg;
  } else {
    facilityId = Number(facilityIdOrOptions);
    medicineName = medicineNameArg || "Paracetamol";
    userRole = userRoleArg;
  }

  const allFacilities = await getFacilities();
  const rawTarget = allFacilities.find((f: any) => f.id === facilityId) || {
    id: facilityId,
    name: facilityId === 1 ? "Sundarpur PHC" : `Health Facility #${facilityId}`,
    facilityType: "phc",
    district: "Ahmedabad Rural",
    village: "Sundarpur",
    phone: "+91 98 2211 4400",
  };

  const cleanFacilityName = getCleanFacilityName(rawTarget.name, facilityId);

  const facilityInventory = await getInventory(facilityId);
  const matchedItem = facilityInventory.find((item: any) => matchesMedicine(medicineName, item.name));

  const isCareTeam = ["doctor", "facility_staff", "administrator", "admin", "asha", "cho", "asha_cho"].includes(userRole);

  let status: AvailabilityStatus = "UNAVAILABLE";
  let currentStock = 0;
  let reorderLevel = 10;
  let unit = "packs";
  let matchedInventoryId: number | undefined = undefined;
  let matchedMedicineName: string | undefined = undefined;

  if (matchedItem) {
    currentStock = Number(matchedItem.currentStock);
    reorderLevel = Number(matchedItem.reorderLevel ?? 10);
    unit = matchedItem.unit || "packs";
    matchedInventoryId = matchedItem.id;
    matchedMedicineName = matchedItem.name;
    status = calculateAvailabilityStatus(currentStock, reorderLevel);
  }

  const citizenStatus = toCitizenStatus(status);

  // If unavailable or low stock, search other facilities for alternative availability
  const alternativeFacilitiesWithStock: MedicineAvailabilityResult["alternativeFacilitiesWithStock"] = [];
  const allInventory = await getInventory();

  for (const fac of allFacilities) {
    if (fac.id === facilityId) continue;
    const facMeds = allInventory.filter((m: any) => m.facilityId === fac.id);
    const matchInOther = facMeds.find((m: any) => matchesMedicine(medicineName, m.name));

    if (matchInOther && Number(matchInOther.currentStock) > 0) {
      const otherStatus = calculateAvailabilityStatus(Number(matchInOther.currentStock), Number(matchInOther.reorderLevel ?? 10));
      const distance = getFacilityDistanceKm(fac.id, rawTarget.village || "Sundarpur");

      alternativeFacilitiesWithStock.push({
        facilityId: fac.id,
        facilityName: getCleanFacilityName(fac.name, fac.id),
        facilityType: fac.facilityType,
        village: fac.village,
        district: fac.district,
        distanceKm: distance,
        phone: fac.phone,
        status: otherStatus,
        availabilityStatus: otherStatus,
        citizenStatus: toCitizenStatus(otherStatus),
        currentStock: isCareTeam ? Number(matchInOther.currentStock) : undefined,
        unit: isCareTeam ? matchInOther.unit : undefined,
      });
    }
  }

  // Sort alternatives by distance
  alternativeFacilitiesWithStock.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));

  const citizenView: CitizenMedicineView = {
    medicineName,
    availability: citizenStatus,
    facilityName: cleanFacilityName,
    facilityType: rawTarget.facilityType,
    village: rawTarget.village,
    distanceKm: 0,
    phone: rawTarget.phone,
    address: rawTarget.address,
  };

  return {
    medicineName,
    normalizedQuery: normalizeMedicineName(medicineName),
    facilityId,
    facilityName: cleanFacilityName,
    facilityType: rawTarget.facilityType,
    village: rawTarget.village,
    district: rawTarget.district,
    status,
    availabilityStatus: status,
    citizenStatus,
    isAvailable: status === "AVAILABLE" || status === "LOW STOCK",
    matchedInventoryId,
    matchedMedicineName,
    currentStock: isCareTeam ? currentStock : undefined,
    reorderLevel: isCareTeam ? reorderLevel : undefined,
    unit: isCareTeam ? unit : undefined,
    citizenView,
    alternativeFacilitiesWithStock,
  };
}

/**
 * Checks a batch of medicines for a doctor prescribing or consultation desk.
 * Accepts array of string names or objects { medicineName: string }.
 */
export async function batchCheckMedicineAvailability(
  facilityId: number,
  medicineNames: Array<string | { medicineName: string; dosage?: string }>,
  userRole: string = "doctor"
): Promise<MedicineAvailabilityResult[]> {
  const results: MedicineAvailabilityResult[] = [];
  for (const item of medicineNames) {
    const name = typeof item === "string" ? item : item.medicineName;
    const res = await determineMedicineAvailability(facilityId, name, userRole);
    results.push(res);
  }
  return results;
}

/**
 * Searches across all health facilities for facilities stocking a given medicine.
 * Sanitizes output based on user role to strictly protect private inventory data.
 */
export async function searchFacilitiesForMedicine(options: {
  medicineName: string;
  originVillage?: string;
  district?: string;
  userRole?: string;
}): Promise<FacilityMedicineSearchResult[]> {
  const { medicineName, originVillage = "Sundarpur", district, userRole = "citizen" } = options;
  const isCareTeam = ["doctor", "facility_staff", "administrator", "admin", "asha", "cho", "asha_cho"].includes(userRole);

  const allFacilities = await getFacilities(district);
  const allInventory = await getInventory();

  const results: FacilityMedicineSearchResult[] = [];

  for (const facility of allFacilities) {
    const facilityMeds = allInventory.filter((m: any) => m.facilityId === facility.id);
    const matched = facilityMeds.find((m: any) => matchesMedicine(medicineName, m.name));

    const distanceKm = getFacilityDistanceKm(facility.id, originVillage);
    const cleanName = getCleanFacilityName(facility.name, facility.id);

    if (matched) {
      const stock = Number(matched.currentStock);
      const reorder = Number(matched.reorderLevel ?? 10);
      const status = calculateAvailabilityStatus(stock, reorder);

      results.push({
        facilityId: facility.id,
        facilityName: cleanName,
        facilityType: facility.facilityType,
        district: facility.district,
        village: facility.village,
        address: facility.address,
        phone: facility.phone,
        distanceKm,
        medicineName: matched.name,
        dosage: matched.dosage,
        category: matched.category,
        status,
        availabilityStatus: status,
        citizenStatus: toCitizenStatus(status),
        isAvailable: status === "AVAILABLE" || status === "LOW STOCK",
        // Strict privacy protection: only authorized care-team see internal stock numbers & batch details
        currentStock: isCareTeam ? stock : undefined,
        reorderLevel: isCareTeam ? reorder : undefined,
        unit: isCareTeam ? matched.unit : undefined,
        batchNumber: isCareTeam ? matched.batchNumber : undefined,
        expiryDate: isCareTeam ? matched.expiryDate : undefined,
      });
    } else {
      // Medicine not in facility inventory
      results.push({
        facilityId: facility.id,
        facilityName: cleanName,
        facilityType: facility.facilityType,
        district: facility.district,
        village: facility.village,
        address: facility.address,
        phone: facility.phone,
        distanceKm,
        medicineName,
        status: "UNAVAILABLE",
        availabilityStatus: "UNAVAILABLE",
        citizenStatus: "Unavailable",
        isAvailable: false,
        currentStock: isCareTeam ? 0 : undefined,
      });
    }
  }

  // Sort: In Stock (Available first, then Low Stock, then Unavailable) and by distance
  return results.sort((a, b) => {
    const scoreA = a.status === "AVAILABLE" ? 3 : a.status === "LOW STOCK" ? 2 : 1;
    const scoreB = b.status === "AVAILABLE" ? 3 : b.status === "LOW STOCK" ? 2 : 1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
  });
}

/**
 * Returns citizen-safe view for a medicine across facilities.
 * Supports both options object and positional arguments.
 */
export async function getCitizenMedicineView(
  medicineNameOrOptions: string | { facilityId?: number; medicineName: string; originVillage?: string },
  originVillageArg: string = "Sundarpur"
): Promise<CitizenMedicineView & CitizenMedicineView[]> {
  let medicineName = "Paracetamol";
  let originVillage = originVillageArg;
  let targetFacilityId: number | undefined = undefined;

  if (typeof medicineNameOrOptions === "object" && medicineNameOrOptions !== null) {
    medicineName = medicineNameOrOptions.medicineName;
    originVillage = medicineNameOrOptions.originVillage || originVillageArg;
    targetFacilityId = medicineNameOrOptions.facilityId;
  } else {
    medicineName = medicineNameOrOptions;
    originVillage = originVillageArg;
  }

  const searchResults = await searchFacilitiesForMedicine({
    medicineName,
    originVillage,
    userRole: "citizen",
  });

  const facilityList: CitizenMedicineView[] = searchResults.map((r) => ({
    medicineName: medicineName,
    availability: r.citizenStatus,
    facilityName: r.facilityName,
    facilityType: r.facilityType,
    village: r.village,
    distanceKm: r.distanceKm,
    phone: r.phone,
    address: r.address,
  }));

  const primary = targetFacilityId
    ? facilityList.find((f) => f.facilityName.includes(String(targetFacilityId))) || facilityList[0]
    : facilityList[0] || {
        medicineName,
        availability: "Unavailable" as const,
        facilityName: "Sundarpur PHC",
        facilityType: "phc",
        village: originVillage,
        distanceKm: 0,
        phone: "+91 98 2211 4400",
      };

  const hybridResult = [...facilityList] as any;
  hybridResult.medicineName = medicineName;
  hybridResult.availability = primary.availability;
  hybridResult.facilityName = primary.facilityName;
  hybridResult.facilityType = primary.facilityType;
  hybridResult.village = primary.village;
  hybridResult.distanceKm = primary.distanceKm;
  hybridResult.phone = primary.phone;
  hybridResult.address = primary.address;
  hybridResult.facilities = facilityList;

  return hybridResult;
}

/**
 * Helper to compute distance from smart facilities registry or fallbacks.
 */
function getFacilityDistanceKm(facilityId: number, village: string): number {
  const meta = SMART_FACILITIES_REGISTRY.find((f) => f.id === facilityId);
  if (meta && meta.distanceFromBaseKm && meta.distanceFromBaseKm[village] !== undefined) {
    return meta.distanceFromBaseKm[village];
  }
  if (facilityId === 1) return village === "Sundarpur" ? 0.5 : 6.0;
  if (facilityId === 2) return village === "Rampura" ? 0.2 : 6.2;
  if (facilityId === 3) return 14.5;
  if (facilityId === 4) return 19.8;
  if (facilityId === 5) return 28.0;
  return 15.0;
}
