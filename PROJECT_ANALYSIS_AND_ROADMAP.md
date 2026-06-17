# Smart School Management System
# Complete System Analysis, Fix Plan & Improvement Roadmap

> **Author:** Deep automated codebase analysis  
> **Date:** June 2026  
> **Version analyzed:** v2 (post-sprint-9, self-hosted Supabase target)  
> **Deployment target:** VPS with self-hosted Supabase

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Analysis](#2-architecture-analysis)
3. [Strengths — What's Built Right](#3-strengths--whats-built-right)
4. [Critical Issues (Blockers)](#4-critical-issues-blockers)
5. [High-Risk Issues](#5-high-risk-issues)
6. [Medium-Risk Issues](#6-medium-risk-issues)
7. [Fix Plan — Step by Step](#7-fix-plan--step-by-step)
8. [VPS Deployment Checklist](#8-vps-deployment-checklist)
9. [Improvement Roadmap](#9-improvement-roadmap)
10. [Self-Hosted Supabase Advantages to Exploit](#10-self-hosted-supabase-advantages-to-exploit)
11. [Final Assessment Scores](#11-final-assessment-scores)

---

## 1. System Overview

**Smart School Management System** is a full-featured, multi-tenant school SaaS built with:

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.4 (App Router) |
| Language | TypeScript 5.9 |
| Database | PostgreSQL via self-hosted Supabase |
| Auth | Supabase Auth (JWT + Cookie sessions) |
| Real-time | Socket.io (custom server) + Supabase Realtime |
| Offline | IndexedDB (idb-keyval) + custom sync engine |
| Push Notifications | Web Push API + VAPID |
| Email | Resend API |
| Maps | Mapbox + OSRM fallback |
| PDF | jsPDF + jspdf-autotable |
| Monitoring | Sentry |
| Styling | Tailwind CSS v4 |

### Modules Implemented

| Module | Status | Notes |
|--------|--------|-------|
| Authentication & Auth | ✅ Complete | Multi-role, session-based |
| Student Management | ✅ Complete | CRUD, soft delete, parent linking |
| Staff / HR | ✅ Complete | Leave requests, payslips |
| Academic Management | ✅ Complete | Classes, subjects, academic years |
| Assessment / Exams | ✅ Complete | Question bank, auto-grading |
| Attendance | ✅ Complete | Offline-capable |
| Fee Management | ✅ Complete | Invoices, payments, installments |
| Communication | ✅ Complete | Notices, broadcasts, messaging |
| Transport | ✅ Complete | Routes, GPS tracking via Socket.io |
| Inventory | ✅ Complete | Asset tracking |
| Visitors | ✅ Complete | Check-in/check-out |
| Library | ⚠️ Stub | Minimal implementation |
| Medical Records | ⚠️ Stub | Minimal implementation |
| Super Admin Panel | ✅ Complete | Multi-school, subscriptions, health |
| Push Notifications | ✅ Complete | VAPID, per-role targeting |
| PWA / Offline | ✅ Complete | Service worker, IndexedDB sync |
| Analytics Dashboard | ✅ Complete | Charts, attendance, finance KPIs |
| Settings | ✅ Complete | System settings, RBAC configuration |
| Email Automation | ⚠️ Stub | Manual trigger only |
| Report Cards | ⚠️ Stub | UI present, generation incomplete |

---

## 2. Architecture Analysis

### Data Flow

```
Browser (React Client)
  │
  ├── Supabase Realtime ──→ Live updates (broadcasts, messages)
  ├── Socket.io ──────────→ GPS bus tracking (custom server.ts)
  ├── IndexedDB ──────────→ Offline data cache (offline-db.ts)
  │
  ├── Next.js Server Actions (app/actions/)
  │     └── createAdminClient() → Supabase (bypasses RLS)
  │
  ├── Next.js API Routes (app/api/)
  │     ├── /api/push/send → web-push → browser push
  │     ├── /api/email/send → Resend API
  │     └── /api/finance/generate-invoice-pdf → jsPDF
  │
  └── Supabase (self-hosted PostgreSQL)
        ├── RLS Policies (tenant isolation)
        ├── DB Functions (get_current_school_id, is_super_admin)
        ├── Triggers (balance_due auto-calculation)
        └── RPCs (record_fee_payment)
```

### Multi-Tenancy Model

The system uses **schema-level multi-tenancy** via a `school_id` column on every table, enforced by Row Level Security policies using:

```sql
-- Every table's SELECT policy:
USING (school_id = get_current_school_id())

-- Super Admin bypass:
USING (school_id = get_current_school_id() OR is_super_admin())
```

This is the **correct enterprise pattern** — the database enforces isolation, not the application.

### Server Architecture

```
server.ts (tsx custom server)
  ├── HTTP Server (Node.js)
  ├── Next.js Request Handler
  └── Socket.io Server
        ├── CORS: CORS_ORIGIN env variable
        └── Redis Adapter (optional, via REDIS_URL env)
```

---

## 3. Strengths — What's Built Right

### ✅ 1. Enterprise-Grade RLS Security Model

The database-level Row Level Security using `SECURITY DEFINER` functions is textbook enterprise multi-tenancy. No client can bypass it regardless of how they construct their request.

```sql
CREATE OR REPLACE FUNCTION public.get_current_school_id()
  RETURNS uuid LANGUAGE sql SECURITY DEFINER
AS $$ SELECT school_id FROM public.users WHERE id = auth.uid(); $$;
```

**Why it matters:** Even if the application code has a bug, the database will block cross-tenant data access. This is the gold standard.

---

### ✅ 2. Financial Integrity at the Database Layer

The `record_fee_payment` RPC and `CHECK (balance_due >= 0)` constraint ensure financial data cannot be corrupted by application-level bugs:

```sql
-- balance_due is auto-calculated by trigger, never trusted from application
-- CHECK constraint prevents negative balances
-- RPC function handles the atomic payment recording
```

**Why it matters:** Financial data corruption is among the most expensive bugs in any SaaS system. This system protects it at the right layer.

---

### ✅ 3. Offline-First PWA Architecture

The `offline-db.ts` sync engine implements:
- IndexedDB storage via `idb-keyval`
- Last Write Wins conflict resolution (correct for attendance use case)
- Background sync via service worker
- Push notification delivery even when app is closed

This is production-grade mobile-first design.

---

### ✅ 4. Layered Permission System

`lib/permissions.ts` implements a three-tier RBAC:
1. **User-level custom permissions** (individual overrides)
2. **Role permissions from settings** (configurable per school)
3. **Hardcoded defaults** (fallback)

This allows per-school customization without code changes.

---

### ✅ 5. Zod Validation on All Server Actions

Every server action uses Zod schema validation before touching the database:
```typescript
const validatedFields = CreateStudentSchema.safeParse(rawData);
if (!validatedFields.success) {
  return { success: false, errors: validatedFields.error.flatten().fieldErrors };
}
```

This prevents malformed data from reaching the database and provides structured error responses.

---

### ✅ 6. Infrastructure Flexibility

The Socket.io + optional Redis adapter design is smart:
- Works single-instance without Redis (development/small deployment)
- Scales horizontally with Redis enabled (enterprise)

The Mapbox + OSRM fallback routing shows cost-conscious design.

---

### ✅ 7. Comprehensive Audit Logging

Almost every write operation calls `logAudit()` with structured metadata, creating a full trail of who changed what and when. The `audit_logs` table is protected by RLS with super admin read access.

---

## 4. Critical Issues (Blockers)

> These issues will prevent the system from working correctly on a fresh VPS deployment. Fix these before running any migrations.

---

### 🔴 BLOCKER 1 — Hardcoded School UUID in Every Table

**File:** `supabase/migrations/00000000000005_full_schema_dump.sql`  
**Lines:** 53, 68, 81, 93, 108, 118, 142, 159, 175, 187, 215, 230 (30+ occurrences)

**The Problem:**
```sql
-- This appears in EVERY table definition:
"school_id" uuid DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
```

On a fresh VPS Supabase instance, this UUID doesn't exist in `schools`. Every insert into any table will throw:
```
ERROR: insert or update on table "X" violates foreign key constraint "X_school_id_fkey"
```
This breaks new student registration, new class creation, new attendance records — everything.

**The Fix:**
```sql
-- Remove the DEFAULT clause from every table:
"school_id" uuid NOT NULL
-- Or make it nullable with no default:
"school_id" uuid
```

Then ensure the application always provides `school_id` explicitly. The `get_current_school_id()` function already does this for authenticated users via RLS — the issue is only with the schema DEFAULT value.

---

### 🔴 BLOCKER 2 — DEV_MODE Defaults to `true` in `next.config.ts`

**File:** `next.config.ts` (line 10) and `lib/config.ts`

**The Problem:**
```typescript
// next.config.ts line 10:
NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE || 'true',  // ← ALWAYS TRUE

// lib/config.ts:
export function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV_MODE !== 'false'; // ← true for 'undefined', 'yes', '1', etc
}
```

**Consequences in production if not set to `'false'`:**
1. The **Quick Login panel** (6 demo accounts) is visible on the login page
2. `autoProvisionUserAuthAction` — which creates auth accounts on demand — is active
3. `ensureDefaultUserAndAuth` runs and creates development accounts
4. Role assignment falls back to email-prefix guessing

**The Fix:**
```typescript
// next.config.ts:
NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE || 'false',  // Changed

// lib/config.ts:
export function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV_MODE === 'true';  // Changed
}
```

**VPS .env:** Must explicitly set `NEXT_PUBLIC_DEV_MODE=false`

---

### 🔴 BLOCKER 3 — Live Service Role Key Committed to `.env`

**File:** `.env` (not `.env.local`)

**The Problem:**
```env
NEXT_PUBLIC_SUPABASE_URL="https://vyzpogfjlyofcejvsilz.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbG..."  # Live key
SUPABASE_SERVICE_ROLE_KEY="eyJhbG..."      # ← FULL RLS BYPASS KEY — COMMITTED TO DISK
NEXT_PUBLIC_DEV_MODE="true"               # ← Dev mode ON
```

The `SUPABASE_SERVICE_ROLE_KEY` grants complete bypass of all RLS policies. If this repository is pushed to GitHub (even accidentally), an attacker can:
- Read all data from all schools
- Delete everything
- Create/modify any user

**The Fix:**
1. **Immediately rotate** the `SUPABASE_SERVICE_ROLE_KEY` in your Supabase dashboard
2. Move all secrets from `.env` to `.env.local` (which is excluded from git and builds)
3. Add `.env` to `.gitignore` if not already there
4. For VPS: store secrets in the VPS's environment variables directly, not in files

---

### 🔴 BLOCKER 4 — Hardcoded Super Admin Email in Server Actions

**File:** `app/actions/super-admin.ts` (lines 171, 208, 220)  
**Also:** `lib/auth-context.tsx` (lines 72, 113), `app/actions/auth/bootstrap.ts` (line 20)

**The Problem:**
```typescript
// 3 functions do this exact lookup:
const { data: admin } = await supabase
  .from('users').select('id')
  .eq('email', 'sale7awooda@gmail.com')  // ← Your personal email, hardcoded
  .single();

if (!admin) throw new Error('Super admin not found');
// OR silently returns with no action taken
```

Affected functions:
- `createAnnouncement()` — announcements attributed to null creator
- `triggerBackup()` — backup log has no trigger_by
- `logAuditAction()` — the entire audit log system fails silently

**The Fix:**
```typescript
// In server actions, the session context is available:
const supabase = createAdminClient();

// For functions called by authenticated super admins:
// Pass the user ID from the calling context instead of looking it up by email
export async function createAnnouncement(data: {...}, createdById: string) {
  const { error } = await supabase.from('system_announcements').insert([{
    ...data,
    created_by: createdById,  // Passed from the authenticated session
  }]);
}

// In auth-context.tsx: don't hardcode the primary admin email
// Instead, check the role from the database:
const profile = await supabase.from('users').select('role').eq('id', sessionUser.id).single();
```

---

### 🔴 BLOCKER 5 — Missing PWA Icons

**Directory:** `public/`  
**Contains:** `icon.svg`, `logo.svg`, `sw.js` only

**The Problem:**
```javascript
// In public/sw.js line 40:
icon: '/icon-192x192.png',  // This file DOES NOT EXIST
```

Also missing: `manifest.json` is referenced in `next.config.ts` middleware exclusions but doesn't exist in `public/`.

**Consequences:**
- Push notifications show no icon (displays a blank placeholder)
- PWA "Add to Home Screen" won't work properly
- App may not pass PWA audit criteria

**The Fix:**
```bash
# Generate PNG icons from the existing SVG:
npx sharp-cli input=public/icon.svg output=public/icon-192x192.png width=192 height=192
npx sharp-cli input=public/icon.svg output=public/icon-512x512.png width=512 height=512

# Create public/manifest.json:
{
  "name": "Smart School",
  "short_name": "SmartSchool",
  "icons": [
    { "src": "/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#3b82f6",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/dashboard"
}
```

---

### 🔴 BLOCKER 6 — Public VAPID Keys Committed to Repository

**File:** `lib/api/web-push-setup.ts` (lines 46-49)

**The Problem:**
```typescript
// "Emergency fallback" — but these keys are now publicly known:
return {
  publicKey: 'BMWkTliVadM8y0G897IiwC1gtHo5yItE0dpt-YqparhZpk0cT3-m9wsXT5BOENt3Lr6MPSh4dz8Cexklw8Ss7Pg',
  privateKey: 's9mRsa8J5zp0D9eDo7F7glzshtx4C41P0epPtoPKw_0'
};
```

Anyone with access to this file can:
- Impersonate your push notification server
- Send fake "Smart School" notifications to your users' browsers
- Since browsers trust the VAPID public key, not the sender domain

**The Fix:**
```typescript
export function getVapidKeys(): VapidKeys {
  const pubKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privKey = process.env.VAPID_PRIVATE_KEY;
  if (pubKey && privKey) {
    return { publicKey: pubKey, privateKey: privKey };
  }

  // No fallback to hardcoded keys — fail loudly instead
  throw new Error(
    'VAPID keys not configured. Run: npx web-push generate-vapid-keys\n' +
    'Then set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your .env.local'
  );
}
```

Generate fresh keys for production:
```bash
npx web-push generate-vapid-keys
```

---

### 🔴 BLOCKER 7 — Browser Supabase Client Used in Server API Route

**File:** `lib/api/push-subscriptions-store.ts` (line 1)  
**Used by:** `app/api/push/send/route.ts`

**The Problem:**
```typescript
import { supabase } from '@/lib/supabase/client';  // ← createBrowserClient()
```

`createBrowserClient()` uses the anon key and relies on cookie-based session authentication. In a server API route (`app/api/push/send/route.ts`), there are no browser cookies — the client has no session.

This means `getAllSubscriptions()`, `getSubscriptionsForRole()`, and `getSubscriptionsForUser()` either:
- Return empty arrays (if `push_subscriptions` requires auth to read), causing all push sends to fail silently
- Return data only if the table has overly permissive public read access (which is a security risk)

**The Fix:**
```typescript
// lib/api/push-subscriptions-store.ts — change line 1:
// Before:
import { supabase } from '@/lib/supabase/client';

// After:
import { createAdminClient } from '@/lib/supabase/server';

// Then update all functions to use:
const supabase = createAdminClient();
// instead of using the module-level `supabase` variable
```

---

## 5. High-Risk Issues

### ⚠️ HIGH RISK 1 — `auth.admin.listUsers()` Called on Every Student Action

**File:** `app/actions/students.ts` (lines 244, 435, 733)  
**Also:** `app/actions/staff.ts` (line 71), `app/actions/auth/provision.ts` (lines 22, 129)

**The Problem:**
```typescript
// Called on EVERY student create, update, and sync:
const { data: listData } = await adminClient.auth.admin.listUsers();
let authUser = listData?.users.find(u => u.email === studentEmail);
```

`listUsers()` loads **all auth users** into memory:
- At 100 students → loads 100 users per registration
- At 1,000 students → loads 1,000 users per registration
- At 5,000 students → loads 5,000 users per registration

This is O(n) per operation, causing:
- Dramatically increasing registration time as school grows
- Memory spikes during bulk student imports
- Potential Supabase Auth API timeouts

**The Fix:**
```typescript
// Replace listUsers() + find() with direct lookup:
const { data: { user: existingUser } } = 
  await adminClient.auth.admin.getUserByEmail(studentEmail);
// This is O(1) — a direct index lookup
```

---

### ⚠️ HIGH RISK 2 — `resetDatabase` Has No School Scoping

**Files:** `lib/api/database.ts` and `app/actions/settings.ts`

**The Problem:**
```typescript
// This deletes ALL rows from every table — no school_id filter:
await adminClient.from(table).delete().not('id', 'is', null);
```

In a multi-tenant system with multiple schools, any admin who clicks "Factory Reset" will wipe data from **all schools simultaneously**. This is a catastrophic multi-tenancy violation.

**The Fix:**
```typescript
// Must scope every delete to the current school:
const schoolId = await getCurrentSchoolId(); // get from session
await adminClient.from(table).delete()
  .eq('school_id', schoolId)  // ← Critical: scope to current school
  .not('id', 'is', null);
```

---

### ⚠️ HIGH RISK 3 — The Backup System is a JSON Export, Not a Backup

**File:** `app/actions/backup.ts`

**The Problem:**
`backupDatabaseAction()` does:
1. Fetches rows from ~20 tables via the Supabase JS client
2. Returns them as a JSON object

This is **not a backup** because:
- The Supabase JS client has a default **1,000-row limit** (PostgREST pagination). Any table with >1,000 rows is silently truncated
- No schema is exported — if the DB is lost, there's nothing to restore to
- No DB functions, triggers, RPC definitions, or RLS policies are included
- `triggerBackup()` in `super-admin.ts` only creates a DB row — it never runs `pg_dump`

**The Fix:**
On VPS, set up a real `pg_dump` cronjob:
```bash
# Add to VPS crontab (crontab -e):
0 3 * * * pg_dump -h localhost -U postgres -d smartschool | gzip > /backups/smartschool_$(date +%Y%m%d).sql.gz

# Keep last 7 days:
0 4 * * * find /backups -name "*.sql.gz" -mtime +7 -delete
```

Rename the UI feature to "Data Export" to avoid misleading users.

---

### ⚠️ HIGH RISK 4 — Email Sender Domain is a Placeholder

**File:** `app/api/email/send/route.ts` (line 18)

**The Problem:**
```typescript
from: 'School System <notifications@updates.school.edu>',
```

`updates.school.edu` is a placeholder domain. Unless this domain is:
1. Owned by you
2. Verified in Resend dashboard
3. Has SPF/DKIM/DMARC records set

All emails will either fail with a 403 from Resend, or land directly in spam.

**The Fix:**
Make the sender email configurable via environment variable:
```typescript
from: `${process.env.EMAIL_FROM_NAME || 'Smart School'} <${process.env.EMAIL_FROM_ADDRESS || 'noreply@yourdomain.com'}>`,
```

Add to `.env.example`:
```env
EMAIL_FROM_NAME="Smart School"
EMAIL_FROM_ADDRESS="noreply@yourdomain.com"
```

---

### ⚠️ HIGH RISK 5 — CORS Default Blocks All Production Traffic

**File:** `server.ts` (line 28)

**The Problem:**
```typescript
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
```

If `CORS_ORIGIN` is not set in the VPS `.env`, all Socket.io connections from your actual domain are blocked with a CORS error. The GPS transport tracking module will be completely non-functional.

**The Fix:**
```typescript
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('CORS_ORIGIN must be set in production'); })()
    : ['http://localhost:3000'];
```

**VPS .env must include:**
```env
CORS_ORIGIN=https://yourdomain.com
```

---

### ⚠️ HIGH RISK 6 — Client-Side Email-Based Role Assignment

**File:** `lib/auth-context.tsx` (lines 70-78)

**The Problem:**
```typescript
if (!profile?.role) {
  if (email === 'sale7awooda@gmail.com') role = 'super_admin';
  else if (email.startsWith('admin')) role = 'admin';    // ← Any admin*@* email gets admin role
  else if (email.startsWith('teacher')) role = 'teacher';
}
```

This runs **client-side**. If a user registers with `admin-1@gmail.com`, they are temporarily assigned the `admin` role in the React state. While RLS blocks their actual data access, they could see admin-level UI components and menus before the correct profile loads.

**The Fix:**
```typescript
// Replace the role guessing with a safe fallback:
if (!profile?.role) {
  // Always default to lowest privilege for safety
  const fallbackRole = 'parent';
  // Redirect to profile completion page, not full dashboard
  router.push('/complete-profile');
}
```

---

## 6. Medium-Risk Issues

### ⚠️ MEDIUM 1 — `isDevMode()` Logic is Inverted

**File:** `lib/config.ts`

```typescript
// Current — returns true for undefined, '', 'yes', '1', etc:
return process.env.NEXT_PUBLIC_DEV_MODE !== 'false';

// Correct — only returns true when explicitly set:
return process.env.NEXT_PUBLIC_DEV_MODE === 'true';
```

---

### ⚠️ MEDIUM 2 — `resetDatabase` Available Client-Side

**File:** `lib/api/database.ts`

The `resetDatabase()` and `seedDatabase()` functions are in `lib/api/` (client-importable) and use the browser Supabase client. Move these to server actions only, and ensure they're gated by admin role checks.

---

### ⚠️ MEDIUM 3 — `academic_years_name_key` Unique Constraint Blocks Multi-School

**File:** `supabase/migrations/00000000000005_full_schema_dump.sql` (line 56)

```sql
CONSTRAINT "academic_years_name_key" UNIQUE ("name")
```

This unique constraint is on `name` alone — not `(name, school_id)`. If School A creates academic year "2025-2026" and School B tries to create the same, it will fail with a unique constraint violation.

**The Fix:**
```sql
-- Remove the single-column unique constraint:
ALTER TABLE public.academic_years DROP CONSTRAINT IF EXISTS academic_years_name_key;

-- Add a compound unique constraint scoped to school:
ALTER TABLE public.academic_years ADD CONSTRAINT academic_years_name_school_key UNIQUE (name, school_id);
```

---

### ⚠️ MEDIUM 4 — `getClasses()` Auto-Inserts Missing Grades Client-Side

**File:** `lib/api/academics.ts` (lines 409-421)

```typescript
// This runs silently on every page load that calls getClasses():
const inserts = missingGrades.map(name => ({ name, is_deleted: false }));
const { data: inserted } = await supabase.from('classes').insert(inserts).select('*');
```

This means opening the Classes page for the first time auto-creates 13 grade records using the browser client. This:
- Can fail if RLS blocks inserts
- Creates records with no `school_id` (if the hardcoded UUID issue isn't fixed)
- Creates grades for all schools, not just the current school's

**The Fix:** Move seeding logic to a dedicated admin server action called only once during school setup.

---

### ⚠️ MEDIUM 5 — Same Logic Duplicated Between Server Actions and `lib/api/`

Many operations exist in both:
- `app/actions/students.ts` — server action (correct)
- `lib/api/students.ts` — client-side function (legacy)

This creates confusion about which to use and risks having two code paths with different behavior. The `lib/api/` files should be cleaned up to be thin wrappers that call server actions.

---

### ⚠️ MEDIUM 6 — Migration Numbering Gap

**Directory:** `supabase/migrations/`

The migration files skip from `00000000000002` to `00000000000004` (missing `00000000000003`). Additionally, `00000000000005` is a full schema dump that presumably includes the content from migrations 1, 2, and 4. The Supabase CLI migration tracking may be inconsistent if it was tracking prior runs.

**Fix:** Document the migration history clearly. On fresh VPS deployment, run only `00000000000005`, `00000000000006`, and `00000000000007` in order (the earlier ones are superseded by the full dump).

---

## 7. Fix Plan — Step by Step

### Phase 1: Security Fixes (Do Immediately — Before Any VPS Deploy)

**Step 1.1 — Rotate the compromised service role key**
```bash
# 1. Go to: Supabase Dashboard → Project Settings → API → Service Role Key
# 2. Click "Regenerate" 
# 3. Update your local .env.local with the new key
# 4. NEVER commit .env to git again
```

**Step 1.2 — Fix DEV_MODE defaults**

Edit `next.config.ts` line 10:
```typescript
// Change:
NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE || 'true',
// To:
NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE || 'false',
```

Edit `lib/config.ts`:
```typescript
// Change:
return process.env.NEXT_PUBLIC_DEV_MODE !== 'false';
// To:
return process.env.NEXT_PUBLIC_DEV_MODE === 'true';
```

**Step 1.3 — Remove hardcoded VAPID emergency fallback**

In `lib/api/web-push-setup.ts`, replace lines 43-50 with:
```typescript
  // No hardcoded fallback — fail loudly
  throw new Error(
    '[VAPID] Keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.\n' +
    'Generate new keys with: npx web-push generate-vapid-keys'
  );
```

**Step 1.4 — Move secrets to `.env.local`**
```bash
# Create .env.local with your actual secrets
# Delete or clear .env (or replace with placeholder values only)
# Ensure .gitignore includes: .env.local, .env
```

---

### Phase 2: Schema Fixes (Do Before Running Migrations on VPS)

**Step 2.1 — Strip hardcoded UUIDs from schema dump**

In `supabase/migrations/00000000000005_full_schema_dump.sql`, use find-and-replace:
```
Find:    DEFAULT 'a2239889-7d41-461e-b332-3fc921840302'::uuid
Replace: (remove the entire DEFAULT clause)
```

This affects 30+ lines. After removal, the column definition becomes:
```sql
"school_id" uuid
```

**Step 2.2 — Fix the `academic_years` unique constraint**

Add a new migration file `00000000000008_fix_constraints.sql`:
```sql
-- Fix academic_years unique constraint to be school-scoped
ALTER TABLE public.academic_years DROP CONSTRAINT IF EXISTS academic_years_name_key;
ALTER TABLE public.academic_years 
  ADD CONSTRAINT academic_years_name_school_key UNIQUE (name, school_id);

-- Fix push_subscriptions to use school_id scope where applicable
-- Add school_id to tables that are missing it
ALTER TABLE public.push_subscriptions 
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
```

---

### Phase 3: Application Code Fixes

**Step 3.1 — Fix super admin email lookups**

In `app/actions/super-admin.ts`, replace all 3 email lookups:
```typescript
// Replace all 3 occurrences of:
const { data: admin } = await supabase.from('users')
  .select('id').eq('email', 'sale7awooda@gmail.com').single();

// With: Accept createdById as a parameter from the calling code
export async function createAnnouncement(
  data: {...},
  createdById: string  // ← Add this parameter
) {
  const { error } = await supabase.from('system_announcements').insert([{
    ...data,
    created_by: createdById,  // ← Use passed parameter
  }]);
}
```

**Step 3.2 — Fix `push-subscriptions-store.ts`**
```typescript
// Remove:
import { supabase } from '@/lib/supabase/client';

// Add:
import { createAdminClient } from '@/lib/supabase/server';

// Update all 4 exported functions to create adminClient locally:
export async function getAllSubscriptions(): Promise<UserPushSubscription[]> {
  const supabase = createAdminClient();  // ← Add this line
  const { data, error } = await supabase.from('push_subscriptions').select('*');
  if (error) return [];
  return mapDbSubsToType(data);
}
```

**Step 3.3 — Replace `listUsers()` with `getUserByEmail()`**

In `app/actions/students.ts` (3 occurrences) and `app/actions/staff.ts`:
```typescript
// Replace this pattern (everywhere):
const { data: listData } = await adminClient.auth.admin.listUsers();
let authUser = listData?.users.find(u => u.email === studentEmail);

// With this O(1) lookup:
const { data: { user: authUser } } = await adminClient.auth.admin.getUserByEmail(studentEmail);
```

**Step 3.4 — Fix `resetDatabase` to scope by school**
```typescript
export async function resetDatabaseAction(keepUsers: boolean = true) {
  const adminClient = createAdminClient();
  const supabase = await createClient(); // Get current user's school_id via RLS

  // Get current school ID from authenticated session
  const { data: profile } = await adminClient.from('users')
    .select('school_id').eq('id', /* auth.uid() */).single();

  const schoolId = profile?.school_id;
  if (!schoolId) throw new Error('Cannot reset: no school context');

  for (const table of tables) {
    await adminClient.from(table).delete()
      .eq('school_id', schoolId)  // ← Scope to current school
      .not('id', 'is', null);
  }
}
```

**Step 3.5 — Generate and add PWA icons**
```bash
# Option 1: Using ImageMagick (if installed):
convert -background white public/icon.svg -resize 192x192 public/icon-192x192.png
convert -background white public/icon.svg -resize 512x512 public/icon-512x512.png

# Option 2: Using Node.js sharp package:
npx sharp-cli --input public/icon.svg --output public/icon-192x192.png resize 192 192
npx sharp-cli --input public/icon.svg --output public/icon-512x512.png resize 512 512
```

Then create `public/manifest.json` (see Blocker 5 fix above).

**Step 3.6 — Fix email sender domain**

In `app/api/email/send/route.ts`:
```typescript
from: `${process.env.EMAIL_FROM_NAME || 'Smart School'} <${process.env.EMAIL_FROM_ADDRESS}>`,
```

And add validation at startup:
```typescript
if (!process.env.EMAIL_FROM_ADDRESS && process.env.NODE_ENV === 'production') {
  console.error('[EMAIL] EMAIL_FROM_ADDRESS is not set. Email sending will fail.');
}
```

---

### Phase 4: VPS Setup & Configuration

**Step 4.1 — Create production `.env.local` on VPS**
```env
# Supabase (self-hosted)
NEXT_PUBLIC_SUPABASE_URL=https://supabase.yourdomain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key

# App
NEXT_PUBLIC_DEV_MODE=false
APP_URL=https://yourdomain.com
NODE_ENV=production

# CORS (for Socket.io)
CORS_ORIGIN=https://yourdomain.com

# VAPID Keys (generate fresh)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@yourdomain.com

# Email
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM_NAME=Smart School
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_DSN=your-sentry-dsn

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# Redis (optional, for Socket.io horizontal scaling)
# REDIS_URL=redis://localhost:6379
```

**Step 4.2 — Set up real backups with pg_dump**
```bash
# Create backup script at /opt/smartschool/backup.sh:
#!/bin/bash
BACKUP_DIR=/opt/smartschool/backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres -d smartschool | gzip > "$BACKUP_DIR/smartschool_$TIMESTAMP.sql.gz"
# Keep last 30 days only:
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

# Add to crontab:
0 3 * * * /opt/smartschool/backup.sh >> /var/log/smartschool-backup.log 2>&1
```

**Step 4.3 — Enable pg_cron for automated fee generation**
```sql
-- Run in your self-hosted Supabase SQL editor:
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Example: Mark overdue invoices daily at midnight:
SELECT cron.schedule(
  'mark-overdue-invoices',
  '0 0 * * *',  -- Every day at midnight
  $$
    UPDATE fee_invoices 
    SET status = 'overdue' 
    WHERE status = 'pending' 
    AND due_date < CURRENT_DATE;
  $$
);

-- Example: Update school statistics daily:
SELECT cron.schedule(
  'update-school-stats',
  '0 1 * * *',  -- Every day at 1 AM
  $$
    UPDATE schools s SET
      user_count = (SELECT COUNT(*) FROM users WHERE school_id = s.id),
      student_count = (SELECT COUNT(*) FROM students WHERE school_id = s.id AND is_deleted = false);
  $$
);
```

**Step 4.4 — Run migrations in correct order**
```bash
# On your VPS with Supabase CLI:
supabase db push

# Or manually via psql in this exact order:
psql -d smartschool -f supabase/migrations/00000000000005_full_schema_dump.sql
psql -d smartschool -f supabase/migrations/00000000000006_fix_bus_stops_fk.sql
psql -d smartschool -f supabase/migrations/00000000000007_super_admin_module.sql
# (Migration 00000000000002 is already included in 00000000000005)
# (Migration 00000000000004 is already included in 00000000000005)
```

**Step 4.5 — Create the super admin user**
```bash
# After running migrations, update your user to super_admin:
psql -d smartschool -c "UPDATE public.users SET role = 'super_admin', school_id = NULL WHERE email = 'your-email@domain.com';"
```

---

## 8. VPS Deployment Checklist

### 🔴 BEFORE Touching the Database

```
[ ] 1.  Rotate SUPABASE_SERVICE_ROLE_KEY in Supabase dashboard
[ ] 2.  Remove all DEFAULT 'a2239889...'::uuid from schema dump (30+ occurrences)
[ ] 3.  Fix next.config.ts DEV_MODE default from 'true' to 'false'
[ ] 4.  Fix lib/config.ts isDevMode() from !== 'false' to === 'true'
[ ] 5.  Remove hardcoded VAPID keys from web-push-setup.ts
[ ] 6.  Move .env secrets to .env.local
[ ] 7.  Fix academic_years unique constraint to be (name, school_id)
```

### 🔴 BEFORE First User Login

```
[ ] 8.  Replace push-subscriptions-store.ts browser client with adminClient()
[ ] 9.  Replace all 3 super admin email lookups with parameter-based approach
[ ] 10. Replace auth.admin.listUsers() with getUserByEmail() (students.ts, staff.ts)
[ ] 11. Add school_id scoping to resetDatabase() functions
[ ] 12. Set CORS_ORIGIN in VPS .env to your production domain
[ ] 13. Generate icon-192x192.png and icon-512x512.png in public/
[ ] 14. Create public/manifest.json
[ ] 15. Update email from address (set EMAIL_FROM_ADDRESS env var)
[ ] 16. Generate fresh VAPID keys (npx web-push generate-vapid-keys)
[ ] 17. Set NEXT_PUBLIC_DEV_MODE=false in production .env
[ ] 18. Update your user to super_admin role in the database
```

### 🟡 BEFORE Real Users / Going Live

```
[ ] 19. Label backup UI as "Data Export" in the interface (not "Backup")
[ ] 20. Set up real pg_dump cronjob on VPS
[ ] 21. Enable pg_cron extension on self-hosted Supabase
[ ] 22. Set up pg_cron job for marking overdue invoices
[ ] 23. Set up pg_cron job for updating school statistics
[ ] 24. Verify Resend sender domain is verified with SPF/DKIM records
[ ] 25. Test push notification flow end-to-end on a real mobile device
[ ] 26. Test the Socket.io transport tracking from outside the VPS network
[ ] 27. Configure Sentry with production DSN for error monitoring
[ ] 28. Update SETUP.md to document the actual 3-migration deployment order
```

### 🟢 POST-LAUNCH / Optimization

```
[ ] 29. Enable pg_stat_statements for query profiling
[ ] 30. Set up Redis for Socket.io horizontal scaling if needed
[ ] 31. Add CI/CD GitHub Actions pipeline for zero-downtime deploys
[ ] 32. Set up log rotation on VPS for server.ts output
[ ] 33. Configure PM2 or systemd to manage the server.ts process
[ ] 34. Set up SSL certificate renewal (Let's Encrypt via certbot)
[ ] 35. Configure Nginx reverse proxy in front of the Node.js server
```

---

## 9. Improvement Roadmap

These are not bugs but genuine improvements that would make the system significantly better.

### 🚀 Priority 1: Performance Improvements

#### P1.1 — Paginate All `lib/api/` Queries
Many queries in `lib/api/academics.ts`, `lib/api/students.ts`, etc. fetch all rows with no limit:
```typescript
// Current — fetches everything:
const { data } = await supabase.from('grades').select('*');

// Better — paginate:
const { data, count } = await supabase
  .from('grades')
  .select('*', { count: 'exact' })
  .range(from, to);
```

#### P1.2 — Add Database Indexes for Common Query Patterns
```sql
-- Add to a new migration:
-- Students are frequently queried by grade and academic_year:
CREATE INDEX IF NOT EXISTS idx_students_grade_year ON students(grade, academic_year);

-- Fee invoices are frequently filtered by status and student:
CREATE INDEX IF NOT EXISTS idx_fee_invoices_status_student ON fee_invoices(status, student_id);

-- Attendance is heavily queried by date range:
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date DESC);

-- Audit logs are usually filtered by action type and date:
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_date ON audit_logs(action_type, created_at DESC);
```

#### P1.3 — SWR Caching Configuration
Add `revalidateOnFocus: false` and appropriate `dedupingInterval` to SWR calls to reduce redundant refetches:
```typescript
const { data } = useSWR('students', getStudents, {
  revalidateOnFocus: false,
  dedupingInterval: 30000, // 30 seconds
  refreshInterval: 60000,  // 1 minute background refresh
});
```

---

### 🚀 Priority 2: Complete the Stub Modules

#### P2.1 — Email Automation (Sprint 7 remainder)
The email system is wired up (Resend API) but only sends one-off emails. Add pg_cron-based automated emails:
```sql
-- Schedule weekly attendance summaries for parents:
SELECT cron.schedule(
  'weekly-parent-attendance-email',
  '0 8 * * 1',  -- Every Monday at 8 AM
  $$ SELECT send_weekly_attendance_emails(); $$  -- Create this function
);
```

#### P2.2 — Report Cards Generation
The assessment and grading systems are complete. Add a server action that:
1. Queries all grades for a student for a given term
2. Generates a formatted jsPDF report card
3. Emails it to the parent via Resend

#### P2.3 — Library Management
Currently just a stub. Complete with:
- Book catalog management
- Borrow/return tracking
- Overdue notifications

---

### 🚀 Priority 3: Security Hardening

#### P3.1 — API Route Authentication
Currently, the push notification API routes (`/api/push/send`, `/api/push/subscribe`) have **no authentication check**:
```typescript
// app/api/push/send/route.ts — anyone can POST here:
export async function POST(req: NextRequest) {
  // No auth check at all
  const body = await req.json();
  // ... sends push to all users
}
```

Add authentication:
```typescript
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Check role (only admin and super_admin should send broadcasts):
  const { data: profile } = await supabase.from('users')
    .select('role').eq('id', user.id).single();
  
  if (!['admin', 'super_admin'].includes(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... rest of handler
}
```

#### P3.2 — Rate Limiting on Auth Endpoints
Add rate limiting to the push send endpoint and email send endpoint to prevent abuse:
```typescript
// Simple in-memory rate limiter (or use Redis for distributed):
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
```

#### P3.3 — Content Security Policy Headers
Add CSP headers in `next.config.ts`:
```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-eval'; ..."
      },
    ],
  }];
}
```

---

### 🚀 Priority 4: Developer Experience

#### P4.1 — Consolidate `lib/api/` and `app/actions/`
Currently, many operations have two implementations:
- `lib/api/students.ts` (client-side, uses browser supabase)
- `app/actions/students.ts` (server-side, uses admin client)

Consolidate by making `lib/api/` functions just thin wrappers:
```typescript
// lib/api/students.ts — simplified to just re-export actions:
export { processCreateStudentAction, processUpdateStudentAction } from '@/app/actions/students';
// Client-only query functions remain, but mutations always use server actions
```

#### P4.2 — TypeScript Strict Mode
The codebase has numerous `any` types. Enabling strict mode and fixing them would catch bugs at compile time:
```json
// tsconfig.json:
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

#### P4.3 — Environment Variable Validation at Startup
Create `lib/env.ts`:
```typescript
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

if (process.env.NODE_ENV === 'production') {
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

#### P4.4 — Structured Logging
Replace `console.error()` with structured logging:
```typescript
import { logger } from '@/lib/logger';

// Instead of:
console.error('Error creating student:', error);

// Use:
logger.error('student.create.failed', { 
  error: error.message, 
  studentId: data.studentId,
  schoolId: context.schoolId 
});
```

---

### 🚀 Priority 5: Infrastructure & Monitoring

#### P5.1 — PM2 Process Management
```bash
# Install PM2:
npm install -g pm2

# Create ecosystem.config.js:
module.exports = {
  apps: [{
    name: 'smart-school',
    script: 'npx tsx server.ts',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '500M',
    restart_delay: 5000,
    max_restarts: 10,
  }]
};

# Start:
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### P5.2 — Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/smartschool
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;      # For WebSockets
        proxy_set_header Connection 'upgrade';        # For WebSockets
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### P5.3 — Health Check Endpoint
Add `/app/api/health/route.ts`:
```typescript
export async function GET() {
  try {
    const supabase = createAdminClient();
    await supabase.from('schools').select('id').limit(1);
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
```

---

## 10. Self-Hosted Supabase Advantages to Exploit

Moving to self-hosted Supabase unlocks capabilities that were limited or unavailable on the free cloud tier:

### ✅ pg_cron — Automate Everything

```sql
-- Already have in your system, just needs activation:
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Fee automation (the missing Sprint 9 feature!):
SELECT cron.schedule('mark-overdue', '0 0 * * *', 
  'UPDATE fee_invoices SET status=''overdue'' WHERE status=''pending'' AND due_date < NOW()');

-- School stat refresh:
SELECT cron.schedule('refresh-stats', '*/30 * * * *',
  'UPDATE schools SET student_count = (SELECT COUNT(*) FROM students WHERE school_id = schools.id)');

-- Weekly attendance email to parents:
SELECT cron.schedule('weekly-attendance', '0 8 * * 1',
  'SELECT notify_parents_attendance_summary()');

-- Daily backup tracking:
SELECT cron.schedule('backup-reminder', '0 4 * * *',
  'INSERT INTO backups(status, backup_type) VALUES(''completed'', ''auto'')');
```

### ✅ Full pg_dump Access — Real Backups

```bash
# Native pg_dump — complete database backup with schema, functions, triggers:
pg_dump -h localhost -U postgres -d smartschool \
  --format=custom \
  --compress=9 \
  --file=/backups/smartschool_$(date +%Y%m%d).dump

# Restore from backup:
pg_restore -h localhost -U postgres -d smartschool_new /backups/smartschool_20260617.dump
```

### ✅ pg_stat_statements — Query Performance Profiling

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find your slowest queries:
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### ✅ Custom PostgreSQL Extensions

```sql
-- Vector search for AI-powered student recommendations:
CREATE EXTENSION IF NOT EXISTS vector;

-- Full text search with Arabic support:
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Better UUID generation:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### ✅ Direct Database Access for Complex Queries

Instead of going through the PostgREST API (with its 1,000-row limit), you can create stored procedures for complex reports:

```sql
-- Example: Generate a comprehensive school analytics report:
CREATE OR REPLACE FUNCTION generate_school_analytics_report(p_school_id uuid, p_year text)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_students', COUNT(DISTINCT s.id),
    'attendance_rate', AVG(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100,
    'fee_collection_rate', SUM(CASE WHEN fi.status = 'paid' THEN fi.amount ELSE 0 END) / 
                           NULLIF(SUM(fi.amount), 0) * 100,
    'average_grade', AVG(g.score)
  ) INTO result
  FROM students s
  LEFT JOIN attendance a ON a.student_id = s.id
  LEFT JOIN fee_invoices fi ON fi.student_id = s.id AND fi.academic_year = p_year
  LEFT JOIN grades g ON g.student_id = s.id
  WHERE s.school_id = p_school_id AND s.academic_year = p_year AND s.is_deleted = false;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 11. Final Assessment Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Architecture Design** | 9.5 / 10 | Exceptional for a school SaaS. RLS multi-tenancy, offline-first, modular actions. |
| **Database Design** | 8.5 / 10 | Strong schema, good indexes, excellent financial triggers. Penalized for hardcoded UUIDs. |
| **Security** | 5.5 / 10 | Strong foundation (RLS, Zod validation) but DEV_MODE default, committed secrets, no API auth. |
| **VPS Readiness** | 3.5 / 10 | 7 deployment blockers exist right now. Fixable, but needs work before any deploy. |
| **Financial Integrity** | 9.5 / 10 | DB-layer payment RPC, constraint-enforced balances, audit trail. Excellent. |
| **Performance** | 6.0 / 10 | No pagination on many queries, O(n) listUsers() per registration, no caching strategy. |
| **Code Quality** | 7.0 / 10 | Good patterns, but duplicated client/server logic, many `any` types, large action files. |
| **Test Coverage** | 6.5 / 10 | Vitest unit tests exist, Playwright e2e tests exist, but coverage is incomplete. |
| **Self-Hosted Fit** | 9.0 / 10 | Ideal match — VPS unlocks pg_cron, native pg_dump, full extensions. |
| **Feature Completeness** | 8.0 / 10 | Core modules solid, 4 stub modules, email automation and report cards incomplete. |

### Overall: 7.3 / 10 — Strong Foundation, Production-Ready After Fixes

The system is genuinely impressive in scope and architectural thinking. The 7 blockers are all fixable in 1-2 days of focused work. Once fixed, this is a solid, deployable school management platform with a clear path to a much higher score.

---

## Quick Reference: File Map

| Issue | Primary File | Action Needed |
|-------|-------------|---------------|
| Hardcoded UUIDs | `supabase/migrations/00000000000005_full_schema_dump.sql` | Remove 30+ DEFAULT clauses |
| DEV_MODE default | `next.config.ts` line 10 + `lib/config.ts` | Change default to false, fix logic |
| Committed secrets | `.env` | Rotate key, move to `.env.local` |
| Super admin email | `app/actions/super-admin.ts` lines 171, 208, 220 | Replace with parameter |
| Missing PWA icons | `public/` | Add icon-192x192.png, icon-512x512.png, manifest.json |
| Public VAPID keys | `lib/api/web-push-setup.ts` lines 46-49 | Remove hardcoded fallback |
| Browser client in server | `lib/api/push-subscriptions-store.ts` line 1 | Use adminClient() |
| O(n) listUsers | `app/actions/students.ts` lines 244, 435, 733 | Use getUserByEmail() |
| No school scope reset | `lib/api/database.ts` + `app/actions/settings.ts` | Add .eq('school_id', schoolId) |
| Fake backup | `app/actions/backup.ts` | Set up real pg_dump + rename UI |
| Placeholder email | `app/api/email/send/route.ts` line 18 | Use env variable |
| CORS default | `server.ts` line 28 | Require CORS_ORIGIN in production |
| Unique constraint | `supabase/migrations/` | Add migration for (name, school_id) |

---

*This document was generated from a deep automated analysis of the entire codebase on 2026-06-17.*  
*Update this document as issues are resolved.*
