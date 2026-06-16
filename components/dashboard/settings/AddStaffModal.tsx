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
import { processCreateStaffAction } from '@/app/actions/staff';
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


export function AddStaffModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'teacher',
    phone: '',
    department: 'Academics',
    designation: '',
    address: '',
    date_of_join: '',
    salary: '',
    can_mark_attendance: true,
    education: '',
    dob: '',
    gender: 'Male',
    extra_info: '',
    password: ''
  });

  const { user } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!user) return;
    setIsSubmitting(true);
    try {
      const actionFormData = new FormData();
      actionFormData.append('name', formData.name);
      actionFormData.append('email', formData.email);
      actionFormData.append('role', formData.role);
      actionFormData.append('phone', formData.phone);
      actionFormData.append('department', formData.department);
      if (formData.designation) actionFormData.append('designation', formData.designation);
      if (formData.address) actionFormData.append('address', formData.address);
      if (formData.date_of_join) actionFormData.append('date_of_join', formData.date_of_join);
      if (formData.salary) actionFormData.append('salary', formData.salary);
      actionFormData.append('can_mark_attendance', formData.can_mark_attendance.toString());
      if (formData.education) actionFormData.append('education', formData.education);
      if (formData.dob) actionFormData.append('dob', formData.dob);
      if (formData.gender) actionFormData.append('gender', formData.gender);
      if (formData.extra_info) actionFormData.append('extra_info', formData.extra_info);
      if (formData.password) actionFormData.append('password', formData.password);
      actionFormData.append('createdBy', user.id);

      const result = await processCreateStaffAction({ success: false, message: '' }, actionFormData);
      
      if (!result.success) {
        if (result.errors) {
          const firstError = Object.values(result.errors)[0][0];
          toast.error("Validation Error", { description: firstError });
        } else {
          toast.error("Error", { description: result.message });
        }
        return;
      }
      
      toast.success('Staff member added successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to add staff member');
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
        className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
      >
        <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Add New Staff</h2>
          <p className="text-sm font-medium text-muted-foreground mt-2">Enter the details for the new staff member.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Full Name</label>
            <input 
              required 
              type="text" 
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="John Doe" 
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Email Address</label>
            <input 
              required 
              type="email" 
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john.doe@school.edu" 
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Role</label>
              <select 
                required 
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
              >
                <option value="teacher">Teacher</option>
                <option value="staff">Staff</option>
                <option value="admin">Administrator</option>
                <option value="accountant">Accountant</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Department</label>
              <select 
                required 
                value={formData.department}
                onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
              >
                <option value="Academics">Academics</option>
                <option value="Administration">Administration</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Phone</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 234 567 890" 
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Password (Optional)</label>
              <input 
                type="text" 
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Defaults to password123" 
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Designation</label>
              <input 
                type="text" 
                value={formData.designation}
                onChange={e => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                placeholder="e.g. Senior Teacher" 
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Date of Join</label>
              <input 
                type="date" 
                value={formData.date_of_join}
                onChange={e => setFormData(prev => ({ ...prev, date_of_join: e.target.value }))}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Gender</label>
              <select 
                value={formData.gender}
                onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Date of Birth</label>
              <input 
                type="date" 
                value={formData.dob}
                onChange={e => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Address</label>
            <input 
              type="text" 
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="123 Main St" 
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Salary</label>
              <input 
                type="number" 
                value={formData.salary}
                onChange={e => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                placeholder="Monthly Salary" 
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Education</label>
              <input 
                type="text" 
                value={formData.education}
                onChange={e => setFormData(prev => ({ ...prev, education: e.target.value }))}
                placeholder="Degree/Qualification" 
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/50">
            <input 
              type="checkbox" 
              id="can_mark_attendance"
              checked={formData.can_mark_attendance}
              onChange={e => setFormData(prev => ({ ...prev, can_mark_attendance: e.target.checked }))}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary" 
            />
            <label htmlFor="can_mark_attendance" className="text-sm font-bold text-foreground cursor-pointer">
              Can Mark Attendance
            </label>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Extra Info / Notes</label>
            <textarea 
              value={formData.extra_info}
              onChange={e => setFormData(prev => ({ ...prev, extra_info: e.target.value }))}
              placeholder="Any additional information..." 
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground min-h-[100px] resize-y" 
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
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Add Staff'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

