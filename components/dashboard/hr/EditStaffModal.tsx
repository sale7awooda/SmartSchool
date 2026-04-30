'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Save } from 'lucide-react';
import { updateUserRole } from '@/lib/supabase-db';
import { toast } from 'sonner';

export function EditStaffModal({ staff, onClose, onUpdate }: { staff: any; onClose: () => void; onUpdate: () => void }) {
  const [role, setRole] = useState(staff.role || '');
  const [department, setDepartment] = useState(staff.department || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateUserRole(staff.id, role);
      // Wait if there's a department table too, we only have updateUserRole for now?
      // For now, let's just update role.
      toast.success('Staff role updated successfully');
      onUpdate();
    } catch (err) {
      toast.error('Failed to update staff role');
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col"
      >
        <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Edit Staff Profile</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Update role and assignment details.</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 relative">
          <form id="edit-staff-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Staff Member</label>
              <input 
                type="text" 
                value={staff.name} 
                disabled
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 text-muted-foreground font-medium cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Role</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
              >
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="staff">Staff</option>
                <option value="accountant">Accountant</option>
                <option value="driver">Driver</option>
                <option value="cleaner">Cleaner</option>
                <option value="guard">Guard</option>
              </select>
            </div>
          </form>
        </div>

        <div className="p-6 sm:p-8 border-t border-border bg-muted/50 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-staff-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
