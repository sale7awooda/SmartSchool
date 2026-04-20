import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/types';

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


export async function getAssessments() {
  let query = supabase
    .from('assessments')
    .select('*')
    .order('created_at', { ascending: false });

  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}


export async function createAssessment(assessmentData: any) {
  const { questions, ...mainData } = assessmentData;
  
  // 1. Create the assessment
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .insert([mainData])
    .select()
    .single();
  
  if (assessmentError) throw assessmentError;

  // 2. Create questions if any
  if (questions && questions.length > 0) {
    const questionsWithId = questions.map((q: any) => ({
      ...q,
      assessment_id: assessment.id
    }));
    
    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsWithId);
      
    if (questionsError) {
      // Rollback assessment (manual)
      await supabase.from('assessments').delete().eq('id', assessment.id);
      throw questionsError;
    }
  }
  
  return assessment;
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


export async function submitAssessment(submissionData: {
  assessment_id: string;
  student_id: string;
  answers: Record<string, any>;
  questions: any[];
}) {
  const { assessment_id, student_id, answers, questions } = submissionData;

  // 1. Calculate Score
  let score = 0;
  let totalMarks = 0;

  questions.forEach(q => {
    totalMarks += q.marks;
    const studentAnswer = answers[q.id];

    if (studentAnswer === undefined || studentAnswer === null) return;

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      if (String(studentAnswer) === String(q.correct_answer)) {
        score += q.marks;
      }
    } else if (q.type === 'multiple_response') {
      const correctAnswers = q.correct_answers || [];
      const studentAnswers = Array.isArray(studentAnswer) ? studentAnswer : [];
      
      // Basic check: all correct must be present, and no incorrect
      const isCorrect = correctAnswers.length === studentAnswers.length && 
                        correctAnswers.every((a: string) => studentAnswers.includes(a));
      
      if (isCorrect) {
        score += q.marks;
      }
    } else if (q.type === 'short_answer') {
      if (String(studentAnswer).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()) {
        score += q.marks;
      }
    }
  });

  // 2. Save Submission
  const { data, error } = await supabase
    .from('submissions')
    .insert([{
      assessment_id,
      student_id,
      answers,
      score,
      total_marks: totalMarks,
      status: 'completed',
      submitted_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}


export async function getSubmissionByAssessmentAndStudent(assessmentId: string, studentId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('student_id', studentId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}


export async function getAcademicStats(academicYear?: string) {
  // In a real app, this would aggregate data from grades and students tables
  // Returning mock structure for now to match the UI expectations
  return {
    avgGrade: 86.4,
    trends: [
      { month: 'Sep', math: 78, science: 82, english: 85, avg: 81.6 },
      { month: 'Oct', math: 80, science: 81, english: 86, avg: 82.3 },
      { month: 'Nov', math: 82, science: 85, english: 84, avg: 83.6 },
      { month: 'Dec', math: 85, science: 88, english: 87, avg: 86.6 },
      { month: 'Jan', math: 84, science: 86, english: 88, avg: 86.0 },
      { month: 'Feb', math: 88, science: 89, english: 90, avg: 89.0 },
    ]
  };
}


export async function getClasses() {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        academic_year:academic_year_id(name),
        teacher:class_teacher_id(name)
      `)
      .eq('is_deleted', false)
      .order('name');
    if (error) throw error;
    return data;
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty classes list.');
      return [];
    }
    throw error;
  }
}


export async function getSubjects() {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('is_deleted', false)
      .order('name');
    if (error) throw error;
    return data;
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty subjects list.');
      return [];
    }
    throw error;
  }
}


export async function getAcademicYears() {
  try {
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('is_deleted', false)
      .order('name');
    if (error) throw error;
    return data;
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty academic years list.');
      return [];
    }
    throw error;
  }
}


export async function getAssessmentWithQuestions(id: string) {
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select('*')
    .eq('id', id)
    .single();
    
  if (assessmentError) throw assessmentError;
  
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .eq('assessment_id', id)
    .order('created_at', { ascending: true });
    
  if (questionsError) throw questionsError;
  
  return {
    ...assessment,
    questions: questions || []
  };
}


export async function getActiveAcademicYear() {
  try {
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows returned
    
    if (!data) {
      return { name: '2025-2026', is_active: true };
    }
    
    return data;
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning null for active academic year.');
      return null;
    }
    throw error;
  }
}


export async function setActiveAcademicYear(id: string) {
  // First, set all to false
  await supabase.from('academic_years').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Then set the selected one to true
  const { data, error } = await supabase
    .from('academic_years')
    .update({ is_active: true })
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}


export async function createAcademicYear(year: any) {
  if (year.is_active) {
    await supabase.from('academic_years').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  }
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


export async function updateAcademicYear(id: string, year: any) {
  if (year.is_active) {
    await supabase.from('academic_years').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  }
  const { data, error } = await supabase
    .from('academic_years')
    .update(year)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}


export async function updateClass(id: string, classData: any) {
  const { data, error } = await supabase
    .from('classes')
    .update(classData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}


export async function updateSubject(id: string, subject: any) {
  const { data, error } = await supabase
    .from('subjects')
    .update(subject)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}


export async function deleteAcademicYear(id: string) {
  const { error } = await supabase.from('academic_years').update({ is_deleted: true }).eq('id', id);
  if (error) throw error;
}


export async function deleteClass(id: string) {
  const { error } = await supabase.from('classes').update({ is_deleted: true }).eq('id', id);
  if (error) throw error;
}


export async function deleteSubject(id: string) {
  const { error } = await supabase.from('subjects').update({ is_deleted: true }).eq('id', id);
  if (error) throw error;
}


