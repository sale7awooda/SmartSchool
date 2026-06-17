# Smart School (v2) - System & Architecture Documentation

## 1. Executive Summary
Smart School (v2) is a highly optimized, modern, multi-tenant Software-as-a-Service (SaaS) School Management System designed with high performance, rigorous data integrity, and strict scope discipline. The application operates entirely server-side with Next.js App Router, using Supabase (PostgreSQL) for persistent cloud-native storage, and is styled elegantly with Tailwind CSS.

---

## 2. System Architecture & SaaS Core

### 2.1 Multi-Tenant SaaS Isolation
The core database architecture is structured around complete isolation of school resources to support arbitrary school onboarding on a shared platform:
- **Tenant Registry (`schools` table)**:
  Every tenant is registered with:
  - `id` (UUID, primary key)
  - `name` (Academic/brand name)
  - `slug` (Unique slug used for routing or subregions)
  - `currency` (Configurable: `USD`, `SAR`, `SDG`, `EGP`)
  - `timezone`, `subscription_tier`, and operational settings.
- **Foreign Key Binding**: Every major application table contains a `school_id UUID REFERENCES schools(id)` column. This includes users, students, fee_invoices, attendance, grades, notices, staff_profiles, leave_requests, inventory_items, transport routes, and audit logs.
- **Row-Level Security (RLS)**: Enforced transparently on the PostgreSQL tier. All select, insert, update, or delete policies mandate:
  `school_id = get_my_school_id()` (which queries the active user session context payload securely).

### 2.2 Global Settings & Configurable Currency
- Multi-currency support is configured natively under Settings → General.
- Supported currencies: Saudi Riyal (`SAR`), American Dollar (`USD`), Sudanese Pound (`SDG`), and Egyptian Pound (`EGP`).
- The application parses template strings and dynamically replaces hardcoded `$` tags with resolved currency symbols from the authenticated school context across all invoice views, balance summary grids, payment confirmation drawers, and financial report charts.

---

## 3. Core Modules & Sprint Specifications

### 3.1 Fee Module & Financial Integrity
- **Balance Auto-computation**: A PostgreSQL database trigger recomputes `balance_due` reactively upon any INSERT/UPDATE on `fee_payments` via `amount - SUM(payments)`. Manual drift is eliminated.
- **Overpayment Guard**: A hard database constraint `CHECK (balance_due >= 0)` blocks any payment transaction that would push a student’s account balance negative.
- **Recurring Fee Engine**: Integrates automated monthly, termly, or annual fee creation for enrolled student cohorts matching designated active invoice structures.

### 3.2 Standalone Report Cards & Grade Book (Splitting GradeCardsTab)
Originally embedded deep within the Students tab array, the **Report Cards** module is now a top-level, standalone workflow visible on the primary dashboard sidebar (GraduationCap icon).
- **Subject-Specific Instructor Comments**: Adds a dedicated `comments` text column on the `grades` table so teachers can record narrative feedback visible on direct transcript exports.
- **Automatic Class Rank & Percentiles**: Compiles overall grades per student for the term, computes class standings (rank index out of total peers), and displays stats dynamically on the transcript frame.
- **Cross-Term Attendance Aggregates**: Queries raw student `attendance` tables during report compiles to present total days present, keys absent, and actual percentage ratios dynamically.

### 3.3 Map-Based Transport tracking (Leaflet.js & OpenStreetMap)
A zero-cost tracking and stop assignment engine fully optimized for fast interaction:
- **No Paid APIs Required**: Uses Leaflet.js rendering, OpenStreetMap tile servers, and the Nominatim Geocoding API for address lookups.
- **Reactive Coordinates**: Tapping "Start Route" on mobile triggers browser-level geolocation updates every 30 seconds, and streams location markers dynamically to parent screens using Supabase Realtime Channels.

### 3.4 Push & Email Notifications Workflow (WebPush & Resend/Brevo)
- **Web Push**: Standard VAPID keys registered through Service Workers (Workbox-powered cache controls). Subscriptions are logged in `push_subscriptions`. Toggle in Settings → Notifications.
- **Configurable Emails**: Schools define their mail flow (Resend / Brevo integration) in Settings. Automatic welcome sequences, payment completions, and invoice overdue notices are routed dynamically backend-side.

### 3.5 Super Admin Module
A comprehensive global oversight module for the platform operator, accessible at `/super-admin/*`:
- **Schools CRUD**: Table view with create modal, detail page with config editor, maintenance toggle, and module overrides per school.
- **Subscription Plans**: Grid view with pricing, features, and create/edit form.
- **Backup Management**: History of automated/database backups, manual trigger capability.
- **System Health Dashboard**: Real-time metrics, logs, and health checks across all schools.
- **User Management**: Global user table with search, pagination, and role management.
- **Announcements**: System-wide announcements with create modal, publish toggle, and delete.
- **Audit Log**: Paginated, filterable audit trail of all actions across all tenants.
- **RLS Bypass**: All super admin queries use `is_super_admin()` which bypasses Row-Level Security.
- **19 Server Actions**: Located in `app/actions/super-admin.ts` covering all CRUD and admin operations.
- **3 Subscription & Announcement Server Actions**: Located in `app/actions/subscription.ts` — `getSchoolSubscriptionAction`, `getSystemAnnouncementsAction`, `getUserNotificationsAction` — handle subscription badge data, system announcement banners/modals, and subscription expiry notifications respectively.

