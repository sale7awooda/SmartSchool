'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { getSuperAdminUsers } from '@/app/actions/super-admin';
import { motion } from 'motion/react';
import { Users, Search, Shield, UserCheck, UserX } from 'lucide-react';

const roleColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  teacher: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  accountant: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  staff: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  parent: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  student: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

export default function UsersPage() {
  const { t, isRTL } = useLanguage();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useSWR(['super-users', page, search], () => getSuperAdminUsers(page, 20, search));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('super_admin_users')}</h1>
        <p className="text-muted-foreground mt-2 font-medium">{t('manage_users_desc')}</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('search_users')}
          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-semibold text-foreground">{t('name')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('email')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('role')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('school')}</th>
              <th className="text-left p-4 font-semibold text-foreground">{t('status')}</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('loading')}</td></tr>
              ) : data?.data?.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('no_users_found')}</td></tr>
              ) : data?.data?.map((user: any) => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-foreground">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{user.email}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-muted text-muted-foreground'}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{user.school?.name || '—'}</td>
                  <td className="p-4">
                    {user.is_active !== false ? (
                      <UserCheck size={16} className="text-emerald-500" />
                    ) : (
                      <UserX size={16} className="text-red-500" />
                    )}
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
