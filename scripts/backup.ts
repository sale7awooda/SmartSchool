import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const CONNECTION_STRING = process.env.SUPABASE_DB_URL ||
  'postgresql://cli_login_postgres:KBEnlBmhDZrkcDXVgPtRHKRzrZtXGrnH@db.vyzpogfjlyofcejvsilz.supabase.co:5432/postgres';

const EXCLUDED_TABLES = ['schema_migrations', 'audit_log_entries', 'push_subscriptions'];

async function backup() {
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();

  const tablesRes = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const backup: Record<string, any[]> = {};

  for (const row of tablesRes.rows) {
    const table = row.table_name;
    if (EXCLUDED_TABLES.includes(table)) continue;
    const res = await client.query(`SELECT * FROM public."${table}" ORDER BY id`);
    backup[table] = res.rows;
    console.log(`  ${table}: ${res.rows.length} rows`);
  }

  await client.end();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.json`;
  const filepath = path.join(process.cwd(), filename);
  fs.writeFileSync(filepath, JSON.stringify({ timestamp: new Date().toISOString(), tables: backup }, null, 2));
  console.log(`\nBackup saved to ${filename}`);
}

backup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
