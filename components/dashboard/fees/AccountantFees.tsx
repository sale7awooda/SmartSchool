'use client';

import useSWR, { mutate } from 'swr';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { FeeInvoice, FeeItem, Student, User } from '@/types';
import { getPaginatedInvoices, createInvoice, updateInvoice, getStudents, getFeeStats, getFeeItems, createFeeItem, updateFeeItem, deleteFeeItem, recordPayment, getActiveAcademicYear } from '@/lib/supabase-db';
import { processPaymentAction, processVoidInvoiceAction, processCreateInvoiceAction, processCreateFeeItemAction, processUpdateFeeItemAction, processDeleteFeeItemAction } from '@/app/actions/finance';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { CreditCard, Search, CheckCircle2, Clock, AlertCircle, FileText, Download, Plus, DollarSign, Loader2, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner";

export function AccountantFees() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const { can } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'overdue' | 'structure'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoice | null>(null);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<string | null>(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'Cash',
    referenceNumber: ''
  });
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isVoidingInvoice, setIsVoidingInvoice] = useState(false);
  const [isAddFeeItemOpen, setIsAddFeeItemOpen] = useState(false);
  const [editingFeeItem, setEditingFeeItem] = useState<any | null>(null);
  const [isSubmittingFeeItem, setIsSubmittingFeeItem] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({ collected: 0, pending: 0, overdue: 0 });
  const [feeStructure, setFeeStructure] = useState<any[]>([]);

  useEffect(() => {
    getStudents(activeAcademicYear?.name).then(setStudents).catch(console.error);
    getFeeStats(activeAcademicYear?.name).then(setStats).catch(console.error);
    getFeeItems().then(setFeeStructure).catch(console.error);

    // Real-time subscriptions
    const invoicesChannel = supabase
      .channel('fee_invoices_changes')
      .on('postgres_changes', { event: '*', table: 'fee_invoices', schema: 'public' }, () => {
        mutate(['invoices', page, debouncedSearch, activeTab, activeAcademicYear?.name]);
        getFeeStats(activeAcademicYear?.name).then(setStats).catch(console.error);
      })
      .subscribe();

    const itemsChannel = supabase
      .channel('fee_items_changes')
      .on('postgres_changes', { event: '*', table: 'fee_items', schema: 'public' }, () => {
        getFeeItems().then(setFeeStructure).catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [page, debouncedSearch, activeTab, activeAcademicYear?.name]);

  const [newInvoiceData, setNewInvoiceData] = useState({
    studentId: '',
    feeItemId: '',
    amount: '',
    dueDate: '',
    description: ''
  });

  const [newFeeItem, setNewFeeItem] = useState({
    name: '',
    amount: '',
    frequency: 'Per Term',
    category: 'Academic'
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: invoicesResponse, isLoading } = useSWR(
    ['invoices', page, debouncedSearch, activeTab, activeAcademicYear?.name],
    ([_, p, s, tab, a]) => getPaginatedInvoices(p, limit, s, undefined, tab, a)
  );

  const invoices = invoicesResponse?.data || [];
  const totalPages = invoicesResponse?.totalPages || 1;
  const totalCount = invoicesResponse?.count || 0;

  // For demonstration, we'll map the backend data to match the UI expectations
  const mappedInvoices = invoices.map((inv: any) => ({
    id: inv.id,
    studentId: inv.student_id,
    studentName: inv.student?.user?.name || 'Unknown Student',
    amount: inv.amount,
    dueDate: inv.due_date,
    status: inv.status,
    term: inv.description
  }));

  const filteredInvoices = mappedInvoices.filter((inv: any) => {
    const matchesTab = activeTab === 'all' ? true : activeTab === 'structure' ? false : inv.status === activeTab;
    return matchesTab;
  });

  const studentInvoices = mappedInvoices.filter((inv: any) => inv.studentId === selectedStudentForProfile);
  const studentTotalDue = studentInvoices.filter((inv: any) => inv.status !== 'paid').reduce((sum: number, inv: any) => sum + inv.amount, 0);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !user) return;
    setIsRecordingPayment(true);
    
    try {
      const formData = new FormData();
      formData.append('invoiceId', selectedInvoice.id);
      formData.append('amount', selectedInvoice.amount.toString());
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

      mutate(['invoices', page, debouncedSearch, activeTab]);
      getFeeStats().then(setStats).catch(console.error);
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

  const handleAddFeeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingFeeItem(true);
    try {
      const formData = new FormData();
      formData.append('name', newFeeItem.name);
      formData.append('amount', newFeeItem.amount);
      formData.append('frequency', newFeeItem.frequency);
      formData.append('category', newFeeItem.category);
      
      if (editingFeeItem) {
        formData.append('id', editingFeeItem.id);
        formData.append('createdBy', user.id); // For audit log purposes

        const result = await processUpdateFeeItemAction({ success: false, message: '' }, formData);
        if (!result.success) {
          toast.error("Error", { description: result.message });
          return;
        }
        mutate('feeItems');
        toast.success("Fee item updated");
      } else {
        formData.append('createdBy', user.id);
        
        const result = await processCreateFeeItemAction({ success: false, message: '' }, formData);
        if (!result.success) {
          toast.error("Error", { description: result.message });
          return;
        }
        mutate('feeItems');
        toast.success("Fee item added to structure");
      }
      setIsAddFeeItemOpen(false);
      setEditingFeeItem(null);
      setNewFeeItem({ name: '', amount: '', frequency: 'Per Term', category: 'Academic' });
    } catch (error) {
      console.error('Error saving fee item:', error);
      toast.error("Failed to save fee item");
    } finally {
      setIsSubmittingFeeItem(false);
    }
  };

  const handleDeleteFeeItem = async (id: string) => {
    if (!user) return;
    try {
      const formData = new FormData();
      formData.append('id', id);
      formData.append('deletedBy', user.id);

      const result = await processDeleteFeeItemAction({ success: false, message: '' }, formData);
      if (!result.success) {
        toast.error("Error", { description: result.message });
        return;
      }
      mutate('feeItems');
      toast.success("Fee item deleted");
    } catch (error) {
      console.error('Error deleting fee item:', error);
      toast.error("Failed to delete fee item");
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsCreatingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('studentId', newInvoiceData.studentId);
      formData.append('amount', newInvoiceData.amount);
      formData.append('dueDate', newInvoiceData.dueDate);
      formData.append('description', newInvoiceData.description);
      formData.append('createdBy', user.id);

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

      mutate(['invoices', page, debouncedSearch, activeTab]);
      getFeeStats().then(setStats).catch(console.error);
      const studentName = students.find(s => s.id === newInvoiceData.studentId)?.name || 'Student';
      toast.success("Invoice created successfully", {
        description: `Invoice for ${studentName} created.`
      });
      setIsNewInvoiceOpen(false);
      setNewInvoiceData({ studentId: '', feeItemId: '', amount: '', dueDate: '', description: '' });
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error("Failed to create invoice");
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleVoidInvoice = async () => {
    if (!selectedInvoice || !user) return;
    setIsVoidingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('invoiceId', selectedInvoice.id);
      formData.append('voidedBy', user.id);
      
      const result = await processVoidInvoiceAction({ success: false, message: '' }, formData);
      if (!result.success) {
        toast.error("Error", { description: result.message });
        return;
      }

      mutate(['invoices', page, debouncedSearch, activeTab]);
      getFeeStats().then(setStats).catch(console.error);
      toast.error("Invoice voided", {
        description: "The invoice has been cancelled and removed from active tracking.",
      });
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Error voiding invoice:', error);
      toast.error("Failed to void invoice");
    } finally {
      setIsVoidingInvoice(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('fee_management')}</h1>
          <p className="text-muted-foreground mt-2 font-medium">{t('fee_management_desc')}</p>
        </div>
        {can('create', 'fees') && (
          <button 
            onClick={() => setIsNewInvoiceOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
          >
            <Plus size={20} />
            {t('new_invoice')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-card p-5 sm:p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">{t('collected')}</p>
          <p className="text-2xl sm:text-4xl font-bold text-emerald-500 mt-2">${stats.collected}</p>
        </div>
        <div className="bg-card p-5 sm:p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">{t('pending')}</p>
          <p className="text-2xl sm:text-4xl font-bold text-foreground mt-2">${stats.pending}</p>
        </div>
        <div className="bg-card p-5 sm:p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">{t('overdue')}</p>
          <p className="text-2xl sm:text-4xl font-bold text-destructive mt-2">${stats.overdue}</p>
        </div>
      </div>

      <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="p-6 border-b border-border space-y-5 bg-muted/50 shrink-0">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-4" />
            <input 
              type="text" 
              placeholder={t('search_invoice_placeholder')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground text-foreground shadow-sm rtl:pl-4 rtl:pr-12"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'pending', 'overdue', 'structure'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === tab 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'bg-background border border-border text-muted-foreground hover:bg-accent hover:border-accent-foreground/20'
                }`}
              >
                {t(tab)}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'structure' ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">{t('standard_fee_items')}</h3>
                <button 
                  onClick={() => setIsAddFeeItemOpen(true)}
                  className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> {t('add_item')}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {feeStructure.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl border border-border bg-muted/30 flex items-center justify-between group hover:border-primary/30 transition-all">
                    <div>
                      <p className="font-bold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{t(item.category.toLowerCase())} • {t(item.frequency.toLowerCase().replace(' ', '_'))}</p>
                    </div>
                    <div className="text-right rtl:text-left">
                      <p className="font-black text-lg text-foreground">${item.amount}</p>
                      <div className="flex gap-2 justify-end rtl:justify-start opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => {
                            setEditingFeeItem(item);
                            setNewFeeItem({
                              name: item.name,
                              amount: item.amount.toString(),
                              frequency: item.frequency,
                              category: item.category
                            });
                            setIsAddFeeItemOpen(true);
                          }}
                          className="text-[10px] font-bold text-muted-foreground hover:text-primary"
                        >
                          {t('edit')}
                        </button>
                        <button 
                          onClick={() => handleDeleteFeeItem(item.id)}
                          className="text-[10px] font-bold text-destructive hover:text-destructive/80"
                        >
                          {t('delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isLoading ? (
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
              <div key={invoice.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:bg-accent transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 p-3 rounded-2xl shrink-0 shadow-sm border ${
                    invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    invoice.status === 'overdue' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <button 
                        onClick={() => setSelectedStudentForProfile(invoice.studentId)}
                        className="font-bold text-foreground text-lg hover:text-primary hover:underline text-left"
                      >
                        {invoice.studentName}
                      </button>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' :
                        invoice.status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {t(invoice.status)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{invoice.id} • {invoice.term}</p>
                    <p className="text-sm font-medium text-muted-foreground mt-1">{t('due')}: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-5 sm:w-auto w-full border-t sm:border-0 border-border pt-4 sm:pt-0">
                  <p className="text-2xl font-bold text-foreground">${invoice.amount}</p>
                  <div className="flex gap-2">
                    {invoice.status !== 'paid' && can('manage', 'fees') && (
                      <button 
                        onClick={() => setSelectedInvoice(invoice as unknown as FeeInvoice)}
                        className="px-5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-bold transition-colors"
                      >
                        {t('record_payment')}
                      </button>
                    )}
                    <button 
                      onClick={() => toast.success(t('downloading_invoice'), { description: `${t('invoice')} ${invoice.id} ${t('is_being_prepared')}` })}
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

        {/* Pagination Controls */}
        {totalPages > 0 && (
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
      </div>

      <AnimatePresence>
        {isAddFeeItemOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border flex flex-col"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{editingFeeItem ? t('edit_fee_item') : t('add_fee_item')}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">
                  {editingFeeItem ? t('update_fee_item_desc') : t('add_fee_item_desc')}
                </p>
              </div>
              
              <form onSubmit={handleAddFeeItem} className="p-6 sm:p-8 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('item_name')}</label>
                  <input 
                    required 
                    type="text" 
                    placeholder={t('item_name_placeholder')} 
                    value={newFeeItem.name}
                    onChange={(e) => setNewFeeItem(prev => ({ ...prev, name: e.target.value }))}
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
                      placeholder="0.00" 
                      value={newFeeItem.amount}
                      onChange={(e) => setNewFeeItem(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('frequency')}</label>
                    <select 
                      value={newFeeItem.frequency}
                      onChange={(e) => setNewFeeItem(prev => ({ ...prev, frequency: e.target.value }))}
                      className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                    >
                      <option value="Per Term">{t('per_term')}</option>
                      <option value="Monthly">{t('monthly')}</option>
                      <option value="Annual">{t('annual')}</option>
                      <option value="One-time">{t('one_time')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('category')}</label>
                  <select 
                    value={newFeeItem.category}
                    onChange={(e) => setNewFeeItem(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  >
                    <option value="Academic">{t('academic')}</option>
                    <option value="Transport">{t('transport')}</option>
                    <option value="Extracurricular">{t('extracurricular')}</option>
                    <option value="Facility">{t('facility')}</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddFeeItemOpen(false);
                      setEditingFeeItem(null);
                      setNewFeeItem({ name: '', amount: '', frequency: 'Per Term', category: 'Academic' });
                    }}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingFeeItem}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingFeeItem ? <Loader2 size={20} className="animate-spin" /> : editingFeeItem ? t('update_item') : t('add_item')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

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
                    <p className="text-3xl font-black text-foreground">${studentTotalDue}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">{t('total_paid')}</p>
                    <p className="text-3xl font-black text-foreground">
                      ${studentInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0)}
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
                        <p className="font-bold text-foreground">${inv.amount}</p>
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
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 mb-6 flex items-center justify-between">
                  <span className="font-bold text-foreground">{t('amount_to_pay')}</span>
                  <span className="font-black text-primary text-2xl">${selectedInvoice.amount}</span>
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
                  <label className="block text-sm font-bold text-foreground mb-2">{t('reference_number')}</label>
                  <input 
                    type="text" 
                    placeholder={t('reference_number_placeholder')} 
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

                <div className="pt-4 border-t border-border">
                  <button 
                    type="button"
                    onClick={handleVoidInvoice}
                    disabled={isVoidingInvoice}
                    className="w-full py-3 text-destructive hover:bg-destructive/10 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {isVoidingInvoice ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    {t('void_invoice')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNewInvoiceOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Create New Invoice</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Generate a new fee request for a student.</p>
              </div>
              
              <form onSubmit={handleCreateInvoice} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Select Student</label>
                  <select 
                    required 
                    value={newInvoiceData.studentId}
                    onChange={(e) => setNewInvoiceData(prev => ({ ...prev, studentId: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  >
                    <option value="">Select a student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Fee Item</label>
                  <select 
                    required 
                    value={newInvoiceData.feeItemId}
                    onChange={(e) => {
                      const item = feeStructure.find(i => i.id === e.target.value);
                      setNewInvoiceData(prev => ({ 
                        ...prev, 
                        feeItemId: e.target.value,
                        amount: item ? item.amount.toString() : '',
                        description: item ? `${item.name} - ${item.frequency}` : ''
                      }));
                    }}
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  >
                    <option value="">Select fee type...</option>
                    {feeStructure.map(item => (
                      <option key={item.id} value={item.id}>{item.name} (${item.amount})</option>
                    ))}
                    <option value="custom">Custom Fee...</option>
                  </select>
                </div>

                {newInvoiceData.feeItemId === 'custom' && (
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Description</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. Special Event Fee" 
                      value={newInvoiceData.description}
                      onChange={(e) => setNewInvoiceData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Amount ($)</label>
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
      </AnimatePresence>
    </motion.div>
  );
}

