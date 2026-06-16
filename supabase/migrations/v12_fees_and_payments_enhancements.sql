-- ==============================================================================
-- DATABASE ENHANCEMENT V12 (Fees & Payments Transactions, Views, Triggers, & RPCs)
-- Execute this file in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Add balance_due column to fee_invoices if it doesn't exist
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS balance_due NUMERIC;

-- 2. Populate balance_due for existing records
UPDATE fee_invoices SET balance_due = amount WHERE balance_due IS NULL AND status <> 'paid' AND status <> 'void';
UPDATE fee_invoices SET balance_due = 0 WHERE balance_due IS NULL AND (status = 'paid' OR status = 'void');

-- 3. Drop old trigger and functions to avoid conflicts
DROP TRIGGER IF EXISTS trigger_sync_ledger ON fee_invoices;
DROP FUNCTION IF EXISTS update_student_balance_on_payment();

-- 4. Create new advanced ledger sync function
CREATE OR REPLACE FUNCTION sync_student_ledger_on_invoice_change()
RETURNS TRIGGER AS $$
DECLARE
  diff NUMERIC;
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- Ensure balance_due is set
    IF NEW.balance_due IS NULL THEN
      NEW.balance_due := NEW.amount;
    END IF;
    
    IF NEW.status <> 'void' THEN
      UPDATE students 
      SET total_due = COALESCE(total_due, 0) + NEW.balance_due
      WHERE id = NEW.student_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Ensure balance_due is set
    IF NEW.balance_due IS NULL THEN
      NEW.balance_due := NEW.amount;
    END IF;
    IF OLD.balance_due IS NULL THEN
      OLD.balance_due := OLD.amount;
    END IF;

    -- If the invoice is marked voided/void
    IF OLD.status <> 'void' AND NEW.status = 'void' THEN
      -- Subtract the remaining unpaid balance from total_due
      UPDATE students 
      SET total_due = GREATEST(0, COALESCE(total_due, 0) - OLD.balance_due)
      WHERE id = NEW.student_id;
      NEW.balance_due := 0;
      RETURN NEW;
    END IF;

    -- If status changes from void to pending/partially_paid/paid
    IF OLD.status = 'void' AND NEW.status <> 'void' THEN
      UPDATE students 
      SET total_due = COALESCE(total_due, 0) + NEW.balance_due
      WHERE id = NEW.student_id;
      RETURN NEW;
    END IF;

    -- Handle balance change for non-void invoices
    IF OLD.status <> 'void' AND NEW.status <> 'void' AND OLD.balance_due <> NEW.balance_due THEN
      diff := OLD.balance_due - NEW.balance_due;
      UPDATE students 
      SET total_paid = COALESCE(total_paid, 0) + diff,
          total_due = GREATEST(0, COALESCE(total_due, 0) - diff)
      WHERE id = NEW.student_id;
    END IF;

    -- Auto status update based on balance_due
    IF NEW.status <> 'void' THEN
      IF NEW.balance_due <= 0 THEN
        NEW.status := 'paid';
      ELSIF NEW.balance_due < NEW.amount THEN
        NEW.status := 'partially_paid';
      ELSE
        NEW.status := 'pending';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'void' THEN
      UPDATE students 
      SET total_due = GREATEST(0, COALESCE(total_due, 0) - COALESCE(OLD.balance_due, OLD.amount))
      WHERE id = OLD.student_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach ledger sync trigger
CREATE TRIGGER trigger_sync_ledger
  BEFORE INSERT OR UPDATE OR DELETE ON fee_invoices
  FOR EACH ROW
  EXECUTE FUNCTION sync_student_ledger_on_invoice_change();

-- 6. Create Database View for joined queries and search
CREATE OR REPLACE VIEW fee_invoices_view AS
SELECT 
  fi.*,
  s.grade AS student_grade,
  s.academic_year AS student_academic_year,
  u.name AS student_name
FROM fee_invoices fi
JOIN students s ON fi.student_id = s.id
JOIN users u ON s.user_id = u.id;

-- 7. Create Atomic Transaction RPC for payments
CREATE OR REPLACE FUNCTION record_fee_payment(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_reference_number TEXT,
  p_recorded_by UUID
) RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_payment RECORD;
  v_balance_due NUMERIC;
  v_new_balance_due NUMERIC;
BEGIN
  -- 1. Fetch invoice and lock row
  SELECT * INTO v_invoice FROM fee_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invoice not found');
  END IF;

  -- 2. Ensure balance_due is populated
  IF v_invoice.balance_due IS NULL THEN
    v_balance_due := v_invoice.amount;
  ELSE
    v_balance_due := v_invoice.balance_due;
  END IF;

  IF v_balance_due <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invoice is already fully paid');
  END IF;

  IF p_amount > v_balance_due THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment amount exceeds remaining balance due (' || v_balance_due || ')');
  END IF;

  -- 3. Calculate new balance
  v_new_balance_due := GREATEST(0, v_balance_due - p_amount);

  -- 4. Update invoice
  UPDATE fee_invoices
  SET 
    balance_due = v_new_balance_due,
    paid_at = CASE WHEN v_new_balance_due = 0 THEN NOW() ELSE paid_at END,
    payment_method = p_payment_method
  WHERE id = p_invoice_id
  RETURNING * INTO v_invoice;

  -- 5. Insert payment record
  INSERT INTO fee_payments (invoice_id, amount, payment_method, reference_number, recorded_by, payment_date)
  VALUES (p_invoice_id, p_amount, p_payment_method, p_reference_number, p_recorded_by, NOW())
  RETURNING * INTO v_payment;

  -- Return both as JSON
  RETURN jsonb_build_object(
    'success', true,
    'invoice', to_jsonb(v_invoice),
    'payment', to_jsonb(v_payment)
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Create database aggregation RPC for fee stats
CREATE OR REPLACE FUNCTION get_fee_stats(p_academic_year TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_collected NUMERIC := 0;
  v_pending NUMERIC := 0;
  v_overdue NUMERIC := 0;
BEGIN
  SELECT 
    COALESCE(SUM(fi.amount - COALESCE(fi.balance_due, fi.amount)), 0),
    COALESCE(SUM(CASE WHEN fi.status = 'pending' OR fi.status = 'partially_paid' THEN COALESCE(fi.balance_due, fi.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fi.status = 'overdue' THEN COALESCE(fi.balance_due, fi.amount) ELSE 0 END), 0)
  INTO v_collected, v_pending, v_overdue
  FROM fee_invoices fi
  LEFT JOIN students s ON fi.student_id = s.id
  WHERE (p_academic_year IS NULL OR s.academic_year = p_academic_year) AND fi.status <> 'void';

  RETURN jsonb_build_object(
    'collected', v_collected,
    'pending', v_pending,
    'overdue', v_overdue
  );
END;
$$ LANGUAGE plpgsql;
