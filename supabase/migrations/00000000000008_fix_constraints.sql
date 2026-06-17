-- Fix academic_years unique constraint to be school-scoped
-- Old: UNIQUE (name) — blocks multi-tenant use
-- New: UNIQUE (name, school_id) — scoped per school
ALTER TABLE public.academic_years DROP CONSTRAINT IF EXISTS academic_years_name_key;
ALTER TABLE public.academic_years 
  ADD CONSTRAINT academic_years_name_school_key UNIQUE (name, school_id);

-- Add school_id to push_subscriptions if missing (needed for multi-tenant push)
ALTER TABLE public.push_subscriptions 
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
