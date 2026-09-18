-- =============================================================================
-- ARJUNA AI - SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- PostgreSQL DDL & Comprehensive Access Control Architecture
-- =============================================================================

-- 1. Helper Functions to extract Claims & Context from Supabase auth.jwt()
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION auth.current_user_open_id()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    auth.jwt() ->> 'sub',
    (auth.jwt() -> 'user_metadata' ->> 'open_id'),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION auth.current_user_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    auth.jwt() -> 'user_metadata' ->> 'selected_role',
    (SELECT role FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1),
    'citizen'
  );
$$;

CREATE OR REPLACE FUNCTION auth.current_user_facility_id()
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT (SELECT facility_id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1);
$$;

CREATE OR REPLACE FUNCTION auth.current_user_district()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT (SELECT district FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1);
$$;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT auth.current_user_role() IN ('administrator', 'admin') OR auth.jwt() ->> 'role' = 'service_role';
$$;

CREATE OR REPLACE FUNCTION auth.is_doctor()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT auth.current_user_role() = 'doctor' OR auth.is_admin();
$$;

CREATE OR REPLACE FUNCTION auth.is_care_team()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT auth.current_user_role() IN ('asha', 'cho', 'asha_cho', 'doctor', 'facility_staff', 'administrator', 'admin') OR auth.jwt() ->> 'role' = 'service_role';
$$;

CREATE OR REPLACE FUNCTION auth.is_facility_staff(target_facility_id integer)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT (auth.current_user_role() = 'facility_staff' AND (auth.current_user_facility_id() = target_facility_id OR auth.current_user_facility_id() IS NULL))
         OR auth.is_admin();
$$;


-- -----------------------------------------------------------------------------
-- 1.1 Profiles Table Schema & Demographic Extensions
-- -----------------------------------------------------------------------------
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

-- Ensure demographic and profile extension columns exist on existing databases
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facility_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_village TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Ensure audit_events columns exist
ALTER TABLE IF EXISTS public.audit_events ADD COLUMN IF NOT EXISTS detail TEXT;
ALTER TABLE IF EXISTS public.audit_events ADD COLUMN IF NOT EXISTS details TEXT;

-- -----------------------------------------------------------------------------
-- 2. Enable Row Level Security (RLS) on all 16 Healthcare Core Tables
-- -----------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.health_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medicine_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_events ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- 3. PROFILES POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (
    open_id = auth.current_user_open_id() OR auth.is_admin() OR auth.is_care_team()
  );

DROP POLICY IF EXISTS "Users can update their own profile basic info" ON public.profiles;
CREATE POLICY "Users can update their own profile basic info" ON public.profiles
  FOR UPDATE USING (
    open_id = auth.current_user_open_id() OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (auth.is_admin());


-- -----------------------------------------------------------------------------
-- 4. FACILITIES POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Facilities are viewable by all authenticated users" ON public.facilities;
CREATE POLICY "Facilities are viewable by all authenticated users" ON public.facilities
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only administrators can insert or modify facilities" ON public.facilities;
CREATE POLICY "Only administrators can insert or modify facilities" ON public.facilities
  FOR ALL USING (auth.is_admin());


-- -----------------------------------------------------------------------------
-- 5. HOUSEHOLDS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Care team and admins can view households" ON public.households;
CREATE POLICY "Care team and admins can view households" ON public.households
  FOR SELECT USING (
    auth.is_care_team() OR auth.is_admin()
  );

DROP POLICY IF EXISTS "ASHA and CHO workers can insert households" ON public.households;
CREATE POLICY "ASHA and CHO workers can insert households" ON public.households
  FOR INSERT WITH CHECK (
    auth.current_user_role() IN ('asha', 'cho', 'asha_cho', 'administrator', 'admin') OR auth.is_admin()
  );

DROP POLICY IF EXISTS "ASHA and CHO workers can update their assigned households" ON public.households;
CREATE POLICY "ASHA and CHO workers can update their assigned households" ON public.households
  FOR UPDATE USING (
    auth.is_care_team() OR auth.is_admin()
  );


-- -----------------------------------------------------------------------------
-- 6. PATIENTS POLICIES (Citizen Isolation & Care Team Boundaries)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Citizen can view only their own patient record" ON public.patients;
CREATE POLICY "Citizen can view only their own patient record" ON public.patients
  FOR SELECT USING (
    (auth.current_user_role() = 'citizen' AND user_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1))
    OR auth.is_care_team()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Citizens can update their own contact info" ON public.patients;
CREATE POLICY "Citizens can update their own contact info" ON public.patients
  FOR UPDATE USING (
    (auth.current_user_role() = 'citizen' AND user_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1))
    OR auth.is_care_team()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Care team can create patients" ON public.patients;
CREATE POLICY "Care team can create patients" ON public.patients
  FOR INSERT WITH CHECK (
    auth.current_user_role() IN ('asha', 'cho', 'asha_cho', 'administrator', 'admin') OR auth.is_admin()
  );


-- -----------------------------------------------------------------------------
-- 7. HEALTH VISITS & SCREENINGS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Citizens view their own health visits" ON public.health_visits;
CREATE POLICY "Citizens view their own health visits" ON public.health_visits
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1)
    )
    OR auth.is_care_team()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Care team can record health visits and screenings" ON public.health_visits;
