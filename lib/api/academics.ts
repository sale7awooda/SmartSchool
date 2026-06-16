import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/types';
import { submitAssessmentAction, updateSubmissionAction } from '@/app/actions/academics';

export async function getPaginatedAssessments(page: number = 1, limit: number = 10, search: string = '', statusFilter: string = 'all') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('assessments')
    .select('*, subject:subjects(name), class:classes(name)', { count: 'exact' })
    .neq('status', 'deleted');

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

  // Inject total_marks manually 
  if (data && data.length > 0) {
    const assessmentIds = data.map(a => a.id).filter(Boolean);
    if (assessmentIds.length > 0) {
      const { data: questionsData } = await supabase
        .from('assessment_questions')
        .select('assessment_id, points')
        .in('assessment_id', assessmentIds);
      if (questionsData) {
        const totalsMap = questionsData.reduce((acc: any, q: any) => {
          acc[q.assessment_id] = (acc[q.assessment_id] || 0) + (Number(q.points) || 5);
          return acc;
        }, {});
        data.forEach(a => {
          if (totalsMap[a.id]) a.total_marks = totalsMap[a.id];
        });
      }
    }
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
    .select('*')
    .neq('status', 'deleted');

  const { data, error } = await query;
  
  if (error) {
     if(error.code === '42703') return [];
     throw error;
  }
  
  // Inject total_marks manually 
  if (data && data.length > 0) {
    const assessmentIds = data.map(a => a.id).filter(Boolean);
    if (assessmentIds.length > 0) {
      const { data: questionsData } = await supabase
        .from('assessment_questions')
        .select('assessment_id, points')
        .in('assessment_id', assessmentIds);
      if (questionsData) {
        const totalsMap = questionsData.reduce((acc: any, q: any) => {
          acc[q.assessment_id] = (acc[q.assessment_id] || 0) + (Number(q.points) || 5);
          return acc;
        }, {});
        data.forEach(a => {
          if (totalsMap[a.id]) a.total_marks = totalsMap[a.id];
        });
      }
    }
  }
  
  return data;
}


export async function createAssessment(assessmentData: any, optionalQuestions?: any[]) {
  const { createAssessmentAndQuestionsAction } = await import('@/app/actions/academics');
  const questions = optionalQuestions || assessmentData.questions;
  if (assessmentData.questions) {
    delete assessmentData.questions;
  }
  const res = await createAssessmentAndQuestionsAction(assessmentData, questions);
  
  if (!res.success) {
    throw new Error(res.error || 'Failed to create assessment and questions');
  }
  
  return res.data;
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
  
  // Deduplicate by student_id so that we only return the latest submission
  if (data && data.length > 0) {
    const latestMap = new Map();
    for (const sub of data) {
      const key = sub.student_id;
      if (!latestMap.has(key)) {
        latestMap.set(key, sub);
      } else {
        const existing = latestMap.get(key);
        // Compare dates or fall back to ID if dates are exactly the same
        const d1 = new Date(sub.created_at || 0).getTime();
        const d2 = new Date(existing.created_at || 0).getTime();
        if (d1 > d2) {
          latestMap.set(key, sub);
        }
      }
    }
    return Array.from(latestMap.values());
  }

  return data;
}


