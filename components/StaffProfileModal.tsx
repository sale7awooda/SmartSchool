'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';
import { 
  Mail, Phone, Building2, Briefcase, Calendar, Award, Clock, ChevronRight, X
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '@/lib/language-context';

export default function StaffProfileModal({ 
  selectedStaff, 
  handleCloseProfile, 
  activeProfileTab, 
  setActiveProfileTab, 
  MOCK_LEAVE_REQUESTS, 
  MOCK_PAYSLIPS, 
  MOCK_FINANCIALS 
}: any) {
  const { t, isRTL } = useLanguage();

  // 1. Fetch real leaves
  const { data: realLeaveRequests, isLoading: isLoadingLeaves } = useSWR(
    selectedStaff ? ['staff-profile-leaves', selectedStaff.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', selectedStaff.id);
      
      if (error || !data) return [];
      return data.map((r: any) => {
        let extractedType = 'Leave';
        let cleanReason = r.reason || '';
        if (cleanReason.startsWith('[')) {
          const closingIdx = cleanReason.indexOf(']');
          if (closingIdx > 0) {
            extractedType = cleanReason.substring(1, closingIdx);
            cleanReason = cleanReason.substring(closingIdx + 1).trim();
          }
        }
        let days = 1;
        try {
          const start = new Date(r.start_date);
          const end = new Date(r.end_date);
          const diff = Math.abs(end.getTime() - start.getTime());
          days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
        } catch (e) {}
        return {
          id: r.id,
          type: extractedType,
          startDate: r.start_date,
          endDate: r.end_date,
          status: r.status,
          days,
          staff: selectedStaff.name
        };
      });
    }
  );

  // 2. Fetch real payslips
  const { data: realPayslips, isLoading: isLoadingPayslips } = useSWR(
    selectedStaff ? ['staff-profile-payslips', selectedStaff.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .eq('staff_id', selectedStaff.id)
        .order('date', { ascending: false });
      
      if (error || !data) return [];
      return data.map((r: any) => ({
        id: r.id,
        month: r.month,
        amount: `$${Number(r.amount).toLocaleString()}`,
        status: r.status,
        date: r.date,
        staff: selectedStaff.name
      }));
    }
  );

  // 3. Fetch real financials
  const { data: realFinancials, isLoading: isLoadingFinancials } = useSWR(
    selectedStaff ? ['staff-profile-financials', selectedStaff.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('financials')
        .select('*')
        .or(`description.ilike.%${selectedStaff.name}%,category.ilike.%${selectedStaff.name}%`)
        .order('date', { ascending: false });
      
      if (error || !data) return [];
      return data
        .filter((r: any) => !(r.description || '').toLowerCase().includes('salary for'))
        .map((r: any) => ({
          id: r.id,
          type: r.type === 'Income' ? 'Bonus' : 'Expense',
          description: r.description,
          date: r.date,
          amount: `${Number(r.amount).toLocaleString()}`,
          status: r.status === 'Paid' ? 'Approved' : r.status,
          staff: selectedStaff.name
        }));
    }
  );

  const leavesToRender = realLeaveRequests || [];
  const payslipsToRender = realPayslips || [];
  const financialsToRender = realFinancials || [];

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'principal': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'teacher': return 'bg-primary/10 text-primary border-primary/20';
      case 'superintendent': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  // Adjust active tab if it was set to schedule originally
  const safeActiveTab = activeProfileTab === 'schedule' ? 'overview' : activeProfileTab;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-card rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-border max-h-[90vh] flex flex-col transition-colors"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-border flex items-center gap-5 relative bg-muted/50 shrink-0">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center font-bold text-3xl shrink-0 shadow-inner bg-primary/10 text-primary border border-primary/20">
            {selectedStaff.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">{selectedStaff.name}</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">{selectedStaff.role ? selectedStaff.role.charAt(0).toUpperCase() + selectedStaff.role.slice(1) : 'Staff'}</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">{selectedStaff.email}</p>
          </div>
          <button 
            onClick={handleCloseProfile}
            className={`absolute top-6 p-2 bg-card rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors ${isRTL ? 'left-6' : 'right-6'}`}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-border px-6 sm:px-8 overflow-x-auto scrollbar-hide shrink-0">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'leave', label: 'Leave History' },
            { id: 'payroll', label: 'Payroll' },
            { id: 'financials', label: 'Loans & Fines' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveProfileTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                safeActiveTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
          {/* Overview Tab */}
          {safeActiveTab === 'overview' && (() => {
            let extraInfoObj: any = {};
            try {
              if (selectedStaff.extra_info) {
                extraInfoObj = JSON.parse(selectedStaff.extra_info);
              }
            } catch (e) {}
            
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: Briefcase, label: 'Role', value: selectedStaff.role ? selectedStaff.role.charAt(0).toUpperCase() + selectedStaff.role.slice(1) : 'N/A' },
                    { icon: Building2, label: 'Designation', value: selectedStaff.designation || 'N/A' },
                    { icon: Mail, label: 'Email Address', value: selectedStaff.email },
                    { icon: Phone, label: 'Phone Number', value: selectedStaff.phone || 'N/A' },
                    { icon: Calendar, label: 'Joined Date', value: selectedStaff.date_of_join || (selectedStaff.created_at ? new Date(selectedStaff.created_at).toLocaleDateString() : 'N/A') },
                    { icon: Calendar, label: 'Date of Birth', value: selectedStaff.dob || 'N/A' },
                    { icon: Award, label: 'Gender', value: selectedStaff.gender || 'N/A' },
                    { icon: Award, label: 'Salary', value: selectedStaff.salary ? `$${selectedStaff.salary}` : 'N/A' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                      <div className="p-3 bg-muted rounded-xl text-muted-foreground"><item.icon size={20} /></div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-bold text-foreground mt-0.5 break-all truncate">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: 'Bank Account Number', value: extraInfoObj.account_number || 'N/A' },
                    { label: 'Qualifications / Certificate', value: selectedStaff.education || 'N/A' },
                    { label: 'Address', value: selectedStaff.address || 'N/A' },
                    { label: 'Other Information', value: extraInfoObj.other_info || 'N/A' }
                  ].map((item, i) => (
                    <div key={`extra-${i}`} className="p-4 rounded-2xl bg-card border border-border shadow-sm">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Leave Tab */}
          {safeActiveTab === 'leave' && (
            <div className="space-y-4">
              <h3 className="font-bold text-foreground mb-4">Recent Leave Requests</h3>
              {leavesToRender.length > 0 ? (
                leavesToRender.map((leave: any) => (
                  <div key={leave.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">{leave.type}</p>
                      <p className="text-sm text-muted-foreground">{leave.startDate} to {leave.endDate} ({leave.days} days)</p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : 
                      leave.status === 'Rejected' ? 'bg-destructive/10 text-destructive' : 
                      'bg-amber-500/10 text-amber-500'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No leave requests found.</p>
              )}
            </div>
          )}

          {/* Payroll Tab */}
          {safeActiveTab === 'payroll' && (
            <div className="space-y-4">
              <h3 className="font-bold text-foreground mb-4">Recent Payslips</h3>
              {payslipsToRender.length > 0 ? (
                payslipsToRender.map((slip: any) => (
                  <div key={slip.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">{slip.month}</p>
                      <p className="text-sm text-muted-foreground">Processed: {slip.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-foreground">{slip.amount}</p>
                      <span className="text-xs font-bold text-emerald-500">{slip.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No payroll records found.</p>
              )}
            </div>
          )}

          {/* Financials Tab */}
          {safeActiveTab === 'financials' && (
            <div className="space-y-4">
              <h3 className="font-bold text-foreground mb-4">Loans, Bonuses & Fines</h3>
              {financialsToRender.length > 0 ? (
                financialsToRender.map((item: any) => (
                  <div key={item.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">{item.type}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-black ${item.type === 'Fine' ? 'text-destructive' : 'text-emerald-500'}`}>
                        {item.type === 'Fine' ? '-' : '+'}{item.amount}
                      </p>
                      <span className={`text-xs font-bold ${
                        item.status === 'Approved' || item.status === 'Paid' ? 'text-emerald-500' : 
                        item.status === 'Active' ? 'text-primary' : 
                        'text-amber-500'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No financial records found.</p>
              )}
            </div>
          )}
        </div> 

        <div className="p-6 border-t border-border bg-muted/50 shrink-0">
          <button 
            onClick={handleCloseProfile}
            className="w-full px-4 py-3.5 rounded-xl font-bold text-foreground bg-card border border-border hover:bg-muted transition-all active:scale-[0.98] shadow-sm text-sm"
          >
            {t('close_profile') || 'Close Profile'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
