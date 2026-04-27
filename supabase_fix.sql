-- ==========================================
-- FINAL SCHEMA FIX & RLS POLICIES
-- ==========================================
-- Run this in the Supabase SQL Editor to fix table columns and set up correct RLS policies.

-- 1. Ensure students table has user_id
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND table_schema='public' AND column_name='user_id') THEN
    ALTER TABLE public.students ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Rename or ensure tables match the policies
-- If you have a table named "assessment_submissions", it should likely be "submissions" or "grades"
-- Based on our current schema, we use "grades" for assessment scores and "submissions" for actual work.

-- 3. Apply RLS to Correct Tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student ENABLE ROW LEVEL SECURITY;

-- 4. Polices for public.users
DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Admins and Accountants can read all users" ON public.users;
    DROP POLICY IF EXISTS "Teachers can read relevant users" ON public.users;
    DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
END $$;

CREATE POLICY "Admins and Accountants can read all users" 
ON public.users FOR SELECT 
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'accountant', 'principal', 'superintendent')
);

CREATE POLICY "Teachers can read relevant users" 
ON public.users FOR SELECT 
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher' 
  AND role IN ('student', 'parent', 'staff', 'teacher')
);

CREATE POLICY "Users can read own profile" 
ON public.users FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- 5. Policies for public.students
DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Staff can view all students" ON public.students;
    DROP POLICY IF EXISTS "Parents can view linked students" ON public.students;
    DROP POLICY IF EXISTS "Students can view themselves" ON public.students;
END $$;

CREATE POLICY "Staff can view all students" 
ON public.students FOR SELECT 
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'teacher', 'accountant', 'principal')
);

CREATE POLICY "Parents can view linked students" 
ON public.students FOR SELECT 
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'parent' AND
  id IN (SELECT student_id FROM public.parent_student WHERE parent_id = auth.uid())
);

CREATE POLICY "Students can view themselves" 
ON public.students FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR id IN (SELECT student_id FROM public.users WHERE id = auth.uid())
);

-- 6. Policies for GRADES (Replaces assessment_submissions in your script)
DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Staff can view all grades" ON public.grades;
    DROP POLICY IF EXISTS "Students can view own grades" ON public.grades;
    DROP POLICY IF EXISTS "Parents can view children grades" ON public.grades;
END $$;

CREATE POLICY "Staff can view all grades" 
ON public.grades FOR SELECT 
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'teacher', 'principal')
);

CREATE POLICY "Students can view own grades" 
ON public.grades FOR SELECT 
TO authenticated
USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "Parents can view children grades" 
ON public.grades FOR SELECT 
TO authenticated
USING (
  student_id IN (SELECT student_id FROM public.parent_student WHERE parent_id = auth.uid())
);

-- 7. Policies for NOTICES
DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Users view relevant notices" ON public.notices;
END $$;

CREATE POLICY "Users view relevant notices" 
ON public.notices FOR SELECT 
TO authenticated
USING (
  target_audience = 'all' OR 
  target_audience = (SELECT role FROM public.users WHERE id = auth.uid()) OR
  ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'principal', 'accountant'))
);

-- 8. Policies for MESSAGES
DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Strict isolated message reading" ON public.messages;
END $$;

CREATE POLICY "Strict isolated message reading" 
ON public.messages FOR SELECT 
TO authenticated
USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);

-- 9. Fix for the PostgREST cache issue:
-- Sometimes you need to notify PostgREST of schema changes
NOTIFY pgrst, 'reload schema';
