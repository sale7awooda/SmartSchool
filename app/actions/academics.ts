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

