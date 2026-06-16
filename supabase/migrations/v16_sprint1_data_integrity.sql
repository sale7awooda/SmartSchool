-- ==============================================================================
-- DATABASE MIGRATE V16 (Sprint 1 Data Integrity)
-- Execute this file in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Backfill academic_year on fee_invoices from student relation where it is NULL
UPDATE fee_invoices fi
SET academic_year = s.academic_year
FROM students s
WHERE fi.student_id = s.id AND fi.academic_year IS NULL;

-- 2. Create balance_due recompute trigger on fee_payments updates
CREATE OR REPLACE FUNCTION recompute_balance_due()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  -- Determine which invoice is affected
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Recompute balance_due based on original invoice amount minus sum of payments
  UPDATE fee_invoices
  SET balance_due = amount - COALESCE((
    SELECT SUM(amount) 
    FROM fee_payments 
    WHERE invoice_id = v_invoice_id
  ), 0)
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to fee_payments
DROP TRIGGER IF EXISTS trg_recompute_balance ON fee_payments;
CREATE TRIGGER trg_recompute_balance
AFTER INSERT OR UPDATE OR DELETE ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION recompute_balance_due();

-- 3. Add CHECK constraint to fee_invoices to prevent balance_due from going below 0
ALTER TABLE fee_invoices DROP CONSTRAINT IF EXISTS chk_balance_nonnegative;
ALTER TABLE fee_invoices ADD CONSTRAINT chk_balance_nonnegative CHECK (balance_due >= 0);
