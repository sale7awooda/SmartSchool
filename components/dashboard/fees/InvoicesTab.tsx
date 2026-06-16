'use client';

import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { FeeInvoice, User, AcademicYear, Action, Resource, Student, FeeItem, MappedInvoice } from '@/types';
import { getPaginatedInvoices } from '@/lib/supabase-db';
import { processPaymentAction, processVoidInvoiceAction, processCreateInvoiceAction } from '@/app/actions/finance';
import { supabase } from '@/lib/supabase/client';
import { useSettings, formatAmount } from '@/lib/settings-context';
import { Search, FileText, Download, Plus, Loader2, X, Trash2, ChevronLeft, ChevronRight, AlertCircle, DollarSign, CheckCircle, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner";

interface InvoicesTabProps {
  user: User | null;
  activeAcademicYear: AcademicYear | null | undefined;
  can: (action: Action, subject: Resource) => boolean;
  t: (key: string) => string;
  students: Student[];
  feeStructure: FeeItem[];
  onInvoiceMutated: () => void;
  activeTab: 'all' | 'pending' | 'overdue' | 'paid' | 'void' | 'structure' | 'expenses';
  setActiveTab: (tab: 'all' | 'pending' | 'overdue' | 'paid' | 'void' | 'structure' | 'expenses') => void;
}

export function InvoicesTab({
  user,
  activeAcademicYear,
  can,
  t,
  students,
  feeStructure,
  onInvoiceMutated,
  activeTab,
  setActiveTab
}: InvoicesTabProps) {
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [dueMonthFilter, setDueMonthFilter] = useState<'all' | 'this-month' | 'next-month'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoice | null>(null);
  const [selectedDetailInvoice, setSelectedDetailInvoice] = useState<MappedInvoice | null>(null);

  const { data: invoicePayments, mutate: mutateInvoicePayments } = useSWR(
    selectedDetailInvoice ? ['invoice_payments', selectedDetailInvoice.id] : null,
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
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<string | null>(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'Cash',
    referenceNumber: ''
  });

  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isVoidingInvoice, setIsVoidingInvoice] = useState(false);

  const [newInvoiceData, setNewInvoiceData] = useState({
    studentId: '',
    feeItemId: '',
    amount: '',
    dueDate: '',
    description: ''
  });

  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isGeneralInvoice, setIsGeneralInvoice] = useState(false);
  const [invoiceTitleCategory, setInvoiceTitleCategory] = useState('Registration Fee');
  const [customTitle, setCustomTitle] = useState('');

  useEffect(() => {
    if (selectedInvoice) {
      setPaymentAmount((selectedInvoice.balanceDue ?? selectedInvoice.amount).toString());
    } else {
      setPaymentAmount('');
    }
  }, [selectedInvoice]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: invoicesResponse, isLoading, mutate: mutateInvoices } = useSWR(
    ['invoices', page, debouncedSearch, activeTab, activeAcademicYear?.name],
    ([_, p, s, tab, a]) => getPaginatedInvoices(p, limit, s, undefined, tab, a)
  );

  useEffect(() => {
    // Real-time subscriptions for fee invoices and payments
    const channel = supabase
      .channel('fee_invoices_payments_changes')
      .on('postgres_changes', { event: '*', table: 'fee_invoices', schema: 'public' }, () => {
        mutateInvoices();
        mutateInvoicePayments();
        onInvoiceMutated();
      })
      .on('postgres_changes', { event: '*', table: 'fee_payments', schema: 'public' }, () => {
        mutateInvoices();
        mutateInvoicePayments();
        onInvoiceMutated();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutateInvoices, mutateInvoicePayments, onInvoiceMutated]);

  const invoices = invoicesResponse?.data || [];
  const totalPages = invoicesResponse?.totalPages || 1;
  const totalCount = invoicesResponse?.count || 0;

  const mappedInvoices: MappedInvoice[] = (invoices as any[] || []).map((inv) => ({
    id: inv.id,
    studentId: inv.student_id,
    studentName: inv.student?.user?.name || 'Unknown Student',
    amount: inv.amount,
    balanceDue: inv.balance_due !== undefined ? inv.balance_due : inv.amount,
    dueDate: inv.due_date,
    status: inv.status,
    term: inv.description || inv.title || 'General Tuition Fee'
  }));

  const matchesDueMonth = (dueDate: string) => {
    if (dueMonthFilter === 'all') return true;
    if (!dueDate) return false;
    const invDate = new Date(dueDate);
    const now = new Date();
    
    if (dueMonthFilter === 'this-month') {
      return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
    }
    
    if (dueMonthFilter === 'next-month') {
      const nextMonth = (now.getMonth() + 1) % 12;
      const nextMonthYear = now.getFullYear() + (now.getMonth() === 11 ? 1 : 0);
      return invDate.getMonth() === nextMonth && invDate.getFullYear() === nextMonthYear;
    }
    
    return true;
  };

  const filteredInvoices = mappedInvoices.filter((inv: MappedInvoice) => {
    const matchesTab = activeTab === 'all'
      ? true
      : activeTab === 'structure'
        ? false
        : activeTab === 'paid'
          ? (inv.status === 'paid' || inv.status === 'partially_paid')
          : inv.status === activeTab;
    return matchesTab && matchesDueMonth(inv.dueDate);
  });

  const studentInvoices = mappedInvoices.filter((inv: MappedInvoice) => inv.studentId === selectedStudentForProfile);
  const studentTotalDue = studentInvoices.filter((inv: MappedInvoice) => inv.status !== 'paid').reduce((sum: number, inv: MappedInvoice) => sum + (inv.balanceDue ?? inv.amount), 0);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !user) return;
    setIsRecordingPayment(true);
    
    try {
      const formData = new FormData();
      formData.append('invoiceId', selectedInvoice.id);
      formData.append('amount', paymentAmount || selectedInvoice.amount.toString());
      formData.append('paymentMethod', paymentForm.paymentMethod);
      formData.append('referenceNumber', paymentForm.referenceNumber);
      formData.append('recordedBy', user.id);

      const result = await processPaymentAction({ success: false, message: '' }, formData);
      
      if (!result.success) {
        if (result.errors) {
          const firstError = Object.values(result.errors)[0][0];
          toast.error("Validation Error", { description: firstError });
        } else {
          toast.error("Error", { description: result.message });
        }
        return;
      }

      await mutateInvoices();
      onInvoiceMutated();
      toast.success("Payment recorded", {
        description: `Successfully recorded $${selectedInvoice.amount} for ${selectedInvoice.studentName}.`,
      });
      setSelectedInvoice(null);
      setPaymentForm({ paymentMethod: 'Cash', referenceNumber: '' });
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error("Failed to record payment");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleDownloadInvoice = async (invoice: any) => {
    if (!invoice) return;
    const toastId = toast.loading("Generating PDF invoice...");

    try {
      const response = await fetch('/api/finance/generate-invoice-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoice_id: invoice.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.id.substring(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Invoice PDF downloaded successfully", { id: toastId });
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast.error(error.message || "Failed to download PDF invoice", { id: toastId });
    }
  };

  const handleWhatsAppShare = (invoice: any) => {
    if (!invoice) return;
    
    // Check if it's paid or not
    const isPaid = invoice.status === 'paid';
    const amountStr = isPaid ? invoice.amount.toString() : (invoice.balanceDue || invoice.amount).toString();
    const dateStr = new Date(invoice.dueDate).toLocaleDateString();
    
    let message = '';
    if (isPaid) {
      message = `Hello! Thank you for the payment regarding the ${invoice.term} for ${invoice.studentName}. Amount Paid: $${amountStr}. This serves as your digital receipt. Have a great day!`;
    } else {
      message = `Hello! Just a reminder regarding the ${invoice.term} for ${invoice.studentName}. Total amount due: $${amountStr}. Due Date: ${dateStr}. Let us know if you have any questions or need assistance.`;
    }
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!isGeneralInvoice && !newInvoiceData.studentId) {
      toast.error("Please select a student or choose the general invoice option");
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('studentId', isGeneralInvoice ? '' : newInvoiceData.studentId);
      formData.append('amount', newInvoiceData.amount);
      formData.append('dueDate', newInvoiceData.dueDate);
      formData.append('description', newInvoiceData.description);
      formData.append('createdBy', user.id);

      // Determine the category title
      let actualTitle = invoiceTitleCategory;
      if (invoiceTitleCategory.startsWith('item_')) {
        const itemId = invoiceTitleCategory.replace('item_', '');
        const item = feeStructure.find(i => i.id === itemId);
        actualTitle = item ? item.name : 'Tuition Fee';
      } else if (invoiceTitleCategory === 'custom') {
        actualTitle = customTitle;
      }
      formData.append('title', actualTitle || 'General Invoice');

      const result = await processCreateInvoiceAction({ success: false, message: '' }, formData);
      if (!result.success) {
        if (result.errors) {
          const firstError = Object.values(result.errors)[0][0];
          toast.error("Validation Error", { description: firstError });
        } else {
          toast.error("Error", { description: result.message });
        }
        return;
      }

      await mutateInvoices();
      onInvoiceMutated();
      const entityName = isGeneralInvoice 
        ? 'General Invoice' 
        : (students.find(s => s.id === newInvoiceData.studentId)?.name || 'Student');
      toast.success("Invoice created successfully", {
        description: `Invoice for ${entityName} created.`
      });
      setIsNewInvoiceOpen(false);
      setNewInvoiceData({ studentId: '', feeItemId: '', amount: '', dueDate: '', description: '' });
      setStudentSearchQuery('');
      setIsGeneralInvoice(false);
      setInvoiceTitleCategory('Registration Fee');
      setCustomTitle('');
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error("Failed to create invoice");
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleVoidInvoice = async () => {
    const targetInv = selectedInvoice || selectedDetailInvoice;
    if (!targetInv || !user) return;
    setIsVoidingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('invoiceId', targetInv.id);
      formData.append('voidedBy', user.id);
      
      const result = await processVoidInvoiceAction({ success: false, message: '' }, formData);
      if (!result.success) {
        toast.error("Error", { description: result.message });
        return;
      }

      await mutateInvoices();
      onInvoiceMutated();
      toast.error("Invoice voided", {
        description: "The invoice has been cancelled and removed from active tracking.",
      });
      setSelectedInvoice(null);
      setSelectedDetailInvoice(null);
    } catch (error) {
      console.error('Error voiding invoice:', error);
      toast.error("Failed to void invoice");
    } finally {
      setIsVoidingInvoice(false);
    }
  };

  return (
    <>
      <div className="p-6 border-b border-border space-y-5 bg-muted/50 shrink-0">
        {activeTab !== 'structure' && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-4" />
              <input 
                type="text" 
                placeholder={t('search_invoice_placeholder')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground text-foreground shadow-sm rtl:pl-4 rtl:pr-12"
              />
            </div>
            
            <div className="flex bg-background border border-border p-1 rounded-xl self-start md:self-auto shrink-0 shadow-sm">
              <button
                type="button"
                onClick={() => setDueMonthFilter('all')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  dueMonthFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {t('all_dues')}
              </button>
              <button
                type="button"
                onClick={() => setDueMonthFilter('this-month')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  dueMonthFilter === 'this-month'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {t('due_this_month')}
              </button>
              <button
                type="button"
                onClick={() => setDueMonthFilter('next-month')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  dueMonthFilter === 'next-month'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {t('due_next_month')}
              </button>
            </div>
          </div>
        )}
        
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'pending', 'overdue', 'paid', 'void', 'structure', 'expenses'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab 
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                  : 'bg-background border border-border text-muted-foreground hover:bg-accent hover:border-accent-foreground/20'
              }`}
            >
              {tab === 'void' ? t('void_refund') : tab === 'paid' ? t('paid_invoices') : tab === 'expenses' ? t('expenses') : t(tab)}
            </button>
          ))}
        </div>
      </div>

      {activeTab !== 'structure' && activeTab !== 'expenses' && (
        <>
          <div className="divide-y divide-border overflow-y-auto custom-scrollbar flex-1">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border border-border rounded-[1.5rem] shadow-sm">
                    <div className="flex items-start gap-4 w-full">
                      <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
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
            ) : filteredInvoices.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground font-medium">{t('no_invoices_found')}</div>
            ) : (
              filteredInvoices.map((invoice) => (
                <div 
                  key={invoice.id} 
                  onClick={() => setSelectedDetailInvoice(invoice)}
                  className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:bg-accent transition-colors animate-fadeIn cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 p-3 rounded-2xl shrink-0 shadow-sm border ${
                      invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      invoice.status === 'partially_paid' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      invoice.status === 'overdue' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudentForProfile(invoice.studentId);
                          }}
                          className="font-bold text-foreground text-lg hover:text-primary hover:underline text-left"
                        >
                          {invoice.studentName}
                        </button>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' :
                          invoice.status === 'partially_paid' ? 'bg-blue-500/20 text-blue-500' :
                          invoice.status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {invoice.status === 'partially_paid' ? t('partial') : t(invoice.status)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">{invoice.term}</p>
                      <p className="text-sm font-medium text-muted-foreground mt-1">{t('due')}: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-5 sm:w-auto w-full border-t sm:border-0 border-border pt-4 sm:pt-0">
                    <div className="text-right sm:mr-3">
                      {invoice.status === 'paid' ? (
                        <div>
                          <p className="text-2xl font-bold text-emerald-500">{formatAmount(invoice.amount, settings?.currency)}</p>
                          <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">{t('paid_in_full')}</p>
                        </div>
                      ) : invoice.status === 'partially_paid' ? (
                        <div>
                          <p className="text-2xl font-bold text-foreground">{formatAmount(invoice.balanceDue ?? 0, settings?.currency)}</p>
                          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                            {t('paid_so_far')}: <span className="text-emerald-500 font-bold">{formatAmount(invoice.amount - (invoice.balanceDue ?? 0), settings?.currency)}</span> {t('of')} {formatAmount(invoice.amount, settings?.currency)}
                          </p>
                        </div>
                      ) : invoice.status === 'void' ? (
                        <div>
                          <p className="text-2xl font-bold text-muted-foreground line-through">{formatAmount(invoice.amount, settings?.currency)}</p>
                          <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">{t('voided')}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-2xl font-bold text-foreground">{formatAmount(invoice.balanceDue !== undefined ? invoice.balanceDue : invoice.amount, settings?.currency)}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {invoice.status !== 'paid' && invoice.status !== 'void' && can('manage', 'fees') && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(invoice as unknown as FeeInvoice);
                          }}
                          className="px-5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-bold transition-colors"
                        >
                          {t('record_payment')}
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsAppShare(invoice);
                        }}
                        className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-500/10 rounded-lg transition-colors" 
                        title="Share via WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadInvoice(invoice);
                        }}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                        title={t('download_invoice')}
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 shrink-0">
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

          {/* Floating Create Invoice Action Button */}
          {can('create', 'fees') && (
            <div className="fixed bottom-6 right-6 z-10">
              <button 
                onClick={() => setIsNewInvoiceOpen(true)}
                className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Plus size={24} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {selectedStudentForProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">{t('student_fee_profile')}</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2">
                    {t('viewing_invoices_for')} {students.find(s => s.id === selectedStudentForProfile)?.name || selectedStudentForProfile}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedStudentForProfile(null)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{t('total_outstanding')}</p>
                    <p className="text-3xl font-black text-foreground">{formatAmount(studentTotalDue, settings?.currency)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">{t('total_paid')}</p>
                    <p className="text-3xl font-black text-foreground">
                      {formatAmount(studentInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0), settings?.currency)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-foreground">{t('invoice_history')}</h3>
                  {studentInvoices.map(inv => (
                    <div key={inv.id} className="p-4 rounded-xl border border-border flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-bold text-sm">{inv.term}</p>
                        <p className="text-xs text-muted-foreground">{inv.id} • {new Date(inv.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right rtl:text-left">
                        <p className="font-bold text-foreground">{formatAmount(inv.amount, settings?.currency)}</p>
                        <span className={`text-[10px] font-bold uppercase ${
                          inv.status === 'paid' ? 'text-emerald-500' : 
                          inv.status === 'overdue' ? 'text-destructive' : 'text-amber-500'
                        }`}>
                          {t(inv.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-6 border-t border-border bg-muted/50 shrink-0 flex justify-end">
                <button 
                  onClick={() => setSelectedStudentForProfile(null)}
                  className="px-6 py-2.5 bg-background border border-border rounded-xl font-bold text-sm hover:bg-accent transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{t('record_payment')}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">{t('recording_payment_for')} {selectedInvoice.studentName}</p>
              </div>
              
              <form onSubmit={handleRecordPayment} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">
                    {t('amount_to_pay')}
                    <span className="text-xs text-muted-foreground font-medium ml-2">
                      ({t('remaining_balance')}: {formatAmount(selectedInvoice.balanceDue !== undefined ? selectedInvoice.balanceDue : selectedInvoice.amount, settings?.currency)})
                    </span>
                  </label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    max={selectedInvoice.balanceDue !== undefined ? selectedInvoice.balanceDue : selectedInvoice.amount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-semibold text-foreground placeholder:text-muted-foreground" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('payment_method')}</label>
                  <select 
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  >
                    <option value="Cash">{t('cash')}</option>
                    <option value="Bank Transfer">{t('bank_transfer')}</option>
                    <option value="Cheque">{t('cheque')}</option>
                    <option value="Card">{t('card')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('notes')}</label>
                  <input 
                    type="text" 
                    placeholder={t('notes_placeholder')} 
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
                  />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isRecordingPayment}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isRecordingPayment ? <Loader2 size={20} className="animate-spin" /> : t('record_payment')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isNewInvoiceOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{t('create_new_invoice')}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">{t('generate_new_fee_request')}</p>
              </div>
              
              <form onSubmit={handleCreateInvoice} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                {/* General Invoice / Student Link Toggle */}
                <div className="flex items-center gap-2 mb-3 bg-muted/30 p-4 rounded-xl border border-border/40">
                  <input 
                    type="checkbox" 
                    id="isGeneralInvoice" 
                    checked={isGeneralInvoice}
                    onChange={(e) => {
                      setIsGeneralInvoice(e.target.checked);
                      if (e.target.checked) {
                        setNewInvoiceData(prev => ({ ...prev, studentId: '' }));
                        setStudentSearchQuery('');
                      }
                    }}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="isGeneralInvoice" className="text-xs font-bold text-foreground cursor-pointer select-none">
                    {t('general_invoice_option')}
                  </label>
                </div>

                {/* Searchable Student Field */}
                {!isGeneralInvoice ? (
                  <div className="space-y-2 relative">
                    <label className="block text-sm font-bold text-foreground mb-1">{t('select_student_search')}</label>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder={t('type_student_name_search')}
                        value={studentSearchQuery}
                        onChange={(e) => {
                          setStudentSearchQuery(e.target.value);
                          if (newInvoiceData.studentId) {
                            setNewInvoiceData(prev => ({ ...prev, studentId: '' }));
                          }
                        }}
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground text-sm"
                      />
                      {newInvoiceData.studentId && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewInvoiceData(prev => ({ ...prev, studentId: '' }));
                            setStudentSearchQuery('');
                          }}
                          className="absolute right-3 top-3 text-xs text-destructive hover:underline font-bold"
                        >
                          {t('clear')}
                        </button>
                      )}
                    </div>
                    
                    {/* Selected Student Status */}
                    {newInvoiceData.studentId ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <span>Selected: {students.find(s => s.id === newInvoiceData.studentId)?.name} ({students.find(s => s.id === newInvoiceData.studentId)?.grade})</span>
                        <CheckCircle size={16} className="text-emerald-500" />
                      </div>
                    ) : studentSearchQuery.trim() !== '' && (
                      <div className="absolute z-50 left-0 right-0 max-h-48 overflow-y-auto bg-card border border-border rounded-xl shadow-lg mt-1 p-1 space-y-1 custom-scrollbar">
                        {students.filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())).length > 0 ? (
                          students
                            .filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                            .slice(0, 5)
                            .map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setNewInvoiceData(prev => ({ ...prev, studentId: s.id }));
                                  setStudentSearchQuery(s.name);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-muted rounded-lg text-xs font-medium text-foreground transition-colors flex justify-between items-center"
                              >
                                <span>{s.name}</span>
                                <span className="text-muted-foreground text-[10px]">{s.grade}</span>
                              </button>
                            ))
                        ) : (
                          <div className="text-center py-3 text-xs text-muted-foreground">No students found.</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Category / Type Selector */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('category_type')}</label>
                  <select 
                    required 
                    value={invoiceTitleCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInvoiceTitleCategory(val);
                      if (val.startsWith('item_')) {
                        const itemId = val.replace('item_', '');
                        const item = feeStructure.find(i => i.id === itemId);
                        if (item) {
                          setNewInvoiceData(prev => ({ 
                            ...prev, 
                            amount: item.amount.toString(),
                            description: `${item.name} - ${item.frequency}`
                          }));
                        }
                      } else {
                        setNewInvoiceData(prev => ({ 
                          ...prev, 
                          amount: '',
                          description: ''
                        }));
                      }
                    }}
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  >
                    <option value="">{t('select_category_structure')}</option>
                    <optgroup label={t('standard_categories')}>
                      <option value="Registration Fee">{t('registration_fee')}</option>
                      <option value="Transportation Fee">{t('transportation_fee')}</option>
                      <option value="Uniform Fee">{t('uniform_fee')}</option>
                      <option value="Tuition Fee">{t('tuition_fee')}</option>
                      <option value="Books & Materials">{t('books_materials')}</option>
                      <option value="Activities Fee">{t('activities_fee')}</option>
                    </optgroup>
                    <optgroup label={t('academic_grade_structures')}>
                      {feeStructure.map(item => (
                        <option key={item.id} value={`item_${item.id}`}>{item.name} (${item.amount})</option>
                      ))}
                    </optgroup>
                    <option value="custom">{t('other_custom_title')}</option>
                  </select>
                </div>

                {/* Custom Title Input */}
                {invoiceTitleCategory === 'custom' && (
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('custom_invoice_title_label')}</label>
                    <input 
                      required 
                      type="text" 
                      placeholder={t('graduation_ceremony_fee')} 
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
                    />
                  </div>
                )}

                {/* Description Input */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('description_notes')}</label>
                  <input 
                    required 
                    type="text" 
                    placeholder={t('bus_fee_term_1')} 
                    value={newInvoiceData.description}
                    onChange={(e) => setNewInvoiceData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('amount')} ($)</label>
                    <input 
                      required 
                      type="number" 
                      min="1" 
                      step="0.01" 
                      placeholder="0.00" 
                      value={newInvoiceData.amount}
                      onChange={(e) => setNewInvoiceData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('due_date')}</label>
                    <input 
                      required 
                      type="date" 
                      value={newInvoiceData.dueDate}
                      onChange={(e) => setNewInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" 
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsNewInvoiceOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isCreatingInvoice}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isCreatingInvoice ? <Loader2 size={20} className="animate-spin" /> : t('create_invoice')}
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
                    <span className="text-sm font-bold text-muted-foreground">{t('student')}</span>
                    <button 
                      onClick={() => {
                        setSelectedStudentForProfile(selectedDetailInvoice.studentId);
                        setSelectedDetailInvoice(null);
                      }}
                      className="font-bold text-primary hover:underline text-sm"
                    >
                      {selectedDetailInvoice.studentName}
                    </button>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-sm font-bold text-muted-foreground">{t('term_description')}</span>
                    <span className="font-semibold text-foreground text-sm">{selectedDetailInvoice.term}</span>
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

              <div className="p-6 border-t border-border bg-muted/50 shrink-0 flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2 flex-1">
                  {selectedDetailInvoice.status !== 'paid' && selectedDetailInvoice.status !== 'void' && can('manage', 'fees') && (
                    <>
                      <button 
                        onClick={() => {
                          setSelectedInvoice(selectedDetailInvoice as unknown as FeeInvoice);
                          setSelectedDetailInvoice(null);
                        }}
                        className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl font-bold text-sm transition-colors shadow-md shadow-primary/10 flex items-center justify-center gap-1.5"
                      >
                        <DollarSign size={16} /> {t('record_payment')}
                      </button>
                      <button 
                        onClick={handleVoidInvoice}
                        disabled={isVoidingInvoice}
                        className="px-4 py-2.5 border border-destructive/20 text-destructive hover:bg-destructive/5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
                      >
                        {isVoidingInvoice ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        {t('void')}
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      handleWhatsAppShare(selectedDetailInvoice);
                    }}
                    className="flex-1 px-4 py-2.5 border border-green-500/20 text-green-600 hover:bg-green-500/5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </button>
                  <button 
                    onClick={() => {
                      handleDownloadInvoice(selectedDetailInvoice);
                    }}
                    className="flex-1 px-4 py-2.5 border border-border hover:bg-accent text-foreground rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download size={16} /> {t('download')}
                  </button>
                </div>
                <button 
                  onClick={() => setSelectedDetailInvoice(null)}
                  className="px-6 py-2.5 bg-background border border-border rounded-xl font-bold text-sm hover:bg-accent transition-colors self-end sm:self-auto"
                >
                  {t('close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
