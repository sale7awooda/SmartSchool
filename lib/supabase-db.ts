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
  
  // 1. Create the student user profile
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert([{
      email: `${studentData.studentId.toLowerCase()}@school.com`,
      name: studentData.name,
      role: 'student',
      address: studentData.address,
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
      name: studentData.name, // Redundant but consistent with schema
      grade: studentData.grade,
      roll_number: studentData.studentId,
      dob: studentData.dob,
      gender: studentData.gender,
      blood_group: studentData.bloodGroup,
      academic_year: '2025-2026' // Default for now
    }])
    .select()
    .single();

  if (studentError) throw studentError;

  // 3. Handle Parent Registration if provided
  if (studentData.parentName && studentData.parentPhone) {
    try {
      // Check if parent already exists by phone
      let { data: parent, error: parentFetchError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', studentData.parentPhone)
        .eq('role', 'parent')
        .single();
      
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
            relationship: 'Parent'
          }]);
      }
    } catch (err) {
      console.error('Error linking parent:', err);
      // Don't fail the whole student creation if parent linking fails
    }
  }

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
  const { 
    MOCK_USERS, MOCK_STUDENTS, MOCK_NOTICES, MOCK_BUS_ROUTES, MOCK_PARENTS,
    MOCK_ACADEMIC_YEARS, MOCK_CLASSES, MOCK_SUBJECTS, MOCK_EXAMS,
    MOCK_EXAM_RESULTS, MOCK_ATTENDANCE, MOCK_BOOKS, MOCK_INVOICES,
    MOCK_INVENTORY
  } = demoData;

  // Helper to safely upsert
  const safeUpsert = async (table: string, data: any[], conflictColumn: string = 'id') => {
    if (!data || data.length === 0) return;
    const { error } = await supabase.from(table).upsert(data, { onConflict: conflictColumn });
    if (error) console.error(`Error seeding ${table}:`, error);
  };

  // 1. Seed Users
  await safeUpsert('users', MOCK_USERS.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role.toLowerCase(),
    avatar_url: u.avatar,
    address: u.address,
    phone: u.phone
  })));

  // 2. Seed Parents (as Users)
  await safeUpsert('users', MOCK_PARENTS.map((p: any) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: 'parent',
    phone: p.phone
  })));

  // 3. Seed Students
  await safeUpsert('students', MOCK_STUDENTS.map((s: any) => ({
    user_id: s.id,
    roll_number: s.rollNumber || s.studentId,
    grade: s.grade,
    section: s.section || 'A',
    dob: s.dob,
    blood_group: s.medical?.bloodGroup || s.bloodGroup,
    admission_date: s.admissionDate || new Date().toISOString().split('T')[0]
  })), 'user_id');

  // 4. Seed Notices
  await safeUpsert('notices', MOCK_NOTICES.map((n: any) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    category: n.targetAudience,
    date: n.date,
    is_urgent: n.isImportant
  })));

  // 5. Seed Academic Years
  await safeUpsert('academic_years', MOCK_ACADEMIC_YEARS);

  // 6. Seed Subjects
  await safeUpsert('subjects', MOCK_SUBJECTS);

  // 7. Seed Classes
  await safeUpsert('classes', MOCK_CLASSES.map((c: any) => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    section: c.section,
    room: c.room,
    teacher_id: c.teacher_id,
    academic_year_id: MOCK_ACADEMIC_YEARS[0].id
  })));

  // 8. Seed Exams
  await safeUpsert('assessments', MOCK_EXAMS.map((e: any) => ({
    id: e.id,
    title: e.title,
    subject: 'General',
    type: e.type,
    date: e.date,
    status: e.status === 'Completed' ? 'published' : 'draft'
  })));

  // 9. Seed Attendance
  await safeUpsert('attendance', MOCK_ATTENDANCE.map((a: any) => ({
    student_id: a.student_id,
    date: a.date,
    status: a.status.toLowerCase()
  })), 'student_id,date');

  // 10. Seed Books
  await safeUpsert('books', MOCK_BOOKS);

  // 11. Seed Invoices
  await safeUpsert('fee_invoices', MOCK_INVOICES.map((i: any) => ({
    id: i.id,
    student_id: i.student_id,
    amount: i.amount,
    due_date: i.due_date,
    status: i.status,
    description: i.description
  })));

  return { success: true };
}

export async function resetDatabase(keepUsers: boolean = true) {
  const tables = [
    'attendance', 'behavior_records', 'timeline_records', 'submissions', 
    'assessments', 'fee_invoices', 'books', 'bus_stops', 'bus_routes', 
    'parent_student', 'students', 'classes', 'subjects', 'academic_years', 'notices'
  ];

  for (const table of tables) {
    try {
      // Use a filter that is likely to match all rows but doesn't strictly require 'id'
      // For join tables like parent_student, we use a different approach
      let query = supabase.from(table).delete();
      
      if (table === 'parent_student') {
        query = query.neq('student_id', '00000000-0000-0000-0000-000000000000');
      } else {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { error } = await query;
      if (error) {
        // Ignore "table not found" errors (PGRST205)
        if (error.code === 'PGRST205') {
          console.warn(`Table ${table} not found in schema, skipping reset.`);
        } else {
          console.error(`Error resetting ${table}:`, error);
        }
      }
    } catch (err) {
      console.error(`Unexpected error resetting ${table}:`, err);
    }
  }

  if (!keepUsers) {
    try {
      const { error } = await supabase.from('users').delete().neq('role', 'admin');
      if (error) console.error('Error resetting users:', error);
    } catch (err) {
      console.error('Unexpected error resetting users:', err);
    }
  }

  return { success: true };
}
