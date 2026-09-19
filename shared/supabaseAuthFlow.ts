import { validatePasswordStrength, PASSWORDS_MUST_MATCH_ERROR } from "./passwordPolicy";

export type UserRole = "citizen" | "asha" | "cho" | "doctor" | "facility_staff" | "admin" | "administrator" | "asha_cho";
export type AccountStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type HealthcareStaffRole = "asha" | "cho" | "doctor" | "facility_staff";
export const HEALTHCARE_STAFF_ROLES: HealthcareStaffRole[] = ["asha", "cho", "doctor", "facility_staff"];

export interface CitizenRegistrationInput {
  mode: "citizen_register";
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phone?: string;
  dateOfBirth?: string;
  age?: number | string;
  gender?: string;
  village?: string;
  district?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface StaffRegistrationInput {
  mode: "staff_register";
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role: HealthcareStaffRole;
  phone: string;
  district?: string;
  employeeId?: string;
  designation?: string;
  facilityId?: number;
  facilityName?: string;
  registrationNumber?: string;
  assignedVillage?: string;
}

export interface LoginInput {
  mode: "login";
  email: string;
  password: string;
}

export type AuthValidationInput = CitizenRegistrationInput | StaffRegistrationInput | LoginInput | {
  mode: "login" | "register";
  email: string;
  password: string;
  fullName?: string;
  name?: string;
  confirmPassword?: string;
  phone?: string;
};

export function validateStaffRegistrationInputs(input: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role: HealthcareStaffRole | string;
  phone?: string;
  facilityName?: string;
  designation?: string;
  registrationNumber?: string;
  employeeId?: string;
  district?: string;
  assignedVillage?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.fullName?.trim()) {
    errors.push("Full name is required.");
  }
  if (!input.email || !input.email.includes("@")) {
    errors.push("A valid official or personal email address is required.");
  }
  if (input.confirmPassword !== undefined && input.password !== input.confirmPassword) {
    errors.push(PASSWORDS_MUST_MATCH_ERROR);
  }

  const pwdRes = validatePasswordStrength(input.password || "");
  if (!pwdRes.isValid) {
    errors.push(...pwdRes.errors);
  }

  if (!HEALTHCARE_STAFF_ROLES.includes(input.role as HealthcareStaffRole)) {
    errors.push("Please select a valid healthcare role (ASHA, CHO, Doctor, or Facility Staff).");
  }

  if (!input.facilityName?.trim()) {
    errors.push("Facility Name or Primary Health Centre is required for healthcare staff.");
  }

  if (!input.district?.trim()) {
    errors.push("District selection is compulsory.");
  }

  if (!input.assignedVillage?.trim() && !input.facilityName?.trim()) {
    errors.push("City or village selection is compulsory.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateSupabaseCredentials(input: AuthValidationInput): string | null {
  if (!input.email || !input.email.includes("@")) {
    return "Enter a valid email address.";
  }

  if (input.mode === "login") {
    if (!input.password) return "Enter your password.";
    if (input.password.length < 8) return "Password must contain at least 8 characters.";
    return null;
  }

  // Registration validations
  const fullName = "fullName" in input ? input.fullName : "name" in input ? input.name : undefined;
  if (!fullName?.trim()) {
    return "Enter your full name.";
  }

  if ("confirmPassword" in input && input.confirmPassword !== undefined) {
    if (input.password !== input.confirmPassword) {
      return PASSWORDS_MUST_MATCH_ERROR;
    }
  }

  const passwordStrength = validatePasswordStrength(input.password);
  if (!passwordStrength.isValid) {
    return passwordStrength.errors[0] || "Password does not meet the security policy requirements.";
  }

  if (input.mode === "staff_register") {
    if (!HEALTHCARE_STAFF_ROLES.includes(input.role)) {
      return "Select a valid healthcare staff role.";
    }
    if (!input.phone?.trim()) {
      return "Mobile number is required for healthcare staff registration.";
    }
    if (!input.district?.trim()) {
      return "District selection is compulsory for healthcare staff registration.";
    }
    if (!input.assignedVillage?.trim()) {
      return "City or village selection is compulsory for healthcare staff registration.";
    }
    if (input.role === "doctor" && !input.registrationNumber?.trim()) {
      return "Doctor registration number is required.";
    }
  }

  return null;
}

export function normalizeRegistrationRole(role: string): UserRole {
  const sanitized = role.toLowerCase().trim();
  if (HEALTHCARE_STAFF_ROLES.includes(sanitized as HealthcareStaffRole)) {
    return sanitized as HealthcareStaffRole;
  }
  return "citizen";
}

export function buildSupabaseSignUpOptions(
  fullNameOrMetadata: string | Record<string, unknown>,
  roleOrAdditional?: string | Record<string, unknown>,
  additionalMetadata?: Record<string, unknown>
): { data: { full_name?: string; selected_role?: UserRole; status?: AccountStatus; [key: string]: any } } {
  if (typeof fullNameOrMetadata === "string") {
    const role = typeof roleOrAdditional === "string" ? roleOrAdditional : "citizen";
    const extra = typeof roleOrAdditional === "object" ? roleOrAdditional : (additionalMetadata || {});
    const normalizedRole = normalizeRegistrationRole(role);
    const isStaff = HEALTHCARE_STAFF_ROLES.includes(normalizedRole as HealthcareStaffRole);
    return {
      data: {
        full_name: fullNameOrMetadata.trim(),
        selected_role: normalizedRole,
        status: isStaff ? "PENDING" : "APPROVED",
        ...extra,
      },
    };
  }

  const role = (fullNameOrMetadata as any).selected_role || (fullNameOrMetadata as any).role || "citizen";
  const normalizedRole = normalizeRegistrationRole(role);
  const isStaff = HEALTHCARE_STAFF_ROLES.includes(normalizedRole as HealthcareStaffRole);
  const initialStatus = (fullNameOrMetadata as any).status || (isStaff ? "PENDING" : "APPROVED");

  return {
    data: {
      status: initialStatus,
      ...fullNameOrMetadata,
    },
  };
}

export function getSupabaseSignUpMessage(hasSession: boolean, role: string = "citizen") {
  if (role !== "citizen") {
    return "Healthcare staff registration submitted. Your account is PENDING administrator approval.";
  }
  return hasSession
    ? "Citizen account created successfully. Opening your workspace."
    : "Account created. Check your email to confirm, then log in.";
}
