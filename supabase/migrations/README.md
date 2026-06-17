# Database Migrations

## Source of Truth

The **remote Supabase database** is the source of truth for the current schema. The 33 historical ad-hoc SQL files that were applied manually via the Supabase SQL Editor have been removed and replaced with a single placeholder migration.

## Migration Workflow

### Prerequisites

To use the full Supabase CLI migration workflow, install **Docker Desktop** (required for `supabase db pull`, `db push`, `db dump`).

### Adding New Migrations

With Docker:

```bash
supabase migration new <description>
# Edit the generated file, then:
supabase db push
```

Without Docker (use for now):

```bash
# 1. Write your SQL changes to a file:
#    supabase/migrations/<timestamp>_<description>.sql

# 2. Apply directly to the remote database:
supabase db query --linked --file supabase/migrations/<filename>

# 3. Optionally register in _supabase.migrations:
#    INSERT INTO _supabase.migrations (name) VALUES ('<timestamp>_<description>.sql');
```

### Inspecting Current Schema

```bash
# List all tables
supabase db query --linked "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"

# Run any SQL query
supabase db query --linked "YOUR SQL HERE"

# Dump full schema (requires Docker)
supabase db dump --linked --schema public --file dump.sql
```

## Migration History

| File | Description | Status |
|------|-------------|--------|
| `00000000000001_initial_schema.sql` | Cumulative schema (all prior migrations) | ✅ Applied |
| `00000000000002_rls_policy_audit_fixes.sql` | RLS audit: orphan table policies, dropped duplicates, fixed permissive policies, NOT NULL school_id | ✅ Applied |
