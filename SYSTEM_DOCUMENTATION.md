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
- **Web Push**: Standard VAPID keys registered through Service Workers (Workbox-powered cache controls). Subscriptions are logged in `push_subscriptions`.
- **Configurable Emails**: Schools define their mail flow (Resend / Brevo integration) in Settings. Automatic welcome sequences, payment completions, and invoice overdue notices are routed dynamically backend-side.

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
| **Sprint 10** | Map-Based Transport (Leaflet/OSM maps, Socket.io real-time GPS, driver console) | ✅ Completed |
| **Sprint 11** | Inventory (Full CRUD, categories, status tracking, maintenance scheduling) | ✅ Completed |
| **Sprint 12** | Visitor Check-in (Check-in/out flow, host tracking, pagination) | ⚠️ Partial — QR passes and badge printing are stubs |
| **Sprint 13** | Intelligent Attendance (Per-student marking, calendar history, admin overview) | ⚠️ Partial — no CSV imports or monthly matrices |
| **Sprint 14** | Student Registry (File uploads to Supabase Storage, CSV export, bulk promotions) | ✅ Completed |
| **Sprint 15** | PWA Offline Queue (IndexedDB sync engine, optimistic mutations, SWR persistence) | ✅ Completed |
| **Sprint 16** | Test Coverage | ✅ Completed — 68 tests across 6 files (Vitest + Playwright E2E + Component tests) |

### 4.1 Production Readiness (Current Phase)

The core feature set is complete. The project now enters the **Production Readiness** phase — hardening the system for real-world deployment.

| Area | Key Tasks |
| :--- | :--- |
| **Security** | Remove committed secrets, remove dev-only auth bypasses, fix CORS, enable type/lint checks |
| **Code Quality** | Split monolithic components, remove dead code, fix `any` types, consolidate duplicate modules |
| **Testing** | ✅ Completed — 68 tests (Vitest) + 9 Playwright E2E tests + 19 component tests |
| **Infrastructure** | CI/CD pipeline, Docker, environment validation, monitoring |
| **Performance** | Bundle optimization, code splitting, DB query profiling |
| **Remaining Features** | Finish partial sprints (email templates, QR passes, CSV import, cron scheduler)
