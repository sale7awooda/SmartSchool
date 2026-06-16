'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function runPayrollAction(monthStr: string) {
  const adminClient = createAdminClient();
  
  const { data: staffList, error: err } = await adminClient
    .from('users')
    .select('id, role, salary')
    .in('role', ['teacher', 'accountant', 'staff', 'admin', 'driver', 'cleaner', 'guard']);

  if (err) throw err;
  if (!staffList || staffList.length === 0) return [];

  // Parse Month and Year (e.g. "June 2026")
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  let year = new Date().getFullYear();
  let monthIndex = new Date().getMonth(); // 0-indexed
  const parts = monthStr.toLowerCase().split(/\s+/);
  parts.forEach(p => {
    const idx = monthNames.indexOf(p);
    if (idx !== -1) {
      monthIndex = idx;
    } else if (/^\d{4}$/.test(p)) {
      year = parseInt(p, 10);
    }
  });
  
  const yearStr = year.toString();
  const monthNumberStr = String(monthIndex + 1).padStart(2, '0');
  const datePrefix = `${yearStr}-${monthNumberStr}-%`;

  // Fetch attendance records for this month
  let attendanceMap: Record<string, { present: number; absent: number }> = {};
  try {
    const { data: attendances } = await adminClient
      .from('staff_attendance')
      .select('staff_id, status')
      .like('date', datePrefix);
      
    if (attendances && attendances.length > 0) {
      attendances.forEach(att => {
        const sid = att.staff_id;
        if (!attendanceMap[sid]) {
          attendanceMap[sid] = { present: 0, absent: 0 };
        }
        if (att.status?.toLowerCase() === 'present') {
          attendanceMap[sid].present += 1;
        } else if (att.status?.toLowerCase() === 'absent') {
          attendanceMap[sid].absent += 1;
        }
      });
    }
  } catch (attErr) {
    console.warn('Silent fallback querying staff attendance for payroll:', attErr);
  }

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
    const baseVal = Number(s.salary) || baseSalaryByRole[s.role] || 3000;
    
    // Auto-calculate deduction based on attendance:
    // Every unexcused absent day deducts 1/25th of the salary (assuming 25 working days).
    let deduction = 0;
    const stats = attendanceMap[s.id];
    if (stats && stats.absent > 0) {
      deduction = (baseVal / 25) * stats.absent;
    }

    const finalAmount = Math.max(0, Math.round((baseVal - deduction) * 100) / 100);

    return {
      staff_id: s.id,
      month: monthStr,
      amount: finalAmount,
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

export async function payPayslipWithExpenseAction(
  id: string, 
  amount: number, 
  staffName: string, 
  month: string,
  paymentMethod?: string,
  referenceNumber?: string,
  paymentDate?: string,
  remarks?: string
) {
  const adminClient = createAdminClient();
  const today = new Date().toISOString().split('T')[0];
  const finalDate = paymentDate || today;
  
  // Update payslip to 'Paid'
  const { error } = await adminClient.from('payslips').update({ 
    status: 'Paid', 
    amount, 
    date: finalDate 
  }).eq('id', id);
  if (error) return { success: false, message: error.message };

  let descriptionLines = [
    `Salary for ${staffName} - ${month}`,
    paymentMethod ? `- Method: ${paymentMethod}` : '',
    referenceNumber ? `- Ref #: ${referenceNumber}` : '',
    remarks ? `- Remarks: ${remarks}` : ''
  ].filter(Boolean);

  // Create an expense
  const expense = {
    type: 'Expense',
    category: 'Payroll',
    amount: amount,
    date: finalDate,
    description: descriptionLines.join(' '),
    status: 'Paid'
  };

  const { error: expError } = await adminClient.from('financials').insert(expense);
  if (expError) return { success: false, message: expError.message };

  return { success: true };
}
