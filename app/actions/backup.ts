'use server';

import { createAdminClient } from '@/lib/supabase/server';

const EXCLUDED_TABLES = ['schema_migrations', 'audit_log_entries', 'push_subscriptions'];

const TABLE_ORDER = [
  'schools', 'users', 'students', 'parents', 'parent_student',
  'classes', 'subjects', 'academic_years', 'courses',
  'bus_routes', 'bus_stops', 'student_transport',
  'fee_structures', 'fee_invoices', 'fee_payments',
  'inventory', 'books',
  'assessments', 'assessment_questions', 'questions',
  'grades',
  'attendance', 'staff_attendance',
  'visitors', 'notices', 'broadcasts',
  'messages', 'chat_participants',
  'medical_records', 'behavior_records',
  'timeline_events', 'timeline_records',
  'exams', 'exam_results',
  'system_settings', 'leave_requests',
];

export async function backupDatabaseAction() {
  try {
    const supabase = await createAdminClient();

    const { data: tables, error: tablesError } = await supabase
      .rpc('get_backup_tables');

    let tableNames: string[] = [];
    if (!tablesError && tables) {
      tableNames = tables;
    } else {
      const { data: fallback } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');
      tableNames = (fallback || []).map((t: any) => t.table_name);
    }

    const backup: Record<string, any[]> = {};
    const tablesToBackup = TABLE_ORDER.filter(t => !EXCLUDED_TABLES.includes(t));

    for (const table of tablesToBackup) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('id', { ascending: true });

      if (!error && data) {
        backup[table] = data;
      }
    }

    return {
      success: true,
      data: { timestamp: new Date().toISOString(), tables: backup },
    };
  } catch (error: any) {
    console.error('Backup error:', error);
    return { success: false, error: error.message };
  }
}

export async function restoreDatabaseAction(backupData: { timestamp: string; tables: Record<string, any[]> }) {
  try {
    const supabase = await createAdminClient();

    for (const table of TABLE_ORDER) {
      const rows = backupData.tables?.[table];
      if (!rows || rows.length === 0) continue;

      const BATCH_SIZE = 50;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from(table)
          .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

        if (error) {
          console.warn(`Restore warning on ${table} batch ${i}: ${error.message}`);
        }
      }
    }

    return { success: true, restoredTables: Object.keys(backupData.tables).filter(t => backupData.tables[t]?.length > 0) };
  } catch (error: any) {
    console.error('Restore error:', error);
    return { success: false, error: error.message };
  }
}
