import { supabase } from '@/lib/supabase/client';

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


export async function resetDatabase(keepUsers: boolean = true) {
  const tables = [
    'audit_logs', 'attendance', 'behavior_records', 'timeline_records', 'submissions', 
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

