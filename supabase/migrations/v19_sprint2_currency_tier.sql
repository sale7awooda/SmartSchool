-- ==============================================================================
-- DATABASE MIGRATE V19 (Sprint 2 - Currency & Settings config)
-- Add configurable currency and subscription tier to schools
-- ==============================================================================

ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Move System Settings out of system_settings table into schools? Or just add fields to schools
-- Actually we can keep system_settings for global instance stuff if needed, but per-school settings are better in schools table or a dedicated school_settings table.
