'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { getBackups, triggerBackup, logAuditAction } from '@/app/actions/super-admin';
import { motion } from 'motion/react';
import { Database, RotateCw, Download, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BackupsPage() {
  const { t, isRTL } = useLanguage();
  const [page, setPage] = useState(1);
  const [backingUp, setBackingUp] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR(['backups', page], () => getBackups(page, 20), { refreshInterval: 10000 });

  const handleBackup = async (schoolId: string) => {
    setBackingUp(schoolId);
    try {
      await triggerBackup(schoolId);
      await logAuditAction('trigger_backup', 'backup', schoolId);
      toast.success(t('backup_initiated'));
      setTimeout(() => mutate(), 2000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBackingUp(null);
    }
  };

  const statusColors: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('super_admin_backups')}</h1>
        <p className="text-muted-foreground mt-2 font-medium">{t('manage_backups_desc')}</p>
      </div>

      <div className="text-sm text-muted-foreground bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
        <Clock size={18} className="text-primary" />
        {t('auto_backup_info')}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-semibold text-foreground">{t('school')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('type')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('status')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('size')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('date')}</th>
              <th className="text-right p-4 font-semibold text-foreground">{t('actions')}</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t('loading')}</td></tr>
              ) : data?.data?.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t('no_backups')}</td></tr>
              ) : data?.data?.map((backup: any) => (
                <tr key={backup.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium text-foreground">{backup.school?.name || backup.school_id}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${backup.backup_type === 'auto' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'}`}>
                      {backup.backup_type}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[backup.status] || 'bg-muted text-muted-foreground'}`}>
                      {backup.status === 'completed' ? <CheckCircle size={12} /> : backup.status === 'failed' ? <XCircle size={12} /> : <Loader2 size={12} className="animate-spin" />}
                      {backup.status}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{backup.size_bytes ? `${(backup.size_bytes / 1048576).toFixed(1)} MB` : '—'}</td>
                  <td className="p-4 text-muted-foreground">{new Date(backup.created_at).toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {backup.file_url && (
                        <a href={backup.file_url} target="_blank" rel="noopener noreferrer"
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors" title={t('download')}>
                          <Download size={16} />
                        </a>
                      )}
                      <button onClick={() => handleBackup(backup.school_id)} disabled={backingUp === backup.school_id}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors" title={t('backup_now')}>
                        <RotateCw size={16} className={backingUp === backup.school_id ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent disabled:opacity-30">{t('previous')}</button>
            <span className="text-sm text-muted-foreground">{t('page_of').replace('{page}', String(page)).replace('{total}', String(data.totalPages))}</span>
            <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent disabled:opacity-30">{t('next')}</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
