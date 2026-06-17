import { Client } from 'pg';
import * as fs from 'fs';

const CONNECTION_STRING = process.env.SUPABASE_DB_URL ||
  'postgresql://cli_login_postgres:KBEnlBmhDZrkcDXVgPtRHKRzrZtXGrnH@db.vyzpogfjlyofcejvsilz.supabase.co:5432/postgres';

const RESTORE_ORDER = [
  'schools', 'users', 'students', 'parents', 'parent_student',
  'classes', 'subjects', 'academic_years', 'courses',
  'bus_routes', 'bus_stops', 'student_transport',
  'fee_structures', 'fee_invoices', 'fee_payments',
  'inventory', 'books',
  'assessments', 'assessment_questions', 'questions',
  'grades', 'report_card_publications',
  'attendance', 'staff_attendance',
  'visitors', 'notices', 'broadcasts',
  'messages', 'chat_participants',
  'medical_records', 'behavior_records',
  'timeline_events', 'timeline_records',
  'exams', 'exam_results',
  'system_settings', 'leave_requests',
];

async function restore(filepath: string) {
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();

  const raw = fs.readFileSync(filepath, 'utf-8');
  const backup = JSON.parse(raw);

  console.log(`Restoring from backup created at ${backup.timestamp}\n`);

  for (const table of RESTORE_ORDER) {
    const rows = backup.tables?.[table];
    if (!rows || rows.length === 0) {
      console.log(`  ${table}: skipped (0 rows)`);
      continue;
    }

    for (const row of rows) {
      const columns = Object.keys(row).filter(k => row[k] !== undefined);
      const values = columns.map(c => row[c]);
      const placeholders = columns.map((_, i) => `$${i + 1}`);
      const updates = columns.map(c => `"${c}" = EXCLUDED."${c}"`);

      try {
        await client.query(`
          INSERT INTO public."${table}" (${columns.map(c => `"${c}"`).join(', ')})
          VALUES (${placeholders.join(', ')})
          ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}
        `, values);
      } catch (err: any) {
        console.warn(`  ${table}: warning on row ${row.id}: ${err.message}`);
      }
    }
    console.log(`  ${table}: ${rows.length} rows restored`);
  }

  await client.end();
  console.log('\nRestore complete.');
}

const filepath = process.argv[2];
if (!filepath) {
  console.error('Usage: npx tsx scripts/restore.ts <path-to-backup.json>');
  process.exit(1);
}

restore(filepath).catch((err) => {
  console.error('Restore failed:', err);
  process.exit(1);
});
