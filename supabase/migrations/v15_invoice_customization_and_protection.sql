-- 1. Upgrade fee_invoices_view to LEFT JOIN
CREATE OR REPLACE VIEW fee_invoices_view AS
SELECT 
  fi.*,
  s.grade AS student_grade,
  s.academic_year AS student_academic_year,
  COALESCE(u.name, 'General / Unlinked') AS student_name
FROM fee_invoices fi
LEFT JOIN students s ON fi.student_id = s.id
LEFT JOIN users u ON s.user_id = u.id;

-- 2. Prevent payments on voided invoices in RPC
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

  -- 2. Reject payment if invoice is voided
  IF v_invoice.status = 'void' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot record payment on a voided invoice');
  END IF;

  -- 3. Ensure balance_due is populated
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

  -- 4. Calculate new balance
  v_new_balance_due := GREATEST(0, v_balance_due - p_amount);

  -- 5. Update invoice
  UPDATE fee_invoices
  SET 
    balance_due = v_new_balance_due,
    paid_at = CASE WHEN v_new_balance_due = 0 THEN NOW() ELSE paid_at END,
    payment_method = p_payment_method
  WHERE id = p_invoice_id
  RETURNING * INTO v_invoice;

  -- 6. Insert payment record
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
