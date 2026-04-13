'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { getPaginatedStaff, createStaff } from '@/lib/supabase-db';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { useSWRConfig } from 'swr';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserCog, 
  Users, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  Plus,
  Search,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Award,
  Book,
  ChevronRight,
  Banknote,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import StaffProfileModal from '@/components/StaffProfileModal';

// Mock Data
const MOCK_STAFF = [
  { id: 'S1', name: 'Edna Krabappel', role: 'Teacher', department: 'Academics', email: 'edna@school.edu', phone: '555-0101', status: 'Active', designation: 'Senior Teacher', joinDate: '2015-08-15', qualifications: ['M.Ed. in Elementary Education', 'B.A. in English'], subjects: ['English', 'History'] },
  { id: 'S2', name: 'Seymour Skinner', role: 'Principal', department: 'Administration', email: 'skinner@school.edu', phone: '555-0102', status: 'Active', designation: 'Principal', joinDate: '2010-07-01', qualifications: ['Ph.D. in Educational Leadership', 'M.A. in Administration'], subjects: [] },
  { id: 'S3', name: 'Groundskeeper Willie', role: 'Staff', department: 'Maintenance', email: 'willie@school.edu', phone: '555-0103', status: 'Active', designation: 'Head Groundskeeper', joinDate: '2012-03-10', qualifications: ['Certified Facilities Manager'], subjects: [] },
  { id: 'S4', name: 'Gary Chalmers', role: 'Superintendent', department: 'District', email: 'chalmers@school.edu', phone: '555-0104', status: 'On Leave', designation: 'Superintendent', joinDate: '2008-09-01', qualifications: ['Ed.D. in Educational Administration'], subjects: [] },
  { id: '4', name: 'Edna Krabappel', role: 'teacher', department: 'Elementary Education', email: 'teacher@school.com', phone: '555-0102', status: 'Active', designation: 'Grade 4 Teacher', joinDate: '1998-08-20', qualifications: ['B.Ed. Elementary Education', 'M.A. Curriculum Development'], subjects: ['Mathematics', 'English', 'Social Studies'] },
  { id: '5', name: 'Willie MacDougal', role: 'staff', department: 'Facilities', email: 'staff@school.com', phone: '555-0103', status: 'Active', designation: 'Head Groundskeeper', joinDate: '1995-05-01', qualifications: ['Certified Landscaper', 'Boiler Maintenance Specialist'], subjects: [] },
];

const MOCK_LEAVE_REQUESTS = [
  { id: 'L1', staff: 'Edna Krabappel', type: 'Sick Leave', startDate: '2023-11-10', endDate: '2023-11-11', status: 'Approved', days: 2 },
  { id: 'L2', staff: 'Gary Chalmers', type: 'Annual Leave', startDate: '2023-12-20', endDate: '2023-12-31', status: 'Pending', days: 8 },
  { id: 'L3', staff: 'Groundskeeper Willie', type: 'Personal', startDate: '2023-10-05', endDate: '2023-10-05', status: 'Rejected', days: 1 },
];

const MOCK_PAYSLIPS = [
  { id: 'P1', staff: 'Edna Krabappel', month: 'October 2023', amount: '$4,200.00', status: 'Paid', date: '2023-10-28' },
  { id: 'P2', staff: 'Seymour Skinner', month: 'October 2023', amount: '$6,500.00', status: 'Paid', date: '2023-10-28' },
  { id: 'P3', staff: 'Groundskeeper Willie', month: 'October 2023', amount: '$3,800.00', status: 'Paid', date: '2023-10-28' },
];

const MOCK_FINANCIALS = [
  { id: 'F1', staff: 'Edna Krabappel', type: 'Bonus', amount: '$500.00', date: '2023-12-15', status: 'Approved', description: 'Year-end performance bonus' },
  { id: 'F2', staff: 'Groundskeeper Willie', type: 'Loan', amount: '$1,000.00', date: '2023-09-01', status: 'Active', description: 'Emergency home repair' },
  { id: 'F3', staff: 'Gary Chalmers', type: 'Fine', amount: '$50.00', date: '2023-10-15', status: 'Paid', description: 'Lost equipment' },
];

export function LeaveTab({ isAdmin, userName }: { isAdmin: boolean, userName: string }) {
  const displayLeaves = isAdmin ? MOCK_LEAVE_REQUESTS : MOCK_LEAVE_REQUESTS.filter(l => l.staff === userName);
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLeave(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSubmittingLeave(false);
    toast.success("Leave request submitted successfully");
    setIsApplyLeaveOpen(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50">
          <div>
            <h2 className="text-xl font-bold text-foreground">{isAdmin ? 'Leave Requests' : 'My Leave Requests'}</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">{isAdmin ? 'Review and approve staff time off.' : 'Track your time off requests.'}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <button 
                onClick={() => toast.info("Add Leave functionality coming soon")}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm hover:bg-secondary/80 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus size={16} />
                Add Leave
              </button>
            )}
            {!isAdmin && (
              <button 
                onClick={() => setIsApplyLeaveOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus size={16} />
                Apply for Leave
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-card border-b border-border">
                {isAdmin && <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee</th>}
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Leave Type</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Duration</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                {isAdmin && <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayLeaves.length > 0 ? displayLeaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-accent/50 transition-colors">
                  {isAdmin && (
                    <td className="p-4">
                      <p className="font-bold text-foreground text-sm">{leave.staff}</p>
                    </td>
                  )}
                  <td className="p-4">
                    <p className="text-sm font-bold text-foreground">{leave.type}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-foreground">{leave.startDate} to {leave.endDate}</p>
                    <p className="text-xs text-muted-foreground font-medium">{leave.days} days</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit ${
                      leave.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-500' : 
                      leave.status === 'Rejected' ? 'bg-destructive/20 text-destructive' : 
                      'bg-amber-500/20 text-amber-500'
                    }`}>
                      {leave.status === 'Approved' && <CheckCircle2 size={12} />}
                      {leave.status === 'Rejected' && <XCircle size={12} />}
                      {leave.status === 'Pending' && <Clock size={12} />}
                      {leave.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="p-4 text-right">
                      {leave.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => toast.success('Leave approved')}
                            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Approve"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button 
                            onClick={() => toast.error('Leave rejected')}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">Processed</span>
                      )}
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-muted-foreground">No leave requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isApplyLeaveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Apply for Leave</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Submit a new time off request.</p>
              </div>
              
              <form onSubmit={handleApplyLeave} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Leave Type</label>
                  <select required className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                    <option value="sick">Sick Leave</option>
                    <option value="annual">Annual Leave</option>
                    <option value="personal">Personal Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Start Date</label>
                    <input required type="date" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">End Date</label>
                    <input required type="date" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Reason</label>
                  <textarea required rows={3} placeholder="Please provide a brief reason..." className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsApplyLeaveOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingLeave}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingLeave ? <Loader2 size={20} className="animate-spin" /> : 'Submit Request'}
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