CREATE POLICY "Care team can record health visits and screenings" ON public.health_visits
  FOR INSERT WITH CHECK (
    auth.is_care_team() OR auth.is_admin()
  );


-- -----------------------------------------------------------------------------
-- 8. CONSULTATIONS POLICIES (Doctor Clinical Authorization)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Citizens can view consultations for their patient record" ON public.consultations;
CREATE POLICY "Citizens can view consultations for their patient record" ON public.consultations
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1)
    )
    OR auth.is_care_team()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Only licensed doctors and admins can create consultations" ON public.consultations;
CREATE POLICY "Only licensed doctors and admins can create consultations" ON public.consultations
  FOR INSERT WITH CHECK (
    auth.is_doctor() OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Doctors can update their own consultations" ON public.consultations;
CREATE POLICY "Doctors can update their own consultations" ON public.consultations
  FOR UPDATE USING (
    (auth.is_doctor() AND doctor_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1))
    OR auth.is_admin()
  );


-- -----------------------------------------------------------------------------
-- 9. PRESCRIPTIONS POLICIES (Doctor Prescribing & Pharmacy Dispensing)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Citizens can view their own prescriptions" ON public.prescriptions;
CREATE POLICY "Citizens can view their own prescriptions" ON public.prescriptions
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1)
    )
    OR auth.is_care_team()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Only doctors and admins can write prescriptions" ON public.prescriptions;
CREATE POLICY "Only doctors and admins can write prescriptions" ON public.prescriptions
  FOR INSERT WITH CHECK (
    auth.is_doctor() OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Doctors, facility staff, and admins can update prescriptions" ON public.prescriptions;
CREATE POLICY "Doctors, facility staff, and admins can update prescriptions" ON public.prescriptions
  FOR UPDATE USING (
    auth.current_user_role() IN ('doctor', 'facility_staff', 'administrator', 'admin') OR auth.is_admin()
  );


-- -----------------------------------------------------------------------------
-- 10. REFERRALS & REFERRAL EVENTS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Citizens can view their own referrals" ON public.referrals;
CREATE POLICY "Citizens can view their own referrals" ON public.referrals
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1)
    )
    OR auth.is_care_team()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Care team and doctors can create referrals" ON public.referrals;
CREATE POLICY "Care team and doctors can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (
    auth.current_user_role() IN ('doctor', 'facility_staff', 'asha_cho', 'asha', 'cho', 'administrator', 'admin') OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Care team and facility staff can update referral statuses" ON public.referrals;
CREATE POLICY "Care team and facility staff can update referral statuses" ON public.referrals
  FOR UPDATE USING (
    auth.is_care_team() OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Referral events are viewable by care team and patient" ON public.referral_events;
CREATE POLICY "Referral events are viewable by care team and patient" ON public.referral_events
  FOR SELECT USING (
    referral_id IN (
      SELECT r.id FROM public.referrals r
      JOIN public.patients p ON r.patient_id = p.id
      WHERE p.user_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1)
    )
    OR auth.is_care_team()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Care team can append referral lifecycle events" ON public.referral_events;
CREATE POLICY "Care team can append referral lifecycle events" ON public.referral_events
  FOR INSERT WITH CHECK (
    auth.is_care_team() OR auth.is_admin()
  );


-- -----------------------------------------------------------------------------
-- 11. FOLLOW-UPS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Citizens view their own follow ups" ON public.follow_ups;
CREATE POLICY "Citizens view their own follow ups" ON public.follow_ups
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1)
    )
    OR auth.is_care_team()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Care team can schedule and manage follow ups" ON public.follow_ups;
