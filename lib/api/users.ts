import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/types';

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) throw error;
  return data as User[];
}


export async function updateUserPermissions(userId: string, customPermissions: Record<string, string[]>) {
  const { data, error } = await supabase
    .from('users')
    .update({ custom_permissions: customPermissions })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateUserRoleAndDepartment(userId: string, role: string, department: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ role, department })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateUserRole(userId: string, role: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}


