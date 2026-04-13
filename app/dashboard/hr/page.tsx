'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { 
  getPaginatedStaff, 
  createStaff, 
  getLeaveRequests, 
  createLeaveRequest, 
  updateLeaveRequestStatus,
  getPayslips, 
  createPayslip,
  getFinancials, 
  createFinancial 
} from '@/lib/supabase-db';
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

export default function HRPage() {
  const { user } = useAuth();
  const { can, isAdmin: checkIsAdmin } = usePermissions();
  const { mutate } = useSWRConfig();
  const [activeTab, setActiveTab] = useState<'directory' | 'leave' | 'payroll' | 'financials'>('directory');
  const [selectedStaff, setSelectedStaff] = useState<typeof MOCK_STAFF[0] | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'qualifications' | 'schedule' | 'leave' | 'payroll' | 'financials'>('overview');

  // Modal States
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);

  if (!user) return null;

  if (!can('view', 'hr')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  const isAdmin = checkIsAdmin();

  // If not admin, default to their own profile view and hide directory tab
  if (!isAdmin && activeTab === 'directory') {
    setActiveTab('leave');
  }

  const handleCloseProfile = () => {
    setSelectedStaff(null);
    setActiveProfileTab('overview');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'principal': return 'bg-purple-500/20 text-purple-500 border-purple-500/20';
      case 'teacher': return 'bg-primary/20 text-primary border-primary/20';
      case 'superintendent': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingEmployee(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;

    try {
      await createStaff({
        name,
        email,
        role
      });
      toast.success("Employee added successfully");
      setIsAddEmployeeOpen(false);
      mutate(
        (key) => Array.isArray(key) && key[0] === 'staff',
        undefined,
        { revalidate: true }
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to add employee");
    } finally {
      setIsSubmittingEmployee(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Human Resources</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage staff directory, leave requests, payroll, and documents.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide bg-card p-1.5 rounded-2xl border border-border shadow-sm shrink-0">
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'directory' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
          >
            <Users size={18} />
            Staff Directory
          </button>
        )}
        <button 
          onClick={() => setActiveTab('leave')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'leave' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
        >
          <Calendar size={18} />
          Leave Management
        </button>
        <button 
          onClick={() => setActiveTab('payroll')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'payroll' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
        >
          <DollarSign size={18} />
          Payroll
        </button>
        <button 
          onClick={() => setActiveTab('financials')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'financials' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
        >
          <Banknote size={18} />
          Loans & Fines
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <AnimatePresence mode="wait">
          {activeTab === 'directory' && isAdmin && <DirectoryTab key="directory" onSelectStaff={setSelectedStaff} onAddEmployee={() => setIsAddEmployeeOpen(true)} />}
          {activeTab === 'leave' && <LeaveTab key="leave" isAdmin={isAdmin} userName={user.name} userId={user.id} />}
          {activeTab === 'payroll' && <PayrollTab key="payroll" isAdmin={isAdmin} userName={user.name} />}
          {activeTab === 'financials' && <FinancialsTab key="financials" isAdmin={isAdmin} userName={user.name} userId={user.id} />}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedStaff && (
          <StaffProfileModal 
            selectedStaff={selectedStaff} 
            handleCloseProfile={handleCloseProfile}
            activeProfileTab={activeProfileTab}
            setActiveProfileTab={setActiveProfileTab}
            MOCK_LEAVE_REQUESTS={MOCK_LEAVE_REQUESTS}
            MOCK_PAYSLIPS={MOCK_PAYSLIPS}
            MOCK_FINANCIALS={MOCK_FINANCIALS}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddEmployeeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Add New Employee</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Enter the details for the new staff member.</p>
              </div>
              
              <form onSubmit={handleAddEmployee} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Full Name</label>
                  <input name="name" required type="text" placeholder="John Doe" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Email Address</label>
                  <input name="email" required type="email" placeholder="john.doe@school.edu" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Role</label>
                    <select name="role" required className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                      <option value="teacher">Teacher</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Administrator</option>
                      <option value="accountant">Accountant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Department</label>
                    <select name="department" required className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                      <option value="Academics">Academics</option>
                      <option value="Administration">Administration</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsAddEmployeeOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingEmployee}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingEmployee ? <Loader2 size={20} className="animate-spin" /> : 'Add Employee'}
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

function DirectoryTab({ onSelectStaff, onAddEmployee }: { onSelectStaff: (staff: any) => void, onAddEmployee: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: staffResponse, isLoading } = useSWR(
    ['staff', page, debouncedSearch],
    ([_, p, s]) => getPaginatedStaff(p, limit, s)
  );

  const filteredStaff = staffResponse?.data || [];
  const totalPages = staffResponse?.totalPages || 1;
  const totalCount = staffResponse?.count || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50">
          <div>
            <h2 className="text-xl font-bold text-foreground">Staff Directory</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Manage employee profiles and contact information.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search staff..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-64"
              />
            </div>
            <button 
              onClick={onAddEmployee}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus size={16} />
              Add Employee
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-card border-b border-border">
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Role & Dept</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </td>
                    <td className="p-4 space-y-2">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </td>
                    <td className="p-4 text-right">
                      <Skeleton className="h-8 w-8 rounded-lg inline-block" />
                    </td>
                  </tr>
                ))
              ) : filteredStaff.length > 0 ? filteredStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-accent/50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-foreground text-sm">{staff.name}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-foreground capitalize">{staff.role}</p>
                    <p className="text-xs text-muted-foreground font-medium">{staff.department || 'General'}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Mail size={12} className="text-muted-foreground" /> {staff.email}
                      </p>
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Phone size={12} className="text-muted-foreground" /> {staff.phone || 'N/A'}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      staff.status === 'Active' || !staff.status ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                    }`}>
                      {staff.status || 'Active'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => onSelectStaff(staff)}
                      className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold hover:bg-secondary/80 transition-colors"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">No staff found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                Page <span className="text-foreground font-bold">{page}</span> of <span className="text-foreground font-bold">{totalPages}</span>
              </span>
              <span className="text-sm font-medium text-muted-foreground border-l border-border pl-4">
                Total: <span className="text-foreground font-bold">{totalCount}</span>
              </span>
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LeaveTab({ isAdmin, userName, userId }: { isAdmin: boolean, userName: string, userId: string }) {
  const { data: leaves, mutate } = useSWR('leave_requests', getLeaveRequests);
  const displayLeaves = isAdmin ? (leaves || []) : (leaves || []).filter((l: any) => l.staff === userName);
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  const handleApplyLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingLeave(true);
    const formData = new FormData(e.currentTarget);
    const leaveData = {
      type: formData.get('type'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      reason: formData.get('reason'),
      staff_id: userId
    };
    
    try {
      await createLeaveRequest(leaveData);
      toast.success("Leave request submitted successfully");
      setIsApplyLeaveOpen(false);
      mutate();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit leave request");
    } finally {
      setIsSubmittingLeave(false);
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
              {displayLeaves.length > 0 ? displayLeaves.map((leave: any) => (
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
                    <p className="text-sm font-medium text-foreground">{leave.start_date} to {leave.end_date}</p>
                    <p className="text-xs text-muted-foreground font-medium">{(new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24) + 1} days</p>
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
                            onClick={async () => {
                              await updateLeaveRequestStatus(leave.id, 'Approved');
                              mutate();
                            }}
                            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Approve"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button 
                            onClick={async () => {
                              await updateLeaveRequestStatus(leave.id, 'Rejected');
                              mutate();
                            }}
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
                  <select name="type" required className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                    <option value="Sick">Sick Leave</option>
                    <option value="Annual">Annual Leave</option>
                    <option value="Personal">Personal Leave</option>
                    <option value="Unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Start Date</label>
                    <input name="start_date" required type="date" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">End Date</label>
                    <input name="end_date" required type="date" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" />
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

function PayrollTab({ isAdmin, userName }: { isAdmin: boolean, userName: string }) {
  const { data: payslips, mutate } = useSWR('payslips', getPayslips);
  const { data: staff } = useSWR('staff', () => getPaginatedStaff(1, 100));
  const displayPayslips = isAdmin ? (payslips || []) : (payslips || []).filter((p: any) => p.staff === userName);
  const [isRunPayrollOpen, setIsRunPayrollOpen] = useState(false);
  const [isRunningPayroll, setIsRunningPayroll] = useState(false);

  const handleRunPayroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsRunningPayroll(true);
    const formData = new FormData(e.currentTarget);
    const month = formData.get('month');
    
    try {
      if (staff && staff.data) {
        for (const employee of staff.data) {
          await createPayslip({
            staff_id: employee.id,
            month: month,
            amount: 5000,
            status: 'Processed',
            date: new Date().toISOString().split('T')[0]
          });
        }
      }
      toast.success("Payroll processed successfully");
      setIsRunPayrollOpen(false);
      mutate();
    } catch (error: any) {
      toast.error(error.message || "Failed to process payroll");
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
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-500">
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
                  <span className="font-black text-primary text-4xl">$145,200</span>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Pay Period</label>
                  <select name="month" required className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                    <option value="October 2023">October 2023</option>
                    <option value="November 2023">November 2023</option>
                    <option value="December 2023">December 2023</option>
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

function FinancialsTab({ isAdmin, userName, userId }: { isAdmin: boolean, userName: string, userId: string }) {
  const { data: financials, mutate } = useSWR('financials', getFinancials);
  const displayFinancials = isAdmin ? (financials || []) : (financials || []).filter((f: any) => f.staff === userName);
  const [isApplyLoanOpen, setIsApplyLoanOpen] = useState(false);
  const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);
  const [isAddFineBonusOpen, setIsAddFineBonusOpen] = useState(false);
  const [isSubmittingFineBonus, setIsSubmittingFineBonus] = useState(false);

  const handleApplyLoan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingLoan(true);
    const formData = new FormData(e.currentTarget);
    const financialData = {
      type: 'Loan',
      amount: formData.get('amount'),
      description: formData.get('description'),
      date: new Date().toISOString().split('T')[0],
      staff_id: userId
    };
    
    try {
      await createFinancial(financialData);
      toast.success("Loan application submitted successfully");
      setIsApplyLoanOpen(false);
      mutate();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit loan application");
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  const handleAddFineBonus = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingFineBonus(true);
    const formData = new FormData(e.currentTarget);
    const financialData = {
      type: formData.get('type'),
      amount: formData.get('amount'),
      description: formData.get('description'),
      date: new Date().toISOString().split('T')[0],
      staff_id: formData.get('staff_id'),
      status: 'Approved'
    };
    
    try {
      await createFinancial(financialData);
      toast.success("Fine/Bonus added successfully");
      setIsAddFineBonusOpen(false);
      mutate();
    } catch (error: any) {
      toast.error(error.message || "Failed to add fine/bonus");
    } finally {
      setIsSubmittingFineBonus(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50">
          <div>
            <h2 className="text-xl font-bold text-foreground">{isAdmin ? 'Loans, Bonuses & Fines' : 'My Loans & Fines'}</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">{isAdmin ? 'Manage staff financial additions and deductions.' : 'Track your bonuses, loans, and fines.'}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <button 
                onClick={() => setIsAddFineBonusOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm hover:bg-secondary/80 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus size={16} />
                Add Fine/Bonus
              </button>
            )}
            {!isAdmin && (
              <button 
                onClick={() => setIsApplyLoanOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus size={16} />
                Apply for Loan
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-card border-b border-border">
                {isAdmin && <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee</th>}
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayFinancials.length > 0 ? displayFinancials.map((item: any) => (
                <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                  {isAdmin && (
                    <td className="p-4">
                      <p className="font-bold text-foreground text-sm">{item.staff}</p>
                    </td>
                  )}
                  <td className="p-4">
                    <p className="text-sm font-bold text-foreground">{item.type}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </td>
                  <td className="p-4">
                    <p className={`text-sm font-black ${item.type === 'Fine' ? 'text-destructive' : 'text-emerald-500'}`}>
                      {item.type === 'Fine' ? '-' : '+'}{item.amount}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-foreground">{item.date}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      item.status === 'Approved' || item.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-500' : 
                      item.status === 'Active' ? 'bg-primary/20 text-primary' : 
                      'bg-amber-500/20 text-amber-500'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-muted-foreground">No financial records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isApplyLoanOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Apply for Loan / Advance</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Submit a request for a salary advance or loan.</p>
              </div>
              
              <form onSubmit={handleApplyLoan} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Amount Requested ($)</label>
                  <input name="amount" required type="number" min="1" step="0.01" placeholder="0.00" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Reason</label>
                  <textarea name="description" required rows={3} placeholder="Please provide a brief reason..." className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsApplyLoanOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingLoan}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingLoan ? <Loader2 size={20} className="animate-spin" /> : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddFineBonusOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Add Fine/Bonus</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Add a financial record for a staff member.</p>
              </div>
              
              <form onSubmit={handleAddFineBonus} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Staff ID</label>
                  <input name="staff_id" required type="text" placeholder="Staff UUID" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Type</label>
                  <select name="type" required className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                    <option value="Bonus">Bonus</option>
                    <option value="Fine">Fine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Amount ($)</label>
                  <input name="amount" required type="number" min="1" step="0.01" placeholder="0.00" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Description</label>
                  <textarea name="description" required rows={3} placeholder="Description..." className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsAddFineBonusOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingFineBonus}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingFineBonus ? <Loader2 size={20} className="animate-spin" /> : 'Add Record'}
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

function DocumentsTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-primary rounded-[2rem] shadow-sm p-6 sm:p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <FileText size={100} />
          </div>
          <h2 className="text-xl font-bold mb-2 relative z-10">Employee Handbook</h2>
          <p className="text-primary-foreground/80 text-sm font-medium mb-6 relative z-10">Updated for 2023-2024 academic year. Contains all policies and guidelines.</p>
          <button className="w-full py-3 bg-background text-primary rounded-xl font-bold text-sm hover:bg-accent transition-colors relative z-10 flex items-center justify-center gap-2">
            <Download size={16} />
            Download PDF
          </button>
        </div>

        <div className="bg-card rounded-[2rem] border border-border shadow-sm p-6 sm:p-8 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-4">
            <FileText size={24} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Benefits Guide</h2>
          <p className="text-muted-foreground text-sm font-medium mb-6">Health, dental, and retirement plan information for full-time staff.</p>
          <button className="w-full py-3 bg-muted text-foreground rounded-xl font-bold text-sm hover:bg-accent transition-colors flex items-center justify-center gap-2">
            <Download size={16} />
            Download PDF
          </button>
        </div>

        <div className="bg-card rounded-[2rem] border border-border shadow-sm p-6 sm:p-8 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center mb-4">
            <FileText size={24} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Tax Forms (W-4)</h2>
          <p className="text-muted-foreground text-sm font-medium mb-6">Standard tax withholding forms for the current fiscal year.</p>
          <button className="w-full py-3 bg-muted text-foreground rounded-xl font-bold text-sm hover:bg-accent transition-colors flex items-center justify-center gap-2">
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </div>
    </motion.div>
  );
}
