-- Supabase Schema and RLS Policies for School Management System

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Tables

-- Users Table (Extends Supabase Auth)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'schoolAdmin', 'teacher', 'accountant', 'staff', 'student', 'parent')),
  phone TEXT,
  student_id UUID, -- For parents/students linking to student record
  custom_permissions JSONB DEFAULT '{}'::jsonb, -- Overrides default role permissions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students Table
CREATE TABLE public.students (
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
CREATE TABLE public.academic_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  grade TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parent-Student Junction Table (Many-to-Many)
CREATE TABLE public.parent_student (
  parent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'Parent',
  PRIMARY KEY (parent_id, student_id)
);

-- Bus Routes Table
CREATE TABLE public.bus_routes (
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
CREATE TABLE public.bus_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.bus_routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  arrival_time TIME,
  lat NUMERIC,
  lng NUMERIC,
  order_index INTEGER NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_stops ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Helper Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Users Table Policies
-- Admins can read/write all users
CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (get_user_role() IN ('superadmin', 'schoolAdmin'));

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Teachers can view parents of their students (simplified for now, would need complex join)
CREATE POLICY "Staff can view users" ON public.users
  FOR SELECT USING (get_user_role() IN ('teacher', 'staff', 'accountant'));

-- Students Table Policies
-- Admins can manage all students
CREATE POLICY "Admins can manage all students" ON public.students
  FOR ALL USING (get_user_role() IN ('superadmin', 'schoolAdmin'));

-- Teachers can view all students (or restrict to their classes via a classes table)
CREATE POLICY "Teachers can view students" ON public.students
  FOR SELECT USING (get_user_role() = 'teacher');

-- Parents can view their own children
CREATE POLICY "Parents can view own children" ON public.students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_student
      WHERE parent_student.parent_id = auth.uid()
      AND parent_student.student_id = students.id
    )
  );

-- Students can view their own record
CREATE POLICY "Students can view own record" ON public.students
  FOR SELECT USING (
    id = (SELECT student_id FROM public.users WHERE id = auth.uid())
  );

-- Transport Staff can view students on their route
CREATE POLICY "Transport staff can view route students" ON public.students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bus_routes
      WHERE bus_routes.id = students.bus_route_id
      AND (bus_routes.driver_id = auth.uid() OR bus_routes.attendant_id = auth.uid())
    )
  );

-- Bus Routes Policies
-- Admins can manage all routes
CREATE POLICY "Admins can manage all routes" ON public.bus_routes
  FOR ALL USING (get_user_role() IN ('superadmin', 'schoolAdmin'));

-- All authenticated users can view routes (parents need to see their child's route)
CREATE POLICY "All users can view routes" ON public.bus_routes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Drivers and Attendants can update their assigned route status
CREATE POLICY "Staff can update assigned route" ON public.bus_routes
  FOR UPDATE USING (
    driver_id = auth.uid() OR attendant_id = auth.uid()
  );

-- Bus Stops Policies
-- Admins can manage all stops
CREATE POLICY "Admins can manage all stops" ON public.bus_stops
  FOR ALL USING (get_user_role() IN ('superadmin', 'schoolAdmin'));

-- All authenticated users can view stops
CREATE POLICY "All users can view stops" ON public.bus_stops
  FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Realtime Configuration
-- Enable realtime for bus_routes to track status changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_routes;

-- 6. Functions for Business Logic

-- Function to promote students to next grade
CREATE OR REPLACE FUNCTION public.promote_students(current_year TEXT, new_year TEXT)
RETURNS VOID AS $$
DECLARE
  student_record RECORD;
  new_grade TEXT;
BEGIN
  -- Ensure only admins can execute
  IF get_user_role() NOT IN ('superadmin', 'schoolAdmin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR student_record IN SELECT * FROM public.students WHERE academic_year = current_year LOOP
    -- Logic to determine new grade (simplified example)
    -- In reality, you'd have a lookup table or more complex logic
    IF student_record.grade = 'Grade 1' THEN new_grade := 'Grade 2';
    ELSIF student_record.grade = 'Grade 2' THEN new_grade := 'Grade 3';
    ELSIF student_record.grade = 'Grade 3' THEN new_grade := 'Grade 4';
    ELSIF student_record.grade = 'Grade 4' THEN new_grade := 'Grade 5';
    -- ... handle graduation or other logic
    ELSE new_grade := student_record.grade; -- Default fallback
    END IF;

    -- 1. Record current enrollment history
    INSERT INTO public.academic_enrollments (student_id, academic_year, grade, status)
    VALUES (student_record.id, current_year, student_record.grade, 'completed');

    -- 2. Update student record
    UPDATE public.students
    SET grade = new_grade, academic_year = new_year
    WHERE id = student_record.id;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
