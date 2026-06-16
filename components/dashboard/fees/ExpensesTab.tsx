import { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';
import { formatAmount, useSettings } from '@/lib/settings-context';
import { Plus, Loader2, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ExpensesTabProps {
  activeTab: string;
  onExpenseMutated: () => void;
  t: (key: string) => string;
}

export function ExpensesTab({ activeTab, onExpenseMutated, t }: ExpensesTabProps) {
  const { settings } = useSettings();
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: expenses, mutate, isLoading } = useSWR(
    activeTab === 'expenses' ? 'school_expenses' : null,
    async () => {
      const { data, error } = await supabase
        .from('financials')
        .select('*')
        .eq('type', 'Expense')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  );

  if (activeTab !== 'expenses') return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const expenseObj = {
        type: 'Expense',
        category: formData.get('category'),
        amount: parseFloat(formData.get('amount') as string),
        date: formData.get('date'),
        description: formData.get('description'),
        status: 'Paid'
      };

      const { createExpenseAction } = await import('@/app/actions/finance');
      const res = await createExpenseAction(expenseObj);

      if(!res.success) throw new Error(res.message);

      toast.success('Expense recorded successfully');
      setIsCreating(false);
      mutate();
      onExpenseMutated();
    } catch(err: any) {
      toast.error(err.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t('expenses')}</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">{t('expenses_management_desc')}</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus size={18} />
          {t('record_expense')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('date')}</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('category')}</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('description')}</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('amount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></td>
              </tr>
            ) : expenses?.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">{t('no_expenses_recorded')}</td>
              </tr>
            ) : (
              expenses?.map((exp) => (
                <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4"><p className="text-sm font-bold">{new Date(exp.date).toLocaleDateString()}</p></td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-secondary/50 text-secondary-foreground rounded-lg text-xs font-bold">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-4"><p className="text-sm font-medium text-muted-foreground">{exp.description}</p></td>
                  <td className="p-4"><p className="text-sm font-black text-amber-500">{formatAmount(exp.amount, settings?.currency)}</p></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-border bg-muted/50">
                <h2 className="text-xl font-bold">{t('record_expense')}</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div>
                  <label className="block text-sm font-bold mb-2">{t('category')}</label>
                  <select name="category" required className="w-full px-4 py-3 rounded-xl border border-border bg-background">
                    <option value="Maintenance">{t('maintenance')}</option>
                    <option value="Supplies">{t('supplies')}</option>
                    <option value="Utilities">{t('utilities')}</option>
                    <option value="Miscellaneous">{t('miscellaneous')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('amount')}</label>
                  <input name="amount" type="number" step="0.01" required className="w-full px-4 py-3 rounded-xl border border-border bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('date')}</label>
                  <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full px-4 py-3 rounded-xl border border-border bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('description')}</label>
                  <textarea name="description" rows={3} required className="w-full px-4 py-3 rounded-xl border border-border bg-background"></textarea>
                </div>

                <div className="flex gap-3 pt-4 pb-10">
                  <button 
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold border border-border hover:bg-accent transition-colors cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-md flex justify-center items-center cursor-pointer"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : t('record')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
