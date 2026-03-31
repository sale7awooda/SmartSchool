'use client';

import useSWR, { mutate } from 'swr';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { FeeInvoice } from '@/lib/mock-db';
import { getPaginatedInvoices, createInvoice, updateInvoice, getStudents, getFeeStats, getFeeItems, createFeeItem, deleteFeeItem } from '@/lib/supabase-db';
import { CreditCard, Search, CheckCircle2, Clock, AlertCircle, FileText, Download, Plus, DollarSign, Loader2, X, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner";

export default function FeesPage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  
  if (!user) return null;

  if (!can('view', 'fees')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  if (isRole(['accountant', 'admin'])) return <AccountantFees />;
  if (isRole('parent')) return <ParentFees />;

  return <div className="p-4">You do not have permission to view this page.</div>;
}

function AccountantFees() {
  const { can } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'overdue' | 'structure'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoice | null>(null);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<string | null>(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isVoidingInvoice, setIsVoidingInvoice] = useState(false);
  const [isAddFeeItemOpen, setIsAddFeeItemOpen] = useState(false);
  const [isSubmittingFeeItem, setIsSubmittingFeeItem] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({ collected: 0, pending: 0, overdue: 0 });
  const [feeStructure, setFeeStructure] = useState<any[]>([]);

  useEffect(() => {
    getStudents().then(setStudents).catch(console.error);
    getFeeStats().then(setStats).catch(console.error);
    getFeeItems().then(setFeeStructure).catch(console.error);
  }, []);

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
    ['invoices', page, debouncedSearch, activeTab],
    ([_, p, s, tab]) => getPaginatedInvoices(p, limit, s, undefined, tab)
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
    description: inv.description
  }));

  const filteredInvoices = mappedInvoices.filter((inv: any) => {
    const matchesTab = activeTab === 'all' ? true : activeTab === 'structure' ? false : inv.status === activeTab;
    return matchesTab;
  });

  const studentInvoices = mappedInvoices.filter((inv: any) => inv.studentId === selectedStudentForProfile);
  const studentTotalDue = studentInvoices.filter((inv: any) => inv.status !== 'paid').reduce((sum: number, inv: any) => sum + inv.amount, 0);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setIsRecordingPayment(true);
    try {
      await updateInvoice(selectedInvoice.id, { status: 'paid' });
      mutate(['invoices', page, debouncedSearch, activeTab]);
      getFeeStats().then(setStats).catch(console.error);
      toast.success("Payment recorded", {
        description: `Successfully recorded $${selectedInvoice.amount} for ${selectedInvoice.studentName}.`,
      });
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error("Failed to record payment");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleAddFeeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeeItem(true);
    try {
      const newItem = await createFeeItem({
        name: newFeeItem.name,
        amount: parseFloat(newFeeItem.amount),
        frequency: newFeeItem.frequency,
        category: newFeeItem.category
      });
      setFeeStructure(prev => [...prev, newItem]);
      setIsAddFeeItemOpen(false);
      setNewFeeItem({ name: '', amount: '', frequency: 'Per Term', category: 'Academic' });
      toast.success("Fee item added to structure");
    } catch (error) {
      console.error('Error adding fee item:', error);
      toast.error("Failed to add fee item");
    } finally {
      setIsSubmittingFeeItem(false);
    }
  };

  const handleDeleteFeeItem = async (id: string) => {
    try {
      await deleteFeeItem(id);
      setFeeStructure(prev => prev.filter(i => i.id !== id));
      toast.success("Fee item deleted");
    } catch (error) {
      console.error('Error deleting fee item:', error);
      toast.error("Failed to delete fee item");
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingInvoice(true);
    try {
      await createInvoice({
        student_id: newInvoiceData.studentId,
        amount: parseFloat(newInvoiceData.amount),
        due_date: newInvoiceData.dueDate,
        description: newInvoiceData.description,
        status: 'pending'
      });
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
    if (!selectedInvoice) return;
    setIsVoidingInvoice(true);
    try {
      await updateInvoice(selectedInvoice.id, { status: 'void' });
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Fee Management</h1>
          <p className="text-muted-foreground mt-2 font-medium">Track and record student payments.</p>
        </div>
        {can('create', 'fees') && (
          <button 
            onClick={() => setIsNewInvoiceOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
          >
            <Plus size={20} />
            New Invoice
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-card p-5 sm:p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Collected</p>
          <p className="text-2xl sm:text-4xl font-bold text-emerald-500 mt-2">${stats.collected}</p>
        </div>
        <div className="bg-card p-5 sm:p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Pending</p>
          <p className="text-2xl sm:text-4xl font-bold text-foreground mt-2">${stats.pending}</p>
        </div>
        <div className="bg-card p-5 sm:p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Overdue</p>
          <p className="text-2xl sm:text-4xl font-bold text-destructive mt-2">${stats.overdue}</p>
        </div>
      </div>

      <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="p-6 border-b border-border space-y-5 bg-muted/50 shrink-0">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by student name or invoice ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground text-foreground shadow-sm"
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
                {tab === 'structure' ? 'Fee Structure' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'structure' ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">Standard Fee Items</h3>
                <button 
                  onClick={() => setIsAddFeeItemOpen(true)}
                  className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {feeStructure.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl border border-border bg-muted/30 flex items-center justify-between group hover:border-primary/30 transition-all">
                    <div>
                      <p className="font-bold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category} • {item.frequency}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg text-foreground">${item.amount}</p>
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all">
                        <button className="text-[10px] font-bold text-muted-foreground hover:text-primary">Edit</button>
                        <button 
                          onClick={() => handleDeleteFeeItem(item.id)}
                          className="text-[10px] font-bold text-destructive hover:text-destructive/80"
                        >
                          Delete
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
            <div className="p-12 text-center text-muted-foreground font-medium">No invoices found.</div>
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
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{invoice.id} • {invoice.description}</p>
                    <p className="text-sm font-medium text-muted-foreground mt-1">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-5 sm:w-auto w-full border-t sm:border-0 border-border pt-4 sm:pt-0">
                  <p className="text-2xl font-bold text-foreground">${invoice.amount}</p>
                  <div className="flex gap-2">
                    {invoice.status !== 'paid' && can('manage', 'fees') && (
                      <button 
                        onClick={() => setSelectedInvoice(invoice)}
                        className="px-5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-bold transition-colors"
                      >
                        Record Payment
                      </button>
                    )}
                    <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Download Invoice">
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Add Fee Item</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Define a new standard fee for the school.</p>
              </div>
              
              <form onSubmit={handleAddFeeItem} className="p-6 sm:p-8 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Item Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Lab Fee" 
                    value={newFeeItem.name}
                    onChange={(e) => setNewFeeItem(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Amount ($)</label>
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
                    <label className="block text-sm font-bold text-foreground mb-2">Frequency</label>
                    <select 
                      value={newFeeItem.frequency}
                      onChange={(e) => setNewFeeItem(prev => ({ ...prev, frequency: e.target.value }))}
                      className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                    >
                      <option>Per Term</option>
                      <option>Monthly</option>
                      <option>Annual</option>
                      <option>One-time</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Category</label>
                  <select 
                    value={newFeeItem.category}
                    onChange={(e) => setNewFeeItem(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  >
                    <option>Academic</option>
                    <option>Transport</option>
                    <option>Extracurricular</option>
                    <option>Facility</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsAddFeeItemOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingFeeItem}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingFeeItem ? <Loader2 size={20} className="animate-spin" /> : 'Add Item'}
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
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">Student Fee Profile</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2">
                    Viewing all invoices for {students.find(s => s.id === selectedStudentForProfile)?.name || selectedStudentForProfile}
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
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Total Outstanding</p>
                    <p className="text-3xl font-black text-foreground">${studentTotalDue}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Total Paid</p>
                    <p className="text-3xl font-black text-foreground">
                      ${studentInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-foreground">Invoice History</h3>
                  {studentInvoices.map(inv => (
                    <div key={inv.id} className="p-4 rounded-xl border border-border flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-bold text-sm">{inv.description}</p>
                        <p className="text-xs text-muted-foreground">{inv.id} • {new Date(inv.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">${inv.amount}</p>
                        <span className={`text-[10px] font-bold uppercase ${
                          inv.status === 'paid' ? 'text-emerald-500' : 
                          inv.status === 'overdue' ? 'text-destructive' : 'text-amber-500'
                        }`}>
                          {inv.status}
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
                  Close
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
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Record Payment</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Recording payment for {selectedInvoice.studentName}</p>
              </div>
              
              <form onSubmit={handleRecordPayment} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 mb-6 flex items-center justify-between">
                  <span className="font-bold text-foreground">Amount to Pay</span>
                  <span className="font-black text-primary text-2xl">${selectedInvoice.amount}</span>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Payment Method</label>
                  <select className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>Cheque</option>
                    <option>Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Reference Number</label>
                  <input type="text" placeholder="e.g., TXN123456" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isRecordingPayment}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isRecordingPayment ? <Loader2 size={20} className="animate-spin" /> : 'Record Payment'}
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
                    Void Invoice
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
                    <label className="block text-sm font-bold text-foreground mb-2">Due Date</label>
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
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isCreatingInvoice}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isCreatingInvoice ? <Loader2 size={20} className="animate-spin" /> : 'Create Invoice'}
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

function ParentFees() {
  const { user } = useAuth();
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

  const pendingTotal = myInvoices.filter((inv: any) => inv.status !== 'paid').reduce((sum: number, inv: any) => sum + inv.amount, 0);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceToPay) return;
    setIsProcessingPayment(true);
    try {
      await updateInvoice(selectedInvoiceToPay.id, { status: 'paid' });
      mutate(['parent_invoices', page, user?.studentId]);
      toast.success("Payment successful", {
        description: "Your payment has been processed and a receipt has been generated.",
      });
      setIsPayNowOpen(false);
      setSelectedInvoiceToPay(null);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error("Failed to process payment");
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
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Fees & Payments</h1>
        <p className="text-muted-foreground mt-2 font-medium">Manage payments for {user?.studentId}</p>
      </div>

      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-[2rem] p-8 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="text-primary-foreground/80 text-sm font-bold uppercase tracking-wider mb-2">Total Amount Due</p>
            <h2 className="text-5xl font-bold tracking-tight">${pendingTotal}</h2>
            {pendingTotal > 0 && (
              <p className="text-amber-400 text-sm font-medium mt-3 flex items-center gap-2 bg-amber-400/10 w-fit px-3 py-1.5 rounded-lg border border-amber-400/20">
                <AlertCircle size={16} />
                Outstanding balance requires attention
              </p>
            )}
          </div>
          {pendingTotal > 0 && (
            <button 
              onClick={() => openPaymentModal()}
              className="px-8 py-4 bg-background text-foreground rounded-xl font-bold hover:bg-accent transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
            >
              <CreditCard size={20} />
              Pay Now
            </button>
          )}
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10">
          <DollarSign size={160} />
        </div>
      </div>

      <div className="space-y-5 flex-1 flex flex-col overflow-hidden">
        <h3 className="text-xl font-bold text-foreground shrink-0">Invoice History</h3>
        
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
            <div className="p-12 text-center text-muted-foreground font-medium">No invoices found.</div>
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
                <p className="text-sm font-medium text-muted-foreground">Invoice: {invoice.id}</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {invoice.status === 'paid' ? `Paid on ${new Date(invoice.updated_at).toLocaleDateString()}` : `Due by ${new Date(invoice.dueDate).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 border-t sm:border-0 border-border pt-5 sm:pt-0">
              <p className="text-3xl font-bold text-foreground">${invoice.amount}</p>
              <div className="flex gap-2">
                {invoice.status === 'paid' && (
                  <button className="p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors" title="Download Receipt">
                    <Download size={20} />
                  </button>
                )}
                {invoice.status !== 'paid' && (
                  <button 
                    onClick={() => openPaymentModal(invoice)}
                    className="px-6 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-bold transition-colors"
                  >
                    Pay
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
            className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            Previous
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              Page <span className="text-foreground font-bold">{page}</span> of <span className="text-foreground font-bold">{totalPages}</span>
            </span>
            <span className="text-sm font-medium text-muted-foreground border-l border-border pl-4">
              Total: <span className="text-foreground font-bold">{totalCount}</span>
            </span>
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            Next
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
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Secure Checkout</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">
                  {selectedInvoiceToPay ? `Paying for ${selectedInvoiceToPay.description}` : 'Paying total outstanding balance'}
                </p>
              </div>
              
              <form onSubmit={handlePay} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 mb-6 flex items-center justify-between">
                  <span className="font-bold text-foreground">Total to Pay</span>
                  <span className="font-black text-primary text-2xl">
                    ${selectedInvoiceToPay ? selectedInvoiceToPay.amount : pendingTotal}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Cardholder Name</label>
                  <input required type="text" placeholder="John Doe" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Card Number</label>
                  <div className="relative">
                    <CreditCard size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input required type="text" placeholder="0000 0000 0000 0000" maxLength={19} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground tracking-widest" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Expiry Date</label>
                    <input required type="text" placeholder="MM/YY" maxLength={5} className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground text-center" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">CVC</label>
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
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isProcessingPayment}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isProcessingPayment ? <Loader2 size={20} className="animate-spin" /> : 'Pay Securely'}
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
