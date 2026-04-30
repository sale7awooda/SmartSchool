'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { getPaginatedStaff, createStaff, updateUserRole } from '@/lib/supabase-db';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { useSWRConfig } from 'swr';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { EditStaffModal } from './EditStaffModal';
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

export function DirectoryTab({ onSelectStaff, onAddEmployee }: { onSelectStaff: (staff: any) => void, onAddEmployee: () => void }) {
  const { mutate } = useSWRConfig();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingStaff, setEditingStaff] = useState<any>(null);
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
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</th>
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
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold capitalize inline-flex items-center">
                      {staff.role}
                    </span>
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
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onSelectStaff(staff)}
                        className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold hover:bg-secondary/80 transition-colors"
                      >
                        View Profile
                      </button>
                      <button 
                        onClick={() => setEditingStaff(staff)}
                        className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
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

      <AnimatePresence>
        {editingStaff && (
          <EditStaffModal 
            staff={editingStaff} 
            onClose={() => setEditingStaff(null)} 
            onUpdate={() => {
              setEditingStaff(null);
              mutate(['staff', page, debouncedSearch]);
            }} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

