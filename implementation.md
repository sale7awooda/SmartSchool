# Smart School (v2) Implementation Details

This document logs exact architecture changes, layout styles, and implementation structures introduced across developed sprints.

---

## 1. Resolved Layout & TDZ Crash Bug
- **The Issue**: Loading `/dashboard/report-cards` rendered a blank view or threw `ReferenceError: Cannot access 'eM' before initialization` due to a Temporal Dead Zone violation. The `useEffect` hook carrying academic and performance compilation was declared above its dependency `currentDbTerm` useMemo array.
- **The Fix**: Moved the `fetchStudentAnalytics` hook immediately below variables configurations, ensuring all variables, hooks, states, and client context resolved sequentially.
- **The Print Margin Correction**: Enhanced custom `@media print` style blocks within `GradeCardsTab` to explicitly hide administrative banners, navigation drawers, headers, and footer overlays. Parents and wrappers are set with inline dynamic properties:
  - Margins forced securely with `margin: 0.8cm !important`.
  - Overrides parents with `position: static !important` and `transform: none !important` to ensure browser print layouts align beautifully without vertical offsets or cropped margins.
  - Set table instructor feedback header & cell blocks to persist in printed views with `print:table-cell`.

---

## 2. Completed Milestones

### Sprint 1: Critical Bugs & Data Integrity
- Balanced Fee Invoices: Added PostgreSQL BEFORE UPDATE database trigger ensuring payments are computed defensively.
- Added strict SQL check constraints (`CHECK (balance_due >= 0)`) to guard against negative account balances.
- Audited and cast SQL queries targeting student or HR tables so that `UUID` records are processed safely under `CAST(field AS TEXT) ILIKE ?` parameters, preventing index typing runtime crashes.

### Sprint 2: Multi-Tenant SaaS
- Provisioned unified database tables (`schools`) storing tenant name, slug, settings, active subscription flags, and configurable settings.
- Enforced automated isolation across query scopes using tenant credentials stored in session profiles.

### Sprint 3: Configurable Currency Symbol System
- Programmed dynamic lookup selectors resolved across template formats (`USD`, `SAR`, `SDG`, `EGP`).
- Replaced hardcoded currency characters with contextually resolved symbol configurations.

### Sprint 4 & 5: Decoupled Standalone Report Cards
- Extracted nested child views into `/dashboard/report-cards` using the standalone navigation element.
- Added `comments TEXT` field to `grades` table, allowing subject-specific teacher narrative observations.
- Handled live computation of classmates' scores inside active semesters to render performance index standings and class ranks.
- Linked real-world student attendance models to calculate and render the total present, absent, and percentage logs dynamically on report card prints.

---

## 3. Next Implementation Milestones (Sprint 6 & 7)
- **Web Push Credentials**: Ingesting secure VAPID secrets inside `push_subscriptions` tables to power browser alerts.
- **Service Worker Workbox**: Broadening Workbox-driven triggers to capture offline states and route incoming push alerts directly onto selected interface modals.
- **Email Delivery Integration**: Adding dashboard parameters allowing school supervisors to wire active Resend or Brevo credentials directly for custom automated delivery templates.
