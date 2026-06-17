'use server';

import { createAdminClient } from '@/lib/supabase/server';

export async function getSuperAdminStats() {
  const supabase = createAdminClient();
  const [schools, plans, backups, users] = await Promise.all([
    supabase.from('schools').select('id, is_active, subscription_tier', { count: 'exact' }),
    supabase.from('subscription_plans').select('id, name'),
    supabase.from('backups').select('id, status', { count: 'exact' }).eq('status', 'failed'),
    supabase.from('users').select('id', { count: 'exact' }).neq('role', 'super_admin'),
  ]);
  const allSchools = schools.data || [];
  return {
    totalSchools: schools.count || 0,
    activeSchools: allSchools.filter(s => s.is_active).length,
    totalUsers: users.count || 0,
    failedBackups: backups.count || 0,
    plans: plans.data || [],
  };
}

export async function getSchools(page = 1, limit = 20, search = '') {
  const supabase = createAdminClient();
  let query = supabase.from('schools').select('*', { count: 'exact' });
  if (search) query = query.ilike('name', `%${search}%`);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw new Error(error.message);
  return { data: data || [], count: count || 0, totalPages: Math.ceil((count || 0) / limit) };
}

export async function getSchoolById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('schools').select('*, subscriptions(*), school_module_overrides(*)').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createSchool(data: {
  name: string; subdomain?: string; email?: string; phone?: string; address?: string;
  currency?: string; timezone?: string;
}) {
  const supabase = createAdminClient();
  const { data: school, error } = await supabase.from('schools').insert([{
    name: data.name, subdomain: data.subdomain || null, email: data.email || null,
    phone: data.phone || null, address: data.address || null,
    currency: data.currency || 'USD', timezone: data.timezone || 'UTC',
  }]).select().single();
  if (error) throw new Error(error.message);
  return { success: true, school };
}

export async function updateSchool(id: string, data: Record<string, any>) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('schools').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function toggleSchoolStatus(id: string, isActive: boolean) {
  return updateSchool(id, { is_active: isActive });
}

export async function updateSchoolConfig(id: string, configType: 'advanced_config' | 'branding_config' | 'backup_config', config: Record<string, any>) {
  const supabase = createAdminClient();
  const { data: school } = await supabase.from('schools').select('*').eq('id', id).single();
  if (!school) throw new Error('School not found');
  const existing = (school as any)[configType] || {};
  const merged = { ...existing, ...config };
  const { error } = await supabase.from('schools').update({ [configType]: merged }).eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function toggleMaintenanceMode(id: string, enabled: boolean, message?: string) {
  return updateSchool(id, { maintenance_mode: enabled, maintenance_message: message || null });
}

export async function getSubscriptionPlans() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('subscription_plans').select('*').order('sort_order');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createPlan(data: {
  name: string; description?: string; price: number; billing_type: string;
  max_students?: number; max_staff?: number; storage_limit_mb?: number; enabled_modules?: string[];
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('subscription_plans').insert([data]);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function updatePlan(id: string, data: Record<string, any>) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('subscription_plans').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function deletePlan(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function assignPlanToSchool(schoolId: string, planId: string) {
  const supabase = createAdminClient();
  const { data: existing } = await supabase.from('subscriptions').select('id').eq('school_id', schoolId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('subscriptions').update({ plan_id: planId }).eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('subscriptions').insert([{ school_id: schoolId, plan_id: planId }]);
    if (error) throw new Error(error.message);
  }
  return { success: true };
}

export async function getBackups(page = 1, limit = 20) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await supabase
    .from('backups').select('*, school:schools(name)', { count: 'exact' })
    .order('created_at', { ascending: false }).range(from, to);
  if (error) throw new Error(error.message);
  return { data: data || [], count: count || 0, totalPages: Math.ceil((count || 0) / limit) };
}

export async function getSystemHealth() {
  const supabase = createAdminClient();
  const [schools, backups, recentErrors] = await Promise.all([
    supabase.from('schools').select('id, name, is_active, storage_used_bytes, user_count, student_count'),
    supabase.from('backups').select('status').eq('status', 'failed'),
    supabase.from('system_health_logs').select('*').order('recorded_at', { ascending: false }).limit(50),
  ]);
  return {
    schools: schools.data || [],
    failedBackups: backups.data?.length || 0,
    healthLogs: recentErrors.data || [],
    totalStorage: (schools.data || []).reduce((acc: number, s: any) => acc + (s.storage_used_bytes || 0), 0),
  };
}

export async function getSuperAdminUsers(page = 1, limit = 20, search = '') {
  const supabase = createAdminClient();
  let query = supabase.from('users').select('*, school:schools(name)', { count: 'exact' });
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw new Error(error.message);
  return { data: data || [], count: count || 0, totalPages: Math.ceil((count || 0) / limit) };
}

export async function getAnnouncements() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('system_announcements').select('*, creator:users(name)').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAnnouncement(data: { title: string; content: string; announcement_type: string; school_id?: string }, createdById: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('system_announcements').insert([{
    title: data.title, content: data.content, announcement_type: data.announcement_type,
    school_id: data.school_id || null, created_by: createdById,
  }]);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function toggleAnnouncement(id: string, isActive: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('system_announcements').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function deleteAnnouncement(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('system_announcements').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getAuditLogs(page = 1, limit = 30) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await supabase
    .from('audit_logs').select('*, admin:users(name)', { count: 'exact' })
    .order('created_at', { ascending: false }).range(from, to);
  if (error) throw new Error(error.message);
  return { data: data || [], count: count || 0, totalPages: Math.ceil((count || 0) / limit) };
}

export async function triggerBackup(schoolId: string, triggeredById: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('backups').insert([{
    school_id: schoolId, file_url: '', status: 'running', backup_type: 'manual',
    triggered_by: triggeredById,
  }]);
  if (error) throw new Error(error.message);
  // In production, this would trigger an actual pg_dump process
  return { success: true, message: 'Backup initiated' };
}

export async function logAuditAction(action: string, resourceType: string, resourceId?: string, beforeSnapshot?: any, afterSnapshot?: any, adminId?: string) {
  const supabase = createAdminClient();
  if (!adminId) return;
  await supabase.from('audit_logs').insert([{
    admin_id: adminId, action, resource_type: resourceType, resource_id: resourceId || null,
    before_snapshot: beforeSnapshot || null, after_snapshot: afterSnapshot || null,
  }]);
}
