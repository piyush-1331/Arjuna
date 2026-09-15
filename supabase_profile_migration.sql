-- =============================================================================
-- ARJUNA AI - SUPABASE PROFILES TABLE SCHEMA MIGRATION
-- Run this script in your Supabase Dashboard -> SQL Editor
-- =============================================================================

-- 1. Ensure public.profiles table exists with base columns
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
  district TEXT,
  facility_id BIGINT,
  last_signed_in TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add Demographic & Personal Contact columns (Age, Gender, DOB, Village, Emergency Contacts, Health Attributes)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS conditions TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS abha_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Add Healthcare Professional & Staff Credentials columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facility_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_village TEXT;

-- 4. Add Administrative Approval & Audit columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 5. Force PostgREST schema cache reload so changes take effect immediately
NOTIFY pgrst, 'reload schema';

-- Verify table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
