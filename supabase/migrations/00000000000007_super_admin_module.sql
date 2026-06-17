-- Super Admin Module — Schema & RLS
-- Part of Phase 1: Database foundation + Auth

-- ============================================
-- 1. HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- ============================================
-- 2. USERS TABLE CHANGES
-- ============================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'teacher'::text, 'parent'::text, 'student'::text, 'staff'::text, 'accountant'::text, 'super_admin'::text]));

ALTER TABLE public.users ALTER COLUMN school_id DROP NOT NULL;

-- ============================================
-- 3. SCHOOLS TABLE CHANGES
-- ============================================

ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS advanced_config jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS branding_config jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS backup_config jsonb DEFAULT '{"auto_backup_enabled": true, "retention_days": 7, "backup_time": "03:00"}'::jsonb;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS maintenance_mode boolean DEFAULT false;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS maintenance_message text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS storage_used_bytes bigint DEFAULT 0;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS user_count integer DEFAULT 0;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS student_count integer DEFAULT 0;

-- ============================================
-- 4. NEW TABLES (drop first for clean slate)
-- ============================================

DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.backups CASCADE;
DROP TABLE IF EXISTS public.school_module_overrides CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.system_announcements CASCADE;
DROP TABLE IF EXISTS public.system_health_logs CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL DEFAULT 0,
  billing_type text NOT NULL DEFAULT 'monthly' CHECK (billing_type IN ('monthly', 'yearly', 'one_time')),
  max_students integer DEFAULT -1,
  max_staff integer DEFAULT -1,
  storage_limit_mb integer DEFAULT 500,
  enabled_modules text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'cancelled', 'expired', 'suspended')),
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  trial_end_date timestamp with time zone,
  cancelled_at timestamp with time zone,
  stripe_subscription_id text,
  stripe_customer_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.school_module_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (school_id, module_name)
);

CREATE TABLE IF NOT EXISTS public.backups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_path text,
  size_bytes bigint DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  backup_type text NOT NULL DEFAULT 'auto' CHECK (backup_type IN ('auto', 'manual')),
  triggered_by uuid REFERENCES public.users(id),
  expires_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  before_snapshot jsonb,
  after_snapshot jsonb,
  ip_address text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  tags jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.system_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  announcement_type text NOT NULL DEFAULT 'banner' CHECK (announcement_type IN ('banner', 'popup', 'both')),
  is_active boolean DEFAULT true,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_module_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY super_admin_manage_subscription_plans ON public.subscription_plans
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY authenticated_view_subscription_plans ON public.subscription_plans
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY super_admin_manage_subscriptions ON public.subscriptions
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY tenant_view_subscriptions ON public.subscriptions
  FOR SELECT TO authenticated
  USING (school_id = get_current_school_id());

CREATE POLICY super_admin_manage_module_overrides ON public.school_module_overrides
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY tenant_view_module_overrides ON public.school_module_overrides
  FOR SELECT TO authenticated
  USING (school_id = get_current_school_id());

CREATE POLICY super_admin_manage_backups ON public.backups
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY tenant_view_backups ON public.backups
  FOR SELECT TO authenticated
  USING (school_id = get_current_school_id());

CREATE POLICY super_admin_manage_audit_logs ON public.audit_logs
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY super_admin_view_health_logs ON public.system_health_logs
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY super_admin_manage_announcements ON public.system_announcements
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY authenticated_view_announcements ON public.system_announcements
  FOR SELECT TO authenticated
  USING (true);

-- ============================================
-- 6. UPDATE EXISTING RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS schools_select_policy ON public.schools;
CREATE POLICY schools_select_policy ON public.schools
  FOR SELECT TO authenticated
  USING ((id = get_current_school_id()) OR is_super_admin());

DROP POLICY IF EXISTS schools_admin_update_policy ON public.schools;
CREATE POLICY schools_admin_update_policy ON public.schools
  FOR UPDATE TO authenticated
  USING (((id = get_current_school_id()) AND (get_current_user_role() = 'admin'::text)) OR is_super_admin())
  WITH CHECK (((id = get_current_school_id()) AND (get_current_user_role() = 'admin'::text)) OR is_super_admin());

DROP POLICY IF EXISTS users_select_policy ON public.users;
CREATE POLICY users_select_policy ON public.users
  FOR SELECT TO authenticated
  USING (((school_id = get_current_school_id()) AND ((id = auth.uid()) OR (get_current_user_role() = ANY (ARRAY['admin'::text, 'teacher'::text, 'staff'::text, 'accountant'::text])))) OR is_super_admin());

DROP POLICY IF EXISTS users_admin_manage_policy ON public.users;
CREATE POLICY users_admin_manage_policy ON public.users
  FOR ALL TO authenticated
  USING (((school_id = get_current_school_id()) AND (get_current_user_role() = 'admin'::text)) OR is_super_admin())
  WITH CHECK (((school_id = get_current_school_id()) AND (get_current_user_role() = 'admin'::text)) OR is_super_admin());

DROP POLICY IF EXISTS users_update_policy ON public.users;
CREATE POLICY users_update_policy ON public.users
  FOR UPDATE TO authenticated
  USING (((school_id = get_current_school_id()) AND ((id = auth.uid()) OR (get_current_user_role() = 'admin'::text))) OR is_super_admin())
  WITH CHECK (((school_id = get_current_school_id()) AND ((id = auth.uid()) OR (get_current_user_role() = 'admin'::text))) OR is_super_admin());

-- ============================================
-- 7. SEED DEFAULT SUBSCRIPTION PLANS
-- ============================================

INSERT INTO public.subscription_plans (name, description, price, billing_type, max_students, max_staff, storage_limit_mb, enabled_modules, sort_order) VALUES
  ('Free', 'Community-supported free tier with limited modules', 0, 'monthly', 50, 10, 100, ARRAY['students', 'attendance', 'schedule', 'communication', 'fees'], 0),
  ('Basic', 'Essential modules for small schools', 49.99, 'monthly', 200, 30, 500, ARRAY['students', 'attendance', 'schedule', 'communication', 'fees', 'analytics', 'report_cards', 'library'], 1),
  ('Pro', 'Full-featured for growing schools', 99.99, 'monthly', 1000, 100, 2000, ARRAY['transport', 'inventory', 'exams', 'hr', 'visitors', 'students', 'attendance', 'schedule', 'communication', 'fees', 'analytics', 'report_cards', 'library', 'medical'], 2),
  ('Full', 'All modules, one-time purchase, lifetime access', 1999.99, 'one_time', -1, -1, 10000, ARRAY['transport', 'inventory', 'exams', 'hr', 'visitors', 'students', 'attendance', 'schedule', 'communication', 'fees', 'analytics', 'report_cards', 'library', 'medical'], 3)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. SEED SUPER ADMIN USER
-- ============================================

UPDATE public.users SET role = 'super_admin', school_id = NULL WHERE email = 'sale7awooda@gmail.com';

-- ============================================
-- 9. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON public.subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_backups_school_id ON public.backups(school_id);
CREATE INDEX IF NOT EXISTS idx_backups_status ON public.backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON public.backups(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_system_health_logs_metric ON public.system_health_logs(metric_name, recorded_at);
CREATE INDEX IF NOT EXISTS idx_system_health_logs_school ON public.system_health_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_system_announcements_active ON public.system_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_school_module_overrides_school ON public.school_module_overrides(school_id);
