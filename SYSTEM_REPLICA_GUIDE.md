# AI Studio School Management System - 2026 Replica Guide

This document provides a highly detailed module-by-module breakdown, technical structure, and logical flow of the entire application. It is designed so that a developer can rebuild a perfect 1:1 replica of this Local-First, Mobile-First PWA using the 2026 paradigm.

---

## 1. Core Architecture Pattern

### 1.1 Tech Stack 
- **Framework**: Next.js 15+ (App Router, React 19)
- **Styling**: Tailwind CSS v4 (@container queries over @media breakpoint queries)
- **Database (Cloud)**: Supabase Postgres (with Row Level Security and Realtime enabled)
- **Database (Local/Edge)**: Offline-first SQLite-WASM, synchronized via PowerSync/RxDB paradigm.
- **State Management**: SWR (swapping to optimistic observable queries in PWA context) + React Context for `Auth`, `Language`, `Settings`.
- **Animations/Gestures**: Framer Motion 12 (`drag="x"` for swipe interactions, spring animations).
- **Service Worker / Push**: `@serwist/next` (Web Push API).

### 1.2 Layout & Routing Structure
```text
/app
 ├── page.tsx               # Login (Email, OAuth, Biometric/Passkeys)
 ├── layout.tsx             # Root Layout (Language wrapper, SWR provider, Theme)
 ├── sw.ts                  # Service Worker configuration (Push Events, Cache Fallbacks)
 └── dashboard/             # Protected Routes
      ├── layout.tsx        # App Shell (Desktop Sidebar, PWA Bottom Mobile Nav)
      ├── page.tsx          # Widget-based Dashboard
      ├── attendance/       # Swipe-gesture driven attendance cards
      ├── communication/    # Layout-shifting chat (absolute flex on mobile)
      ├── schedule/         # Timetable (Horizontal scroll snap on mobile)
      ├── academics/        # Grades & Assessments
      ├── fees/             # Mobile-optimized Payment drawers
      └── ...
```

---

## 2. Database Schema (Supabase Postgres)
A complete system replica requires these exact tables, joined logically via foreign keys. RLS (Row Level Security) is required on every table.

### Users & Roles
- `public.users`: `id (uuid, PK)`, `email`, `role` (Admin, Principal, Teacher, Parent, Student, Driver), `name`, `created_at`.
- *Logic*: All identity is tied to `role`. The UI renders conditional tabs in `config/navigation.ts` based on this string.

### Core Modules
1. **Attendance**: `attendance` table. `student_id`, `date`, `status` (present, absent, late). 
   - *PWA Shift*: Writes happen instantly to the device local store, then sync asynchronously.
2. **Communication**: `messages` and `notices`. 
   - `messages`: `sender_id`, `receiver_id`, `content`, `timestamp`.
   - `notices`: `author_id`, `title`, `content`, `is_important`. Triggers Web Push Notifications on insert.
3. **Academics**: 
   - `assessments`: tests, quizzes. 
   - `grades`: results linked to `assessment_id` and `student_id`.
4. **Transport**: `routes`, `stops`, `bus_attendance`. GPS coordination via React Leaflet or Capacitor Geolocation.
5. **Fees**: `invoices`, `payments`.

---

## 3. UI/UX Paradigm (The 2026 Mobile-First PWA Standard)

When replicating this UI, adhere strictly to these UX principles:

### 3.1 App Shell Dynamics
- **Mobile Environment**: 
  - The Header should stick to the top: `pb-safe pt-safe sticky top-0 z-50`.
  - The Navigation is at the BOTTOM: A Fixed Tab Bar (`fixed bottom-0 z-50 pb-safe`).
  - Use `touch-action: manipulation;` on interactive elements to prevent 300ms delay and Safari double-tap zoom.
- **Desktop Environment**: 
  - Collapsible sidebar left (`w-64` expanding to `w-20` on minimize). Header stretches across the remainder.

### 3.2 Swipe Gestures & Touch Input
Data tables are heavy and unresponsive on mobile. The replica must use Card Stacks or Swipeable Lists for arrays of data.
- **Implementation**: `<motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={...}>`
- **Use Case (Attendance)**: Right swipe marks a student "Present" (turns green), Left swipe marks "Absent" (turns red).

### 3.3 Container Queries (`@container`)
Never use `sm:` or `md:` breakpoints on micro-components like a `StudentCard` or `DashboardWidget`.
- **Why**: A `DashboardWidget` might span 100% width on mobile, but only 25% width in a 4-column desktop grid. It should resize its interior fonts/icons based on its *own* container width.
- **Syntax**: Parent `className="@container"`. Child `className="text-sm @[400px]:text-lg"`.

---

## 4. Module Workflows & Logic

### 4.1 Authentication & Biometrics
- **Flow**: User enters credentials -> JWT issued -> stored in HTTP-only cookie + local Supabase session.
- **Edge Upgrade**: Upon successful login, invoke WebAuthn (`navigator.credentials.create()`) to store the device's Face ID / Touch ID passkey. Subsequent logins skip passwords entirely.
- **Context**: State managed by `<AuthContext.Provider>` which protects `/dashboard/*` routes.

### 4.2 Local-First Sync Engine (Crucial for offline)
For the replica, implement a syncing logic abstraction:
1. `sw.ts` caches the HTML/JS application (Standard PWA).
2. A `SyncEngine` class listens to `window.onLine`.
3. When the user modifies data (e.g., marks attendance), the function does NOT `await supabase.from...`.
4. Instead, it updates the Local SQLite instance (or memory map) and puts the `UPDATE` payload in a Queue.
5. The Queue processor pushes to Supabase REST endpoints only when `navigator.onLine === true`.

### 4.3 Web Push Notifications
Bypass SMS gateways by utilizing native Web Push:
1. `Serwist` registers service worker.
2. User accepts Notification Permission prompt.
3. App stores the user's `PushSubscription` object in the database.
4. When an Admin posts a Notice, a Supabase DB Webhook triggers a backend function that pushes Web Push payloads to the registered subscriptions.
5. `sw.ts` intercepts this via `self.addEventListener('push')` and pops a native OS notification. Clicking it opens the PWA instantly.

---

## 5. Directory & File Breakdown (For Replica Scaffold)

```bash
# Core Services Layer
/lib/supabase-db.ts      # Cloud interaction
/lib/offline-db.ts       # IndexedDB/PowerSync local wrapper
/lib/auth-context.tsx    # JWT/Session Management
/lib/language-context.tsx # i18n Dictionary switching

# UI Components Assembly
/components/ui/          # Radix Primitives + Tailwind
/components/dashboard-header.tsx # PWA Top Safe Area Header
/components/swr-provider.tsx     # Data fetching cache configuration

# Styles
/app/globals.css         # Tailwind v4 imports, CSS Variables for Dark Mode, pb-safe rules

# The Progressive Web App specific files
/app/manifest.ts         # Dynamically builds the PWA manifest.json (icons, theme color)
/app/sw.ts               # The Service Worker raw logic for @serwist/next
```

## Summary Checklist for the Replica Developer
- [ ] Postgres schema seeded exactly as specified.
- [ ] Row Level Security activated so Teachers only fetch their respective data.
- [ ] Tailwind v4 configured with `@tailwindcss/postcss` and container plugin.
- [ ] `lucide-react` for all visual iconography.
- [ ] Mobile Bottom Tab navigation is hardcoded for screens < 768px.
- [ ] All table lists are wrapped in `framer-motion` for mobile touch sliding.
- [ ] `manifest.json` configured for "standalone" display mode to remove browser URL bars on iOS/Android.
