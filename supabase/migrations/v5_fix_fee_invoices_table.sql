-- ==============================================================================
-- DATABASE FIX V5 (Missing Title Column for Invoices)
-- Execute this file in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Ensure the title column exists on fee_invoices
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'General Tuition Fee';

-- 2. Optional: Also ensure description exists, in case we need it 
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. If any invoices don't have a title, set a default
UPDATE fee_invoices SET title = 'General Tuition Fee' WHERE title IS NULL;
