-- Supabase Schema and RLS Policies for School Management System

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables to ensure a clean slate and avoid policy conflicts
-- WARNING: This will remove any existing data in these tables.
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.academic_enrollments CASCADE;
DROP TABLE IF EXISTS public.notices CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.fee_invoices CASCADE;
DROP TABLE IF EXISTS public.fee_payments CASCADE;
DROP TABLE IF EXISTS public.fee_items CASCADE;
DROP TABLE IF EXISTS public.assessments CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE; -- Drop old assignments table if it exists
DROP TABLE IF EXISTS public.grades CASCADE;
DROP TABLE IF EXISTS public.parent_student CASCADE;
DROP TABLE IF EXISTS public.bus_routes CASCADE;
DROP TABLE IF EXISTS public.bus_stops CASCADE;
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.broadcasts CASCADE;
DROP TABLE IF EXISTS public.schedule_drafts CASCADE;
DROP TABLE IF EXISTS public.academic_years CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.books CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.visitors CASCADE;
DROP TABLE IF EXISTS public.medical_records CASCADE;
DROP TABLE IF EXISTS public.behavior_records CASCADE;
DROP TABLE IF EXISTS public.timeline_records CASCADE;

-- 3. Create Tables
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
  fee_structure TEXT,
  additional_info TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_reason TEXT,
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

-- Assessments Table
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  teacher_id UUID REFERENCES public.users(id),
  due_date TIMESTAMPTZ NOT NULL,
  type TEXT CHECK (type IN ('homework', 'project', 'quiz', 'essay', 'exam')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grades Table
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  score NUMERIC,
  grade_letter TEXT,
  remarks TEXT,
  graded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, assessment_id)
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
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  school_name TEXT DEFAULT 'Smart School',
  school_address TEXT,
  school_phone TEXT,
  school_email TEXT,
  grading_scale TEXT DEFAULT 'Standard (A-F)',
  theme_color TEXT DEFAULT 'indigo',
  font_family TEXT DEFAULT 'Inter (Default)',
  compact_design BOOLEAN DEFAULT FALSE,
  enable_online_registration BOOLEAN DEFAULT TRUE,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  automatic_attendance BOOLEAN DEFAULT FALSE,
  enable_sms BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_row_only CHECK (id = 1)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "All users can view system settings" ON public.system_settings;
CREATE POLICY "All users can view system settings" ON public.system_settings FOR SELECT USING (auth.role() = 'authenticated');

-- 4. RLS Policies

-- Helper Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Users Table Policies
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Staff can view users" ON public.users;
CREATE POLICY "Staff can view users" ON public.users FOR SELECT USING (get_user_role() IN ('teacher', 'staff', 'accountant'));

-- Students Table Policies
DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;
CREATE POLICY "Admins can manage all students" ON public.students FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Teachers can view students" ON public.students;
CREATE POLICY "Teachers can view students" ON public.students FOR SELECT USING (get_user_role() = 'teacher');
DROP POLICY IF EXISTS "Parents can view own children" ON public.students;
CREATE POLICY "Parents can view own children" ON public.students FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = students.id));
DROP POLICY IF EXISTS "Students can view own record" ON public.students;
CREATE POLICY "Students can view own record" ON public.students FOR SELECT USING (id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Parent Student Policies
DROP POLICY IF EXISTS "Admins can manage parent_student" ON public.parent_student;
CREATE POLICY "Admins can manage parent_student" ON public.parent_student FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Parents can view their own student links" ON public.parent_student;
CREATE POLICY "Parents can view their own student links" ON public.parent_student FOR SELECT USING (parent_id = auth.uid());
DROP POLICY IF EXISTS "Teachers can view student links" ON public.parent_student;
CREATE POLICY "Teachers can view student links" ON public.parent_student FOR SELECT USING (get_user_role() = 'teacher');

-- Academic Enrollments Policies
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.academic_enrollments;
CREATE POLICY "Admins can manage enrollments" ON public.academic_enrollments FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Teachers can view enrollments" ON public.academic_enrollments;
CREATE POLICY "Teachers can view enrollments" ON public.academic_enrollments FOR SELECT USING (get_user_role() = 'teacher');
DROP POLICY IF EXISTS "Parents can view their children enrollments" ON public.academic_enrollments;
CREATE POLICY "Parents can view their children enrollments" ON public.academic_enrollments FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = academic_enrollments.student_id));

