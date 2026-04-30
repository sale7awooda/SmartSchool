import { supabase } from '@/lib/supabase/client';

export async function getLeaveRequests() {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, staff:users(name)')
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return []; // Table doesn't exist yet
    throw error;
  }
  return data.map((l: any) => ({ ...l, staffName: l.staff?.name }));
}

export async function createLeaveRequest(leaveData: any) {
  const { data, error } = await supabase.from('leave_requests').insert(leaveData).select().single();
  if (error) throw error;
  return data;
}

export async function updateLeaveRequestStatus(id: string, status: string) {
  const { data, error } = await supabase.from('leave_requests').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getPayslips() {
  const { data, error } = await supabase
    .from('payslips')
    .select('*, staff:users(name)')
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return [];
    throw error;
  }
  return data.map((p: any) => ({ ...p, staffName: p.staff?.name }));
}

export async function createPayslip(payslipData: any) {
  const { data, error } = await supabase.from('payslips').insert(payslipData).select().single();
  if (error) throw error;
  return data;
}

export async function getFinancials() {
  const { data, error } = await supabase
    .from('financials')
    .select('*, staff:users(name)')
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return [];
    throw error;
  }
  return data.map((f: any) => ({ ...f, staffName: f.staff?.name }));
}

export async function createFinancial(financialData: any) {
  const { data, error } = await supabase.from('financials').insert(financialData).select().single();
  if (error) throw error;
  return data;
}

export async function runPayrollForMonth(monthStr: string) {
  // get all active staff (users not student/parent)
  const { data: staffList, error: err } = await supabase
    .from('users')
    .select('id, role')
    .in('role', ['teacher', 'accountant', 'staff', 'admin', 'driver', 'cleaner', 'guard'])
    .eq('is_active', true);

  if (err) throw err;
  
  if (!staffList || staffList.length === 0) return [];

  const baseSalaryByRole: Record<string, number> = {
    teacher: 3500,
    accountant: 4000,
    staff: 2500,
    admin: 5000,
    driver: 2000,
    cleaner: 1500,
    guard: 2000,
  };

  const newPayslips = staffList.map(s => {
    return {
      staff_id: s.id,
      month: monthStr,
      amount: baseSalaryByRole[s.role] || 3000,
      status: 'Pending', // pending until paid from finance module
      date: new Date().toISOString().split('T')[0]
    };
  });

  const { data: created, error: cErr } = await supabase.from('payslips').insert(newPayslips).select();
  if (cErr) throw cErr;
  return created;
}


