'use client';

import useSWR, { mutate } from 'swr';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { FeeInvoice } from '@/types';
import { getPaginatedInvoices, createInvoice, updateInvoice, getStudents, getFeeStats, getFeeItems, createFeeItem, updateFeeItem, deleteFeeItem, recordPayment, getActiveAcademicYear } from '@/lib/supabase-db';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { useSettings, formatAmount } from '@/lib/settings-context';
import { CreditCard, Search, CheckCircle2, Clock, AlertCircle, FileText, Download, Plus, DollarSign, Loader2, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner";

export function ParentFees() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const [isPayNowOpen, setIsPayNowOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedInvoiceToPay, setSelectedInvoiceToPay] = useState<FeeInvoice | null>(null);
  
  const [page, setPage] = useState(1);
  const limit = 10;
  const [customPaymentAmount, setCustomPaymentAmount] = useState<string>('');
  const [selectedDetailInvoice, setSelectedDetailInvoice] = useState<FeeInvoice | null>(null);

  const { data: invoicePayments, mutate: mutateInvoicePayments } = useSWR(
    selectedDetailInvoice ? ['parent_invoice_payments', selectedDetailInvoice.id] : null,
    async ([_, invoiceId]) => {
      const { data, error } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  );

  // For parents with multiple children, use studentIds. For a single student, use studentId.
  const targetIds = user?.studentId ? user.studentId : user?.studentIds && user.studentIds.length > 0 ? user.studentIds : null;

  const { data: invoicesResponse, isLoading, mutate: mutateInvoices } = useSWR(
    targetIds ? ['parent_invoices', page, targetIds] : null,
    ([_, p, tIds]) => getPaginatedInvoices(p, limit, '', tIds)
  );

  const invoices = invoicesResponse?.data || [];
  const totalPages = invoicesResponse?.totalPages || 1;
  const totalCount = invoicesResponse?.count || 0;

  const myInvoices: FeeInvoice[] = invoices.map((inv: any) => ({
    id: inv.id,
    studentId: inv.student_id,
    studentName: inv.student?.user?.name || 'Unknown Student',
    amount: inv.amount,
    balanceDue: inv.balance_due !== undefined ? inv.balance_due : inv.amount,
    dueDate: inv.due_date,
    status: inv.status,
    description: inv.description || inv.title || 'General Tuition Fee',
    term: inv.term || '',
    grade: inv.student_grade || inv.grade || '',
    items: inv.items || []
  }));

  // Sort invoices chronologically by due date so we handle installment progression in correct order
  const chronSortedInvoices = [...myInvoices].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  
  // Show all invoices!
  const visibleInvoices = chronSortedInvoices;

  const activeUnpaidInvoice = visibleInvoices.find((inv: any) => inv.status !== 'paid');
  const activeAmountDue = activeUnpaidInvoice ? (activeUnpaidInvoice.balanceDue ?? activeUnpaidInvoice.amount) : 0;

  const { data: studentDetails, mutate: mutateStudentDetails } = useSWR(
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

  // Total outstanding balance (pendingTotal) is sum of all unpaid balances
  const pendingTotal = chronSortedInvoices
    .filter((inv: any) => inv.status !== 'paid' && inv.status !== 'void')
    .reduce((sum, inv) => sum + (inv.balanceDue ?? inv.amount), 0);

  useEffect(() => {
    // Real-time subscription for parent's student invoices and payments
    if (!user?.studentId) return;

    const channel = supabase
      .channel(`parent_invoices_${user.studentId}`)
      .on('postgres_changes', { 
        event: '*', 
        table: 'fee_invoices', 
        schema: 'public',
        filter: `student_id=eq.${user.studentId}`
      }, () => {
        mutateInvoices();
        mutateStudentDetails();
        mutateInvoicePayments();
      })
      .on('postgres_changes', {
        event: '*',
        table: 'fee_payments',
        schema: 'public'
      }, () => {
        mutateInvoices();
        mutateStudentDetails();
        mutateInvoicePayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.studentId, page, mutateInvoices, mutateStudentDetails, mutateInvoicePayments]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const amountToPay = parseFloat(customPaymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      toast.error("Invalid payment amount");
      return;
    }
    
    setIsProcessingPayment(true);
    try {
      if (selectedInvoiceToPay) {
        // Pay single invoice
        await recordPayment({
          invoiceId: selectedInvoiceToPay.id,
          amount: amountToPay,
          paymentMethod: 'Card',
          referenceNumber: `ONLINE-${Date.now()}`,
          recordedBy: user.id
        });
      } else if (activeUnpaidInvoice) {
        // Pay active unpaid invoice
        await recordPayment({
          invoiceId: activeUnpaidInvoice.id,
          amount: amountToPay,
          paymentMethod: 'Card',
          referenceNumber: `ONLINE-${Date.now()}`,
          recordedBy: user.id
        });
      }
      
      await mutateInvoices();
      await mutateStudentDetails();
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

  if (isLoading) {
    return (
      <div className="space-y-8 h-full flex flex-col p-4 sm:p-0">
        <div className="animate-pulse">
          <div className="h-10 w-64 bg-muted-foreground/20 rounded-md mb-2"></div>
          <div className="h-4 w-48 bg-muted-foreground/20 rounded-md"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card p-6 rounded-[2rem] border border-border shadow-sm flex flex-col justify-between min-h-[160px] animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-4 flex-1 pr-4">
                  <div className="h-2 w-28 bg-muted-foreground/20 rounded"></div>
                  <div className="h-8 w-32 bg-muted-foreground/20 rounded"></div>
                </div>
                <div className="h-10 w-10 rounded-xl shrink-0 bg-muted-foreground/10"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-32 w-full rounded-2xl bg-muted-foreground/10 animate-pulse"></div>
          <div className="h-32 w-full rounded-2xl bg-muted-foreground/10 animate-pulse"></div>
        </div>
      </div>
    );
  }

  const openPaymentModal = (invoice?: FeeInvoice) => {
    const target = invoice || activeUnpaidInvoice;
    setSelectedInvoiceToPay(target || null);
    setCustomPaymentAmount((target ? (target.balanceDue ?? target.amount) : pendingTotal).toString());
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
            <h2 className="text-5xl font-bold tracking-tight">{formatAmount(pendingTotal, settings?.currency)}</h2>
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

      {studentDetails && (
        <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm">
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            {t('financial_standing_ledger')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-xl border border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase">{t('assigned_plan')}</p>
              <p className="text-sm font-black text-foreground mt-1">
                {studentDetails.fee_structure || 'Standard'}
              </p>
            </div>
            {studentDetails.discount_percentage ? (
              <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">{t('discount_scholarship')}</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {studentDetails.discount_percentage}% Applied
                </p>
              </div>
            ) : null}
            <div className="p-4 bg-muted/50 rounded-xl border border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase">{t('total_invoiced')}</p>
              <p className="text-sm font-black text-foreground mt-1">
                {formatAmount(studentDetails.total_due || 0, settings?.currency)}
              </p>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">{t('total_paid')}</p>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatAmount(studentDetails.total_paid || 0, settings?.currency)}
              </p>
            </div>
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
          ) : visibleInvoices.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground font-medium">{t('no_invoices_found')}</div>
          ) : visibleInvoices.map((invoice: any) => (
          <div 
            key={invoice.id} 
            onClick={() => setSelectedDetailInvoice(invoice)}
            className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start gap-5">
              <div className={`mt-1 p-4 rounded-2xl shrink-0 shadow-inner ${
                invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                invoice.status === 'partially_paid' ? 'bg-blue-500/10 text-blue-500' :
                invoice.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                'bg-amber-500/10 text-amber-500'
              }`}>
                {invoice.status === 'paid' ? <CheckCircle2 size={28} /> : 
                 invoice.status === 'partially_paid' ? <CheckCircle2 size={28} /> : 
                 invoice.status === 'overdue' ? <AlertCircle size={28} /> : 
                 <Clock size={28} />}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="font-bold text-foreground text-xl">{invoice.description}</p>
                  <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                    invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' :
                    invoice.status === 'partially_paid' ? 'bg-blue-500/20 text-blue-500' :
                    invoice.status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                    'bg-amber-500/10 text-amber-500'
                  }`}>
                    {invoice.status === 'partially_paid' ? 'Partial' : t(invoice.status)}
                  </span>
                </div>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {invoice.status === 'paid' ? `${t('paid_on')} ${new Date(invoice.updated_at || Date.now()).toLocaleDateString()}` : `${t('due_by')} ${new Date(invoice.dueDate).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 border-t sm:border-0 border-border pt-5 sm:pt-0">
              <div className="text-right sm:text-right">
                {invoice.status === 'paid' ? (
                  <div>
                    <p className="text-3xl font-bold text-emerald-500">{formatAmount(invoice.amount, settings?.currency)}</p>
                    <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">{t('paid_in_full') || 'Paid in full'}</p>
                  </div>
                ) : invoice.status === 'partially_paid' ? (
                  <div>
                    <p className="text-3xl font-bold text-foreground">{formatAmount(invoice.balanceDue, settings?.currency)}</p>
                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                      {t('paid_so_far') || 'Paid'}: <span className="text-emerald-500 font-bold">{formatAmount(invoice.amount - (invoice.balanceDue ?? 0), settings?.currency)}</span> {t('of')} {formatAmount(invoice.amount, settings?.currency)}
                    </p>
                  </div>
                ) : invoice.status === 'void' ? (
                  <div>
                    <p className="text-3xl font-bold text-muted-foreground line-through">{formatAmount(invoice.amount, settings?.currency)}</p>
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">{t('voided') || 'Voided'}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-foreground">{formatAmount(invoice.balanceDue !== undefined ? invoice.balanceDue : invoice.amount, settings?.currency)}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {invoice.status === 'paid' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success(t('downloading_receipt'), { description: `${t('receipt_for')} ${invoice.id} ${t('is_being_prepared')}` });
                    }}
                    className="p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors" 
                    title={t('download_receipt')}
                  >
                    <Download size={20} />
                  </button>
                )}
                {invoice.status !== 'paid' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openPaymentModal(invoice);
                    }}
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
                  {selectedInvoiceToPay ? `${t('paying_for')} ${selectedInvoiceToPay.term || selectedInvoiceToPay.id}` : t('paying_total_outstanding')}
                </p>
              </div>
              
              <form onSubmit={handlePay} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 mb-6 flex items-center justify-between">
                  <span className="font-bold text-foreground">{t('total_to_pay')}</span>
                  <span className="font-black text-primary text-2xl">
                    {formatAmount(selectedInvoiceToPay ? (selectedInvoiceToPay.balanceDue ?? selectedInvoiceToPay.amount) : pendingTotal, settings?.currency)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">
                    {t('payment_amount_label')}
                    <span className="text-xs text-muted-foreground font-medium ml-2">
                      ({t('max_remaining')}: {formatAmount(selectedInvoiceToPay ? (selectedInvoiceToPay.balanceDue ?? selectedInvoiceToPay.amount) : pendingTotal, settings?.currency)})
                    </span>
                  </label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    max={selectedInvoiceToPay ? (selectedInvoiceToPay.balanceDue ?? selectedInvoiceToPay.amount) : pendingTotal}
                    value={customPaymentAmount}
                    onChange={(e) => setCustomPaymentAmount(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-semibold text-foreground placeholder:text-muted-foreground" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('cardholder_name')}</label>
                  <input required type="text" placeholder={t('cardholder_name_placeholder')} className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('card_number')}</label>
                  <div className="relative">
                    <CreditCard size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-4" />
                    <input required type="text" placeholder="4242 •••• •••• 4242" maxLength={19} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground tracking-widest rtl:pl-4 rtl:pr-12" />
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
        {selectedDetailInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">{t('invoice_details')}</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2">
                    {t('viewing_complete_financial')}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedDetailInvoice(null)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-sm font-bold text-muted-foreground">{t('term_description')}</span>
                    <span className="font-semibold text-foreground text-sm">{selectedDetailInvoice.description}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-sm font-bold text-muted-foreground">{t('due_date')}</span>
                    <span className="font-semibold text-foreground text-sm">
                      {new Date(selectedDetailInvoice.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-sm font-bold text-muted-foreground">{t('status')}</span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      selectedDetailInvoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' :
                      selectedDetailInvoice.status === 'partially_paid' ? 'bg-blue-500/20 text-blue-500' :
                      selectedDetailInvoice.status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                      'bg-amber-500/10 text-amber-500'
                    }`}>
                      {selectedDetailInvoice.status === 'partially_paid' ? t('partial') : t(selectedDetailInvoice.status)}
                    </span>
                  </div>
                </div>

                {/* Financial Overview Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-muted/50 border border-border text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('total_amount')}</p>
                    <p className="text-lg font-black text-foreground mt-1">{formatAmount(selectedDetailInvoice.amount, settings?.currency)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">{t('paid_so_far')}</p>
                    <p className="text-lg font-black text-emerald-500 mt-1">
                      {formatAmount(selectedDetailInvoice.amount - (selectedDetailInvoice.balanceDue ?? 0), settings?.currency)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{t('balance_due')}</p>
                    <p className="text-lg font-black text-foreground mt-1">{formatAmount(selectedDetailInvoice.balanceDue ?? 0, settings?.currency)}</p>
                  </div>
                </div>

                {/* Payment History Section */}
                <div className="space-y-3">
                  <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">{t('payment_transaction_history')}</h3>
                  {!invoicePayments ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                  ) : invoicePayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-xl text-center">
                      {t('no_payment_transactions')}
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {invoicePayments.map((payment: any) => (
                        <div key={payment.id} className="p-3 rounded-xl border border-border bg-muted/10 flex items-center justify-between hover:bg-muted/20 transition-colors">
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">
                              {new Date(payment.payment_date).toLocaleDateString()} • {payment.payment_method}
                            </p>
                            {payment.reference_number && (
                              <p className="text-[10px] text-muted-foreground italic mt-0.5">{payment.reference_number}</p>
                            )}
                          </div>
                          <span className="font-bold text-emerald-500 text-sm">
                            +{formatAmount(payment.amount, settings?.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-border bg-muted/50 shrink-0 flex flex-col sm:flex-row gap-3 justify-end">
                <div className="flex gap-2">
                  {selectedDetailInvoice.status !== 'paid' && selectedDetailInvoice.status !== 'void' && (
                    <button 
                      onClick={() => {
                        openPaymentModal(selectedDetailInvoice);
                        setSelectedDetailInvoice(null);
                      }}
                      className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl font-bold text-sm transition-colors shadow-md shadow-primary/10 flex items-center justify-center gap-1.5"
                    >
                      <DollarSign size={16} /> {t('pay_now')}
                    </button>
                  )}
                  {selectedDetailInvoice.status === 'paid' && (
                    <button 
                      onClick={() => {
                        toast.success(t('downloading_receipt'), { description: `${t('receipt_for')} ${selectedDetailInvoice.id} ${t('is_being_prepared')}` });
                      }}
                      className="px-6 py-2.5 border border-border hover:bg-accent text-foreground rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download size={16} /> {t('download_receipt')}
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedDetailInvoice(null)}
                  className="px-6 py-2.5 bg-background border border-border rounded-xl font-bold text-sm hover:bg-accent transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
