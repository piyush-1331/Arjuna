# Arjuna — Implementation Scope

Arjuna is a role-aware community healthcare coordination workspace for citizens, ASHA/CHO workers, doctors, facility staff, and administrators. The current implementation uses the scaffold’s React, TypeScript, tRPC, Express, Drizzle, and Manus authentication layers.

## Implemented workflows

| Area | Current behavior |
| --- | --- |
| Role-aware access | Preserves the named roles in the database. Dashboard focus and permissions differ for citizens, ASHA/CHO workers, doctors, facility staff, and administrators. Care-team mutations are restricted by role, while citizens receive read-oriented access to linked records. |
| Records | Stores households, patients, demographics, conditions, structured health visits, vitals, triage level, risk score, and audit events. The UI includes household creation, patient creation, and patient clinical timeline views. |
| Triage | Applies deterministic emergency rules before any language-model summary. Emergency indicators include severe breathing difficulty, chest pain, loss of consciousness, severe bleeding, stroke-like symptoms, seizure indicators, and critically low oxygen. |
| Risk flags | Produces a 0–100 explainable risk score with contributing factors and a recommended next step. It is explicitly labelled as decision support and not a diagnosis. |
| LLM summaries | Uses the server-side built-in LLM integration to turn structured inputs into plain-language summaries, urgency suggestions, and safety-net advice. The rule-based urgency is preserved as the safety boundary. |
| Referrals | Creates, lists, advances, and closes referrals, with an audit trail and in-app notification when a referral is created. |
| Follow-ups | Assigns, lists, completes, and marks overdue follow-ups. Overdue detection updates status and creates an in-app alert for the assigned care-team user. |
| Inventory | Tracks facility medicines, current stock, reorder thresholds, and low-stock signals. |
| Analytics | Shows caseload, high-risk count, open referrals, follow-up load, overdue work, facilities, and low-stock signals. |
| Offline foundation | Uses IndexedDB to queue patient, visit, referral, and follow-up create actions while offline and replays the supported mutations through the sync procedure after connectivity returns. |
| Interface | Uses a pale cool-gray canvas, bold black sans-serif typography, pastel-blue and blush-pink geometric accents, responsive layout, and explicit safety language. |

## Safety and privacy boundaries

The AI features are not diagnostic tools and must not be used as a substitute for clinical evaluation. The application displays this boundary near triage results and in the main workspace. Emergency rule matches tell the user to seek immediate professional medical help. Production deployment should add formal clinical governance, consent management, encryption and retention policies, verified notification delivery, monitoring, and a security review before handling real patient data.

## Demo behavior

The first authenticated dashboard load creates a small demonstration dataset when the patient table is empty. This is intended for local evaluation of the dashboard, risk distribution, and inventory views. A production environment should replace this with a controlled seed process and should never mix demonstration records with live clinical records.

## Known limitations

The current project provides a strong runnable foundation rather than a certified clinical information system. The UI focuses on the shared coordination workspace; deeper citizen, doctor, and district-specific views can be expanded from the role permissions and typed procedures already in place. Email delivery is represented by in-app alerts and requires a configured notification provider for real email transport. Offline replay invokes supported create mutations on reconnect. A production sync layer should add idempotency keys, conflict resolution, encryption at rest, and per-event authorization checks.


## Separate dashboards and authentication update

The frontend now opens with a dedicated login and registration portal. Registration captures the intended care role and routes the user into the secure Manus authentication flow; production identity and session management remain governed by Manus OAuth rather than local password storage. After authentication, the workspace shows a distinct role dashboard panel for citizens, ASHA/CHO workers, doctors, facility staff, and administrators, with role-specific focus text, metrics, and action summaries layered above the existing authorized care workflows.


The role dashboard experience is exposed through explicit page routes: `/dashboard/citizen`, `/dashboard/asha_cho`, `/dashboard/doctor`, `/dashboard/facility_staff`, and `/dashboard/administrator`. Each route has its own page component and role-specific navigation/action configuration, while shared care workflows remain available at `/workspace` under the authenticated user’s backend permissions.


Authentication note: the application’s Register tab collects the intended Arjuna role and stores it only as pending onboarding context. Account creation and sign-in are completed by the secure Manus OAuth portal. After the OAuth callback returns, the app persists the selected non-administrator role and routes to its dedicated dashboard. Administrator access cannot be self-granted from registration.


Supabase integration: the application now uses the connected Supabase project for email/password Auth, persisted browser sessions, profile onboarding, and the healthcare data tables. The server validates Supabase bearer tokens, uses the publishable key only in the browser, and uses the service-role key only on the server for protected tRPC data procedures. Registration collects a role but administrator access remains server-assigned. Email confirmation behavior follows the Supabase Auth project setting; when confirmation is enabled, users must confirm their email before signing in.


## Supabase setup

The application is connected to Supabase project `duytpzoobdqeguvnptti` in the `ap-southeast-1` region. The browser requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; the server additionally requires `SUPABASE_SERVICE_ROLE_KEY`, which must remain server-only and must never be placed in client code, browser storage, or source control.

Enable **Email** under Supabase Authentication providers. If email confirmation is enabled, registration returns a confirmation state and the user must confirm the address before logging in. The live application uses `SupabaseAuthPortal` for email/password registration, login, session refresh, and sign-out. Registration stores the selected non-administrator role in user metadata; the server normalizes unsupported roles to `citizen` and administrator access must be assigned by an authorized server-side administrator.

The migration `arjuna_healthcare_schema` creates `profiles`, `facilities`, `households`, `patients`, `health_visits`, `referrals`, `follow_ups`, `medicines`, `alerts`, and `audit_events`. The migration `arjuna_rls_policies` enables explicit RLS policies and moves the role lookup helper to the private schema. The application server uses the service-role Supabase client behind protected tRPC procedures, while the browser only holds the publishable key and Auth session.

For a production deployment, confirm the Supabase Auth redirect URLs include the deployed application origin, rotate the service-role key if it has ever been exposed, configure email templates and SMTP, and review role assignment/audit procedures with the clinical governance owner. The Supabase project starts with empty healthcare tables; existing legacy MySQL records are not automatically copied into Supabase by this integration.
