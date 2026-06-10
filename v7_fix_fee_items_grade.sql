-- ==============================================================================
-- 🚨 DATABASE FIX V7 (Missing 'grade' column in fee_items)
-- Execute this file in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Ensure `grade` column exists on `fee_items` so the registration trigger doesn't crash
ALTER TABLE fee_items ADD COLUMN IF NOT EXISTS "grade" TEXT DEFAULT 'All';

-- 2. Ensure `title`, `description`, and `academic_year` columns exist on `fee_invoices` (just in case)
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'General Tuition Fee';
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE fee_invoices ALTER COLUMN academic_year DROP NOT NULL;
ALTER TABLE fee_invoices ALTER COLUMN title DROP NOT NULL;