-- Bus Routes Policies
DROP POLICY IF EXISTS "Admins can manage all routes" ON public.bus_routes;
CREATE POLICY "Admins can manage all routes" ON public.bus_routes FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "All users can view routes" ON public.bus_routes;
CREATE POLICY "All users can view routes" ON public.bus_routes FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Staff can update assigned route" ON public.bus_routes;
CREATE POLICY "Staff can update assigned route" ON public.bus_routes FOR UPDATE USING (driver_id = auth.uid() OR attendant_id = auth.uid());

-- Bus Stops Policies
DROP POLICY IF EXISTS "Admins can manage all stops" ON public.bus_stops;
CREATE POLICY "Admins can manage all stops" ON public.bus_stops FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "All users can view stops" ON public.bus_stops;
CREATE POLICY "All users can view stops" ON public.bus_stops FOR SELECT USING (auth.role() = 'authenticated');

-- Notices Policies
DROP POLICY IF EXISTS "Admins can manage notices" ON public.notices;
CREATE POLICY "Staff can manage notices" ON public.notices FOR ALL USING (get_user_role() IN ('admin', 'teacher', 'accountant', 'staff'));
DROP POLICY IF EXISTS "All users can view notices" ON public.notices;
CREATE POLICY "All users can view notices" ON public.notices FOR SELECT USING (auth.role() = 'authenticated');

-- Attendance Policies
DROP POLICY IF EXISTS "Admins can manage attendance" ON public.attendance;
CREATE POLICY "Admins can manage attendance" ON public.attendance FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Teachers can manage attendance" ON public.attendance;
CREATE POLICY "Teachers can manage attendance" ON public.attendance FOR ALL USING (get_user_role() = 'teacher');
DROP POLICY IF EXISTS "Parents can view their children attendance" ON public.attendance;
CREATE POLICY "Parents can view their children attendance" ON public.attendance FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = attendance.student_id));
DROP POLICY IF EXISTS "Students can view their own attendance" ON public.attendance;
CREATE POLICY "Students can view their own attendance" ON public.attendance FOR SELECT USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Fee Invoices Policies
DROP POLICY IF EXISTS "Admins can manage invoices" ON public.fee_invoices;
CREATE POLICY "Admins can manage invoices" ON public.fee_invoices FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Accountants can manage invoices" ON public.fee_invoices;
CREATE POLICY "Accountants can manage invoices" ON public.fee_invoices FOR ALL USING (get_user_role() = 'accountant');
DROP POLICY IF EXISTS "Parents can view their children invoices" ON public.fee_invoices;
CREATE POLICY "Parents can view their children invoices" ON public.fee_invoices FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = fee_invoices.student_id));
DROP POLICY IF EXISTS "Parents can update their children invoices (for payment)" ON public.fee_invoices;
CREATE POLICY "Parents can update their children invoices (for payment)" ON public.fee_invoices FOR UPDATE USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = fee_invoices.student_id)) WITH CHECK (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = fee_invoices.student_id));
DROP POLICY IF EXISTS "Students can view their own invoices" ON public.fee_invoices;
CREATE POLICY "Students can view their own invoices" ON public.fee_invoices FOR SELECT USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Fee Payments Policies
DROP POLICY IF EXISTS "Admins can manage payments" ON public.fee_payments;
CREATE POLICY "Admins can manage payments" ON public.fee_payments FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Accountants can manage payments" ON public.fee_payments;
CREATE POLICY "Accountants can manage payments" ON public.fee_payments FOR ALL USING (get_user_role() = 'accountant');
DROP POLICY IF EXISTS "Parents can view their children payments" ON public.fee_payments;
CREATE POLICY "Parents can view their children payments" ON public.fee_payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.fee_invoices JOIN public.parent_student ON fee_invoices.student_id = parent_student.student_id WHERE fee_invoices.id = fee_payments.invoice_id AND parent_student.parent_id = auth.uid()));
DROP POLICY IF EXISTS "Parents can insert their children payments" ON public.fee_payments;
CREATE POLICY "Parents can insert their children payments" ON public.fee_payments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.fee_invoices JOIN public.parent_student ON fee_invoices.student_id = parent_student.student_id WHERE fee_invoices.id = fee_payments.invoice_id AND parent_student.parent_id = auth.uid()));
DROP POLICY IF EXISTS "Students can view their own payments" ON public.fee_payments;
CREATE POLICY "Students can view their own payments" ON public.fee_payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.fee_invoices WHERE fee_invoices.id = fee_payments.invoice_id AND fee_invoices.student_id = (SELECT student_id FROM public.users WHERE id = auth.uid())));

