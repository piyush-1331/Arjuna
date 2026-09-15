import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

export const userRoles = ["citizen", "asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

export const accountStatuses = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  authId: varchar("authId", { length: 64 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["citizen", "asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"]).default("citizen").notNull(),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).default("APPROVED").notNull(),
  phone: varchar("phone", { length: 40 }),
  dateOfBirth: varchar("dateOfBirth", { length: 30 }),
  age: int("age"),
  gender: varchar("gender", { length: 30 }),
  village: varchar("village", { length: 120 }),
  district: varchar("district", { length: 120 }),
  facilityId: int("facilityId"),
  facilityName: varchar("facilityName", { length: 180 }),
  designation: varchar("designation", { length: 120 }),
  employeeId: varchar("employeeId", { length: 100 }),
  registrationNumber: varchar("registrationNumber", { length: 100 }),
  assignedVillage: varchar("assignedVillage", { length: 120 }),
  emergencyContactName: varchar("emergencyContactName", { length: 180 }),
  emergencyContactPhone: varchar("emergencyContactPhone", { length: 40 }),
  bloodGroup: varchar("bloodGroup", { length: 20 }),
  allergies: text("allergies"),
  conditions: text("conditions"),
  address: text("address"),
  pincode: varchar("pincode", { length: 20 }),
  abhaId: varchar("abhaId", { length: 64 }),
  avatarUrl: text("avatarUrl"),
  approvalRequestedAt: timestamp("approvalRequestedAt"),
  approvedAt: timestamp("approvedAt"),
  approvedBy: varchar("approvedBy", { length: 64 }),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const facilities = mysqlTable("facilities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  facilityType: mysqlEnum("facilityType", ["aam", "sub_centre", "phc", "chc", "district_hospital", "specialist"]).notNull(),
  district: varchar("district", { length: 120 }).notNull(),
  village: varchar("village", { length: 120 }),
  address: text("address"),
  phone: varchar("phone", { length: 40 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  capabilities: text("capabilities"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const households = mysqlTable("households", {
  id: int("id").autoincrement().primaryKey(),
  headName: varchar("headName", { length: 180 }).notNull(),
  village: varchar("village", { length: 120 }).notNull(),
  district: varchar("district", { length: 120 }).notNull(),
  contact: varchar("contact", { length: 40 }),
  assignedWorkerId: int("assignedWorkerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  householdId: int("householdId"),
  name: varchar("name", { length: 180 }).notNull(),
  age: int("age").notNull(),
  gender: mysqlEnum("gender", ["female", "male", "other", "undisclosed"]).default("undisclosed").notNull(),
  contact: varchar("contact", { length: 40 }),
  village: varchar("village", { length: 120 }),
  district: varchar("district", { length: 120 }).notNull(),
  emergencyContact: varchar("emergencyContact", { length: 120 }),
  bloodGroup: varchar("bloodGroup", { length: 8 }),
  allergies: text("allergies"),
  conditions: text("conditions"),
  riskScore: int("riskScore").default(0).notNull(),
  riskCategory: mysqlEnum("riskCategory", ["low", "moderate", "high", "critical"]).default("low").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const healthVisits = mysqlTable("healthVisits", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  recordedBy: int("recordedBy").notNull(),
  facilityId: int("facilityId"),
  symptoms: text("symptoms"),
  structuredSymptoms: text("structuredSymptoms"),
  notes: text("notes"),
  diagnosis: text("diagnosis"),
  bpSystolic: int("bpSystolic"),
  bpDiastolic: int("bpDiastolic"),
  pulse: int("pulse"),
  spo2: int("spo2"),
  temperature: decimal("temperature", { precision: 4, scale: 1 }),
  glucose: int("glucose"),
  weight: decimal("weight", { precision: 5, scale: 1 }),
  height: decimal("height", { precision: 5, scale: 1 }),
  bmi: decimal("bmi", { precision: 4, scale: 1 }),
  pregnancyStatus: varchar("pregnancyStatus", { length: 64 }),
  existingConditions: text("existingConditions"),
  triageLevel: mysqlEnum("triageLevel", ["emergency", "urgent", "routine", "self_care"]),
  riskScore: int("riskScore"),
  riskCategory: mysqlEnum("riskCategory", ["normal", "attention", "high_risk", "emergency", "low", "moderate", "high", "critical"]),
  recommendedAction: text("recommendedAction"),
  aiSummary: text("aiSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  createdBy: int("createdBy").notNull(),
  targetFacilityId: int("targetFacilityId"),
  specialty: varchar("specialty", { length: 120 }),
  urgency: mysqlEnum("urgency", ["emergency", "urgent", "routine"]).notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 64 }).default("PENDING").notNull(),
  recommendationScore: int("recommendationScore"),
  scoreBreakdown: text("scoreBreakdown"),
  distanceKm: decimal("distanceKm", { precision: 5, scale: 1 }),
  transportVehicle: varchar("transportVehicle", { length: 120 }),
  transportDriverContact: varchar("transportDriverContact", { length: 40 }),
  outcome: text("outcome"),
  cancellationReason: text("cancellationReason"),
  acceptedAt: timestamp("acceptedAt"),
  transportAssignedAt: timestamp("transportAssignedAt"),
  departedAt: timestamp("departedAt"),
  arrivedAt: timestamp("arrivedAt"),
  consultedAt: timestamp("consultedAt"),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const referralEvents = mysqlTable("referralEvents", {
  id: int("id").autoincrement().primaryKey(),
  referralId: int("referralId").notNull(),
  status: varchar("status", { length: 64 }).notNull(),
  actorId: int("actorId"),
  actorRole: varchar("actorRole", { length: 64 }),
  actorName: varchar("actorName", { length: 180 }),
  notes: text("notes"),
  transportVehicle: varchar("transportVehicle", { length: 120 }),
  transportDriverContact: varchar("transportDriverContact", { length: 40 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const followUps = mysqlTable("followUps", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  assignedTo: int("assignedTo").notNull(),
  referralId: int("referralId"),
  title: varchar("title", { length: 180 }).notNull(),
  reason: varchar("reason", { length: 255 }),
  dueAt: timestamp("dueAt").notNull(),
  status: mysqlEnum("status", ["OPEN", "DUE_SOON", "OVERDUE", "COMPLETED", "CANCELLED", "open", "completed", "overdue"]).default("OPEN").notNull(),
  notes: text("notes"),
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy"),
  completionNotes: text("completionNotes"),
  cancelledAt: timestamp("cancelledAt"),
  cancellationReason: text("cancellationReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const medicines = mysqlTable("medicines", {
  id: int("id").autoincrement().primaryKey(),
  facilityId: int("facilityId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  category: varchar("category", { length: 100 }),
  currentStock: int("currentStock").default(0).notNull(),
  reorderLevel: int("reorderLevel").default(10).notNull(),
  unit: varchar("unit", { length: 40 }).default("packs").notNull(),
  batchNumber: varchar("batchNumber", { length: 80 }),
  expiryDate: timestamp("expiryDate"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const medicineTransactions = mysqlTable("medicineTransactions", {
  id: int("id").autoincrement().primaryKey(),
  medicineId: int("medicineId").notNull(),
  facilityId: int("facilityId").notNull(),
  transactionType: mysqlEnum("transactionType", ["STOCK_RECEIVED", "DISPENSED", "STOCK_ADJUSTMENT", "RETURN", "INITIAL_STOCK"]).notNull(),
  quantity: int("quantity").notNull(),
  previousStock: int("previousStock").notNull(),
  newStock: int("newStock").notNull(),
  actorId: int("actorId"),
  actorRole: varchar("actorRole", { length: 64 }),
  actorName: varchar("actorName", { length: 180 }),
  patientId: int("patientId"),
  prescriptionId: int("prescriptionId"),
  batchNumber: varchar("batchNumber", { length: 80 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const prescriptions = mysqlTable("prescriptions", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId"),
  facilityId: int("facilityId"),
  consultationId: int("consultationId"),
  prescriptionGroupId: varchar("prescriptionGroupId", { length: 64 }),
  medicineName: varchar("medicineName", { length: 180 }).notNull(),
  dosage: varchar("dosage", { length: 80 }).notNull(),
  frequency: varchar("frequency", { length: 80 }).default("1-0-1").notNull(),
  duration: varchar("duration", { length: 80 }).default("14 days").notNull(),
  route: varchar("route", { length: 80 }).default("Oral").notNull(),
  instructions: text("instructions"),
  status: mysqlEnum("status", ["active", "completed", "discontinued", "dispensed"]).default("active").notNull(),
  dispensedAt: timestamp("dispensedAt"),
  dispensedBy: int("dispensedBy"),
  startDate: timestamp("startDate").defaultNow().notNull(),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId"),
  facilityId: int("facilityId"),
  scheduledAt: timestamp("scheduledAt").notNull(),
  type: mysqlEnum("type", ["general_opd", "ncd_followup", "anc_checkup", "teleconsultation", "specialist"]).default("general_opd").notNull(),
  status: mysqlEnum("status", ["scheduled", "in_consultation", "completed", "cancelled"]).default("scheduled").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  category: mysqlEnum("category", ["immunization", "ncd_screening", "maternal_health", "anemia_eradication", "sanitation", "eye_care"]).notNull(),
  district: varchar("district", { length: 120 }).notNull(),
  village: varchar("village", { length: 120 }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  targetBeneficiaries: int("targetBeneficiaries").default(100).notNull(),
  screenedCount: int("screenedCount").default(0).notNull(),
  highRiskDetected: int("highRiskDetected").default(0).notNull(),
  status: mysqlEnum("status", ["planned", "active", "completed"]).default("active").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  patientId: int("patientId"),
  referralId: int("referralId"),
  kind: mysqlEnum("kind", ["high_risk", "referral", "overdue_follow_up", "low_stock", "system", "follow_up"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId"),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: int("entityId"),
  detail: text("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const consultations = mysqlTable("consultations", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId").notNull(),
  facilityId: int("facilityId"),
  appointmentId: int("appointmentId"),
  clinicalAssessment: text("clinicalAssessment"),
  diagnosis: text("diagnosis").notNull(),
  notes: text("notes"),
  treatmentPlan: text("treatmentPlan"),
  recommendedTests: text("recommendedTests"),
  followUpPlan: text("followUpPlan"),
  followUpDueAt: timestamp("followUpDueAt"),
  aiSummaryUsed: text("aiSummaryUsed"),
  bpSystolic: int("bpSystolic"),
  bpDiastolic: int("bpDiastolic"),
  pulse: int("pulse"),
  spo2: int("spo2"),
  temperature: decimal("temperature", { precision: 4, scale: 1 }),
  glucose: int("glucose"),
  weight: decimal("weight", { precision: 5, scale: 1 }),
  height: decimal("height", { precision: 5, scale: 1 }),
  bmi: decimal("bmi", { precision: 4, scale: 1 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type HealthVisit = typeof healthVisits.$inferSelect;
export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = typeof consultations.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type ReferralEvent = typeof referralEvents.$inferSelect;
export type FollowUp = typeof followUps.$inferSelect;
export type Medicine = typeof medicines.$inferSelect;
export type MedicineTransaction = typeof medicineTransactions.$inferSelect;
export type Prescription = typeof prescriptions.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;

