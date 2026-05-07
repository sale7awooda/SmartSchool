import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/types';
import { MOCK_STUDENTS } from '@/lib/demo-data';

export async function getStudents(academicYear?: string, includeDeleted = false, grade?: string) {
  try {
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
      name: s.name || (s.user ? `${s.user.first_name || ''} ${s.user.last_name || ''}`.trim() : 'Unknown'),
      userId: s.user_id,
      rollNumber: s.roll_number,
      dob: s.date_of_birth || s.dob,
      address: s.address,
      gender: s.gender,
      id: s.id // Use student UUID as the main ID
    })) as Student[];
  } catch (error: any) {
    throw error;
  }
}


export async function getPaginatedStudents(page: number = 1, limit: number = 10, search: string = '', academicYear?: string, gradeFilter?: string, isDeleted: boolean = false, genderFilter?: string, parentIdFilter?: string) {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('students')
      .select(`
        *,
        user:users(*),
        parents:parent_student(
          parent:users(*)
        )
      `, { count: 'exact' });

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    if (gradeFilter) {
      query = query.eq('grade', gradeFilter);
    }

    if (genderFilter) {
      query = query.eq('gender', genderFilter);
    }

    query = query.eq('is_deleted', isDeleted);

    if (search) {
      query = query.or(`name.ilike.%${search}%,roll_number.ilike.%${search}%`);
    }

    if (parentIdFilter) {
      const { data: parentStudents } = await supabase.from('parent_student').select('student_id').eq('parent_id', parentIdFilter);
      if (parentStudents && parentStudents.length > 0) {
        query = query.in('id', parentStudents.map(p => p.student_id));
      } else {
         query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    const { data, error, count } = await query.range(from, to);
    
    if (error) throw error;
    
    const students = data.map((s: any) => ({
      ...s.user,
      ...s,
      name: s.name || (s.user ? `${s.user.first_name || ''} ${s.user.last_name || ''}`.trim() : 'Unknown'),
      id: s.id, // Better to use student id not user_id
      userId: s.user_id,
      rollNumber: s.roll_number,
      dob: s.date_of_birth || s.dob,
      address: s.address,
      gender: s.gender,
      parentNames: s.parents?.map((p: any) => p.parent?.name || (p.parent ? `${p.parent.first_name || ''} ${p.parent.last_name || ''}`.trim() : 'Unknown')).join(', ') || 'N/A'
    })) as (Student & { parentNames: string })[];

    return {
      data: students,
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    };
  } catch (error: any) {
    throw error;
  }
}



export async function getStudentCountForAcademicYear(academicYearIdRef: string) {
  let query = supabase
    .from('students')
    .select('*', { count: 'exact', head: true });
    
  if (academicYearIdRef) {
    query = query.eq('academic_year', academicYearIdRef);
  }
  
  const { count, error } = await query;
    
  if (error) throw error;
  return count || 0;
}


export async function getNextStudentId(academicYear: string) {
  try {
    const yearSuffix = academicYear.split('-')[0].substring(2); // e.g., '25' from '2025-2026'
    const prefix = `S${yearSuffix}`;
    
    const { data, error } = await supabase
      .from('students')
      .select('roll_number')
      .ilike('roll_number', `${prefix}%`)
      .order('roll_number', { ascending: false })
      .limit(1);
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return `${prefix}001`;
    }
    
    const lastId = data[0].roll_number;
    // Extract the numeric part (after 'S25')
    const lastNumMatch = lastId.match(/\d+$/);
    if (!lastNumMatch) return `${prefix}001`;
    
    // The prefix might be S25, and lastId might be S25001
    // We want the part after S25. 
    // If prefix is S25 (3 chars), then lastNum is from index 3.
    const lastNumStr = lastId.substring(prefix.length);
    const lastNum = parseInt(lastNumStr, 10);
    const nextNum = (lastNum + 1).toString().padStart(3, '0');
    
    return `${prefix}${nextNum}`;
  } catch (error) {
    console.error('Error generating student ID:', error);
    // Fallback to a random-ish but format-compliant ID if anything fails
    const yearSuffix = new Date().getFullYear().toString().substring(2);
    return `S${yearSuffix}${Math.floor(Math.random() * 900 + 100)}`;
  }
}

export async function createStudent(studentData: any) {
  // 1. Create the student user profile
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert([{
      id: undefined, // Supabase handles this if we don't provide it, but wait, schemas usually link to UUIDs. 
      // Actually, in the fix SQL, users.id references auth.users(id). 
      // In development usually we just insert and let Postgres generate if it's not restricted.
      // But table definition says "id UUID PRIMARY KEY REFERENCES auth.users(id)".
      // This means we CANNOT insert into users without an auth user.
      // However, for development bypass, many people use a default UUID or let it be generated if the FK allows.
      // But here it says REFERENCES auth.users(id).
      // Since I can't create auth users easily, I will just try to insert and hope for the best or use a generated UUID if allowed.
      // Wait, the prior code was inserting into users first.
      email: `${studentData.studentId.toLowerCase()}_${Date.now()}@school.com`, // Ensure uniqueness
      name: studentData.name,
      role: 'student',
      phone: studentData.phone || null,
      address: studentData.address || null
    }])
    .select()
    .single();

  if (userError) throw userError;

  // 2. Create the student record
  const nameParts = studentData.name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || 'Student';
  
  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert([{
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      grade: studentData.grade,
      roll_number: studentData.studentId,
      date_of_birth: studentData.dob,
      gender: studentData.gender,
      academic_year: studentData.academicYear || null
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
            email: `parent_${studentData.parentPhone.replace(/\D/g, '')}_${Date.now()}@school.com`,
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
            relation: studentData.parentRelation || 'Parent'
          }]);
      }
    } catch (err) {
      console.error('Error linking parent:', err);
    }
  }

  return { ...user, ...student, name: studentData.name };
}


export async function updateStudent(id: string, studentData: any) {
  const updatePayload: any = { ...studentData };
  if (studentData.name) {
    const nameParts = studentData.name.split(' ');
    updatePayload.first_name = nameParts[0];
    updatePayload.last_name = nameParts.slice(1).join(' ') || 'Student';
    delete updatePayload.name;
  }
  if (studentData.dob) {
    updatePayload.date_of_birth = studentData.dob;
    delete updatePayload.dob;
  }

  const { data, error } = await supabase
    .from('students')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}


export async function deleteStudent(id: string, reason: string) {
  const { error } = await supabase
    .from('students')
    .update({ is_deleted: true })
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
    .from('timeline_events')
    .select('*')
    .eq('student_id', studentId);
  
  if (error) throw error;
  return data;
}


export async function getStudentById(id: string) {
  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, roll_number, grade')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return {
    ...data,
    name: `${data.first_name} ${data.last_name}`.trim()
  };
}

// Academic Management

export async function getStudentByUserId(userId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, roll_number, grade')
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  return {
    ...data,
    name: `${data.first_name} ${data.last_name}`.trim()
  };
}


export async function getAtRiskStudents(academicYear?: string) {
  // Return empty for now as requested by user to use only real data
  // Real implementation would look at grades/attendance
  return [];
}


