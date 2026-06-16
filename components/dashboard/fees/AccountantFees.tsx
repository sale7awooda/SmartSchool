'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { getStudents, getFeeStats, getFeeItems, getActiveAcademicYear, getExpenseStats } from '@/lib/supabase-db';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { useSettings, formatAmount } from '@/lib/settings-context';
import { Plus, TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, Percent, PieChart } from 'lucide-react';
import { motion } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';

// Subcomponents
import { InvoicesTab } from './InvoicesTab';
import { FeeStructureTab } from './FeeStructureTab';
import { ExpensesTab } from './ExpensesTab';

export function AccountantFees() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const { can } = usePermissions();
  
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'overdue' | 'paid' | 'void' | 'structure' | 'expenses'>('all');
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    collected: 0, 
    pending: 0, 
    overdue: 0,
    collected_this_month: 0,
    due_this_month: 0,
    expenses: 0,
    expenses_this_month: 0
  });
  const [feeStructure, setFeeStructure] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const fetchFeeData = async () => {
    setIsLoading(true);
    try {
      const items = await getFeeItems();
      setFeeStructure(items);
      const feeStats = await getFeeStats(activeAcademicYear?.name);
      let expStats = { total: 0, thisMonth: 0 };
      try {
        expStats = await getExpenseStats();
      } catch (e) {
        console.warn('Expenses not available', e);
      }
      
      setStats({
        collected: feeStats?.collected ?? 0,
        pending: feeStats?.pending ?? 0,
        overdue: feeStats?.overdue ?? 0,
        collected_this_month: feeStats?.collected_this_month ?? 0,
        due_this_month: feeStats?.due_this_month ?? 0,
        expenses: expStats.total,
        expenses_this_month: expStats.thisMonth
      });
      // Reload students to update their ledger balances reactively
      const updatedStudents = await getStudents(activeAcademicYear?.name);
      setStudents(updatedStudents);
    } catch (error) {
      console.error('Error fetching fee data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getStudents(activeAcademicYear?.name).then(setStudents).catch(console.error);
    fetchFeeData();

    // Real-time subscriptions for updating stats/fee items in parent
    const invoicesChannel = supabase
      .channel('fee_invoices_changes_parent')
      .on('postgres_changes', { event: '*', table: 'fee_invoices', schema: 'public' }, () => {
        getFeeStats(activeAcademicYear?.name).then(setStats).catch(console.error);
      })
      .subscribe();

    const itemsChannel = supabase
      .channel('fee_items_changes_parent')
      .on('postgres_changes', { event: '*', table: 'fee_items', schema: 'public' }, () => {
        getFeeItems().then(setFeeStructure).catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(itemsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAcademicYear?.name]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('fee_management')}</h1>
          <p className="text-muted-foreground mt-2 font-medium">{t('fee_management_desc')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card p-6 rounded-[2rem] border border-border shadow-sm flex flex-col justify-between min-h-[160px] animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-4 flex-1 pr-4">
                  <div className="h-2 w-28 bg-muted-foreground/20 rounded"></div>
                  <div className="h-8 w-32 bg-muted-foreground/20 rounded"></div>
                </div>
                <div className="h-10 w-10 rounded-xl shrink-0 bg-muted-foreground/10"></div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-6 w-32 rounded-full bg-muted-foreground/10"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Net Balance Card */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-card p-6 rounded-[2rem] border border-border shadow-sm flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t('net_cash_flow')}</p>
                <h3 className={`text-2xl font-black mt-1 ${stats.collected - stats.expenses >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {formatAmount(stats.collected - stats.expenses, settings?.currency)}
                </h3>
              </div>
              <div className={`p-2 rounded-xl ${(stats.collected - stats.expenses >= 0) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stats.collected_this_month - stats.expenses_this_month >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                {formatAmount(stats.collected_this_month - stats.expenses_this_month, settings?.currency)} {t('this_month')}
              </span>
            </div>
          </motion.div>

          {/* Collection Efficiency Card */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-card p-6 rounded-[2rem] border border-border shadow-sm flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t('revenue_efficiency')}</p>
                <h3 className="text-2xl font-black mt-1 text-foreground">
                  {Math.round((stats.collected / (stats.collected + stats.pending + stats.overdue + 0.00001)) * 100)}%
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Percent size={20} />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${(stats.collected / (stats.collected + stats.pending + stats.overdue + 0.00001)) * 100}%` }}
                />
              </div>
            </div>
          </motion.div>

          {/* Total Receivables Card */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-card p-6 rounded-[2rem] border border-border shadow-sm flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t('total_receivables')}</p>
                <h3 className="text-2xl font-black mt-1 text-amber-500">
                  {formatAmount(stats.pending + stats.overdue, settings?.currency)}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Clock size={20} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground mt-4">
              {formatAmount(stats.overdue, settings?.currency)} {t('is_strictly_overdue')}
            </p>
          </motion.div>

          {/* Operational Burn Card */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-card p-6 rounded-[2rem] border border-border shadow-sm flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t('operational_spend')}</p>
                <h3 className="text-2xl font-black mt-1 text-foreground">
                  {formatAmount(stats.expenses, settings?.currency)}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-muted text-muted-foreground">
                <PieChart size={20} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground mt-4">
              {t('monthly_burn')}: <span className="text-foreground">{formatAmount(stats.expenses_this_month, settings?.currency)}</span>
            </p>
          </motion.div>
        </div>
      )}

      <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden flex-1 flex flex-col">
        <InvoicesTab
          user={user}
          activeAcademicYear={activeAcademicYear}
          can={can}
          t={t}
          students={students}
          feeStructure={feeStructure}
          onInvoiceMutated={fetchFeeData}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <FeeStructureTab
          user={user}
          feeStructure={feeStructure}
          onStructureMutated={fetchFeeData}
          t={t}
          activeTab={activeTab}
        />

        <ExpensesTab
          activeTab={activeTab}
          onExpenseMutated={fetchFeeData}
          t={t}
        />
      </div>
    </motion.div>
  );
}
