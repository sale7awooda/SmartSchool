-- ==============================================================================
-- 🚨 HR MODULE FIELDS FIX
-- Execute this file in your Supabase SQL Editor to add the missing HR fields to the users table
-- ==============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_join DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_mark_attendance BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS extra_info TEXT;

-- Update getTeachers function to ensure it picks up teachers regardless of case
-- Wait, we can't easily change the HR roles from AddStaffModal yet

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
