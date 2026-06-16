-- Database Migrate v20 (Sprint 5: Report Card Improvements - Comments)
-- Add comments field to grades table

ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS comments TEXT;
