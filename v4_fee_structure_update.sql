-- ==============================================================================
-- STUDENT FINANCE AUTOMATION V4 (Custom Fees, No Proration, Flexible Terms)
-- Execute this file in your Supabase SQL Editor.
-- ==============================================================================

ALTER TABLE students ADD COLUMN IF NOT EXISTS base_fee_amount NUMERIC;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_structure VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_custom_fee BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION generate_advanced_student_bills()
RETURNS TRIGGER AS $$
DECLARE
  base_tuition NUMERIC;
  final_tuition NUMERIC;
  i INTEGER;
  num_installments INTEGER := 1;
BEGIN
  -- 1. Determine Base Tuition
  -- Uses the manually provided base_fee_amount if it exists. 
  -- Otherwise, fallbacks to 3000.
  base_tuition := COALESCE(NEW.base_fee_amount, 3000);

  -- 2. APPLY SCHOLARSHIP / SIBLING DISCOUNT CALCULATION
  -- Proration is removed as per requirements.
  final_tuition := base_tuition * (1.0 - COALESCE(NEW.discount_percentage, 0) / 100.0);

  -- 3. DETERMINE INSTALLMENTS FROM PAYMENT STRUCTURE
  IF NEW.payment_structure = '2 Terms' THEN num_installments := 2;
  ELSIF NEW.payment_structure = '3 Terms' OR NEW.payment_structure = 'Term' THEN num_installments := 3;
  ELSIF NEW.payment_structure = '4 Terms' THEN num_installments := 4;
  ELSIF NEW.payment_structure = '5 Terms' THEN num_installments := 5;
  ELSIF NEW.payment_structure = '6 Terms' THEN num_installments := 6;
  ELSIF NEW.payment_structure = 'Monthly' THEN num_installments := 10;
  ELSE num_installments := 1; -- Fallback for "1 Term" or other
  END IF;

  -- 4. GENERATE INVOICES
  FOR i IN 1..num_installments LOOP
    INSERT INTO fee_invoices (student_id, title, amount, status, due_date, academic_year)
    VALUES (
      NEW.id, 
      'Installment ' || i || ' of ' || num_installments, 
      final_tuition / num_installments::NUMERIC, 
      'pending', 
      CURRENT_DATE + ((i - 1) * (300 / num_installments) || ' days')::INTERVAL,
      NEW.academic_year
    );
  END LOOP;

  -- 5. Update running ledger balance
  UPDATE students SET total_due = final_tuition WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_generate_student_bills ON students;

CREATE TRIGGER trigger_generate_student_bills
  AFTER INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION generate_advanced_student_bills();
