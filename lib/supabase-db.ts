import { supabase } from './supabase/client';
import { Student, User, Parent } from './mock-db';

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
      name: studentData.name,
      grade: studentData.grade,
      roll_number: studentData.studentId,
      dob: studentData.dob,
      gender: studentData.gender,
      blood_group: studentData.bloodGroup,
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

export async function getAttendance(date: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', date);
  
  if (error) throw error;
  return data;
}

export async function getStudentAttendance(studentId: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getAttendanceByClass(date: string) {
  // Fetch all students with their grade
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, grade');
    
  if (studentsError) throw studentsError;

  // Fetch attendance for the specific date
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('date', date);
    
  if (attendanceError) throw attendanceError;

  // Group by class (grade)
  const classStats: Record<string, { cls: string, total: number, present: number, status: 'submitted' | 'pending' }> = {};

  students.forEach((student: any) => {
    const className = `${student.grade || 'Unknown'}`;
    if (!classStats[className]) {
      classStats[className] = { cls: className, total: 0, present: 0, status: 'pending' };
    }
    classStats[className].total++;
  });

  attendance.forEach((record: any) => {
    const student = students.find((s: any) => s.id === record.student_id);
    if (student) {
      const className = `${student.grade || 'Unknown'}`;
      if (classStats[className]) {
        classStats[className].status = 'submitted';
        if (record.status === 'present' || record.status === 'late') {
          classStats[className].present++;
        }
      }
    }
  });

  return Object.values(classStats).sort((a, b) => a.cls.localeCompare(b.cls));
}

export async function getAttendanceHistory() {
  // Get all attendance records and group them by date
  const { data, error } = await supabase
    .from('attendance')
    .select('date, status');
    
  if (error) throw error;
  
  // Group by date
  const history: Record<string, { present: number, absent: number, late: number, excused: number }> = {};
  
  data.forEach((record: any) => {
    if (!history[record.date]) {
      history[record.date] = { present: 0, absent: 0, late: 0, excused: 0 };
    }
    
    if (record.status === 'present') history[record.date].present++;
    else if (record.status === 'absent') history[record.date].absent++;
    else if (record.status === 'late') history[record.date].late++;
    else if (record.status === 'excused') history[record.date].excused++;
  });
  
  return Object.entries(history)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPaginatedStaff(page: number = 1, limit: number = 10, search: string = '') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
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
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty staff list.');
      return { data: [], count: 0, totalPages: 0 };
    }
    throw error;
  }
}

