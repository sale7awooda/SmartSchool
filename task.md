# Smart School (v2) Project Roadmap

This tracker outlines the state of completed and upcoming sprints in accordance with the **Smart School — Revised Upgrade & Improvement Plan (v2)**.

## 🏆 Current Project Status
- **Last Updated**: June 2026
- **Completed Sprints**: Sprint 1–6, Sprint 8, Sprint 10–11, Sprint 14–16 (100% complete & validated)
- **Completed Phases**: Super Admin Module Phase 1 & 2 (complete)
- **Active / Next Up**: Sprint 7 (Email Notifications — partial)

---

## 📅 Roadmap progress Tracker

### Phase 1 — Core Core & Data Integrity (Completed)
- [x] **Sprint 1: Critical Bugs & Data Integrity**
  - Resolved `balance_due` database drift and implemented strict overpayment guards (`CHECK balance_due >= 0`).
  - Audited search queries preventing `uuid ~~* unknown` casting bug.
- [x] **Sprint 2: Multi-Tenant SaaS core**
  - Provisioned the unified `schools` table and injected isolated client identifiers.
  - Formulated secure tenant routing structure under `/dashboard`.
- [x] **Sprint 3: Configurable Currency**
  - Configured active settings map (`USD`, `SAR`, `SDG`, `EGP`).
  - Swapped hardcoded client symbols with dynamic setting resolvers of active school context.
- [x] **Sprint 4: Report Cards Standalone Extraction**
  - Fully decoupled the comprehensive grade component from student nested tabs.
  - Setup top-level `/dashboard/report-cards` sidebar entry using the `GraduationCap` display asset.
- [x] **Sprint 5: Report Cards Enhancements**
  - Added subject-specific `comments` column to database table.
  - Calculated and rendered student class rank indexes on report frames.
  - Aggregated real-time attendance statistics (days present, days absent, enrollment ratios) on the report cards.
  - Solved print-media overlap, fixing margins and forcing perfect layout placement on portrait single/annual pages.

---

## 🚀 Incoming Sprints & Next Milestones

### Phase 2 — Notifications & Communications
- [x] **Sprint 6: Push Notifications (VAPID key integration) ✅**
  - Integrated Edge Function (`send-push-notification`) with VAPID credential validation.
  - Push subscriptions stored in `push_subscriptions` database schema.
  - Notification bell drop-down interface inside dashboard headers implemented.
- [ ] **Sprint 7: Email Notifications (Resend / Brevo) — Partial**
  - Integrate school-level SMTP preferences under settings dashboard.
  - Programmatic dispatch of welcome templates and payment receipts on runtime completion.

### Phase 3 — Strategic Advanced Modules
- [x] **Sprint 8: Analytics & Recharts Data Visualization Dashboard ✅**
- [ ] **Sprint 9: Fees Automation & In-App Payment Receipts — Partial**
- [x] **Sprint 10: Map-Based Transport tracking using OSM & Leaflet ✅**
- [x] **Sprint 11: Stock Audits & Low-Level Alerts Inventory System ✅**
- [ ] **Sprint 12: Visitor Check-In Log & QR Badge Prints — Partial**
- [ ] **Sprint 13: Attendance CSV Import & High-Absence Alerts — Partial**
- [x] **Sprint 14: Document storage uploads & Bulk Promotion Flows ✅**
- [x] **Sprint 15: Progressive Offline Synced Attendance State ✅**
- [x] **Sprint 16: Automated Test Verification Pipeline ✅**

### Phase 4 — Super Admin & Production Readiness (Complete)
- [x] **Super Admin Module Phase 1: Database & Auth**
  - Migration with 7 new tables (subscription_plans, subscriptions, school_module_overrides, backups, audit_logs, system_health_logs, system_announcements)
  - Role includes `super_admin`, RLS bypass via `is_super_admin()`, seed data (4 plans, super admin user)
- [x] **Super Admin Module Phase 2: UI & Actions**
  - 19 server actions in `app/actions/super-admin.ts`
  - 7 UI pages: schools (CRUD + detail), subscriptions, backups, health, users, announcements, audit
  - Sidebar layout at `/super-admin/*`
