-- =================================================================================
-- COMPREHENSIVE SUPABASE FIX SCRIPT
-- This script reconstructs the full schema with all required tables and 
-- fixes for RLS policy collisions and missing columns.
-- =================================================================================

-- 1. CLEANUP: Drop all existing policies first to avoid collisions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 2. DROP TABLES (Ordered to handle dependencies)
DROP TABLE IF EXISTS "assessment_questions" cascade;
DROP TABLE IF EXISTS "assessments" cascade;
DROP TABLE IF EXISTS "attendance" cascade;
DROP TABLE IF EXISTS "behavior_records" cascade;
DROP TABLE IF EXISTS "broadcasts" cascade;
DROP TABLE IF EXISTS "bus_routes" cascade;
DROP TABLE IF EXISTS "bus_stops" cascade;
DROP TABLE IF EXISTS "fee_items" cascade;
DROP TABLE IF EXISTS "financials" cascade;
DROP TABLE IF EXISTS "inventory" cascade;
DROP TABLE IF EXISTS "invoices" cascade;
DROP TABLE IF EXISTS "leave_requests" cascade;
DROP TABLE IF EXISTS "messages" cascade;
DROP TABLE IF EXISTS "notices" cascade;
DROP TABLE IF EXISTS "parent_student" cascade;
DROP TABLE IF EXISTS "payslips" cascade;
DROP TABLE IF EXISTS "schedules" cascade;
DROP TABLE IF EXISTS "student_transport" cascade;
DROP TABLE IF EXISTS "submissions" cascade;
DROP TABLE IF EXISTS "system_settings" cascade;
DROP TABLE IF EXISTS "timeline_events" cascade;
DROP TABLE IF EXISTS "visitors" cascade;
DROP TABLE IF EXISTS "staff_attendance" cascade;
DROP TABLE IF EXISTS "grades" cascade;
DROP TABLE IF EXISTS "students" cascade;
DROP TABLE IF EXISTS "subjects" cascade;
DROP TABLE IF EXISTS "classes" cascade;
DROP TABLE IF EXISTS "academic_years" cascade;
DROP TABLE IF EXISTS "users" cascade;

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. CREATE TABLES

-- Table: users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'parent', 'student', 'staff', 'accountant')),
  student_id UUID,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: academic_years
CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  capacity INTEGER,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  roll_number TEXT,
  academic_year TEXT,
  gender TEXT,
  dob DATE,
  address TEXT,
  fee_structure TEXT,
  additional_info TEXT,
  is_deleted BOOLEAN DEFAULT false,
  deleted_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE parent_student (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  relation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE assessment_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID,
  question TEXT NOT NULL,
  type TEXT,
  options JSONB,
  correct_answer TEXT,
  points INTEGER,
  "order" INTEGER
);

CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  date DATE,
  duration INTEGER,
  status TEXT
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  date DATE,
  status TEXT,
  notes TEXT
);

CREATE TABLE behavior_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  date DATE,
  incident TEXT,
  severity TEXT
);

CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_audience TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE bus_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  driver_id UUID REFERENCES users(id),
  vehicle_number TEXT,
  capacity INTEGER
);

CREATE TABLE bus_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES bus_routes(id),
  name TEXT NOT NULL,
  time TIME,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

CREATE TABLE fee_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT,
  category TEXT,
  frequency TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE financials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  category TEXT,
  amount NUMERIC,
  date DATE,
  description TEXT,
  status TEXT
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER,
  status TEXT
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  amount NUMERIC,
  status TEXT,
  due_date DATE
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  reason TEXT,
  status TEXT
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT,
  role_target TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month TEXT,
  amount NUMERIC,
  status TEXT,
  date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  teacher_id UUID REFERENCES users(id),
  day_of_week TEXT,
  start_time TIME,
  end_time TIME
);

CREATE TABLE student_transport (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  route_id UUID REFERENCES bus_routes(id),
  stop_id UUID REFERENCES bus_stops(id)
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id),
  student_id UUID REFERENCES students(id),
  score INTEGER,
  answers JSONB,
  status TEXT
);

CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  school_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT
);

CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  date DATE,
  title TEXT,
  description TEXT
);

CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  purpose TEXT,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  status TEXT
);

CREATE TABLE staff_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL,
  time_in TEXT,
  time_out TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,
  score NUMERIC NOT NULL,
  score_max NUMERIC NOT NULL DEFAULT 100,
  assessment_id UUID REFERENCES assessments(id),
  remarks TEXT,
  graded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subject_id, academic_year, term)
);

-- 4. ENABLE RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- 5. CREATE POLICIES (Development Permissive Mode)
CREATE POLICY "permissive_all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON academic_years FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON parent_student FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON fee_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON financials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON visitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON bus_routes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON bus_stops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON timeline_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON behavior_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON notices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON staff_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "permissive_all" ON grades FOR ALL USING (true) WITH CHECK (true);

-- 6. SEED DATA
INSERT INTO academic_years (name, start_date, end_date, is_active)
VALUES ('2025-2026', '2025-09-01', '2026-06-30', true)
ON CONFLICT (name) DO NOTHING;
