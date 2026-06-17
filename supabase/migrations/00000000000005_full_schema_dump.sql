-- Smart School Management System — Full Schema Dump (v2)
-- Generated: 2026-06-17T13:00:00.000Z
-- This file contains the complete public schema definition.
-- Includes migration 00000000000004 columns: bus_routes.bus_number, bus_routes.status,
-- bus_routes.current_location, bus_routes.live_status, bus_stops.student_id,
-- bus_stops.order_index, bus_stops.arrival_time.

-- Helper function for RLS tenant isolation
CREATE OR REPLACE FUNCTION public.get_current_school_id()
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT school_id FROM public.users WHERE id = auth.uid();
$function$


-- Helper function for RLS role checks
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.users WHERE id = auth.uid();
$function$


-- ============================================
-- ENUMS
-- ============================================
-- ============================================
-- TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS "academic_enrollments" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "student_id" uuid,
  "academic_year" text NOT NULL,
  "grade" text NOT NULL,
  "status" text DEFAULT 'active'::text,
  "created_at" timestamp with time zone DEFAULT now()
, PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "academic_years" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name" text NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "is_active" boolean DEFAULT false,
  "is_deleted" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "academic_years_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "academic_years_name_key" UNIQUE ("name")
);
CREATE UNIQUE INDEX academic_years_name_key ON public.academic_years USING btree (name);
CREATE TABLE IF NOT EXISTS "assessment_questions" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "assessment_id" uuid,
  "question" text NOT NULL,
  "type" text,
  "options" jsonb,
  "correct_answer" text,
  "points" integer,
  "order" integer,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "assessment_questions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
);
CREATE TABLE IF NOT EXISTS "assessments" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "title" text NOT NULL,
  "description" text,
  "subject_id" uuid,
  "class_id" uuid,
  "date" date,
  "duration" integer,
  "status" text,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "assessments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id")
, CONSTRAINT "assessments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "assessments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
);
CREATE TABLE IF NOT EXISTS "attendance" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "student_id" uuid,
  "date" date,
  "status" text,
  "notes" text,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "attendance_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id")
);
CREATE INDEX idx_attendance_date ON public.attendance USING btree (date);
CREATE INDEX idx_attendance_student_id ON public.attendance USING btree (student_id);
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "action" text NOT NULL,
  "details" text,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "audit_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
);
CREATE TABLE IF NOT EXISTS "behavior_records" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "student_id" uuid,
  "date" date,
  "incident" text,
  "severity" text,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "behavior_records_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "behavior_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id")
);
CREATE TABLE IF NOT EXISTS "books" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "title" text NOT NULL,
  "author" text NOT NULL,
  "isbn" text,
  "category" text,
  "total_copies" integer DEFAULT 1,
  "available_copies" integer DEFAULT 1,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid
, PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "broadcasts" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "title" text NOT NULL,
  "message" text NOT NULL,
  "target_audience" text[],
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "broadcasts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id")
, CONSTRAINT "broadcasts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
);
CREATE TABLE IF NOT EXISTS "bus_routes" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name" text NOT NULL,
  "driver_id" uuid,
  "vehicle_number" text,
  "capacity" integer,
  "attendant_id" uuid,
  "route_number" text,
  "bus_number" text,
  "status" text DEFAULT 'Not Started'::text,
  "current_location" text,
  "live_status" text,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "bus_routes_attendant_id_fkey" FOREIGN KEY ("attendant_id") REFERENCES "users"("id")
, CONSTRAINT "bus_routes_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id")
, CONSTRAINT "bus_routes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
);
CREATE TABLE IF NOT EXISTS "bus_stops" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "route_id" uuid,
  "name" text NOT NULL,
  "time" time without time zone,
  "latitude" double precision,
  "longitude" double precision,
  "student_id" uuid,
  "order_index" integer DEFAULT 0,
  "arrival_time" text,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "bus_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "bus_routes"("id")
, CONSTRAINT "bus_stops_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "bus_stops_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "classes" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name" text NOT NULL,
  "capacity" integer,
  "is_deleted" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
);
CREATE TABLE IF NOT EXISTS "courses" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name" text NOT NULL,
  "code" text,
  "teacher_id" uuid,
  "grade" text NOT NULL,
  "academic_year" text NOT NULL