export async function getStudentSubmissions(studentId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      assessment:assessments(*, subject:subjects(name))
    `)
    .eq('student_id', studentId);
  
  if (error) throw error;
  
  if (data && data.length > 0) {
    // Collect all unique assessment IDs
    const assessmentIds = data.map(sub => sub.assessment_id).filter(Boolean);
    
    // Fetch all questions for these assessments to calculate total marks
    if (assessmentIds.length > 0) {
      const { data: questionsData } = await supabase
        .from('assessment_questions')
        .select('assessment_id, points')
        .in('assessment_id', assessmentIds);
        
      if (questionsData) {
        // Map total points per assessment
        const totalsMap = questionsData.reduce((acc: any, q: any) => {
          acc[q.assessment_id] = (acc[q.assessment_id] || 0) + (Number(q.points) || 5);
          return acc;
        }, {});
        
        // Inject total_marks back into the assessment object
        for (const sub of data) {
          if (sub.assessment && totalsMap[sub.assessment_id]) {
            sub.assessment.total_marks = totalsMap[sub.assessment_id];
          }
        }
      }
    }

    const latestMap = new Map();
    for (const sub of data) {
      const key = sub.assessment_id;
      if (!latestMap.has(key)) {
        latestMap.set(key, sub);
      } else {
        const existing = latestMap.get(key);
        const d1 = new Date(sub.created_at || 0).getTime();
        const d2 = new Date(existing.created_at || 0).getTime();
        if (d1 > d2) {
          latestMap.set(key, sub);
        }
      }
    }
    return Array.from(latestMap.values());
  }

  return data;
}


export async function updateSubmission(submissionId: string, updateData: any) {
  const result = await updateSubmissionAction(submissionId, updateData);
  if (!result.success) throw new Error(result.message);
  return result.data;
}


export async function submitAssessment(submissionData: {
  assessment_id: string;
  student_id: string;
  answers: Record<string, any>;
  questions?: any[];
}) {
  const { assessment_id, student_id, answers } = submissionData;
  const result = await submitAssessmentAction({ assessment_id, student_id, answers });
  if (!result.success) throw new Error(result.message);
  return result.data;
}


export async function startAssessmentSubmission(assessmentId: string, studentId: string) {
  const { data: existing, error: checkError } = await supabase
    .from('submissions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('student_id', studentId)
    .limit(1);

  if (checkError) throw checkError;
  if (existing && existing.length > 0) return existing[0];

  const insertPayload: any = {
    assessment_id: assessmentId,
    student_id: studentId,
    answers: {},
    score: 0,
    status: 'in_progress'
  };

  const { data, error } = await supabase
    .from('submissions')
    .insert([insertPayload])
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
    .limit(1);
  
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}


export async function getAcademicStats(academicYear?: string) {
  try {
    const { data: grades } = await supabase
      .from('grades')
      .select('score, student_id, subject_id, created_at, term, subjects(name)')
      .not('remarks', 'eq', 'PUBLICATION_RECORD');
      
    if (!grades || grades.length === 0) {
      return { avgGrade: 0, trends: [], subjects: [], studentAverages: {} };
    }

    const avg = grades.reduce((acc, g) => acc + Number(g.score), 0) / grades.length;

    // Group by subject
    const subjectMap: Record<string, { total: number, count: number }> = {};
    grades.forEach((g: any) => {
      const sName = g.subjects?.name || 'General';
      if (!subjectMap[sName]) subjectMap[sName] = { total: 0, count: 0 };
      subjectMap[sName].total += Number(g.score);
      subjectMap[sName].count += 1;
    });

    const subjectStats = Object.entries(subjectMap).map(([name, data]) => ({
      name,
      avg: Math.round((data.total / data.count) * 10) / 10
    })).sort((a, b) => b.avg - a.avg);

    // Group student averages
    const studentAverages: Record<string, { avg: number; count: number }> = {};
    grades.forEach((g: any) => {
      if (g.student_id) {
        if (!studentAverages[g.student_id]) {
          studentAverages[g.student_id] = { avg: 0, count: 0 };
        }
        studentAverages[g.student_id].avg += Number(g.score) || 0;
        studentAverages[g.student_id].count += 1;
      }
    });

    Object.keys(studentAverages).forEach(sid => {
      const data = studentAverages[sid];
      studentAverages[sid].avg = Math.round((data.avg / data.count) * 10) / 10;
    });

    // Group monthly trends dynamically
    const monthNames = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const monthStatsMap: Record<string, { mathSum: number; mathCount: number; scienceSum: number; scienceCount: number; englishSum: number; englishCount: number; allSum: number; allCount: number }> = {};
    monthNames.forEach(m => {
      monthStatsMap[m] = { mathSum: 0, mathCount: 0, scienceSum: 0, scienceCount: 0, englishSum: 0, englishCount: 0, allSum: 0, allCount: 0 };
    });

    grades.forEach((g: any) => {
      const score = Number(g.score) || 0;
      const sName = (g.subjects?.name || '').toLowerCase();
      
      let mName = '';
      if (g.created_at) {
        const d = new Date(g.created_at);
        mName = d.toLocaleString('en-US', { month: 'short' });
      } else {
        const term = (g.term || '').toLowerCase();
        if (term.includes('term 1') || term.includes('1st')) mName = 'Nov';
        else if (term.includes('term 2') || term.includes('2nd')) mName = 'Feb';
        else mName = 'May';
      }

      if (monthStatsMap[mName]) {
        const stats = monthStatsMap[mName];
        stats.allSum += score;
        stats.allCount += 1;

        if (sName.includes('math')) {
          stats.mathSum += score;
          stats.mathCount += 1;
        } else if (sName.includes('science') || sName.includes('physics') || sName.includes('chemistry') || sName.includes('biology')) {
          stats.scienceSum += score;
          stats.scienceCount += 1;
        } else if (sName.includes('english')) {
          stats.englishSum += score;
          stats.englishCount += 1;
        }
      }
    });

    const displayMonths = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const trends = displayMonths.map(m => {
      const stats = monthStatsMap[m];
      if (stats && stats.allCount > 0) {
        return {
          month: m,
          math: stats.mathCount > 0 ? Math.round(stats.mathSum / stats.mathCount) : 0,
          science: stats.scienceCount > 0 ? Math.round(stats.scienceSum / stats.scienceCount) : 0,
          english: stats.englishCount > 0 ? Math.round(stats.englishSum / stats.englishCount) : 0,
          avg: Math.round(stats.allSum / Math.max(1, stats.allCount))
        };
      }
      return null;
    }).filter(Boolean);

    return {
      avgGrade: Math.round(avg * 10) / 10,
      trends: trends,
      subjects: subjectStats,
      studentAverages: studentAverages
    };
  } catch (e) {
    console.error('Error fetching academic stats:', e);
    return { avgGrade: 0, trends: [], subjects: [], studentAverages: {} };
  }
}


export async function getClasses() {
  try {
    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('is_deleted', false)
      .order('name');
    if (error) throw error;
    
    // Fetch students to count per grade
    const { data: students } = await supabase
      .from('students')
      .select('grade')
      .eq('is_deleted', false);
      
    let finalClasses = classes || [];

    // Ensure all 13 grades exist: ('PRE-K', 'KG1', 'KG2', 'Grade 1'..'Grade 10')
    const defaultGradeNames = [
      'PRE-K', 'KG1', 'KG2',
      ...Array.from({ length: 10 }, (_, i) => `Grade ${i + 1}`)
    ];

    const existingNames = new Set(finalClasses.map((c: any) => c.name.toUpperCase().trim()));
    const missingGrades = defaultGradeNames.filter(name => !existingNames.has(name.toUpperCase().trim()));

    if (missingGrades.length > 0) {
      const inserts = missingGrades.map(name => ({
        name,
        is_deleted: false
      }));
      const { data: inserted, error: insertError } = await supabase
        .from('classes')
        .insert(inserts)
        .select('*');
        
      if (!insertError && inserted) {
        finalClasses = [...finalClasses, ...inserted];
      }
    }
    
    if (finalClasses && finalClasses.length > 0 && students) {
      const counts: Record<string, number> = {};
      students.forEach(s => {
        counts[s.grade] = (counts[s.grade] || 0) + 1;
      });
      finalClasses = finalClasses.map(c => ({
        ...c,
        capacity: counts[c.name] || 0
      }));
    }

    // Sort in incremental order: PRE-K, KG1, KG2, Grade 1 to 10
    const gradeOrder = [
      'PRE-K', 'KG1', 'KG2',
      'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
      'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'
    ];

    finalClasses.sort((a: any, b: any) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      
      const getIndex = (name: string) => {
        const idx = gradeOrder.findIndex(g => g.toLowerCase() === name.trim().toLowerCase());
        if (idx !== -1) return idx;
        const match = name.match(/\d+/);
        if (match) return 100 + parseInt(match[0]);
        return 1000;
      };
      
      return getIndex(nameA) - getIndex(nameB);
    });
    
    return finalClasses;
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
       const defaults = [{ 
         name: '2025-2026', 
         start_date: '2025-09-01',
         end_date: '2026-06-30',
         is_active: true, 
         is_deleted: false 
       }];
       const { data: inserted, error: insertError } = await supabase
        .from('academic_years')
        .insert(defaults)
        .select('*');
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
    options: (() => {
      let opts = q.options;
      for (let i = 0; i < 3; i++) {
        if (typeof opts === 'string') {
          try {
            const parsed = JSON.parse(opts);
            if (parsed !== null && parsed !== undefined) {
              opts = parsed;
            } else {
              break;
            }
          } catch (e) {
            break;
          }
        } else {
          break;
        }
      }
      return Array.isArray(opts) ? opts : null;
    })(),
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
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    
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
  
  const { data: assessmentDb, error: assessmentError } = await supabase
    .from('assessments')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
    
  if (assessmentError) throw assessmentError;

  const assessment = assessmentDb ? { ...assessmentDb, total_marks: computedTotalMarks } : null;
  
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
  // Check if anyone has taken or started the exam
  const { count, error: countError } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', id);

  if (countError) {
    console.warn("Submissions count check error:", countError);
  }

  if (count && count > 0) {
    throw new Error('Cannot delete: Students have already taken or started this assessment. You must reset or delete student submissions first.');
  }

  const { error } = await supabase.from('assessments').update({ status: 'deleted' }).eq('id', id);
  if (error) throw error;
  return true;
}

export async function activateAssessment(id: string) {
  // First, get the current description to avoid clobbering it
  const { data: current } = await supabase
    .from('assessments')
    .select('description')
    .eq('id', id)
    .single();

  const currentDesc = current?.description || '';
  // Remove existing [ActivatedAt: ...] tag if any to avoid duplication
  const cleanDesc = currentDesc.replace(/\[ActivatedAt:\s*[^\]]+\]/gi, '').trim();
  const newDesc = `${cleanDesc}${cleanDesc ? '\n\n' : ''}[ActivatedAt: ${new Date().toISOString()}]`;

  const { error } = await supabase
    .from('assessments')
    .update({ 
      status: 'active',
      description: newDesc
    })
    .eq('id', id);

  if (error) throw error;
  return true;
}
