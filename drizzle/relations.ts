import { relations } from "drizzle-orm";
import {
  alerts,
  auditEvents,
  facilities,
  followUps,
  healthVisits,
  households,
  medicines,
  patients,
  referrals,
  users,
} from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [users.facilityId],
    references: [facilities.id],
  }),
  assignedHouseholds: many(households),
  patients: many(patients),
  healthVisits: many(healthVisits),
  referrals: many(referrals),
  assignedFollowUps: many(followUps),
  alerts: many(alerts),
  auditEvents: many(auditEvents),
}));

export const facilitiesRelations = relations(facilities, ({ many }) => ({
  users: many(users),
  healthVisits: many(healthVisits),
  targetReferrals: many(referrals),
  medicines: many(medicines),
}));

export const householdsRelations = relations(households, ({ one, many }) => ({
  assignedWorker: one(users, {
    fields: [households.assignedWorkerId],
    references: [users.id],
  }),
  patients: many(patients),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  household: one(households, {
    fields: [patients.householdId],
    references: [households.id],
  }),
  healthVisits: many(healthVisits),
  referrals: many(referrals),
  followUps: many(followUps),
  alerts: many(alerts),
}));

export const healthVisitsRelations = relations(healthVisits, ({ one }) => ({
  patient: one(patients, {
    fields: [healthVisits.patientId],
    references: [patients.id],
  }),
  recorder: one(users, {
    fields: [healthVisits.recordedBy],
    references: [users.id],
  }),
  facility: one(facilities, {
    fields: [healthVisits.facilityId],
    references: [facilities.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one, many }) => ({
  patient: one(patients, {
    fields: [referrals.patientId],
    references: [patients.id],
  }),
  creator: one(users, {
    fields: [referrals.createdBy],
    references: [users.id],
  }),
  targetFacility: one(facilities, {
    fields: [referrals.targetFacilityId],
    references: [facilities.id],
  }),
  followUps: many(followUps),
  alerts: many(alerts),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
  patient: one(patients, {
    fields: [followUps.patientId],
    references: [patients.id],
  }),
  assignedUser: one(users, {
    fields: [followUps.assignedTo],
    references: [users.id],
  }),
  referral: one(referrals, {
    fields: [followUps.referralId],
    references: [referrals.id],
  }),
}));

export const medicinesRelations = relations(medicines, ({ one }) => ({
  facility: one(facilities, {
    fields: [medicines.facilityId],
    references: [facilities.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id],
  }),
  patient: one(patients, {
    fields: [alerts.patientId],
    references: [patients.id],
  }),
  referral: one(referrals, {
    fields: [alerts.referralId],
    references: [referrals.id],
  }),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  actor: one(users, {
    fields: [auditEvents.actorId],
    references: [users.id],
  }),
}));
