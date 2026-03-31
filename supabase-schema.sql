-- Supabase Schema and RLS Policies for School Management System

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Tables

-- Drop existing users table to avoid conflict and allow full schema creation
-- WARNING: This will remove any existing data in the 'users' table.
DROP TABLE IF EXISTS public.users CASCADE;

-- Users Table (Extends Supabase Auth)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'accountant', 'staff', 'student', 'parent')),
  phone TEXT,
  student_id UUID, -- For parents/students linking to student record
  custom_permissions JSONB DEFAULT '{}'::jsonb, -- Overrides default role permissions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students Table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  dob DATE,
  gender TEXT,
  address TEXT,
  bus_route_id UUID,
  stop_id UUID,
  academic_year TEXT NOT NULL, -- e.g., '2023-2024'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic Enrollments (For Promotion History)
CREATE TABLE IF NOT EXISTS public.academic_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  grade TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notices Table
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.users(id),
  author_name TEXT,
  author_role TEXT,
  target_audience TEXT CHECK (target_audience IN ('all', 'parents', 'staff', 'teachers')),
  is_important BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by UUID REFERENCES public.users(id),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, date)
);

-- Fee Invoices Table
CREATE TABLE IF NOT EXISTS public.fee_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partially_paid', 'overdue', 'void')),
  description TEXT,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee Payments Table (For tracking individual transactions)
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES public.fee_invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  payment_method TEXT NOT NULL,
  reference_number TEXT,
  recorded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee Items (Structure) Table
CREATE TABLE IF NOT EXISTS public.fee_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignments Table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  teacher_id UUID REFERENCES public.users(id),
  due_date TIMESTAMPTZ NOT NULL,
  type TEXT CHECK (type IN ('homework', 'project', 'quiz', 'essay')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grades Table
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  score NUMERIC,
  grade_letter TEXT,
  remarks TEXT,
  graded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, assignment_id)
);

-- Parent-Student Junction Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.parent_student (
  parent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'Parent',
  PRIMARY KEY (parent_id, student_id)
);

-- Bus Routes Table
CREATE TABLE IF NOT EXISTS public.bus_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_number TEXT NOT NULL UNIQUE,
  bus_number TEXT NOT NULL,
  driver_id UUID REFERENCES public.users(id),
  attendant_id UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Transit', 'Arrived at School', 'Completed')),
  current_location JSONB, -- {lat, lng}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bus Stops Table
CREATE TABLE IF NOT EXISTS public.bus_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.bus_routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  arrival_time TIME,
  lat NUMERIC,
  lng NUMERIC,
  student_id UUID REFERENCES public.students(id),
  order_index INTEGER NOT NULL
);

-- Schedules Table
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id TEXT NOT NULL, -- e.g., 'Grade 4'
  day_of_week INTEGER NOT NULL, -- 1 (Monday) to 5 (Friday)
  period INTEGER NOT NULL,
  subject TEXT NOT NULL,
  teacher_id UUID REFERENCES public.users(id),
  room TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, day_of_week, period)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.users(id),
  receiver_id UUID REFERENCES public.users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Broadcasts Table
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('whatsapp', 'push', 'email')),
  target_audience TEXT,
  sent_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Helper Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Users Table Policies
CREATE POLICY "Admins can manage all users" ON public.users FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Staff can view users" ON public.users FOR SELECT USING (get_user_role() IN ('teacher', 'staff', 'accountant'));

-- Students Table Policies
CREATE POLICY "Admins can manage all students" ON public.students FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Teachers can view students" ON public.students FOR SELECT USING (get_user_role() = 'teacher');
CREATE POLICY "Parents can view own children" ON public.students FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = students.id));
CREATE POLICY "Students can view own record" ON public.students FOR SELECT USING (id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Parent Student Policies
CREATE POLICY "Admins can manage parent_student" ON public.parent_student FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Parents can view their own student links" ON public.parent_student FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Teachers can view student links" ON public.parent_student FOR SELECT USING (get_user_role() = 'teacher');

-- Academic Enrollments Policies
CREATE POLICY "Admins can manage enrollments" ON public.academic_enrollments FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Teachers can view enrollments" ON public.academic_enrollments FOR SELECT USING (get_user_role() = 'teacher');
CREATE POLICY "Parents can view their children enrollments" ON public.academic_enrollments FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = academic_enrollments.student_id));

