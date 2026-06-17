'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { getSchoolById, updateSchool, updateSchoolConfig, toggleMaintenanceMode, assignPlanToSchool, getSubscriptionPlans, logAuditAction } from '@/app/actions/super-admin';
import { motion } from 'motion/react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  const { data: school, isLoading, mutate } = useSWR(['school', id], () => getSchoolById(id));
  const { data: plans } = useSWR('plans-dropdown', getSubscriptionPlans);

  const [form, setForm] = useState<any>(null);
  const schoolData = form || school;

  if (isLoading) return <div className="space-y-4 animate-pulse"><div className="h-8 w-48 bg-muted rounded-lg" /><div className="h-64 bg-muted rounded-2xl" /></div>;
  if (!school) return <div className="text-center text-muted-foreground py-12">{t('school_not_found')}</div>;

  const handleSave = async () => {
    if (!schoolData) return;
    setSaving(true);
    try {
      await updateSchool(id, { name: schoolData.name, email: schoolData.email, phone: schoolData.phone, address: schoolData.address });
      await logAuditAction('update_school', 'school', id);
      toast.success(t('saved'));
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfigSave = async (field: string, config: any) => {
    try {
      await updateSchoolConfig(id, field as any, config);
      await logAuditAction(`update_${field}`, 'school_config', id);
      toast.success(t('config_saved'));
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleMaintenance = async () => {
    try {
      const newVal = !school.maintenance_mode;
      await toggleMaintenanceMode(id, newVal, newVal ? maintenanceMsg : undefined);
      await logAuditAction(newVal ? 'enable_maintenance' : 'disable_maintenance', 'school', id);
      toast.success(newVal ? t('maintenance_enabled') : t('maintenance_disabled'));
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAssignPlan = async (planId: string) => {
    try {
      await assignPlanToSchool(id, planId);
      await logAuditAction('assign_plan', 'subscription', id);
      toast.success(t('plan_assigned'));
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOverrideModule = async (moduleName: string, enabled: boolean) => {
    const supabase = (await import('@/lib/supabase/client')).supabase;
    try {
      const existing = school.school_module_overrides?.find((o: any) => o.module_name === moduleName);
      if (existing) {
        await supabase.from('school_module_overrides').update({ is_enabled: enabled }).eq('id', existing.id);
      } else {
        await supabase.from('school_module_overrides').insert([{ school_id: id, module_name: moduleName, is_enabled: enabled }]);
      }
      toast.success(t('module_override_updated'));
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const allModules = ['transport', 'inventory', 'exams', 'hr', 'visitors', 'communication', 'fees', 'analytics', 'report_cards', 'library', 'medical', 'schedule'];
  const enabledModules = school.advanced_config?.features?.enabled_modules || allModules;
  const overrides = school.school_module_overrides || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/super-admin/schools')} className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{school.name}</h1>
          <p className="text-sm text-muted-foreground">{school.subdomain ? `${school.subdomain}.school.com` : t('no_subdomain')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic info */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground">{t('basic_info')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground block mb-1">{t('name')}</label>
              <input value={schoolData?.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">{t('email')}</label>
              <input value={schoolData?.email || ''} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">{t('phone')}</label>
              <input value={schoolData?.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">{t('status')}</label>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${school.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {school.is_active ? t('active') : t('inactive')}
              </span>
            </div>
          </div>
          <div><label className="text-xs text-muted-foreground block mb-1">{t('address')}</label>
            <textarea value={schoolData?.address || ''} onChange={e => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[60px]" /></div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />} <Save size={16} /> {t('save_changes')}
          </button>
        </div>

        {/* Subscription */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground">{t('subscription')}</h2>
          <div className="text-sm space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">{t('current_plan')}</span>
              <span className="font-medium">{school.subscription_tier || t('no_plan')}</span>
            </div>
            <div><label className="text-xs text-muted-foreground block mb-1">{t('change_plan')}</label>
              <select onChange={e => e.target.value && handleAssignPlan(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm">
                <option value="">{t('select_plan')}</option>
                {plans?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>{t('storage_used')}: {(school.storage_used_bytes / 1048576).toFixed(1)} MB</p>
            <p>{t('users_count')}: {school.user_count || 0}</p>
            <p>{t('students_count')}: {school.student_count || 0}</p>
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground">{t('maintenance')}</h2>
          <div className="flex items-center gap-3">
            <button onClick={handleMaintenance}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                school.maintenance_mode ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}>
              {school.maintenance_mode ? t('disable_maintenance') : t('enable_maintenance')}
            </button>
            {school.maintenance_mode && <span className="text-xs text-amber-600 font-medium">{t('maintenance_active')}</span>}
          </div>
          <div><label className="text-xs text-muted-foreground block mb-1">{t('maintenance_message')}</label>
            <input value={maintenanceMsg} onChange={e => setMaintenanceMsg(e.target.value)}
              placeholder={t('maintenance_message_placeholder')}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" /></div>
        </div>

        {/* Module overrides */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground">{t('module_overrides')}</h2>
          <div className="grid grid-cols-2 gap-2">
            {allModules.map(mod => {
              const override = overrides.find((o: any) => o.module_name === mod);
              const enabled = override ? override.is_enabled : enabledModules.includes(mod);
              return (
                <label key={mod} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-accent">
                  <input type="checkbox" checked={enabled} onChange={() => handleOverrideModule(mod, !enabled)}
                    className="rounded border-border text-primary focus:ring-primary/30" />
                  <span className="capitalize">{mod.replace(/_/g, ' ')}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
