


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "_supabase";


ALTER SCHEMA "_supabase" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."generate_advanced_student_bills"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_advanced_student_bills"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_final_student_bills"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  base_tuition NUMERIC := 0;
  final_tuition NUMERIC;
  installment_count INTEGER := 1;
  i INTEGER;
  matching_fee_amount NUMERIC;
BEGIN
  -- A. DETERMINE BASE TUITION
  -- If accountant checked the box and entered a custom prorated base fee:
  IF NEW.custom_tuition_amount IS NOT NULL AND NEW.custom_tuition_amount > 0 THEN
    base_tuition := NEW.custom_tuition_amount;
  ELSE
    -- Dynamically look up the standard fee for this specific Grade from standard fee items
    SELECT amount INTO matching_fee_amount 
    FROM fee_items 
    WHERE name ILIKE '%' || NEW.grade || '%' AND category = 'Academic' 
    LIMIT 1;

    IF matching_fee_amount IS NOT NULL THEN
      base_tuition := matching_fee_amount;
    ELSE
      -- Fallback if the school hasn't defined fees for this grade in the structure tab yet
      base_tuition := 3000; 
    END IF;
  END IF;

  -- B. APPLY PERMANENT SIBLING/SCHOLARSHIP DISCOUNTS
  -- Subtracts X percentage from the base (e.g., 10%)
  final_tuition := base_tuition * (1.0 - COALESCE(NEW.discount_percentage, 0) / 100.0);

  -- C. DETERMINE FLEXIBLE INSTALLMENTS
  IF NEW.fee_structure = 'Full Year' THEN installment_count := 1;
  ELSIF NEW.fee_structure = '2 Terms' THEN installment_count := 2;
  ELSIF NEW.fee_structure = '3 Terms' THEN installment_count := 3;
  ELSIF NEW.fee_structure = '4 Terms' THEN installment_count := 4;
  ELSIF NEW.fee_structure = '5 Terms' THEN installment_count := 5;
  ELSIF NEW.fee_structure = '6 Terms' THEN installment_count := 6;
  ELSE installment_count := 1; -- Default fallback
  END IF;

  -- D. GENERATE THE INVOICES
  FOR i IN 1..installment_count LOOP
    INSERT INTO fee_invoices (student_id, title, amount, status, due_date)
    VALUES (
      NEW.id, 
      NEW.fee_structure || ' - Installment ' || i || ' of ' || installment_count, 
      ROUND((final_tuition / installment_count)::numeric, 2), 
      'pending', 
      CURRENT_DATE + ((i - 1) * 60 || ' days')::INTERVAL -- Staggers due dates every 60 days
    );
  END LOOP;

  -- Update running ledger UI balance cache
  UPDATE students SET total_due = final_tuition WHERE id = NEW.id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_final_student_bills"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_student_bills"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_student_bills"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_school_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT school_id FROM public.users WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_current_school_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_fee_stats"("p_academic_year" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_fee_stats"("p_academic_year" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    CASE 
      WHEN NEW.email = 'sale7awooda@gmail.com' THEN 'admin'
      ELSE 'parent'
    END
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if user was manually added first
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_balance_due"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."recompute_balance_due"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_fee_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_reference_number" "text", "p_recorded_by" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."record_fee_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_reference_number" "text", "p_recorded_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_student_ledger_on_invoice_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_student_ledger_on_invoice_change"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "_supabase"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "statements" "text"[],
    "hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "_supabase"."migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "_supabase"."migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "_supabase"."migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "_supabase"."migrations_id_seq" OWNED BY "_supabase"."migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."academic_enrollments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "academic_year" "text" NOT NULL,
    "grade" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."academic_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."academic_years" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "is_active" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."academic_years" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "assessment_id" "uuid",
    "question" "text" NOT NULL,
    "type" "text",
    "options" "jsonb",
    "correct_answer" "text",
    "points" integer,
    "order" integer,
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."assessment_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "subject_id" "uuid",
    "class_id" "uuid",
    "date" "date",
    "duration" integer,
    "status" "text",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "date" "date",
    "status" "text",
    "notes" "text",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "text",
    "before_snapshot" "jsonb",
    "after_snapshot" "jsonb",
    "ip_address" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."backups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_path" "text",
    "size_bytes" bigint DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "backup_type" "text" DEFAULT 'auto'::"text" NOT NULL,
    "triggered_by" "uuid",
    "expires_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "backups_backup_type_check" CHECK (("backup_type" = ANY (ARRAY['auto'::"text", 'manual'::"text"]))),
    CONSTRAINT "backups_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."backups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."behavior_records" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "date" "date",
    "incident" "text",
    "severity" "text",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."behavior_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."books" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "author" "text" NOT NULL,
    "isbn" "text",
    "category" "text",
    "total_copies" integer DEFAULT 1,
    "available_copies" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid"
);


