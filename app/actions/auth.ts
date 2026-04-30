'use server';

import { createAdminClient } from '@/lib/supabase/server';

export async function lookupStudentEmailsByParentEmail(parentEmail: string): Promise<string[]> {
  const adminClient = createAdminClient();

  // 1. Find parent
  const { data: parent } = await adminClient
    .from('users')
    .select('id')
    .eq('email', parentEmail)
    .eq('role', 'parent')
    .maybeSingle();

  if (!parent) return [];

  // 2. Find linked students
  const { data: links } = await adminClient
    .from('parent_student')
    .select('student_id')
    .eq('parent_id', parent.id);

  if (!links || links.length === 0) return [];

  const studentIds = links.map(l => l.student_id);

  // 3. Find student emails directly from users 
  const { data: studentUsers } = await adminClient
    .from('users')
    .select('email')
    .in('student_id', studentIds)
    .eq('role', 'student');
    
  // If student_id isn't reliably set on users, we can look up the students first
  const { data: students } = await adminClient
    .from('students')
    .select('user_id')
    .in('id', studentIds);
    
  if (students && students.length > 0) {
    const userIds = students.map(s => s.user_id);
    const { data: users } = await adminClient
      .from('users')
      .select('email')
      .in('id', userIds)
      .eq('role', 'student');
      
    if (users) {
      return [...new Set([...(studentUsers?.map(u => u.email) || []), ...users.map(u => u.email)])].filter(Boolean) as string[];
    }
  }

  return studentUsers?.map(u => u.email).filter(Boolean) as string[] || [];
}
