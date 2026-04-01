'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { 
  getPaginatedVisitors, 
  createVisitor, 
  getPaginatedMedicalRecords, 
  createMedicalRecord, 
  getPaginatedInventory, 
  createInventoryItem 
} from '@/lib/supabase-db';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  UserCheck, 
  HeartPulse, 
  Package, 
  Plus, 
  Search, 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  AlertTriangle, 
  Activity, 
  Wrench, 
  Laptop, 
  MonitorPlay,
  Download,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// Mock Data
const MOCK_LEAVE_REQUESTS = [
  { id: 'L1', type: 'Sick Leave', startDate: '2023-11-10', endDate: '2023-11-11', status: 'Approved', days: 2 },
  { id: 'L2', type: 'Annual Leave', startDate: '2023-12-20', endDate: '2023-12-31', status: 'Pending', days: 8 },
];

const MOCK_PAYSLIPS = [
  { id: 'P1', month: 'October 2023', amount: '$4,200.00', status: 'Paid', date: '2023-10-28' },
  { id: 'P2', month: 'September 2023', amount: '$4,200.00', status: 'Paid', date: '2023-09-28' },
];

const MOCK_VISITORS = [
  { id: 'V1', name: 'John Doe', purpose: 'Parent-Teacher Meeting', host: 'Edna Krabappel', timeIn: '09:15 AM', timeOut: null, status: 'Active', badgeId: 'B-1042' },
  { id: 'V2', name: 'Sarah Smith', purpose: 'Maintenance', host: 'Groundskeeper Willie', timeIn: '08:30 AM', timeOut: '10:45 AM', status: 'Completed', badgeId: 'B-1041' },
];

const MOCK_MEDICAL_RECORDS = [
  { id: 'M1', studentName: 'Bart Simpson', grade: 'Grade 4', allergies: ['Shrimp', 'Butterscotch'], conditions: ['ADHD'], bloodGroup: 'O-', lastVisit: '2023-10-15 (Headache)' },
  { id: 'M2', studentName: 'Lisa Simpson', grade: 'Grade 2', allergies: ['None'], conditions: ['Asthma'], bloodGroup: 'A+', lastVisit: '2023-09-02 (Routine Check)' },
];

const MOCK_INVENTORY = [
  { id: 'INV-001', name: 'Dell Latitude 3420', category: 'Laptop', assignedTo: 'Edna Krabappel', status: 'In Use', nextMaintenance: '2024-01-15' },
  { id: 'INV-002', name: 'Epson Projector X100', category: 'Projector', assignedTo: 'Room 101', status: 'Maintenance', nextMaintenance: '2023-11-05' },
  { id: 'INV-003', name: 'Basketball Set (10)', category: 'Sports', assignedTo: 'Gym', status: 'Available', nextMaintenance: '2024-05-20' },
];

// Simulated API functions for Operations
const fetchPaginatedVisitors = async (page: number, limit: number, search: string) => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  let filtered = MOCK_VISITORS;
  if (search) {
    filtered = filtered.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.host.toLowerCase().includes(search.toLowerCase()));
  }
  const from = (page - 1) * limit;
  const to = from + limit;
  return {
    data: filtered.slice(from, to),
    count: filtered.length,
    totalPages: Math.ceil(filtered.length / limit)
  };
};

const fetchPaginatedMedicalRecords = async (page: number, limit: number, search: string) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  let filtered = MOCK_MEDICAL_RECORDS;
  if (search) {
    filtered = filtered.filter(m => m.studentName.toLowerCase().includes(search.toLowerCase()));
  }
  const from = (page - 1) * limit;
  const to = from + limit;
  return {
    data: filtered.slice(from, to),
    count: filtered.length,
    totalPages: Math.ceil(filtered.length / limit)
  };
};

const fetchPaginatedInventory = async (page: number, limit: number, search: string) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  let filtered = MOCK_INVENTORY;
  if (search) {
    filtered = filtered.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));
  }
  const from = (page - 1) * limit;
  const to = from + limit;
  return {
    data: filtered.slice(from, to),
    count: filtered.length,
    totalPages: Math.ceil(filtered.length / limit)
  };
};

