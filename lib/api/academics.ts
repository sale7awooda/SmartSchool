import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/types';

export async function getPaginatedAssessments(page: number = 1, limit: number = 10, search: string = '', statusFilter: string = 'all') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('assessments')
    .select('*, subject:subjects(name), class:classes(name)', { count: 'exact' });

  if (search) {
    query = query.or(`title.ilike.%${search}%`);
  }

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    if (error.code === '42703') {
       console.warn('Column issue in assessments, retrying without filter');
       return { data: [], count: 0, totalPages: 0 };
    }
    throw error;
  }

  return {
    data,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}


export async function getAssessments() {
  let query = supabase
    .from('assessments')
    .select('*');

  const { data, error } = await query;
  
  if (error) {
     if(error.code === '42703') return [];
     throw error;
  }
  return data;
}


export async function createAssessment(assessmentData: any) {
  const { questions, subject, grade, due_date, date, total_marks, type, teacher_id, ...mainData } = assessmentData;
  
  // Try to find subject and grade IDs
  let subject_id = null;
  let class_id = null;
  
  if (subject) {
    const { data: sData } = await supabase.from('subjects').select('id').ilike('name', subject).maybeSingle();
    if (sData) subject_id = sData.id;
  }
  
  if (grade) {
    const { data: cData } = await supabase.from('classes').select('id').ilike('name', grade).maybeSingle();
    if (cData) class_id = cData.id;
  }

  const computedTotalMarks = questions ? questions.reduce((acc: number, q: any) => acc + (Number(q.marks) || Number(q.points) || 1), 0) : (total_marks || 0);

  const payload = {
    ...mainData,
    subject_id,
    class_id,
    
    
    date: due_date || date, // Use date instead of due_date
  };
  
  // 1. Create the assessment
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .insert([payload])
    .select()
    .single();
  
  if (assessmentError) {
    console.error("Assessment creation error:", assessmentError);
    throw assessmentError;
  }

  // 2. Create questions if any
  if (questions && questions.length > 0) {
    const questionsWithId = questions.map((q: any, idx: number) => ({
      assessment_id: assessment.id,
      question: q.text || q.question || '',
      type: q.type,
      options: q.options ? JSON.stringify(q.options) : null,
      correct_answer: q.correct_answers ? JSON.stringify(q.correct_answers) : q.correct_answer,
      points: q.marks || q.points,
      order: idx + 1
    }));
    
    // We try to insert into assessment_questions, if it fails, try questions
    let { error: questionsError } = await supabase
      .from('assessment_questions')
      .insert(questionsWithId);
      
    if (questionsError && questionsError.code === '42P01') {
      questionsError = (await supabase.from('questions').insert(questionsWithId)).error;
    }
      
    if (questionsError) {
      console.error("Questions insert error:", questionsError);
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
  try {
    const { data: grades } = await supabase.from('grades').select('score');
    const avg = grades && grades.length > 0 
      ? grades.reduce((acc, g) => acc + Number(g.score), 0) / grades.length 
      : 0;

    return {
      avgGrade: Math.round(avg * 10) / 10,
      trends: [] // Real trends would require date-grouped aggregation
    };
  } catch (e) {
    return { avgGrade: 0, trends: [] };
  }
}


export async function getClasses() {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('is_deleted', false)
      .order('name');
    if (error) throw error;
    
    if (!data || data.length === 0) {
      // Seed default grades
      const defaults = Array.from({ length: 10 }, (_, i) => ({
        name: `Grade ${i + 1}`,
        is_deleted: false
      }));
      const { data: inserted, error: insertError } = await supabase
        .from('classes')
        .insert(defaults)
        .select('*')
        .order('name');
        
      if (!insertError && inserted) return inserted;
    }
    
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
    
    if (!data || data.length === 0) {
      // Seed default subjects
      const defaultSubjects = ['Arabic', 'Art', 'Biology', 'Chemistry', 'English', 'Ext Math', 'ICT', 'Math', 'P.E', 'Physics', 'Religion', 'Science', 'Social Studies'].map(name => ({
        name,
        code: name.substring(0, 3).toUpperCase(),
        is_deleted: false
      }));
      const { data: inserted, error: insertError } = await supabase
        .from('subjects')
        .insert(defaultSubjects)
        .select('*')
        .order('name');
        
      if (!insertError && inserted) return inserted;
    }
    
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
    
    if (!data || data.length === 0) {
       const defaults = [{ name: '2025-2026', is_active: true, is_deleted: false }];
       const { data: inserted, error: insertError } = await supabase
        .from('academic_years')
        .insert(defaults)
        .select('*')
        .order('name');
      if (!insertError && inserted) return inserted;
    }
    
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
    .select('*, subject:subjects(name), class:classes(name)')
    .eq('id', id)
    .single();
    
  if (assessmentError) throw assessmentError;
  
  let { data: questions, error: questionsError } = await supabase
    .from('assessment_questions')
    .select('*')
    .eq('assessment_id', id)
    .order('order', { ascending: true });
    
  if (questionsError && questionsError.code === '42P01') {
    const res = await supabase.from('questions').select('*').eq('assessment_id', id).order('id', { ascending: true });
    questions = res.data;
    questionsError = res.error as any;
  }
    
  if (questionsError) throw questionsError;
  
  const mappedQuestions = (questions || []).map((q: any) => ({
    ...q,
    id: q.id,
    text: q.question || q.text,
    marks: q.points || q.marks,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    correct_answers: typeof q.correct_answer === 'string' && q.correct_answer.startsWith('[') ? JSON.parse(q.correct_answer) : null,
    correct_answer: typeof q.correct_answer === 'string' && q.correct_answer.startsWith('[') ? null : q.correct_answer,
    type: q.type,
  }));
  
  return {
    ...assessment,
    questions: mappedQuestions
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
  await supabase.from('academic_years').update({ is_active: false }).eq('is_active', true);
  
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
    await supabase.from('academic_years').update({ is_active: false }).eq('is_active', true);
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
    await supabase.from('academic_years').update({ is_active: false }).eq('is_active', true);
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




export async function updateAssessment(id: string, assessmentData: any) {
  const { questions, subject, grade, due_date, date, total_marks, type, teacher_id, ...mainData } = assessmentData;
  
  let subject_id = null;
  let class_id = null;
  
  if (subject) {
    const { data: sData } = await supabase.from('subjects').select('id').ilike('name', subject).maybeSingle();
    if (sData) subject_id = sData.id;
  }
  
  if (grade) {
    const { data: cData } = await supabase.from('classes').select('id').ilike('name', grade).maybeSingle();
    if (cData) class_id = cData.id;
  }

  const computedTotalMarks = questions ? questions.reduce((acc: number, q: any) => acc + (Number(q.marks) || Number(q.points) || 1), 0) : (total_marks || 0);

  const payload = {
    ...mainData,
    subject_id: subject_id || mainData.subject_id,
    class_id: class_id || mainData.class_id,
    
    
    date: due_date || date, 
  };
  
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
    
  if (assessmentError) throw assessmentError;
  
  if (questions) {
    // Delete existing
    await supabase.from('questions').delete().eq('assessment_id', id);
    await supabase.from('assessment_questions').delete().eq('assessment_id', id);
    
    if (questions.length > 0) {
      const questionsWithId = questions.map((q: any, idx: number) => ({
        assessment_id: assessment.id,
        question: q.text || q.question,
        type: q.type,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answers ? JSON.stringify(q.correct_answers) : q.correct_answer,
        points: q.marks || q.points,
        order: idx + 1
      }));
      
      let { error: questionsError } = await supabase
        .from('assessment_questions')
        .insert(questionsWithId);
        
      if (questionsError && questionsError.code === '42P01') {
        await supabase.from('questions').insert(questionsWithId);
      }
    }
  }
  return assessment;
}

export async function deleteAssessment(id: string) {
  const { error } = await supabase.from('assessments').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function activateAssessment(id: string) {
  const { error } = await supabase.from('assessments').update({ status: 'active' }).eq('id', id);
  if (error) throw error;
  return true;
}
