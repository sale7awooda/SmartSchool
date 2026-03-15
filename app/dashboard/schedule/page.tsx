'use client';

import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { motion } from 'motion/react';
import { 
  CalendarDays, 
  Filter
} from 'lucide-react';
import AdminScheduleView from './AdminScheduleView';
import StudentScheduleView from './StudentScheduleView';

export default function SchedulePage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  
  if (!user) return null;

  if (!can('view', 'schedule')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  // Render Admin View for privileged roles
  if (isRole(['superadmin', 'schoolAdmin', 'accountant', 'staff'])) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Master Schedule</h1>
          <p className="text-slate-500 mt-1 font-medium">
            Manage and resolve conflicts across all grades and periods
          </p>
        </div>
        <AdminScheduleView />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Class Schedule</h1>
          <p className="text-slate-500 mt-1 font-medium">
            {user.role === 'teacher' ? 'Your teaching timetable' : 
             user.role === 'parent' ? `Weekly schedule for your children` : 
             'Weekly class timetable'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors flex items-center gap-2 shadow-sm">
            <Filter size={16} />
            Filter
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2">
            <CalendarDays size={16} />
            Sync Calendar
          </button>
        </div>
      </div>

      <StudentScheduleView />
    </motion.div>
  );
}
