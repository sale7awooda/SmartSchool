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

  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const handleWhatsAppShare = (slip: any) => {
    const cleanPhone = (slip.staffPhone || '').replace(/[^0-9]/g, '');
    const message = `Dear ${slip.staffName},\n\nYour salary for *${slip.month}* has been successfully processed and paid.\n\n*Receipt Details:*\n- Period: ${slip.month}\n- Net Payout: $${slip.amount}\n- Date Processed: ${slip.date || new Date().toLocaleDateString()}\n- Status: PAID\n\nThank you for your hard work!\n\nRegards,\nSmart School Support`;
    
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      const promptPhone = window.prompt("The staff member does not have a registered phone number. Enter a phone number (with country code, e.g. +1234567890) to send via WhatsApp, or leave blank to open WhatsApp directly:", "");
      if (promptPhone !== null) {
        const formatted = promptPhone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(message)}`, '_blank');
      }
    }
  };

  const handleDownloadPayslip = async (slip: any) => {
    if (!slip) return;
    const toastId = toast.loading("Generating PDF payslip...");

    try {
      const response = await fetch('/api/hr/generate-payslip-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payslip_id: slip.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip-${slip.staffName}-${slip.month.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Payslip PDF downloaded successfully", { id: toastId });
    } catch (error: any) {
      console.error('Error downloading payslip:', error);
      toast.error(error.message || "Failed to download PDF payslip", { id: toastId });
    }
  };

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
      const form = e.target as HTMLFormElement;
      const selectedMonth = form.payPeriod.value;
      await runPayrollForMonth(selectedMonth);
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
                      {slip.staffRole && (
                        <p className="text-xs text-muted-foreground font-medium capitalize mt-0.5">{slip.staffRole}</p>
                      )}
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
                    <div className="flex gap-2 justify-end items-center">
                      {isAdmin && slip.status !== 'Paid' && (
                        <button 
                          onClick={() => {
                            setSelectedPayslip(slip);
                            setIsPayDialogOpen(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          Pay
                        </button>
                      )}
                      {slip.status === 'Paid' && (
                        <button 
                          onClick={() => handleWhatsAppShare(slip)}
                          className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                          title="Share details via WhatsApp"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </button>
                      )}
                      <button 
                        onClick={() => handleDownloadPayslip(slip)}
                        className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold hover:bg-secondary/80 transition-colors flex items-center gap-2"
                      >
                        <Download size={14} />
                        Payslip
                      </button>
                    </div>
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
                  <select name="payPeriod" required className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                    {[...Array(6)].map((_, i) => {
                      const d = new Date();
                      d.setDate(1); // Prevents month overflow skip on 31st
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

      <AnimatePresence>
        {isPayDialogOpen && selectedPayslip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-border flex flex-col"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-xl font-bold text-foreground">Pay Employee</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Confirm payment for {selectedPayslip.staffName}.</p>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsPaying(true);
                try {
                  const formData = new FormData(e.currentTarget);
                  const amount = formData.get('amount') as string;
                  const paymentMethod = formData.get('paymentMethod') as string;
                  const referenceNumber = formData.get('referenceNumber') as string;
                  const paymentDate = formData.get('paymentDate') as string;
                  const remarks = formData.get('remarks') as string;

                  const { payPayslipWithExpenseAction } = await import('@/app/actions/hr');
                  const res = await payPayslipWithExpenseAction(
                    selectedPayslip.id, 
                    parseFloat(amount), 
                    selectedPayslip.staffName, 
                    selectedPayslip.month,
                    paymentMethod,
                    referenceNumber,
                    paymentDate,
                    remarks
                  );
                  if(!res.success) throw new Error(res.message);
                  toast.success('Paid successfully and expense created');
                  setIsPayDialogOpen(false);
                  mutate();
                } catch(error: any) {
                  toast.error(error.message || 'Failed to pay payslip');
                } finally {
                  setIsPaying(false);
                }
              }} className="p-6 sm:p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5">Amount</label>
                  <input name="amount" type="number" step="0.01" defaultValue={String(selectedPayslip.amount || '').replace(/[^0-9.]/g, '')} required className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 font-medium text-foreground focus:bg-background outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5">Payment Method</label>
                  <select name="paymentMethod" required className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 font-medium text-foreground focus:bg-background outline-none transition-colors">
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Mobile Wallet">Mobile Wallet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5">Reference / Transaction ID</label>
                  <input name="referenceNumber" type="text" placeholder="e.g. TXN-102938" className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 font-medium text-foreground focus:bg-background outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5">Payment Date</label>
                  <input name="paymentDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 font-medium text-foreground focus:bg-background outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5">Remarks / Notes</label>
                  <textarea name="remarks" placeholder="Optional notes or remarks..." className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 font-medium text-foreground focus:bg-background outline-none transition-colors min-h-[60px]" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsPayDialogOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold border border-border transition-colors hover:bg-accent text-foreground text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isPaying}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-primary-foreground bg-primary transition-all active:scale-[0.98] shadow-md flex items-center justify-center text-sm"
                  >
                    {isPaying ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Pay'}
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

