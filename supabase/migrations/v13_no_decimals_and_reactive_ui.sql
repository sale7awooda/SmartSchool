-- ==============================================================================
-- 🚨 STUDENT FINANCE DECIMAL PROTECTION & REACTIVE UI AUTOMATION
-- Execute this file in your Supabase SQL Editor.
-- This ensures all automatically generated student installment invoices are 
-- rounded up to the nearest 100, and the remainder goes to the last installment 
-- (making the last installment the smallest).
-- ==============================================================================

-- 1. Redefine generate_student_bills() to split fees into clean integer installments rounded to 100
CREATE OR REPLACE FUNCTION generate_student_bills()
RETURNS TRIGGER AS $$
DECLARE
  base_annual_tuition NUMERIC := 0;
  final_tuition NUMERIC := 0;
  proration_factor NUMERIC := 1.0;
  num_installments INTEGER := 1;
  base_installment NUMERIC;
  last_installment NUMERIC;
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

  -- C. INSTALLMENTS count determination
  IF NEW.payment_structure = '2 Terms' OR NEW.payment_structure = '2 installments' THEN num_installments := 2;
  ELSIF NEW.payment_structure = '3 Terms' OR NEW.payment_structure = '3 installments' OR NEW.payment_structure = 'Term' THEN num_installments := 3;
  ELSIF NEW.payment_structure = '4 Terms' OR NEW.payment_structure = '4 installments' THEN num_installments := 4;
  ELSIF NEW.payment_structure = '5 Terms' OR NEW.payment_structure = '5 installments' THEN num_installments := 5;
  ELSIF NEW.payment_structure = '6 Terms' OR NEW.payment_structure = '6 installments' THEN num_installments := 6;
  ELSIF NEW.payment_structure = 'Monthly' THEN num_installments := 10;
  ELSE num_installments := 1; 
  END IF;

  -- Calculate clean integer base installment rounded up to nearest 100
  IF (final_tuition / num_installments::NUMERIC) >= 100 THEN
    base_installment := CEIL((final_tuition / num_installments::NUMERIC) / 100.0) * 100;
  ELSE
    base_installment := ROUND(final_tuition / num_installments::NUMERIC);
  END IF;

  last_installment := final_tuition - (base_installment * (num_installments - 1));

  -- Edge case fallback to standard rounding if last installment becomes non-positive
  IF last_installment <= 0 THEN
    base_installment := ROUND(final_tuition / num_installments::NUMERIC);
    last_installment := final_tuition - (base_installment * (num_installments - 1));
  END IF;

  -- D. GENERATE INVOICES (whole numbers, no decimals)
  FOR i IN 1..num_installments LOOP
    INSERT INTO fee_invoices (student_id, title, description, amount, status, due_date, academic_year)
    VALUES (
      NEW.id, 
      'Installment ' || i || ' of ' || num_installments, 
      'Installment ' || i || ' of ' || num_installments, 
      CASE WHEN i = num_installments THEN last_installment ELSE base_installment END, 
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

-- 2. Redefine generate_advanced_student_bills() to split fees into clean integer installments rounded to 100
CREATE OR REPLACE FUNCTION generate_advanced_student_bills()
RETURNS TRIGGER AS $$
DECLARE
  base_annual_tuition NUMERIC := 3000;
  final_tuition NUMERIC;
  months_remaining INTEGER;
  proration_factor NUMERIC := 1.0;
  -- Default academic year start for proration
  year_start DATE := MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 9, 1);
  year_end DATE := MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER + 1, 6, 30);
  j_date DATE;
  i INTEGER;
  num_installments INTEGER := 1;
  base_installment NUMERIC;
  last_installment NUMERIC;
BEGIN
  -- Default to September 1st if no date provided
  j_date := COALESCE(NEW.joining_date, year_start);

  -- A. PRORATION CALCULATION
  IF j_date > year_start THEN
     months_remaining := (EXTRACT(YEAR FROM year_end) - EXTRACT(YEAR FROM j_date)) * 12 
                       + EXTRACT(MONTH FROM year_end) - EXTRACT(MONTH FROM j_date);
     
     IF months_remaining < 0 THEN months_remaining := 0; END IF;
     IF months_remaining > 10 THEN months_remaining := 10; END IF;
     
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
  ELSE num_installments := 1; 
  END IF;

  -- Calculate clean integer base installment rounded up to nearest 100
  IF (final_tuition / num_installments::NUMERIC) >= 100 THEN
    base_installment := CEIL((final_tuition / num_installments::NUMERIC) / 100.0) * 100;
  ELSE
    base_installment := ROUND(final_tuition / num_installments::NUMERIC);
  END IF;

  last_installment := final_tuition - (base_installment * (num_installments - 1));

  -- Edge case fallback to standard rounding if last installment becomes non-positive
  IF last_installment <= 0 THEN
    base_installment := ROUND(final_tuition / num_installments::NUMERIC);
    last_installment := final_tuition - (base_installment * (num_installments - 1));
  END IF;

  FOR i IN 1..num_installments LOOP
    INSERT INTO fee_invoices (student_id, title, amount, status, due_date, academic_year)
    VALUES (
      NEW.id, 
      'Installment ' || i || ' of ' || num_installments, 
      CASE WHEN i = num_installments THEN last_installment ELSE base_installment END, 
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
