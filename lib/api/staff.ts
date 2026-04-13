import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/lib/mock-db';

export async function getPaginatedStaff(page: number = 1, limit: number = 10, search: string = '') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .in('role', ['teacher', 'staff', 'accountant', 'admin']);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return {
      data,
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    };
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty staff list.');
      return { data: [], count: 0, totalPages: 0 };
    }
    throw error;
  }
}


export async function createStaff(staffData: any) {
  const { data, error } = await supabase.from('users').insert({
    ...staffData,
    created_at: new Date().toISOString()
  }).select().single();
  if (error) throw error;
  return data;
}

// HR Functions

export async function getTeachers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'teacher');
    
    if (error) throw error;
    return data as User[];
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty teachers list.');
      return [];
    }
    throw error;
  }
}


