-- ==========================================
-- FINAL SCHEMA FIX & RLS POLICIES
-- ==========================================
-- Run this in the Supabase SQL Editor to fix table columns and set up correct RLS policies.

-- 1. Ensure students table has user_id
DO $$ 
BEGIN 
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='students' AND table_schema='public') THEN
    -- Check if column user_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND table_schema='public' AND column_name='user_id') THEN
      ALTER TABLE public.students ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
  ELSE
    -- Create table if it doesn't exist
    CREATE TABLE public.students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      grade TEXT NOT NULL,
      roll_number TEXT UNIQUE NOT NULL,
      dob DATE,
      gender TEXT,
      address TEXT,
      academic_year TEXT,
      fee_structure TEXT,
      additional_info TEXT,
      is_deleted BOOLEAN DEFAULT false,
      deleted_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

-- 2. Ensure users table has student_id (optional back-reference)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND table_schema='public' AND column_name='student_id') THEN
    ALTER TABLE public.users ADD COLUMN student_id UUID;
  END IF;
END $$;

-- 3. Ensure grades and submissions tables exist
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC,
  remarks TEXT,
  graded_by UUID REFERENCES public.users(id),
  graded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assessment_id, student_id)
);

-- 4. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student ENABLE ROW LEVEL SECURITY;

-- 5. Policies for public.users
DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Admins and Accountants can read all users" ON public.users;
    DROP POLICY IF EXISTS "Teachers can read relevant users" ON public.users;
    DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
EXCEPTION WHEN others THEN NULL;
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

-- 6. Policies for public.students
DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Staff can view all students" ON public.students;
    DROP POLICY IF EXISTS "Parents can view linked students" ON public.students;
    DROP POLICY IF EXISTS "Students can view themselves" ON public.students;
EXCEPTION WHEN others THEN NULL;
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

-- 7. Policies for public.grades
DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Staff can view all grades" ON public.grades;
    DROP POLICY IF EXISTS "Students can view own grades" ON public.grades;
    DROP POLICY IF EXISTS "Parents can view children grades" ON public.grades;
EXCEPTION WHEN others THEN NULL;
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

-- 8. Policies for notices
DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Users view relevant notices" ON public.notices;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE POLICY "Users view relevant notices" 
ON public.notices FOR SELECT 
TO authenticated
USING (
  target_audience = 'all' OR 
  target_audience = (SELECT role FROM public.users WHERE id = auth.uid()) OR
  ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'principal', 'accountant'))
);

-- 9. Policies for messages
DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Strict isolated message reading" ON public.messages;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE POLICY "Strict isolated message reading" 
ON public.messages FOR SELECT 
TO authenticated
USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);

-- 10. Ensure audit_logs table exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  action_type TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE POLICY "Admins can view audit logs" 
ON public.audit_logs FOR SELECT 
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'principal')
);

CREATE POLICY "Users can insert audit logs" 
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- 11. Fee Management Policies
CREATE TABLE IF NOT EXISTS public.fee_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure fee_invoices and fee_payments exist if they don't
CREATE TABLE IF NOT EXISTS public.fee_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id),
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  description TEXT,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.fee_invoices(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  reference_number TEXT,
  recorded_by UUID REFERENCES public.users(id),
  payment_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Allow all to view fee items" ON public.fee_items;
    DROP POLICY IF EXISTS "Allow staff to manage fee items" ON public.fee_items;
    DROP POLICY IF EXISTS "Staff can view all invoices" ON public.fee_invoices;
    DROP POLICY IF EXISTS "Parents can view their children's invoices" ON public.fee_invoices;
    DROP POLICY IF EXISTS "Staff can manage invoices" ON public.fee_invoices;
    DROP POLICY IF EXISTS "Staff can view all payments" ON public.fee_payments;
    DROP POLICY IF EXISTS "Staff can record payments" ON public.fee_payments;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE POLICY "Allow all to view fee items" 
ON public.fee_items FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow staff to manage fee items" 
ON public.fee_items FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'accountant', 'principal')
);

CREATE POLICY "Staff can view all invoices" 
ON public.fee_invoices FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'accountant', 'principal')
);

CREATE POLICY "Parents can view their children's invoices" 
ON public.fee_invoices FOR SELECT 
TO authenticated 
USING (
  student_id IN (SELECT student_id FROM public.parent_student WHERE parent_id = auth.uid())
);

CREATE POLICY "Staff can manage invoices" 
ON public.fee_invoices FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'accountant', 'principal')
);

CREATE POLICY "Staff can view all payments" 
ON public.fee_payments FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'accountant', 'principal')
);

CREATE POLICY "Staff can record payments" 
ON public.fee_payments FOR INSERT 
TO authenticated 
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'accountant', 'principal')
);

-- 12. Fix for the PostgREST cache issue:
NOTIFY pgrst, 'reload schema';
