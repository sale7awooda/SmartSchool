import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/types';

export async function getStudents(academicYear?: string, includeDeleted = false, grade?: string) {
  let query = supabase
    .from('students')
    .select(`
      *,
      user:users(*)
    `);
  
  if (academicYear) {
    query = query.eq('academic_year', academicYear);
  }

  if (grade) {
    query = query.eq('grade', grade);
  }

  if (!includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  return data.map((s: any) => ({
    ...s.user,
    ...s,
    userId: s.user_id,
    id: s.id // Use student UUID as the main ID
  })) as Student[];
}


export async function getPaginatedStudents(page: number = 1, limit: number = 10, search: string = '', academicYear?: string, isDeleted: boolean = false) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('students')
    .select(`
      *,
      user:users!inner(*),
      parents:parent_student(
        parent:users(*)
      )
    `, { count: 'exact' });

  if (academicYear) {
    query = query.eq('academic_year', academicYear);
  }

  query = query.eq('is_deleted', isDeleted);

  if (search) {
    // Search by student name or roll number
    query = query.or(`name.ilike.%${search}%,roll_number.ilike.%${search}%`, { foreignTable: 'users' });
  }

  const { data, error, count } = await query.range(from, to);
  
  if (error) throw error;
  
  const students = data.map((s: any) => ({
    ...s.user,
    ...s,
    id: s.user_id,
    parentNames: s.parents?.map((p: any) => p.parent?.name).join(', ') || 'N/A'
  })) as (Student & { parentNames: string })[];

  return {
    data: students,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}


export async function getStudentCountForAcademicYear(academicYearName: string) {
  const { count, error } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('academic_year', academicYearName);
    
  if (error) throw error;
  return count || 0;
}


export async function createStudent(studentData: any) {
  // This would involve creating an auth user (usually via an admin API or invite)
  // For now, we'll assume the user profile exists or we create it in the public.users table
  // In a real app, you'd use a Supabase Edge Function to create the auth user
  
  // 1. Create the student user profile
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert([{
      email: `${studentData.studentId.toLowerCase()}@school.com`,
      name: studentData.name,
      role: 'student',
      phone: studentData.phone || null
    }])
    .select()
    .single();

  if (userError) throw userError;

  // 2. Create the student record
  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert([{
      user_id: user.id,
      name: studentData.name,
      grade: studentData.grade,
      roll_number: studentData.studentId,
      dob: studentData.dob,
      gender: studentData.gender,
      blood_group: studentData.bloodGroup,
      address: studentData.address,
      academic_year: studentData.academicYear || '2025-2026',
      fee_structure: studentData.feeStructure,
      additional_info: studentData.additionalInfo
    }])
    .select()
    .single();

  if (studentError) throw studentError;

  // 3. Handle Parent Registration if provided
  if (studentData.parentName && studentData.parentPhone) {
    try {
      // Check if parent already exists by phone
      let { data: parent } = await supabase
        .from('users')
        .select('*')
        .eq('phone', studentData.parentPhone)
        .eq('role', 'parent')
        .maybeSingle();
      
      if (!parent) {
        // Create new parent user
        const { data: newParent, error: parentCreateError } = await supabase
          .from('users')
          .insert([{
            email: `parent_${studentData.parentPhone.replace(/\D/g, '')}@school.com`,
            name: studentData.parentName,
            role: 'parent',
            phone: studentData.parentPhone
          }])
          .select()
          .single();
        
        if (!parentCreateError) parent = newParent;
      }

      if (parent) {
        // Link parent and student
        await supabase
          .from('parent_student')
          .insert([{
            parent_id: parent.id,
            student_id: student.id,
            relationship: studentData.parentRelation || 'Parent'
          }]);
      }
    } catch (err) {
      console.error('Error linking parent:', err);
      // Don't fail the whole student creation if parent linking fails
    }
  }

  return { ...user, ...student };
}


export async function updateStudent(id: string, studentData: any) {
  const { data, error } = await supabase
    .from('students')
    .update(studentData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}


export async function deleteStudent(id: string, reason: string) {
  const { error } = await supabase
    .from('students')
    .update({ is_deleted: true, deleted_reason: reason })
    .eq('id', id);
  if (error) throw error;
}


export async function getBehaviorRecords(studentId: string) {
  const { data, error } = await supabase
    .from('behavior_records')
    .select('*')
    .eq('student_id', studentId);
  
  if (error) throw error;
  return data;
}


export async function getTimelineRecords(studentId: string) {
  const { data, error } = await supabase
    .from('timeline_records')
    .select('*')
    .eq('student_id', studentId);
  
  if (error) throw error;
  return data;
}


export async function getStudentById(id: string) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, roll_number, grade')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Academic Management

export async function getStudentByUserId(userId: string) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('student_id')
    .eq('id', userId)
    .single();
  
  if (userError || !user?.student_id) throw userError || new Error('Student ID not found for user');

  const { data, error } = await supabase
    .from('students')
    .select('id, name, roll_number')
    .eq('id', user.student_id)
    .single();
  
  if (error) throw error;
  return data;
}


export async function getAtRiskStudents(academicYear?: string) {
  // In a real app, this would query students with low grades or high absenteeism
  return [
    { id: 1, student: 'Milhouse Van Houten', grade: 'Grade 4', risk: 'High', factor: 'Academic Drop', reason: 'Math score dropped by 18% over last 3 weeks. Missed 2 assignments.', action: 'Schedule parent-teacher meeting.' },
    { id: 2, student: 'Nelson Muntz', grade: 'Grade 4', risk: 'High', factor: 'Attendance', reason: 'Absent for 4 consecutive days without medical note. Historical pattern of mid-term absenteeism.', action: 'Initiate wellness check.' },
    { id: 3, student: 'Ralph Wiggum', grade: 'Grade 2', risk: 'Medium', factor: 'Engagement', reason: 'Decreased participation in class activities. Reading comprehension below benchmark.', action: 'Assign reading specialist.' },
    { id: 4, student: 'Jimbo Jones', grade: 'Grade 6', risk: 'Medium', factor: 'Behavioral', reason: '3 minor incidents reported in the last 10 days.', action: 'Counselor check-in.' },
  ];
}


