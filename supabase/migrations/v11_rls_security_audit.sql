-- ==============================================================================
-- DATABASE FIX V11 (RLS SECURITY AUDIT & STRICT ROLE-BASED POLICIES)
-- Execute this file in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Ensure RLS is active on target tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_invoices ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing permissive policies to prevent bypass
DROP POLICY IF EXISTS "permissive_all" ON users;
DROP POLICY IF EXISTS "permissive_all" ON attendance;
DROP POLICY IF EXISTS "permissive_all" ON assessments;
DROP POLICY IF EXISTS "permissive_all" ON fee_invoices;

-- 3. Security Definer Helper Function to query role without recursion
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. POLICIES FOR 'users' TABLE
CREATE POLICY "users_select_policy" ON users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR 
    get_current_user_role() IN ('admin', 'teacher', 'staff', 'accountant')
  );

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid() OR 
    get_current_user_role() = 'admin'
  )
  WITH CHECK (
    id = auth.uid() OR 
    get_current_user_role() = 'admin'
  );

CREATE POLICY "users_admin_manage_policy" ON users
  FOR ALL TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- 5. POLICIES FOR 'attendance' TABLE
CREATE POLICY "attendance_manage_policy" ON attendance
  FOR ALL TO authenticated
  USING (get_current_user_role() IN ('admin', 'teacher', 'staff'))
  WITH CHECK (get_current_user_role() IN ('admin', 'teacher', 'staff'));

CREATE POLICY "attendance_student_select" ON attendance
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'student' AND
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "attendance_parent_select" ON attendance
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'parent' AND
    student_id IN (SELECT student_id FROM parent_student WHERE parent_id = auth.uid())
  );

-- 6. POLICIES FOR 'assessments' TABLE
CREATE POLICY "assessments_manage_policy" ON assessments
  FOR ALL TO authenticated
  USING (get_current_user_role() IN ('admin', 'teacher'))
  WITH CHECK (get_current_user_role() IN ('admin', 'teacher'));

CREATE POLICY "assessments_select_all" ON assessments
  FOR SELECT TO authenticated
  USING (true);

-- 7. POLICIES FOR 'fee_invoices' TABLE
CREATE POLICY "invoices_manage_policy" ON fee_invoices
  FOR ALL TO authenticated
  USING (get_current_user_role() IN ('admin', 'accountant'))
  WITH CHECK (get_current_user_role() IN ('admin', 'accountant'));

CREATE POLICY "invoices_student_select" ON fee_invoices
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'student' AND
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "invoices_parent_select" ON fee_invoices
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'parent' AND
    student_id IN (SELECT student_id FROM parent_student WHERE parent_id = auth.uid())
  );
