-- ==============================================================================
-- 🚨 DATABASE FIX V8 (Drop NOT NULL on description)
-- Execute this file in your Supabase SQL Editor.
-- ==============================================================================

ALTER TABLE fee_invoices ALTER COLUMN description DROP NOT NULL;
