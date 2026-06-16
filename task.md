# Smart School (v2) Project Roadmap

This tracker outlines the state of completed and upcoming sprints in accordance with the **Smart School — Revised Upgrade & Improvement Plan (v2)**.

## 🏆 Current Project Status
- **Last Updated**: June 2026
- **Completed Sprints**: Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5 (100% complete & validated)
- **Active / Next Up**: Sprint 6 (Push Notifications) & Sprint 7 (Email Notifications)

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

### Phase 2 — Notifications & Communications (Active)
- [ ] **Sprint 6: Push Notifications (VAPID key integration)**
  - Integrate Edge Function (`send-push-notification`) with VAPID credential validation.
  - Store push subscriptions in `push_subscriptions` database schema.
  - Implement notification bell drop-down interface inside dashboard headers.
- [ ] **Sprint 7: Email Notifications (Resend / Brevo)**
  - Integrate school-level SMTP preferences under settings dashboard.
  - Programmatic dispatch of welcome templates and payment receipts on runtime completion.

### Phase 3 — Strategic Advanced Modules (Upcoming)
- [ ] **Sprint 8: Analytics & Recharts Data Visualization Dashboard**
- [ ] **Sprint 9: Fees Automation & In-App Payment Receipts**
- [ ] **Sprint 10: Map-Based Transport tracking using OSM & Leaflet**
- [ ] **Sprint 11: Stock Audits & Low-Level Alerts Inventory System**
- [ ] **Sprint 12: Visitor Check-In Log & QR Badge Prints**
- [ ] **Sprint 13: Attendance CSV Import & High-Absence Alerts**
- [ ] **Sprint 14: Document storage uploads & Bulk Promotion Flows**
- [ ] **Sprint 15: Progressive Offline Synced Attendance State**
- [ ] **Sprint 16: Automated Test Verification Pipeline**
