# 🏥 Arjuna (अर्जुन)
> **Universal Healthcare Coordination, Clinical Decision Support & Spatial District Health Stack**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-cyan.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![tRPC](https://img.shields.io/badge/tRPC-v11-2563eb.svg)](https://trpc.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Postgres-3ecf8e.svg)](https://supabase.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-c5f74f.svg)](https://orm.drizzle.team/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646cff.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 Table of Contents
1. [Project Overview & Importance](#-project-overview--importance)
2. [Key Architectural Innovations](#-key-architectural-innovations)
3. [Role-Based Workspaces & Permissions Matrix](#-role-based-workspaces--permissions-matrix)
4. [User Workflows & Capabilities ("What You Can & Cannot Do")](#-user-workflows--capabilities)
   - [1. Citizen / Patient](#1-citizen--patient)
   - [2. ASHA / CHO Frontline Health Worker](#2-asha--cho-frontline-health-worker)
   - [3. Doctor / Medical Officer](#3-doctor--medical-officer)
   - [4. Facility Staff / Pharmacist](#4-facility-staff--pharmacist)
   - [5. District Health Administrator](#5-district-health-administrator)
5. [Core System Engines & Modules](#-core-system-engines--modules)
   - [Deterministic Triage & Hybrid Risk Engine](#-deterministic-triage--hybrid-risk-engine)
   - [Multi-Factor Smart Referral Recommendation Engine](#-multi-factor-smart-referral-recommendation-engine)
   - [Offline-First Synchronization Architecture](#-offline-first-synchronization-architecture)
   - [Facility Medicine Inventory & Demand Forecasting](#-facility-medicine-inventory--demand-forecasting)
   - [Spatial District Health Map & Village Accessibility Index](#-spatial-district-health-map--village-accessibility-index)
   - [Multilingual Conversational Health Assistant](#-multilingual-conversational-health-assistant)
6. [Account Lifecycle, Verification & Security Architecture](#-account-lifecycle-verification--security-architecture)
7. [Technology Stack](#-technology-stack)
8. [Project Directory Structure](#-project-directory-structure)
9. [Getting Started (Local Development)](#-getting-started-local-development)
10. [Database Schema & Migration Setup](#-database-schema--migration-setup)
11. [Vercel & Production Deployment Guide](#-vercel--production-deployment-guide)
12. [Automated Testing & Verification](#-automated-testing--verification)
13. [Clinical Safety & Legal Disclaimer](#-clinical-safety--legal-disclaimer)

---

## 🌍 Project Overview & Importance

### Why Arjuna?
In India's public health ecosystem (spanning Ayushman Arogya Mandirs, Sub-Centres, PHCs, CHCs, Sub-District, and District Hospitals), healthcare delivery faces acute systemic friction:
- **Fragmented Patient Records**: Citizens often lack portable clinical histories, resulting in repeated diagnostics and delayed emergency care.
- **Frontline Disconnection**: ASHA (Accredited Social Health Activists) and CHO (Community Health Officers) conduct rigorous door-to-door screenings and maternal-child care in remote villages with unstable internet, relying on fragile paper registers.
- **Inappropriate Specialist Overload**: Higher-tier hospitals (CHCs, District Hospitals) are bottlenecked with non-urgent cases due to a lack of deterministic triage at the grassroots level.
- **Medicine Stockouts & Uneven Distribution**: Essential drug supplies run dry at rural health centres while surpluses expire in district warehouses due to lack of predictive demand modeling.
- **Administrative Blind Spots**: District health officers lack real-time epidemiological spatial intelligence and accessibility metrics for isolated rural hamlets.

**Arjuna (अर्जुन)** is an end-to-end, role-aware healthcare coordination and clinical decision-support ecosystem designed to solve these exact challenges. It unifies citizens, frontline workers, clinicians, pharmacists, and district administrators into a single high-reliability network.

---

## 🌟 Key Architectural Innovations

1. **Role-Aware Dual Security Layer**: Enforces strict role-based access control (RBAC) both at the UI layer and at the server procedure / database layer via Supabase Row-Level Security (RLS) and tRPC middleware.
2. **Deterministic Emergency Safety Net**: Clinical red-flags (severe chest pain, SpO2 < 90%, altered sensorium, critical hypertension) trigger hard-coded emergency protocols **before** any AI text summarization is rendered.
3. **0–100 Explainable Hybrid Risk Engine**: Computes transparent, auditable risk scores combining physiological vitals, chronic co-morbidities (hypertension, diabetes, cardiac conditions), and demographic risk factors with plain-language clinical explanations.
4. **Multi-Factor Smart Referral Recommendation Engine**: Evaluates patient acuity against facility capability tiers (Sub-Centre → DH), real-time specialty availability, ICU/ventilator capacity, geographic distance (km), and estimated travel time.
5. **Offline-First Synchronization Engine (IndexedDB)**: Allows frontline workers to record household surveys, patient visits, and screenings in zero-connectivity terrain, automatically replaying queued mutations with conflict resolution upon reconnection.
6. **Predictive Medicine Demand Forecasting**: Leverages historical utilization and disease prevalence trends to project 30-day facility stock requirements and issue automated reorder alerts.
7. **Spatial GIS District Health Intelligence**: Visualizes disease clustering, outbreak heatmaps, and a village transit vulnerability index based on road infrastructure and monsoon topography.
8. **Universal Accessible Scandinavian Design**: Sleek dark/light/system theme toggling with WCAG AAA compliant slate, emerald, amber, and indigo contrast tokens.

---

## 🛡️ Role-Based Workspaces & Permissions Matrix

| Functional Area | Citizen | ASHA / CHO | Doctor | Facility Staff | Administrator |
|---|:---:|:---:|:---:|:---:|:---:|
| **View Personal & Family Health Records** | ✅ Full | ❌ (Own Village Only) | ❌ (Consult Queue Only) | ❌ | ❌ |
| **Household Enumeration & Village Surveys** | ❌ | ✅ Full | ❌ | ❌ | 👁️ Read-Only |
| **Vitals Recording & NCD Screening** | ❌ | ✅ Full | ✅ Full | ❌ | 👁️ Read-Only |
| **Clinical Diagnosis & Notes** | ❌ | ❌ | ✅ Full | ❌ | 👁️ Read-Only |
| **Electronic Prescription Issuance** | ❌ | ❌ | ✅ Full | ❌ | 👁️ Read-Only |
| **Medicine Dispensing & Inventory Control** | ❌ | ❌ | ❌ | ✅ Full | 👁️ Read-Only |
| **Specialist Referral Generation** | ❌ | ⚠️ (Triage Referral) | ✅ Full (Clinical Referral) | ❌ | 👁️ Read-Only |
| **Follow-Up Directive Scheduling** | ❌ | ✅ Self / Assigned | ✅ Directive to ASHA | ❌ | 👁️ Read-Only |
| **Staff Registration Verification & RBAC** | ❌ | ❌ | ❌ | ❌ | ✅ Full |
| **District Epidemiology & Outbreak Heatmap** | ❌ | ❌ | 👁️ Facility Summary | 👁️ Facility Summary | ✅ Full |
| **Medicine Demand Forecasting** | ❌ | ❌ | ❌ | ✅ Facility Level | ✅ District Level |
| **Emergency Outbreak Escalation** | ❌ | ⚠️ Village Alert | ⚠️ Facility Alert | ❌ | ✅ District Command |

---

## 👥 User Workflows & Capabilities

---

### 1. Citizen / Patient
*Workspace Route: `/dashboard/citizen`*

#### 🎯 Primary Purpose:
Empowers individuals and families to take charge of their health, maintain lifetime longitudinal health records, book clinical appointments, and access trusted health guidance in their local language.

#### ✅ What a Citizen CAN Do:
- **Digital Health Profile**: View and update personal health details, ABHA ID, blood group, known allergies, chronic conditions, and emergency contact.
- **Family Member Health Records**: Manage linked household family profiles (children, elderly parents) from a unified dashboard.
- **Longitudinal Visit History**: Inspect past doctor consultation notes, vital trends, diagnosis summaries, and clinical triage outcomes.
- **Active Prescription & Medicine Tracker**: View current medications, prescribed dosages, frequency, and duration.
- **Doctor Appointment Booking**: Search available doctors across nearby public facilities and request consultation slots.
- **Nearby Healthcare Facility Directory**: Locate the nearest Ayushman Arogya Mandirs, PHCs, CHCs, and District Hospitals with contact details and operating hours.
- **Multilingual AI Health Assistant**: Ask health questions in English, Hindi (हिंदी), or Gujarati (ગુજરાતી) with clear non-diagnostic lifestyle and first-aid support.

#### ❌ What a Citizen CANNOT Do:
- Cannot modify clinical diagnoses, doctor consultation notes, or prescription records.
- Cannot view other citizens' medical records outside their linked household.
- Cannot self-authorize prescription refills without clinician sign-off.
- Cannot self-assign or escalate healthcare staff roles.

---

### 2. ASHA / CHO Frontline Health Worker
*Workspace Route: `/dashboard/asha_cho`*

#### 🎯 Primary Purpose:
Equips community health workers and mid-level health providers with digital tools for household survey enumeration, maternal-child tracking, NCD screening, deterministic risk triage, and home follow-ups—even when completely offline.

#### ✅ What an ASHA / CHO CAN Do:
- **Village Household Enumeration**: Register new households, record family heads, geolocate dwellings, and map family members.
- **Patient Registration & Vitals Check**: Register village residents and record core vitals (Systolic/Diastolic BP, SpO2, Heart Rate, Random Blood Glucose, Temperature, Weight).
- **NCD Community Screenings**: Perform standardized screening for Hypertension, Type-2 Diabetes, Oral/Cervical cancer risk flags, and ANC/PNC maternal checkups.
- **Automated Triage & Risk Indexing**: Receive instant deterministic clinical risk levels (Emergency, High, Medium, Low) with explicit danger-sign flags.
- **Initiate Facility Referrals**: Forward high-risk cases or complex symptoms directly to Primary or Community Health Centres with clinical notes.
- **Follow-Up Directive Execution**: View assigned home follow-up tasks, track due dates, record patient recovery status, and mark tasks complete.
- **Offline Data Entry & Sync**: Continue all data entry in remote villages without internet; sync queued records to the district server upon returning to mobile network coverage.

#### ❌ What an ASHA / CHO CANNOT Do:
- Cannot prescribe schedule-H prescription drugs or modify doctor-issued electronic prescriptions.
- Cannot sign off on official discharge summaries or formal diagnostic lab reports.
- Cannot view patient records assigned to other villages outside their designated catchment area.
- Cannot verify or approve other healthcare staff registrations.

---

### 3. Doctor / Medical Officer
*Workspace Route: `/dashboard/doctor`*

#### 🎯 Primary Purpose:
Provides clinical decision support, outpatient department (OPD) queue management, structured diagnostic documentation, electronic prescribing, and smart multi-factor specialist escalation.

#### ✅ What a Doctor CAN Do:
- **OPD Consultation Queue**: View incoming triage-prioritized patient queues with color-coded risk flags.
- **Comprehensive Patient Clinical Timeline**: Access past vitals history, ASHA screening notes, previous admissions, allergies, and chronic conditions before examining the patient.
- **Clinical Consultation Documentation**: Record structured examination findings, differential diagnoses, and consultation notes.
- **Electronic Prescription Authorizations**: Create structured digital prescriptions with drug name, dosage form, frequency (OD, BD, TDS), duration, and pharmacist dispensing instructions.
- **Multi-Factor Smart Specialist Referrals**: Escalate patients requiring higher-tier care with intelligent facility matching (based on specialty, ICU bed availability, and travel distance).
- **Follow-up Directives for ASHA Workers**: Schedule structured home follow-up tasks (e.g., "Check BP on Day 3 post-medication") automatically routed to the patient's village ASHA worker.

#### ❌ What a Doctor CANNOT Do:
- Cannot edit pharmacy stock levels directly (must be dispensed via pharmacy inventory).
- Cannot approve or reject staff onboarding applications (restricted to Administrator).
- Cannot access system configuration or audit log management consoles.

---

### 4. Facility Staff / Pharmacist
*Workspace Route: `/dashboard/facility_staff`*

#### 🎯 Primary Purpose:
Manages facility-level medicine inventories, monitors drug supply chains, dispenses electronic prescriptions, and tracks batch expiry and stockout risks.

#### ✅ What Facility Staff CAN Do:
- **Medicine & Consumables Stock Tracking**: Monitor real-time on-hand quantities across all essential drug categories (Antibiotics, Antihypertensives, Analgesics, IV Fluids, Vaccines).
- **Batch & Expiry Date Management**: Track batch numbers, manufacturing dates, and receive automated alerts for near-expiry medications.
- **Automated Low-Stock & Reorder Alerts**: Visual warning indicators triggered when stock drops below safety reorder thresholds.
- **Prescription Dispensing**: Verify doctor-issued electronic prescriptions and dispense medications with automatic inventory decrements.
- **Inter-Facility Stock Discovery**: Search nearby public health facilities to locate surplus stock during localized shortages.
- **Facility-Level Demand Forecasts**: Review 30-day projected medicine consumption rates to prepare procurement indents.

#### ❌ What Facility Staff CANNOT Do:
- Cannot alter medical diagnoses or modify doctor-prescribed drug regimens.
- Cannot perform clinical patient examinations or create referrals.
- Cannot access district-wide staff management or administrative consoles.

---

### 5. District Health Administrator
*Workspace Route: `/dashboard/administrator`*

#### 🎯 Primary Purpose:
Serves as the central command authority for district health management, staff credential verification, epidemiological surveillance, resource allocation, and regulatory compliance.

#### ✅ What an Administrator CAN Do:
- **Staff Credential Verification Console**: Review incoming ASHA, CHO, Doctor, and Facility Staff registrations; inspect employee IDs, professional registration numbers, assigned facilities, and grant **Approve**, **Reject**, or **Suspend** status.
- **District Health Intelligence Command Center**: Monitor real-time caseloads, disease incidence rates, active referrals, and high-risk case clusters across all talukas and villages.
- **Spatial Epidemiological Heatmap**: Identify disease outbreaks (e.g., Dengue, Malaria, Gastroenteritis clusters) and geographic risk distributions.
- **District-Wide Medicine Demand Modeling**: Inspect AI-assisted 30-day drug consumption forecasts across all PHCs and CHCs to prevent stockouts.
- **Village Accessibility & Vulnerability Matrix**: Analyze transit times, road quality, and monsoon-isolated villages to optimize mobile health van deployments.
- **Regulatory Audit Trail & Event Logging**: Audit all security, clinical, and data mutation events with timestamps, actor IDs, and IP attribution.

#### ❌ What an Administrator CANNOT Do:
- Cannot self-create additional administrator accounts from the frontend (restricted strictly to server-side CLI seeding).
- Cannot alter clinical consultation notes or overwrite patient vital signs directly.

---

## ⚙️ Core System Engines & Modules

### 🧠 Deterministic Triage & Hybrid Risk Engine
Arjuna decouples deterministic patient safety from generative language models:
```
[ Patient Vitals & Symptoms ]
            │
            ▼
┌──────────────────────────────────────────────┐
│       Deterministic Red-Flag Evaluator       │
│  - SpO2 < 90%?                               │
│  - Systolic BP > 180 or Diastolic > 120?     │
│  - Chest Pain / Altered Consciousness?       │
└──────────────────────┬───────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
   [ RED FLAG FOUND ]      [ NO RED FLAGS ]
          │                         │
          ▼                         ▼
  Emergency Protocol      Hybrid Statistical Model (0–100)
  - Hard Triage: RED      - Age & Physiological Weights
  - Immediate 108 Call    - Chronic Co-morbidity Matrix
  - Bypasses LLM          - Vital Deviation Penalties
                          - Optional LLM Plain-Text Advice
```

---

### 🚑 Multi-Factor Smart Referral Recommendation Engine
When a patient requires referral, Arjuna executes a multi-factor recommendation algorithm:
$$\text{Score}(F) = w_1 \cdot \text{SpecialtyMatch} + w_2 \cdot \text{TierAdequacy} + w_3 \cdot \text{BedAvailability} - w_4 \cdot \text{DistanceKm}$$

- **Specialty Alignment**: Confirms target facility has active departments (Cardiology, Obstetrics, Pediatrics, etc.).
- **Capability Tier**: Matches severity to appropriate tier (Sub-Centre $\rightarrow$ PHC $\rightarrow$ CHC $\rightarrow$ SDH $\rightarrow$ District Hospital).
- **Real-Time Resource Verification**: Evaluates oxygen beds, ICU beds, and ventilator status.
- **Transit Estimation**: Computes geodesic distance and estimated ambulance transit time.

---

### 📶 Offline-First Synchronization Architecture
Frontline healthcare workers often serve in disconnected tribal and rural areas:
- **Local Database**: IndexedDB stores household records, patient entries, vital checks, and follow-ups.
- **State Machine**: Displays real-time `ONLINE`, `OFFLINE`, or `SYNCING` badges with a pending mutation count.
- **Background Replay**: On network reconnect, queued actions are replayed in chronological order with idempotent server endpoints.

---

### 📦 Facility Medicine Inventory & Demand Forecasting
- **Dynamic Reorder Calculation**: $\text{ReorderLevel} = (\text{AvgDailyConsumption} \times \text{LeadTimeDays}) + \text{SafetyStock}$
- **Predictive Demand Modeling**: Leverages historical seasonal trends (e.g., monsoon spikes in ORS and antimalarials) to forecast 30-day facility medicine requirements.

---

### 🗺️ Spatial District Health Map & Village Accessibility Index
- **Interactive Leaflet GIS Map**: Displays geolocated facilities, active referrals, and disease clusters.
- **Village Vulnerability Rating**: Scores villages based on distance to nearest PHC (km), paved vs unpaved road access, and monsoon cutoff risk.

---

### 🌐 Multilingual Conversational Health Assistant
- **Supported Languages**: English, Hindi (हिंदी), Gujarati (ગુજરાતી).
- **Clinical Safety Boundaries**: Grounded exclusively in approved public health guidelines (NHM / WHO); strictly disclaims diagnostic authority and directs emergencies to local healthcare workers.

---

## 🔐 Account Lifecycle, Verification & Security Architecture

```
[ Citizen Sign-Up ] ────────► Status: APPROVED ────────► Immediate Dashboard Access
                                                     
[ Staff Sign-Up ]   ────────► Status: PENDING  ────────► /pending-approval (Access Blocked)
  (ASHA / Doctor / Staff)            │
                                     ▼
                        [ District Admin Review ]
                           ├── Approve ──► Status: APPROVED ──► Full Role Access
                           ├── Reject  ──► Status: REJECTED ──► /registration-rejected
                           └── Suspend ──► Status: SUSPENDED ──► /account-suspended
```

- **Single Admin Principle**: District administrators cannot be registered from the public web portal. They must be provisioned via the secure CLI tool (`npm run seed:admin`).
- **Data Protection**: Patient records are protected using Supabase Row-Level Security (RLS) policies.
- **Password Governance**: Complete self-service flows for `/forgot-password`, `/reset-password`, and `/change-password`.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | **React 19** + **TypeScript** | Ultra-responsive, type-safe user interface |
| **Styling & Design System** | **Tailwind CSS v4** + **Radix UI** | Tokenized dark/light/system theme, accessible UI primitives |
| **Routing** | **Wouter Router** | Lightweight, performant client-side routing |
| **Data Fetching & APIs** | **tRPC v11** + **TanStack Query v5** | End-to-end type-safe RPCs without REST boilerplate |
| **Backend Runtime** | **Node.js** + **Express** | API server & serverless handler |
| **Database & Auth** | **Supabase** (PostgreSQL + Auth JWT) | Relational database, RLS policies, and user authentication |
| **ORM & Schema** | **Drizzle ORM** | Type-safe SQL schema definitions & migrations |
| **Offline Storage** | **IndexedDB** | In-browser offline mutation queue for frontline workers |
| **Mapping & GIS** | **Leaflet** + **React-Leaflet** | Spatial district health maps and village location tracking |
| **Testing Suite** | **Vitest** (33 test suites, 276 tests) | Comprehensive unit, RBAC, and clinical procedure testing |
| **Bundler & Tooling** | **Vite 7** + **tsx** + **esbuild** | Sub-second dev reload and optimized production builds |

---

## 📁 Project Directory Structure

```
Arjuna/
├── api/                            # Vercel Serverless Function entrypoint
│   └── index.ts                    # Express app bridge for Vercel
├── client/                         # React 19 Frontend
│   ├── src/
│   │   ├── _core/                  # Core auth hooks & contexts
│   │   ├── components/             # Reusable UI components & modals
│   │   │   ├── ui/                 # Radix UI primitives (buttons, dialogs, cards)
│   │   │   ├── Map.tsx             # GIS Facility & Village Map
│   │   │   ├── ThemeToggle.tsx     # Light/Dark/System theme switcher
│   │   │   └── WorkspaceLayout.tsx # Universal responsive shell
│   │   ├── contexts/               # ThemeContext and state providers
│   │   ├── hooks/                  # useOfflineSync, useMobile, useTheme
│   │   ├── lib/                    # Supabase client & tRPC client configuration
│   │   ├── pages/                  # Explicit role pages & workflow views
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
│   │   ├── App.tsx                 # Route declarations & auth guards
│   │   ├── index.css               # Tailwind v4 tokenized styles & themes
│   │   └── main.tsx                # Client application bootstrap
│   └── index.html                  # HTML entry point
├── drizzle/                        # Drizzle ORM schema definitions
│   └── schema.ts                   # Core PostgreSQL table schemas
├── server/                         # Express & tRPC Backend
│   ├── _core/                      # Server bootstrap, CORS, rate-limiting, security headers
│   │   ├── app.ts                  # Express application setup
│   │   ├── env.ts                  # Environment variable schema
│   │   ├── index.ts                # Local HTTP dev server entrypoint
│   │   ├── sdk.ts                  # Auth & user synchronization service
│   │   ├── trpc.ts                 # tRPC context & procedure auth middlewares
│   │   └── vite.ts                 # Vite SSR / development integration
│   ├── clinicalTriageEngine.ts     # Deterministic clinical emergency rules
│   ├── db.ts                       # Drizzle ORM database client & helper queries
│   ├── demandForecastingService.ts # Predictive medicine inventory modeling
│   ├── districtCommandCenterService.ts # Real-time epidemiological surveillance
│   ├── districtHealthMapService.ts # GIS spatial aggregation & clustering
│   ├── hybridRiskEngine.ts         # 0-100 explainable clinical risk scoring
│   ├── notificationService.ts      # Multi-channel alerts (In-App, Email, SMS)
│   ├── routers.ts                  # All tRPC routers (auth, visits, referrals, etc.)
│   ├── seedAdmin.ts                # District administrator provisioning CLI
│   ├── smartReferralEngine.ts      # Multi-factor facility recommendation logic
│   ├── supabase.ts                 # Supabase server admin client
│   ├── supabaseDb.ts               # Direct PostgreSQL database queries
│   └── villageAccessibilityService.ts # Transit & isolation vulnerability index
├── shared/                         # Shared TypeScript types, schemas & constants
│   └── const.ts                    # Shared roles, status enums, and timeouts
├── drizzle.config.ts               # Drizzle Kit configuration
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript compiler configuration
├── vercel.json                     # Vercel deployment configuration & rewrites
└── vitest.config.ts                # Vitest test runner configuration
```

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- **Node.js**: v20.0 or higher
- **npm** or **pnpm**
- A **Supabase** account (Free tier works perfectly)

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/piyush-1331/Arjuna.git
cd Arjuna
npm install --legacy-peer-deps
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:

```env
# Server Port & Mode
PORT=3000
NODE_ENV=development

# JWT Secret for Session Verification (Use 32+ characters)
JWT_SECRET=arjuna-secret-demo-key-2026-sih-32chars

# Supabase PostgreSQL Connection String (From Supabase -> Settings -> Database)
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Supabase Client Configuration (Safe for Browser)
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Admin Configuration (Server-Side Only - NEVER expose to browser)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Seed Administrator Email (Promoted automatically during seeding)
ADMIN_EMAIL=admin@arjuna.health
```

---

## 🗄️ Database Schema & Migration Setup

Execute the schema setup in your **Supabase Dashboard** $\rightarrow$ **SQL Editor**:

```sql
-- 1. Profiles & Users
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
  blood_group TEXT,
  allergies TEXT,
  conditions TEXT,
  address TEXT,
  pincode TEXT,
  abha_id TEXT,
  avatar_url TEXT,
  approval_requested_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  rejection_reason TEXT,
  last_signed_in TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Healthcare Facilities
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

-- 3. Households
CREATE TABLE IF NOT EXISTS public.households (
  id BIGSERIAL PRIMARY KEY,
  head_name TEXT NOT NULL,
  village TEXT NOT NULL,
  district TEXT NOT NULL,
  contact TEXT,
  assigned_worker_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Patients
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

-- 5. Health Visits & Vitals
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

-- 6. Referrals
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

-- 7. Follow-Ups
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

-- 8. Facility Medicines & Inventory
CREATE TABLE IF NOT EXISTS public.medicines (
  id BIGSERIAL PRIMARY KEY,
  facility_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  current_stock INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 10,
  unit TEXT NOT NULL DEFAULT 'packs',
  batch_number TEXT,
  expiry_date TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. In-App Alerts
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

-- 10. Security & Compliance Audit Events
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

### 4. Seed the District Administrator
Create or promote your primary administrator account via the CLI:
```bash
npm run seed:admin
```

### 5. Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## ☁️ Vercel & Production Deployment Guide

Arjuna is pre-configured for zero-friction serverless deployment on **Vercel** with full client SPA routing and Express/tRPC API rewrites via [`vercel.json`](file:///c:/Users/Piyush/OneDrive/Documents/Arjuna/vercel.json) and [`api/index.ts`](file:///c:/Users/Piyush/OneDrive/Documents/Arjuna/api/index.ts).

### Step-by-Step Vercel Setup:
1. Push your repository to **GitHub**.
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"** $\rightarrow$ select your `Arjuna` repository.
3. In the **Configure Project** screen:
   - **Framework Preset**: `Vite` (or `Other`)
   - **Build Command**: `vite build`
   - **Output Directory**: `dist/public`
4. Under **Environment Variables**, click **`Import .env`** and paste your `.env` values, or manually add:
   - `DATABASE_URL` = `postgresql://postgres:...@db...`
   - `VITE_SUPABASE_URL` = `https://[project-ref].supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `eyJhbGciOi...`
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOi...`
   - `JWT_SECRET` = `your-32-char-jwt-secret`
   - `NODE_ENV` = `production`
5. Click **"Deploy"**. Vercel will bundle the React frontend and deploy the Express API backend as serverless functions.

---

## 🧪 Automated Testing & Verification

Arjuna includes a comprehensive test suite covering RBAC authorization, clinical triage rules, hybrid risk scoring, medicine demand forecasting, and offline synchronization.

```bash
# Run all 33 test suites (276 automated test cases)
npm test

# Run TypeScript type consistency verification
npm run check
```

---

## ⚠️ Clinical Safety & Legal Disclaimer

> **IMPORTANT MEDICAL NOTICE**:
> Arjuna is an assistive healthcare workflow, clinical coordination, and operational decision-support tool. It is **NOT** a certified diagnostic medical device, software as a medical device (SaMD), or a replacement for clinical examination by a qualified medical practitioner.
>
> - **AI-assisted summaries and risk scores** are advisory aids and must always be validated by qualified clinical staff.
> - **Emergency Situations**: In acute medical emergencies (severe chest pain, breathing arrest, massive hemorrhage, unconsciousness), immediately bypass digital entry and contact **108 Emergency Medical Services** or transfer the patient to the nearest emergency hospital.

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
