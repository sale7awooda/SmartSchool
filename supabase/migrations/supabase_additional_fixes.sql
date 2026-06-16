-- 1. Fix bus_routes
ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS attendant_id UUID REFERENCES users(id);
ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS route_number TEXT;

-- 2. Fix visitors
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Fix audit_logs (and dependencies just in case)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure RLS is enabled and policies are created
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin can view audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (
  true
);

-- Force schema cache reload in PostgREST
NOTIFY pgrst, 'reload schema';
