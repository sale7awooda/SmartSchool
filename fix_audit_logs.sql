-- SQL Fixes for the Supabase Database to resolve 404 and 400 errors

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissive_all" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 2. Rename 'invoices' to 'fee_invoices' if it exists, or create 'fee_invoices'
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
    ALTER TABLE invoices RENAME TO fee_invoices;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS fee_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist (in case we renamed an older invoices table)
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE fee_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permissive_all" ON fee_invoices;
CREATE POLICY "permissive_all" ON fee_invoices FOR ALL USING (true) WITH CHECK (true);

-- 3. Create fee_payments table
CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES fee_invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  recorded_by UUID REFERENCES users(id),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permissive_all" ON fee_payments;
CREATE POLICY "permissive_all" ON fee_payments FOR ALL USING (true) WITH CHECK (true);

-- 4. Initial System Settings Row
-- This stops the 406 Not Acceptable error loops if the table is empty
INSERT INTO system_settings (id, school_name, email)
SELECT 1, 'Smart School', 'info@smartschool.edu'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE id = 1);
