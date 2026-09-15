# Arjuna (अर्जुन)

> **Universal Healthcare Coordination, Clinical Decision Support & Role-Aware District Health Stack**

Arjuna is an enterprise-grade, role-aware healthcare coordination platform built to bridge the gap between citizens, frontline health workers (ASHA / CHO), doctors, facility staff, and health administrators in India's public health ecosystem.

---

## 🌟 Key Architectural Pillars

### 1. 🌓 System-Wide Dark Mode & Modern Visual Design
- **Theme Selection Modes**: Supports **Light**, **Dark**, and **System/Auto** preference modes.
- **Persistence & Zero-Flicker**: Selected theme is stored in `localStorage` (`arjuna.theme`) and instantly applied to `<html>` root with native `color-scheme` support.
- **Accessible Color Palette**: Engineered with curated slate, emerald, amber, and indigo tokens adhering to WCAG AAA contrast standards for healthcare environments.
- **Instant Toggles**: Accessible directly from the top application header and the universal user profile dropdown across all workspaces.
- **Refined Micro-Interactions**: Features sleek custom scrollbars (`.sidebar-scroll`), subtle ambient glow backgrounds, and smooth transitions.

---

### 2. 🛡️ Role-Based Workspaces & Portals
Arjuna provides purpose-built, secure workspaces tailored to each stakeholder in the healthcare continuum:

| Role | Workspace Route | Key Capabilities |
|---|---|---|
| **Citizen / Patient** | `/dashboard/citizen` | ABHA-compatible digital health record, family member profiles, clinical visit history, active medication schedules, doctor appointment booking, nearby facility directory, and multilingual health assistant. |
| **ASHA / CHO Worker** | `/dashboard/asha_cho` | Household surveys, maternal and child tracking, NCD screening (hypertension, diabetes), home visit vital recordings, deterministic triage risk scoring, follow-up scheduling, and offline data entry. |
| **Doctor / Medical Officer** | `/dashboard/doctor` | OPD patient queues, clinical consultation notes, structured diagnoses, electronic prescriptions with dosage frequency, multi-factor smart specialist referrals, and emergency case escalation. |
| **Facility Staff / Pharmacist** | `/dashboard/facility_staff` | Medicine and consumables inventory, batch tracking, stock level monitoring, automatic low-stock warnings, and reorder threshold alerts. |
| **District Administrator** | `/dashboard/administrator` | District-wide epidemiology analytics, caseload metrics, high-risk distribution heatmaps, staff registration verification & approval queue, facility capacity tracking, and compliance audit trails. |

---

### 3. 🔐 User Registration, Verification & Account Lifecycle
Arjuna implements a comprehensive, secure onboarding lifecycle with strict role-governance:

```
[ Citizen Self-Registration ] ─────────► Status: APPROVED ────────► Immediate Workspace Access
                                                    
[ Staff Self-Registration ]   ─────────► Status: PENDING  ────────► /pending-approval
  (ASHA / CHO / Doctor / Staff)                  │
                                                 ▼
                                     [ Admin Verification Queue ]
                                        ├── Approve ──► Status: APPROVED ──► Full Role Access
                                        ├── Reject  ──► Status: REJECTED ──► /registration-rejected
                                        └── Suspend ──► Status: SUSPENDED ──► /account-suspended
```

- **Instant Citizen Access**: Citizens registering for personal health management are granted immediate access.
- **Staff Credential Verification**: Healthcare professionals and facility workers must submit their designated facility, district, and employee credentials for administrator review before accessing patient data.
- **Admin Verification Console**: Administrators review, approve, reject, or suspend staff accounts from the Administrator Dashboard with full audit logging.
- **Single Administrator Architecture**: To prevent unauthorized self-escalation, district administrators are provisioned exclusively via a secure CLI seeding script (`npm run seed:admin`).
- **Comprehensive Password Management**: Features dedicated flows for `/forgot-password`, `/reset-password`, and `/change-password`.

---

