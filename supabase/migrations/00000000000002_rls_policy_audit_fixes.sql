-- RLS Policy Audit Fixes
-- ========================
-- 1. Add tenant_isolation policies to 7 orphan tables (RLS enabled, zero policies)
-- 2. Drop duplicate "Allow all" policies on assessment_questions, assessments, submissions
-- 3. Replace invoices and schedule_drafts public policies with school_id-based ones
-- 4. Add NOT NULL constraint on school_id in users table

-- ========================
-- 4. Add NOT NULL on users.school_id (role is already NOT NULL)
-- ========================
ALTER TABLE public.users ALTER COLUMN school_id SET NOT NULL;

-- ========================
-- 2. Drop duplicate "Allow all" policies
-- ========================

-- assessment_questions: keep tenant_isolation_all, drop the two redundant ones
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.assessment_questions;
DROP POLICY IF EXISTS "Enable all for authenticated users temporarily" ON public.assessment_questions;

-- assessments: keep tenant_isolation_all, drop the broad one
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.assessments;

-- submissions: keep tenant_isolation_all, drop the broad one
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.submissions;

-- ========================
-- 3. Replace permissive policies on invoices and schedule_drafts
-- ========================

-- invoices: drop permissive_all, add school_id-based policy (via student join)
DROP POLICY IF EXISTS "permissive_all" ON public.invoices;
CREATE POLICY "tenant_isolation_invoices" ON public.invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = invoices.student_id
        AND s.school_id = get_current_school_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = invoices.student_id
        AND s.school_id = get_current_school_id()
    )
  );

-- schedule_drafts: drop "Allow full access", the existing tenant_isolation_all covers authenticated users
DROP POLICY IF EXISTS "Allow full access to schedule drafts" ON public.schedule_drafts;

-- ========================
-- 1. Add RLS policies to orphan tables
-- ========================

-- academic_enrollments: join through students.student_id -> students -> school_id
CREATE POLICY "tenant_isolation_academic_enrollments" ON public.academic_enrollments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = academic_enrollments.student_id
        AND s.school_id = get_current_school_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = academic_enrollments.student_id
        AND s.school_id = get_current_school_id()
    )
  );

-- books: needs school_id column added first (no FK to user/student)
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS school_id uuid;
CREATE POLICY "tenant_isolation_books" ON public.books
  FOR ALL
  TO authenticated
  USING (school_id = get_current_school_id())
  WITH CHECK (school_id = get_current_school_id());

-- courses: join through courses.teacher_id -> users -> school_id
CREATE POLICY "tenant_isolation_courses" ON public.courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = courses.teacher_id
        AND u.school_id = get_current_school_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = courses.teacher_id
        AND u.school_id = get_current_school_id()
    )
  );

-- medical_records: join through medical_records.student_id -> students -> school_id
CREATE POLICY "tenant_isolation_medical_records" ON public.medical_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = medical_records.student_id
        AND s.school_id = get_current_school_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = medical_records.student_id
        AND s.school_id = get_current_school_id()
    )
  );

-- questions: join through questions.assessment_id -> assessments -> school_id
CREATE POLICY "tenant_isolation_questions" ON public.questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = questions.assessment_id
        AND a.school_id = get_current_school_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = questions.assessment_id
        AND a.school_id = get_current_school_id()
    )
  );

-- system_settings: has school_id column directly (already checked earlier)
CREATE POLICY "tenant_isolation_system_settings" ON public.system_settings
  FOR ALL
  TO authenticated
  USING (school_id = get_current_school_id())
  WITH CHECK (school_id = get_current_school_id());

-- timeline_records: join through timeline_records.student_id -> students -> school_id
CREATE POLICY "tenant_isolation_timeline_records" ON public.timeline_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = timeline_records.student_id
        AND s.school_id = get_current_school_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = timeline_records.student_id
        AND s.school_id = get_current_school_id()
    )
  );
