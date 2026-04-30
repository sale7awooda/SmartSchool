'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { getPayslips, runPayrollForMonth } from '@/lib/api/hr';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, 
  Download, 
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export function PayrollTab({ isAdmin, userName }: { isAdmin: boolean, userName: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const currentMonthString = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  const { data: payslips, mutate, isValidating } = useSWR('payslips', getPayslips);

  const displayPayslips = (payslips || [])
    .filter((p: any) => isAdmin || p.staffName === userName)
    .filter((p: any) => p.month === currentMonthString);

  const [isRunPayrollOpen, setIsRunPayrollOpen] = useState(false);
  const [isRunningPayroll, setIsRunningPayroll] = useState(false);

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

  const handleRunPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunningPayroll(true);
    try {
      await runPayrollForMonth(currentMonthString);
      toast.success("Payroll processed successfully. Payments are pending.");
      setIsRunPayrollOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to run payroll');
    } finally {
      setIsRunningPayroll(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50">
          <div>
            <h2 className="text-xl font-bold text-foreground">{isAdmin ? 'Payroll Processing' : 'My Payslips'}</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">{isAdmin ? 'Manage salaries and generate payslips.' : 'View and download your payslips.'}</p>
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

            {isAdmin && (
              <button 
                onClick={() => setIsRunPayrollOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
              >
                <DollarSign size={16} />
                Run Payroll
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-card border-b border-border">
                {isAdmin && <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee</th>}
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Pay Period</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Net Pay</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayPayslips.length > 0 ? displayPayslips.map((slip) => (
                <tr key={slip.id} className="hover:bg-accent/50 transition-colors">
                  {isAdmin && (
                    <td className="p-4">
                      <p className="font-bold text-foreground text-sm">{slip.staff}</p>
                    </td>
                  )}
                  <td className="p-4">
                    <p className="text-sm font-bold text-foreground">{slip.month}</p>
                    <p className="text-xs text-muted-foreground font-medium">Processed: {slip.date}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-black text-foreground">{slip.amount}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${slip.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                      {slip.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold hover:bg-secondary/80 transition-colors flex items-center gap-2 ml-auto">
                      <Download size={14} />
                      Payslip
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-muted-foreground">No payslips found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isRunPayrollOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Run Payroll</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Process salaries for the current period.</p>
              </div>
              
              <form onSubmit={handleRunPayroll} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 mb-6 text-center">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Estimated Payout</p>
                  <span className="font-black text-primary text-4xl">Auto-calculated</span>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Pay Period</label>
                  <select required className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                    {[...Array(6)].map((_, i) => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - i);
                      const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                      return <option key={i} value={monthName}>{monthName}</option>;
                    })}
                  </select>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsRunPayrollOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isRunningPayroll}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isRunningPayroll ? <Loader2 size={20} className="animate-spin" /> : 'Confirm & Run'}
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

