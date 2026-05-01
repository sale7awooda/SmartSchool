'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { getLeaveRequests, createLeaveRequest, updateLeaveRequestStatus } from '@/lib/api/hr';
import { getPaginatedStaff } from '@/lib/supabase-db';
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus,
  Loader2,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

export function LeaveTab({ isAdmin, userName }: { isAdmin: boolean, userName: string }) {
  const { data: leaves, mutate } = useSWR('leave_requests', getLeaveRequests);

  const displayLeaves = (leaves || []).filter((l: any) => isAdmin || l.staffName === userName);
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Staff search state
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [isStaffSearchOpen, setIsStaffSearchOpen] = useState(false);

  const { data: staffData } = useSWR(
    staffSearchQuery.length >= 2 ? ['staff_search', staffSearchQuery] : null,
    () => getPaginatedStaff(1, 10, staffSearchQuery)
  );

  const foundStaff = staffData?.data || [];

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let targetStaffId = selectedStaffId;
    if (!isAdmin) {
      // Find own staff ID
      const { data: userRec } = await supabase.from('users').select('id').eq('name', userName).single();
      if (userRec) targetStaffId = userRec.id;
    }

    if (!targetStaffId) {
       toast.error("Please select a staff member");
       return;
    }

    setIsSubmittingLeave(true);
    const form = e.target as HTMLFormElement;
    
    try {
      await createLeaveRequest({
        staff_id: targetStaffId,
        type: form.leaveType.value,
        start_date: form.startDate.value,
        end_date: form.endDate.value,
        reason: form.reason.value,
        status: 'Pending'
      });
      toast.success("Leave request submitted successfully");
      setIsApplyLeaveOpen(false);
      setStaffSearchQuery('');
      setSelectedStaffId('');
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit leave request');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateLeaveRequestStatus(id, status);
      toast.success(`Leave ${status.toLowerCase()}`);
      mutate();
    } catch (err: any) {
      toast.error('Failed to update leave status');
    }
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
                onClick={() => setIsApplyLeaveOpen(true)}
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
                      <p className="font-bold text-foreground text-sm">{leave.staffName || leave.staff_id}</p>
                    </td>
                  )}
                  <td className="p-4">
                    <p className="text-sm font-bold text-foreground">{leave.type}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-foreground">{leave.start_date || leave.startDate} to {leave.end_date || leave.endDate}</p>
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
                            onClick={() => handleUpdateStatus(leave.id, 'Approved')}
                            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Approve"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(leave.id, 'Rejected')}
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
                {isAdmin && (
                  <div className="relative">
                    <label className="block text-sm font-bold text-foreground mb-2">Staff Name</label>
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Search staff by name..." 
                        value={staffSearchQuery}
                        onChange={(e) => {
                          setStaffSearchQuery(e.target.value);
                          setSelectedStaffId('');
                          setIsStaffSearchOpen(true);
                        }}
                        onFocus={() => setIsStaffSearchOpen(true)}
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
                      />
                    </div>
                    {isStaffSearchOpen && staffSearchQuery.length >= 2 && foundStaff.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                        {foundStaff.map((s: any) => (
                          <div
                            key={s.id}
                            className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3 cursor-pointer"
                            onClick={() => {
                              setStaffSearchQuery(s.name);
                              setSelectedStaffId(s.id);
                              setIsStaffSearchOpen(false);
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">{s.name.charAt(0)}</div>
                            <div>
                              <span className="font-bold text-sm block">{s.name}</span>
                              <span className="text-xs text-muted-foreground capitalize">{s.role}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {isStaffSearchOpen && staffSearchQuery.length >= 2 && foundStaff.length === 0 && (
                       <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-xl p-4 text-center text-sm text-muted-foreground">
                          No staff found.
                       </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Leave Type</label>
                  <select name="leaveType" required className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                    <option value="sick">Sick Leave</option>
                    <option value="annual">Annual Leave</option>
                    <option value="personal">Personal Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Start Date</label>
                    <input name="startDate" required type="date" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">End Date</label>
                    <input name="endDate" required type="date" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Reason</label>
                  <textarea name="reason" required rows={3} placeholder="Please provide a brief reason..." className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none" />
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

