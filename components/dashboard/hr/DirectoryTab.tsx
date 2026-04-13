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

export function DirectoryTab({ onSelectStaff, onAddEmployee }: { onSelectStaff: (staff: any) => void, onAddEmployee: () => void }) {
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

