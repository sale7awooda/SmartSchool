'use server';

import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logAudit } from './audit';

const MasterEntitySchema = z.object({
  type: z.enum(['year', 'class', 'subject']),
  name: z.string().min(1, "Name is required"),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  createdBy: z.string().uuid("Invalid user ID")
});

export type MasterEntityActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function processCreateMasterEntityAction(
  prevState: MasterEntityActionState,
  formData: FormData
): Promise<MasterEntityActionState> {
  const rawData = {
    type: formData.get('type') as string,
    name: formData.get('name') as string,
    startDate: formData.get('startDate') as string | undefined,
    endDate: formData.get('endDate') as string | undefined,
    createdBy: formData.get('createdBy') as string,
  };

  const validatedFields = MasterEntitySchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { type, name, startDate, endDate, createdBy } = validatedFields.data;
  const adminClient = createAdminClient();

  let tableName = '';
  let payload: any = { name };

  if (type === 'year') {
    tableName = 'academic_years';
    payload.is_active = false;
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
  } else if (type === 'class') {
    tableName = 'classes';
  } else if (type === 'subject') {
    tableName = 'subjects';
  }

  const { error } = await adminClient
    .from(tableName)
    .insert([payload]);

  if (error) {
    console.error(error);
    return { success: false, message: `Failed to create ${type}: ${error.message}` };
  }

  await logAudit('MASTER_DATA_CREATED', createdBy, {
    entity_type: type,
    entity_name: name,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully.` };
}

const UpdateMasterEntitySchema = z.object({
  type: z.enum(['year', 'class', 'subject']),
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  payload: z.string(), // JSON string for other specific fields
  updatedBy: z.string().uuid("Invalid user ID")
});

export async function processUpdateMasterEntityAction(
  prevState: MasterEntityActionState,
  formData: FormData
): Promise<MasterEntityActionState> {
  const rawData = {
    type: formData.get('type') as string,
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    payload: formData.get('payload') as string,
    updatedBy: formData.get('updatedBy') as string,
  };

  const validatedFields = UpdateMasterEntitySchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { type, id, name, payload, updatedBy } = validatedFields.data;
  const adminClient = createAdminClient();

  let tableName = '';
  let parsedPayload = {};
  try {
    parsedPayload = JSON.parse(payload);
  } catch (e) {
    return { success: false, message: "Invalid payload format" };
  }

  const updateData: { name: string; is_active?: boolean; [key: string]: any } = { name, ...parsedPayload };

  if (type === 'year') {
    tableName = 'academic_years';
    
    // If activating a year, deactivate others first
    if (updateData.is_active) {
      await adminClient.from(tableName).update({ is_active: false }).neq('id', id);
    }
  } else if (type === 'class') {
    tableName = 'classes';
  } else if (type === 'subject') {
    tableName = 'subjects';
  }

  const { data, error } = await adminClient
    .from(tableName)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return { success: false, message: `Failed to update ${type}: ${error.message}` };
  }

  await logAudit('MASTER_DATA_UPDATED', updatedBy, {
    entity_type: type,
    entity_name: name,
    entity_id: id,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully.` };
}

const DeleteMasterEntitySchema = z.object({
  type: z.string(),
  id: z.string(),
  name: z.string(),
  deletedBy: z.string().uuid("Invalid user ID")
});

export async function processDeleteMasterEntityAction(
  prevState: MasterEntityActionState,
  formData: FormData
): Promise<MasterEntityActionState> {
  const rawData = {
    type: formData.get('type') as string,
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    deletedBy: formData.get('deletedBy') as string,
  };

  const validatedFields = DeleteMasterEntitySchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { type, id, name, deletedBy } = validatedFields.data;
  const adminClient = createAdminClient();

  let tableName = '';
  if (type === 'year') tableName = 'academic_years';
  else if (type === 'class') tableName = 'classes';
  else if (type === 'subject') tableName = 'subjects';

  const { error } = await adminClient
    .from(tableName)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    return { success: false, message: `Failed to delete ${type}: ${error.message}` };
  }

  await logAudit('MASTER_DATA_DELETED', deletedBy, {
    entity_type: type,
    entity_name: name,
    entity_id: id,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.` };
}

export async function seedDatabaseAction(demoData: any) {
  const adminClient = createAdminClient();

  const { 
    MOCK_ACADEMIC_YEARS, MOCK_CLASSES, MOCK_SUBJECTS, MOCK_EXAMS,
    MOCK_INVENTORY, MOCK_NOTICES, MOCK_BUS_ROUTES
  } = demoData;

  // Add 2025-2026 academic year to mock if not exists
  let acYears = MOCK_ACADEMIC_YEARS || [];
  if (!acYears.find((y: any) => y.name === '2025-2026')) {
    acYears.push({ id: 'AY2526', name: '2025-2026', startDate: '2025-09-01', endDate: '2026-06-30', status: 'Active' });
  }

  const safeUpsert = async (table: string, data: any[], conflictColumn: string = 'id') => {
    if (!data || data.length === 0) return;
    const { error } = await adminClient.from(table).upsert(data, { onConflict: conflictColumn });
    if (error) console.error(`Error seeding ${table}:`, error);
  };

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

  await safeUpsert('academic_years', acYears.map((y: any) => ({
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
    academic_year_id: toUUID(acYears[0].id)
  })));

  await safeUpsert('notices', MOCK_NOTICES.map((n: any) => ({
    id: toUUID(n.id),
    title: n.title,
    content: n.content
  })));

  const students = [];
  const attendance = [];
  const timeline = [];
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
      academic_year: acYears.find((y: any) => y.status === 'Active' || y.is_active)?.name || '2025-2026'
    });

    timeline.push({
      id: toUUID(`tl_${i}`),
      student_id: uuid,
      date: fourMonthsAgo.toISOString().split('T')[0],
      title: 'Enrolled',
      description: `Started Grade ${gradeVal}`,
      icon: 'calendar'
    });

    let d = new Date(fourMonthsAgo);
    while (d <= now) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        if (Math.random() > 0.1) {
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

  await safeUpsert('students', students);

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

  const chuckSize = 500;
  for(let i=0; i<attendance.length; i+=chuckSize) {
    await safeUpsert('attendance', attendance.slice(i, i+chuckSize), 'student_id,date');
  }

  await safeUpsert('timeline_events', timeline);

  return { success: true };
}

export async function resetDatabaseAction(keepUsers: boolean = true) {
  const adminClient = createAdminClient();
  const tables = [
    'audit_logs', 'attendance', 'behavior_records', 'timeline_events', 'submissions',
    'assessment_questions', 'assessments', 'fee_invoices', 'bus_stops', 'bus_routes', 'parent_student', 'student_transport',
    'students', 'classes', 'subjects', 'grades', 'academic_years', 'notices', 'broadcasts', 
    'schedules', 'messages', 'fee_items', 'financials', 'inventory', 'invoices', 
    'leave_requests', 'payslips', 'visitors', 'staff_attendance', 'schedule_drafts', 'push_subscriptions'
  ];

  for (const table of tables) {
    try {
      const { error } = await adminClient.from(table).delete().not('id', 'is', null);
      if (error && error.code !== 'PGRST205') {
        console.error(`Error resetting ${table}:`, error);
      }
    } catch (err) {
      console.error(`Unexpected error resetting ${table}:`, err);
    }
  }

  if (!keepUsers) {
    try {
      const { error } = await adminClient.from('users').delete().neq('role', 'admin');
      if (error) console.error('Error resetting users:', error);
    } catch (err) {
      console.error('Unexpected error resetting users:', err);
    }
  }

  return { success: true };
}

export async function updateSystemSettingsServerAction(settings: any) {
  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminClient = createAdminClient();
  try {
    const { data: sampleList } = await adminClient.from('system_settings').select('*').limit(1);
    
    let allowedColumns: string[] = ['school_name', 'address', 'phone', 'email'];
    if (sampleList && sampleList.length > 0) {
      allowedColumns = Object.keys(sampleList[0]);
    } else {
      allowedColumns = ['id', 'school_name', 'address', 'phone', 'email'];
    }

    const dbData: Record<string, any> = {};

    if (allowedColumns.includes('school_name') && settings.school_name !== undefined) {
      dbData.school_name = settings.school_name;
    }
    if (allowedColumns.includes('address') && settings.school_address !== undefined) {
      dbData.address = settings.school_address;
    } else if (allowedColumns.includes('school_address') && settings.school_address !== undefined) {
      dbData.school_address = settings.school_address;
    }
    if (allowedColumns.includes('phone') && settings.school_phone !== undefined) {
      dbData.phone = settings.school_phone;
    } else if (allowedColumns.includes('school_phone') && settings.school_phone !== undefined) {
      dbData.school_phone = settings.school_phone;
    }
    if (allowedColumns.includes('email') && settings.school_email !== undefined) {
      dbData.email = settings.school_email;
    } else if (allowedColumns.includes('school_email') && settings.school_email !== undefined) {
      dbData.school_email = settings.school_email;
    }
    if (allowedColumns.includes('logo_url') && settings.logo_url !== undefined) {
      dbData.logo_url = settings.logo_url;
    }
    if (allowedColumns.includes('currency') && settings.currency !== undefined) {
      dbData.currency = settings.currency;
    }

    const otherPossibleDbKeys = [
      'grading_scale', 'theme_color', 'font_family', 'compact_design',
      'enable_online_registration', 'maintenance_mode', 'automatic_attendance', 
      'enable_sms', 'role_permissions', 'vapid_public_key', 'vapid_private_key', 'vapid_subject'
    ];

    otherPossibleDbKeys.forEach(key => {
      if (allowedColumns.includes(key) && settings[key] !== undefined) {
        dbData[key] = settings[key];
      }
    });

    const { data: existing } = await adminClient.from('system_settings').select('id').limit(1).maybeSingle();
    
    let result;
    if (existing?.id) {
      const { data, error } = await adminClient.from('system_settings').update(dbData).eq('id', existing.id).select().maybeSingle();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await adminClient.from('system_settings').insert([dbData]).select().maybeSingle();
      if (error) throw error;
      result = data;
    }

    try {
      const { data: activeSchool } = await adminClient.from('schools').select('id').limit(1).maybeSingle();
      if (activeSchool?.id) {
        const schoolUpdates: any = {};
        if (settings.currency) schoolUpdates.currency = settings.currency;
        if (settings.logo_url) schoolUpdates.logo_url = settings.logo_url;
        
        if (Object.keys(schoolUpdates).length > 0) {
          await adminClient.from('schools').update(schoolUpdates).eq('id', activeSchool.id);
        }
      }
    } catch (scErr) {
      console.warn('Silent warning updating schools settings table server-side:', scErr);
    }

    const mappedResult = result ? {
      ...settings,
      ...result,
      school_address: result.school_address || result.address,
      school_phone: result.school_phone || result.phone,
      school_email: result.school_email || result.email,
    } : settings;

    return { success: true, settings: mappedResult };
  } catch (err: any) {
    console.error('Server error updating settings database:', err);
    return { success: false, error: err.message || String(err) };
  }
}
