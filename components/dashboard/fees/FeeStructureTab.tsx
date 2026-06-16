'use client';

import { useState } from 'react';
import { User } from '@/types';
import { processCreateFeeItemAction, processUpdateFeeItemAction, processDeleteFeeItemAction } from '@/app/actions/finance';
import { useSettings, formatAmount } from '@/lib/settings-context';
import { Plus, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner";

interface FeeStructureTabProps {
  user: User | null;
  feeStructure: any[];
  onStructureMutated: () => void;
  t: (key: string) => string;
  activeTab: string;
}

export function FeeStructureTab({
  user,
  feeStructure,
  onStructureMutated,
  t,
  activeTab
}: FeeStructureTabProps) {
  const { settings } = useSettings();
  const [isAddFeeItemOpen, setIsAddFeeItemOpen] = useState(false);
  const [editingFeeItem, setEditingFeeItem] = useState<any | null>(null);
  const [isSubmittingFeeItem, setIsSubmittingFeeItem] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newFeeItem, setNewFeeItem] = useState({
    name: '',
    amount: '',
    frequency: 'Per Term',
    category: 'Academic'
  });

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
        formData.append('createdBy', user.id);

        const result = await processUpdateFeeItemAction({ success: false, message: '' }, formData);
        if (!result.success) {
          toast.error("Error", { description: result.message });
          return;
        }
        toast.success("Fee item updated");
      } else {
        formData.append('createdBy', user.id);
        
        const result = await processCreateFeeItemAction({ success: false, message: '' }, formData);
        if (!result.success) {
          toast.error("Error", { description: result.message });
          return;
        }
        toast.success("Fee item added to structure");
      }
      onStructureMutated();
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
      setIsDeleting(true);
      const formData = new FormData();
      formData.append('id', id);
      formData.append('deletedBy', user.id);

      const result = await processDeleteFeeItemAction({ success: false, message: '' }, formData);
      if (!result.success) {
        toast.error("Error", { description: result.message });
        return;
      }
      
      toast.success("Fee item deleted");
      setDeleteConfirmId(null);
      onStructureMutated();
    } catch (error) {
      console.error('Error deleting fee item:', error);
      toast.error("Failed to delete fee item");
    } finally {
      setIsDeleting(false);
    }
  };

  if (activeTab !== 'structure') return null;

  return (
    <>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg">{t('grade_fee_structures')}</h3>
          <button 
            onClick={() => setIsAddFeeItemOpen(true)}
            className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Plus size={14} /> {t('add_grade_structure')}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {feeStructure.map((item) => (
            <div key={item.id} className="p-4 rounded-2xl border border-border bg-muted/30 flex items-center justify-between group hover:border-primary/30 transition-all animate-fadeIn">
              <div>
                <p className="font-bold text-foreground">{item.name}</p>
              </div>
              <div className="text-right rtl:text-left">
                <p className="font-black text-lg text-foreground">{formatAmount(item.amount, settings?.currency)}</p>
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
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                    title={t('delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{editingFeeItem ? t('edit_grade_structure') : t('add_grade_structure')}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">
                  {editingFeeItem ? t('update_base_amount_grade') : t('define_new_base_fee')}
                </p>
              </div>
              
              <form onSubmit={handleAddFeeItem} className="p-6 sm:p-8 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('grade_name')}</label>
                  <input 
                    required 
                    type="text" 
                    placeholder={t('grade_1_placeholder')} 
                    value={newFeeItem.name}
                    onChange={(e) => setNewFeeItem(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-foreground mb-2">{t('base_tuition_amount')}</label>
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
                    {isSubmittingFeeItem ? <Loader2 size={20} className="animate-spin" /> : editingFeeItem ? t('update_structure') : t('add_structure')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-border flex flex-col p-8 items-center text-center space-y-6"
            >
              <div className="p-4 bg-destructive/10 text-destructive rounded-full">
                <AlertCircle size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{t('delete_grade_structure')}</h3>
                <p className="text-sm text-muted-foreground mt-2">{t('delete_grade_structure_confirm')}</p>
              </div>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={() => handleDeleteFeeItem(deleteConfirmId)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : t('delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