ALTER TABLE "public"."books" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."broadcasts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "target_audience" "text"[],
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."broadcasts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bus_routes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "driver_id" "uuid",
    "vehicle_number" "text",
    "capacity" integer,
    "attendant_id" "uuid",
    "route_number" "text",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid",
    "bus_number" "text",
    "status" "text" DEFAULT 'Not Started'::"text",
    "current_location" "text",
    "live_status" "text"
);


ALTER TABLE "public"."bus_routes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bus_stops" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "route_id" "uuid",
    "name" "text" NOT NULL,
    "time" time without time zone,
    "latitude" double precision,
    "longitude" double precision,
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid",
    "student_id" "uuid",
    "order_index" integer DEFAULT 0,
    "arrival_time" "text"
);


ALTER TABLE "public"."bus_stops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "capacity" integer,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "teacher_id" "uuid",
    "grade" "text" NOT NULL,
    "academic_year" "text" NOT NULL
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fee_invoices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "academic_year" "text",
    "description" "text",
    "amount" numeric(12,2) NOT NULL,
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "paid_at" timestamp with time zone,
    "payment_method" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "title" "text" DEFAULT 'General Tuition Fee'::"text",
    "balance_due" numeric,
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid",
    CONSTRAINT "chk_balance_nonnegative" CHECK (("balance_due" >= (0)::numeric))
);


ALTER TABLE "public"."fee_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "grade" "text" NOT NULL,
    "roll_number" "text",
    "academic_year" "text",
    "gender" "text",
    "dob" "date",
    "address" "text",
    "fee_structure" "text",
    "additional_info" "text",
    "is_deleted" boolean DEFAULT false,
    "deleted_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "joining_date" "date",
    "discount_percentage" numeric DEFAULT 0,
    "total_due" numeric DEFAULT 0,
    "total_paid" numeric DEFAULT 0,
    "custom_tuition_amount" numeric,
    "base_fee_amount" numeric,
    "payment_structure" character varying(50),
    "is_custom_fee" boolean DEFAULT false,
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "student_id" "uuid",
    "avatar_url" "text",
    "phone" "text",
    "address" "text",
    "department" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "designation" "text",
    "date_of_join" "date",
    "salary" numeric,
    "can_mark_attendance" boolean DEFAULT false,
    "education" "text",
    "dob" "date",
    "gender" "text",
    "extra_info" "text",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'teacher'::"text", 'parent'::"text", 'student'::"text", 'staff'::"text", 'accountant'::"text", 'super_admin'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fee_invoices_view" AS
 SELECT "fi"."id",
    "fi"."student_id",
    "fi"."academic_year",
    "fi"."description",
    "fi"."amount",
    "fi"."due_date",
    "fi"."status",
    "fi"."paid_at",
    "fi"."payment_method",
    "fi"."created_at",
    "fi"."title",
    "fi"."balance_due",
    "s"."grade" AS "student_grade",
    "s"."academic_year" AS "student_academic_year",
    COALESCE("u"."name", 'General / Unlinked'::"text") AS "student_name"
   FROM (("public"."fee_invoices" "fi"
     LEFT JOIN "public"."students" "s" ON (("fi"."student_id" = "s"."id")))
     LEFT JOIN "public"."users" "u" ON (("s"."user_id" = "u"."id")));


ALTER VIEW "public"."fee_invoices_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fee_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "type" "text",
    "category" "text",
    "frequency" "text",
    "due_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "grade" "text" DEFAULT 'All'::"text",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."fee_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fee_payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "payment_method" "text" NOT NULL,
    "reference_number" "text",
    "recorded_by" "uuid",
    "payment_date" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."fee_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financials" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "category" "text",
    "amount" numeric,
    "date" "date",
    "description" "text",
    "status" "text",
    "staff_id" "uuid",
    "user_id" "uuid",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."financials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grades" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "subject_id" "uuid",
    "academic_year" "text" NOT NULL,
    "term" "text" NOT NULL,
    "score" numeric NOT NULL,
    "score_max" numeric DEFAULT 100 NOT NULL,
    "assessment_id" "uuid",
    "remarks" "text",
    "graded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid",
    "comments" "text"
);


