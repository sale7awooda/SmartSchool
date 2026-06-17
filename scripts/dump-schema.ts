import { Client } from 'pg';

const CONNECTION_STRING = process.env.SUPABASE_DB_URL ||
  'postgresql://cli_login_postgres:KBEnlBmhDZrkcDXVgPtRHKRzrZtXGrnH@db.vyzpogfjlyofcejvsilz.supabase.co:5432/postgres';

async function getTypes(client: Client): Promise<string[]> {
  const { rows } = await client.query(`
    SELECT t.typname
    FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype = 'e'
    ORDER BY t.typname;
  `);
  const lines: string[] = [];
  for (const row of rows) {
    const { rows: enumRows } = await client.query(`
      SELECT e.enumlabel
      FROM pg_catalog.pg_enum e
      WHERE e.enumtypid = (SELECT t.oid FROM pg_catalog.pg_type t
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = $1)
      ORDER BY e.enumsortorder;
    `, [row.typname]);
    const vals = enumRows.map((r: any) => `'${r.enumlabel}'`).join(', ');
    lines.push(`CREATE TYPE "${row.typname}" AS ENUM (${vals});`);
  }
  return lines;
}

async function getTables(client: Client): Promise<string[]> {
  const { rows: tables } = await client.query(`
    SELECT c.relname AS table_name
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY c.relname;
  `);

  const lines: string[] = [];

  for (const { table_name } of tables) {
    const { rows: columns } = await client.query(`
      SELECT
        a.attname AS column_name,
        a.attnotnull AS not_null,
        a.atthasdef AS has_default,
        pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS default_expr,
        CASE
          WHEN t.typtype = 'e' THEN format_type(a.atttypid, a.atttypmod)
          WHEN t.typelem != 0 AND t.typlen = -1 THEN (SELECT format_type(etyp.oid, a.atttypmod) FROM pg_catalog.pg_type etyp WHERE etyp.oid = t.typelem) || '[]'
          ELSE format_type(a.atttypid, a.atttypmod)
        END AS data_type
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = (SELECT c.oid FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = $1)
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum;
    `, [table_name]);

    const colDefs: string[] = [];
    for (const col of columns) {
      let def = `  "${col.column_name}" ${col.data_type}`;
      if (col.not_null) def += ' NOT NULL';
      if (col.has_default && col.default_expr) {
        let defaultVal = col.default_expr;
        if (defaultVal.startsWith('nextval(')) {
          defaultVal = defaultVal;
        }
        def += ` DEFAULT ${defaultVal}`;
      }
      colDefs.push(def);
    }

    // Primary key
    const { rows: pks } = await client.query(`
      SELECT a.attname AS column_name
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = (SELECT c.oid FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = $1)
        AND i.indisprimary
      ORDER BY a.attnum;
    `, [table_name]);

    const pkCols = pks.map((r: any) => `"${r.column_name}"`).join(', ');

    // Foreign keys
    const { rows: fks } = await client.query(`
      SELECT
        con.conname AS constraint_name,
        a.attname AS column_name,
        fcl.relname AS foreign_table_name,
        fa.attname AS foreign_column_name
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class cl ON cl.oid = con.conrelid
      JOIN pg_catalog.pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
      JOIN pg_catalog.pg_class fcl ON fcl.oid = con.confrelid
      JOIN pg_catalog.pg_attribute fa ON fa.attrelid = con.confrelid AND fa.attnum = ANY(con.confkey)
      WHERE cl.relname = $1
        AND con.contype = 'f'
      ORDER BY con.conname, a.attnum;
    `, [table_name]);

    // Unique constraints
    const { rows: uniques } = await client.query(`
      SELECT
        con.conname AS constraint_name,
        a.attname AS column_name
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class cl ON cl.oid = con.conrelid
      JOIN pg_catalog.pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
      WHERE cl.relname = $1
        AND con.contype = 'u'
      ORDER BY con.conname, a.attnum;
    `, [table_name]);

    // Group unique columns by constraint name
    const uniqGroups: Record<string, string[]> = {};
    for (const uq of uniques) {
      if (!uniqGroups[uq.constraint_name]) uniqGroups[uq.constraint_name] = [];
      uniqGroups[uq.constraint_name].push(uq.column_name);
    }

    // Check constraints
    const { rows: checks } = await client.query(`
      SELECT
        con.conname AS constraint_name,
        pg_catalog.pg_get_constraintdef(con.oid) AS check_def
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class cl ON cl.oid = con.conrelid
      WHERE cl.relname = $1
        AND con.contype = 'c'
      ORDER BY con.conname;
    `, [table_name]);

    // Indexes
    const { rows: indexes } = await client.query(`
      SELECT
        i.indexname,
        i.indexdef
      FROM pg_catalog.pg_indexes i
      WHERE i.schemaname = 'public' AND i.tablename = $1
        AND i.indexname NOT LIKE '%_pkey'
      ORDER BY i.indexname;
    `, [table_name]);

    const tableLines: string[] = [];
    tableLines.push(`CREATE TABLE IF NOT EXISTS "${table_name}" (`);
    tableLines.push(colDefs.join(',\n'));
    if (pkCols) {
      tableLines.push(`, PRIMARY KEY (${pkCols})`);
    }
    // Deduplicate FK column pairs
    const seenFks = new Set<string>();
    for (const fk of fks) {
      const key = `${fk.column_name}->${fk.foreign_table_name}.${fk.foreign_column_name}`;
      if (seenFks.has(key)) continue;
      seenFks.add(key);
      tableLines.push(`, CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES "${fk.foreign_table_name}"("${fk.foreign_column_name}")`);
    }
    for (const [cname, cols] of Object.entries(uniqGroups)) {
      const colList = cols.map((c: string) => `"${c}"`).join(', ');
      tableLines.push(`, CONSTRAINT "${cname}" UNIQUE (${colList})`);
    }
    for (const chk of checks) {
      tableLines.push(`, CONSTRAINT "${chk.constraint_name}" CHECK ${chk.check_def}`);
    }
    tableLines.push(');');
    lines.push(tableLines.join('\n'));

    for (const idx of indexes) {
      lines.push(`${idx.indexdef};`);
    }
  }

  return lines;
}

