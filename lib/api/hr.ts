import { supabase } from '@/lib/supabase/client';
import { runPayrollAction, applyLeaveAction, updateLeaveStatusAction, getLeaveRequestsAction, getPayslipsAction } from '@/app/actions/hr';

// Fallback user fetching for un-embedded relations
async function mapUsersToRecords(records: any[], userIdField: string) {
  if (!records || records.length === 0) return records;
  const userIds = [...new Set(records.map(r => r[userIdField]).filter(Boolean))];
  if (userIds.length === 0) return records;
  const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
  const userMap = (users || []).reduce((acc: any, u: any) => ({ ...acc, [u.id]: u.name }), {});
  return records.map(r => {
    const name = userMap[r[userIdField]] || r.staff?.name || r[userIdField];
    return { ...r, staffName: name, staff: name };
  });
}

export async function getLeaveRequests() {
  const data = await getLeaveRequestsAction();
  return await mapUsersToRecords(data, 'user_id');
}

export async function createLeaveRequest(leaveData: any) {
  const dataToInsert = { ...leaveData, user_id: leaveData.staff_id };
  delete dataToInsert.staff_id;
  // Use action to bypass RLS
  return await applyLeaveAction(dataToInsert);
}

export async function updateLeaveRequestStatus(id: string, status: string) {
  return await updateLeaveStatusAction(id, status);
}

export async function getPayslips() {
  const data = await getPayslipsAction();
  return await mapUsersToRecords(data, 'staff_id');
}

export async function createPayslip(payslipData: any) {
  const { data, error } = await supabase.from('payslips').insert(payslipData).select().single();
  if (error) throw error;
  return data;
}

export async function runPayrollForMonth(monthStr: string) {
  return await runPayrollAction(monthStr);
}