ALTER TABLE "public"."grades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "quantity" integer,
    "status" "text",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "amount" numeric,
    "status" "text",
    "due_date" "date"
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leave_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "start_date" "date",
    "end_date" "date",
    "reason" "text",
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "staff_id" "uuid",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."leave_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medical_records" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "blood_group" "text",
    "allergies" "text",
    "conditions" "text",
    "emergency_contact" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."medical_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sender_id" "uuid",
    "receiver_id" "uuid",
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "role_target" "text"[],
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."notices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_student" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "parent_id" "uuid",
    "student_id" "uuid",
    "relation" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."parent_student" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payslips" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "staff_id" "uuid",
    "month" "text",
    "amount" numeric,
    "status" "text",
    "date" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."payslips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "text" NOT NULL,
    "user_id" "uuid",
    "user_role" "text" NOT NULL,
    "user_name" "text" NOT NULL,
    "endpoint" "text" NOT NULL,
    "keys" "jsonb" NOT NULL,
    "subscribed_at" timestamp with time zone DEFAULT "now"(),
    "last_used_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "assessment_id" "uuid",
    "text" "text" NOT NULL,
    "type" "text" NOT NULL,
    "options" "jsonb",
    "correct_answer" "text",
    "correct_answers" "jsonb",
    "marks" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "questions_type_check" CHECK (("type" = ANY (ARRAY['multiple_choice'::"text", 'true_false'::"text", 'multiple_response'::"text", 'short_answer'::"text"])))
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_drafts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "constraints" "jsonb" NOT NULL,
    "mappings" "jsonb" NOT NULL,
    "schedule" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."schedule_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "class_id" "uuid",
    "subject_id" "uuid",
    "teacher_id" "uuid",
    "day_of_week" "text",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "period" integer,
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_module_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "module_name" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."school_module_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "subdomain" "text",
    "address" "text",
    "phone" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "currency" "text" DEFAULT 'USD'::"text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "subscription_tier" "text" DEFAULT 'free'::"text",
    "is_active" boolean DEFAULT true,
    "logo_url" "text",
    "advanced_config" "jsonb" DEFAULT '{}'::"jsonb",
    "branding_config" "jsonb" DEFAULT '{}'::"jsonb",
    "backup_config" "jsonb" DEFAULT '{"backup_time": "03:00", "retention_days": 7, "auto_backup_enabled": true}'::"jsonb",
    "maintenance_mode" boolean DEFAULT false,
    "maintenance_message" "text",
    "storage_used_bytes" bigint DEFAULT 0,
    "user_count" integer DEFAULT 0,
    "student_count" integer DEFAULT 0
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_attendance" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "staff_id" "uuid",
    "date" "date" NOT NULL,
    "status" "text" NOT NULL,
    "time_in" "text",
    "time_out" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."staff_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."student_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_transport" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "route_id" "uuid",
    "stop_id" "uuid",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."student_transport" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "assessment_id" "uuid",
    "student_id" "uuid",
    "score" integer,
    "answers" "jsonb",
    "status" "text",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "billing_type" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "max_students" integer DEFAULT '-1'::integer,
    "max_staff" integer DEFAULT '-1'::integer,
    "storage_limit_mb" integer DEFAULT 500,
    "enabled_modules" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscription_plans_billing_type_check" CHECK (("billing_type" = ANY (ARRAY['monthly'::"text", 'yearly'::"text", 'one_time'::"text"])))
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "start_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_date" timestamp with time zone,
    "trial_end_date" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "stripe_subscription_id" "text",
    "stripe_customer_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'trial'::"text", 'cancelled'::"text", 'expired'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "announcement_type" "text" DEFAULT 'banner'::"text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "school_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "system_announcements_announcement_type_check" CHECK (("announcement_type" = ANY (ARRAY['banner'::"text", 'popup'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."system_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_health_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "metric_name" "text" NOT NULL,
    "metric_value" numeric NOT NULL,
    "metric_unit" "text",
    "school_id" "uuid",
    "tags" "jsonb" DEFAULT '{}'::"jsonb",
    "recorded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_health_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" integer NOT NULL,
    "school_name" "text",
    "address" "text",
    "phone" "text",
    "email" "text",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."system_settings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."system_settings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."system_settings_id_seq" OWNED BY "public"."system_settings"."id";



