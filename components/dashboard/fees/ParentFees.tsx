'use client';

import useSWR, { mutate } from 'swr';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { FeeInvoice } from '@/lib/mock-db';
import { getPaginatedInvoices, createInvoice, updateInvoice, getStudents, getFeeStats, getFeeItems, createFeeItem, updateFeeItem, deleteFeeItem, recordPayment, getActiveAcademicYear } from '@/lib/supabase-db';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { CreditCard, Search, CheckCircle2, Clock, AlertCircle, FileText, Download, Plus, DollarSign, Loader2, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner";

export function ParentFees() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isPayNowOpen, setIsPayNowOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedInvoiceToPay, setSelectedInvoiceToPay] = useState<FeeInvoice | null>(null);
  
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: invoicesResponse, isLoading } = useSWR(
    user?.studentId ? ['parent_invoices', page, user.studentId] : null,
    ([_, p, studentId]) => getPaginatedInvoices(p, limit, '', studentId)
  );

  const invoices = invoicesResponse?.data || [];
  const totalPages = invoicesResponse?.totalPages || 1;
  const totalCount = invoicesResponse?.count || 0;

  const myInvoices = invoices.map((inv: any) => ({
    id: inv.id,
    studentId: inv.student_id,
    studentName: inv.student?.user?.name || 'Unknown Student',
    amount: inv.amount,
    dueDate: inv.due_date,
    status: inv.status,
    description: inv.description
  }));

  const { data: studentDetails } = useSWR(
    user?.studentId ? ['student_details', user.studentId] : null,
    async ([_, id]) => {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();
      return data;
    }
  );

  const pendingTotal = myInvoices.filter((inv: any) => inv.status !== 'paid').reduce((sum: number, inv: any) => sum + inv.amount, 0);

  useEffect(() => {
    // Real-time subscription for parent's student invoices
    if (!user?.studentId) return;

    const channel = supabase
      .channel(`parent_invoices_${user.studentId}`)
      .on('postgres_changes', { 
        event: '*', 
        table: 'fee_invoices', 
        schema: 'public',
        filter: `student_id=eq.${user.studentId}`
      }, () => {
        mutate(['parent_invoices', page, user.studentId]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.studentId, page]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsProcessingPayment(true);
    try {
      if (selectedInvoiceToPay) {
        // Pay single invoice
        await recordPayment({
          invoiceId: selectedInvoiceToPay.id,
          amount: selectedInvoiceToPay.amount,
          paymentMethod: 'Card',
          referenceNumber: `ONLINE-${Date.now()}`,
          recordedBy: user.id
        });
      } else {
        // Pay all pending invoices
        const pendingInvoices = myInvoices.filter((inv: any) => inv.status !== 'paid');
        for (const inv of pendingInvoices) {
          await recordPayment({
            invoiceId: inv.id,
            amount: inv.amount,
            paymentMethod: 'Card',
            referenceNumber: `ONLINE-BATCH-${Date.now()}`,
            recordedBy: user.id
          });
        }
      }
      
      mutate(['parent_invoices', page, user?.studentId]);
      toast.success(t('payment_successful'), {
        description: t('payment_processed_desc'),
      });
      setIsPayNowOpen(false);
      setSelectedInvoiceToPay(null);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(t('failed_to_process_payment'));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const openPaymentModal = (invoice?: FeeInvoice) => {
    setSelectedInvoiceToPay(invoice || null);
    setIsPayNowOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('fees_payments')}</h1>
        <p className="text-muted-foreground mt-2 font-medium">{t('manage_payments_for')} {user?.studentId}</p>
      </div>

      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-[2rem] p-8 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="text-primary-foreground/80 text-sm font-bold uppercase tracking-wider mb-2">{t('total_amount_due')}</p>
            <h2 className="text-5xl font-bold tracking-tight">${pendingTotal}</h2>
            {pendingTotal > 0 && (
              <p className="text-amber-400 text-sm font-medium mt-3 flex items-center gap-2 bg-amber-400/10 w-fit px-3 py-1.5 rounded-lg border border-amber-400/20">
                <AlertCircle size={16} />
                {t('outstanding_balance_warning')}
              </p>
            )}
          </div>
          {pendingTotal > 0 && (
            <button 
              onClick={() => openPaymentModal()}
              className="px-8 py-4 bg-background text-foreground rounded-xl font-bold hover:bg-accent transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
            >
              <CreditCard size={20} />
              {t('pay_now')}
            </button>
          )}
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10 rtl:right-auto rtl:-left-10">
          <DollarSign size={160} />
        </div>
      </div>

      {studentDetails?.fee_structure && (
        <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm">
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            {t('assigned_fee_structure')}
          </h3>
          <div className="p-4 bg-muted/50 rounded-xl border border-border">
            <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
              {studentDetails.fee_structure}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-5 flex-1 flex flex-col overflow-hidden">
        <h3 className="text-xl font-bold text-foreground shrink-0">{t('invoice_history')}</h3>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-5">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-5 w-full">
                    <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
                    <div className="space-y-2 w-full max-w-md">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-6 w-20 rounded-lg" />
                      </div>
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-10 w-28 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : myInvoices.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground font-medium">{t('no_invoices_found')}</div>
          ) : myInvoices.map((invoice: any) => (
          <div key={invoice.id} className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:shadow-md transition-all">
            <div className="flex items-start gap-5">
              <div className={`mt-1 p-4 rounded-2xl shrink-0 shadow-inner ${
                invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                invoice.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                'bg-amber-500/10 text-amber-500'
              }`}>
                {invoice.status === 'paid' ? <CheckCircle2 size={28} /> : 
                 invoice.status === 'overdue' ? <AlertCircle size={28} /> : 
                 <Clock size={28} />}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="font-bold text-foreground text-xl">{invoice.description}</p>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t('invoice')}: {invoice.id}</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {invoice.status === 'paid' ? `${t('paid_on')} ${new Date(invoice.updated_at).toLocaleDateString()}` : `${t('due_by')} ${new Date(invoice.dueDate).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 border-t sm:border-0 border-border pt-5 sm:pt-0">
              <p className="text-3xl font-bold text-foreground">${invoice.amount}</p>
              <div className="flex gap-2">
                {invoice.status === 'paid' && (
                  <button 
                    onClick={() => toast.success(t('downloading_receipt'), { description: `${t('receipt_for')} ${invoice.id} ${t('is_being_prepared')}` })}
                    className="p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors" 
                    title={t('download_receipt')}
                  >
                    <Download size={20} />
                  </button>
                )}
                {invoice.status !== 'paid' && (
                  <button 
                    onClick={() => openPaymentModal(invoice)}
                    className="px-6 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-bold transition-colors"
                  >
                    {t('pay')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 shrink-0 rounded-xl mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors flex items-center gap-1"
          >
            <ChevronLeft size={16} className="rtl:rotate-180" /> {t('previous')}
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
            className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors flex items-center gap-1"
          >
            {t('next')} <ChevronRight size={16} className="rtl:rotate-180" />
          </button>
        </div>
      )}
      </div>

      <AnimatePresence>
        {isPayNowOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{t('secure_checkout')}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">
                  {selectedInvoiceToPay ? `${t('paying_for')} ${selectedInvoiceToPay.description}` : t('paying_total_outstanding')}
                </p>
              </div>
              
              <form onSubmit={handlePay} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 mb-6 flex items-center justify-between">
                  <span className="font-bold text-foreground">{t('total_to_pay')}</span>
                  <span className="font-black text-primary text-2xl">
                    ${selectedInvoiceToPay ? selectedInvoiceToPay.amount : pendingTotal}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('cardholder_name')}</label>
                  <input required type="text" placeholder={t('cardholder_name_placeholder')} className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('card_number')}</label>
                  <div className="relative">
                    <CreditCard size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-4" />
                    <input required type="text" placeholder="0000 0000 0000 0000" maxLength={19} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground tracking-widest rtl:pl-4 rtl:pr-12" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('expiry_date')}</label>
                    <input required type="text" placeholder="MM/YY" maxLength={5} className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground text-center" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('cvc')}</label>
                    <input required type="text" placeholder="123" maxLength={4} className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground text-center" />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsPayNowOpen(false);
                      setSelectedInvoiceToPay(null);
                    }}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isProcessingPayment}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isProcessingPayment ? <Loader2 size={20} className="animate-spin" /> : t('pay_securely')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