export default function OperationsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<'visitors' | 'health' | 'inventory'>('visitors');

  if (!user) return null;

  if (!can('view', 'operations')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Operations</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage visitors, health records, and inventory.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide bg-card p-1.5 rounded-2xl border border-border shadow-sm shrink-0">
        <button 
          onClick={() => setActiveTab('visitors')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'visitors' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
          <UserCheck size={18} />
          Visitor Management
        </button>
        <button 
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'health' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
          <HeartPulse size={18} />
          Health & Medical
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
          <Package size={18} />
          Inventory & Assets
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <AnimatePresence mode="wait">
          {activeTab === 'visitors' && <VisitorsTab key="visitors" />}
          {activeTab === 'health' && <HealthTab key="health" />}
          {activeTab === 'inventory' && <InventoryTab key="inventory" />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function HRTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leave Requests */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-[2rem] border border-border shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Leave Requests</h2>
                <p className="text-sm font-medium text-muted-foreground mt-1">Manage your time off</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm">
                <Plus size={16} />
                Request Leave
              </button>
            </div>
            
            <div className="space-y-4">
              {MOCK_LEAVE_REQUESTS.map((leave: any) => (
                <div key={leave.id} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${leave.status === 'Approved' ? 'bg-emerald-500/100/20 text-emerald-500' : 'bg-amber-100 text-amber-500'}`}>
                      {leave.status === 'Approved' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{leave.type}</h3>
                      <p className="text-xs font-medium text-muted-foreground">{leave.startDate} to {leave.endDate} ({leave.days} days)</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${leave.status === 'Approved' ? 'bg-emerald-500/100/20 text-emerald-500' : 'bg-amber-100 text-amber-500'}`}>
                    {leave.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payroll & Documents */}
        <div className="space-y-6">
          <div className="bg-card rounded-[2rem] border border-border shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-foreground mb-6">Recent Payslips</h2>
            <div className="space-y-3">
              {MOCK_PAYSLIPS.map((slip: any) => (
                <div key={slip.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/20 hover:bg-primary/10/30 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted text-muted-foreground rounded-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{slip.month}</p>
                      <p className="text-xs font-medium text-muted-foreground">{slip.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{slip.amount}</p>
                    <Download size={14} className="inline-block text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary rounded-[2rem] shadow-sm p-6 sm:p-8 text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Briefcase size={100} />
            </div>
            <h2 className="text-xl font-bold mb-2 relative z-10">HR Documents</h2>
            <p className="text-indigo-100 text-sm font-medium mb-6 relative z-10">Access employee handbook, policies, and tax forms.</p>
            <button className="w-full py-3 bg-card text-primary rounded-xl font-bold text-sm hover:bg-primary/10 transition-colors relative z-10">
              Browse Documents
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VisitorsTab() {
  const { can } = usePermissions();
  const [isNewCheckInOpen, setIsNewCheckInOpen] = useState(false);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
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

  const { data: response, isLoading, mutate } = useSWR(
    ['visitors', page, debouncedSearch],
    ([_, p, s]) => getPaginatedVisitors(p, limit, s)
  );

  const visitors = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const totalCount = response?.count || 0;

  const handleNewCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const visitorData = {
      name: formData.get('name'),
      purpose: formData.get('purpose'),
      host: formData.get('host'),
      status: 'Active',
      time_in: new Date().toLocaleTimeString(),
    };

    setIsSubmittingCheckIn(true);
    try {
      await createVisitor(visitorData);
      toast.success("Visitor checked in successfully");
      setIsNewCheckInOpen(false);
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("Failed to check in visitor");
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50">
          <div>
            <h2 className="text-xl font-bold text-foreground">Visitor Management</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Track campus visitors and print badges</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search visitors..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-64"
              />
            </div>
            {can('create', 'operations') && (
              <button 
                onClick={() => setIsNewCheckInOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus size={16} />
                New Check-in
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-card border-b border-border">
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Visitor</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Purpose & Host</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Time</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </td>
                    <td className="p-4 text-right">
                      <Skeleton className="h-8 w-8 rounded-lg inline-block" />
                    </td>
                  </tr>
                ))
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground font-medium">No visitors found.</td>
                </tr>
              ) : visitors.map((visitor: any) => (
                <tr key={visitor.id} className="hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">
                        {visitor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{visitor.name}</p>
                        <p className="text-xs text-muted-foreground font-medium">Badge: {visitor.badgeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-foreground">{visitor.purpose}</p>
                    <p className="text-xs text-muted-foreground font-medium">Host: {visitor.host}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-foreground">In: {visitor.timeIn}</p>
                    {visitor.timeOut && <p className="text-xs text-muted-foreground font-medium">Out: {visitor.timeOut}</p>}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${visitor.status === 'Active' ? 'bg-emerald-500/100/20 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                      {visitor.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {visitor.status === 'Active' && can('manage', 'operations') && (
                        <>
                          <button 
                            onClick={() => toast.success('Badge sent to printer')}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                            title="Print Badge"
                          >
                            <Printer size={18} />
                          </button>
                          <button 
                            onClick={() => toast.success('Visitor checked out')}
                            className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                          >
                            Check Out
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 shrink-0">
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
        {isNewCheckInOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">New Visitor Check-in</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Register a new visitor on campus.</p>
              </div>
              
              <form onSubmit={handleNewCheckIn} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Visitor Name</label>
                  <input required name="name" type="text" placeholder="Jane Doe" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Purpose of Visit</label>
                  <input required name="purpose" type="text" placeholder="e.g., Parent-Teacher Meeting" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Host (Staff Member)</label>
                  <input required name="host" type="text" placeholder="e.g., Edna Krabappel" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsNewCheckInOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingCheckIn}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingCheckIn ? <Loader2 size={20} className="animate-spin" /> : 'Check In & Print Badge'}
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

function HealthTab() {
  const { can } = usePermissions();
  const [isLogIncidentOpen, setIsLogIncidentOpen] = useState(false);
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
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

  const { data: response, isLoading, mutate } = useSWR(
    ['health', page, debouncedSearch],
    ([_, p, s]) => getPaginatedMedicalRecords(p, limit, s)
  );

  const records = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const totalCount = response?.count || 0;

  const handleLogIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const recordData = {
      student_name: formData.get('student_name'),
      symptoms: formData.get('symptoms'),
      treatment: formData.get('treatment'),
    };

    setIsSubmittingIncident(true);
    try {
      await createMedicalRecord(recordData);
      toast.success("Medical incident logged successfully");
      setIsLogIncidentOpen(false);
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("Failed to log medical incident");
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-destructive/10 rounded-2xl p-6 border border-destructive/20 flex items-center gap-4">
          <div className="w-12 h-12 bg-destructive/20 text-destructive rounded-xl flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Clinic Visits Today</p>
            <p className="text-2xl font-black text-destructive">12</p>
          </div>
        </div>
        <div className="bg-amber-500/100/10 rounded-2xl p-6 border border-amber-500/20 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-xl flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">Active Allergies</p>
            <p className="text-2xl font-black text-amber-500">45</p>
          </div>
        </div>
        <div className="bg-emerald-500/100/10 rounded-2xl p-6 border border-emerald-500/20 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/100/20 text-emerald-500 rounded-xl flex items-center justify-center">
            <HeartPulse size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-900">Immunizations Up to Date</p>
            <p className="text-2xl font-black text-emerald-500">98%</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50">
          <div>
            <h2 className="text-xl font-bold text-foreground">Student Medical Records</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Confidential health information</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search student..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-64"
              />
            </div>
            {can('create', 'operations') && (
              <button 
                onClick={() => setIsLogIncidentOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-destructive text-primary-foreground rounded-xl font-bold text-sm hover:bg-destructive/90 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus size={16} />
                Log Incident
              </button>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-2xl border border-border bg-card shadow-sm animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-4">
                  <div>
                    <Skeleton className="h-3 w-16 mb-2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16 rounded-md" />
                      <Skeleton className="h-6 w-20 rounded-md" />
                    </div>
                  </div>
                  <div>
                    <Skeleton className="h-3 w-20 mb-2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-24 rounded-md" />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </div>
            ))
          ) : records.length === 0 ? (
            <div className="col-span-1 md:col-span-2 p-12 text-center text-muted-foreground font-medium">No records found.</div>
          ) : records.map((record: any) => (
            <div key={record.id} className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground">{record.studentName}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{record.grade} • Blood: <span className="text-destructive font-bold">{record.bloodGroup}</span></p>
                </div>
                <button className="text-primary text-sm font-bold hover:underline">View Full Profile</button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Allergies</p>
                  <div className="flex flex-wrap gap-2">
                    {record.allergies.map((allergy: string) => (
                      <span key={allergy} className={`px-2 py-1 rounded-md text-xs font-bold ${allergy === 'None' ? 'bg-muted text-muted-foreground' : 'bg-destructive/20 text-destructive'}`}>
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Conditions</p>
                  <div className="flex flex-wrap gap-2">
                    {record.conditions.map((condition: string) => (
                      <span key={condition} className="px-2 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-500">
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground">Last Clinic Visit: <span className="font-bold text-foreground">{record.lastVisit}</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 shrink-0">
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
        {isLogIncidentOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-destructive/10 shrink-0">
                <h2 className="text-2xl font-bold text-destructive tracking-tight">Log Medical Incident</h2>
                <p className="text-sm font-medium text-destructive/80 mt-2">Record a student clinic visit or incident.</p>
              </div>
              
              <form onSubmit={handleLogIncident} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Student Name</label>
                  <input required name="student_name" type="text" placeholder="e.g., Bart Simpson" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Incident / Symptoms</label>
                  <textarea required name="symptoms" rows={3} placeholder="Describe the reason for the visit..." className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Treatment Provided</label>
                  <textarea required name="treatment" rows={2} placeholder="e.g., Bandage applied, rested for 15 mins" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsLogIncidentOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingIncident}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-destructive hover:bg-destructive/90 transition-all active:scale-[0.98] shadow-md shadow-destructive/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingIncident ? <Loader2 size={20} className="animate-spin" /> : 'Save Record'}
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

function InventoryTab() {
  const { can } = usePermissions();
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isSubmittingAsset, setIsSubmittingAsset] = useState(false);
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

  const { data: response, isLoading, mutate } = useSWR(
    ['inventory', page, debouncedSearch],
    ([_, p, s]) => getPaginatedInventory(p, limit, s)
  );

  const inventory = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const totalCount = response?.count || 0;

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const assetData = {
      name: formData.get('name'),
      category: formData.get('category'),
      status: 'Available',
    };

    setIsSubmittingAsset(true);
    try {
      await createInventoryItem(assetData);
      toast.success("Asset added successfully");
      setIsAddAssetOpen(false);
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add asset");
    } finally {
      setIsSubmittingAsset(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50">
          <div>
            <h2 className="text-xl font-bold text-foreground">Asset Management</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Track equipment and maintenance schedules</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search assets..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-64"
              />
            </div>
            {can('create', 'operations') && (
              <button 
                onClick={() => setIsAddAssetOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus size={16} />
                Add Asset
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-card border-b border-border">
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Asset Details</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Next Maintenance</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-4 text-right">
                      <Skeleton className="h-8 w-8 rounded-lg inline-block" />
                    </td>
                  </tr>
                ))
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground font-medium">No assets found.</td>
                </tr>
              ) : inventory.map((item: any) => (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                        {item.category === 'Laptop' && <Laptop size={20} />}
                        {item.category === 'Projector' && <MonitorPlay size={20} />}
                        {item.category === 'Sports' && <Activity size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground font-medium">ID: {item.id} • {item.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-foreground">{item.assignedTo}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      item.status === 'Available' ? 'bg-emerald-500/100/20 text-emerald-500' : 
                      item.status === 'In Use' ? 'bg-blue-500/20 text-blue-500' : 
                      'bg-amber-100 text-amber-500'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Calendar size={14} className="text-muted-foreground" />
                      {item.nextMaintenance}
                    </p>
                  </td>
                  <td className="p-4 text-right">
                    {can('manage', 'operations') && (
                      <button 
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                        title="Schedule Maintenance"
                      >
                        <Wrench size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 shrink-0">
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
        {isAddAssetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Add New Asset</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">Register a new item in the school inventory.</p>
              </div>
              
              <form onSubmit={handleAddAsset} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Asset Name</label>
                  <input required name="name" type="text" placeholder="e.g., Dell Latitude 3420" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Category</label>
                    <select required name="category" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                      <option value="Laptop">Laptop</option>
                      <option value="Projector">Projector</option>
                      <option value="Sports">Sports Equipment</option>
                      <option value="Furniture">Furniture</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Assigned To</label>
                    <input required name="assigned_to" type="text" placeholder="e.g., Room 101" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Next Maintenance Date</label>
                  <input type="date" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsAddAssetOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingAsset}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingAsset ? <Loader2 size={20} className="animate-spin" /> : 'Add Asset'}
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
