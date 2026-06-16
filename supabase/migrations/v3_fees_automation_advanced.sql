-- ==============================================================================
-- STUDENT FINANCE AUTOMATION V2 (PRORATION + DISCOUNTS + STRUCTURES)
-- Execute this file in your Supabase SQL Editor.
-- ==============================================================================

-- 1. ADD NEW FIELDS TO STUDENTS TABLE
ALTER TABLE students ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;

-- 2. ENHANCE TRIGGER FUNCTION TO HANDLE PRORATION AND STRUCTURES
CREATE OR REPLACE FUNCTION generate_advanced_student_bills()
RETURNS TRIGGER AS $$
DECLARE
  base_annual_tuition NUMERIC := 3000;
  final_tuition NUMERIC;
  months_remaining INTEGER;
  proration_factor NUMERIC := 1.0;
  -- Default academic year start for proration (can be adjusted to school's format)
  year_start DATE := MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 9, 1);
  year_end DATE := MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER + 1, 6, 30);
  j_date DATE;
  i INTEGER;
BEGIN
  -- Default to September 1st if no date provided
  j_date := COALESCE(NEW.joining_date, year_start);

  -- A. PRORATION CALCULATION (Option A)
  IF j_date > year_start THEN
     -- Count months from joining date to end of academic year
     months_remaining := (EXTRACT(YEAR FROM year_end) - EXTRACT(YEAR FROM j_date)) * 12 
                       + EXTRACT(MONTH FROM year_end) - EXTRACT(MONTH FROM j_date);
     
     IF months_remaining < 0 THEN months_remaining := 0; END IF;
     IF months_remaining > 10 THEN months_remaining := 10; END IF;
     
     -- Prorate based on 10 academic months
     proration_factor := months_remaining / 10.0;
  END IF;

  -- B. SCHOLARSHIP / SIBLING DISCOUNT CALCULATION (Option B)
  final_tuition := (base_annual_tuition * proration_factor) * (1.0 - COALESCE(NEW.discount_percentage, 0) / 100.0);

  -- C. GENERATE INVOICES BASED ON FEE STRUCTURE
  IF NEW.fee_structure = 'Full Year' THEN
    INSERT INTO fee_invoices (student_id, title, amount, status, due_date, academic_year)
    VALUES (NEW.id, 'Annual Tuition Fee', final_tuition, 'pending', CURRENT_DATE + INTERVAL '15 days', NEW.academic_year);

  ELSIF NEW.fee_structure = 'Monthly' THEN
    -- Generate 10 monthly invoices
    FOR i IN 1..10 LOOP
      INSERT INTO fee_invoices (student_id, title, amount, status, due_date, academic_year)
      VALUES (NEW.id, 'Month ' || i || ' Tuition', final_tuition / 10.0, 'pending', CURRENT_DATE + (i * 30 || ' days')::INTERVAL, NEW.academic_year);
    END LOOP;

  ELSE
    -- Default to 'Term' (3 installments)
    INSERT INTO fee_invoices (student_id, title, amount, status, due_date, academic_year)
    VALUES (NEW.id, 'Term 1 Tuition', final_tuition / 3.0, 'pending', CURRENT_DATE + INTERVAL '15 days', NEW.academic_year),
           (NEW.id, 'Term 2 Tuition', final_tuition / 3.0, 'pending', CURRENT_DATE + INTERVAL '120 days', NEW.academic_year),
           (NEW.id, 'Term 3 Tuition', final_tuition / 3.0, 'pending', CURRENT_DATE + INTERVAL '210 days', NEW.academic_year);
  END IF;

  -- Update running ledger balance
  UPDATE students SET total_due = final_tuition WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. REPLACE OLD TRIGGER WITH NEW ONE
DROP TRIGGER IF EXISTS trigger_generate_student_bills ON students;

CREATE TRIGGER trigger_generate_student_bills
  AFTER INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION generate_advanced_student_bills();

-- Ensure total_paid and total_due exist
ALTER TABLE students ADD COLUMN IF NOT EXISTS total_due NUMERIC DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS total_paid NUMERIC DEFAULT 0;
