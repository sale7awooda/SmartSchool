-- ==============================================================================
-- DATABASE MIGRATE V18 (Sprint 2 Multi-Tenancy RLS Updates)
-- Updates all row-level security policies to enforce school isolation.
-- ==============================================================================

DO $$
DECLARE
  tbl TEXT;
  tables_to_migrate TEXT[] := ARRAY[
    'users', 'academic_years', 'classes', 'subjects', 'students', 
    'parent_student', 'assessment_questions', 'assessments', 'attendance', 
    'behavior_records', 'broadcasts', 'bus_routes', 'bus_stops', 
    'fee_items', 'financials', 'inventory', 'fee_invoices', 'fee_payments', 
    'leave_requests', 'messages', 'notices', 'payslips', 'schedules', 
    'student_transport', 'submissions', 'system_settings', 'timeline_events', 
    'visitors', 'staff_attendance', 'grades', 'schedule_drafts', 'audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_migrate LOOP
    -- Enable RLS just in case it wasn't
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    
    -- Drop old permissive policies and standard bypass policies
    EXECUTE format('DROP POLICY IF EXISTS "permissive_all" ON public.%I', tbl);
  END LOOP;
END $$;

-- Specifically for 'users'
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_current_school_id() AND
    (id = auth.uid() OR public.get_current_user_role() IN ('admin', 'teacher', 'staff', 'accountant'))
  );

DROP POLICY IF EXISTS "users_update_policy" ON public.users;
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE TO authenticated
  USING (
    school_id = public.get_current_school_id() AND
    (id = auth.uid() OR public.get_current_user_role() = 'admin')
  )
  WITH CHECK (
    school_id = public.get_current_school_id() AND
    (id = auth.uid() OR public.get_current_user_role() = 'admin')
  );

DROP POLICY IF EXISTS "users_admin_manage_policy" ON public.users;
CREATE POLICY "users_admin_manage_policy" ON public.users
  FOR ALL TO authenticated
  USING (school_id = public.get_current_school_id() AND public.get_current_user_role() = 'admin')
  WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_user_role() = 'admin');

-- General policies for tables where admins can do anything, and others have select access
DO $$
DECLARE
  tbl TEXT;
  general_tables TEXT[] := ARRAY[
    'academic_years', 'classes', 'subjects', 'students', 
    'parent_student', 'fee_items', 'financials', 'inventory', 
    'bus_routes', 'bus_stops', 'timeline_events', 
    'behavior_records', 'notices', 'messages', 'schedules', 
    'schedule_drafts', 'staff_attendance', 'grades', 'leave_requests', 
    'payslips', 'student_transport', 'broadcasts'
  ];
BEGIN
  FOREACH tbl IN ARRAY general_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_all" ON public.%I', tbl);
    EXECUTE format('
      CREATE POLICY "tenant_isolation_all" ON public.%I 
      FOR ALL TO authenticated 
      USING (school_id = public.get_current_school_id())
      WITH CHECK (school_id = public.get_current_school_id())
    ', tbl);
  END LOOP;
END $$;

-- Fine-grained overrides if necessary can be added later, but for now
-- tenant_isolation_all enforces the hard boundary for standard authenticated users.
-- Role-based constraints are currently heavily enforced via the frontend UI and server actions where appropriate,
-- but the baseline isolation prevents cross-school data leakage.

-- For fee_invoices and fee_payments
DROP POLICY IF EXISTS "invoices_manage_policy" ON public.fee_invoices;
DROP POLICY IF EXISTS "invoices_student_select" ON public.fee_invoices;
DROP POLICY IF EXISTS "invoices_parent_select" ON public.fee_invoices;

CREATE POLICY "tenant_isolation_all" ON public.fee_invoices 
  FOR ALL TO authenticated 
  USING (school_id = public.get_current_school_id())
  WITH CHECK (school_id = public.get_current_school_id());

CREATE POLICY "tenant_isolation_all" ON public.fee_payments 
  FOR ALL TO authenticated 
  USING (school_id = public.get_current_school_id())
  WITH CHECK (school_id = public.get_current_school_id());

-- For attendance
DROP POLICY IF EXISTS "attendance_manage_policy" ON public.attendance;
DROP POLICY IF EXISTS "attendance_student_select" ON public.attendance;
DROP POLICY IF EXISTS "attendance_parent_select" ON public.attendance;

CREATE POLICY "tenant_isolation_all" ON public.attendance 
  FOR ALL TO authenticated 
  USING (school_id = public.get_current_school_id())
  WITH CHECK (school_id = public.get_current_school_id());

-- For assessments
DROP POLICY IF EXISTS "assessments_manage_policy" ON public.assessments;
DROP POLICY IF EXISTS "assessments_select_all" ON public.assessments;

CREATE POLICY "tenant_isolation_all" ON public.assessments 
  FOR ALL TO authenticated 
  USING (school_id = public.get_current_school_id())
  WITH CHECK (school_id = public.get_current_school_id());

CREATE POLICY "tenant_isolation_all" ON public.assessment_questions 
  FOR ALL TO authenticated 
  USING (school_id = public.get_current_school_id())
  WITH CHECK (school_id = public.get_current_school_id());

CREATE POLICY "tenant_isolation_all" ON public.submissions
  FOR ALL TO authenticated 
  USING (school_id = public.get_current_school_id())
  WITH CHECK (school_id = public.get_current_school_id());
  
-- Audit logs should be fully isolated by school too
DROP POLICY IF EXISTS "Super admin can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "tenant_isolation_all" ON public.audit_logs 
  FOR ALL TO authenticated 
  USING (school_id = public.get_current_school_id())
  WITH CHECK (school_id = public.get_current_school_id());

-- Visitors
CREATE POLICY "tenant_isolation_all" ON public.visitors 
  FOR ALL TO authenticated 
  USING (school_id = public.get_current_school_id())
  WITH CHECK (school_id = public.get_current_school_id());

-- To allow superadmin role across all schools (optional, but requested later)
-- CREATE POLICY "superadmin_bypass" ON public.users FOR ALL USING (public.get_current_user_role() = 'superadmin');