, PRIMARY KEY ("id")
, CONSTRAINT "courses_code_key" UNIQUE ("code")
);
CREATE UNIQUE INDEX courses_code_key ON public.courses USING btree (code);
CREATE TABLE IF NOT EXISTS "fee_invoices" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "student_id" uuid,
  "academic_year" text,
  "description" text,
  "amount" numeric(12,2) NOT NULL,
  "due_date" date NOT NULL,
  "status" text DEFAULT 'pending'::text,
  "paid_at" timestamp with time zone,
  "payment_method" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "title" text DEFAULT 'General Tuition Fee'::text,
  "balance_due" numeric,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "fee_invoices_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "chk_balance_nonnegative" CHECK CHECK ((balance_due >= (0)::numeric))
);
CREATE TABLE IF NOT EXISTS "fee_items" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name" text NOT NULL,
  "amount" numeric NOT NULL,
  "type" text,
  "category" text,
  "frequency" text,
  "due_date" date,
  "created_at" timestamp with time zone DEFAULT now(),
  "grade" text DEFAULT 'All'::text,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "fee_items_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
);
CREATE TABLE IF NOT EXISTS "fee_payments" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "invoice_id" uuid,
  "amount" numeric(12,2) NOT NULL,
  "payment_method" text NOT NULL,
  "reference_number" text,
  "recorded_by" uuid,
  "payment_date" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "fee_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "fee_invoices"("id")
, CONSTRAINT "fee_payments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
);
CREATE TABLE IF NOT EXISTS "financials" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "type" text NOT NULL,
  "category" text,
  "amount" numeric,
  "date" date,
  "description" text,
  "status" text,
  "staff_id" uuid,
  "user_id" uuid,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "financials_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "financials_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id")
, CONSTRAINT "financials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id")
);
CREATE TABLE IF NOT EXISTS "grades" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "student_id" uuid,
  "subject_id" uuid,
  "academic_year" text NOT NULL,
  "term" text NOT NULL,
  "score" numeric NOT NULL,
  "score_max" numeric NOT NULL DEFAULT 100,
  "assessment_id" uuid,
  "remarks" text,
  "graded_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid,
  "comments" text
, PRIMARY KEY ("id")
, CONSTRAINT "grades_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id")
, CONSTRAINT "grades_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "users"("id")
, CONSTRAINT "grades_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id")
, CONSTRAINT "grades_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
, CONSTRAINT "grades_student_id_subject_id_academic_year_term_key" UNIQUE ("student_id", "subject_id", "academic_year", "term")
);
CREATE UNIQUE INDEX grades_student_id_subject_id_academic_year_term_key ON public.grades USING btree (student_id, subject_id, academic_year, term);
CREATE TABLE IF NOT EXISTS "inventory" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name" text NOT NULL,
  "category" text,
  "quantity" integer,
  "status" text,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "inventory_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
);
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "student_id" uuid,
  "amount" numeric,
  "status" text,
  "due_date" date
, PRIMARY KEY ("id")
, CONSTRAINT "invoices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id")
);
CREATE TABLE IF NOT EXISTS "leave_requests" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id" uuid,
  "start_date" date,
  "end_date" date,
  "reason" text,
  "status" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "staff_id" uuid,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "leave_requests_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "leave_requests_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id")
, CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id")
);
CREATE TABLE IF NOT EXISTS "medical_records" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "student_id" uuid,
  "blood_group" text,
  "allergies" text,
  "conditions" text,
  "emergency_contact" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
, PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "sender_id" uuid,
  "receiver_id" uuid,
  "content" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id")
, CONSTRAINT "messages_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id")
, CONSTRAINT "messages_payload_exclusive" CHECK CHECK (((payload IS NULL) OR (binary_payload IS NULL))) NOT VALID
);
CREATE INDEX idx_messages_receiver ON public.messages USING btree (receiver_id);
CREATE TABLE IF NOT EXISTS "notices" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "title" text NOT NULL,
  "content" text,
  "role_target" text[],
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id")
, CONSTRAINT "notices_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
);
CREATE TABLE IF NOT EXISTS "parent_student" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "parent_id" uuid,
  "student_id" uuid,
  "relation" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "parent_student_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id")
