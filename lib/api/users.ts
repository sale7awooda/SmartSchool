import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/types';
import {
  updateUserPermissionsAction,
  updateStaffMemberAction,
  updateUserRoleAndDepartmentAction,
  updateUserRoleAction
} from '@/app/actions/users';

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) throw error;
  return data as User[];
}


export async function updateUserPermissions(userId: string, customPermissions: Record<string, string[]>) {
  const result = await updateUserPermissionsAction(userId, customPermissions);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

export async function updateStaffMember(userId: string, payload: { name: string, email: string, phone: string, role: string, department: string }) {
  const result = await updateStaffMemberAction(userId, payload);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

export async function updateUserRoleAndDepartment(userId: string, role: string, department: string) {
  const result = await updateUserRoleAndDepartmentAction(userId, role, department);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

export async function updateUserRole(userId: string, role: string) {
  const result = await updateUserRoleAction(userId, role);
  if (!result.success) throw new Error(result.message);
  return result.data;
}