async function getRLSPolicies(client: Client): Promise<string[]> {
  const { rows } = await client.query(`
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
  return rows.map((r: any) => {
    const roleStr = r.roles === '{public}' ? 'PUBLIC' : r.roles.replace(/[{}]/g, '').split(',').map((s: string) => `"${s.trim()}"`).join(', ');
    const usingClause = r.qual ? `\n  USING (${r.qual})` : '';
    const checkClause = r.with_check ? `\n  WITH CHECK (${r.with_check})` : '';
    const cmdStr = r.cmd === 'ALL' ? 'ALL' : r.cmd;
    return `CREATE POLICY "${r.policyname}" ON "${r.tablename}"\n  FOR ${cmdStr}\n  TO ${roleStr}${usingClause}${checkClause};`;
  });
}

async function main() {
  console.log('Connecting to remote database...');
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();
  console.log('Connected.\n');

  const lines: string[] = [];
  lines.push('-- Smart School Management System — Full Schema Dump');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('-- This file contains the complete public schema definition.');
  lines.push('');

  // Helper function for RLS tenant isolation
  const { rows: funcs } = await client.query(`
    SELECT pg_catalog.pg_get_functiondef(f.oid) as func_def
    FROM pg_catalog.pg_proc f
    JOIN pg_catalog.pg_namespace n ON n.oid = f.pronamespace
    WHERE n.nspname = 'public'
      AND f.proname = 'get_current_school_id';
  `);
  if (funcs.length > 0) {
    lines.push('-- Helper function for RLS tenant isolation');
    lines.push(funcs[0].func_def);
    lines.push('');
  }

  // get_current_user_role helper
  const { rows: roleFuncs } = await client.query(`
    SELECT pg_catalog.pg_get_functiondef(f.oid) as func_def
    FROM pg_catalog.pg_proc f
    JOIN pg_catalog.pg_namespace n ON n.oid = f.pronamespace
    WHERE n.nspname = 'public'
      AND f.proname = 'get_current_user_role';
  `);
  if (roleFuncs.length > 0) {
    lines.push('-- Helper function for RLS role checks');
    lines.push(roleFuncs[0].func_def);
    lines.push('');
  }

  lines.push('-- ============================================');
  lines.push('-- ENUMS');
  lines.push('-- ============================================');
  const enumLines = await getTypes(client);
  if (enumLines.length > 0) {
    lines.push(...enumLines);
    lines.push('');
  }

  lines.push('-- ============================================');
  lines.push('-- TABLES');
  lines.push('-- ============================================');
  const tableLines = await getTables(client);
  lines.push(...tableLines);
  lines.push('');

  lines.push('-- ============================================');
  lines.push('-- RLS');
  lines.push('-- ============================================');
  lines.push('-- Enable RLS');
  const { rows: tableNames } = await client.query(`
    SELECT c.relname FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);
  for (const { relname } of tableNames) {
    lines.push(`ALTER TABLE IF EXISTS "${relname}" ENABLE ROW LEVEL SECURITY;`);
  }
  lines.push('');

  const policyLines = await getRLSPolicies(client);
  if (policyLines.length > 0) {
    lines.push(...policyLines);
    lines.push('');
  }

  // Sequences
  const { rows: sequences } = await client.query(`
    SELECT sequence_name, data_type, start_value, minimum_value, maximum_value, increment
    FROM information_schema.sequences
    WHERE sequence_schema = 'public';
  `);
  if (sequences.length > 0) {
    lines.push('-- ============================================');
    lines.push('-- SEQUENCES');
    lines.push('-- ============================================');
    for (const seq of sequences) {
      lines.push(`CREATE SEQUENCE IF NOT EXISTS "${seq.sequence_name}" AS ${seq.data_type} START WITH ${seq.start_value} INCREMENT BY ${seq.increment} MINVALUE ${seq.minimum_value} MAXVALUE ${seq.maximum_value};`);
    }
    lines.push('');
  }

  // Triggers
  const { rows: triggers } = await client.query(`
    SELECT
      pg_catalog.pg_get_triggerdef(t.oid) AS trigger_def
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal;
  `);
  if (triggers.length > 0) {
    lines.push('-- ============================================');
    lines.push('-- TRIGGERS');
    lines.push('-- ============================================');
    for (const trg of triggers) {
      lines.push(`${trg.trigger_def};`);
    }
    lines.push('');
  }

  const output = lines.join('\n');
  console.log(`Generated ${lines.length} lines of DDL`);
  console.log('Writing to file...');
  require('fs').writeFileSync(
    require('path').join(__dirname, '..', 'supabase', 'migrations', '00000000000003_full_schema_dump.sql'),
    output,
    'utf-8'
  );
  console.log('Done!');

  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
