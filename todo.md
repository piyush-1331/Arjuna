# Project TODO

- [x] Create the healthcare domain schema for patients, households, visits, referrals, follow-ups, medicines, inventory, alerts, facilities, and audit events.
- [x] Extend user roles to preserve citizens, ASHA/CHO workers, doctors, facility staff, and administrators with role-aware permissions.
- [x] Add backend query and mutation helpers for dashboard metrics, records, referrals, follow-ups, inventory, alerts, and audit history.
- [x] Add deterministic triage and explainable risk-scoring decision-support services with emergency safety rules.
- [x] Add LLM-assisted plain-language triage summaries with explicit decision-support and non-diagnosis labelling.
- [x] Add automated in-app alert creation for high-risk cases, referrals, and overdue follow-ups.
- [x] Build the Scandinavian-inspired application shell with responsive navigation and role-aware dashboard views.
- [x] Build citizen and care-team patient/household record workflows.
- [x] Build structured health-visit documentation and clinical history views.
- [x] Build referral creation, tracking, status updates, and outcome recording.
- [x] Build follow-up task creation, due-date tracking, completion, and overdue visibility.
- [x] Build facility medicine inventory with low-stock indicators.
- [x] Build district and facility analytics for caseload, risk, referrals, follow-ups, and stock signals.
- [x] Add offline-ready local queue foundation for community health worker workflows.
- [x] Add tests for risk scoring, triage safety rules, role authorization, and core procedures.
- [x] Run type checks, tests, visual verification, and document implemented scope and known limitations.
- [x] Save the completed project checkpoint for delivery.

## History

- Initial project implementation requested from the Arjuna master brief.
- Requirements refined to emphasize role-aware community healthcare coordination, LLM decision support, alerts, and Scandinavian visual styling.

## Gap fixes

- [x] Implement true per-role access controls and distinct dashboard behavior for citizens, ASHA/CHO workers, doctors, facility staff, and administrators.
- [x] Add overdue follow-up detection that updates task state and creates in-app alerts.
- [x] Add frontend workflows for household records, patient creation, visit documentation, clinical history, referral creation/outcomes, and follow-up creation.
- [x] Implement an IndexedDB-backed offline queue with replay/sync behavior for community health worker actions.
- [x] Add tests for role authorization and core healthcare procedures.
- [x] Document implemented scope, safety boundaries, demo behavior, and known limitations.
- [x] Save a verified delivery checkpoint after the gap fixes.

## Final gap fixes

- [x] Implement distinct dashboard behavior and permissions for ASHA/CHO workers, doctors, facility staff, and administrators.
- [x] Add household management UI, clinical history/timeline view, and referral outcome entry UI.
- [x] Make offline replay invoke the corresponding patient, visit, referral, and follow-up mutations safely on reconnect.
- [x] Add substantive tRPC procedure tests for role authorization and core healthcare workflows.
- [x] Re-run verification and save the final delivery checkpoint.

## Checkpoint refinements

- [x] Align backend procedure authorization with role-specific patient, visit, referral, follow-up, inventory, and analytics permissions.
- [x] Make the UI visibly use role-specific dashboard focus and action sets for ASHA/CHO workers, doctors, facility staff, and administrators.
- [x] Refactor offline replay to reuse the same business logic and payload fidelity as online visit, referral, and follow-up flows.
- [x] Add successful-path tests for patient, household, visit, referral, follow-up, overdue, and offline replay workflows.
- [x] Re-run final verification and save the delivery checkpoint.

## Last verification corrections

- [x] Finish role-specific authorization across patient, referral, follow-up, household, inventory, and analytics list/detail procedures.
- [x] Refactor offline replay to share full online business logic, including risk/triage and full referral/visit payload fidelity.
- [x] Add missing success-path tests for household creation, visit creation, follow-up creation/completion, and overdue detection.
- [x] Call the final checkpoint operation and mark checkpoint items complete only after it succeeds.

## Checkpoint blockers

- [x] Restrict referral, follow-up, and household list/detail reads to the roles that need them.
- [x] Preserve full visit and referral payloads during offline replay, including notes, diagnosis, specialty, and target facility.
- [x] Save the delivery checkpoint, then mark checkpoint items complete.

## Bug fixes

- [x] Fix dark dashboard buttons that render as solid black without readable text or icons.
- [x] Re-run type checks, tests, visual verification, and save a checkpoint for the contrast fix.

- [x] Save a new checkpoint containing the button contrast fix.

## Separate dashboards and authentication

- [x] Add a visible login and registration experience with role selection and clear authentication states.
- [x] Create separate dashboard entry views for citizens, ASHA/CHO workers, doctors, facility staff, and administrators.
- [x] Add role-specific navigation, welcome content, metrics, and primary actions for each dashboard.
- [x] Preserve existing backend role authorization and healthcare workflows across the new dashboard routes.
- [x] Add tests, run visual verification, update documentation, and save a checkpoint for the separate dashboards/authentication update.

## Separate dashboard gap fixes

- [x] Implement distinct role-specific dashboard routes/pages for citizens, ASHA/CHO workers, doctors, facility staff, and administrators.
- [x] Add distinct role-specific navigation structures and action surfaces rather than only shared navigation with hidden buttons.
- [x] Persist the selected onboarding role through a backend-supported profile/onboarding procedure instead of only frontend state.
- [x] Save a new checkpoint after the separate dashboard and onboarding implementation, then mark verification complete.

## Route verification corrections

- [x] Add explicit dashboard page components and routes for each named role, not only one parameterized component.
- [x] Save a new checkpoint after the explicit role page refinement and onboarding flow are verified.

## Authentication bug fix

- [x] Reproduce and diagnose the reported registration/login error.
- [x] Fix the authentication, onboarding-role, and post-login dashboard routing flow.
- [x] Add or update authentication flow tests, verify visually, and save a corrected checkpoint.

## Authentication verification corrections

- [x] Add an authentication regression test covering pending onboarding role handling and post-login role-based redirect behavior.
- [x] Add clear user-facing guidance for the external secure OAuth handoff and distinguish it from local registration.
- [x] Document the Supabase email/password authentication handoff and save a corrected checkpoint.

## Supabase integration

- [x] Inspect current Supabase connector/project availability and the existing Manus-auth/MySQL data architecture.
- [x] Configure Supabase URL and public client key through project secrets without exposing service-role credentials in the browser.
- [x] Add Supabase email/password login, registration, sign-out, session refresh, and email-confirmation states.
- [x] Add Supabase profile/onboarding role persistence for citizens, ASHA/CHO workers, doctors, facility staff, and administrators with no self-escalation.
- [x] Decide and implement the healthcare data bridge or migration path to Supabase while preserving role authorization and existing workflows.
- [x] Add authentication and data-access tests and document required Supabase setup.

## Supabase hardening

- [ ] Align the live Supabase auth UI and remove or clearly isolate the unused legacy OAuth portal.
- [ ] Add explicit Supabase RLS policies for profiles and healthcare tables, preserving server-side role authorization.
- [ ] Add Supabase auth workflow tests for registration, confirmation handling, login, sign-out, and session reuse.
- [ ] Add Supabase-backed procedure/data tests covering healthcare reads and writes through the active bridge.
- [ ] Write concrete Supabase setup documentation covering project settings, secrets, Auth settings, migration, and RLS.
- [ ] Re-run security advisors, tests, visual verification, and save a new Supabase checkpoint.