### 4. ⚡ Clinical Decision Support & Smart Referral Engine
- **Deterministic Emergency Safety Net**: Evaluates critical vital signs (Systolic/Diastolic BP, SpO2, pulse rate, temperature, blood glucose) against clinical red-flag rules before AI generation.
- **Explainable Clinical Risk Score (0–100)**: Calculates an interpretable risk index with explicit contributing factors (e.g., severe hypertension + diabetes + elderly age) and actionable clinical safety guidelines.
- **Multi-Factor Facility Recommendation Engine**:
  - Matches patient triage urgency with facility capability tiers (Ayushman Arogya Mandir, Sub-Centre, PHC, CHC, Sub-District Hospital, District Hospital).
  - Evaluates clinical specialty requirements (Cardiology, Obstetrics, Pediatrics, Orthopedics, Nephrology).
  - Inspects real-time equipment availability (ICU beds, Ventilators, Oxygen support, Dialysis, Ambulance).
  - Computes geographic distance (km) and estimated travel time for optimal transit routing.
- **Multilingual Guidance Assistant**: Conversational health guidance support available in English, Hindi (हिंदी), and Gujarati (ગુજરાતી).

---

### 5. 📶 Offline-First Synchronization Engine
- **IndexedDB Local Storage**: Automatically caches household records, patient registrations, health visits, vital checks, referrals, and follow-ups in the browser when operating in low-connectivity rural areas.
- **Live Connection Monitor**: Displays real-time `ONLINE`, `OFFLINE`, or `SYNCING` indicators in the universal header alongside a pending mutation counter.
- **Idempotent Background Replay**: Seamlessly replays queued mutations to the district backend upon reconnection with conflict resolution and toast notifications.

---

### 6. 🗺️ GIS Facility Mapping & Accessibility Matrix
- Interactive spatial map displaying healthcare facilities across rural and urban zones.
- Filters by facility level, emergency availability, operational hours, and contact details.
- Calculates transit accessibility metrics for underserved rural villages.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend UI** | React 19, TypeScript, Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Wouter Router, Framer Motion, Sonner |
| **Backend & APIs** | Node.js, Express, tRPC v11, TypeScript, Zod Schema Validation |
| **Database & Auth** | Supabase (PostgreSQL + Supabase Auth / JWT), Drizzle ORM |
| **Offline Storage** | IndexedDB, Custom Offline Synchronization Hook |
| **Testing & Tooling** | Vitest, TypeScript Compiler (`tsc`), Vite 7, tsx |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0 or higher
- **npm** or **pnpm**

### 2. Installation
```bash
git clone <repository-url>
cd Arjuna
npm install --legacy-peer-deps
```

### 3. Environment Configuration
Create a `.env` file in the project root:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here

