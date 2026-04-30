'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { getFinancials, createFinancial } from '@/lib/api/hr';
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus,
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export function FinancialsTab({ isAdmin, userName }: { isAdmin: boolean, userName: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const currentMonthString = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const targetPrefix = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2, '0')}`;

  const { data: financials, mutate } = useSWR('financials', getFinancials);

  const displayFinancials = (financials || [])
    .filter((f: any) => isAdmin || f.staffName === userName)
    .filter((f: any) => f.date && f.date.startsWith(targetPrefix));

  const [isApplyLoanOpen, setIsApplyLoanOpen] = useState(false);
  const [isAddFineOpen, setIsAddFineOpen] = useState(false);
  const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLoan(true);
    const form = e.target as HTMLFormElement;
    const amount = form.amount.value;
    const description = form.description.value;

    try {
      const { data: userRecord } = await supabase.from('users').select('id').eq('name', userName).single();
      if (!userRecord) throw new Error("Could not find user ID");

      await createFinancial({
        staff_id: userRecord.id,
        type: 'Loan',
        amount: parseFloat(amount),
        description: description,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending'
      });
      toast.success("Loan application submitted successfully");
      setIsApplyLoanOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit loan");
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  const handleAddFineBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLoan(true);
    const form = e.target as HTMLFormElement;
    const amount = form.amount.value;
    const description = form.description.value;
    const type = form.type.value;
    const staffName = form.staffName.value;

    try {
      const { data: userRecord } = await supabase.from('users').select('id').eq('name', staffName).single();
      if (!userRecord) {
        toast.error("Could not find staff by that name");
        setIsSubmittingLoan(false);
        return;
      }

      await createFinancial({
        staff_id: userRecord.id,
        type: type as any,
        amount: parseFloat(amount),
        description: description,
        date: new Date().toISOString().split('T')[0],
        status: 'Active'
      });
      toast.success(`${type} added successfully`);
      setIsAddFineOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message || `Failed to submit ${type.toLowerCase()}`);
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50">
          <div>
            <h2 className="text-xl font-bold text-foreground">{isAdmin ? 'Loans, Bonuses & Fines' : 'My Loans & Fines'}</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">{isAdmin ? 'Manage staff financial additions and deductions.' : 'Track your bonuses, loans, and fines.'}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 bg-background border border-border rounded-xl p-1">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold w-32 text-center text-foreground">{currentMonthString}</span>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            
            <div className="flex gap-2">
              {isAdmin && (
                <button 
                  onClick={() => setIsAddFineOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm hover:bg-secondary/80 transition-colors shadow-sm whitespace-nowrap"
                >
                  <Plus size={16} />
                  Add Fine/Bonus
                </button>
              )}
              {!isAdmin && (
                <button 
                  onClick={() => setIsApplyLoanOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
                >
                  <Plus size={16} />
                  Apply for Loan
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-card border-b border-border">
                {isAdmin && <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee</th>}
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayFinancials.length > 0 ? displayFinancials.map((item) => (
                <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                  {isAdmin && (
                    <td className="p-4">
                      <p className="font-bold text-foreground text-sm">{item.staff}</p>
                    </td>
                  )}
                  <td className="p-4">
                    <p className="text-sm font-bold text-foreground">{item.type}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </td>
                  <td className="p-4">
                    <p className={`text-sm font-black ${item.type === 'Fine' ? 'text-destructive' : 'text-emerald-500'}`}>
                      {item.type === 'Fine' ? '-' : '+'}{item.amount}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-foreground">{item.date}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      item.status === 'Approved' || item.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-500' : 
                      item.status === 'Active' ? 'bg-primary/20 text-primary' : 
                      'bg-amber-500/20 text-amber-500'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-muted-foreground">No financial records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isApplyLoanOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Apply for Loan / Advance</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Submit a request for a salary advance or loan.</p>
              </div>
              
              <form onSubmit={handleApplyLoan} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Amount Requested ($)</label>
                  <input required type="number" min="1" step="0.01" placeholder="0.00" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Reason</label>
                  <textarea required rows={3} placeholder="Please provide a brief reason..." className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsApplyLoanOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingLoan}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingLoan ? <Loader2 size={20} className="animate-spin" /> : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {isAddFineOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Add Fine/Bonus</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Create a new financial record for an employee.</p>
              </div>
              
              <form onSubmit={handleAddFineBonus} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Staff Name</label>
                  <input name="staffName" required type="text" placeholder="John Doe" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Type</label>
                    <select name="type" required className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                      <option value="Fine">Fine</option>
                      <option value="Bonus">Bonus</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Amount ($)</label>
                    <input name="amount" required type="number" min="1" step="0.01" placeholder="0.00" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Reason</label>
                  <textarea name="description" required rows={3} placeholder="Please provide a brief reason..." className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsAddFineOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingLoan}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingLoan ? <Loader2 size={20} className="animate-spin" /> : 'Add Record'}
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

