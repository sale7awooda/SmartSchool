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

export function DocumentsTab() {
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
