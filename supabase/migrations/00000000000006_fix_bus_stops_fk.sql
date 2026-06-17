-- Fix bus_stops.student_id FK to reference students(id) instead of users(id)
-- The original constraint incorrectly pointed to users, causing inserts to fail
-- when a valid student ID from the students table was provided.

ALTER TABLE IF EXISTS public.bus_stops
  DROP CONSTRAINT IF EXISTS bus_stops_student_id_fkey;

ALTER TABLE IF EXISTS public.bus_stops
  ADD CONSTRAINT bus_stops_student_id_fkey
  FOREIGN KEY (student_id)
  REFERENCES public.students(id)
  ON DELETE SET NULL;
