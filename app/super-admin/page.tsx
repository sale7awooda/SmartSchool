'use client';

import useSWR from 'swr';
import { useLanguage } from '@/lib/language-context';
import { getSuperAdminStats } from '@/app/actions/super-admin';
import { School, Users, Database, AlertTriangle, CreditCard } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon size={24} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { t } = useLanguage();
  const { data: stats, isLoading } = useSWR('super-admin-stats', getSuperAdminStats, { refreshInterval: 30000 });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold text-foreground tracking-tight">{t('super_admin_dashboard')}</h1></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse"><div className="h-16 bg-muted rounded-lg" /></div>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { icon: School, label: t('total_schools'), value: stats?.totalSchools || 0, sub: `${stats?.activeSchools || 0} ${t('active')}`, color: 'bg-blue-500' },
    { icon: Users, label: t('total_users'), value: stats?.totalUsers || 0, sub: `${t('excluding_super_admin')}`, color: 'bg-emerald-500' },
    { icon: CreditCard, label: t('subscription_plans'), value: stats?.plans?.length || 0, sub: t('available_plans'), color: 'bg-violet-500' },
    { icon: AlertTriangle, label: t('failed_backups'), value: stats?.failedBackups || 0, sub: stats?.failedBackups ? t('needs_attention') : t('all_clear'), color: stats?.failedBackups ? 'bg-red-500' : 'bg-green-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('super_admin_dashboard')}</h1>
        <p className="text-muted-foreground mt-2 font-medium">{t('super_admin_dashboard_desc')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => <StatCard key={i} {...c} />)}
      </div>
    </div>
  );
}
