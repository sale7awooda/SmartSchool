-- ==============================================================================
-- SQL DATABASE SEEDING
-- Populate the local development environment with structured default records.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SEED ACADEMIC YEARS
INSERT INTO academic_years (id, name, start_date, end_date, is_active)
VALUES 
  ('00000000-0000-4000-a000-000000000001', '2024-2025', '2024-09-01', '2025-06-30', false),
  ('00000000-0000-4000-a000-000000000002', '2025-2026', '2025-09-01', '2026-06-30', true),
  ('00000000-0000-4000-a000-000000000003', '2026-2027', '2026-09-01', '2027-06-30', false)
ON CONFLICT (name) DO UPDATE SET is_active = EXCLUDED.is_active;

-- 2. SEED CLASSES
INSERT INTO classes (id, name, capacity)
VALUES
  ('00000000-0000-4000-b000-000000000001', 'Grade 4-A', 30),
  ('00000000-0000-4000-b000-000000000002', 'Grade 4-B', 30),
  ('00000000-0000-4000-b000-000000000003', 'Grade 5-A', 30)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED SUBJECTS
INSERT INTO subjects (id, name, code)
VALUES
  ('00000000-0000-4000-c000-000000000001', 'Mathematics', 'MATH101'),
  ('00000000-0000-4000-c000-000000000002', 'Science', 'SCI101'),
  ('00000000-0000-4000-c000-000000000003', 'English', 'ENG101'),
  ('00000000-0000-4000-c000-000000000004', 'History', 'HIS101')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED AUTH AND PUBLIC USERS
-- Password is 'password123' (bcrypt)
-- We insert into auth.users then public.users
-- Admin
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES ('00000000-0000-4000-e000-000000000002', 'admin@school.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Principal Skinner"}', now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, name, role, is_active)
VALUES ('00000000-0000-4000-e000-000000000002', 'admin@school.com', 'Principal Skinner', 'admin', true)
ON CONFLICT (id) DO NOTHING;

-- Accountant
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES ('00000000-0000-4000-e000-000000000003', 'accountant@school.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Angela Martin"}', now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, name, role, is_active)
VALUES ('00000000-0000-4000-e000-000000000003', 'accountant@school.com', 'Angela Martin', 'accountant', true)
ON CONFLICT (id) DO NOTHING;

-- Teacher
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES ('00000000-0000-4000-e000-000000000004', 'teacher@school.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Edna Krabappel"}', now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, name, role, is_active)
VALUES ('00000000-0000-4000-e000-000000000004', 'teacher@school.com', 'Edna Krabappel', 'teacher', true)
ON CONFLICT (id) DO NOTHING;

-- Driver / Staff
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES ('00000000-0000-4000-e000-000000000007', 'driver@school.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Otto Mann"}', now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, name, role, phone, is_active)
VALUES ('00000000-0000-4000-e000-000000000007', 'driver@school.com', 'Otto Mann', 'staff', '555-0999', true)
ON CONFLICT (id) DO NOTHING;

-- Parent
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES ('00000000-0000-4000-e000-000000000008', 'homer@simpson.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Homer Simpson"}', now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, name, role, phone, is_active)
VALUES ('00000000-0000-4000-e000-000000000008', 'homer@simpson.com', 'Homer Simpson', 'parent', '555-0123', true)
-- Student
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES ('00000000-0000-4000-e000-000000000009', 'student@school.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Bart Simpson"}', now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, name, role, is_active)
VALUES ('00000000-0000-4000-e000-000000000009', 'student@school.com', 'Bart Simpson', 'student', true)
ON CONFLICT (id) DO NOTHING;

-- 5. SEED STUDENTS AND PARENT-STUDENT LINK
INSERT INTO students (id, user_id, name, grade, roll_number, academic_year, gender, dob, address, fee_structure)
VALUES 
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-e000-000000000009', 'Bart Simpson', 'Grade 4', '01', '2025-2026', 'Male', '2014-04-01', '742 Evergreen Terrace, Springfield', 'Monthly'),
  ('00000000-0000-4000-f000-000000000002', NULL, 'Lisa Simpson', 'Grade 4', '02', '2025-2026', 'Female', '2016-05-09', '742 Evergreen Terrace, Springfield', 'Monthly')
ON CONFLICT (id) DO NOTHING;

INSERT INTO parent_student (parent_id, student_id, relation)
VALUES 
  ('00000000-0000-4000-e000-000000000008', '00000000-0000-4000-f000-000000000001', 'Father'),
  ('00000000-0000-4000-e000-000000000008', '00000000-0000-4000-f000-000000000002', 'Father')
ON CONFLICT DO NOTHING;

-- 6. SEED TRANSPORT
INSERT INTO bus_routes (id, name, driver_id, vehicle_number, capacity)
VALUES
  ('00000000-0000-4000-d000-000000000001', 'Route R-01', '00000000-0000-4000-e000-000000000007', 'BUS-66', 40)
ON CONFLICT (id) DO NOTHING;

INSERT INTO bus_stops (id, route_id, name, time, latitude, longitude)
VALUES
  ('00000000-0000-4000-5000-000000000001', '00000000-0000-4000-d000-000000000001', 'Evergreen Terrace', '07:30:00', 39.7817, -89.6501),
  ('00000000-0000-4000-5000-000000000002', '00000000-0000-4000-d000-000000000001', 'Kwik-E-Mart', '07:45:00', 39.7900, -89.6400),
  ('00000000-0000-4000-5000-000000000003', '00000000-0000-4000-d000-000000000001', 'Springfield Elementary', '08:00:00', 39.8000, -89.6300)
ON CONFLICT (id) DO NOTHING;

-- 7. SEED FEE ITEMS
INSERT INTO fee_items (id, name, amount, type, category, frequency, due_date)
VALUES
  ('00000000-0000-4000-7000-000000000001', 'Tuition Fee - Grade 4', 3000.00, 'tuition', 'Academic', 'Per Term', '2025-11-01'),
  ('00000000-0000-4000-7000-000000000002', 'Transport Fee - Route 1', 150.00, 'transport', 'Facilities', 'Monthly', '2025-10-15')
ON CONFLICT (id) DO NOTHING;
