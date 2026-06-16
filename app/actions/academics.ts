'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from './audit';

const CreateAssessmentSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  subject: z.string().min(1, "Subject is required"),
  grade: z.string().min(1, "Class/Grade is required"),
  type: z.enum(['exam', 'assignment', 'quiz', 'project']),
  max_score: z.number().positive("Max score must be positive"),
  due_date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  createdBy: z.string().uuid("Invalid user ID")
});

export type AssessmentActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function processCreateAssessmentAction(
  prevState: AssessmentActionState,
  formData: FormData
): Promise<AssessmentActionState> {
  const rawData = {
    title: formData.get('title') as string,
    subject: formData.get('subject') as string,
    grade: formData.get('class') as string, // Note mapping class -> grade as in database
    type: formData.get('type') as string,
    max_score: parseInt(formData.get('maxScore') as string, 10),
    due_date: formData.get('date') as string,
    description: (formData.get('description') as string) || '',
    createdBy: formData.get('createdBy') as string,
  };

  const validatedFields = CreateAssessmentSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { createdBy, ...assessmentData } = validatedFields.data;

  const supabase = await createClient();
  const { data: assessment, error } = await supabase
    .from('assessments')
    .insert([{ ...assessmentData, status: 'Published' }])
    .select()
    .single();

  if (error) {
    console.error(error);
    return { success: false, message: "Database creation failed: " + error.message };
  }

  await logAudit('ASSESSMENT_CREATED', createdBy, {
    assessment_id: assessment.id,
    title: assessment.title,
    grade: assessment.grade,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: "Assessment created successfully." };
}

const SaveGradesSchema = z.object({
  assessment_id: z.string().uuid("Invalid assessment ID"),
  gradedBy: z.string().uuid("Invalid user ID"),
  records: z.array(z.object({
    student_id: z.string().uuid("Invalid student ID"),
    score: z.number().min(0, "Score cannot be negative"),
    feedback: z.string().optional()
  }))
});

export async function processSaveGradesAction(
  prevState: AssessmentActionState,
  formData: FormData
): Promise<AssessmentActionState> {
  let records = [];
  try {
    records = JSON.parse(formData.get('records') as string);
  } catch (e) {
    return { success: false, message: "Invalid payload format." };
  }

  const rawData = {
    assessment_id: formData.get('assessment_id') as string,
    gradedBy: formData.get('gradedBy') as string,
    records
  };

  const validatedFields = SaveGradesSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const supabase = await createClient();

    const upsertPayload = validatedFields.data.records.map(record => ({
    assessment_id: validatedFields.data.assessment_id,
    student_id: record.student_id,
    score: record.score,
    remarks: record.feedback || '',
    graded_by: validatedFields.data.gradedBy,
  }));

  const { error } = await supabase
    .from('grades')
    .upsert(upsertPayload, { onConflict: 'assessment_id, student_id' });

  if (error) {
    console.error(error);
    return { success: false, message: "Database update failed: " + error.message };
  }
  
  // Mark assessment as Graded
  await supabase
    .from('assessments')
    .update({ status: 'Graded' })
    .eq('id', validatedFields.data.assessment_id);

  await logAudit('GRADES_SAVED', validatedFields.data.gradedBy, {
    assessment_id: validatedFields.data.assessment_id,
    recordsCount: upsertPayload.length,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: "Grades saved successfully." };
}

export async function runPublicationsMigration(): Promise<boolean> {
  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminClient = createAdminClient();
  const sql = `
    CREATE TABLE IF NOT EXISTS report_card_publications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      class_name TEXT NOT NULL,
      term TEXT NOT NULL,
      is_published BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(student_id, term)
    );
  `;
  try {
    const { error } = await adminClient.rpc('exec_sql', { sql_string: sql });
    if (error) {
       console.warn("Migration warning (exec_sql):", error);
    }
    return true;
  } catch (err) {
    console.warn("Migration error:", err);
    return false;
  }
}

export async function publishReportCard(studentId: string, className: string, term: string, isPublished: boolean): Promise<boolean> {
  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminClient = createAdminClient();
  try {
    await adminClient
      .from('grades')
      .delete()
      .eq('student_id', studentId)
      .eq('term', term)
      .is('subject_id', null);

    if (isPublished) {
      const { error } = await adminClient
        .from('grades')
        .insert({
          student_id: studentId,
          subject_id: null,
          academic_year: '2025-2026',
          term: term,
          score: 1,
          score_max: 1,
          remarks: 'PUBLICATION_RECORD'
        });
      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.error("Error setting publish status:", err);
    return false;
  }
}

export async function publishClassReportCards(className: string, term: string, studentIds: string[], isPublished: boolean): Promise<boolean> {
  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminClient = createAdminClient();
  try {
    await adminClient
      .from('grades')
      .delete()
      .in('student_id', studentIds)
      .eq('term', term)
      .is('subject_id', null);

    if (isPublished) {
      const payload = studentIds.map(sid => ({
        student_id: sid,
        subject_id: null,
        academic_year: '2025-2026',
        term: term,
        score: 1,
        score_max: 1,
        remarks: 'PUBLICATION_RECORD'
      }));
      const { error } = await adminClient
        .from('grades')
        .insert(payload);
      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.error("Error publishing class report cards:", err);
    return false;
  }
}

export async function createAssessmentAndQuestionsAction(assessmentData: any, questions?: any[]) {
  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminClient = createAdminClient();

  const { subject, grade, due_date, date, questions: _questions, teacher_id: _teacher_id, type: _type, total_marks: _total_marks, ...mainData } = assessmentData;
  
  let subject_id = null;
  let class_id = null;
  
  if (subject) {
    const { data: sData } = await adminClient.from('subjects').select('id').ilike('name', subject).maybeSingle();
    if (sData) subject_id = sData.id;
  }
  
  if (grade) {
    const { data: cData } = await adminClient.from('classes').select('id').ilike('name', grade).maybeSingle();
    if (cData) class_id = cData.id;
  }

  const computed_total_marks = questions && questions.length > 0
    ? questions.reduce((acc: number, q: any) => acc + (Number(q.marks) || Number(q.points) || 5), 0)
    : (_total_marks || 5);

  const payload = {
    ...mainData,
    subject_id,
    class_id,
    date: due_date || date,
    status: mainData.status || 'upcoming'
  };

  const { data: assessmentDb, error: assessmentError } = await adminClient
    .from('assessments')
    .insert([payload])
    .select()
    .single();

  const assessment = assessmentDb ? { ...assessmentDb, total_marks: computed_total_marks } : null;

  if (assessmentError) {
    console.error("Assessment creation error:", assessmentError);
    return { success: false, error: assessmentError.message };
  }

  if (questions && questions.length > 0) {
    const questionsWithId = questions.map((q: any, idx: number) => ({
      assessment_id: assessment.id,
      question: q.text || q.question,
      type: q.type,
      options: q.options ? JSON.stringify(q.options) : null,
      correct_answer: q.correct_answers ? JSON.stringify(q.correct_answers) : q.correct_answer,
      points: q.marks || q.points,
      order: idx + 1
    }));
    
    let { error: questionsError } = await adminClient
      .from('assessment_questions')
      .insert(questionsWithId);
      
    if (questionsError && questionsError.code === '42P01') {
      questionsError = (await adminClient.from('questions').insert(questionsWithId)).error;
    }
      
    if (questionsError) {
      console.error("Questions insert error:", questionsError);
      await adminClient.from('assessments').delete().eq('id', assessment.id);
      return { success: false, error: questionsError.message };
    }
  }

  try {
    const { logAudit } = await import('./audit');
    await logAudit('ASSESSMENT_CREATED', mainData.createdBy || mainData.teacher_id, {
      assessment_id: assessment.id,
      title: assessment.title,
      grade: assessment.grade || grade,
      timestamp: new Date().toISOString()
    });
  } catch(e) {}
  
  return { success: true, data: assessment };
}

export async function submitAssessmentAction(submissionData: {
  assessment_id: string;
  student_id: string;
  answers: Record<string, any>;
}) {
  try {
    const { assessment_id, student_id, answers } = submissionData;

    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient();

    // 1. Fetch questions securely from server side
    let { data: questions, error: questionsError } = await adminClient
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessment_id)
      .order('order', { ascending: true });
      
    if (questionsError && questionsError.code === '42P01') {
      const res = await adminClient.from('questions').select('*').eq('assessment_id', assessment_id).order('id', { ascending: true });
      questions = res.data;
      questionsError = res.error as any;
    }
    
    if (questionsError) {
      return { success: false, message: "Failed to load questions: " + questionsError.message };
    }

    // 2. Calculate Score
    let score = 0;
    let totalMarks = 0;

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

    mappedQuestions.forEach(q => {
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

    // 3. Determine if manual grading / review is needed
    const hasShortAnswer = mappedQuestions.some(q => q.type === 'short_answer');
    const submissionStatus = hasShortAnswer ? 'completed' : 'graded';

    // 4. Save Submission using adminClient so score can't be tampered with
    const { data: existing } = await adminClient
      .from('submissions')
      .select('id')
      .eq('assessment_id', assessment_id)
      .eq('student_id', student_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let saveReaponse;
    if (existing) {
      saveReaponse = await adminClient
        .from('submissions')
        .update({
          answers,
          score,
          status: submissionStatus
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      saveReaponse = await adminClient
        .from('submissions')
        .insert([{
          assessment_id,
          student_id,
          answers,
          score,
          status: submissionStatus
        }])
        .select()
        .single();
    }

    const { data, error } = saveReaponse;

    if (error) {
      console.error("Submission save error:", error);
      return { success: false, message: "Database insert failed: " + error.message };
    }

    // 4. Log Audit Trail
    try {
      const { logAudit } = await import('./audit');
      const { data: studentProfile } = await adminClient
        .from('students')
        .select('user_id')
        .eq('id', student_id)
        .single();
      if (studentProfile) {
        await logAudit('ASSESSMENT_SUBMITTED', studentProfile.user_id, {
          assessment_id,
          student_id,
          score,
          total_marks: totalMarks
        });
      }
    } catch (e) {
      console.error("Failed to log audit:", e);
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Error in submitAssessmentAction:", err);
    return { success: false, message: err.message || "Failed to submit assessment" };
  }
}

export async function updateSubmissionAction(
  submissionId: string, 
  updateData: { answers?: Record<string, any>, status?: string }
) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient();

    // Pick only safe fields to update (exclude score/total_marks/etc.)
    const safeData: any = {};
    if (updateData.answers !== undefined) safeData.answers = updateData.answers;
    if (updateData.status !== undefined) safeData.status = updateData.status;

    // Perform update
    const { data, error } = await adminClient
      .from('submissions')
      .update(safeData)
      .eq('id', submissionId)
      .select()
      .single();

    if (error) {
      console.error("Submission update error:", error);
      return { success: false, message: "Database update failed: " + error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Error in updateSubmissionAction:", err);
    return { success: false, message: err.message || "Failed to update submission" };
  }
}

export async function saveManualScoresAction(
  submissionId: string,
  manualScores: Record<string, number>,
  gradedBy: string
) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient();
    
    // 1. Fetch submission
    const { data: submission, error: subError } = await adminClient
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();
      
    if (subError || !submission) {
      return { success: false, message: "Submission not found" };
    }
    
    // 2. Fetch assessment questions
    let { data: questions, error: qError } = await adminClient
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', submission.assessment_id);
      
    if (qError && qError.code === '42P01') {
      const res = await adminClient.from('questions').select('*').eq('assessment_id', submission.assessment_id);
      questions = res.data;
    }
    
    const answers = submission.answers || {};
    answers._manual_scores = { ...(answers._manual_scores || {}), ...manualScores };
    
    // 3. Recompute score
    let score = 0;
    (questions || []).forEach((q: any) => {
      const qId = q.id;
      const studentAnswer = answers[qId];
      const points = q.points || q.marks || 1;
      
      if (answers._manual_scores?.[qId] !== undefined) {
        score += Number(answers._manual_scores[qId]);
      } else if (studentAnswer !== undefined && studentAnswer !== null) {
        // Auto-grade logic fallback
        const correctAns = typeof q.correct_answer === 'string' && q.correct_answer.startsWith('[') ? JSON.parse(q.correct_answer) : q.correct_answer;
        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          if (String(studentAnswer) === String(correctAns)) score += points;
        } else if (q.type === 'multiple_response') {
          const studentAnswers = Array.isArray(studentAnswer) ? studentAnswer : [];
          const correctAnswers = Array.isArray(correctAns) ? correctAns : [];
          const isCorrect = correctAnswers.length === studentAnswers.length && 
                            correctAnswers.every((a: string) => studentAnswers.includes(a));
          if (isCorrect) score += points;
        } else if (q.type === 'short_answer') {
          if (String(studentAnswer).trim().toLowerCase() === String(correctAns).trim().toLowerCase()) score += points;
        }
      }
    });
    
    const { data, error } = await adminClient
      .from('submissions')
      .update({ answers, score })
      .eq('id', submissionId)
      .select()
      .single();
      
    if (error) throw error;
    
    try {
      const { logAudit } = await import('./audit');
      await logAudit('SUBMISSION_MANUALLY_GRADED', gradedBy, {
        submission_id: submissionId,
        assessment_id: submission.assessment_id,
        score
      });
    } catch (ae) {}
    
    return { success: true, data };
  } catch (err: any) {
    console.error(err);
    return { success: false, message: err.message || "Failed to save grades" };
  }
}

export async function deleteSubmissionAction(submissionId: string, deletedBy: string) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient();
    
    const { data: submission } = await adminClient
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();
      
    if (submission) {
      const { error } = await adminClient
        .from('submissions')
        .delete()
        .eq('assessment_id', submission.assessment_id)
        .eq('student_id', submission.student_id);
        
      if (error) throw error;
      
      try {
        const { logAudit } = await import('./audit');
        await logAudit('SUBMISSION_RESET_RETAKE', deletedBy, {
          submission_id: submissionId,
          assessment_id: submission.assessment_id,
          student_id: submission.student_id
        });
      } catch (ae) {}
    }
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { success: false, message: err.message || "Failed to reset submission" };
  }
}

export async function extendAssessmentDurationAction(assessmentId: string, additionalMinutes: number, extendedBy: string) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient();
    
    const { data: assessment, error: fetchErr } = await adminClient
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();
      
    if (fetchErr || !assessment) {
      return { success: false, message: "Assessment not found" };
    }
    
    const newDuration = Number(assessment.duration || 0) + additionalMinutes;
    
    const { error } = await adminClient
      .from('assessments')
      .update({ duration: newDuration })
      .eq('id', assessmentId);
      
    if (error) throw error;
    
    try {
      const { logAudit } = await import('./audit');
      await logAudit('ASSESSMENT_DURATION_EXTENDED', extendedBy, {
        assessment_id: assessmentId,
        additional_minutes: additionalMinutes,
        new_duration: newDuration
      });
    } catch (ae) {}
    
    return { success: true, newDuration };
  } catch (err: any) {
    console.error(err);
    return { success: false, message: err.message || "Failed to extend time" };
  }
}