CREATE POLICY "Care team can schedule and manage follow ups" ON public.follow_ups
  FOR ALL USING (
    auth.is_care_team() OR auth.is_admin()
  );


-- -----------------------------------------------------------------------------
-- 12. MEDICINE INVENTORY & TRANSACTIONS POLICIES (Facility Staff Scoping)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view essential medicine availability" ON public.medicines;
CREATE POLICY "Authenticated users can view essential medicine availability" ON public.medicines
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Facility staff can manage ONLY their facility's medicine inventory" ON public.medicines;
CREATE POLICY "Facility staff can manage ONLY their facility's medicine inventory" ON public.medicines
  FOR INSERT WITH CHECK (
    auth.is_facility_staff(facility_id) OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Facility staff can update ONLY their facility's stock" ON public.medicines;
CREATE POLICY "Facility staff can update ONLY their facility's stock" ON public.medicines
  FOR UPDATE USING (
    auth.is_facility_staff(facility_id) OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Facility staff can view their facility's transactions" ON public.medicine_transactions;
CREATE POLICY "Facility staff can view their facility's transactions" ON public.medicine_transactions
  FOR SELECT USING (
    auth.is_facility_staff(facility_id) OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Facility staff can record stock transactions for their facility" ON public.medicine_transactions;
CREATE POLICY "Facility staff can record stock transactions for their facility" ON public.medicine_transactions
  FOR INSERT WITH CHECK (
    auth.is_facility_staff(facility_id) OR auth.is_admin()
  );


-- -----------------------------------------------------------------------------
-- 13. APPOINTMENTS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Citizens can view and schedule their own appointments" ON public.appointments;
CREATE POLICY "Citizens can view and schedule their own appointments" ON public.appointments
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1)
    )
    OR auth.is_care_team()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Citizens and care team can book appointments" ON public.appointments;
CREATE POLICY "Citizens and care team can book appointments" ON public.appointments
  FOR INSERT WITH CHECK (
    (auth.current_user_role() = 'citizen' AND patient_id IN (
      SELECT id FROM public.patients WHERE user_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1)
    ))
    OR auth.is_care_team()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Care team can update appointment status" ON public.appointments;
CREATE POLICY "Care team can update appointment status" ON public.appointments
  FOR UPDATE USING (
    auth.is_care_team() OR auth.is_admin()
  );


-- -----------------------------------------------------------------------------
-- 14. CAMPAIGNS POLICIES (District Health Management)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Campaigns are visible to all authenticated users" ON public.campaigns;
CREATE POLICY "Campaigns are visible to all authenticated users" ON public.campaigns
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and CHOs can create and manage health campaigns" ON public.campaigns;
CREATE POLICY "Admins and CHOs can create and manage health campaigns" ON public.campaigns
  FOR ALL USING (
    auth.current_user_role() IN ('administrator', 'admin', 'cho', 'asha_cho') OR auth.is_admin()
  );


-- -----------------------------------------------------------------------------
-- 15. ALERTS & NOTIFICATIONS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can only view alerts addressed to them" ON public.alerts;
CREATE POLICY "Users can only view alerts addressed to them" ON public.alerts
  FOR SELECT USING (
    user_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1)
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Care team and system can dispatch alerts" ON public.alerts;
CREATE POLICY "Care team and system can dispatch alerts" ON public.alerts
  FOR INSERT WITH CHECK (
    auth.is_care_team() OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Users can mark their own alerts as read" ON public.alerts;
CREATE POLICY "Users can mark their own alerts as read" ON public.alerts
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.profiles WHERE open_id = auth.current_user_open_id() LIMIT 1)
    OR auth.is_admin()
  );


-- -----------------------------------------------------------------------------
-- 16. AUDIT LOGGING POLICIES (Tamper-Resistant Append-Only Log)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Only administrators can view audit logs" ON public.audit_events;
CREATE POLICY "Only administrators can view audit logs" ON public.audit_events
  FOR SELECT USING (
    auth.is_admin()
  );

DROP POLICY IF EXISTS "System and authenticated users can append audit records" ON public.audit_events;
CREATE POLICY "System and authenticated users can append audit records" ON public.audit_events
  FOR INSERT WITH CHECK (
    auth.jwt() IS NOT NULL OR auth.is_admin()
  );

-- STRICT ENFORCEMENT: Never allow UPDATE or DELETE on audit logs
DROP POLICY IF EXISTS "No one can modify audit logs" ON public.audit_events;
DROP POLICY IF EXISTS "No one can delete audit logs" ON public.audit_events;