CREATE TABLE IF NOT EXISTS "public"."timeline_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "date" "date",
    "title" "text",
    "description" "text",
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."timeline_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timeline_records" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "type" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."timeline_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "url" "text",
    "type" "text" DEFAULT 'info'::"text",
    "status" "text" DEFAULT 'unread'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visitors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "purpose" "text",
    "check_in" timestamp with time zone,
    "check_out" timestamp with time zone,
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid" DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::"uuid"
);


ALTER TABLE "public"."visitors" OWNER TO "postgres";


ALTER TABLE ONLY "_supabase"."migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"_supabase"."migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."system_settings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."system_settings_id_seq"'::"regclass");



ALTER TABLE ONLY "_supabase"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "_supabase"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."academic_enrollments"
    ADD CONSTRAINT "academic_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_questions"
    ADD CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."backups"
    ADD CONSTRAINT "backups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."behavior_records"
    ADD CONSTRAINT "behavior_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."books"
    ADD CONSTRAINT "books_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."broadcasts"
    ADD CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bus_routes"
    ADD CONSTRAINT "bus_routes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bus_stops"
    ADD CONSTRAINT "bus_stops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_invoices"
    ADD CONSTRAINT "fee_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_items"
    ADD CONSTRAINT "fee_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_payments"
    ADD CONSTRAINT "fee_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financials"
    ADD CONSTRAINT "financials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_student_id_subject_id_academic_year_term_key" UNIQUE ("student_id", "subject_id", "academic_year", "term");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_records"
    ADD CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notices"
    ADD CONSTRAINT "notices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_student"
    ADD CONSTRAINT "parent_student_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payslips"
    ADD CONSTRAINT "payslips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_drafts"
    ADD CONSTRAINT "schedule_drafts_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."schedule_drafts"
    ADD CONSTRAINT "schedule_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_class_id_day_of_week_period_key" UNIQUE ("class_id", "day_of_week", "period");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_module_overrides"
    ADD CONSTRAINT "school_module_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_module_overrides"
    ADD CONSTRAINT "school_module_overrides_school_id_module_name_key" UNIQUE ("school_id", "module_name");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_subdomain_key" UNIQUE ("subdomain");



ALTER TABLE ONLY "public"."staff_attendance"
    ADD CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_attendance"
    ADD CONSTRAINT "staff_attendance_staff_id_date_key" UNIQUE ("staff_id", "date");



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_transport"
    ADD CONSTRAINT "student_transport_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_announcements"
    ADD CONSTRAINT "system_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_health_logs"
    ADD CONSTRAINT "system_health_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timeline_events"
    ADD CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timeline_records"
    ADD CONSTRAINT "timeline_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visitors"
    ADD CONSTRAINT "visitors_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_attendance_date" ON "public"."attendance" USING "btree" ("date");



CREATE INDEX "idx_attendance_student_id" ON "public"."attendance" USING "btree" ("student_id");



