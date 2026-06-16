-- Update get_fee_stats to return expanded financial KPIs
CREATE OR REPLACE FUNCTION get_fee_stats(p_academic_year TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_collected NUMERIC := 0;
  v_pending NUMERIC := 0;
  v_overdue NUMERIC := 0;
  v_collected_this_month NUMERIC := 0;
  v_due_this_month NUMERIC := 0;
BEGIN
  -- 1. General Totals
  SELECT 
    COALESCE(SUM(fi.amount - COALESCE(fi.balance_due, fi.amount)), 0),
    COALESCE(SUM(CASE WHEN fi.status = 'pending' OR fi.status = 'partially_paid' THEN COALESCE(fi.balance_due, fi.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fi.status = 'overdue' THEN COALESCE(fi.balance_due, fi.amount) ELSE 0 END), 0)
  INTO v_collected, v_pending, v_overdue
  FROM fee_invoices fi
  LEFT JOIN students s ON fi.student_id = s.id
  WHERE (p_academic_year IS NULL OR s.academic_year = p_academic_year) AND fi.status <> 'void';

  -- 2. Collected This Month (from payment logs)
  SELECT COALESCE(SUM(fp.amount), 0) INTO v_collected_this_month
  FROM fee_payments fp
  JOIN fee_invoices fi ON fp.invoice_id = fi.id
  LEFT JOIN students s ON fi.student_id = s.id
  WHERE (p_academic_year IS NULL OR s.academic_year = p_academic_year)
    AND fp.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND fp.payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

  -- 3. Due This Month (balance on unpaid invoices due this month)
  SELECT COALESCE(SUM(COALESCE(fi.balance_due, fi.amount)), 0) INTO v_due_this_month
  FROM fee_invoices fi
  LEFT JOIN students s ON fi.student_id = s.id
  WHERE (p_academic_year IS NULL OR s.academic_year = p_academic_year)
    AND fi.status <> 'void'
    AND fi.status <> 'paid'
    AND fi.due_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND fi.due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

  RETURN jsonb_build_object(
    'collected', v_collected,
    'pending', v_pending,
    'overdue', v_overdue,
    'collected_this_month', v_collected_this_month,
    'due_this_month', v_due_this_month
  );
END;
$$ LANGUAGE plpgsql;
