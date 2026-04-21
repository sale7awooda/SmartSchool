-- ==========================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Apply these policies directly in the Supabase SQL Editor
-- to strictly secure the generic read operations in the school system.

-- 1. Securing the Core USERS Table
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Admins and Accountants can read all users
CREATE POLICY "Admins and Accountants can read all users" 
ON "users" FOR SELECT 
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'accountant', 'principal', 'superintendent')
);

-- Teachers can read all students, staff, and parents
CREATE POLICY "Teachers can read relevant users" 
ON "users" FOR SELECT 
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'teacher' 
  AND role IN ('student', 'parent', 'staff', 'teacher')
);

-- Users can always read their own profile
CREATE POLICY "Users can read own profile" 
ON "users" FOR SELECT 
TO authenticated
USING (id = auth.uid());


-- 2. Securing the STUDENTS Table
ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;

-- Admins and Teachers can read all students
CREATE POLICY "Staff can view all students" 
ON "students" FOR SELECT 
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher', 'accountant')
);

-- Parents can only view their linked students
CREATE POLICY "Parents can view linked students" 
ON "students" FOR SELECT 
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'parent' AND
  id IN (SELECT student_id FROM parent_student WHERE parent_id = auth.uid())
);

-- Students can only view themselves
CREATE POLICY "Students can view themselves" 
ON "students" FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()
);


-- 3. Securing SUBMISSIONS and GRADES
ALTER TABLE "assessment_submissions" ENABLE ROW LEVEL SECURITY;

-- Teachers and Admins can view all submissions
CREATE POLICY "Staff can view all submissions" 
ON "assessment_submissions" FOR SELECT 
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher')
);

-- Students can only view their own grades
CREATE POLICY "Students can view own grades" 
ON "assessment_submissions" FOR SELECT 
TO authenticated
USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);

-- Parents can only view their children's grades
CREATE POLICY "Parents can view children grades" 
ON "assessment_submissions" FOR SELECT 
TO authenticated
USING (
  student_id IN (SELECT student_id FROM parent_student WHERE parent_id = auth.uid())
);


-- 4. Securing COMMUNICATIONS (Messages & Notices)
ALTER TABLE "notices" ENABLE ROW LEVEL SECURITY;

-- A user can see a notice if it's 'all' or matches their role
CREATE POLICY "Users view relevant notices" 
ON "notices" FOR SELECT 
TO authenticated
USING (
  target_audience = 'all' OR 
  target_audience = (SELECT role FROM users WHERE id = auth.uid()) OR
  ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'principal', 'accountant'))
);


ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;

-- Users can only read messages where they are sender or receiver
CREATE POLICY "Strict isolated message reading" 
ON "messages" FOR SELECT 
TO authenticated
USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);
