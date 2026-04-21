import { supabase } from '@/lib/supabase/client';

export async function getLeaveRequests() {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, staff:users(name)')
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === 'PGRST205') return []; // Table doesn't exist yet
    throw error;
  }
  return data.map((l: any) => ({ ...l, staff: l.staff?.name }));
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
    if (error.code === 'PGRST205') return [];
    throw error;
  }
  return data.map((p: any) => ({ ...p, staff: p.staff?.name }));
}


export async function createPayslip(payslipData: any) {
  const { data, error } = await supabase.from('payslips').insert(payslipData).select().single();
  if (error) throw error;
  return data;
}


