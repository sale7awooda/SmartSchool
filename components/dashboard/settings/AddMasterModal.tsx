'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { 
  getPaginatedStaff, 
  updateUserRole, 
  getAcademicYears, 
  setActiveAcademicYear,
  getClasses,
  getSubjects,
  createAcademicYear,
  createClass,
  createSubject,
  deleteAcademicYear,
  deleteClass,
  deleteSubject,
  createStaff
} from '@/lib/supabase-db';
import { usePermissions } from '@/lib/permissions';
import { useSettings } from '@/lib/settings-context';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Smartphone, 
  Mail, 
  Save, 
  Camera, 
  Loader2,
  Moon,
  Globe,
  Settings,
  Palette,
  Type,
  LayoutGrid,
  Users,
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Building,
  Database,
  RefreshCw,
  FileDown,
  FileUp,
  CloudUpload,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
  UserCheck,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { seedDatabase, resetDatabase } from '@/lib/supabase-db';
import { 
  MOCK_USERS, 
  MOCK_STUDENTS, 
  MOCK_PARENTS, 
  MOCK_DRIVERS, 
  MOCK_BUS_ROUTES, 
  MOCK_NOTICES, 
  MOCK_SCHEDULE,
  MOCK_CHATS,
  MOCK_MESSAGES,
  MOCK_ACADEMIC_YEARS,
  MOCK_CLASSES,
  MOCK_SUBJECTS,
  MOCK_EXAMS,
  MOCK_EXAM_RESULTS,
  MOCK_ATTENDANCE,
  MOCK_BOOKS,
  MOCK_INVOICES,
  MOCK_INVENTORY
} from '@/lib/demo-data';

export function AddMasterModal({ type, onClose, onSuccess }: { type: 'year' | 'class' | 'subject', onClose: () => void, onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (type === 'year') {
        await createAcademicYear({ name, is_active: false });
      } else if (type === 'class') {
        await createClass({ name });
      } else if (type === 'subject') {
        await createSubject({ name });
      }
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully`);
      onSuccess();
    } catch (error) {
      toast.error(`Failed to add ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border flex flex-col"
      >
        <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Add New {type === 'year' ? 'Academic Year' : type === 'class' ? 'Grade' : 'Subject'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Name / Title</label>
            <input 
              required 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={type === 'year' ? '2024-2025' : type === 'class' ? 'Grade 7' : 'Physics'} 
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
            />
          </div>

          <div className="flex gap-3 pt-6">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Add Item'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
