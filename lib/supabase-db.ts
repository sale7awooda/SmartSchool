import { createClient } from './supabase/client';
import { Student, User, Parent } from './mock-db';

export const supabase = createClient();

export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      user:users(*)
    `);
  
  if (error) throw error;
  
  return data.map(s => ({
    ...s.user,
    ...s,
    id: s.user_id // Use user_id as the main ID for consistency with mock-db
  })) as Student[];
}

export async function getParents() {
  const { data, error } = await supabase
    .from('parents')
    .select(`
      *,
      user:users(*)
    `);
  
  if (error) throw error;
  
  return data.map(p => ({
    ...p.user,
    ...p,
    id: p.user_id
  })) as Parent[];
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
    .from('parents')
    .select('id, name, children_ids')
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  return data;
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
