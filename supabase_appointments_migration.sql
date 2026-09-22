-- ==============================================================================
-- Arjuna Public Health Platform: Supabase Appointments & Clinical Tables Migration
-- Run this in your Supabase SQL Editor to enable persistent appointments storage.
-- ==============================================================================

-- 1. Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL,
  doctor_id BIGINT,
  facility_id BIGINT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'general_opd' CHECK (type IN ('general_opd', 'ncd_followup', 'anc_checkup', 'teleconsultation', 'specialist')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_consultation', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON public.appointments(scheduled_at);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 4. Open service-role and authenticated policies
CREATE POLICY "Allow all operations for service role and auth users on appointments"
  ON public.appointments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
