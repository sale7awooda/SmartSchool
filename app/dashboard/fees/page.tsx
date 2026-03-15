'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MOCK_STUDENTS, FeeInvoice } from '@/lib/mock-db';
import { CreditCard, Search, CheckCircle2, Clock, AlertCircle, FileText, Download, Plus, DollarSign, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner";

const MOCK_INVOICES: FeeInvoice[] = [
  { id: 'INV-2023-001', studentId: 'STU001', studentName: 'Bart Simpson', amount: 450, dueDate: '2023-11-01', status: 'pending', description: 'Tuition Fee - Term 1' },
  { id: 'INV-2023-002', studentId: 'STU002', studentName: 'Lisa Simpson', amount: 450, dueDate: '2023-11-01', status: 'paid', description: 'Tuition Fee - Term 1' },
  { id: 'INV-2023-003', studentId: 'STU003', studentName: 'Milhouse Van Houten', amount: 450, dueDate: '2023-10-01', status: 'overdue', description: 'Tuition Fee - Term 1' },
  { id: 'INV-2023-004', studentId: 'STU001', studentName: 'Bart Simpson', amount: 120, dueDate: '2023-09-15', status: 'paid', description: 'Bus Transport - Q3' },
];

export default function FeesPage() {
  const { user } = useAuth();
  
  if (!user) return null;

  if (user.role === 'accountant' || user.role === 'schoolAdmin' || user.role === 'superadmin') return <AccountantFees />;
  if (user.role === 'parent') return <ParentFees />;

  return <div className="p-4">You do not have permission to view this page.</div>;
}

function AccountantFees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'overdue'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoice | null>(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const filteredInvoices = MOCK_INVOICES.filter(inv => {
    const matchesSearch = inv.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || inv.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' ? true : inv.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecordingPayment(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsRecordingPayment(false);
    toast.success("Payment recorded", {
      description: `Successfully recorded $${selectedInvoice?.amount} for ${selectedInvoice?.studentName}.`,
    });
    setSelectedInvoice(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Fee Management</h1>
          <p className="text-muted-foreground mt-2 font-medium">Track and record student payments.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-5 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20">
          <Plus size={20} />
          New Invoice
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-card p-5 sm:p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Collected</p>
          <p className="text-2xl sm:text-4xl font-bold text-emerald-500 mt-2">$12,450</p>
        </div>
        <div className="bg-card p-5 sm:p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Pending</p>
          <p className="text-2xl sm:text-4xl font-bold text-foreground mt-2">$4,500</p>
        </div>
        <div className="bg-card p-5 sm:p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Overdue</p>
          <p className="text-2xl sm:text-4xl font-bold text-destructive mt-2">$1,350</p>
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
            {(['all', 'pending', 'overdue'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === tab 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'bg-background border border-border text-muted-foreground hover:bg-accent hover:border-accent-foreground/20'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border overflow-y-auto custom-scrollbar flex-1">
          {filteredInvoices.length === 0 ? (
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
                      <p className="font-bold text-foreground text-lg">{invoice.studentName}</p>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' :
                        invoice.status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                        'bg-amber-500/20 text-amber-500'
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
                  {invoice.status !== 'paid' && (
                    <button 
                      onClick={() => setSelectedInvoice(invoice)}
                      className="px-5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-bold transition-colors"
                    >
                      Record Payment
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border"
            >
              <div className="p-8 border-b border-border bg-muted/50">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Record Payment</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">For {selectedInvoice.studentName}</p>
              </div>
              
              <form onSubmit={handleRecordPayment} className="p-8 space-y-5">
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-muted-foreground">Invoice ID</span>
                    <span className="font-bold text-foreground">{selectedInvoice.id}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-muted-foreground">Description</span>
                    <span className="font-bold text-foreground">{selectedInvoice.description}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-4 pt-4 border-t border-border">
                    <span className="font-bold text-foreground uppercase tracking-wider text-xs self-center">Amount Due</span>
                    <span className="font-bold text-primary text-2xl">${selectedInvoice.amount}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Payment Method</label>
                  <select className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Reference Number (Optional)</label>
                  <input type="text" placeholder="e.g. Check #1234" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
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
                    {isRecordingPayment ? <Loader2 size={20} className="animate-spin" /> : 'Confirm Payment'}
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
  const myInvoices = MOCK_INVOICES.filter(inv => inv.studentId === user?.studentId);
  const pendingTotal = myInvoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.amount, 0);

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
                Payment required before Nov 1st
              </p>
            )}
          </div>
          {pendingTotal > 0 && (
            <button className="px-8 py-4 bg-background text-foreground rounded-xl font-bold hover:bg-accent transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg">
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
          {myInvoices.map((invoice) => (
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
                  {invoice.status === 'paid' ? 'Paid on Oct 15, 2023' : `Due by ${new Date(invoice.dueDate).toLocaleDateString()}`}
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
                  <button className="px-6 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-bold transition-colors">
                    Pay
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </motion.div>
  );
}