### 3.6 Subscription Badge & System Announcements
- **Subscription Badge** (`components/subscription-badge.tsx`): Displayed in the dashboard header for school admins. Shows the plan name, status (expired/expiring/trial), and days remaining by calling `getSchoolSubscriptionAction`.
- **Subscription Notifications** (`app/actions/subscription.ts` → `getUserNotificationsAction`): Generates notifications for expired/expiring subscriptions with 7-day and 14-day warnings, shown in the notifications dropdown.
- **System Announcement Banner** (`components/announcement-banner.tsx`): Reads from the `system_announcements` table via `getSystemAnnouncementsAction`. Renders a dismissible banner and popup modal for school admin users. Integrated in `app/dashboard/layout.tsx`.

**New files added:** `app/actions/subscription.ts`, `components/subscription-badge.tsx`, `components/announcement-banner.tsx`

---

## 4. Development Phase & Roadmap

| Sprint | Focus & Critical Outcomes | Status |
| :--- | :--- | :--- |
| **Sprint 1** | Critical Bugs & Financial Integrity (Triggers, overpayment bounds, search cast) | ✅ Completed |
| **Sprint 2** | Multi-tenant SaaS Architecture (`schools` table, secure unified user columns) | ✅ Completed |
| **Sprint 3** | Configurable Currency Setup & Symbol Resolution across UI controls | ✅ Completed |
| **Sprint 4** | Report Cards Standalone extraction (Designated sidebar routing) | ✅ Completed |
| **Sprint 5** | Report Card Upgrades (Dynamic Class Ranks, comments, attendance totals, print alignments) | ✅ Completed |
| **Sprint 6** | Push Notifications (VAPID keys, Serwist SW, subscription API, per-category toggles) | ✅ Completed |
| **Sprint 7** | Email Notifications (Resend integration, send API route, notification settings) | ⚠️ Partial — no automated template sequences yet |
| **Sprint 8** | Analytics & Recharts (Overview, Academic, Attendance, Financial, Predictive tabs) | ✅ Completed |
| **Sprint 9** | Advanced Fee Scheduling (DB triggers for auto-billing, proration, sibling discounts) | ⚠️ Partial — no cron scheduler, no PDF receipts |
| **Sprint 10** | Map-Based Transport (Leaflet/OSM maps, Socket.io real-time GPS, driver console, drag-and-drop stops, parent timeline) | ✅ Completed |
| **Sprint 11** | Inventory (Full CRUD, categories, status tracking, maintenance scheduling) | ✅ Completed |
| **Sprint 12** | Visitor Check-in (Check-in/out flow, host tracking, pagination) | ⚠️ Partial — QR passes and badge printing are stubs |
| **Sprint 13** | Intelligent Attendance (Per-student marking, calendar history, admin overview) | ⚠️ Partial — no CSV imports or monthly matrices |
| **Sprint 14** | Student Registry (File uploads to Supabase Storage, CSV export, bulk promotions) | ✅ Completed |
| **Sprint 15** | PWA Offline Queue (IndexedDB sync engine, optimistic mutations, SWR persistence) | ✅ Completed |
| **Sprint 16** | Test Coverage | ✅ Completed — 133 tests across 13 files (Vitest + Playwright E2E + Component tests) |
| **Super Admin Phase 1** | Migration (7 tables: subscription_plans, subscriptions, school_module_overrides, backups, audit_logs, system_health_logs, system_announcements), role addition, RLS bypass, seed data | ✅ Completed |
| **Super Admin Phase 2** | 19 server actions, 7 UI pages (schools CRUD + detail, subscriptions, backups, health, users, announcements, audit), sidebar layout | ✅ Completed |
| **Sprint 17** | Subscription Badge & System Announcements (subscription-badge.tsx, announcement-banner.tsx, subscription.ts server actions, super_admin login redirect fix) | ✅ Completed |

### 4.1 Production Readiness (Current Phase)

The core feature set is complete. The project now enters the **Production Readiness** phase — hardening the system for real-world deployment.

| Area | Key Tasks |
| :--- | :--- |
| **Security** | Remove committed secrets, remove dev-only auth bypasses, fix CORS, enable type/lint checks |
| **Code Quality** | Split monolithic components, remove dead code, fix `any` types, consolidate duplicate modules |
| **Testing** | ✅ Completed — 133 tests across 13 Vitest files + 7 Playwright E2E spec files |
| **Super Admin** | ✅ Completed — Full multi-school oversight, subscription plans, system health, audit, backups, announcements |
| **Infrastructure** | CI/CD pipeline (GitHub Actions), Docker, environment validation, monitoring |
| **Performance** | Bundle optimization, code splitting, DB query profiling |
| **Data Protection** | DB backup/restore via UI (`Settings → Data Management`) and CLI (`scripts/backup.ts`, `scripts/restore.ts`) |
| **Push Notifications** | Web Push API activated — toggle in `Settings → Notifications`, SW handles `push`/`notificationclick` events |
| **Remaining Features** | Finish partial sprints (email templates, QR passes, CSV import, cron scheduler)

---

## 5. Blocked Items

| Issue | Status | Workaround |
| :--- | :--- | :--- |
| `pg_dump` / `supabase db dump` requires Docker Desktop | 🟡 Blocked (no Docker on Windows) | Use Supabase Dashboard SQL Editor for manual exports |
| `supabase db query --linked` fails on `DROP CONSTRAINT IF EXISTS` | 🟢 Workaround available | Wrap in `DO $$ ... END $$;` anonymous code block |