CREATE INDEX "idx_audit_logs_admin_id" ON "public"."audit_logs" USING "btree" ("admin_id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_resource" ON "public"."audit_logs" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_backups_created_at" ON "public"."backups" USING "btree" ("created_at");



CREATE INDEX "idx_backups_school_id" ON "public"."backups" USING "btree" ("school_id");



CREATE INDEX "idx_backups_status" ON "public"."backups" USING "btree" ("status");



CREATE INDEX "idx_messages_receiver" ON "public"."messages" USING "btree" ("receiver_id");



CREATE INDEX "idx_push_user_id" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_push_user_role" ON "public"."push_subscriptions" USING "btree" ("user_role");



CREATE INDEX "idx_school_module_overrides_school" ON "public"."school_module_overrides" USING "btree" ("school_id");



CREATE INDEX "idx_subscriptions_plan_id" ON "public"."subscriptions" USING "btree" ("plan_id");



CREATE INDEX "idx_subscriptions_school_id" ON "public"."subscriptions" USING "btree" ("school_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_system_announcements_active" ON "public"."system_announcements" USING "btree" ("is_active");



CREATE INDEX "idx_system_health_logs_metric" ON "public"."system_health_logs" USING "btree" ("metric_name", "recorded_at");



CREATE INDEX "idx_system_health_logs_school" ON "public"."system_health_logs" USING "btree" ("school_id");



CREATE INDEX "idx_user_notifications_status" ON "public"."user_notifications" USING "btree" ("status");



CREATE INDEX "idx_user_notifications_user_id" ON "public"."user_notifications" USING "btree" ("user_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "trg_recompute_balance" AFTER INSERT OR DELETE OR UPDATE ON "public"."fee_payments" FOR EACH ROW EXECUTE FUNCTION "public"."recompute_balance_due"();



CREATE OR REPLACE TRIGGER "trigger_sync_ledger" BEFORE INSERT OR DELETE OR UPDATE ON "public"."fee_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."sync_student_ledger_on_invoice_change"();



ALTER TABLE ONLY "public"."academic_years"
    ADD CONSTRAINT "academic_years_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assessment_questions"
    ADD CONSTRAINT "assessment_questions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."backups"
    ADD CONSTRAINT "backups_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."backups"
    ADD CONSTRAINT "backups_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."behavior_records"
    ADD CONSTRAINT "behavior_records_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."behavior_records"
    ADD CONSTRAINT "behavior_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id");



ALTER TABLE ONLY "public"."broadcasts"
    ADD CONSTRAINT "broadcasts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."broadcasts"
    ADD CONSTRAINT "broadcasts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bus_routes"
    ADD CONSTRAINT "bus_routes_attendant_id_fkey" FOREIGN KEY ("attendant_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."bus_routes"
    ADD CONSTRAINT "bus_routes_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."bus_routes"
    ADD CONSTRAINT "bus_routes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bus_stops"
    ADD CONSTRAINT "bus_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."bus_routes"("id");



ALTER TABLE ONLY "public"."bus_stops"
    ADD CONSTRAINT "bus_stops_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bus_stops"
    ADD CONSTRAINT "bus_stops_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fee_invoices"
    ADD CONSTRAINT "fee_invoices_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fee_items"
    ADD CONSTRAINT "fee_items_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fee_payments"
    ADD CONSTRAINT "fee_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."fee_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fee_payments"
    ADD CONSTRAINT "fee_payments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financials"
    ADD CONSTRAINT "financials_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financials"
    ADD CONSTRAINT "financials_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financials"
    ADD CONSTRAINT "financials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id");



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."notices"
    ADD CONSTRAINT "notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."notices"
    ADD CONSTRAINT "notices_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."parent_student"
    ADD CONSTRAINT "parent_student_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_student"
    ADD CONSTRAINT "parent_student_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."parent_student"
    ADD CONSTRAINT "parent_student_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payslips"
    ADD CONSTRAINT "payslips_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payslips"
    ADD CONSTRAINT "payslips_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_drafts"
    ADD CONSTRAINT "schedule_drafts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."school_module_overrides"
    ADD CONSTRAINT "school_module_overrides_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_attendance"
    ADD CONSTRAINT "staff_attendance_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_attendance"
    ADD CONSTRAINT "staff_attendance_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."student_transport"
    ADD CONSTRAINT "student_transport_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."bus_routes"("id");



ALTER TABLE ONLY "public"."student_transport"
    ADD CONSTRAINT "student_transport_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_transport"
    ADD CONSTRAINT "student_transport_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "public"."bus_stops"("id");



ALTER TABLE ONLY "public"."student_transport"
    ADD CONSTRAINT "student_transport_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_announcements"
    ADD CONSTRAINT "system_announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."system_announcements"
    ADD CONSTRAINT "system_announcements_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_health_logs"
    ADD CONSTRAINT "system_health_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."timeline_events"
    ADD CONSTRAINT "timeline_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."timeline_events"
    ADD CONSTRAINT "timeline_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."visitors"
    ADD CONSTRAINT "visitors_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can manage all student documents" ON "public"."student_documents" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Allow admins to view all push subscriptions" ON "public"."push_subscriptions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Allow individuals to manage their own push subscriptions" ON "public"."push_subscriptions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Parents can view their student documents" ON "public"."student_documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."parent_student" "ps"
  WHERE (("ps"."student_id" = "student_documents"."student_id") AND ("ps"."parent_id" = "auth"."uid"())))));



