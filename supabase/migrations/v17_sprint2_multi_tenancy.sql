-- ==============================================================================
-- DATABASE MIGRATE V17 (Sprint 2 Multi-Tenancy)
-- Safe, idempotent execution for table column backfills, default constraints, and RLS.
-- Avoids: "cannot use column reference in DEFAULT expression" error in Postgres.
-- ==============================================================================

DO $$
DECLARE
  real_school_id UUID;
  tbl TEXT;
  tables_to_migrate TEXT[] := ARRAY[
    'users', 'academic_years', 'classes', 'subjects', 'students', 
    'parent_student', 'assessment_questions', 'assessments', 'attendance', 
    'behavior_records', 'broadcasts', 'bus_routes', 'bus_stops', 
    'fee_items', 'financials', 'inventory', 'fee_invoices', 'fee_payments', 
    'leave_requests', 'messages', 'notices', 'payslips', 'schedules', 
    'student_transport', 'submissions', 'system_settings', 'timeline_events', 
    'visitors', 'staff_attendance', 'grades', 'schedule_drafts', 'audit_logs'
  ];
BEGIN
  -- 1. Create schools table if not exists
  CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );

  -- Enable RLS on schools table
  ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

  -- 2. Ensure default school exists
  SELECT id INTO real_school_id FROM public.schools WHERE name = 'Smart School' OR subdomain = 'smartschool' LIMIT 1;
  IF real_school_id IS NULL THEN
    INSERT INTO public.schools (name, subdomain, email, address, phone) 
    VALUES ('Smart School', 'smartschool', 'info@smartschool.edu', '123 Education Lane, Learning City', '+1 (555) 012-3456') 
    RETURNING id INTO real_school_id;
  END IF;

  -- 3. Loop and add school_id with safety checks
  FOREACH tbl IN ARRAY tables_to_migrate LOOP
    -- check if table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- check if school_id column does not exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'school_id'
      ) THEN
        -- Add column (using dynamic SQL for table safety)
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL', tbl);
        
        -- Backfill existing rows with school ID
        EXECUTE format('UPDATE public.%I SET school_id = %L WHERE school_id IS NULL', tbl, real_school_id);
        
        -- Set literal default value for future rows (avoids 0A000 cannot use variable reference error)
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN school_id SET DEFAULT %L', tbl, real_school_id);
      END IF;
    END IF;
  END LOOP;
END $$;

-- 4. Create Security Definer Helper Functions to query school_id and role without recursion
CREATE OR REPLACE FUNCTION public.get_current_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 5. Establish RLS policies for the schools table
DROP POLICY IF EXISTS "schools_select_policy" ON public.schools;
CREATE POLICY "schools_select_policy" ON public.schools
  FOR SELECT TO authenticated
  USING (id = public.get_current_school_id());

DROP POLICY IF EXISTS "schools_admin_update_policy" ON public.schools;
CREATE POLICY "schools_admin_update_policy" ON public.schools
  FOR UPDATE TO authenticated
  USING (id = public.get_current_school_id() AND public.get_current_user_role() = 'admin')
  WITH CHECK (id = public.get_current_school_id() AND public.get_current_user_role() = 'admin');