-- Fee Items Policies
DROP POLICY IF EXISTS "Admins can manage fee items" ON public.fee_items;
CREATE POLICY "Admins can manage fee items" ON public.fee_items FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Accountants can manage fee items" ON public.fee_items;
CREATE POLICY "Accountants can manage fee items" ON public.fee_items FOR ALL USING (get_user_role() = 'accountant');
DROP POLICY IF EXISTS "All authenticated users can view fee items" ON public.fee_items;
CREATE POLICY "All authenticated users can view fee items" ON public.fee_items FOR SELECT USING (auth.role() = 'authenticated');

-- Assessments Policies
DROP POLICY IF EXISTS "Admins can manage assessments" ON public.assessments;
CREATE POLICY "Admins can manage assessments" ON public.assessments FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Teachers can manage assessments" ON public.assessments;
CREATE POLICY "Teachers can manage assessments" ON public.assessments FOR ALL USING (get_user_role() = 'teacher');
DROP POLICY IF EXISTS "All authenticated users can view assessments" ON public.assessments;
CREATE POLICY "All authenticated users can view assessments" ON public.assessments FOR SELECT USING (auth.role() = 'authenticated');

-- Grades Policies
DROP POLICY IF EXISTS "Admins can manage grades" ON public.grades;
CREATE POLICY "Admins can manage grades" ON public.grades FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Teachers can manage grades" ON public.grades;
CREATE POLICY "Teachers can manage grades" ON public.grades FOR ALL USING (get_user_role() = 'teacher');
DROP POLICY IF EXISTS "Parents can view their children grades" ON public.grades;
CREATE POLICY "Parents can view their children grades" ON public.grades FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = grades.student_id));
DROP POLICY IF EXISTS "Students can view their own grades" ON public.grades;
CREATE POLICY "Students can view their own grades" ON public.grades FOR SELECT USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Messages Policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages;
CREATE POLICY "Users can update their received messages" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Broadcasts Policies
DROP POLICY IF EXISTS "Admins can manage broadcasts" ON public.broadcasts;
CREATE POLICY "Admins can manage broadcasts" ON public.broadcasts FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "All users can view broadcasts" ON public.broadcasts;
CREATE POLICY "All users can view broadcasts" ON public.broadcasts FOR SELECT USING (auth.role() = 'authenticated');

-- Schedules Policies
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage schedules" ON public.schedules;
CREATE POLICY "Admins can manage schedules" ON public.schedules FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "All authenticated users can view schedules" ON public.schedules;
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
DROP POLICY IF EXISTS "Admins can manage schedule drafts" ON public.schedule_drafts;
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON public.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Additional Tables for Missing Modules

-- Academic Years Table
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  section TEXT,
  capacity INTEGER,
  academic_year_id UUID REFERENCES public.academic_years(id),
  class_teacher_id UUID REFERENCES public.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Books Table (Library)
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  category TEXT,
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  unit_price NUMERIC,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions Table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  content TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late')),
  UNIQUE(assessment_id, student_id)
);

-- Visitors Table
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  check_in TIMESTAMPTZ DEFAULT NOW(),
  check_out TIMESTAMPTZ,
  host_id UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical Records Table
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  blood_group TEXT,
  allergies TEXT,
  conditions TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Behavior Records Table