CREATE POLICY "Students can view their own documents" ON "public"."student_documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."students" "s"
  WHERE (("s"."id" = "student_documents"."student_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "System can insert notifications" ON "public"."user_notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can update their own notifications (mark as read)" ON "public"."user_notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."user_notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."academic_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."academic_years" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_view_announcements" ON "public"."system_announcements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_view_subscription_plans" ON "public"."subscription_plans" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."backups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."behavior_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."books" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."broadcasts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bus_routes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bus_stops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fee_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fee_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fee_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."grades" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leave_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medical_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parent_student" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payslips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedule_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."school_module_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schools_admin_update_policy" ON "public"."schools" FOR UPDATE TO "authenticated" USING (((("id" = "public"."get_current_school_id"()) AND ("public"."get_current_user_role"() = 'admin'::"text")) OR "public"."is_super_admin"())) WITH CHECK (((("id" = "public"."get_current_school_id"()) AND ("public"."get_current_user_role"() = 'admin'::"text")) OR "public"."is_super_admin"()));



CREATE POLICY "schools_select_policy" ON "public"."schools" FOR SELECT TO "authenticated" USING ((("id" = "public"."get_current_school_id"()) OR "public"."is_super_admin"()));



ALTER TABLE "public"."staff_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_transport" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "super_admin_manage_announcements" ON "public"."system_announcements" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "super_admin_manage_audit_logs" ON "public"."audit_logs" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "super_admin_manage_backups" ON "public"."backups" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "super_admin_manage_module_overrides" ON "public"."school_module_overrides" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "super_admin_manage_subscription_plans" ON "public"."subscription_plans" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "super_admin_manage_subscriptions" ON "public"."subscriptions" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "super_admin_view_health_logs" ON "public"."system_health_logs" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



ALTER TABLE "public"."system_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_health_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_isolation_academic_enrollments" ON "public"."academic_enrollments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."students" "s"
  WHERE (("s"."id" = "academic_enrollments"."student_id") AND ("s"."school_id" = "public"."get_current_school_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."students" "s"
  WHERE (("s"."id" = "academic_enrollments"."student_id") AND ("s"."school_id" = "public"."get_current_school_id"())))));



CREATE POLICY "tenant_isolation_all" ON "public"."academic_years" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."assessment_questions" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."assessments" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."attendance" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."behavior_records" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."broadcasts" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."bus_routes" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."bus_stops" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."classes" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."fee_invoices" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."fee_items" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."fee_payments" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."financials" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."grades" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."inventory" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."leave_requests" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."messages" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."notices" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."parent_student" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."payslips" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."schedule_drafts" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."schedules" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."staff_attendance" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."student_transport" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."students" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."subjects" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."submissions" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."timeline_events" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_all" ON "public"."visitors" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_books" ON "public"."books" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_courses" ON "public"."courses" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "courses"."teacher_id") AND ("u"."school_id" = "public"."get_current_school_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "courses"."teacher_id") AND ("u"."school_id" = "public"."get_current_school_id"())))));



CREATE POLICY "tenant_isolation_invoices" ON "public"."invoices" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."students" "s"
  WHERE (("s"."id" = "invoices"."student_id") AND ("s"."school_id" = "public"."get_current_school_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."students" "s"
  WHERE (("s"."id" = "invoices"."student_id") AND ("s"."school_id" = "public"."get_current_school_id"())))));



CREATE POLICY "tenant_isolation_medical_records" ON "public"."medical_records" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."students" "s"
  WHERE (("s"."id" = "medical_records"."student_id") AND ("s"."school_id" = "public"."get_current_school_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."students" "s"
  WHERE (("s"."id" = "medical_records"."student_id") AND ("s"."school_id" = "public"."get_current_school_id"())))));



CREATE POLICY "tenant_isolation_questions" ON "public"."questions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."assessments" "a"
  WHERE (("a"."id" = "questions"."assessment_id") AND ("a"."school_id" = "public"."get_current_school_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."assessments" "a"
  WHERE (("a"."id" = "questions"."assessment_id") AND ("a"."school_id" = "public"."get_current_school_id"())))));