, CONSTRAINT "parent_student_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "parent_student_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id")
);
CREATE TABLE IF NOT EXISTS "payslips" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "staff_id" uuid,
  "month" text,
  "amount" numeric,
  "status" text,
  "date" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "payslips_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "payslips_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id")
);
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" text NOT NULL,
  "user_id" uuid,
  "user_role" text NOT NULL,
  "user_name" text NOT NULL,
  "endpoint" text NOT NULL,
  "keys" jsonb NOT NULL,
  "subscribed_at" timestamp with time zone DEFAULT now(),
  "last_used_at" timestamp with time zone DEFAULT now()
, PRIMARY KEY ("id")
, CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id")
, CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint")
);
CREATE INDEX idx_push_user_id ON public.push_subscriptions USING btree (user_id);
CREATE INDEX idx_push_user_role ON public.push_subscriptions USING btree (user_role);
CREATE UNIQUE INDEX push_subscriptions_endpoint_key ON public.push_subscriptions USING btree (endpoint);
CREATE TABLE IF NOT EXISTS "questions" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "assessment_id" uuid,
  "text" text NOT NULL,
  "type" text NOT NULL,
  "options" jsonb,
  "correct_answer" text,
  "correct_answers" jsonb,
  "marks" integer DEFAULT 1,
  "created_at" timestamp with time zone DEFAULT now()
, PRIMARY KEY ("id")
, CONSTRAINT "questions_type_check" CHECK CHECK ((type = ANY (ARRAY['multiple_choice'::text, 'true_false'::text, 'multiple_response'::text, 'short_answer'::text])))
);
CREATE TABLE IF NOT EXISTS "schedule_drafts" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name" text NOT NULL,
  "constraints" jsonb NOT NULL,
  "mappings" jsonb NOT NULL,
  "schedule" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "created_by" uuid,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "schedule_drafts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "schedule_drafts_name_key" UNIQUE ("name")
);
CREATE UNIQUE INDEX schedule_drafts_name_key ON public.schedule_drafts USING btree (name);
CREATE TABLE IF NOT EXISTS "schedules" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "class_id" uuid,
  "subject_id" uuid,
  "teacher_id" uuid,
  "day_of_week" text,
  "start_time" time without time zone,
  "end_time" time without time zone,
  "period" integer,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "schedules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id")
, CONSTRAINT "schedules_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "schedules_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
, CONSTRAINT "schedules_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id")
, CONSTRAINT "schedules_class_id_day_of_week_period_key" UNIQUE ("class_id", "day_of_week", "period")
);
CREATE UNIQUE INDEX schedules_class_id_day_of_week_period_key ON public.schedules USING btree (class_id, day_of_week, period);
CREATE TABLE IF NOT EXISTS "schools" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "subdomain" text,
  "address" text,
  "phone" text,
  "email" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "currency" text DEFAULT 'USD'::text,
  "timezone" text DEFAULT 'UTC'::text,
  "subscription_tier" text DEFAULT 'free'::text,
  "is_active" boolean DEFAULT true,
  "logo_url" text
, PRIMARY KEY ("id")
, CONSTRAINT "schools_subdomain_key" UNIQUE ("subdomain")
);
CREATE UNIQUE INDEX schools_subdomain_key ON public.schools USING btree (subdomain);
CREATE TABLE IF NOT EXISTS "staff_attendance" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "staff_id" uuid,
  "date" date NOT NULL,
  "status" text NOT NULL,
  "time_in" text,
  "time_out" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "staff_attendance_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "staff_attendance_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id")
, CONSTRAINT "staff_attendance_staff_id_date_key" UNIQUE ("staff_id", "date")
);
CREATE UNIQUE INDEX staff_attendance_staff_id_date_key ON public.staff_attendance USING btree (staff_id, date);
CREATE TABLE IF NOT EXISTS "student_documents" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "student_id" uuid,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "file_url" text NOT NULL,
  "uploaded_by" uuid,
  "created_at" timestamp with time zone DEFAULT now()
, PRIMARY KEY ("id")
, CONSTRAINT "student_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id")
, CONSTRAINT "student_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id")
);
CREATE TABLE IF NOT EXISTS "student_transport" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "student_id" uuid,
  "route_id" uuid,
  "stop_id" uuid,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "student_transport_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "bus_routes"("id")
