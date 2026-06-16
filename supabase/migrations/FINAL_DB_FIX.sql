-- ==============================================================================
-- 🚨 FINAL DATABASE FIX (Registration Errors)
-- Execute this file in your Supabase SQL Editor to fix the student registration crashes.
-- ==============================================================================

-- 1. Ensure `grade` column exists on `fee_items`
ALTER TABLE fee_items ADD COLUMN IF NOT EXISTS "grade" TEXT DEFAULT 'All';

-- 2. Ensure `title`, `description`, and `academic_year` columns exist on `fee_invoices`
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'General Tuition Fee';
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- 3. Drop the NOT NULL constraints to prevent crashes
ALTER TABLE fee_invoices ALTER COLUMN academic_year DROP NOT NULL;
ALTER TABLE fee_invoices ALTER COLUMN title DROP NOT NULL;
ALTER TABLE fee_invoices ALTER COLUMN description DROP NOT NULL;

-- 4. Update the student billing trigger to properly include `academic_year` and `title`
CREATE OR REPLACE FUNCTION generate_student_bills()
RETURNS TRIGGER AS $$
DECLARE
  base_annual_tuition NUMERIC := 0;
  final_tuition NUMERIC := 0;
  proration_factor NUMERIC := 1.0;
  num_installments INTEGER := 1;
BEGIN
  -- A. BASE TUITION DETERMINATION
  SELECT COALESCE(SUM(amount), 0) INTO base_annual_tuition
  FROM fee_items
  WHERE grade = NEW.grade OR grade = 'All';

  IF base_annual_tuition = 0 THEN
    base_annual_tuition := 3000; -- Fallback
  END IF;

  -- B. SCHOLARSHIP / SIBLING DISCOUNT CALCULATION
  final_tuition := (base_annual_tuition * proration_factor) * (1.0 - COALESCE(NEW.discount_percentage, 0) / 100.0);

  -- C. INSTALLMENTS
  IF NEW.payment_structure = '2 Terms' OR NEW.payment_structure = '2 installments' THEN num_installments := 2;
  ELSIF NEW.payment_structure = '3 Terms' OR NEW.payment_structure = '3 installments' OR NEW.payment_structure = 'Term' THEN num_installments := 3;
  ELSIF NEW.payment_structure = '4 Terms' OR NEW.payment_structure = '4 installments' THEN num_installments := 4;
  ELSIF NEW.payment_structure = '5 Terms' OR NEW.payment_structure = '5 installments' THEN num_installments := 5;
  ELSIF NEW.payment_structure = '6 Terms' OR NEW.payment_structure = '6 installments' THEN num_installments := 6;
  ELSIF NEW.payment_structure = 'Monthly' THEN num_installments := 10;
  ELSE num_installments := 1; 
  END IF;

  -- D. GENERATE INVOICES
  FOR i IN 1..num_installments LOOP
    INSERT INTO fee_invoices (student_id, title, description, amount, status, due_date, academic_year)
    VALUES (
      NEW.id, 
      'Installment ' || i || ' of ' || num_installments, 
      'Installment ' || i || ' of ' || num_installments, 
      (final_tuition / num_installments::NUMERIC), 
      'pending', 
      CURRENT_DATE + ((i - 1) * (300 / num_installments) || ' days')::INTERVAL,
      NEW.academic_year
    );
  END LOOP;

  -- E. Update running ledger balance
  UPDATE students SET total_due = final_tuition WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach the trigger
DROP TRIGGER IF EXISTS trigger_generate_student_bills ON students;
CREATE TRIGGER trigger_generate_student_bills
  AFTER INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION generate_student_bills();
