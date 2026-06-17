'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { getAnnouncements, createAnnouncement, toggleAnnouncement, deleteAnnouncement, logAuditAction } from '@/app/actions/super-admin';
import { motion } from 'motion/react';
import { Megaphone, Plus, Loader2, Eye, EyeOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AnnouncementsPage() {
  const { t, isRTL } = useLanguage();
  const { data: announcements, isLoading, mutate } = useSWR('announcements', getAnnouncements);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', announcement_type: 'banner', school_id: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return toast.error(t('title_content_required'));
    setSubmitting(true);
    try {
      await createAnnouncement({ ...form, school_id: form.school_id || undefined });
      await logAuditAction('create_announcement', 'system_announcement', form.title);
      toast.success(t('announcement_created'));
      setShowForm(false);
      setForm({ title: '', content: '', announcement_type: 'banner', school_id: '' });
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await toggleAnnouncement(id, !active);
      await logAuditAction(active ? 'deactivate' : 'activate', 'system_announcement', id);
      toast.success(t('announcement_updated'));
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete_announcement'))) return;
    try {
      await deleteAnnouncement(id);
      await logAuditAction('delete_announcement', 'system_announcement', id);
      toast.success(t('announcement_deleted'));
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('super_admin_announcements')}</h1>
          <p className="text-muted-foreground mt-2 font-medium">{t('manage_announcements_desc')}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium text-sm shadow-sm">
          <Plus size={18} /> {t('add_announcement')}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !submitting && setShowForm(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-foreground mb-6">{t('add_announcement')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('title')} *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm" /></div>
              <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('content')} *</label>
                <textarea required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm min-h-[100px]" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('type')}</label>
                  <select value={form.announcement_type} onChange={e => setForm({ ...form, announcement_type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm">
                    <option value="banner">{t('banner')}</option>
                    <option value="popup">{t('popup')}</option>
                    <option value="both">{t('both')}</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium text-foreground block mb-1.5">{t('target_school')}</label>
                  <select value={form.school_id} onChange={e => setForm({ ...form, school_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm">
                    <option value="">{t('all_schools')}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} disabled={submitting}
                  className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">{t('cancel')}</button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium disabled:opacity-50">
                  {submitting && <Loader2 size={16} className="animate-spin" />} {t('create')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse"><div className="h-16 bg-muted rounded-lg" /></div>)
        ) : announcements?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t('no_announcements')}</div>
        ) : announcements?.map((a: any) => (
          <div key={a.id} className="bg-card border border-border rounded-2xl p-5 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{a.title}</h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                  a.announcement_type === 'banner' ? 'bg-blue-100 text-blue-700' : a.announcement_type === 'popup' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'
                }`}>{a.announcement_type}</span>
                {a.is_active ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-100 text-emerald-700">{t('active')}</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-100 text-red-700">{t('inactive')}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{a.content}</p>
              <p className="text-xs text-muted-foreground mt-2">{a.school_id ? t('specific_school') : t('all_schools')} &middot; {new Date(a.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handleToggle(a.id, a.is_active)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors" title={a.is_active ? t('deactivate') : t('activate')}>
                {a.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button onClick={() => handleDelete(a.id)}
                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title={t('delete')}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
