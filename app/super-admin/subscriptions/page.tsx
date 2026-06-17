'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { getSubscriptionPlans, createPlan, updatePlan, deletePlan, logAuditAction } from '@/app/actions/super-admin';
import { motion } from 'motion/react';
import { Plus, Loader2, Edit2, Trash2, DollarSign, Users, Database as DatabaseIcon } from 'lucide-react';
import { toast } from 'sonner';

const billingTypes = ['monthly', 'yearly', 'one_time'];
const moduleOptions = ['students', 'attendance', 'schedule', 'communication', 'fees', 'analytics', 'report_cards', 'library', 'transport', 'inventory', 'exams', 'hr', 'visitors', 'medical'];

export default function SubscriptionsPage() {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { data: plans, isLoading, mutate } = useSWR('plans', getSubscriptionPlans);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: 0, billing_type: 'monthly', max_students: -1, max_staff: -1, storage_limit_mb: 500, enabled_modules: ['students', 'attendance'] });

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', price: 0, billing_type: 'monthly', max_students: -1, max_staff: -1, storage_limit_mb: 500, enabled_modules: ['students', 'attendance'] }); setShowForm(true); };
  const openEdit = (plan: any) => { setEditing(plan); setForm({ name: plan.name, description: plan.description || '', price: parseFloat(plan.price) || 0, billing_type: plan.billing_type, max_students: plan.max_students, max_staff: plan.max_staff, storage_limit_mb: plan.storage_limit_mb, enabled_modules: plan.enabled_modules || [] }); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error(t('name_required'));
    setSubmitting(true);
    try {
      if (editing) {
        await updatePlan(editing.id, form);
        await logAuditAction('update_plan', 'subscription_plan', editing.id, undefined, undefined, user!.id);
      } else {
        await createPlan(form);
        await logAuditAction('create_plan', 'subscription_plan', form.name, undefined, undefined, user!.id);
      }
      toast.success(editing ? t('plan_updated') : t('plan_created'));
      setShowForm(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (plan: any) => {
    if (!confirm(t('confirm_delete_plan'))) return;
    try {
      await deletePlan(plan.id);
      await logAuditAction('delete_plan', 'subscription_plan', plan.id, undefined, undefined, user!.id);
      toast.success(t('plan_deleted'));
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleModule = (mod: string) => {
    setForm(f => ({
      ...f,
      enabled_modules: f.enabled_modules.includes(mod)
        ? f.enabled_modules.filter((m: string) => m !== mod)
        : [...f.enabled_modules, mod],
    }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('super_admin_subscriptions')}</h1>
          <p className="text-muted-foreground mt-2 font-medium">{t('manage_plans_desc')}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium text-sm shadow-sm">
          <Plus size={18} /> {t('add_plan')}
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !submitting && setShowForm(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-foreground mb-6">{editing ? t('edit_plan') : t('add_plan')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('name')} *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm" /></div>
              <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('description')}</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm min-h-[60px]" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('price')}</label>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm" /></div>
                <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('billing_type')}</label>
                  <select value={form.billing_type} onChange={e => setForm({ ...form, billing_type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm">
                    {billingTypes.map(bt => <option key={bt} value={bt}>{bt.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('max_students')}</label>
                  <input type="number" value={form.max_students} onChange={e => setForm({ ...form, max_students: parseInt(e.target.value) || -1 })}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm" /></div>
                <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('max_staff')}</label>
                  <input type="number" value={form.max_staff} onChange={e => setForm({ ...form, max_staff: parseInt(e.target.value) || -1 })}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm" /></div>
                <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('storage_mb')}</label>
                  <input type="number" value={form.storage_limit_mb} onChange={e => setForm({ ...form, storage_limit_mb: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm" /></div>
              </div>
              <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('enabled_modules')}</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border rounded-xl p-3">
                  {moduleOptions.map(mod => (
                    <label key={mod} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.enabled_modules.includes(mod)} onChange={() => toggleModule(mod)}
                        className="rounded border-border text-primary" />
                      <span className="capitalize">{mod.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} disabled={submitting}
                  className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">{t('cancel')}</button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium disabled:opacity-50">
                  {submitting && <Loader2 size={16} className="animate-spin" />} {editing ? t('update') : t('create')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Plans grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse"><div className="h-48 bg-muted rounded-lg" /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans?.map((plan: any) => (
            <div key={plan.id} className="bg-card border border-border rounded-2xl p-6 relative group">
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(plan)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(plan)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign size={20} className="text-primary" /></div>
                <div>
                  <h3 className="font-bold text-foreground">{plan.name}</h3>
                  <span className="text-xs text-muted-foreground">{plan.billing_type.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-4">${parseFloat(plan.price).toFixed(2)}</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Users size={14} /> {plan.max_students === -1 ? t('unlimited') : `${plan.max_students} ${t('students').toLowerCase()}`}</div>
                <div className="flex items-center gap-2"><DatabaseIcon size={14} /> {plan.storage_limit_mb} MB</div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-medium text-foreground mb-2">{t('modules')}:</p>
                <div className="flex flex-wrap gap-1.5">
                  {(plan.enabled_modules || []).map((mod: string) => (
                    <span key={mod} className="px-2 py-0.5 bg-accent text-muted-foreground rounded-md text-[10px]">{mod}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
