export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 4
  errors: string[];
}

export const PASSWORDS_MUST_MATCH_ERROR = "Passwords do not match.";

export const PASSWORD_REQUIREMENTS = [
  "At least 8 characters long",
  "At least one uppercase letter (A-Z)",
  "At least one lowercase letter (a-z)",
  "At least one number (0-9)",
  "At least one special character (@$!%*?&#^_-)",
];

const COMMON_PASSWORDS = new Set([
  "password123!",
  "password123",
  "admin12345!",
  "admin12345",
  "12345678aA!",
  "qwerty12345!",
  "letmein123!",
  "welcome123!",
]);

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number.");
  }
  if (!/[@$!%*?&#^_\-\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (@$!%*?&#^_-).");
  }

  if (password && COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push("Password is too common or easily guessed. Choose a stronger password.");
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[@$!%*?&#^_\-\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  if (password.length >= 12 && score === 4) score = 4;

  return {
    isValid: errors.length === 0,
    score,
    errors,
  };
}

export const validatePasswordPolicy = validatePasswordStrength;

export function evaluatePasswordStrength(password: string): {
  score: number;
  strength: "weak" | "fair" | "good" | "strong";
  label: string;
  color: string;
} {
  const result = validatePasswordStrength(password);
  let strength: "weak" | "fair" | "good" | "strong" = "weak";
  let label = "Weak";
  let color = "bg-rose-500 text-rose-700";

  switch (result.score) {
    case 0:
    case 1:
      strength = "weak";
      label = "Weak";
      color = "bg-rose-500 text-rose-700";
      break;
    case 2:
      strength = "fair";
      label = "Fair";
      color = "bg-amber-500 text-amber-700";
      break;
    case 3:
      strength = "good";
      label = "Good";
      color = "bg-blue-500 text-blue-700";
      break;
    case 4:
      strength = "strong";
      label = "Strong";
      color = "bg-emerald-500 text-emerald-700";
      break;
  }

  return {
    score: result.score,
    strength,
    label,
    color,
  };
}

export function getPasswordStrengthLabel(score: number): { label: string; color: string } {
  const evaluated = evaluatePasswordStrength("dummy");
  switch (score) {
    case 0:
    case 1:
      return { label: "Weak", color: "bg-red-500 text-red-700" };
    case 2:
      return { label: "Fair", color: "bg-amber-500 text-amber-700" };
    case 3:
      return { label: "Good", color: "bg-blue-500 text-blue-700" };
    case 4:
      return { label: "Strong", color: "bg-emerald-500 text-emerald-700" };
    default:
      return { label: "Weak", color: "bg-red-500 text-red-700" };
  }
}
