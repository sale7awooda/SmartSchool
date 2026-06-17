-- Fix bus_routes: add columns that code expects but are missing
ALTER TABLE IF EXISTS public.bus_routes
  ADD COLUMN IF NOT EXISTS bus_number text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Not Started',
  ADD COLUMN IF NOT EXISTS current_location text,
  ADD COLUMN IF NOT EXISTS live_status text;

-- Fix bus_stops: add columns that code expects but are missing
ALTER TABLE IF EXISTS public.bus_stops
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arrival_time text;

-- Add RLS policies for the new columns (they're covered by existing tenant_isolation_all policies)