export async function getPaginatedInvoices(page: number = 1, limit: number = 10, search: string = '', studentId?: string, status?: string, academicYear?: string) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('fee_invoices')
    .select(`
      *,
      student:students!inner(user:users!inner(name), academic_year)
    `, { count: 'exact' });

  if (academicYear) {
    query = query.eq('student.academic_year', academicYear);
  }

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  if (status && status !== 'all') {
    if (status === 'overdue') {
      query = query.eq('status', 'overdue');
    } else if (status === 'pending') {
      query = query.eq('status', 'pending');
    } else if (status === 'paid') {
      query = query.eq('status', 'paid');
    }
  } else {
    // By default, hide void invoices
    query = query.neq('status', 'void');
  }

  if (search) {
    // Search by student name or invoice ID
    query = query.or(`description.ilike.%${search}%,id.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

export async function createInvoice(invoiceData: any) {
  const { data, error } = await supabase
    .from('fee_invoices')
    .insert([invoiceData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateInvoice(invoiceId: string, updateData: any) {
  const { data, error } = await supabase
    .from('fee_invoices')
    .update(updateData)
    .eq('id', invoiceId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function recordPayment(paymentData: {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  recordedBy: string;
}) {
  // 1. Update the invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('fee_invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: paymentData.paymentMethod
    })
    .eq('id', paymentData.invoiceId)
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // 2. Create the payment record
  const { data: payment, error: paymentError } = await supabase
    .from('fee_payments')
    .insert([{
      invoice_id: paymentData.invoiceId,
      amount: paymentData.amount,
      payment_method: paymentData.paymentMethod,
      reference_number: paymentData.referenceNumber,
      recorded_by: paymentData.recordedBy,
      payment_date: new Date().toISOString()
    }])
    .select()
    .single();

  if (paymentError) throw paymentError;

  return { invoice, payment };
}

export async function getFeeStats(academicYear?: string) {
  let query = supabase
    .from('fee_invoices')
    .select(`
      amount, 
      status,
      student:students!inner(academic_year)
    `);
  
  if (academicYear) {
    query = query.eq('student.academic_year', academicYear);
  }

  const { data, error } = await query;
  
  if (error) throw error;

  const stats = {
    collected: 0,
    pending: 0,
    overdue: 0
  };

  data.forEach(inv => {
    if (inv.status === 'paid') {
      stats.collected += Number(inv.amount);
    } else if (inv.status === 'pending') {
      stats.pending += Number(inv.amount);
    } else if (inv.status === 'overdue') {
      stats.overdue += Number(inv.amount);
    }
  });

  return stats;
}

export async function getFeeItems() {
  const { data, error } = await supabase
    .from('fee_items')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function createFeeItem(item: any) {
  const { data, error } = await supabase
    .from('fee_items')
    .insert([item])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateFeeItem(id: string, item: any) {
  const { data, error } = await supabase
    .from('fee_items')
    .update(item)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteFeeItem(id: string) {
  const { error } = await supabase
    .from('fee_items')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
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

export async function saveAttendance(attendanceData: any[]) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(attendanceData, { onConflict: 'student_id,date' });
  
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

export async function getPaginatedVisitors(page: number = 1, limit: number = 10, search: string = '') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('visitors')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,host.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    data,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

export async function createVisitor(visitorData: any) {
  const { data, error } = await supabase
    .from('visitors')
    .insert([visitorData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getPaginatedMedicalRecords(page: number = 1, limit: number = 10, search: string = '') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('medical_records')
    .select(`
      *,
      student:students(name, grade)
    `, { count: 'exact' });

  if (search) {
    query = query.ilike('student.name', `%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    data,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

export async function createMedicalRecord(recordData: any) {
  const { data, error } = await supabase
    .from('medical_records')
    .insert([recordData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getPaginatedInventory(page: number = 1, limit: number = 10, search: string = '') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('inventory')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    data,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

export async function createInventoryItem(itemData: any) {
  const { data, error } = await supabase
    .from('inventory')
    .insert([itemData])
    .select()
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

export async function updateUserRole(userId: string, role: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();
  
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

export async function getAttendanceStats(academicYear?: string) {
  // In a real app, this would aggregate data from attendance table
  return {
    avgAttendance: 94.8,
    patterns: [
      { week: 'Week 1', present: 95, absent: 5, late: 2 },
      { week: 'Week 2', present: 94, absent: 6, late: 3 },
      { week: 'Week 3', present: 92, absent: 8, late: 4 },
      { week: 'Week 4', present: 96, absent: 4, late: 1 },
      { week: 'Week 5', present: 97, absent: 3, late: 2 },
      { week: 'Week 6', present: 93, absent: 7, late: 5 },
    ]
  };
}

export async function getFinancialStats(academicYear?: string) {
  // In a real app, this would aggregate data from fee_invoices and fee_payments tables
  return {
    ytdRevenue: 768000,
    health: [
      { month: 'Sep', revenue: 120000, expenses: 95000 },
      { month: 'Oct', revenue: 125000, expenses: 98000 },
      { month: 'Nov', revenue: 118000, expenses: 92000 },
      { month: 'Dec', revenue: 130000, expenses: 105000 },
      { month: 'Jan', revenue: 140000, expenses: 96000 },
      { month: 'Feb', revenue: 135000, expenses: 99000 },
    ]
  };
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

export async function createStaff(staffData: any) {
  const id = staffData.id || crypto.randomUUID();
  const { data, error } = await supabase.from('users').insert({
    id,
    ...staffData,
    created_at: new Date().toISOString()
  }).select().single();
  if (error) throw error;
  return data;
}

// HR Functions
export async function getLeaveRequests() {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, staff:users(name)')
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === 'PGRST205') return []; // Table doesn't exist yet
    throw error;
  }
  return data.map((l: any) => ({ ...l, staff: l.staff?.name }));
}

export async function createLeaveRequest(leaveData: any) {
  const { data, error } = await supabase.from('leave_requests').insert(leaveData).select().single();
  if (error) throw error;
  return data;
}

export async function updateLeaveRequestStatus(id: string, status: string) {
  const { data, error } = await supabase.from('leave_requests').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getPayslips() {
  const { data, error } = await supabase
    .from('payslips')
    .select('*, staff:users(name)')
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === 'PGRST205') return [];
    throw error;
  }
  return data.map((p: any) => ({ ...p, staff: p.staff?.name }));
}

export async function createPayslip(payslipData: any) {
  const { data, error } = await supabase.from('payslips').insert(payslipData).select().single();
  if (error) throw error;
  return data;
}

export async function getFinancials() {
  const { data, error } = await supabase
    .from('financials')
    .select('*, staff:users(name)')
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === 'PGRST205') return [];
    throw error;
  }
  return data.map((f: any) => ({ ...f, staff: f.staff?.name }));
}

export async function createFinancial(financialData: any) {
  const { data, error } = await supabase.from('financials').insert(financialData).select().single();
  if (error) throw error;
  return data;
}

export async function getSystemSettings() {
  try {
    const { data, error } = await supabase.from('system_settings').select('*').single();
    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message.includes('relation "system_settings" does not exist')) {
        // Fallback to localStorage or defaults
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('SYSTEM_SETTINGS');
          if (saved) return JSON.parse(saved);
        }
        return {
          school_name: 'Smart School',
          school_address: '123 Education Lane, Learning City',
          school_phone: '+1 (555) 012-3456',
          school_email: 'info@smartschool.edu',
          grading_scale: 'Standard (A-F)',
          theme_color: 'indigo',
          font_family: 'Inter (Default)',
          compact_design: false,
          enable_online_registration: true,
          maintenance_mode: false,
          automatic_attendance: false,
          enable_sms: false
        };
      }
      throw error;
    }
    return data;
  } catch (error: any) {
    // Handle "Failed to fetch" which happens when the Supabase URL is invalid/placeholder
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Falling back to local settings.');
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('SYSTEM_SETTINGS');
        if (saved) return JSON.parse(saved);
      }
      return {
        school_name: 'Smart School',
        school_address: '123 Education Lane, Learning City',
        school_phone: '+1 (555) 012-3456',
        school_email: 'info@smartschool.edu',
        grading_scale: 'Standard (A-F)',
        theme_color: 'indigo',
        font_family: 'Inter (Default)',
        compact_design: false,
        enable_online_registration: true,
        maintenance_mode: false,
        automatic_attendance: false,
        enable_sms: false
      };
    }
    throw error;
  }
}

