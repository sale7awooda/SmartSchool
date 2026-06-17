# Architecture Overview

> For a detailed module-by-module breakdown, see [SYSTEM_DOCUMENTATION.md](../SYSTEM_DOCUMENTATION.md).
> For implementation details, see [implementation.md](../implementation.md).

## High-Level Architecture

```
┌──────────────────────────────────────────────────┐
│                   Next.js App                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Server    │  │  Client    │  │  API       │  │
│  │  Actions   │  │  Components│  │  Routes    │  │
│  └────────────┘  └────────────┘  └────────────┘  │
├──────────────────────────────────────────────────┤
│               Custom HTTP Server                  │
│  ┌────────────┐  ┌────────────┐                  │
│  │  Next.js   │  │ Socket.io  │                  │
│  │  Handler   │  │ (Realtime) │                  │
│  └────────────┘  └────────────┘                  │
├──────────────────────────────────────────────────┤
│               Supabase (PostgreSQL)               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Tables    │  │  RLS       │  │  Realtime  │  │
│  │            │  │  Policies  │  │  Channels  │  │
│  └────────────┘  └────────────┘  └────────────┘  │
└──────────────────────────────────────────────────┘
```

## Project Structure

```
app/                          # Next.js App Router
├── actions/                  # Server actions (58 functions across 12 files)
├── api/                      # API route handlers (various)
├── dashboard/                # Protected dashboard pages (17 submodules)
│   ├── academics/            # Assessments, grade cards, report cards
│   ├── attendance/           # Attendance marking & overview
│   ├── communication/        # Notices, messaging
│   ├── fees/                 # Invoicing, payments, fee structures
│   ├── hr/                   # Staff, payroll, leave
│   ├── inventory/            # Asset tracking
│   ├── schedule/             # Timetable management
│   ├── students/             # Student directory & profiles
│   ├── settings/             # Master data, system settings
│   ├── transport/            # Bus routes, GPS tracking
│   └── visitors/             # Check-in/out
├── layout.tsx                # Root layout
└── page.tsx                  # Login page

components/                   # Shared UI components
├── dashboard/                # Dashboard-specific components
│   ├── students/             # Student sub-components
│   └── dashboard-header/     # Network status, notifications, profile dropdown
└── ui/                       # Primitives (Button, Card, Dialog, etc.)

lib/                          # Shared utilities
├── api/                      # Supabase data helpers (20 files)
├── supabase/                 # Client, server, middleware supabase init
├── types/                    # TypeScript interfaces
├── auth-context.tsx          # Auth provider
├── settings-context.tsx      # Settings provider
├── language-context.tsx      # i18n language provider
├── permissions.ts            # RBAC definitions
├── offline-db.ts             # IndexedDB sync queue
├── routing.ts                # Slug-based routing helpers
├── resend.ts                 # Email client
└── tenant.ts                 # Multi-tenant helpers

tests/                        # Test suites
├── components/               # Component tests (19 tests)
├── e2e/                      # Playwright E2E tests (9 tests)
├── api-parsers.test.ts       # API parser integration tests (10)
├── grade-utils.test.ts       # Grade utility unit tests (20)
├── lightweight-e2e.test.ts   # Mock-based E2E tests (19)
└── setup.ts                  # Test setup (jest-dom, mocks)

supabase/
└── migrations/               # SQL migration files (33 files)

server.ts                     # Custom Node.js server (Next.js + Socket.io)
```

## Data Flow

### Request Flow (Server Actions)

```
Form Submit → Server Action (formData) → Zod Validation
  → Supabase Query → Audit Log → Return State { success, message, errors? }
```

### Real-Time Flow (Transport)

```
Bus GPS → Socket.io Client → update_location event
  → Server broadcasts to route room → All subscribed clients receive location_update
```

### Auth Flow

```
Login → Supabase Auth → bootstrapUserProfile() → Resolve Role
  → Create Profile (if first login) → Redirect to Dashboard
```

## Key Design Decisions

- **Server Actions over REST**: All mutations go through Next.js Server Actions for type safety and progressive enhancement
- **No `any` types**: API boundary uses `Record<string, unknown>` for raw DB rows, cast to typed interfaces
- **Colocated sub-components**: Monolithic components split into directories under same parent path — imports unchanged
- **Denormalized write path**: Tries dedicated columns first, falls back to JSON stringification if column missing
- **Vitest + esbuild JSX**: Uses esbuild's automatic JSX transform instead of `@vitejs/plugin-react` to avoid peer dependency conflicts
- **Serwist disabled**: v9 disabled via env var due to webpack runtime crash

## Multi-Tenant Architecture

- Every table has `school_id` foreign key referencing `schools(id)`
- Row-Level Security (RLS) policies enforce `school_id = get_my_school_id()` on all queries
- Currency, timezone, and subscription tier configured per school
