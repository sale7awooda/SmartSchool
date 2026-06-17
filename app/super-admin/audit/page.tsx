'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { getAuditLogs } from '@/app/actions/super-admin';
import { motion } from 'motion/react';
import { Shield, Search, Filter } from 'lucide-react';

export default function AuditPage() {
  const { t, isRTL } = useLanguage();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR(['audit', page], () => getAuditLogs(page, 30));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('super_admin_audit')}</h1>
        <p className="text-muted-foreground mt-2 font-medium">{t('audit_log_desc')}</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-semibold text-foreground">{t('time')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('admin')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('action')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('resource')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('resource_id')}</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('loading')}</td></tr>
              ) : data?.data?.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('no_audit_logs')}</td></tr>
              ) : data?.data?.map((log: any) => (
                <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-muted-foreground text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="p-4 font-medium text-foreground">{log.admin?.name || '—'}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent text-foreground">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{log.resource_type}</td>
                  <td className="p-4 text-muted-foreground text-xs font-mono max-w-[200px] truncate">{log.resource_id || '—'}</td>
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