, CONSTRAINT "student_transport_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "student_transport_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "bus_stops"("id")
, CONSTRAINT "student_transport_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id")
);
CREATE TABLE IF NOT EXISTS "students" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id" uuid,
  "name" text NOT NULL,
  "grade" text NOT NULL,
  "roll_number" text,
  "academic_year" text,
  "gender" text,
  "dob" date,
  "address" text,
  "fee_structure" text,
  "additional_info" text,
  "is_deleted" boolean DEFAULT false,
  "deleted_reason" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "joining_date" date,
  "discount_percentage" numeric DEFAULT 0,
  "total_due" numeric DEFAULT 0,
  "total_paid" numeric DEFAULT 0,
  "custom_tuition_amount" numeric,
  "base_fee_amount" numeric,
  "payment_structure" character varying(50),
  "is_custom_fee" boolean DEFAULT false,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id")
);
CREATE TABLE IF NOT EXISTS "subjects" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name" text NOT NULL,
  "code" text,
  "is_deleted" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
);
CREATE TABLE IF NOT EXISTS "submissions" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "assessment_id" uuid,
  "student_id" uuid,
  "score" integer,
  "answers" jsonb,
  "status" text,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "submissions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id")
, CONSTRAINT "submissions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id")
);
CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" integer NOT NULL DEFAULT nextval('system_settings_id_seq'::regclass),
  "school_name" text,
  "address" text,
  "phone" text,
  "email" text,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "system_settings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
);
CREATE TABLE IF NOT EXISTS "timeline_events" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "student_id" uuid,
  "date" date,
  "title" text,
  "description" text,
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "timeline_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "timeline_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id")
);
CREATE TABLE IF NOT EXISTS "timeline_records" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "student_id" uuid,
  "title" text NOT NULL,
  "description" text,
  "date" date NOT NULL DEFAULT CURRENT_DATE,
  "type" text,
  "created_at" timestamp with time zone DEFAULT now()
, PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "user_notifications" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id" uuid,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "url" text,
  "type" text DEFAULT 'info'::text,
  "status" text DEFAULT 'unread'::text,
  "created_at" timestamp with time zone DEFAULT now()
, PRIMARY KEY ("id")
, CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id")
);
CREATE INDEX idx_user_notifications_status ON public.user_notifications USING btree (status);
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications USING btree (user_id);
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "role" text NOT NULL,
  "student_id" uuid,
  "avatar_url" text,
  "phone" text,
  "address" text,
  "department" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "designation" text,
  "date_of_join" date,
  "salary" numeric,
  "can_mark_attendance" boolean DEFAULT false,
  "education" text,
  "dob" date,
  "gender" text,
  "extra_info" text,
  "school_id" uuid NOT NULL DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id")
, CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
, CONSTRAINT "users_email_key" UNIQUE ("email")
, CONSTRAINT "users_phone_key" UNIQUE ("phone")
, CONSTRAINT "users_email_change_confirm_status_check" CHECK CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
, CONSTRAINT "users_role_check" CHECK CHECK ((role = ANY (ARRAY['admin'::text, 'teacher'::text, 'parent'::text, 'student'::text, 'staff'::text, 'accountant'::text])))
);
CREATE INDEX idx_users_role ON public.users USING btree (role);
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
CREATE TABLE IF NOT EXISTS "visitors" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name" text NOT NULL,
  "purpose" text,
  "check_in" timestamp with time zone,
  "check_out" timestamp with time zone,
  "status" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
, PRIMARY KEY ("id")
, CONSTRAINT "visitors_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id")
);

