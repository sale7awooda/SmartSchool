# Smart School Management System v2

A production-ready, multi-tenant SaaS school management platform built with Next.js 15, Supabase, and Tailwind CSS v4.

## Features

- **Student Management** — Directory, profiles, documents, promotions, bulk operations
- **Academics & Assessments** — Online exams, auto-grading, grade cards, report cards
- **Fee & Finance** — Invoicing, payments, expense tracking, fee structures, multiple currencies
- **Human Resources** — Staff directory, payroll, leave management, attendance
- **Timetable & Schedule** — Period management, draft workflows, wizard-based generation
- **Transport Tracking** — Real-time GPS bus tracking with Leaflet/OSM maps and Socket.io
- **Visitor Management** — Check-in/out flow, host tracking, paginated logs
- **Inventory** — Asset tracking, categories, maintenance scheduling, low-stock alerts
- **Communication** — Notices, broadcasts, push notifications (Web Push API, works when app is closed), email (Resend)
- **Super Admin** — Multi-school oversight, subscription plans, system health, audit logs, announcements, backup management
- **Multi-Tenant** — School-level isolation via RLS, configurable currency/locale
- **PWA** — Offline support, service worker, push notifications, IndexedDB sync queue
- **Data Management** — Full database backup/restore (JSON export/import via UI or CLI scripts)
- **RBAC** — Role-based access (super_admin, admin, accountant, staff, teacher, parent, student)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, React 19) |
| Styling | Tailwind CSS v4, Motion (Framer Motion) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth + custom profile resolver |
| State | SWR, React Context (Auth, Language, Settings) |
| Real-time | Socket.io, Supabase Realtime Channels |
| Maps | Leaflet.js + OpenStreetMap + Nominatim |
| PDF | jsPDF + jspdf-autotable |
| Email | Resend API |
| Push | Web Push API (VAPID) via Serwist |
| Testing | Vitest + Testing Library + Playwright (133 tests across 13 files) |
| Backup | Supabase admin client + CLI scripts (pg) |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in your values
cp .env.example .env

# 3. Run database migrations
#    Apply all SQL files in supabase/migrations/ via Supabase SQL Editor

# 4. Start development server
npm run dev
```

See [SETUP.md](./SETUP.md) for complete setup instructions.

## Tests

```bash
# Run all unit/integration/component tests (133 tests across 13 files)
npx vitest run

# Run E2E tests (7 spec files — requires dev server running)
npx playwright test
```

## Documentation

| Document | Description |
|----------|-------------|
| [SETUP.md](./SETUP.md) | Complete setup & configuration guide |
| [API.md](./API.md) | API reference for all modules |
| [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) | Architecture & module deep-dive |
| [SYSTEM_REPLICA_GUIDE.md](./SYSTEM_REPLICA_GUIDE.md) | Guide for rebuilding the system |
| [docs/architecture.md](./docs/architecture.md) | High-level architecture & project structure |
