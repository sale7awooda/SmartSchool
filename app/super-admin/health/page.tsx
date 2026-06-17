'use client';

import useSWR from 'swr';
import { useLanguage } from '@/lib/language-context';
import { getSystemHealth } from '@/app/actions/super-admin';
import { motion } from 'motion/react';
import { HeartPulse, School, AlertTriangle, HardDrive, CheckCircle, XCircle } from 'lucide-react';

export default function HealthPage() {
  const { t, isRTL } = useLanguage();
  const { data, isLoading } = useSWR('system-health', getSystemHealth, { refreshInterval: 30000 });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold text-foreground tracking-tight">{t('super_admin_health')}</h1></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse"><div className="h-16 bg-muted rounded-lg" /></div>)}
        </div>
      </div>
    );
  }

  const totalStorageGB = (data?.totalStorage || 0) / (1024 * 1024 * 1024);
  const activeSchools = data?.schools?.filter((s: any) => s.is_active).length || 0;
  const totalSchools = data?.schools?.length || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('super_admin_health')}</h1>
        <p className="text-muted-foreground mt-2 font-medium">{t('system_health_desc')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0"><School size={24} className="text-white" /></div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">{t('total_schools')}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalSchools}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{activeSchools} {t('active').toLowerCase()}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0"><CheckCircle size={24} className="text-white" /></div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">{t('healthy_schools')}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalSchools - ((data?.failedBackups || 0) > 0 ? 1 : 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('no_issues')}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0"><AlertTriangle size={24} className="text-white" /></div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">{t('failed_backups')}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{data?.failedBackups || 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{data?.failedBackups ? t('needs_attention') : t('all_clear')}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center shrink-0"><HardDrive size={24} className="text-white" /></div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">{t('total_storage')}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalStorageGB.toFixed(2)} GB</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('across_all_schools')}</p>
          </div>
        </div>
      </div>

      {/* School health list */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{t('school_health_status')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-semibold text-foreground">{t('school')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('status')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('users_count')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('students_count')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('storage')}</th>
            </tr></thead>
            <tbody>
              {data?.schools?.map((school: any) => {
                const storageMB = ((school.storage_used_bytes || 0) / 1048576).toFixed(1);
                return (
                  <tr key={school.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{school.name}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        school.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {school.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {school.is_active ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">{school.user_count || 0}</td>
                    <td className="p-4 text-muted-foreground">{school.student_count || 0}</td>
                    <td className="p-4 text-muted-foreground">{storageMB} MB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