# Supabase Configuration (Found in Project Settings -> API)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret_key
```

### 4. Database Setup & Migrations
Run the schema setup in your **Supabase Dashboard** &rarr; **SQL Editor**:

```sql
-- Profiles / Users (Comprehensive with Demographic & Credential Attributes)
CREATE TABLE IF NOT EXISTS public.profiles (
  id BIGSERIAL PRIMARY KEY,
  open_id TEXT UNIQUE NOT NULL,
  auth_id TEXT,
  name TEXT,
  email TEXT,
  login_method TEXT,
  role TEXT NOT NULL DEFAULT 'citizen',
  status TEXT NOT NULL DEFAULT 'APPROVED',
  phone TEXT,
  date_of_birth TEXT,
  age INT,
  gender TEXT,
  village TEXT,
  district TEXT,
  facility_id BIGINT,
  facility_name TEXT,
  designation TEXT,
  employee_id TEXT,
  registration_number TEXT,
  assigned_village TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  avatar_url TEXT,
  approval_requested_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  rejection_reason TEXT,
  last_signed_in TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: If you already have an existing profiles table, run supabase_profile_migration.sql to add missing columns!


-- Facilities
CREATE TABLE IF NOT EXISTS public.facilities (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  facility_type TEXT NOT NULL,
  district TEXT NOT NULL,
  village TEXT,
  address TEXT,
  phone TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  capabilities TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Households
CREATE TABLE IF NOT EXISTS public.households (
  id BIGSERIAL PRIMARY KEY,
  head_name TEXT NOT NULL,
  village TEXT NOT NULL,
  district TEXT NOT NULL,
  contact TEXT,
  assigned_worker_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patients
CREATE TABLE IF NOT EXISTS public.patients (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  household_id BIGINT,
  name TEXT NOT NULL,
  age INT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'undisclosed',
  contact TEXT,
  village TEXT,
  district TEXT NOT NULL,
  emergency_contact TEXT,
  blood_group TEXT,
  allergies TEXT,
  conditions TEXT,
  risk_score INT NOT NULL DEFAULT 0,
  risk_category TEXT NOT NULL DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Health Visits
CREATE TABLE IF NOT EXISTS public.health_visits (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL,
  recorded_by BIGINT NOT NULL,
  facility_id BIGINT,
  symptoms TEXT,
  notes TEXT,
  diagnosis TEXT,
  bp_systolic INT,
  bp_diastolic INT,
  spo2 INT,
  temperature NUMERIC(4,1),
  glucose INT,
  weight NUMERIC(5,1),
  triage_level TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL,
  created_by BIGINT NOT NULL,
  target_facility_id BIGINT,
  specialty TEXT,
  urgency TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Follow-ups
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL,
  assigned_to BIGINT NOT NULL,
  referral_id BIGINT,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Medicines / Inventory
CREATE TABLE IF NOT EXISTS public.medicines (
  id BIGSERIAL PRIMARY KEY,
  facility_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  current_stock INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 10,
  unit TEXT NOT NULL DEFAULT 'packs',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  patient_id BIGINT,
  referral_id BIGINT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Events
CREATE TABLE IF NOT EXISTS public.audit_events (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5. Provision the District Administrator
Run the admin seeding script to create or promote the primary administrator account:

```bash
npm run seed:admin
```

---

## 💻 Running the Application

### Development Mode
```bash
npm run dev
```

Visit **[http://localhost:3000/](http://localhost:3000/)** in your browser.

### Running Automated Verification Tests
```bash
# Run all unit and integration test suites
npm test

# Run TypeScript type safety verification
npm run check
```

### Production Build
```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
Arjuna/
├── client/                     # React 19 Frontend
│   ├── src/
│   │   ├── _core/              # Authentication hooks & core contexts
│   │   ├── components/         # WorkspaceLayout, ThemeToggle, ProfileDropdownMenu, UI Primitives
│   │   ├── contexts/           # ThemeContext (Light, Dark, System)
│   │   ├── hooks/              # useOfflineSync, useMobile
│   │   ├── lib/                # tRPC React client & Supabase client
│   │   ├── pages/              # Role Workspaces & Account Management Pages
│   │   │   ├── CitizenDashboard.tsx
│   │   │   ├── AshaChoDashboard.tsx
│   │   │   ├── DoctorDashboard.tsx
│   │   │   ├── FacilityStaffDashboard.tsx
│   │   │   ├── AdministratorDashboard.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   ├── ChangePasswordPage.tsx
│   │   │   └── FacilityMapPage.tsx
│   │   ├── App.tsx             # Application router & theme provider
│   │   ├── index.css           # Tokenized CSS design system (Tailwind v4)
│   │   └── main.tsx            # Client entrypoint
│   └── index.html              # HTML template
├── drizzle/                    # Drizzle schema definitions & migrations
├── server/                     # Express & tRPC Backend
│   ├── _core/                  # Express server, auth middleware, tRPC setup
│   ├── db.ts                   # Database interface
│   ├── routers.ts              # tRPC procedures & role-aware endpoints
│   ├── smartReferralEngine.ts  # Multi-factor facility recommendation logic
│   ├── supabase.ts             # Supabase admin client
│   └── supabaseDb.ts           # PostgreSQL query handlers
├── shared/                     # Shared TypeScript schemas & constants
├── seed_admin.ts               # Administrator provisioning script
└── README.md
```

---

## ⚠️ Clinical Safety Notice

Arjuna is an assistive clinical coordination and workflow decision support platform. It is **not a certified diagnostic medical device** and should never be used as a substitute for qualified clinical examination and medical judgment. In emergencies, immediately contact **108 Emergency Medical Services** or escort the patient to the nearest acute care hospital.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