-- ============================================
-- RLS
-- ============================================
-- Enable RLS
ALTER TABLE IF EXISTS "academic_enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "academic_years" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "assessment_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "behavior_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "books" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "broadcasts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "bus_routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "bus_stops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "fee_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "fee_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "fee_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "financials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "leave_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "medical_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "notices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "parent_student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "payslips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "schedule_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "schools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "staff_attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "student_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "student_transport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "system_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "timeline_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "timeline_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "user_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "visitors" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_academic_enrollments" ON "academic_enrollments"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = academic_enrollments.student_id) AND (s.school_id = get_current_school_id())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = academic_enrollments.student_id) AND (s.school_id = get_current_school_id())))));
CREATE POLICY "tenant_isolation_all" ON "academic_years"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "assessment_questions"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "assessments"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "attendance"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "audit_logs"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "behavior_records"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_books" ON "books"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "broadcasts"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "bus_routes"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "bus_stops"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "classes"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_courses" ON "courses"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = courses.teacher_id) AND (u.school_id = get_current_school_id())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = courses.teacher_id) AND (u.school_id = get_current_school_id())))));
CREATE POLICY "tenant_isolation_all" ON "fee_invoices"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "fee_items"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "fee_payments"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "financials"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "grades"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "inventory"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_invoices" ON "invoices"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = invoices.student_id) AND (s.school_id = get_current_school_id())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = invoices.student_id) AND (s.school_id = get_current_school_id())))));
CREATE POLICY "tenant_isolation_all" ON "leave_requests"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_medical_records" ON "medical_records"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = medical_records.student_id) AND (s.school_id = get_current_school_id())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = medical_records.student_id) AND (s.school_id = get_current_school_id())))));
CREATE POLICY "tenant_isolation_all" ON "messages"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "notices"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "parent_student"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "payslips"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "Allow admins to view all push subscriptions" ON "push_subscriptions"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));
CREATE POLICY "Allow individuals to manage their own push subscriptions" ON "push_subscriptions"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "tenant_isolation_questions" ON "questions"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM assessments a
  WHERE ((a.id = questions.assessment_id) AND (a.school_id = get_current_school_id())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM assessments a
  WHERE ((a.id = questions.assessment_id) AND (a.school_id = get_current_school_id())))));
CREATE POLICY "tenant_isolation_all" ON "schedule_drafts"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "schedules"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "schools_admin_update_policy" ON "schools"
  FOR UPDATE
  TO "authenticated"
  USING (((id = get_current_school_id()) AND (get_current_user_role() = 'admin'::text)))
  WITH CHECK (((id = get_current_school_id()) AND (get_current_user_role() = 'admin'::text)));
CREATE POLICY "schools_select_policy" ON "schools"
  FOR SELECT
  TO "authenticated"
  USING ((id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "staff_attendance"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "Admins can manage all student documents" ON "student_documents"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));
CREATE POLICY "Parents can view their student documents" ON "student_documents"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM parent_student ps
  WHERE ((ps.student_id = student_documents.student_id) AND (ps.parent_id = auth.uid())))));
CREATE POLICY "Students can view their own documents" ON "student_documents"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_documents.student_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "tenant_isolation_all" ON "student_transport"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "students"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "subjects"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "submissions"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_system_settings" ON "system_settings"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_all" ON "timeline_events"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));
CREATE POLICY "tenant_isolation_timeline_records" ON "timeline_records"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = timeline_records.student_id) AND (s.school_id = get_current_school_id())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = timeline_records.student_id) AND (s.school_id = get_current_school_id())))));
CREATE POLICY "System can insert notifications" ON "user_notifications"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);
CREATE POLICY "Users can update their own notifications (mark as read)" ON "user_notifications"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own notifications" ON "user_notifications"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));
CREATE POLICY "users_admin_manage_policy" ON "users"
  FOR ALL
  TO "authenticated"
  USING (((school_id = get_current_school_id()) AND (get_current_user_role() = 'admin'::text)))
  WITH CHECK (((school_id = get_current_school_id()) AND (get_current_user_role() = 'admin'::text)));
CREATE POLICY "users_select_policy" ON "users"
  FOR SELECT
  TO "authenticated"
  USING (((school_id = get_current_school_id()) AND ((id = auth.uid()) OR (get_current_user_role() = ANY (ARRAY['admin'::text, 'teacher'::text, 'staff'::text, 'accountant'::text])))));
CREATE POLICY "users_update_policy" ON "users"
  FOR UPDATE
  TO "authenticated"
  USING (((school_id = get_current_school_id()) AND ((id = auth.uid()) OR (get_current_user_role() = 'admin'::text))))
  WITH CHECK (((school_id = get_current_school_id()) AND ((id = auth.uid()) OR (get_current_user_role() = 'admin'::text))));
CREATE POLICY "tenant_isolation_all" ON "visitors"
  FOR ALL
  TO "authenticated"
  USING ((school_id = get_current_school_id()))
  WITH CHECK ((school_id = get_current_school_id()));

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER trigger_sync_ledger BEFORE INSERT OR DELETE OR UPDATE ON public.fee_invoices FOR EACH ROW EXECUTE FUNCTION sync_student_ledger_on_invoice_change();
CREATE TRIGGER trg_recompute_balance AFTER INSERT OR DELETE OR UPDATE ON public.fee_payments FOR EACH ROW EXECUTE FUNCTION recompute_balance_due();
