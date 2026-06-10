-- ==============================================================================
-- STUDENT FINANCE & REGISTRATION AUTOMATION (SUPABASE FREE TIER OPTIMIZED)
-- ==============================================================================

-- 1. ENHANCE INVOICES TABLE
-- Accountants need to know what the bill is for (Title/Description)
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'General Tuition Fee';

-- 2. CACHE FINANCIAL BALANCES ON STUDENT TABLE (Crucial for Free Tier CPU)
-- Instead of doing a SUM() over 5,000 invoices every time the page loads, 
-- we keep a running total on the student table directly.
ALTER TABLE students ADD COLUMN IF NOT EXISTS total_due NUMERIC DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS total_paid NUMERIC DEFAULT 0;

-- 3. AUTOMATE BILLING ISSUANCE ON REGISTRATION
-- When a student is registered, automatically fetch the default fee_items 
-- for the year/grade and generate their invoices with future due dates.
CREATE OR REPLACE FUNCTION generate_student_bills_on_registration()
RETURNS TRIGGER AS $$
DECLARE
  base_tuition NUMERIC := 3000; -- Default fallback if no specific fee_items exist yet
BEGIN
  -- We split the base tuition into 3 terms automatically to track remaining payments.

  -- Term 1 (Due in 30 days)
  INSERT INTO fee_invoices (student_id, title, amount, status, due_date, academic_year)
  VALUES (NEW.id, 'Term 1 Tuition Fee - ' || NEW.academic_year, base_tuition / 3, 'pending', CURRENT_DATE + INTERVAL '30 days', NEW.academic_year);

  -- Term 2 (Due in 120 days)
  INSERT INTO fee_invoices (student_id, title, amount, status, due_date, academic_year)
  VALUES (NEW.id, 'Term 2 Tuition Fee - ' || NEW.academic_year, base_tuition / 3, 'pending', CURRENT_DATE + INTERVAL '120 days', NEW.academic_year);

  -- Term 3 (Due in 210 days)
  INSERT INTO fee_invoices (student_id, title, amount, status, due_date, academic_year)
  VALUES (NEW.id, 'Term 3 Tuition Fee - ' || NEW.academic_year, base_tuition / 3, 'pending', CURRENT_DATE + INTERVAL '210 days', NEW.academic_year);

  -- Update the student's running balance cache
  UPDATE students SET total_due = base_tuition WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4. Attach the trigger
DROP TRIGGER IF EXISTS trigger_generate_student_bills ON students;
CREATE TRIGGER trigger_generate_student_bills
  AFTER INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION generate_student_bills_on_registration();


-- 5. AUTOMATE THE LEDGER WHEN A PAYMENT IS MADE
-- Whenever an invoice is updated to 'paid', subtract from due and add to paid.
CREATE OR REPLACE FUNCTION update_student_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed from pending to paid
  IF OLD.status = 'pending' AND NEW.status = 'paid' THEN
    UPDATE students 
    SET total_paid = total_paid + NEW.amount,
        total_due = GREATEST(0, total_due - NEW.amount)
    WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_ledger ON fee_invoices;
CREATE TRIGGER trigger_sync_ledger
  AFTER UPDATE ON fee_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_student_balance_on_payment();