export async function updateSystemSettings(settings: any) {
  // Use a fixed ID for single row settings
  const { data, error } = await supabase.from('system_settings').upsert({ id: 1, ...settings }).select().single();
  
  if (error && (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message.includes('relation "system_settings" does not exist'))) {
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('SYSTEM_SETTINGS', JSON.stringify(settings));
    }
    return settings;
  }
  
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

  // Helper to convert mock string IDs to UUIDs
  const toUUID = (id: string) => {
    if (!id) return null;
    // Simple hash to UUID format
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(12, '0');
    return `00000000-0000-4000-8000-${hex}`;
  };

  // 1. Seed Users - SKIPPED due to auth.users foreign key constraint
  // 2. Seed Parents - SKIPPED due to auth.users foreign key constraint

  // 3. Seed Students
  await safeUpsert('students', MOCK_STUDENTS.map((s: any) => ({
    id: toUUID(s.id),
    name: s.name,
    grade: s.grade,
    roll_number: s.rollNumber || s.studentId,
    dob: s.dob,
    gender: s.gender || 'Other',
    address: s.address || 'Unknown',
    academic_year: MOCK_ACADEMIC_YEARS[0].name
  })));

  // 4. Seed Notices
  await safeUpsert('notices', MOCK_NOTICES.map((n: any) => ({
    id: toUUID(n.id),
    title: n.title,
    content: n.content,
    target_audience: n.targetAudience || 'all',
    is_important: n.isImportant || false
  })));

  // 5. Seed Academic Years
  await safeUpsert('academic_years', MOCK_ACADEMIC_YEARS.map((y: any) => ({
    id: toUUID(y.id),
    name: y.name,
    start_date: y.startDate,
    end_date: y.endDate,
    is_active: y.status === 'Active'
  })));

  // 6. Seed Subjects
  await safeUpsert('subjects', MOCK_SUBJECTS.map((s: any) => ({
    id: toUUID(s.id),
    name: s.name,
    code: s.code || s.name.substring(0, 3).toUpperCase(),
    description: s.description || ''
  })));

  // 7. Seed Classes
  await safeUpsert('classes', MOCK_CLASSES.map((c: any) => ({
    id: toUUID(c.id),
    name: c.name,
    grade: c.grade,
    section: c.section,
    academic_year_id: toUUID(MOCK_ACADEMIC_YEARS[0].id)
  })));

  // 8. Seed Exams
  await safeUpsert('assessments', MOCK_EXAMS.map((e: any) => ({
    id: toUUID(e.id),
    title: e.title,
    subject: e.subject || 'General',
    grade: e.grade || 'Grade 4',
    type: 'exam',
    due_date: e.date ? new Date(e.date).toISOString() : new Date().toISOString()
  })));

  // 9. Seed Attendance
  await safeUpsert('attendance', MOCK_ATTENDANCE.map((a: any) => ({
    student_id: toUUID(a.student_id),
    date: a.date,
    status: a.status.toLowerCase()
  })), 'student_id,date');

  // 10. Seed Books - SKIPPED (Library module removed)

  // 11. Seed Invoices
  await safeUpsert('fee_invoices', MOCK_INVOICES?.map((i: any) => ({
    id: toUUID(i.id),
    student_id: toUUID(i.student_id),
    amount: i.amount,
    due_date: i.due_date,
    status: i.status.toLowerCase(),
    description: i.description
  })) || []);

  // 12. Seed Parent-Student Links - SKIPPED due to users foreign key constraint
  
  return { success: true };
}

