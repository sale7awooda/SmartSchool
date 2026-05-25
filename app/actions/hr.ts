'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function runPayrollAction(monthStr: string) {
  const adminClient = createAdminClient();
  
  const { data: staffList, error: err } = await adminClient
    .from('users')
    .select('id, role')
    .in('role', ['teacher', 'accountant', 'staff', 'admin', 'driver', 'cleaner', 'guard']);

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
      status: 'Pending',
      date: new Date().toISOString().split('T')[0]
    };
  });

  const { data: created, error: cErr } = await adminClient.from('payslips').insert(newPayslips).select();
  if (cErr) throw cErr;
  
  return { success: true, count: newPayslips.length };
}

export async function getLeaveRequestsAction() {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.from('leave_requests').select('*');
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return [];
    throw error;
  }
  return data;
}

export async function getPayslipsAction() {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.from('payslips').select('*');
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return [];
    throw error;
  }
  return data;
}

export async function applyLeaveAction(leaveData: any) {
  const adminClient = createAdminClient();
  const dataToInsert = { ...leaveData };
  
  if (dataToInsert.type) {
    dataToInsert.reason = `[${dataToInsert.type.toUpperCase()}] ${dataToInsert.reason || ''}`;
    delete dataToInsert.type;
  }

  const { data, error } = await adminClient.from('leave_requests').insert(dataToInsert).select().single();
  if (error) throw error;
  return data;
}

export async function updateLeaveStatusAction(id: string, status: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.from('leave_requests').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function updatePayslipStatusAction(id: string, status: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.from('payslips').update({ status, date: new Date().toISOString().split('T')[0] }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