-- Bus Routes Policies
CREATE POLICY "Admins can manage all routes" ON public.bus_routes FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "All users can view routes" ON public.bus_routes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can update assigned route" ON public.bus_routes FOR UPDATE USING (driver_id = auth.uid() OR attendant_id = auth.uid());

-- Bus Stops Policies
CREATE POLICY "Admins can manage all stops" ON public.bus_stops FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "All users can view stops" ON public.bus_stops FOR SELECT USING (auth.role() = 'authenticated');

-- Notices Policies
CREATE POLICY "Admins can manage notices" ON public.notices FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "All users can view notices" ON public.notices FOR SELECT USING (auth.role() = 'authenticated');

-- Attendance Policies
CREATE POLICY "Admins can manage attendance" ON public.attendance FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Teachers can manage attendance" ON public.attendance FOR ALL USING (get_user_role() = 'teacher');
CREATE POLICY "Parents can view their children attendance" ON public.attendance FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = attendance.student_id));
CREATE POLICY "Students can view their own attendance" ON public.attendance FOR SELECT USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Fee Invoices Policies
CREATE POLICY "Admins can manage invoices" ON public.fee_invoices FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Accountants can manage invoices" ON public.fee_invoices FOR ALL USING (get_user_role() = 'accountant');
CREATE POLICY "Parents can view their children invoices" ON public.fee_invoices FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = fee_invoices.student_id));
CREATE POLICY "Parents can update their children invoices (for payment)" ON public.fee_invoices FOR UPDATE USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = fee_invoices.student_id)) WITH CHECK (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = fee_invoices.student_id));
CREATE POLICY "Students can view their own invoices" ON public.fee_invoices FOR SELECT USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Fee Payments Policies
CREATE POLICY "Admins can manage payments" ON public.fee_payments FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Accountants can manage payments" ON public.fee_payments FOR ALL USING (get_user_role() = 'accountant');
CREATE POLICY "Parents can view their children payments" ON public.fee_payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.fee_invoices JOIN public.parent_student ON fee_invoices.student_id = parent_student.student_id WHERE fee_invoices.id = fee_payments.invoice_id AND parent_student.parent_id = auth.uid()));
CREATE POLICY "Parents can insert their children payments" ON public.fee_payments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.fee_invoices JOIN public.parent_student ON fee_invoices.student_id = parent_student.student_id WHERE fee_invoices.id = fee_payments.invoice_id AND parent_student.parent_id = auth.uid()));
CREATE POLICY "Students can view their own payments" ON public.fee_payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.fee_invoices WHERE fee_invoices.id = fee_payments.invoice_id AND fee_invoices.student_id = (SELECT student_id FROM public.users WHERE id = auth.uid())));

-- Fee Items Policies
CREATE POLICY "Admins can manage fee items" ON public.fee_items FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Accountants can manage fee items" ON public.fee_items FOR ALL USING (get_user_role() = 'accountant');
CREATE POLICY "All authenticated users can view fee items" ON public.fee_items FOR SELECT USING (auth.role() = 'authenticated');

-- Assignments Policies
CREATE POLICY "Admins can manage assignments" ON public.assignments FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Teachers can manage assignments" ON public.assignments FOR ALL USING (get_user_role() = 'teacher');
CREATE POLICY "All authenticated users can view assignments" ON public.assignments FOR SELECT USING (auth.role() = 'authenticated');

-- Grades Policies
CREATE POLICY "Admins can manage grades" ON public.grades FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Teachers can manage grades" ON public.grades FOR ALL USING (get_user_role() = 'teacher');
CREATE POLICY "Parents can view their children grades" ON public.grades FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = grades.student_id));
CREATE POLICY "Students can view their own grades" ON public.grades FOR SELECT USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Messages Policies
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their received messages" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Broadcasts Policies
CREATE POLICY "Admins can manage broadcasts" ON public.broadcasts FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "All users can view broadcasts" ON public.broadcasts FOR SELECT USING (auth.role() = 'authenticated');

-- Schedules Policies
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage schedules" ON public.schedules FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "All authenticated users can view schedules" ON public.schedules FOR SELECT USING (auth.role() = 'authenticated');

-- Schedule Drafts Table
CREATE TABLE IF NOT EXISTS public.schedule_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  constraints JSONB NOT NULL,
  mappings JSONB NOT NULL,
  schedule JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

ALTER TABLE public.schedule_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage schedule drafts" ON public.schedule_drafts FOR ALL USING (get_user_role() = 'admin');

-- 5. Realtime Configuration
ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_routes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_payments;

-- 6. Functions for Business Logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();