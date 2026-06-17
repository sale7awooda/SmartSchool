'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { getSchools, createSchool, toggleSchoolStatus, logAuditAction } from '@/app/actions/super-admin';
import { motion } from 'motion/react';
import { School, Plus, Search, CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SchoolsPage() {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', subdomain: '', email: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, mutate } = useSWR(['schools', page, search], () => getSchools(page, 20, search));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error(t('name_required'));
    setSubmitting(true);
    try {
      await createSchool(form);
      await logAuditAction('create', 'school', form.name, undefined, undefined, user!.id);
      toast.success(t('school_created'));
      setShowCreate(false);
      setForm({ name: '', subdomain: '', email: '', phone: '', address: '' });
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleSchoolStatus(id, !current);
      await logAuditAction(current ? 'deactivate' : 'activate', 'school', id, undefined, undefined, user!.id);
      toast.success(t('status_updated'));
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('super_admin_schools')}</h1>
          <p className="text-muted-foreground mt-2 font-medium">{t('manage_schools_desc')}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium text-sm shadow-sm">
          <Plus size={18} /> {t('add_school')}
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('search_schools')} dir={isRTL ? 'rtl' : 'ltr'}
          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !submitting && setShowCreate(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-foreground mb-6">{t('add_school')}</h2>
            <form onSubmit={handleCreate} className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
              <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('name')} *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" dir={isRTL ? 'rtl' : 'ltr'} /></div>
              <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('subdomain')}</label>
                <input value={form.subdomain} onChange={e => setForm({ ...form, subdomain: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('email')}</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" /></div>
                <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('phone')}</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" /></div>
              </div>
              <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('address')}</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm min-h-[60px]" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} disabled={submitting}
                  className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t('cancel')}</button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50">
                  {submitting && <Loader2 size={16} className="animate-spin" />} {t('create')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-semibold text-foreground">{t('name')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('subdomain')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('email')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('status')}</th>
              <th className="text-right p-4 font-semibold text-foreground">{t('actions')}</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('loading')}</td></tr>
              ) : data?.data?.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('no_schools_found')}</td></tr>
              ) : data?.data?.map((school: any) => (
                <tr key={school.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium text-foreground">{school.name}</td>
                  <td className="p-4 text-muted-foreground">{school.subdomain || '—'}</td>
                  <td className="p-4 text-muted-foreground">{school.email || '—'}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      school.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {school.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {school.is_active ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/super-admin/schools/${school.id}`}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                        <ExternalLink size={16} />
                      </Link>
                      <button onClick={() => handleToggle(school.id, school.is_active)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors text-xs">
                        {school.is_active ? t('deactivate') : t('activate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border" dir={isRTL ? 'rtl' : 'ltr'}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent disabled:opacity-30 transition-colors">{t('previous')}</button>
            <span className="text-sm text-muted-foreground">{t('page_of').replace('{page}', String(page)).replace('{total}', String(data.totalPages))}</span>
            <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent disabled:opacity-30 transition-colors">{t('next')}</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