CREATE POLICY "tenant_isolation_system_settings" ON "public"."system_settings" TO "authenticated" USING (("school_id" = "public"."get_current_school_id"())) WITH CHECK (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_isolation_timeline_records" ON "public"."timeline_records" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."students" "s"
  WHERE (("s"."id" = "timeline_records"."student_id") AND ("s"."school_id" = "public"."get_current_school_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."students" "s"
  WHERE (("s"."id" = "timeline_records"."student_id") AND ("s"."school_id" = "public"."get_current_school_id"())))));



CREATE POLICY "tenant_view_backups" ON "public"."backups" FOR SELECT TO "authenticated" USING (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_view_module_overrides" ON "public"."school_module_overrides" FOR SELECT TO "authenticated" USING (("school_id" = "public"."get_current_school_id"()));



CREATE POLICY "tenant_view_subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("school_id" = "public"."get_current_school_id"()));



ALTER TABLE "public"."timeline_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."timeline_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_admin_manage_policy" ON "public"."users" TO "authenticated" USING (((("school_id" = "public"."get_current_school_id"()) AND ("public"."get_current_user_role"() = 'admin'::"text")) OR "public"."is_super_admin"())) WITH CHECK (((("school_id" = "public"."get_current_school_id"()) AND ("public"."get_current_user_role"() = 'admin'::"text")) OR "public"."is_super_admin"()));



CREATE POLICY "users_select_policy" ON "public"."users" FOR SELECT TO "authenticated" USING (((("school_id" = "public"."get_current_school_id"()) AND (("id" = "auth"."uid"()) OR ("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'teacher'::"text", 'staff'::"text", 'accountant'::"text"])))) OR "public"."is_super_admin"()));



CREATE POLICY "users_update_policy" ON "public"."users" FOR UPDATE TO "authenticated" USING (((("school_id" = "public"."get_current_school_id"()) AND (("id" = "auth"."uid"()) OR ("public"."get_current_user_role"() = 'admin'::"text"))) OR "public"."is_super_admin"())) WITH CHECK (((("school_id" = "public"."get_current_school_id"()) AND (("id" = "auth"."uid"()) OR ("public"."get_current_user_role"() = 'admin'::"text"))) OR "public"."is_super_admin"()));



ALTER TABLE "public"."visitors" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


























































































































































































GRANT ALL ON FUNCTION "public"."generate_advanced_student_bills"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_advanced_student_bills"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_advanced_student_bills"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_final_student_bills"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_final_student_bills"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_final_student_bills"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_student_bills"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_student_bills"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_student_bills"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_school_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_school_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_school_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_fee_stats"("p_academic_year" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_fee_stats"("p_academic_year" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fee_stats"("p_academic_year" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_balance_due"() TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_balance_due"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_balance_due"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_fee_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_reference_number" "text", "p_recorded_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."record_fee_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_reference_number" "text", "p_recorded_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_fee_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_reference_number" "text", "p_recorded_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_student_ledger_on_invoice_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_student_ledger_on_invoice_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_student_ledger_on_invoice_change"() TO "service_role";
























GRANT ALL ON TABLE "public"."academic_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."academic_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."academic_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."academic_years" TO "anon";
GRANT ALL ON TABLE "public"."academic_years" TO "authenticated";
GRANT ALL ON TABLE "public"."academic_years" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_questions" TO "anon";
GRANT ALL ON TABLE "public"."assessment_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_questions" TO "service_role";



GRANT ALL ON TABLE "public"."assessments" TO "anon";
GRANT ALL ON TABLE "public"."assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."assessments" TO "service_role";



GRANT ALL ON TABLE "public"."attendance" TO "anon";
GRANT ALL ON TABLE "public"."attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."backups" TO "anon";
GRANT ALL ON TABLE "public"."backups" TO "authenticated";
GRANT ALL ON TABLE "public"."backups" TO "service_role";



GRANT ALL ON TABLE "public"."behavior_records" TO "anon";
GRANT ALL ON TABLE "public"."behavior_records" TO "authenticated";
GRANT ALL ON TABLE "public"."behavior_records" TO "service_role";



GRANT ALL ON TABLE "public"."books" TO "anon";
GRANT ALL ON TABLE "public"."books" TO "authenticated";
GRANT ALL ON TABLE "public"."books" TO "service_role";



GRANT ALL ON TABLE "public"."broadcasts" TO "anon";
GRANT ALL ON TABLE "public"."broadcasts" TO "authenticated";
GRANT ALL ON TABLE "public"."broadcasts" TO "service_role";



GRANT ALL ON TABLE "public"."bus_routes" TO "anon";
GRANT ALL ON TABLE "public"."bus_routes" TO "authenticated";
GRANT ALL ON TABLE "public"."bus_routes" TO "service_role";



GRANT ALL ON TABLE "public"."bus_stops" TO "anon";
GRANT ALL ON TABLE "public"."bus_stops" TO "authenticated";
GRANT ALL ON TABLE "public"."bus_stops" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."fee_invoices" TO "anon";
GRANT ALL ON TABLE "public"."fee_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."fee_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."fee_invoices_view" TO "anon";
GRANT ALL ON TABLE "public"."fee_invoices_view" TO "authenticated";
GRANT ALL ON TABLE "public"."fee_invoices_view" TO "service_role";



GRANT ALL ON TABLE "public"."fee_items" TO "anon";
GRANT ALL ON TABLE "public"."fee_items" TO "authenticated";
GRANT ALL ON TABLE "public"."fee_items" TO "service_role";



GRANT ALL ON TABLE "public"."fee_payments" TO "anon";
GRANT ALL ON TABLE "public"."fee_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."fee_payments" TO "service_role";



GRANT ALL ON TABLE "public"."financials" TO "anon";
GRANT ALL ON TABLE "public"."financials" TO "authenticated";
GRANT ALL ON TABLE "public"."financials" TO "service_role";



GRANT ALL ON TABLE "public"."grades" TO "anon";
GRANT ALL ON TABLE "public"."grades" TO "authenticated";
GRANT ALL ON TABLE "public"."grades" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."leave_requests" TO "anon";
GRANT ALL ON TABLE "public"."leave_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_requests" TO "service_role";



GRANT ALL ON TABLE "public"."medical_records" TO "anon";
GRANT ALL ON TABLE "public"."medical_records" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_records" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notices" TO "anon";
GRANT ALL ON TABLE "public"."notices" TO "authenticated";
GRANT ALL ON TABLE "public"."notices" TO "service_role";



GRANT ALL ON TABLE "public"."parent_student" TO "anon";
GRANT ALL ON TABLE "public"."parent_student" TO "authenticated";
GRANT ALL ON TABLE "public"."parent_student" TO "service_role";



GRANT ALL ON TABLE "public"."payslips" TO "anon";
GRANT ALL ON TABLE "public"."payslips" TO "authenticated";
GRANT ALL ON TABLE "public"."payslips" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_drafts" TO "anon";
GRANT ALL ON TABLE "public"."schedule_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."schedules" TO "anon";
GRANT ALL ON TABLE "public"."schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."schedules" TO "service_role";



GRANT ALL ON TABLE "public"."school_module_overrides" TO "anon";
GRANT ALL ON TABLE "public"."school_module_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."school_module_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."staff_attendance" TO "anon";
GRANT ALL ON TABLE "public"."staff_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."student_documents" TO "anon";
GRANT ALL ON TABLE "public"."student_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."student_documents" TO "service_role";



GRANT ALL ON TABLE "public"."student_transport" TO "anon";
GRANT ALL ON TABLE "public"."student_transport" TO "authenticated";
GRANT ALL ON TABLE "public"."student_transport" TO "service_role";



GRANT ALL ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";



GRANT ALL ON TABLE "public"."submissions" TO "anon";
GRANT ALL ON TABLE "public"."submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."system_announcements" TO "anon";
GRANT ALL ON TABLE "public"."system_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."system_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."system_health_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_health_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_health_logs" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."system_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."system_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."system_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."timeline_events" TO "anon";
GRANT ALL ON TABLE "public"."timeline_events" TO "authenticated";
GRANT ALL ON TABLE "public"."timeline_events" TO "service_role";



GRANT ALL ON TABLE "public"."timeline_records" TO "anon";
GRANT ALL ON TABLE "public"."timeline_records" TO "authenticated";
GRANT ALL ON TABLE "public"."timeline_records" TO "service_role";



GRANT ALL ON TABLE "public"."user_notifications" TO "anon";
GRANT ALL ON TABLE "public"."user_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."visitors" TO "anon";
GRANT ALL ON TABLE "public"."visitors" TO "authenticated";
GRANT ALL ON TABLE "public"."visitors" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































