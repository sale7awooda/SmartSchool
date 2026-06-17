import { supabase } from '@/lib/supabase/client';

// Operations moved to server actions (app/actions/settings.ts) for RLS bypass

export async function seedDatabase(demoData: any) {
  const { 
    MOCK_ACADEMIC_YEARS, MOCK_CLASSES, MOCK_SUBJECTS, MOCK_EXAMS,
    MOCK_INVENTORY, MOCK_NOTICES, MOCK_BUS_ROUTES
  } = demoData;

  // Helper to safely upsert
  const safeUpsert = async (table: string, data: any[], conflictColumn: string = 'id') => {
    if (!data || data.length === 0) return;
    const { error } = await supabase.from(table).upsert(data, { onConflict: conflictColumn });
    if (error) console.error(`Error seeding ${table}:`, error);
  };

  // Helper to convert mock string IDs to UUIDs
  const toUUID = (id: string, prefix: string = '') => {
    if (!id) return null;
    let hash = 0;
    const str = prefix + id;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(12, '0');
    return `00000000-0000-4000-8000-${hex}`;
  };

  console.log("Seeding base entities...");
  await safeUpsert('academic_years', MOCK_ACADEMIC_YEARS.map((y: any) => ({
    id: toUUID(y.id),
    name: y.name,
    start_date: y.startDate || y.start_date || '2025-09-01',
    end_date: y.endDate || y.end_date || '2026-06-30',
    is_active: y.status === 'Active' || y.is_active
  })));

  await safeUpsert('subjects', MOCK_SUBJECTS.map((s: any) => ({
    id: toUUID(s.id),
    name: s.name
  })));

  await safeUpsert('classes', MOCK_CLASSES.map((c: any) => ({
    id: toUUID(c.id),
    name: c.name,
    academic_year_id: toUUID(MOCK_ACADEMIC_YEARS[0].id)
  })));

  await safeUpsert('notices', MOCK_NOTICES.map((n: any) => ({
    id: toUUID(n.id),
    title: n.title,
    content: n.content
  })));

  console.log("Generating 100 students and their records for the past 4 months...");
  const students = [];
  const attendance = [];
  const behavior = [];
  const timeline = [];
  const submissions = [];

  const now = new Date();
  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(now.getMonth() - 4);

  const firstNames = ['Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Ava', 'Elijah', 'Charlotte', 'William', 'Sophia', 'James', 'Amelia', 'Benjamin', 'Isabella', 'Lucas', 'Mia'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor'];

  for (let i = 1; i <= 100; i++) {
    const sId = `STU${i.toString().padStart(3, '0')}`;
    const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
    const gradeVal = 1 + Math.floor(Math.random() * 10);
    const uuid = toUUID(sId);

    students.push({
      id: uuid,
      name: `${fname} ${lname}`,
      grade: `Grade ${gradeVal}`,
      roll_number: i.toString(),
      dob: `201${Math.floor(Math.random()*5)}-0${1+Math.floor(Math.random()*8)}-1${Math.floor(Math.random()*8)}`,
      gender: Math.random() > 0.5 ? 'Male' : 'Female',
      address: `${100 + i} Main St`,
      academic_year: MOCK_ACADEMIC_YEARS.find((y: any) => y.status === 'Active')?.name || '2025-2026'
    });

    timeline.push({
      id: toUUID(`tl_${i}`),
      student_id: uuid,
      date: fourMonthsAgo.toISOString().split('T')[0],
      title: 'Enrolled',
      description: `Started Grade ${gradeVal}`,
      icon: 'calendar'
    });

    // Generate 4 months of attendance (skip weekends randomly approx)
    let d = new Date(fourMonthsAgo);
    while (d <= now) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        if (Math.random() < 0.1) {} // don't add every single day to save inserts, just random updates
        else {
          const rand = Math.random();
          let status = 'present';
          if (rand > 0.95) status = 'absent';
          else if (rand > 0.90) status = 'late';
          
          attendance.push({
             student_id: uuid,
             date: d.toISOString().split('T')[0],
             status: status
          });
        }
      }
      d.setDate(d.getDate() + 1);
    }
  }

  // Batch insert large tables
  await safeUpsert('students', students);

  // 8. Seed Exams
  await safeUpsert('assessments', MOCK_EXAMS.map((e: any) => ({
    id: toUUID(e.id),
    title: e.title,
    subject: e.subject || 'General',
    grade: e.grade || 'Grade 4',
    type: 'exam',
    due_date: e.date ? new Date(e.date).toISOString() : new Date().toISOString()
  })));

  const invoices = [];
  for (const s of students) {
    let d = new Date(fourMonthsAgo);
    while (d <= now) {
      invoices.push({
        id: toUUID(`inv_${s.id}_${d.getMonth()}`),
        student_id: s.id,
        amount: 500,
        due_date: new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString(),
        status: Math.random() > 0.1 ? 'paid' : 'pending',
        description: `Tuition Fee - ${d.toLocaleString('default', { month: 'long' })}`
      });
      d.setMonth(d.getMonth() + 1);
    }
  }
  await safeUpsert('fee_invoices', invoices);

  // Chunk attendance
  const chuckSize = 500;
  for(let i=0; i<attendance.length; i+=chuckSize) {
    await safeUpsert('attendance', attendance.slice(i, i+chuckSize), 'student_id,date');
  }

  await safeUpsert('timeline_events', timeline);

  return { success: true };
}

export async function resetDatabase(schoolId: string, keepUsers: boolean = true) {
  const tables = [
    'audit_logs', 'attendance', 'behavior_records', 'timeline_events', 'submissions',
    'assessments', 'fee_invoices', 'bus_stops', 'bus_routes', 'parent_student', 'student_transport',
    'students', 'classes', 'subjects', 'grades', 'academic_years', 'notices', 'broadcasts', 
    'schedules', 'messages', 'fee_items', 'financials', 'inventory', 'invoices', 
    'leave_requests', 'payslips', 'visitors', 'staff_attendance', 'schedule_drafts'
  ];

  for (const table of tables) {
    try {
      let query = supabase.from(table).delete().eq('school_id', schoolId);
      const { error } = await query;
      if (error) {
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
      const { error } = await supabase.from('users').delete().eq('school_id', schoolId).neq('role', 'admin');
      if (error) console.error('Error resetting users:', error);
    } catch (err) {
      console.error('Unexpected error resetting users:', err);
    }
  }

  return { success: true };
}

// Schedule Management

