-- ==============================================================================
-- STUDENT FINANCE AUTOMATION V3 (Up to 6 Term Installments support)
-- Execute this file in your Supabase SQL Editor.
-- ==============================================================================

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
  num_installments INTEGER := 1;
BEGIN
  -- Default to September 1st if no date provided
  j_date := COALESCE(NEW.joining_date, year_start);

  -- A. PRORATION CALCULATION
  IF j_date > year_start THEN
     -- Count months from joining date to end of academic year
     months_remaining := (EXTRACT(YEAR FROM year_end) - EXTRACT(YEAR FROM j_date)) * 12 
                       + EXTRACT(MONTH FROM year_end) - EXTRACT(MONTH FROM j_date);
     
     IF months_remaining < 0 THEN months_remaining := 0; END IF;
     IF months_remaining > 10 THEN months_remaining := 10; END IF;
     
     -- Prorate based on 10 academic months
     proration_factor := months_remaining / 10.0;
  END IF;

  -- B. SCHOLARSHIP / SIBLING DISCOUNT CALCULATION
  final_tuition := (base_annual_tuition * proration_factor) * (1.0 - COALESCE(NEW.discount_percentage, 0) / 100.0);

  -- C. GENERATE INVOICES BASED ON FEE STRUCTURE
  IF NEW.fee_structure = '2 Terms' THEN num_installments := 2;
  ELSIF NEW.fee_structure = '3 Terms' OR NEW.fee_structure = 'Term' THEN num_installments := 3;
  ELSIF NEW.fee_structure = '4 Terms' THEN num_installments := 4;
  ELSIF NEW.fee_structure = '5 Terms' THEN num_installments := 5;
  ELSIF NEW.fee_structure = '6 Terms' THEN num_installments := 6;
  ELSIF NEW.fee_structure = 'Monthly' THEN num_installments := 10;
  ELSE num_installments := 1; -- Fallback for "1 Term" or "Full Year" or unrecognized
  END IF;

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

  -- Update running ledger balance
  UPDATE students SET total_due = final_tuition WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure the trigger utilizes the updated function
DROP TRIGGER IF EXISTS trigger_generate_student_bills ON students;

CREATE TRIGGER trigger_generate_student_bills
  AFTER INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION generate_advanced_student_bills();
