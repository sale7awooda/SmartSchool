import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/lib/mock-db';

export async function getParents() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'parent');
  
  if (error) throw error;
  
  return data as Parent[];
}


export async function getPaginatedParents(page: number = 1, limit: number = 10, search: string = '') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .eq('role', 'parent');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  
  if (error) throw error;
  
  return {
    data: data as Parent[],
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}


export async function getParentByUserId(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, 
      name,
      parent_student(student_id)
    `)
    .eq('id', userId)
    .eq('role', 'parent')
    .single();
  
  if (error) throw error;
  
  return {
    ...data,
    studentIds: data.parent_student.map((ps: any) => ps.student_id)
  };
}