export async function getNotices() {
  try {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notices:', error);
      return [];
    }

    return data;
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty notices list.');
      return [];
    }
    throw error;
  }
}

export async function createNotice(noticeData: any) {
  const { data, error } = await supabase
    .from('notices')
    .insert([noticeData])
    .select()
    .single();

  if (error) {
    console.error('Error creating notice:', error);
    throw error;
  }

  return data;
}

export async function getMessages(userId: string, otherUserId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data;
}

export async function sendMessage(messageData: any) {
  const { data, error } = await supabase
    .from('messages')
    .insert([messageData])
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }

  return data;
}

export async function getUsersForChat() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role');

  if (error) {
    console.error('Error fetching users for chat:', error);
    return [];
  }

  return data;
}

export async function getSchedules(classId?: string, academicYear?: string) {
  try {
    let query = supabase
      .from('schedules')
      .select(`
        *,
        teacher:users(name)
      `);

    if (classId) {
      query = query.eq('class_id', classId);
    }

    // academic_year column does not exist on schedules table
    /*
    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }
    */

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty schedules list.');
      return [];
    }
    throw error;
  }
}

export async function saveSchedule(scheduleData: any) {
  const { data, error } = await supabase
    .from('schedules')
    .upsert(scheduleData, { onConflict: 'class_id,day_of_week,period' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function resetDatabase(keepUsers: boolean = true) {
  const tables = [
    'attendance', 'behavior_records', 'timeline_records', 'submissions', 
    'assessments', 'fee_invoices', 'bus_stops', 'bus_routes', 
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

// Schedule Management
export async function getTeachers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'teacher');
    
    if (error) throw error;
    return data as User[];
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty teachers list.');
      return [];
    }
    throw error;
  }
}

export async function saveScheduleDraft(draft: { name: string, constraints: any, mappings: any, schedule: any, academic_year?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('schedule_drafts')
    .upsert({
      name: draft.name,
      constraints: draft.constraints,
      mappings: draft.mappings,
      schedule: draft.schedule,
      // academic_year: draft.academic_year, // column does not exist
      created_by: user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'name' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getScheduleDrafts(academicYear?: string) {
  try {
    let query = supabase
      .from('schedule_drafts')
      .select('*')
      .order('updated_at', { ascending: false });

    // academic_year column does not exist on schedule_drafts table
    /*
    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }
    */

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty drafts list.');
      return [];
    }
    throw error;
  }
}

export async function deleteScheduleDraft(id: string) {
  const { error } = await supabase
    .from('schedule_drafts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function publishSchedule(scheduleItems: any[], academicYear: string) {
  // First, clear existing schedule
  // academic_year column does not exist on schedules table
  const { error: deleteError } = await supabase
    .from('schedules')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all for now since we can't filter by year

  if (deleteError) throw deleteError;

  const { data, error } = await supabase
    .from('schedules')
    .insert(scheduleItems.map(item => {
      const { academic_year, ...rest } = item;
      return rest;
    }));

  if (error) throw error;
  return data;
}
