'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { useLanguage } from '@/lib/language-context';
import { getPaginatedVisitors, createVisitor } from '@/lib/supabase-db';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { UserCheck, Plus, Search, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VisitorsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { t } = useLanguage();
  const [isNewCheckInOpen, setIsNewCheckInOpen] = useState(false);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: response, isLoading, mutate } = useSWR(
    ['visitors', page, debouncedSearch],
    ([_, p, s]) => getPaginatedVisitors(p, limit, s)
  );

  const visitors = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const totalCount = response?.count || 0;

  if (!user) return null;

  if (!can('view', 'visitors')) {
    return <div className="p-4">{t('no_permission')}</div>;
  }

  const handleNewCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const visitorData = {
      name: formData.get('name'),
      purpose: formData.get('purpose'),
      host: formData.get('host'),
      status: 'Active',
      time_in: new Date().toLocaleTimeString(),
    };

    setIsSubmittingCheckIn(true);
    try {
      await createVisitor(visitorData);
      toast.success("Visitor checked in successfully");
      setIsNewCheckInOpen(false);
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("Failed to check in visitor");
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('visitors')}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="space-y-6">
          <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50">
              <div className="flex items-center gap-3 w-full">
                <div className="relative flex-1 sm:flex-none">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
                  <input 
                    type="text" 
                    placeholder={t('search')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-64 rtl:pl-4 rtl:pr-9"
                  />
                </div>
                {can('create', 'visitors') && (
                  <button 
                    onClick={() => setIsNewCheckInOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Plus size={16} />
                    {t('new_check_in')}
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse rtl:text-right">
                <thead>
                  <tr className="bg-card border-b border-border">
                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('visitor')}</th>
                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('purpose_host')}</th>
                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('time')}</th>
                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('status')}</th>
                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right rtl:text-left">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </td>
                        <td className="p-4 space-y-2">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </td>
                        <td className="p-4 text-right">
                          <Skeleton className="h-8 w-8 rounded-lg inline-block" />
                        </td>
                      </tr>
                    ))
                  ) : visitors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground font-medium">{t('no_visitors_found')}</td>
                    </tr>
                  ) : visitors.map((visitor: any) => (
                    <tr key={visitor.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">
                            {visitor.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">{visitor.name}</p>
                            <p className="text-xs text-muted-foreground font-medium">Badge: {visitor.badgeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-foreground">{visitor.purpose}</p>
                        <p className="text-xs text-muted-foreground font-medium">Host: {visitor.host}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-foreground">In: {visitor.timeIn}</p>
                        {visitor.timeOut && <p className="text-xs text-muted-foreground font-medium">Out: {visitor.timeOut}</p>}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${visitor.status === 'Active' ? 'bg-emerald-500/100/20 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                          {visitor.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {visitor.status === 'Active' && can('manage', 'visitors') && (
                            <>
                              <button 
                                onClick={() => toast.success('Badge sent to printer')}
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                                title="Print Badge"
                              >
                                <Printer size={18} />
                              </button>
                              <button 
                                onClick={() => toast.success('Visitor checked out')}
                                className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                              >
                                Check Out
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 shrink-0">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  {t('previous')}
                </button>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('page')} <span className="text-foreground font-bold">{page}</span> {t('of')} <span className="text-foreground font-bold">{totalPages}</span>
                  </span>
                  <span className="text-sm font-medium text-muted-foreground border-l border-border pl-4 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-4">
                    {t('total')}: <span className="text-foreground font-bold">{totalCount}</span>
                  </span>
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  {t('next')}
                </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {isNewCheckInOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
                >
                  <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">{t('new_visitor_checkin')}</h2>
                    <p className="text-sm font-medium text-muted-foreground mt-2">{t('new_visitor_desc')}</p>
                  </div>
                  
                  <form onSubmit={handleNewCheckIn} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">{t('full_name')}</label>
                      <input required name="name" type="text" placeholder="e.g., John Doe" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">{t('purpose_of_visit')}</label>
                      <input required name="purpose" type="text" placeholder="e.g., Parent-Teacher Meeting" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">{t('host_staff_member')}</label>
                      <input required name="host" type="text" placeholder="e.g., Edna Krabappel" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                    </div>

                    <div className="flex gap-3 pt-6">
                      <button 
                        type="button"
                        onClick={() => setIsNewCheckInOpen(false)}
                        className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                      >
                        {t('cancel')}
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmittingCheckIn}
                        className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                      >
                        {isSubmittingCheckIn ? <Loader2 size={20} className="animate-spin" /> : t('check_in_print')}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
