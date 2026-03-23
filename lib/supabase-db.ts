import { supabase } from './supabase/client';
import { Student, User, Parent } from './mock-db';

export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      user:users(*)
    `);
  
  if (error) throw error;
  
  return data.map((s: any) => ({
    ...s.user,
    ...s,
    id: s.user_id // Use user_id as the main ID for consistency with mock-db
  })) as Student[];
}

export async function getPaginatedStudents(page: number = 1, limit: number = 10, search: string = '') {
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

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) throw error;
  return data as User[];
}

export async function createStudent(studentData: any) {
  // This would involve creating an auth user (usually via an admin API or invite)
  // For now, we'll assume the user profile exists or we create it in the public.users table
  // In a real app, you'd use a Supabase Edge Function to create the auth user
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert([{
      email: `${studentData.studentId.toLowerCase()}@school.com`,
      name: studentData.name,
      role: 'student',
      address: studentData.address
    }])
    .select()
    .single();

  if (userError) throw userError;

  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert([{
      user_id: user.id,
      grade: studentData.grade,
      roll_number: studentData.studentId,
      dob: studentData.dob,
      blood_group: studentData.bloodGroup
    }])
    .select()
    .single();

  if (studentError) throw studentError;

  return { ...user, ...student };
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

export async function getAttendance(date: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', date);
  
  if (error) throw error;
  return data;
}

export async function getPaginatedStaff(page: number = 1, limit: number = 10, search: string = '') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

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
}

export async function getPaginatedInvoices(page: number = 1, limit: number = 10, search: string = '', studentId?: string) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('fee_invoices')
    .select(`
      *,
      student:students(user:users(name))
    `, { count: 'exact' });

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  // Note: search by student name requires a more complex query or view in Supabase, 
  // keeping it simple for now or searching by invoice id if needed.

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    data,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

export async function getPaginatedAssessments(page: number = 1, limit: number = 10, search: string = '', statusFilter: string = 'all') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('assessments')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,subject.ilike.%${search}%`);
  }

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    data,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

export async function getPaginatedRoutes(page: number = 1, limit: number = 10, search: string = '') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('bus_routes')
    .select('*', { count: 'exact' });

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
}

export async function getPaginatedBooks(page: number = 1, limit: number = 10, search: string = '') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('books')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    data,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}
export async function getAssessments() {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function createAssessment(assessmentData: any) {
  const { data, error } = await supabase
    .from('assessments')
    .insert([assessmentData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getSubmissions(assessmentId?: string) {
  let query = supabase.from('submissions').select(`
    *,
    student:students(*, user:users(*))
  `);
  
  if (assessmentId) {
    query = query.eq('assessment_id', assessmentId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function getStudentSubmissions(studentId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      assessment:assessments(*)
    `)
    .eq('student_id', studentId);
  
  if (error) throw error;
  return data;
}

export async function updateSubmission(submissionId: string, updateData: any) {
  const { data, error } = await supabase
    .from('submissions')
    .update(updateData)
    .eq('id', submissionId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function saveAttendance(attendanceData: any[]) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(attendanceData, { onConflict: 'student_id,date' });
  
  if (error) throw error;
  return data;
}

// Academic Management
export async function getStudentByUserId(userId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, roll_number')
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  return data;
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

export async function getAcademicYears() {
  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      academic_year:academic_year_id(name),
      teacher:teacher_id(name)
    `)
    .order('name');
  if (error) throw error;
  return data;
}

export async function getSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function createAcademicYear(year: any) {
  const { data, error } = await supabase
    .from('academic_years')
    .insert(year)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createClass(classData: any) {
  const { data, error } = await supabase
    .from('classes')
    .insert(classData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createSubject(subject: any) {
  const { data, error } = await supabase
    .from('subjects')
    .insert(subject)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function seedDatabase(demoData: any) {
  const { MOCK_USERS, MOCK_STUDENTS, MOCK_NOTICES, MOCK_BUS_ROUTES, MOCK_PARENTS } = demoData;

  // 1. Seed Users (Staff, Admins, etc.)
  if (MOCK_USERS?.length) {
    const { error: userError } = await supabase
      .from('users')
      .upsert(MOCK_USERS.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role.toLowerCase(),
        avatar_url: u.avatar,
        address: u.address,
        phone: u.phone
      })), { onConflict: 'id' });
    if (userError) console.error('Error seeding users:', userError);
  }

  // 2. Seed Parents (as Users)
  if (MOCK_PARENTS?.length) {
    const { error: parentError } = await supabase
      .from('users')
      .upsert(MOCK_PARENTS.map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: 'parent',
        phone: p.phone
      })), { onConflict: 'id' });
    if (parentError) console.error('Error seeding parents:', parentError);
  }

  // 3. Seed Students
  if (MOCK_STUDENTS?.length) {
    const { error: studentError } = await supabase
      .from('students')
      .upsert(MOCK_STUDENTS.map((s: any) => ({
        user_id: s.id,
        roll_number: s.studentId,
        grade: s.grade,
        section: s.section,
        dob: s.dob,
        blood_group: s.bloodGroup,
        admission_date: s.admissionDate
      })), { onConflict: 'user_id' });
    if (studentError) console.error('Error seeding students:', studentError);
  }

  // 4. Seed Notices
  if (MOCK_NOTICES?.length) {
    const { error: noticeError } = await supabase
      .from('notices')
      .upsert(MOCK_NOTICES.map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        category: n.category || n.targetAudience,
        date: n.date,
        is_urgent: n.isImportant || n.isUrgent
      })), { onConflict: 'id' });
    if (noticeError) console.error('Error seeding notices:', noticeError);
  }

  return { success: true };
}