CREATE TABLE IF NOT EXISTS public.behavior_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT CHECK (type IN ('positive', 'negative')),
  description TEXT NOT NULL,
  reported_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline Records Table
CREATE TABLE IF NOT EXISTS public.timeline_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
DROP POLICY IF EXISTS "Admins can manage academic_years" ON public.academic_years;
CREATE POLICY "Admins can manage academic_years" ON public.academic_years FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "All users can view academic_years" ON public.academic_years;
CREATE POLICY "All users can view academic_years" ON public.academic_years FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "All users can view classes" ON public.classes;
CREATE POLICY "All users can view classes" ON public.classes FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "All users can view subjects" ON public.subjects;
CREATE POLICY "All users can view subjects" ON public.subjects FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage books" ON public.books;
CREATE POLICY "Admins can manage books" ON public.books FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "All users can view books" ON public.books;
CREATE POLICY "All users can view books" ON public.books FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage inventory" ON public.inventory;
CREATE POLICY "Admins can manage inventory" ON public.inventory FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Staff can view inventory" ON public.inventory;
CREATE POLICY "Staff can view inventory" ON public.inventory FOR SELECT USING (get_user_role() IN ('admin', 'staff', 'accountant'));

DROP POLICY IF EXISTS "Admins can manage submissions" ON public.submissions;
CREATE POLICY "Admins can manage submissions" ON public.submissions FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Teachers can manage submissions" ON public.submissions;
CREATE POLICY "Teachers can manage submissions" ON public.submissions FOR ALL USING (get_user_role() = 'teacher');
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
CREATE POLICY "Students can view own submissions" ON public.submissions FOR SELECT USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;
CREATE POLICY "Students can insert own submissions" ON public.submissions FOR INSERT WITH CHECK (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage visitors" ON public.visitors;
CREATE POLICY "Admins can manage visitors" ON public.visitors FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Staff can manage visitors" ON public.visitors;
CREATE POLICY "Staff can manage visitors" ON public.visitors FOR ALL USING (get_user_role() = 'staff');

DROP POLICY IF EXISTS "Admins can manage medical_records" ON public.medical_records;
CREATE POLICY "Admins can manage medical_records" ON public.medical_records FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Staff can view medical_records" ON public.medical_records;
CREATE POLICY "Staff can view medical_records" ON public.medical_records FOR SELECT USING (get_user_role() IN ('admin', 'staff', 'teacher'));
DROP POLICY IF EXISTS "Parents can view own children medical_records" ON public.medical_records;
CREATE POLICY "Parents can view own children medical_records" ON public.medical_records FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = medical_records.student_id));

DROP POLICY IF EXISTS "Admins can manage behavior_records" ON public.behavior_records;
CREATE POLICY "Admins can manage behavior_records" ON public.behavior_records FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Teachers can manage behavior_records" ON public.behavior_records;
CREATE POLICY "Teachers can manage behavior_records" ON public.behavior_records FOR ALL USING (get_user_role() = 'teacher');
DROP POLICY IF EXISTS "Parents can view own children behavior_records" ON public.behavior_records;
CREATE POLICY "Parents can view own children behavior_records" ON public.behavior_records FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = behavior_records.student_id));

DROP POLICY IF EXISTS "Admins can manage timeline_records" ON public.timeline_records;
CREATE POLICY "Admins can manage timeline_records" ON public.timeline_records FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Teachers can manage timeline_records" ON public.timeline_records;
CREATE POLICY "Teachers can manage timeline_records" ON public.timeline_records FOR ALL USING (get_user_role() = 'teacher');
DROP POLICY IF EXISTS "Parents can view own children timeline_records" ON public.timeline_records;
CREATE POLICY "Parents can view own children timeline_records" ON public.timeline_records FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student WHERE parent_student.parent_id = auth.uid() AND parent_student.student_id = timeline_records.student_id));
DROP POLICY IF EXISTS "Students can view own timeline_records" ON public.timeline_records;
CREATE POLICY "Students can view own timeline_records" ON public.timeline_records FOR SELECT USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));